"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { DONT_KNOW, readingSections } from "@/data/placementQuestions";

/**
 * Reading is sequential by passage. We show one question at a time inside
 * the current passage, then gate progression to the next passage on the
 * learner clearing a minimum accuracy on the current one.
 *
 * If they miss the gate, the remaining questions stay `null` — the scorer
 * already treats `null` as "don't know", so abandoning never inflates the
 * level.
 */
export function ReadingFlashcardSection({
  /** Minimum correct fraction to unlock the next passage. */
  minAccuracyToContinue,
  onBack,
  onComplete,
}: {
  minAccuracyToContinue: number;
  onBack?: () => void;
  onComplete: (
    answers: (number | null)[],
    stopReason: "finished" | "accuracy-gate",
  ) => void;
}) {
  const totalQs = useMemo(
    () => readingSections.reduce((acc, s) => acc + s.questions.length, 0),
    [],
  );
  const [picks, setPicks] = useState<(number | null)[]>(() =>
    Array(totalQs).fill(null),
  );
  const [sectionIdx, setSectionIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);

  useEffect(() => {
    setPicks(Array(totalQs).fill(null));
    setSectionIdx(0);
    setQIdx(0);
  }, [totalQs]);

  const section = readingSections[sectionIdx];

  // Cumulative offset of the current section in the flat picks array.
  const offset = useMemo(() => {
    let n = 0;
    for (let i = 0; i < sectionIdx; i++) n += readingSections[i].questions.length;
    return n;
  }, [sectionIdx]);

  if (!section) return null;
  const current = section.questions[qIdx];

  const accuracyOfSection = (
    flat: (number | null)[],
    secIdx: number,
  ): number => {
    const s = readingSections[secIdx];
    let off = 0;
    for (let i = 0; i < secIdx; i++) off += readingSections[i].questions.length;
    let correct = 0;
    for (let i = 0; i < s.questions.length; i++) {
      const p = flat[off + i];
      if (p !== null && p !== DONT_KNOW && p === s.questions[i].answer) correct += 1;
    }
    return correct / s.questions.length;
  };

  const pick = (choice: number) => {
    const nextPicks = picks.map((p, i) => (i === offset + qIdx ? choice : p));
    setPicks(nextPicks);

    const lastInSection = qIdx + 1 >= section.questions.length;
    if (!lastInSection) {
      setQIdx(qIdx + 1);
      return;
    }

    // Finished this passage. Decide whether to advance to the next one.
    const acc = accuracyOfSection(nextPicks, sectionIdx);
    const isLastSection = sectionIdx + 1 >= readingSections.length;
    if (isLastSection) {
      onComplete(nextPicks, "finished");
      return;
    }
    if (acc < minAccuracyToContinue) {
      onComplete(nextPicks, "accuracy-gate");
      return;
    }
    setSectionIdx(sectionIdx + 1);
    setQIdx(0);
  };

  const progress =
    ((readingSections.slice(0, sectionIdx).reduce((a, s) => a + s.questions.length, 0) +
      qIdx +
      1) /
      totalQs) *
    100;

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
          Reading
        </h2>
        <span
          className="text-[11.5px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          Passage {sectionIdx + 1} / {readingSections.length} · Q {qIdx + 1} /{" "}
          {section.questions.length}
        </span>
      </div>
      <p
        className="mb-3 font-serif text-sm italic"
        style={{ color: "var(--muted)" }}
      >
        Read the passage, answer the question below it. Reach{" "}
        {Math.round(minAccuracyToContinue * 100)}% on a passage to unlock the
        next.
      </p>

      <div
        className="mb-5 h-1 w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--line) 60%, transparent)" }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${progress}%`, background: "var(--seal)" }}
        />
      </div>

      <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--seal)" }}
      >
        Passage {sectionIdx + 1} · HSK {section.targetHsk ?? 3}
      </div>
      <blockquote
        className="mb-5 rounded-xl px-4 py-4 font-cjk-serif text-xl leading-loose"
        style={{
          background: "color-mix(in srgb, var(--paper-2) 80%, transparent)",
          border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
          color: "var(--ink)",
        }}
      >
        {section.passage}
      </blockquote>

      <div
        key={`${sectionIdx}-${qIdx}`}
        className="animate-fade-in rounded-2xl p-6 shadow-paper sm:p-8"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <div
          className="mb-5 font-serif text-lg font-medium leading-snug"
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
