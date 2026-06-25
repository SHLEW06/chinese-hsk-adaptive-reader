"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { hskColor } from "@/lib/dictionary/hsk";
import type { MockExam, MockExamResult } from "@/types/mockExam";

interface Props {
  exam: MockExam;
  onFinish: (result: MockExamResult) => void;
  onCancel: () => void;
}

type Flat = {
  partIndex: number;
  questionIndex: number;
};

export function MockExamRunner({ exam, onFinish, onCancel }: Props) {
  // Flatten all questions in display order so a single cursor moves through.
  const flat: Flat[] = useMemo(() => {
    const out: Flat[] = [];
    exam.parts.forEach((p, pi) => p.questions.forEach((_, qi) => out.push({ partIndex: pi, questionIndex: qi })));
    return out;
  }, [exam]);

  const totalQs = flat.length;
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(totalQs).fill(null));

  const at = flat[cursor];
  const part = exam.parts[at.partIndex];
  const q = part.questions[at.questionIndex];

  const setAnswer = (idx: number) =>
    setAnswers((arr) => arr.map((v, i) => (i === cursor ? idx : v)));

  const progressPct = Math.round(((cursor + 1) / totalQs) * 100);
  const isLast = cursor === totalQs - 1;
  const answered = answers.filter((a) => a !== null).length;

  const finish = () => {
    let cur = 0;
    let totalCorrect = 0;
    const byPart = exam.parts.map((p) => {
      let correct = 0;
      for (let i = 0; i < p.questions.length; i++) {
        if (answers[cur + i] === p.questions[i].answer) correct += 1;
      }
      cur += p.questions.length;
      totalCorrect += correct;
      return {
        section: p.section,
        title: p.title,
        correct,
        total: p.questions.length,
        pct: Math.round((correct / p.questions.length) * 100),
      };
    });
    const pct = Math.round((totalCorrect / totalQs) * 100);
    const result: MockExamResult = {
      level: exam.level,
      correct: totalCorrect,
      total: totalQs,
      pct,
      passed: pct >= exam.passingPct,
      byPart,
      finishedAt: new Date().toISOString(),
    };
    onFinish(result);
  };

  return (
    <div className="reading-column animate-fade-in">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-[12px] italic"
          style={{ color: "var(--muted)" }}
        >
          <ChevronLeft size={14} /> Leave exam
        </button>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ background: hskColor(exam.level) }}
          >
            HSK {exam.level}
          </span>
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            {cursor + 1} / {totalQs}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="mb-5 h-1 overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--line) 70%, transparent)" }}
      >
        <div
          className="h-full transition-all duration-300 ease-soft"
          style={{
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${hskColor(exam.level)}, color-mix(in srgb, ${hskColor(exam.level)} 65%, transparent))`,
          }}
        />
      </div>

      {/* Section header */}
      <div
        className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--seal)" }}
      >
        {part.title} · {part.description}
      </div>

      {/* Question card */}
      <div
        className="rounded-2xl p-5 shadow-paper sm:p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        {q.passage && (
          <blockquote
            className="mb-4 rounded-xl px-4 py-3 font-cjk-serif text-lg leading-loose"
            style={{
              background: "color-mix(in srgb, var(--paper-2) 80%, transparent)",
              border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
              color: "var(--ink)",
            }}
          >
            {q.passage}
          </blockquote>
        )}

        <div
          className="mb-4 font-cjk-serif text-xl leading-relaxed"
          style={{ color: "var(--ink)" }}
        >
          {q.prompt}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const selected = answers[cursor] === i;
            return (
              <button
                key={i}
                onClick={() => setAnswer(i)}
                className="group flex items-start gap-2 rounded-xl px-4 py-3 text-left text-[15px] transition-all hover:-translate-y-px"
                style={{
                  background: selected
                    ? "color-mix(in srgb, var(--seal) 10%, transparent)"
                    : "color-mix(in srgb, var(--paper-2) 60%, transparent)",
                  border: selected
                    ? "1px solid var(--seal)"
                    : "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px]"
                  style={{
                    background: selected ? "var(--seal)" : "color-mix(in srgb, var(--line) 60%, transparent)",
                    color: selected ? "#fff" : "var(--muted)",
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-serif">{o}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer nav */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          disabled={cursor === 0}
          className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background: "color-mix(in srgb, var(--surface) 70%, transparent)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          <ChevronLeft size={14} /> Back
        </button>

        <span
          className="hidden text-[11px] italic sm:inline"
          style={{ color: "var(--muted)" }}
        >
          {answered} of {totalQs} answered
        </span>

        {!isLast ? (
          <button
            onClick={() => setCursor((c) => Math.min(totalQs - 1, c + 1))}
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium shadow-seal transition-all hover:-translate-y-px"
            style={{
              background: "linear-gradient(180deg, var(--seal), var(--seal-deep))",
              color: "#fff",
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={finish}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-seal transition-all hover:-translate-y-px"
            style={{
              background: "linear-gradient(180deg, var(--seal), var(--seal-deep))",
              color: "#fff",
            }}
          >
            <Check size={14} /> Finish
          </button>
        )}
      </div>
    </div>
  );
}
