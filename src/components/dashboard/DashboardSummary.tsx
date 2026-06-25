"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, BookOpenCheck } from "lucide-react";
import type { LearnerProfile } from "@/types/learner";

function Stat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 shadow-paper transition-shadow hover:shadow-paper-md"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "color-mix(in srgb, var(--muted) 85%, transparent)" }}
      >
        {label}
      </div>
      <div className="mt-1 font-serif text-3xl font-semibold" style={{ color: "var(--ink)" }}>
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-[11px] italic" style={{ color: "var(--muted)" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

/** A quiet, literary descriptor for an HSK band. */
function levelDescriptor(level: number): string {
  if (level <= 1) return "Foothold · 入门";
  if (level === 2) return "Survival · 起步";
  if (level === 3) return "Conversational · 自如";
  if (level === 4) return "Intermediate · 进阶";
  if (level === 5) return "Independent · 流利";
  return "Advanced · 通达";
}

export function DashboardSummary({
  profile,
  counts,
}: {
  profile: LearnerProfile | null;
  counts: { saved: number; known: number; review: number };
}) {
  if (!profile) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl p-6 shadow-paper sm:p-9"
        style={{
          background:
            "linear-gradient(140deg, color-mix(in srgb, var(--seal) 12%, var(--surface)) 0%, var(--paper-2) 60%, var(--surface) 100%)",
          border: "1px solid color-mix(in srgb, var(--seal) 18%, transparent)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "color-mix(in srgb, var(--seal) 18%, transparent)" }}
          aria-hidden="true"
        />
        <div className="relative max-w-md">
          <div
            className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--seal)" }}
          >
            <Sparkles size={13} /> Welcome
          </div>
          <h2
            className="font-serif text-2xl font-semibold sm:text-3xl"
            style={{ color: "var(--ink)" }}
          >
            Find your reading level.
          </h2>
          <p
            className="mt-2 font-serif text-[15px] italic leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            A short, calm diagnostic so the reading room can pick the right passages
            for you — texts pitched just above where you are, never out of reach.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/placement"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-seal transition-all hover:-translate-y-px hover:shadow-paper-md"
              style={{ background: "linear-gradient(180deg, var(--seal), var(--seal-deep))" }}
            >
              <BookOpenCheck size={14} />
              Start placement
              <ArrowRight size={13} />
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
              Browse the library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const knownPct =
    counts.saved === 0 ? 0 : Math.round((counts.known / counts.saved) * 100);

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl p-6 shadow-paper sm:p-8"
        style={{
          background:
            "linear-gradient(140deg, color-mix(in srgb, var(--seal) 9%, var(--surface)) 0%, var(--paper-2) 55%, var(--surface) 100%)",
          border: "1px solid color-mix(in srgb, var(--seal) 16%, transparent)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "color-mix(in srgb, var(--seal) 14%, transparent)" }}
          aria-hidden="true"
        />
        <div className="relative">
          <div
            className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--seal)" }}
          >
            Your level
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <div
              className="font-serif text-5xl font-semibold tracking-tight sm:text-6xl"
              style={{ color: "var(--ink)" }}
            >
              HSK {profile.vocabularyLevel}
            </div>
            <div
              className="font-serif text-sm italic"
              style={{ color: "var(--muted)" }}
            >
              {levelDescriptor(profile.vocabularyLevel)}
            </div>
          </div>

          <div
            className="mt-2 font-serif text-sm"
            style={{ color: "var(--muted)" }}
          >
            grammar ~ HSK {profile.grammarLevel.toFixed(1)} · reading ~ HSK{" "}
            {profile.readingLevel}
          </div>

          {counts.saved > 0 && (
            <div className="mt-5 max-w-sm">
              <div
                className="mb-1 flex items-center justify-between text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                <span>
                  Known {counts.known} / {counts.saved} saved
                </span>
                <span className="font-medium" style={{ color: "var(--celadon)" }}>
                  {knownPct}%
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{ background: "color-mix(in srgb, var(--line) 70%, transparent)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-soft"
                  style={{
                    width: `${knownPct}%`,
                    background:
                      "linear-gradient(90deg, var(--celadon), color-mix(in srgb, var(--celadon) 70%, transparent))",
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-seal transition-all hover:-translate-y-px hover:shadow-paper-md"
              style={{ background: "linear-gradient(180deg, var(--seal), var(--seal-deep))" }}
            >
              Continue reading <ArrowRight size={14} />
            </Link>
            <Link
              href="/placement"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors"
              style={{
                background: "color-mix(in srgb, var(--surface) 70%, transparent)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              Retake placement
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Saved" value={counts.saved} />
        <Stat label="Known" value={counts.known} sublabel="moved to mastery" />
        <Stat label="Review" value={counts.review} sublabel="due in queue" />
      </div>
    </div>
  );
}
