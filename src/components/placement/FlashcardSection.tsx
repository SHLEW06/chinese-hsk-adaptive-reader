"use client";

import { useEffect, useMemo, useState } from "react";
import { HelpCircle, ChevronLeft } from "lucide-react";
import { DONT_KNOW } from "@/data/placementQuestions";

export interface FlashcardQuestion {
  prompt: string;
  options: string[];
  /** Correct option index. */
  answer: number;
}

export type StopReason = "finished" | "wrong-streak";

/**
 * Renders a placement section as one flashcard at a time.
 *
 * - Each answer pick advances to the next card.
 * - Tracks the current run of "wrong or I-don't-know" answers; when it hits
 *   `maxWrongStreak`, the section ends early with reason "wrong-streak".
 *   Remaining questions stay `null` in the answers array, which the scorer
 *   already treats as DONT_KNOW (so abandoning can't inflate the level).
 * - "I don't know" stays as a quiet, secondary action so beginners can still
 *   signal it explicitly when they want to.
 *
 * Notes:
 *   - There's no per-answer feedback (correct/wrong toast). The point is to
 *     get through it fast; the result page tells the learner what they got
 *     right and wrong.
 */
export function FlashcardSection({
  title,
  hint,
  questions,
  maxWrongStreak,
  variant = "default",
  onBack,
  onComplete,
}: {
  title: string;
  hint?: string;
  questions: FlashcardQuestion[];
  maxWrongStreak: number;
  /** "vocab" gets a larger Chinese prompt; default renders normal-sized. */
  variant?: "default" | "vocab";
  onBack?: () => void;
  onComplete: (
    answers: (number | null)[],
    stopReason: StopReason,
    stats: { correct: number; wrong: number; dontKnow: number; answered: number },
  ) => void;
}) {
  const [picks, setPicks] = useState<(number | null)[]>(() =>
    Array(questions.length).fill(null),
  );
  const [idx, setIdx] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);

  // If the question list changes (different section mounted), reset.
  // We key off length + first prompt as a cheap fingerprint.
  const fingerprint = useMemo(
    () => `${questions.length}:${questions[0]?.prompt ?? ""}`,
    [questions],
  );
  useEffect(() => {
    setPicks(Array(questions.length).fill(null));
    setIdx(0);
    setWrongStreak(0);
  }, [fingerprint, questions.length]);

  const current = questions[idx];

  const finish = (nextPicks: (number | null)[], reason: StopReason) => {
    let correct = 0;
    let wrong = 0;
    let dontKnow = 0;
    let answered = 0;
    nextPicks.forEach((p, i) => {
      if (p === null) return;
      answered += 1;
      if (p === DONT_KNOW) dontKnow += 1;
      else if (p === questions[i].answer) correct += 1;
      else wrong += 1;
    });
    onComplete(nextPicks, reason, { correct, wrong, dontKnow, answered });
  };

  const pick = (choice: number) => {
    const nextPicks = picks.map((p, i) => (i === idx ? choice : p));
    setPicks(nextPicks);

    const isCorrect = choice !== DONT_KNOW && choice === current.answer;
    const newStreak = isCorrect ? 0 : wrongStreak + 1;
    setWrongStreak(newStreak);

    if (newStreak >= maxWrongStreak) {
      finish(nextPicks, "wrong-streak");
      return;
    }
    if (idx + 1 >= questions.length) {
      finish(nextPicks, "finished");
      return;
    }
    setIdx(idx + 1);
  };

  if (!current) return null;

  const progress = ((idx + 1) / questions.length) * 100;
  const isVocab = variant === "vocab";

  return (
    <div className="reading-column animate-fade-in">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-[12px] italic"
          style={{ color: "var(--muted)" }}
        >
          <ChevronLeft size={13} /> Back
        </button>
      )}

      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2
          className="font-serif text-2xl font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          {title}
        </h2>
        <span
          className="text-[11.5px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          {idx + 1} / {questions.length}
        </span>
      </div>
      {hint && (
        <p
          className="mb-3 font-serif text-sm italic"
          style={{ color: "var(--muted)" }}
        >
          {hint}
        </p>
      )}

      <div
        className="mb-5 h-1 w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--line) 60%, transparent)" }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            background: "var(--seal)",
          }}
        />
      </div>

      <div
        key={idx}
        className="animate-fade-in rounded-2xl p-6 shadow-paper sm:p-8"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <div
          className={`mb-5 font-medium ${
            isVocab
              ? "font-cjk-serif text-4xl tracking-tight sm:text-5xl"
              : "font-cjk-serif text-2xl leading-relaxed"
          }`}
          style={{ color: "var(--ink)" }}
        >
          {current.prompt}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {current.options.map((o, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className="flex items-start gap-2 rounded-lg px-3 py-3 text-left text-[15px] transition-all hover:-translate-y-px"
              style={{
                background: "color-mix(in srgb, var(--paper-2) 60%, transparent)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              <span
                className="mt-0.5 flex shrink-0 items-center justify-center rounded-full font-mono text-[10px]"
                style={{
                  background: "color-mix(in srgb, var(--line) 60%, transparent)",
                  color: "var(--muted)",
                  width: 20,
                  height: 20,
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="font-serif">{o}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => pick(DONT_KNOW)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] italic transition-colors"
          style={{
            background: "transparent",
            border: "1px dashed color-mix(in srgb, var(--line) 90%, transparent)",
            color: "var(--muted)",
          }}
        >
          <HelpCircle size={13} /> I don&rsquo;t know
        </button>
      </div>
    </div>
  );
}
