"use client";

import Link from "next/link";
import { CalendarDays, Target, ArrowRight } from "lucide-react";
import type { LearnerProfile } from "@/types/learner";

function PlanCard({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: "seal" | "celadon";
  children: React.ReactNode;
}) {
  const accentColor = accent === "seal" ? "var(--seal)" : "var(--celadon)";
  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-5 shadow-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-paper-md"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: accentColor }}>{icon}</span>
        <span
          className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accentColor }}
        >
          {title}
        </span>
      </div>
      <ul
        className="space-y-1.5 font-serif text-[14.5px]"
        style={{ color: "var(--ink)" }}
      >
        {children}
      </ul>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span style={{ color: "color-mix(in srgb, var(--seal) 55%, transparent)" }}>·</span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

export function DailyPlan({
  profile,
  reviewCount,
}: {
  profile: LearnerProfile | null;
  reviewCount: number;
}) {
  const weak =
    profile && profile.weakGrammarPoints.length > 0
      ? profile.weakGrammarPoints
      : ["了", "把", "就 / 才", "对…来说"];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PlanCard icon={<Target size={14} />} title="Today" accent="seal">
        <Row>Read one short passage in the reader</Row>
        <Row>Tap 5 new words you don&apos;t know</Row>
        <Row>Review {Math.min(10, reviewCount || 10)} saved words</Row>
        <Row>
          Brush up on{" "}
          <span className="font-cjk-serif">{weak.slice(0, 3).join("、")}</span>
        </Row>
      </PlanCard>
      <PlanCard icon={<CalendarDays size={14} />} title="This week" accent="celadon">
        <Row>5 calm reading sessions</Row>
        <Row>~50 new words encountered</Row>
        <Row>Move 25 words from learning → known</Row>
        <Row>Revisit 3 grammar patterns</Row>
      </PlanCard>

      {profile && profile.weakGrammarPoints.length > 0 && (
        <div className="sm:col-span-2">
          <Link
            href="/placement"
            className="group flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors"
            style={{
              background: "color-mix(in srgb, var(--surface) 70%, transparent)",
              border: "1px dashed color-mix(in srgb, var(--seal) 30%, transparent)",
            }}
          >
            <span style={{ color: "var(--muted)" }}>
              <span className="font-serif italic">A gentle nudge:</span> revisit{" "}
              <span className="font-cjk-serif" style={{ color: "var(--ink)" }}>
                {profile.weakGrammarPoints.slice(0, 2).join(" · ")}
              </span>{" "}
              — these came up in your placement.
            </span>
            <ArrowRight
              size={14}
              style={{ color: "var(--seal)" }}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      )}
    </div>
  );
}
