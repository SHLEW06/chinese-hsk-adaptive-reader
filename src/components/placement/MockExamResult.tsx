"use client";

import Link from "next/link";
import { BookOpen, Repeat, GraduationCap } from "lucide-react";
import { hskColor } from "@/lib/dictionary/hsk";
import type { MockExamResult } from "@/types/mockExam";

interface Props {
  result: MockExamResult;
  onRetake: () => void;
  onLeave: () => void;
}

function verdict(pct: number): { label: string; tone: string } {
  if (pct >= 85) return { label: "Confidently passing", tone: "var(--celadon)" };
  if (pct >= 70) return { label: "Solidly passing", tone: "var(--celadon)" };
  if (pct >= 60) return { label: "Just passing", tone: "#C98A1B" };
  if (pct >= 45) return { label: "Approaching this level", tone: "#C98A1B" };
  return { label: "Not yet at this level", tone: "var(--seal)" };
}

export function MockExamResult({ result, onRetake, onLeave }: Props) {
  const v = verdict(result.pct);
  const color = hskColor(result.level);
  return (
    <div className="reading-column animate-fade-in space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl p-6 shadow-paper sm:p-8"
        style={{
          background:
            "linear-gradient(140deg, color-mix(in srgb, var(--seal) 8%, var(--surface)) 0%, var(--paper-2) 60%, var(--surface) 100%)",
          border: "1px solid color-mix(in srgb, var(--seal) 16%, transparent)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
          style={{ background: `color-mix(in srgb, ${color} 22%, transparent)` }}
          aria-hidden="true"
        />
        <div className="relative">
          <div
            className="mb-1.5 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white"
            style={{ background: color }}
          >
            <GraduationCap size={12} />
            HSK {result.level} mock
          </div>
          <h1
            className="font-serif text-3xl font-semibold sm:text-4xl"
            style={{ color: "var(--ink)" }}
          >
            {v.label}.
          </h1>
          <p
            className="mt-2 font-serif text-[15px] italic"
            style={{ color: "var(--muted)" }}
          >
            You answered {result.correct} of {result.total} questions correctly — {result.pct}%.
          </p>

          <div className="mt-6 flex items-end gap-4">
            <div
              className="font-serif text-6xl font-semibold leading-none tracking-tight sm:text-7xl"
              style={{ color: v.tone }}
            >
              {result.pct}%
            </div>
            <div className="pb-2 font-serif text-sm" style={{ color: "var(--muted)" }}>
              passing line · 60%
              <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--line) 70%, transparent)" }}>
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, result.pct)}%`,
                    background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, transparent))`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={onRetake}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-seal transition-all hover:-translate-y-px"
              style={{
                background: "linear-gradient(180deg, var(--seal), var(--seal-deep))",
                color: "#fff",
              }}
            >
              <Repeat size={14} /> Retake this exam
            </button>
            <button
              onClick={onLeave}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors"
              style={{
                background: "color-mix(in srgb, var(--surface) 70%, transparent)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              Try a different level
            </button>
            <Link
              href="/reader"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors"
              style={{
                background: "color-mix(in srgb, var(--surface) 70%, transparent)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              <BookOpen size={14} /> Go read
            </Link>
          </div>
        </div>
      </div>

      <div>
        <div
          className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--seal)" }}
        >
          Section breakdown
        </div>
        <div className="space-y-2.5">
          {result.byPart.map((p) => (
            <div
              key={p.section + p.title}
              className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm font-medium" style={{ color: "var(--ink)" }}>
                <span className="font-serif">{p.title}</span>
                <span className="font-mono text-[12px]" style={{ color: "var(--muted)" }}>
                  {p.correct}/{p.total}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{ background: "color-mix(in srgb, var(--line) 70%, transparent)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${p.pct}%`,
                    background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, transparent))`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
