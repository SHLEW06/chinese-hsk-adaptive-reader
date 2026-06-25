"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Eye, EyeOff, Languages, RotateCcw } from "lucide-react";
import { ContentReader } from "@/components/reader/ContentReader";
import { buildStaticTranslations } from "@/lib/library/buildStaticTranslations";
import { hskColor } from "@/lib/dictionary/hsk";
import {
  isCompleted,
  markCompletedAliases,
  unmarkCompletedAliases,
} from "@/lib/library/completedReadings";
import type { LibraryItem } from "@/types/library";

export function LibraryDetail({ item }: { item: LibraryItem }) {
  const [showFullTranslation, setShowFullTranslation] = useState(false);
  const [showParaTranslations, setShowParaTranslations] = useState(false);
  const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);

  const staticTranslations = useMemo(() => buildStaticTranslations(item), [item]);
  const fullTranslation = item.translation ?? item.translationEn ?? "";
  const characterCount = useMemo(
    () => Array.from(item.textZh.replace(/\s/g, "")).length,
    [item.textZh],
  );

  // Hydrate completion state from localStorage. Checking both id and slug
  // covers cards that link via either alias.
  useEffect(() => {
    setCompleted(isCompleted(item.id) || isCompleted(item.slug));
  }, [item.id, item.slug]);

  // Auto-mark complete once the learner has scrolled to the end of the
  // reading. The sentinel lives just past the comprehension block so the
  // learner has clearly worked through the passage.
  useEffect(() => {
    if (completed) return;
    const node = endSentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          markCompletedAliases([item.id, item.slug]);
          setCompleted(true);
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [completed, item.id, item.slug]);

  const toggleCompleted = () => {
    if (completed) {
      unmarkCompletedAliases([item.id, item.slug]);
      setCompleted(false);
    } else {
      markCompletedAliases([item.id, item.slug]);
      setCompleted(true);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="reading-column mb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
            style={{ background: hskColor(item.hskLevel) }}
          >
            HSK {item.hskLevel}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
            style={{
              background: "color-mix(in srgb, var(--paper-2) 70%, transparent)",
              border: "1px solid var(--line)",
              color: "var(--muted)",
            }}
          >
            {item.category}
          </span>
          <span
            className="text-[10.5px] italic"
            style={{ color: "var(--muted)" }}
          >
            {characterCount.toLocaleString()} chars · {item.difficulty}
          </span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {item.titleEn}
        </div>
        <p
          className="font-serif text-sm italic"
          style={{ color: "var(--muted)" }}
        >
          {item.summaryEn}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowFullTranslation((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors"
            style={{
              borderColor: "color-mix(in srgb, var(--seal) 30%, transparent)",
              background: showFullTranslation
                ? "color-mix(in srgb, var(--seal) 12%, transparent)"
                : "var(--surface)",
              color: "var(--seal)",
            }}
          >
            <Languages size={13} />
            {showFullTranslation ? "Hide full translation" : "Show full translation"}
          </button>
          {item.paragraphTranslations && item.paragraphTranslations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowParaTranslations((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors"
              style={{
                borderColor: "color-mix(in srgb, var(--seal) 30%, transparent)",
                background: showParaTranslations
                  ? "color-mix(in srgb, var(--seal) 12%, transparent)"
                  : "var(--surface)",
                color: "var(--seal)",
              }}
            >
              {showParaTranslations ? <EyeOff size={13} /> : <Eye size={13} />}
              {showParaTranslations ? "Hide paragraph translations" : "Show paragraph translations"}
            </button>
          )}
          <button
            type="button"
            onClick={toggleCompleted}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors"
            style={
              completed
                ? {
                    borderColor: "color-mix(in srgb, var(--celadon) 50%, transparent)",
                    background: "color-mix(in srgb, var(--celadon) 14%, transparent)",
                    color: "var(--celadon)",
                  }
                : {
                    borderColor: "var(--line)",
                    background: "var(--surface)",
                    color: "var(--muted)",
                  }
            }
            aria-pressed={completed}
          >
            {completed ? <Check size={13} /> : <BookOpen size={13} />}
            {completed ? "Read" : "Mark as read"}
            {completed && <RotateCcw size={11} className="opacity-60" />}
          </button>
        </div>
      </div>

      {showFullTranslation && fullTranslation && (
        <div
          className="reading-column mb-6 rounded-2xl px-5 py-5 shadow-paper"
          style={{
            background: "color-mix(in srgb, var(--paper-2) 80%, transparent)",
            border: "1px solid var(--line)",
          }}
        >
          <div
            className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--seal)" }}
          >
            <BookOpen size={12} /> Full translation
          </div>
          <p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-ink">
            {fullTranslation}
          </p>
        </div>
      )}

      {showParaTranslations &&
        item.paragraphTranslations &&
        item.paragraphTranslations.length > 0 && (
          <div className="reading-column mb-6 space-y-3">
            {item.paragraphTranslations.map((p, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 shadow-paper"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <p
                  className="font-cjk-serif text-[16px] leading-relaxed"
                  style={{ color: "var(--ink)" }}
                >
                  {p.zh}
                </p>
                <p
                  className="mt-1.5 font-serif text-[13.5px] italic leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {p.en}
                </p>
              </div>
            ))}
          </div>
        )}

      <ContentReader
        text={item.textZh}
        title={item.titleZh}
        contentId={item.id}
        staticTranslations={staticTranslations}
        showTitle={false}
      />

      {item.comprehensionQuestions && item.comprehensionQuestions.length > 0 && (
        <div className="reading-column mt-8 space-y-3">
          <h2
            className="font-serif text-lg font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Comprehension
          </h2>
          {item.comprehensionQuestions.map((q, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3 shadow-paper"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <p
                className="font-cjk-serif text-[15.5px] leading-relaxed"
                style={{ color: "var(--ink)" }}
              >
                {q.questionZh}
              </p>
              {q.questionEn && (
                <p
                  className="mt-1 font-serif text-[12.5px] italic"
                  style={{ color: "var(--muted)" }}
                >
                  {q.questionEn}
                </p>
              )}
              {q.choices && q.choices.length > 0 && (
                <ul className="mt-2 space-y-1 font-serif text-[13px]" style={{ color: "var(--ink)" }}>
                  {q.choices.map((choice, choiceIndex) => (
                    <li key={choiceIndex}>{String.fromCharCode(65 + choiceIndex)}. {choice}</li>
                  ))}
                </ul>
              )}
              {(q.answerEn ?? q.answer) && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setShowAnswer((prev) => ({ ...prev, [i]: !prev[i] }))
                    }
                    className="mt-2 text-[12px] font-medium"
                    style={{ color: "var(--seal)" }}
                  >
                    {showAnswer[i] ? "Hide answer" : "Show answer"}
                  </button>
                  {showAnswer[i] && (
                    <>
                      <p
                        className="mt-1.5 font-serif text-[13.5px] leading-relaxed"
                        style={{ color: "var(--ink)" }}
                      >
                        {q.answerEn ?? q.answer}
                      </p>
                      {q.explanationEn && (
                        <p
                          className="mt-1 font-serif text-[12.5px] italic leading-relaxed"
                          style={{ color: "var(--muted)" }}
                        >
                          {q.explanationEn}
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {item.sourceType === "news_explainer" && item.factCheckNotes && (
        <div
          className="reading-column mt-6 rounded-md px-3 py-2 text-[12px]"
          style={{
            background: "color-mix(in srgb, #C98A1B 8%, transparent)",
            border: "1px solid color-mix(in srgb, #C98A1B 25%, transparent)",
            color: "var(--muted)",
          }}
        >
          <span className="font-semibold">Fact-check notes:</span> {item.factCheckNotes}
        </div>
      )}

      {item.sources && item.sources.length > 0 && (
        <div className="reading-column mt-3 text-[11.5px] italic text-muted">
          Sources:{" "}
          {item.sources.map((s, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </span>
          ))}
        </div>
      )}

      {/* Auto-complete sentinel — once this scrolls into view we count the
          reading as finished. Placed below all interactive blocks so the
          learner has clearly worked through the passage. */}
      <div ref={endSentinelRef} className="h-px" aria-hidden="true" />
    </div>
  );
}
