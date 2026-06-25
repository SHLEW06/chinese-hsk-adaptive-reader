"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { getPinyinFallback } from "@/lib/dictionary/pinyinFallback";
import { explainSentenceSync } from "@/lib/grammar/explainSentence";
import type { PhraseBreakdownItem, SentenceExplanation } from "@/types/grammar";
import type { SentenceExplanationStatic } from "@/types/library";

interface State {
  bySentence: Map<string, SentenceExplanation>;
}

const Ctx = createContext<State | null>(null);

export interface StaticTranslations {
  /** Stable content identity for the authored library record. */
  contentId?: string;
  /** Map of Chinese sentence (verbatim) → English translation. */
  sentenceMap?: Record<string, string>;
  /** Kept for compatibility with paragraph-level library exports. */
  paragraphMap?: Record<string, string>;
  /** Complete authored explanation data, keyed by Chinese sentence. */
  explanationMap?: Record<string, SentenceExplanationStatic>;
}

function staticExplanationToReaderShape(
  authored: SentenceExplanationStatic,
  fallback: SentenceExplanation,
): SentenceExplanation {
  const authoredGrammar = (authored.grammar ?? [])
    .map((grammar) => ({
      pattern: grammar.label ? `${grammar.pattern} · ${grammar.label}` : grammar.pattern,
      explanation: grammar.explanationEn ?? grammar.explanation ?? "",
      example: grammar.exampleZh
        ? grammar.exampleEn
          ? `${grammar.exampleZh} — ${grammar.exampleEn}`
          : grammar.exampleZh
        : undefined,
    }))
    .filter((grammar) => grammar.pattern.trim() && grammar.explanation.trim());

  const phraseOverrides = new Map(
    (authored.phrases ?? [])
      .filter((phrase) => phrase.zh?.trim() && phrase.en?.trim())
      .map((phrase) => [
        phrase.zh,
        {
          phrase: phrase.zh,
          meaning: phrase.en,
          pinyin: phrase.pinyin?.trim() || getPinyinFallback(phrase.zh),
          note: phrase.note,
        },
      ]),
  );
  const usedOverrides = new Set<string>();
  const phraseBreakdown: PhraseBreakdownItem[] = fallback.phraseBreakdown.map((phrase) => {
    const override = phraseOverrides.get(phrase.phrase);
    if (!override) return phrase;
    usedOverrides.add(phrase.phrase);
    return { ...phrase, ...override };
  });
  // Keep an authored multi-word phrase when it does not align exactly with a
  // dictionary token, while never dropping the full local word breakdown.
  for (const [phrase, override] of phraseOverrides) {
    if (!usedOverrides.has(phrase)) phraseBreakdown.push(override);
  }

  return {
    ...fallback,
    sentence: authored.zh,
    translation: authored.en || fallback.translation,
    naturalMeaning: authored.naturalMeaning ?? authored.en ?? fallback.naturalMeaning,
    // Authored grammar wins when complete. Word annotations override matching
    // local terms, but never replace the complete pinyin/English breakdown.
    grammarPoints: authoredGrammar.length > 0 ? authoredGrammar : fallback.grammarPoints,
    phraseBreakdown,
    casualNotes: authored.notes?.length
      ? authored.notes
      : authored.casualNotes?.length
        ? authored.casualNotes
        : fallback.casualNotes,
    isRough: false,
  };
}

export function ExplanationsProvider({
  sentences,
  children,
  staticTranslations,
}: {
  sentences: string[];
  children: ReactNode;
  /** Curated library translations and optional authored grammar/breakdowns. */
  staticTranslations?: StaticTranslations;
}) {
  const { ready: dictionaryReady } = useDictionary();

  // De-dupe while preserving first-occurrence order
  const unique = useMemo(() => Array.from(new Set(sentences)), [sentences]);
  const uniqueKey = useMemo(() => unique.join(""), [unique]);

  const bySentence = useMemo(() => {
    // The explanation path is deliberately local-only. Rebuild after the full
    // dictionary is ready so word definitions replace the initial seed data.
    const explanations = new Map<string, SentenceExplanation>();
    for (const s of unique) {
      const authoredExplanation = staticTranslations?.explanationMap?.[s];
      if (authoredExplanation) {
        // Always build the local base. Curated translation/grammar can replace
        // it, while its complete word breakdown remains available for every
        // explain button.
        const fallback = explainSentenceSync(s);
        explanations.set(
          s,
          staticExplanationToReaderShape(authoredExplanation, fallback),
        );
        continue;
      }

      const base = explainSentenceSync(s);
      // Paragraph translations are intentionally a fallback: authored
      // sentence translations take precedence, but every sentence should use
      // the library's full English support before falling back to a rough
      // word-for-word gloss.
      const authoredTranslation =
        staticTranslations?.sentenceMap?.[s] ??
        staticTranslations?.paragraphMap?.[s];
      if (authoredTranslation) {
        explanations.set(s, {
          ...base,
          translation: authoredTranslation,
          naturalMeaning: authoredTranslation,
          isRough: false,
        });
      } else {
        explanations.set(s, base);
      }
    }
    return explanations;
  }, [uniqueKey, dictionaryReady, staticTranslations]);

  const value = useMemo<State>(
    () => ({ bySentence }),
    [bySentence],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Returns the current local explanation for a sentence read from the
 * surrounding ExplanationsProvider. Returns null if no provider is mounted.
 */
export function useExplanationFromContext(sentence: string) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  const data = ctx.bySentence.get(sentence) ?? null;
  return {
    data,
    loading: false,
  };
}
