"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, ListChecks, X } from "lucide-react";
import { HskBadge } from "@/components/ui/Badge";
import {
  applyGrade,
  buildSession,
  graduated,
  GRADUATE_AT,
  pendingSrsUpdates,
  pickDeck,
  pickNext,
  remaining,
  type SessionCard,
  type SessionState,
} from "@/lib/hsk-study/scheduler";
import { loadSrsMap, setSrsBatch, isLearned } from "@/lib/hsk-study/storage";
import type { SrsGrade } from "@/types/hskStudy";
import type { WordEntry } from "@/types/dictionary";

interface Props {
  pool: WordEntry[];
  deckLabel: string;
  newPerSession?: number;
  maxReviews?: number;
}

type Phase = "studying" | "done";

export function StudySession({
  pool,
  deckLabel,
  newPerSession = 10,
  maxReviews = 50,
}: Props) {
  const [version, setVersion] = useState(0);
  const initial = useMemo(() => {
    const deck = pickDeck(pool, (w) => w.simplified, loadSrsMap(), {
      maxReviews,
      maxNew: newPerSession,
    });
    return buildSession(deck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, newPerSession, maxReviews, version]);

  const [state, setState] = useState<SessionState<WordEntry>>(initial);
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>("studying");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setState(initial);
    setRevealed(false);
    setPhase(initial.cards.length === 0 ? "done" : "studying");
  }, [initial]);

  useEffect(() => {
    if (phase !== "done") return;
    const updates = pendingSrsUpdates(state);
    if (Object.keys(updates).length > 0) setSrsBatch(updates);
  }, [phase, state]);

  const current = pickNext(state);
  const total = state.cards.length;
  const left = remaining(state);
  const learned = graduated(state);

  function grade(g: SrsGrade) {
    if (!current) return;
    const next = applyGrade(state, current.id, g);
    setRevealed(false);
    setState(next);
    if (remaining(next) === 0) setPhase("done");
  }

  function restart() {
    setVersion((v) => v + 1);
  }

  if (total === 0) {
    return <EmptyState deckLabel={deckLabel} reason="no-cards" onRestart={restart} />;
  }

  if (phase === "done" || !current) {
    return (
      <EmptyState
        deckLabel={deckLabel}
        reason="done"
        onRestart={restart}
        stats={{ learned, total }}
      />
    );
  }

  const word = current.data;
  const isNew = !current.initialSrs;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:py-8">
      <Header
        deckLabel={deckLabel}
        learned={learned}
        total={total}
        left={left}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <div
            onClick={() => setRevealed(true)}
            className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 py-10 text-center shadow-paper transition-shadow hover:shadow-paper-md"
          >
            <div className="font-cjk text-6xl text-ink sm:text-7xl">{word.simplified}</div>

            {revealed ? (
              <div className="mt-6 space-y-2">
                <div className="text-lg font-medium text-seal">{word.pinyin}</div>
                <div className="mx-auto max-w-md text-base text-ink">
                  {word.definitions.slice(0, 3).join("; ")}
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <HskBadge level={word.hsk30 ?? word.hskLevel} />
                  {isNew && (
                    <span className="rounded-full bg-celadon/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-celadon">
                      New
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 text-xs text-muted">tap card to reveal</div>
            )}
          </div>

          {revealed ? (
            <GradeButtons onGrade={grade} />
          ) : (
            <div className="mt-5 text-center text-xs text-muted">
              Press <kbd className="rounded border border-line px-1.5 py-0.5">space</kbd> to reveal
            </div>
          )}
        </div>

        <SessionSidebar
          cards={state.cards}
          currentId={current.id}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <KeyHandler revealed={revealed} onReveal={() => setRevealed(true)} onGrade={grade} />
    </div>
  );
}

function Header({
  deckLabel,
  learned,
  total,
  left,
  onToggleSidebar,
}: {
  deckLabel: string;
  learned: number;
  total: number;
  left: number;
  onToggleSidebar: () => void;
}) {
  const pct = total === 0 ? 0 : Math.round((learned / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-1 text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Vocabulary
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-muted">
            <span className="font-medium text-ink">{deckLabel}</span> · {left} left ·{" "}
            {learned}/{total} done
          </span>
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle session progress"
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted shadow-paper hover:text-ink lg:hidden"
          >
            <ListChecks size={13} /> Progress
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/60">
        <div
          className="h-full rounded-full bg-celadon transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GradeButtons({ onGrade }: { onGrade: (g: SrsGrade) => void }) {
  const items: Array<{ grade: SrsGrade; label: string; hint: string; cls: string }> = [
    { grade: "again", label: "Again", hint: "1", cls: "bg-rose-100 text-rose-900 hover:bg-rose-200 border-rose-200" },
    { grade: "hard", label: "Hard", hint: "2", cls: "bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-200" },
    { grade: "good", label: "Good", hint: "3", cls: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-emerald-200" },
    { grade: "easy", label: "Easy", hint: "4", cls: "bg-sky-100 text-sky-900 hover:bg-sky-200 border-sky-200" },
  ];
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <button
          key={it.grade}
          onClick={() => onGrade(it.grade)}
          className={`flex flex-col items-center rounded-xl border px-3 py-3 text-sm font-medium shadow-paper transition-all hover:-translate-y-px ${it.cls}`}
        >
          <span>{it.label}</span>
          <span className="mt-0.5 text-[10.5px] opacity-70">key {it.hint}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Per-card progress sidebar. Each row shows the word, its starting status
 * (new vs. review) and a row of dots tracking how close it is to graduating
 * out of this session. Once the card has graduated, the dots become a small
 * "Learned" marker if its persisted SRS state has reached the weekly band.
 */
function SessionSidebar({
  cards,
  currentId,
  open,
  onClose,
}: {
  cards: SessionCard<WordEntry>[];
  currentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const content = (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-paper">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
            This session
          </div>
          <div className="font-serif text-sm text-ink">
            {cards.filter((c) => c.done).length} / {cards.length} done
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close progress"
          className="rounded-md p-1 text-muted hover:text-ink lg:hidden"
        >
          <X size={16} />
        </button>
      </div>
      <ul className="flex-1 divide-y divide-line/60 overflow-y-auto">
        {cards.map((c) => (
          <SidebarRow key={c.id} card={c} isCurrent={c.id === currentId} />
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-6">{content}</div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="flex-1 bg-ink/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="w-[78vw] max-w-sm bg-paper p-3">{content}</div>
        </div>
      )}
    </>
  );
}

function SidebarRow({
  card,
  isCurrent,
}: {
  card: SessionCard<WordEntry>;
  isCurrent: boolean;
}) {
  const isNew = !card.initialSrs;
  const fullyLearned = card.done && isLearned(card.srs);
  const dots = Array.from({ length: GRADUATE_AT }, (_, i) => i < card.goodReps);

  return (
    <li
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
        isCurrent ? "bg-seal/10" : ""
      }`}
      style={isCurrent ? { borderLeft: "2px solid var(--seal)" } : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-cjk text-lg text-ink">{card.data.simplified}</span>
          <span className="text-[11px] text-muted truncate">{card.data.pinyin}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted">
          {card.done ? (
            <span className="font-medium text-celadon">
              {fullyLearned ? "Learned" : "Done this round"}
            </span>
          ) : isNew ? (
            <span className="font-medium text-seal/80">New</span>
          ) : (
            <span>Review</span>
          )}
          {card.sessionReps > 0 && <span>· {card.sessionReps}×</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {card.done ? (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              background: "color-mix(in srgb, var(--celadon) 20%, transparent)",
              color: "var(--celadon)",
            }}
          >
            ✓
          </span>
        ) : (
          dots.map((filled, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full transition-colors"
              style={{
                background: filled
                  ? "var(--celadon)"
                  : "color-mix(in srgb, var(--line) 80%, transparent)",
              }}
              aria-hidden="true"
            />
          ))
        )}
      </div>
    </li>
  );
}

function EmptyState({
  deckLabel,
  reason,
  onRestart,
  stats,
}: {
  deckLabel: string;
  reason: "no-cards" | "done";
  onRestart: () => void;
  stats?: { learned: number; total: number };
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> Vocabulary
      </Link>
      <h1 className="mt-6 text-xl font-semibold text-ink">
        {reason === "done" ? "Session complete" : "Nothing to study"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {reason === "done"
          ? `Great work on ${deckLabel}. You graduated ${stats?.learned ?? 0} of ${stats?.total ?? 0} cards this session.`
          : `${deckLabel} has no cards in this deck yet. Save some words or check back once the full dictionary loads.`}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-paper transition-all hover:-translate-y-px"
        >
          <RotateCcw size={14} /> New session
        </button>
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-muted shadow-paper hover:text-ink"
        >
          Back
        </Link>
      </div>
      {reason === "done" && (
        <div className="mt-4">
          <Link
            href="/vocabulary/learned"
            className="text-xs text-seal hover:underline"
          >
            View all learned words →
          </Link>
        </div>
      )}
    </div>
  );
}

function KeyHandler({
  revealed,
  onReveal,
  onGrade,
}: {
  revealed: boolean;
  onReveal: () => void;
  onGrade: (g: SrsGrade) => void;
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed) {
        if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          onReveal();
        }
        return;
      }
      if (e.key === "1") onGrade("again");
      else if (e.key === "2") onGrade("hard");
      else if (e.key === "3" || e.code === "Space") onGrade("good");
      else if (e.key === "4") onGrade("easy");
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, onReveal, onGrade]);
  return null;
}
