"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { DueCounts } from "@/lib/hsk-study/mixedDeck";

interface Props {
  counts: DueCounts;
}

/**
 * One-line "study right now" card. Closes the dashboard's loop with the SRS
 * scheduler: if the learner has anything queued the widget surfaces it and
 * routes them straight into a mixed session.
 */
export function DueTodayWidget({ counts }: Props) {
  const total = counts.reviewsDue + counts.freshSaved;
  if (total === 0) {
    if (counts.reviewsTomorrow === 0) return null;
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-paper"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--celadon) 18%, transparent)", color: "var(--celadon)" }}
          >
            <GraduationCap size={15} />
          </span>
          <div>
            <div className="font-medium text-ink">All caught up today.</div>
            <div className="text-[12px] italic text-muted">
              {counts.reviewsTomorrow} review{counts.reviewsTomorrow === 1 ? "" : "s"} return within 24 hours.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const parts: string[] = [];
  if (counts.reviewsDue > 0)
    parts.push(`${counts.reviewsDue} review${counts.reviewsDue === 1 ? "" : "s"}`);
  if (counts.freshSaved > 0)
    parts.push(`${counts.freshSaved} new from saved`);

  return (
    <Link
      href="/vocabulary/study?deck=mixed"
      className="group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-paper transition-all hover:-translate-y-px hover:shadow-paper-md"
      style={{
        background:
          "linear-gradient(140deg, color-mix(in srgb, var(--seal) 10%, var(--surface)) 0%, var(--paper-2) 70%, var(--surface) 100%)",
        borderColor: "color-mix(in srgb, var(--seal) 25%, transparent)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white shadow-seal"
          style={{ background: "linear-gradient(180deg, var(--seal), var(--seal-deep))" }}
        >
          <GraduationCap size={16} />
        </span>
        <div>
          <div className="font-medium text-ink">Due today</div>
          <div className="text-[12.5px] text-muted">
            {parts.join(" · ")}
            {counts.reviewsTomorrow > 0 && (
              <span className="text-muted/70"> · {counts.reviewsTomorrow} more by tomorrow</span>
            )}
          </div>
        </div>
      </div>
      <span
        className="inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--seal)" }}
      >
        Start <ArrowRight size={13} />
      </span>
    </Link>
  );
}
