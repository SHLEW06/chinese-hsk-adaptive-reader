"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { hskColor } from "@/lib/dictionary/hsk";
import { isCompleted } from "@/lib/library/completedReadings";
import type { LibraryListItem } from "@/types/library";

const DIFFICULTY_LABEL: Record<LibraryListItem["difficulty"], string> = {
  easy: "easy",
  standard: "standard",
  challenge: "challenge",
};

export function LibraryCard({ item }: { item: LibraryListItem }) {
  const href = `/library/${item.slug || item.id}`;
  const targetWords = item.targetWords ?? [];
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(isCompleted(item.id) || isCompleted(item.slug));
  }, [item.id, item.slug]);

  return (
    <Link
      href={href}
      // Each reading carries its complete explanation data. Prefetching every
      // card turns browsing a large library into many competing page loads,
      // which is especially unreliable on mobile connections. Load a reading
      // only after the learner chooses it.
      prefetch={false}
      className="group flex h-full flex-col rounded-2xl p-5 text-left shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-paper-md"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
          style={{
            background: "color-mix(in srgb, var(--paper-2) 60%, transparent)",
            border: "1px solid var(--line)",
            color: "var(--muted)",
          }}
        >
          {item.category}
        </span>
        <div className="flex items-center gap-1.5">
          {done && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: "color-mix(in srgb, var(--celadon) 16%, transparent)",
                color: "var(--celadon)",
                border: "1px solid color-mix(in srgb, var(--celadon) 35%, transparent)",
              }}
              title="You read this"
            >
              <Check size={10} /> Read
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
            style={{ background: hskColor(item.hskLevel) }}
          >
            HSK {item.hskLevel}
          </span>
        </div>
      </div>

      <h3
        className="font-cjk-serif text-xl font-medium leading-tight"
        style={{ color: "var(--ink)" }}
      >
        {item.titleZh}
      </h3>
      <div
        className="mt-0.5 text-[12.5px] italic"
        style={{ color: "var(--muted)" }}
      >
        {item.titleEn}
      </div>

      <p
        className="mt-2 font-serif text-[13px] italic leading-snug"
        style={{ color: "var(--muted)" }}
      >
        {item.summaryEn}
      </p>

      <p
        className="mt-3 line-clamp-3 font-cjk text-[14px] leading-relaxed"
        style={{ color: "color-mix(in srgb, var(--ink) 78%, transparent)" }}
      >
        {item.textPreview}
      </p>

      {targetWords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {targetWords.slice(0, 4).map((k) => (
            <span
              key={k}
              className="font-cjk text-[11px]"
              style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
            >
              #{k}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div
        className="mt-4 flex items-center justify-between border-t pt-3 text-[11.5px]"
        style={{
          borderColor: "color-mix(in srgb, var(--line) 70%, transparent)",
          color: "var(--muted)",
        }}
      >
        <span>
          {item.characterCount.toLocaleString()} chars · {DIFFICULTY_LABEL[item.difficulty]}
        </span>
        <span
          className="inline-flex items-center gap-1 font-medium transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--seal)" }}
        >
          <BookOpen size={13} /> Open <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
