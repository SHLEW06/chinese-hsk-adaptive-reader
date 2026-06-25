"use client";

import { X, Sparkles } from "lucide-react";
import { useSentenceExplanation } from "./useSentenceExplanation";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
      style={{ color: "var(--seal)" }}
    >
      <span className="h-px w-3" style={{ background: "var(--seal)", opacity: 0.5 }} />
      {children}
    </div>
  );
}

function Skeleton({ width = "w-full" }: { width?: string }) {
  return <div className={`shimmer h-3 rounded-full ${width}`} />;
}

export function SentenceExplanationPanel({
  sentence,
  onClose,
}: {
  sentence: string;
  onClose: () => void;
}) {
  const { data } = useSentenceExplanation(sentence);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex justify-end backdrop-blur-sm animate-fade-in"
      style={{ background: "color-mix(in srgb, var(--ink) 35%, transparent)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full animate-slide-in-right overflow-y-auto p-6 shadow-paper-lg sm:max-w-md"
        style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--line)",
        }}
      >
        <div
          className="sticky top-0 z-10 -mx-6 mb-4 flex items-center justify-between px-6 pb-3 pt-1 backdrop-blur-md"
          style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
        >
          <div className="flex items-center gap-2 font-serif text-sm font-semibold">
            <Sparkles size={14} style={{ color: "var(--seal)" }} />
            <span style={{ color: "var(--ink)" }}>Sentence reading</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5"
            style={{ color: "var(--muted)" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <blockquote
          className="mb-5 rounded-xl px-4 py-4 font-cjk-serif text-xl leading-loose"
          style={{
            background: "color-mix(in srgb, var(--paper-2) 80%, transparent)",
            border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
            color: "var(--ink)",
          }}
        >
          {sentence}
        </blockquote>

        {!data && (
          <div className="space-y-2 py-2">
            <Skeleton />
            <Skeleton width="w-4/5" />
            <Skeleton width="w-3/5" />
          </div>
        )}

        {data && (
          <div className="space-y-6 animate-refine-in">
            <div>
              <SectionHeader>Translation</SectionHeader>
              <div className="font-serif text-base leading-relaxed" style={{ color: "var(--ink)" }}>
                {data.translation}
              </div>
              {data.isRough && (
                <p className="mt-1.5 font-serif text-[12px] italic leading-relaxed" style={{ color: "var(--muted)" }}>
                  Word-by-word fallback while a curated translation is unavailable.
                </p>
              )}
            </div>

            {data.naturalMeaning &&
              data.naturalMeaning.trim() !== data.translation.trim() && (
                <div>
                  <SectionHeader>Natural reading</SectionHeader>
                  <p className="font-serif text-[15px] leading-relaxed" style={{ color: "var(--ink)" }}>
                    {data.naturalMeaning}
                  </p>
                </div>
              )}

            <div>
              <SectionHeader>Grammar patterns</SectionHeader>
              {data.grammarPoints?.length > 0 ? (
                <div className="space-y-3">
                  {data.grammarPoints.map((g, i) => (
                    <div
                      key={i}
                      className="rounded-r-lg py-2 pl-3 pr-2"
                      style={{
                        borderLeft: "3px solid var(--seal)",
                        background: "color-mix(in srgb, var(--seal) 4%, transparent)",
                      }}
                    >
                      <div
                        className="font-serif text-[14.5px] font-semibold"
                        style={{ color: "var(--ink)" }}
                      >
                        {g.pattern}
                      </div>
                      <div
                        className="mt-0.5 font-serif text-sm leading-relaxed"
                        style={{ color: "var(--muted)" }}
                      >
                        {g.explanation}
                      </div>
                      {g.example && (
                        <div
                          className="mt-1.5 font-cjk-serif text-[15px] italic"
                          style={{ color: "var(--ink)" }}
                        >
                          {g.example}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-serif text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  No grammar pattern is recorded for this sentence.
                </p>
              )}
            </div>

            <div>
              <SectionHeader>Word breakdown</SectionHeader>
              {data.phraseBreakdown?.length > 0 ? (
                <div className="space-y-1.5">
                  {data.phraseBreakdown.map((p, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="min-w-[5.5rem]">
                        <span
                          className="block font-cjk-serif text-[15px]"
                          style={{ color: "var(--ink)" }}
                        >
                          {p.phrase}
                        </span>
                        {p.pinyin && (
                          <span
                            className="mt-0.5 block text-[11px] leading-tight"
                            style={{ color: "var(--muted)" }}
                          >
                            {p.pinyin}
                          </span>
                        )}
                      </span>
                      <span className="font-serif" style={{ color: "var(--ink)" }}>
                        {p.meaning}
                        {p.note && (
                          <span className="ml-1 italic" style={{ color: "var(--muted)" }}>
                            · {p.note}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-serif text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  No Chinese words were found to break down.
                </p>
              )}
            </div>

            {data.casualNotes && data.casualNotes.length > 0 && (
              <div>
                <SectionHeader>Things to notice</SectionHeader>
                <ul className="space-y-2 font-serif text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                  {data.casualNotes.map((note, i) => (
                    <li
                      key={`${note}-${i}`}
                      className="rounded-r-lg py-2 pl-3 pr-2"
                      style={{
                        borderLeft: "3px solid var(--celadon)",
                        background: "color-mix(in srgb, var(--celadon) 7%, transparent)",
                      }}
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
