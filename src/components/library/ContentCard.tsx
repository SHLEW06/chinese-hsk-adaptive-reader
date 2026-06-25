"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { setActiveReading } from "@/lib/storage/localStore";
import { hskColor } from "@/lib/dictionary/hsk";
import type { ContentItem } from "@/types/content";

export function ContentCard({ item }: { item: ContentItem }) {
  const router = useRouter();
  const wordCount = item.text.length;

  const open = () => {
    setActiveReading(item);
    router.push("/reader");
  };

  return (
    <button
      onClick={open}
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
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
          style={{ background: hskColor(item.difficulty) }}
        >
          HSK {item.difficulty}
        </span>
      </div>

      <h3
        className="font-cjk-serif text-xl font-medium leading-tight"
        style={{ color: "var(--ink)" }}
      >
        {item.title}
      </h3>

      {item.englishSummary && (
        <p
          className="mt-1 font-serif text-[13px] italic leading-snug"
          style={{ color: "var(--muted)" }}
        >
          {item.englishSummary}
        </p>
      )}

      <p
        className="mt-3 line-clamp-3 font-cjk text-[14px] leading-relaxed"
        style={{ color: "color-mix(in srgb, var(--ink) 78%, transparent)" }}
      >
        {item.text}
      </p>

      {item.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.keywords.slice(0, 4).map((k) => (
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
        <span>{wordCount} characters</span>
        <span
          className="inline-flex items-center gap-1 font-medium transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--seal)" }}
        >
          <BookOpen size={13} /> Open <ArrowRight size={12} />
        </span>
      </div>
    </button>
  );
}
