"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { getByHskLevel, getEntry } from "@/lib/dictionary/dictionary";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { loadSrsMap } from "@/lib/hsk-study/storage";
import { HskBadge } from "@/components/ui/Badge";
import { buildQuestion } from "@/lib/calibration/questionGen";
import { scoreAnswer } from "@/lib/calibration/scoring";
import { calibrationMetrics } from "@/lib/calibration/deck";
import {
  applyBaseline,
  applyQuickSetup,
  applyStartFromScratch,
  calibrationProgress,
  recordAnswer,
  resetCalibration,
  returnWordToStudy,
  startComprehensive,
} from "@/lib/calibration/state";
import type {
  CalibrationLevel,
  CalibrationQuestion,
  CalibrationSelfAssessment,
  CalibrationState,
  CalibrationWordResult,
} from "@/types/calibration";

const ALL_LEVELS: CalibrationLevel[] = [1, 2, 3, 4, 5, 6];

/** Persist to Firestore every N answers; local writes are cheap but cloud
 * writes are throttled. Block boundaries and pauses always force a save. */
const SAVE_EVERY_N_ANSWERS = 5;

export default function CalibrationPage() {
  const { ready } = useDictionary();
  const { user } = useAuth();
  const [state, setState] = useState<CalibrationState | null>(null);
  const [running, setRunning] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const unsavedAnswers = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void getStorageProvider(user)
      .getCalibrationState()
      .then((s) => {
        if (!cancelled) setState(s);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const persist = useCallback(
    (next: CalibrationState) => {
      setState(next);
      unsavedAnswers.current = 0;
      void getStorageProvider(user).saveCalibrationState(next);
    },
    [user],
  );

  /** Answer-path persistence: state updates immediately, storage every few
   * answers (or when forced at block boundaries / pauses). */
  const persistAnswer = useCallback(
    (next: CalibrationState, force: boolean) => {
      setState(next);
      unsavedAnswers.current += 1;
      if (force || unsavedAnswers.current >= SAVE_EVERY_N_ANSWERS) {
        unsavedAnswers.current = 0;
        void getStorageProvider(user).saveCalibrationState(next);
      }
    },
    [user],
  );

  if (state === null) {
    return (
      <Frame>
        <div className="mt-10 text-center text-sm text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-seal-soft" />
          Loading your calibration…
        </div>
      </Frame>
    );
  }

  if (running && state.status === "inProgress") {
    return (
      <CalibrationRunner
        state={state}
        onAnswer={persistAnswer}
        onPause={(s) => {
          persist(s);
          setRunning(false);
        }}
        onApply={(s) => {
          persist(applyBaseline(s, loadSrsMap(), new Date()));
          setRunning(false);
        }}
      />
    );
  }

  if (setupMode || state.status === "notStarted") {
    return (
      <CalibrationSetup
        ready={ready}
        showBack={setupMode}
        onBack={() => setSetupMode(false)}
        onComprehensive={(levels) => {
          const wordsByLevel: Partial<Record<CalibrationLevel, string[]>> = {};
          for (const level of levels) {
            wordsByLevel[level] = getByHskLevel(level).map((e) => e.simplified);
          }
          persist(
            startComprehensive(state, {
              levels,
              wordsByLevel,
              seed: Date.now() >>> 0,
              now: new Date(),
            }),
          );
          setSetupMode(false);
          setRunning(true);
        }}
        onQuick={(level) => {
          const wordsByLevel: Partial<Record<CalibrationLevel, string[]>> = {};
          for (const l of ALL_LEVELS) {
            if (l >= level) break;
            wordsByLevel[l] = getByHskLevel(l).map((e) => e.simplified);
          }
          persist(
            applyQuickSetup(state, {
              level,
              wordsByLevel,
              srsMap: loadSrsMap(),
              now: new Date(),
            }),
          );
          setSetupMode(false);
        }}
        onScratch={() => {
          persist(applyStartFromScratch(state, new Date()));
          setSetupMode(false);
        }}
      />
    );
  }

  if (state.status === "inProgress") {
    return (
      <ResumeScreen
        state={state}
        onResume={() => setRunning(true)}
        onApply={() => persist(applyBaseline(state, loadSrsMap(), new Date()))}
        onAbandon={() => {
          if (
            window.confirm(
              "Discard this calibration in progress? Answers so far will be deleted. Your review history and saved words are not affected.",
            )
          ) {
            persist(resetCalibration());
          }
        }}
      />
    );
  }

  return (
    <CalibrationSummary
      state={state}
      onRecalibrate={() => setSetupMode(true)}
      onReset={() => {
        if (
          window.confirm(
            "Reset calibration? Words assumed known will return to the ordinary new-word queue. Your genuine review history and saved words are never touched.",
          )
        ) {
          persist(resetCalibration());
        }
      }}
      onReturnWord={(word) => persist(returnWordToStudy(state, word, new Date()))}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shared frame
 * ──────────────────────────────────────────────────────────────────────────── */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:py-8">
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-1 rounded text-sm text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-seal"
      >
        <ArrowLeft size={14} /> Vocabulary
      </Link>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10.5px] uppercase tracking-[0.18em]"
      style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
    >
      {children}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium shadow-paper transition-all hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal";

/* ────────────────────────────────────────────────────────────────────────────
 * Setup: comprehensive / quick / scratch
 * ──────────────────────────────────────────────────────────────────────────── */

function CalibrationSetup({
  ready,
  showBack,
  onBack,
  onComprehensive,
  onQuick,
  onScratch,
}: {
  ready: boolean;
  showBack: boolean;
  onBack: () => void;
  onComprehensive: (levels: CalibrationLevel[]) => void;
  onQuick: (level: CalibrationLevel) => void;
  onScratch: () => void;
}) {
  const [levels, setLevels] = useState<CalibrationLevel[]>([1, 2, 3]);
  const [quickLevel, setQuickLevel] = useState<CalibrationLevel>(3);

  const toggleLevel = (l: CalibrationLevel) =>
    setLevels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l].sort((a, b) => a - b),
    );

  return (
    <Frame>
      <header className="mt-4 mb-6">
        <SectionTitle>词汇校准 · Vocabulary calibration</SectionTitle>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Tell the deck what you already know
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Calibration keeps the study queue from feeding you hundreds of words
          you already know. Words you get right are <em>skipped for now</em>,
          not marked as mastered — some will come back later as short
          check-ins to verify you really know them, and only genuine reviews
          build mastery. You can pause anytime, recalibrate later, and inspect
          or undo the result.
        </p>
        {showBack && (
          <button type="button" onClick={onBack} className={`${buttonBase} mt-3 border-line bg-surface text-muted hover:text-ink`}>
            <ArrowLeft size={14} /> Back to summary
          </button>
        )}
      </header>

      <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-paper">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-seal">
            <ClipboardList size={12} /> Comprehensive calibration
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Work through the vocabulary of the levels you pick in short blocks
            of ~50 words. You see the Chinese first, say whether you know it,
            then prove it by picking the meaning. Progress saves after every
            answer, so you can stop after any block and resume later.
          </p>
          <fieldset className="mt-3">
            <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Levels to test
            </legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_LEVELS.map((l) => {
                const active = levels.includes(l);
                return (
                  <label
                    key={l}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-seal ${
                      active
                        ? "border-seal bg-seal text-white"
                        : "border-line bg-paper text-muted hover:text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleLevel(l)}
                      className="sr-only"
                    />
                    HSK {l}
                    {active && <span aria-hidden="true"> ✓</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!ready || levels.length === 0}
              onClick={() => onComprehensive(levels)}
              className={`${buttonBase} border-transparent bg-seal text-white disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Play size={14} /> Start calibration
            </button>
            {!ready && (
              <span className="text-xs italic text-muted">
                Waiting for the full dictionary to load…
              </span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-paper">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-celadon">
            <Sparkles size={12} /> Quick starting level
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Already know roughly where you stand? Pick your current level and
            the levels <em>below</em> it are assumed known — less precise than
            the full calibration. Your chosen level itself still gets studied
            normally, and assumed-known words are spot-checked over the coming
            weeks.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-sm text-muted" htmlFor="quick-level">
              I&apos;m studying at
            </label>
            <select
              id="quick-level"
              value={quickLevel}
              onChange={(e) => setQuickLevel(Number(e.target.value) as CalibrationLevel)}
              className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-medium text-ink shadow-paper focus:border-seal/50 focus:outline-none focus:ring-2 focus:ring-seal/15"
            >
              {ALL_LEVELS.map((l) => (
                <option key={l} value={l}>
                  HSK {l}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!ready}
              onClick={() => onQuick(quickLevel)}
              className={`${buttonBase} border-line bg-surface text-ink disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Use quick setup
            </button>
          </div>
          {quickLevel === 1 && (
            <p className="mt-2 text-xs italic text-muted">
              HSK 1 means nothing is assumed known — same as starting from scratch.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-paper">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
            Start from scratch
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Skip calibration entirely. Every word is treated as new, exactly
            like today. You can always calibrate later from the vocabulary
            page.
          </p>
          <button
            type="button"
            onClick={onScratch}
            className={`${buttonBase} mt-3 border-line bg-surface text-muted hover:text-ink`}
          >
            Skip — start from scratch
          </button>
        </section>
      </div>
    </Frame>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Resume overview for an in-progress calibration
 * ──────────────────────────────────────────────────────────────────────────── */

function ResumeScreen({
  state,
  onResume,
  onApply,
  onAbandon,
}: {
  state: CalibrationState;
  onResume: () => void;
  onApply: () => void;
  onAbandon: () => void;
}) {
  const progress = calibrationProgress(state);
  return (
    <Frame>
      <header className="mt-4 mb-6">
        <SectionTitle>词汇校准 · Vocabulary calibration</SectionTitle>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Calibration in progress
        </h1>
        <p className="mt-2 text-sm text-muted">
          {progress.answered.toLocaleString()} of {progress.totalWords.toLocaleString()} words
          answered. Nothing is applied to your study queue until you confirm.
        </p>
      </header>
      <ProgressOverview progress={progress} />
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onResume} className={`${buttonBase} border-transparent bg-seal text-white`}>
          <Play size={14} /> Resume
        </button>
        <button
          type="button"
          onClick={() => {
            const untested = progress.totalWords - progress.answered;
            if (
              window.confirm(
                untested > 0
                  ? `Apply results now? ${progress.known.toLocaleString()} words will be assumed known. ${untested.toLocaleString()} untested words stay in the ordinary new-word queue.`
                  : `Apply results? ${progress.known.toLocaleString()} words will be assumed known and spot-checked later.`,
              )
            ) {
              onApply();
            }
          }}
          className={`${buttonBase} border-line bg-surface text-ink`}
        >
          <CheckCircle2 size={14} /> Finish &amp; apply results
        </button>
        <button type="button" onClick={onAbandon} className={`${buttonBase} border-line bg-surface text-muted hover:text-ink`}>
          Discard
        </button>
      </div>
    </Frame>
  );
}

function ProgressOverview({
  progress,
}: {
  progress: ReturnType<typeof calibrationProgress>;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-paper">
      <ul className="space-y-2">
        {progress.perLevel.map(({ level, total, answered, known }) => {
          const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
          return (
            <li key={level} className="flex items-center gap-3 text-sm">
              <span className="w-14 shrink-0 font-medium text-ink">HSK {level}</span>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={answered}
                aria-label={`HSK ${level}: ${answered} of ${total} words answered`}
              >
                <div className="h-full rounded-full bg-celadon" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-32 shrink-0 text-right text-xs text-muted">
                {answered}/{total} · {known} known
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Runner: the exam itself
 * ──────────────────────────────────────────────────────────────────────────── */

type RunnerStage =
  | { kind: "assess" }
  | { kind: "choose"; assessment: Exclude<CalibrationSelfAssessment, "dontKnow"> }
  | { kind: "reveal"; result: CalibrationWordResult; picked: number | null }
  | { kind: "blockDone" };

function CalibrationRunner({
  state,
  onAnswer,
  onPause,
  onApply,
}: {
  state: CalibrationState;
  onAnswer: (next: CalibrationState, force: boolean) => void;
  onPause: (state: CalibrationState) => void;
  onApply: (state: CalibrationState) => void;
}) {
  const [stage, setStage] = useState<RunnerStage>({ kind: "assess" });
  const progress = useMemo(() => calibrationProgress(state), [state]);
  const current = progress.next;

  const entry = current ? getEntry(current.word) : undefined;
  const question: CalibrationQuestion | null = useMemo(() => {
    if (!current || !entry) return null;
    return buildQuestion(entry, current.level, getByHskLevel(current.level), state.seed ?? 0);
  }, [current, entry, state.seed]);

  // A word whose dictionary entry vanished (data rebuild between sessions)
  // can't be asked; score it "missed" so it goes to learning rather than
  // silently blocking the plan.
  useEffect(() => {
    if (!current || entry || state.status !== "inProgress") return;
    const result: CalibrationWordResult = {
      outcome: "missed",
      confidence: "low",
      answeredAt: new Date().toISOString(),
      level: current.level,
    };
    onAnswer(recordAnswer(state, current.word, result, new Date()), false);
  }, [current, entry, state, onAnswer]);

  // The answer is scored at commit but only *recorded* on advance — recording
  // moves progress.next to the following word, which would swap the prompt
  // out from under the reveal panel.
  const commit = useCallback(
    (assessment: CalibrationSelfAssessment, picked: number | null) => {
      if (!current || !question) return;
      const result = scoreAnswer(question, assessment, picked, new Date());
      setStage({ kind: "reveal", result, picked });
    },
    [current, question],
  );

  const advance = useCallback(() => {
    if (stage.kind !== "reveal" || !current) return;
    const next = recordAnswer(state, current.word, stage.result, new Date());
    const after = calibrationProgress(next);
    const before = progress.currentBlock;
    const blockEnded =
      after.next === null ||
      after.currentBlock?.level !== before?.level ||
      after.currentBlock?.blockIndex !== before?.blockIndex;
    onAnswer(next, blockEnded);
    setStage(blockEnded && after.next !== null ? { kind: "blockDone" } : { kind: "assess" });
  }, [stage, current, state, progress, onAnswer]);

  if (progress.next === null) {
    return (
      <PlanComplete
        progress={progress}
        onApply={() => onApply(state)}
        onPause={() => onPause(state)}
      />
    );
  }

  if (stage.kind === "blockDone") {
    return (
      <BlockComplete
        state={state}
        progress={progress}
        onContinue={() => setStage({ kind: "assess" })}
        onPause={() => onPause(state)}
        onApply={(s) => onApply(s)}
      />
    );
  }

  if (!entry || !question) {
    return (
      <Frame>
        <div className="mt-10 text-center text-sm text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-seal-soft" />
          Preparing the next word…
        </div>
      </Frame>
    );
  }

  const block = progress.currentBlock;

  return (
    <Frame>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted">
          <span className="font-medium text-ink">HSK {question.level}</span>
          {block && (
            <>
              {" "}· block {block.blockIndex + 1}/{block.blocksInLevel} ·{" "}
              {block.answeredInBlock}/{block.blockLength} in this block
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => onPause(state)}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted shadow-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-seal"
        >
          <Pause size={12} /> Pause &amp; save
        </button>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/60"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.totalWords}
        aria-valuenow={progress.answered}
        aria-label={`Calibration progress: ${progress.answered} of ${progress.totalWords} words answered`}
      >
        <div
          className="h-full rounded-full bg-celadon transition-all duration-300"
          style={{
            width: `${progress.totalWords === 0 ? 0 : Math.round((progress.answered / progress.totalWords) * 100)}%`,
          }}
        />
      </div>

      <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 py-10 text-center shadow-paper">
        <div className="font-cjk text-6xl text-ink sm:text-7xl">{question.word}</div>
        {stage.kind === "reveal" && (
          <RevealPanel entry={entry} question={question} stage={stage} />
        )}
      </div>

      {stage.kind === "assess" && (
        <div className="mt-5">
          <p className="text-center text-xs text-muted" id="assess-label">
            Do you know this word? (Nothing is revealed until you answer.)
          </p>
          <div
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="group"
            aria-labelledby="assess-label"
          >
            <AnswerButton hint="1" onClick={() => setStage({ kind: "choose", assessment: "know" })}>
              I know it
            </AnswerButton>
            <AnswerButton hint="2" onClick={() => setStage({ kind: "choose", assessment: "unsure" })}>
              Not sure
            </AnswerButton>
            <AnswerButton hint="3" onClick={() => commit("dontKnow", null)}>
              Don&apos;t know
            </AnswerButton>
          </div>
        </div>
      )}

      {stage.kind === "choose" && (
        <div className="mt-5">
          <p className="text-center text-xs text-muted" id="choose-label">
            Pick the meaning:
          </p>
          <div className="mt-3 grid gap-2" role="group" aria-labelledby="choose-label">
            {question.options.map((option, i) => (
              <AnswerButton key={i} hint={String(i + 1)} onClick={() => commit(stage.assessment, i)}>
                <span className="line-clamp-2 break-words text-left">{option}</span>
              </AnswerButton>
            ))}
          </div>
        </div>
      )}

      {stage.kind === "reveal" && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={advance}
            autoFocus
            className={`${buttonBase} border-transparent bg-seal text-white`}
          >
            Next word
          </button>
          <p className="mt-2 text-xs text-muted">
            Press <kbd className="rounded border border-line px-1.5 py-0.5">space</kbd> to continue
          </p>
        </div>
      )}

      <RunnerKeys
        stage={stage}
        optionCount={question.options.length}
        onAssess={(a) => (a === "dontKnow" ? commit("dontKnow", null) : setStage({ kind: "choose", assessment: a }))}
        onChoose={(i) => stage.kind === "choose" && commit(stage.assessment, i)}
        onNext={advance}
      />
    </Frame>
  );
}

function AnswerButton({
  hint,
  onClick,
  children,
}: {
  hint: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${buttonBase} w-full justify-between border-line bg-surface text-ink hover:border-seal/40`}
    >
      {children}
      <span className="ml-2 shrink-0 text-[10.5px] text-muted" aria-hidden="true">
        key {hint}
      </span>
    </button>
  );
}

function RevealPanel({
  entry,
  question,
  stage,
}: {
  entry: NonNullable<ReturnType<typeof getEntry>>;
  question: CalibrationQuestion;
  stage: Extract<RunnerStage, { kind: "reveal" }>;
}) {
  const { result } = stage;
  const verdict =
    result.outcome === "known"
      ? "Correct — skipped for now, with a check-in later."
      : result.outcome === "missed"
        ? "Not quite — this word joins your learning queue."
        : "No problem — this word joins your learning queue.";
  return (
    <div className="mt-6 space-y-2" role="status">
      <div className="text-lg font-medium text-seal">{entry.pinyin}</div>
      <div className="mx-auto max-w-md break-words text-base text-ink">
        {question.options[question.answer]}
      </div>
      <div className="flex items-center justify-center gap-2 pt-1">
        <HskBadge level={question.level} />
        <span
          className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
            result.outcome === "known"
              ? "bg-celadon/15 text-celadon"
              : "bg-seal/15 text-seal"
          }`}
        >
          {result.outcome === "known" ? "✓ Known" : result.outcome === "missed" ? "✗ Missed" : "→ To learn"}
        </span>
      </div>
      <p className="text-xs italic text-muted">{verdict}</p>
    </div>
  );
}

function BlockComplete({
  state,
  progress,
  onContinue,
  onPause,
  onApply,
}: {
  state: CalibrationState;
  progress: ReturnType<typeof calibrationProgress>;
  onContinue: () => void;
  onPause: () => void;
  onApply: (state: CalibrationState) => void;
}) {
  return (
    <Frame>
      <header className="mt-4 mb-6 text-center">
        <SectionTitle>Block complete</SectionTitle>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-ink">
          Nice — take a breath.
        </h1>
        <p className="mt-2 text-sm text-muted">
          {progress.answered.toLocaleString()} of {progress.totalWords.toLocaleString()} words
          answered so far · {progress.known.toLocaleString()} known ·{" "}
          {(progress.missed + progress.dontKnow).toLocaleString()} to learn.
        </p>
      </header>
      <ProgressOverview progress={progress} />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onContinue} className={`${buttonBase} border-transparent bg-seal text-white`}>
          <Play size={14} /> Next block
        </button>
        <button type="button" onClick={onPause} className={`${buttonBase} border-line bg-surface text-ink`}>
          <Pause size={14} /> Stop for now (saved)
        </button>
        <button
          type="button"
          onClick={() => {
            const untested = progress.totalWords - progress.answered;
            if (
              window.confirm(
                `Apply results now? ${progress.known.toLocaleString()} words will be assumed known. ${untested.toLocaleString()} untested words stay in the ordinary new-word queue.`,
              )
            ) {
              onApply(state);
            }
          }}
          className={`${buttonBase} border-line bg-surface text-muted hover:text-ink`}
        >
          <CheckCircle2 size={14} /> Finish &amp; apply
        </button>
      </div>
    </Frame>
  );
}

function PlanComplete({
  progress,
  onApply,
  onPause,
}: {
  progress: ReturnType<typeof calibrationProgress>;
  onApply: () => void;
  onPause: () => void;
}) {
  return (
    <Frame>
      <header className="mt-4 mb-6 text-center">
        <SectionTitle>Calibration finished</SectionTitle>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-ink">
          Every word answered.
        </h1>
        <p className="mt-2 text-sm text-muted">
          {progress.known.toLocaleString()} words look known ·{" "}
          {(progress.missed + progress.dontKnow).toLocaleString()} head to your learning queue.
          Confirm to apply this as your starting baseline — known words are
          skipped for now and spot-checked later, never marked as mastered.
        </p>
      </header>
      <ProgressOverview progress={progress} />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Apply the baseline? ${progress.known.toLocaleString()} words will be assumed known and verified over the coming weeks.`,
              )
            ) {
              onApply();
            }
          }}
          className={`${buttonBase} border-transparent bg-seal text-white`}
        >
          <CheckCircle2 size={14} /> Apply baseline
        </button>
        <button type="button" onClick={onPause} className={`${buttonBase} border-line bg-surface text-muted hover:text-ink`}>
          Decide later
        </button>
      </div>
    </Frame>
  );
}

function RunnerKeys({
  stage,
  optionCount,
  onAssess,
  onChoose,
  onNext,
}: {
  stage: RunnerStage;
  optionCount: number;
  onAssess: (a: CalibrationSelfAssessment) => void;
  onChoose: (i: number) => void;
  onNext: () => void;
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (stage.kind === "assess") {
        if (e.key === "1") onAssess("know");
        else if (e.key === "2") onAssess("unsure");
        else if (e.key === "3") onAssess("dontKnow");
      } else if (stage.kind === "choose") {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= optionCount) onChoose(n - 1);
      } else if (stage.kind === "reveal") {
        if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          onNext();
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stage, optionCount, onAssess, onChoose, onNext]);
  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Summary & management for a completed calibration
 * ──────────────────────────────────────────────────────────────────────────── */

function CalibrationSummary({
  state,
  onRecalibrate,
  onReset,
  onReturnWord,
}: {
  state: CalibrationState;
  onRecalibrate: () => void;
  onReset: () => void;
  onReturnWord: (word: string) => void;
}) {
  const [query, setQuery] = useState("");
  const metrics = useMemo(() => calibrationMetrics(loadSrsMap(), state), [state]);

  const baselineRows = useMemo(() => {
    const rows = Object.entries(state.baseline).map(([word, entry]) => ({
      word,
      level: entry.level,
      verifyAt: entry.verifyAt,
      confidence: entry.confidence,
    }));
    rows.sort((a, b) => a.level - b.level || a.word.localeCompare(b.word));
    const q = query.trim().toLowerCase();
    return q
      ? rows.filter((r) => r.word.includes(q) || getEntry(r.word)?.pinyin.toLowerCase().includes(q))
      : rows;
  }, [state, query]);

  const methodLabel =
    state.method === "comprehensive"
      ? "Comprehensive calibration"
      : state.method === "quickSetup"
        ? `Quick setup (starting at HSK ${state.quickSetupLevel ?? "?"})`
        : "Started from scratch (no baseline)";

  return (
    <Frame>
      <header className="mt-4 mb-6">
        <SectionTitle>词汇校准 · Vocabulary calibration</SectionTitle>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Calibration
        </h1>
        <p className="mt-1 text-sm text-muted">
          {methodLabel}
          {state.completedAt && ` · ${new Date(state.completedAt).toLocaleDateString()}`}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Known (calibrated)" value={metrics.estimatedKnown} help="Estimated from calibration; verified over time" />
        <MetricTile label="Mastered via review" value={metrics.masteredThroughSrs} help="Earned through genuine spaced repetition" />
        <MetricTile label="In rotation" value={metrics.currentlyLearning} help="Words with active review history" />
        <MetricTile label="Check-ins due" value={metrics.verificationsDue} help="Assumed-known words ready to verify" />
      </div>

      {(state.verifiedCount ?? 0) + (state.failedVerificationCount ?? 0) > 0 && (
        <p className="mt-3 text-xs text-muted">
          Verification so far: {state.verifiedCount ?? 0} passed · {state.failedVerificationCount ?? 0} returned to learning.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={onRecalibrate} className={`${buttonBase} border-line bg-surface text-ink`}>
          <RotateCcw size={14} /> Recalibrate
        </button>
        <button type="button" onClick={onReset} className={`${buttonBase} border-line bg-surface text-muted hover:text-ink`}>
          Reset calibration only
        </button>
      </div>
      <p className="mt-2 max-w-xl text-xs italic text-muted">
        Recalibrating or resetting only changes what calibration assumed —
        your genuine review history, saved words, and reading progress are
        never modified.
      </p>

      {Object.keys(state.baseline).length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-ink">
            Assumed-known words
          </h2>
          <p className="mt-1 text-sm text-muted">
            Skipped from the new-word queue until their check-in date. Return
            any word to active study if you&apos;d rather drill it now.
          </p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Chinese or pinyin"
            aria-label="Search assumed-known words"
            className="mt-3 w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-paper focus:border-seal/50 focus:outline-none focus:ring-2 focus:ring-seal/15"
          />
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {baselineRows.slice(0, 200).map((row) => (
              <li
                key={row.word}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-paper"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-cjk text-xl text-ink">{row.word}</span>
                    <span className="truncate text-[11px] text-muted">
                      {getEntry(row.word)?.pinyin ?? ""}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    HSK {row.level} · check-in {new Date(row.verifyAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onReturnWord(row.word)}
                  aria-label={`Return ${row.word} to active study`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-seal"
                >
                  <Undo2 size={11} /> Study now
                </button>
              </li>
            ))}
          </ul>
          {baselineRows.length > 200 && (
            <p className="mt-2 text-xs text-muted">
              Showing the first 200 of {baselineRows.length.toLocaleString()} — use search to narrow.
            </p>
          )}
        </section>
      )}
    </Frame>
  );
}

function MetricTile({
  label,
  value,
  help,
}: {
  label: string;
  value: number;
  help: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-paper">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="mt-0.5 font-serif text-2xl font-semibold text-ink">
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-[10.5px] italic text-muted">{help}</div>
    </div>
  );
}
