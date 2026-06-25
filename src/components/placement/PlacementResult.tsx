"use client";

import { hskColor } from "@/lib/dictionary/hsk";
import type { LearnerProfile } from "@/types/learner";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 shadow-paper"
      style={{
        background: accent
          ? "color-mix(in srgb, var(--seal) 9%, var(--surface))"
          : "var(--surface)",
        border: accent ? "1px solid var(--seal)" : "1px solid var(--line)",
      }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: accent ? "var(--seal)" : "var(--muted)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-serif text-2xl font-semibold tracking-tight"
        style={{ color: accent ? "var(--seal)" : "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

export function PlacementResult({ profile }: { profile: LearnerProfile }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <div
          className="text-[10.5px] uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
        >
          诊断结果 · Diagnostic
        </div>
        <h2
          className="mt-1 font-serif text-2xl font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Here&apos;s where you are.
        </h2>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Vocabulary" value={`HSK ${profile.vocabularyLevel}`} />
        <Stat label="Grammar" value={`HSK ${profile.grammarLevel.toFixed(1)}`} />
        <Stat label="Reading" value={`HSK ${profile.readingLevel}`} />
        <Stat label="Target band" value={`HSK ${profile.targetLevel}`} accent />
      </div>

      {profile.accuracyByLevel && (
        <div
          className="mb-3 rounded-xl p-4 shadow-paper"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div
            className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--seal)" }}
          >
            Vocab accuracy · by level
          </div>
          {profile.accuracyByLevel.map((a) => (
            <div key={a.level} className="mb-2 flex items-center gap-3">
              <span
                className="w-12 font-mono text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                HSK {a.level}
              </span>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ background: "color-mix(in srgb, var(--line) 70%, transparent)" }}
              >
                <div
                  className="h-full transition-all duration-500 ease-soft"
                  style={{ width: `${a.pct}%`, backgroundColor: hskColor(a.level) }}
                />
              </div>
              <span
                className="w-10 text-right font-mono text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                {a.pct}%
              </span>
            </div>
          ))}
        </div>
      )}

      {profile.weakGrammarPoints.length > 0 && (
        <div
          className="rounded-xl p-4 shadow-paper"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div
            className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--seal)" }}
          >
            Grammar to revisit
          </div>
          <div
            className="font-cjk-serif text-base"
            style={{ color: "var(--ink)" }}
          >
            {profile.weakGrammarPoints.join(" · ")}
          </div>
        </div>
      )}
    </div>
  );
}
