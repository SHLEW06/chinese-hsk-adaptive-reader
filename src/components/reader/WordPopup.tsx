"use client";

import { X, Bookmark, Check } from "lucide-react";
import { HskBadge } from "@/components/ui/Badge";
import { lookup } from "@/lib/dictionary/lookup";
import { getPinyinFallback } from "@/lib/dictionary/pinyinFallback";
import { containsCJK } from "@/lib/utils/text";
import type { WordEntry } from "@/types/dictionary";

interface Props {
  text: string;
  entry: WordEntry | null;
  sourceSentence?: string;
  alreadySaved: boolean;
  onClose: () => void;
  onSave: (entry: WordEntry, sourceSentence?: string) => void;
  onMarkKnown: (entry: WordEntry) => void;
}

export function WordPopup({
  text,
  entry,
  sourceSentence,
  alreadySaved,
  onClose,
  onSave,
  onMarkKnown,
}: Props) {
  const known = entry ?? lookup(text);
  const fallbackPinyin =
    !known && containsCJK(text) ? getPinyinFallback(text) : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      style={{ background: "color-mix(in srgb, var(--ink) 35%, transparent)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full animate-slide-up rounded-t-3xl p-6 shadow-paper-lg sm:max-w-md sm:rounded-3xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full"
          style={{ background: "var(--line)" }}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="font-cjk-serif text-5xl font-medium leading-none tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              {text}
            </div>
            {known && (
              <div className="mt-2 flex items-baseline gap-2 text-sm">
                <span className="font-mono text-[15px]" style={{ color: "var(--seal)" }}>
                  {known.pinyin}
                </span>
                {known.traditional && known.traditional !== known.simplified && (
                  <span
                    className="font-cjk-serif text-base"
                    style={{ color: "color-mix(in srgb, var(--muted) 80%, transparent)" }}
                  >
                    {known.traditional}
                  </span>
                )}
              </div>
            )}
            {!known && fallbackPinyin && (
              <div className="mt-2 font-mono text-[15px]" style={{ color: "var(--seal)" }}>
                {fallbackPinyin}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors"
            style={{ color: "var(--muted)" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {known ? (
          <>
            <div
              className="mt-4 flex flex-wrap items-center gap-2 pb-3"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--line) 60%, transparent)" }}
            >
              <HskBadge level={known.hsk30 ?? known.hskLevel} />
              {known.hsk30 !== undefined && known.hsk20 !== undefined && (
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                  HSK 2.0 · {known.hsk20}
                </span>
              )}
              {known.partOfSpeech && (
                <span className="text-[11px] italic" style={{ color: "var(--muted)" }}>
                  {known.partOfSpeech}
                </span>
              )}
              {known.frequency !== undefined && (
                <span
                  className="ml-auto font-mono text-[10.5px]"
                  style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
                >
                  freq #{known.frequency.toLocaleString()}
                </span>
              )}
            </div>

            <ol className="mt-3 space-y-1.5">
              {known.definitions.map((d, i) => (
                <li
                  key={i}
                  className="flex gap-2 font-serif text-[15px]"
                  style={{ color: "var(--ink)" }}
                >
                  <span
                    className="mt-0.5 shrink-0 font-mono text-xs"
                    style={{ color: "color-mix(in srgb, var(--seal) 70%, transparent)" }}
                  >
                    {i + 1}.
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ol>

            {known.examples?.[0] && (
              <div
                className="mt-4 rounded-xl px-4 py-3 font-cjk-serif text-lg leading-relaxed"
                style={{
                  background: "color-mix(in srgb, var(--seal) 4%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--seal) 12%, transparent)",
                  color: "var(--ink)",
                }}
              >
                <span
                  className="mb-1 block text-[10px] uppercase tracking-[0.18em] font-sans not-italic"
                  style={{ color: "color-mix(in srgb, var(--seal) 75%, transparent)" }}
                >
                  例 · example
                </span>
                {known.examples[0]}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => onSave(known, sourceSentence)}
                disabled={alreadySaved}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-medium shadow-seal transition-all hover:-translate-y-px hover:shadow-paper-md disabled:bg-none disabled:shadow-none disabled:hover:translate-y-0"
                style={{
                  background: alreadySaved
                    ? "color-mix(in srgb, var(--line) 70%, transparent)"
                    : "linear-gradient(180deg, var(--seal), var(--seal-deep))",
                  color: alreadySaved ? "var(--muted)" : "#fff",
                }}
              >
                <Bookmark size={16} />
                {alreadySaved ? "Saved" : "Save word"}
              </button>
              <button
                onClick={() => onMarkKnown(known)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-medium transition-all hover:-translate-y-px"
                style={{
                  background: "color-mix(in srgb, var(--celadon) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--celadon) 45%, transparent)",
                  color: "var(--celadon)",
                }}
              >
                <Check size={16} />
                Mark known
              </button>
            </div>
          </>
        ) : (
          <div
            className="mt-5 rounded-xl border border-dashed px-4 py-5 text-center font-serif text-sm italic"
            style={{
              borderColor: "color-mix(in srgb, var(--line) 80%, transparent)",
              background: "color-mix(in srgb, var(--paper-2) 60%, transparent)",
              color: "var(--muted)",
            }}
          >
            No dictionary entry found for this character.
          </div>
        )}
      </div>
    </div>
  );
}
