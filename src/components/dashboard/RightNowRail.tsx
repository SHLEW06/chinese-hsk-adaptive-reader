"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { hskColor } from "@/lib/dictionary/hsk";
import { getCompletedReadingIds } from "@/lib/library/completedReadings";
import type { LibraryListItem } from "@/types/library";

interface Props {
  level: number;
  items: LibraryListItem[];
}

/**
 * Hero "right now" reading recommendations. Each item links to the static
 * library detail route so the learner sees the hand-authored translation and
 * sentence explanations — never the runtime reader, where translations can
 * be incorrect.
 */
export function RightNowRail({ level, items }: Props) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompletedIds(getCompletedReadingIds());
  }, []);

  if (items.length === 0) return null;

  const [hero, ...rest] = items;
  const heroFit =
    hero.hskLevel === level
      ? "at your level"
      : hero.hskLevel > level
        ? "a small stretch"
        : "an easy warm-up";

  const href = (item: LibraryListItem) => `/library/${item.slug || item.id}`;
  const isDone = (item: LibraryListItem) =>
    completedIds.has(item.id) || completedIds.has(item.slug);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div
            className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in srgb, var(--muted) 85%, transparent)" }}
          >
            Right now
          </div>
          <h2
            className="font-serif text-xl font-semibold tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            A reading, picked for you.
          </h2>
        </div>
        <Link
          href="/library"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium transition-colors"
          style={{ color: "var(--muted)" }}
        >
          Browse all <ArrowRight size={12} />
        </Link>
      </div>

      <Link
        href={href(hero)}
        prefetch={false}
        className="group block w-full rounded-2xl p-5 text-left shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-paper-md sm:p-6"
        style={{
          background:
            "linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--paper-2) 80%, transparent) 100%)",
          border: "1px solid var(--line)",
        }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className="rounded-full px-2 py-0.5 font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
            style={{ background: hskColor(hero.hskLevel) }}
          >
            HSK {hero.hskLevel}
          </span>
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              background: "color-mix(in srgb, var(--celadon) 12%, transparent)",
              color: "var(--celadon)",
              border: "1px solid color-mix(in srgb, var(--celadon) 30%, transparent)",
            }}
          >
            {heroFit}
          </span>
          {isDone(hero) && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold"
              style={{
                background: "color-mix(in srgb, var(--celadon) 16%, transparent)",
                color: "var(--celadon)",
                border: "1px solid color-mix(in srgb, var(--celadon) 35%, transparent)",
              }}
            >
              <Check size={10} /> Read
            </span>
          )}
          <span style={{ color: "var(--muted)" }}>· {hero.category}</span>
        </div>
        <h3
          className="font-cjk-serif text-3xl font-medium tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          {hero.titleZh}
        </h3>
        <div
          className="mt-0.5 text-[13px] italic"
          style={{ color: "var(--muted)" }}
        >
          {hero.titleEn}
        </div>
        {hero.summaryEn && (
          <p
            className="mt-2 font-serif text-sm italic"
            style={{ color: "var(--muted)" }}
          >
            {hero.summaryEn}
          </p>
        )}
        <p
          className="mt-3 line-clamp-2 font-cjk text-[15px] leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--ink) 80%, transparent)" }}
        >
          {hero.textPreview}
        </p>
        <div
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--seal)" }}
        >
          <BookOpen size={14} />
          Open with translation
          <ArrowRight size={13} />
        </div>
      </Link>

      {rest.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rest.map((item) => (
            <Link
              key={item.id}
              href={href(item)}
              prefetch={false}
              className="group rounded-xl px-4 py-3 text-left transition-all hover:-translate-y-px hover:shadow-paper"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <div className="mb-1 flex items-center gap-2 text-[10.5px]">
                <span
                  className="rounded-full px-1.5 py-0.5 font-medium text-white"
                  style={{ background: hskColor(item.hskLevel) }}
                >
                  HSK {item.hskLevel}
                </span>
                <span style={{ color: "var(--muted)" }}>{item.category}</span>
                {isDone(item) && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold"
                    style={{
                      background: "color-mix(in srgb, var(--celadon) 16%, transparent)",
                      color: "var(--celadon)",
                      border: "1px solid color-mix(in srgb, var(--celadon) 30%, transparent)",
                    }}
                  >
                    <Check size={9} /> Read
                  </span>
                )}
              </div>
              <div className="font-cjk-serif text-[17px]" style={{ color: "var(--ink)" }}>
                {item.titleZh}
              </div>
              {item.summaryEn && (
                <div
                  className="mt-0.5 line-clamp-1 font-serif text-[12.5px] italic"
                  style={{ color: "var(--muted)" }}
                >
                  {item.summaryEn}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
