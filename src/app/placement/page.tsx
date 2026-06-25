"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap, Sparkles, ChevronLeft } from "lucide-react";
import { FlashcardSection } from "@/components/placement/FlashcardSection";
import { ReadingFlashcardSection } from "@/components/placement/ReadingFlashcardSection";
import { PlacementResult } from "@/components/placement/PlacementResult";
import { MockExamRunner } from "@/components/placement/MockExamRunner";
import { MockExamResult as MockExamResultView } from "@/components/placement/MockExamResult";
import { Button } from "@/components/ui/Button";
import {
  vocabQuestions,
  grammarQuestions,
  readingSections,
  selfRatingLabels,
} from "@/data/placementQuestions";
import { mockExams, getMockExam } from "@/data/mockExams";
import { hskColor } from "@/lib/dictionary/hsk";
import { scorePlacement } from "@/lib/placement/scoring";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import type { PlacementAnswers } from "@/types/placement";
import type { LearnerProfile } from "@/types/learner";
import type { MockExamResult as MockExamResultType } from "@/types/mockExam";

// Section stop thresholds. Each is consecutive answers that are wrong or
// "I don't know" — a single correct answer resets the streak.
const VOCAB_STREAK_STOP = 5;
const GRAMMAR_STREAK_STOP = 3;
// Per-passage accuracy gate for advancing to the next reading passage.
const READING_GATE = 0.5;

type Mode =
  | { kind: "lobby" }
  | { kind: "adaptive"; step: "vocab" | "grammar" | "reading" | "self" | "result" }
  | { kind: "mock"; level: number; phase: "running" | "result"; result?: MockExamResultType };

const totalReadingQs = readingSections.reduce((acc, s) => acc + s.questions.length, 0);

export default function PlacementPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>({ kind: "lobby" });
  const [existing, setExisting] = useState<LearnerProfile | null>(null);
  const [result, setResult] = useState<LearnerProfile | null>(null);

  const [vocab, setVocab] = useState<(number | null)[]>(
    Array(vocabQuestions.length).fill(null),
  );
  const [grammar, setGrammar] = useState<(number | null)[]>(
    Array(grammarQuestions.length).fill(null),
  );
  const [reading, setReading] = useState<(number | null)[]>(
    Array(totalReadingQs).fill(null),
  );
  const [self, setSelf] = useState<number[]>(Array(selfRatingLabels.length).fill(3));

  useEffect(() => {
    let cancelled = false;
    getStorageProvider(user)
      .getLearnerProfile()
      .then((profile) => {
        if (!cancelled) setExisting(profile);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setAt = <T,>(arr: T[], i: number, v: T): T[] =>
    arr.map((x, idx) => (idx === i ? v : x));

  const finishAdaptive = async () => {
    const answers: PlacementAnswers = { vocab, grammar, reading, self };
    const profile = scorePlacement(answers);
    await getStorageProvider(user).savePlacementResult(profile);
    setResult(profile);
    setMode({ kind: "adaptive", step: "result" });
  };

  if (mode.kind === "lobby") {
    return (
      <div className="space-y-9 animate-fade-in">
        <div>
          <div
            className="text-[10.5px] uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
          >
            水平测试 · Level diagnostic
          </div>
          <h1
            className="mt-1 font-serif text-3xl font-semibold tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            Where are you on the path?
          </h1>
          <p
            className="mt-1 font-serif text-sm italic"
            style={{ color: "var(--muted)" }}
          >
            Two quiet diagnostics: a quick adaptive estimate, or a full mock HSK exam.
          </p>
        </div>

        {existing && (
          <div
            className="rounded-2xl p-5 shadow-paper sm:p-6"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--seal) 8%, var(--surface)) 0%, var(--paper-2) 70%)",
              border: "1px solid color-mix(in srgb, var(--seal) 16%, transparent)",
            }}
          >
            <div
              className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--seal)" }}
            >
              Current estimate
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <div
                className="font-serif text-3xl font-semibold tracking-tight"
                style={{ color: "var(--ink)" }}
              >
                HSK {existing.vocabularyLevel}
              </div>
              <div className="font-serif text-sm" style={{ color: "var(--muted)" }}>
                grammar ~ HSK {existing.grammarLevel.toFixed(1)} · reading ~ HSK{" "}
                {existing.readingLevel}
              </div>
            </div>
          </div>
        )}

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2
              className="font-serif text-xl font-semibold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Quick adaptive estimate
            </h2>
            <span className="text-[12px] italic" style={{ color: "var(--muted)" }}>
              ~12 min
            </span>
          </div>
          <button
            onClick={() => setMode({ kind: "adaptive", step: "vocab" })}
            className="group flex w-full items-start gap-4 rounded-2xl p-5 text-left shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-paper-md sm:p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, var(--seal), var(--seal-deep))",
                color: "#fff",
              }}
            >
              <Sparkles size={20} />
            </span>
            <div className="flex-1">
              <div
                className="font-serif text-lg font-semibold"
                style={{ color: "var(--ink)" }}
              >
                Adaptive placement
              </div>
              <p
                className="mt-1 font-serif text-sm italic"
                style={{ color: "var(--muted)" }}
              >
                A long vocabulary section (12 words per HSK band, easy → hard),
                grammar, three reading passages, and a self-rating. Each item has
                an &ldquo;I don&rsquo;t know&rdquo; option — please use it instead
                of guessing, so the result actually reflects what you know.
              </p>
            </div>
            <ArrowRight
              size={16}
              className="mt-1 transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--seal)" }}
            />
          </button>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2
              className="font-serif text-xl font-semibold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              HSK mock exams
            </h2>
            <span className="text-[12px] italic" style={{ color: "var(--muted)" }}>
              level-by-level
            </span>
          </div>
          <p
            className="mb-4 font-serif text-sm italic"
            style={{ color: "var(--muted)" }}
          >
            Each exam is a balanced subset of the official sections (vocabulary, grammar, reading)
            so you can see whether you would pass that band today.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mockExams.map((e) => {
              const c = hskColor(e.level);
              const total = e.parts.reduce((acc, p) => acc + p.questions.length, 0);
              return (
                <button
                  key={e.level}
                  onClick={() =>
                    setMode({ kind: "mock", level: e.level, phase: "running" })
                  }
                  className="group rounded-2xl p-5 text-left shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-paper-md"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white"
                      style={{ background: c }}
                    >
                      HSK {e.level}
                    </span>
                    <GraduationCap size={14} style={{ color: c }} />
                  </div>
                  <div
                    className="font-serif text-base font-semibold leading-snug"
                    style={{ color: "var(--ink)" }}
                  >
                    Mock exam · level {e.level}
                  </div>
                  <p
                    className="mt-1 line-clamp-3 font-serif text-[12.5px] italic leading-snug"
                    style={{ color: "var(--muted)" }}
                  >
                    {e.intro}
                  </p>
                  <div
                    className="mt-3 flex items-center justify-between text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    <span>
                      {total} questions · {e.durationMinutes} min
                    </span>
                    <span style={{ color: c }} className="font-medium">
                      Begin →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  if (mode.kind === "mock") {
    const exam = getMockExam(mode.level);
    if (!exam) return null;
    if (mode.phase === "running") {
      return (
        <MockExamRunner
          exam={exam}
          onCancel={() => setMode({ kind: "lobby" })}
          onFinish={(r) =>
            setMode({ kind: "mock", level: mode.level, phase: "result", result: r })
          }
        />
      );
    }
    if (mode.result) {
      return (
        <MockExamResultView
          result={mode.result}
          onRetake={() =>
            setMode({ kind: "mock", level: mode.level, phase: "running" })
          }
          onLeave={() => setMode({ kind: "lobby" })}
        />
      );
    }
    return null;
  }

  const backToLobby = () => setMode({ kind: "lobby" });

  if (mode.step === "vocab") {
    return (
      <FlashcardSection
        title="Vocabulary"
        hint="Pick the closest English meaning. Items start very easy and get harder. If you miss 5 in a row, we'll stop — no need to grind through every card."
        questions={vocabQuestions}
        maxWrongStreak={VOCAB_STREAK_STOP}
        variant="vocab"
        onBack={backToLobby}
        onComplete={(picks) => {
          setVocab(picks);
          setMode({ kind: "adaptive", step: "grammar" });
        }}
      />
    );
  }

  if (mode.step === "grammar") {
    return (
      <FlashcardSection
        title="Grammar"
        hint="Fill the blank with the most natural choice. Miss 3 in a row and we'll move on."
        questions={grammarQuestions}
        maxWrongStreak={GRAMMAR_STREAK_STOP}
        onBack={() => setMode({ kind: "adaptive", step: "vocab" })}
        onComplete={(picks) => {
          setGrammar(picks);
          setMode({ kind: "adaptive", step: "reading" });
        }}
      />
    );
  }

  if (mode.step === "reading") {
    return (
      <ReadingFlashcardSection
        minAccuracyToContinue={READING_GATE}
        onBack={() => setMode({ kind: "adaptive", step: "grammar" })}
        onComplete={(picks) => {
          setReading(picks);
          setMode({ kind: "adaptive", step: "self" });
        }}
      />
    );
  }

  if (mode.step === "self") {
    return (
      <div className="reading-column animate-fade-in">
        <button
          onClick={() => setMode({ kind: "adaptive", step: "reading" })}
          className="mb-4 inline-flex items-center gap-1 text-[12px] italic"
          style={{ color: "var(--muted)" }}
        >
          <ChevronLeft size={13} /> Back
        </button>
        <h2
          className="mb-1 font-serif text-2xl font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Self-rating
        </h2>
        <p
          className="mb-5 font-serif text-sm italic"
          style={{ color: "var(--muted)" }}
        >
          1 is weak, 5 is strong. Be honest — this only affects which texts we surface.
        </p>
        {selfRatingLabels.map((label, i) => (
          <div
            key={label}
            className="mb-3 rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <div className="mb-3 font-serif text-base" style={{ color: "var(--ink)" }}>
              {label}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSelf(setAt(self, i, n))}
                  className="h-10 w-10 rounded-full text-sm transition-all hover:-translate-y-px"
                  style={
                    self[i] === n
                      ? {
                          background: "var(--seal)",
                          color: "#fff",
                          border: "1px solid var(--seal)",
                        }
                      : {
                          background: "color-mix(in srgb, var(--paper-2) 60%, transparent)",
                          color: "var(--muted)",
                          border: "1px solid var(--line)",
                        }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button onClick={finishAdaptive}>See results <ArrowRight size={14} /></Button>
      </div>
    );
  }

  return (
    <div className="reading-column animate-fade-in">
      {result && <PlacementResult profile={result} />}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-seal transition-all hover:-translate-y-px"
          style={{ background: "linear-gradient(180deg, var(--seal), var(--seal-deep))" }}
        >
          Go to dashboard <ArrowRight size={13} />
        </Link>
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors"
          style={{
            background: "color-mix(in srgb, var(--surface) 70%, transparent)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          Start reading
        </Link>
        <button
          onClick={backToLobby}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors"
          style={{
            background: "color-mix(in srgb, var(--surface) 70%, transparent)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          Try a mock exam
        </button>
      </div>
    </div>
  );
}
