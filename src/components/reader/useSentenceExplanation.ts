"use client";

import { explainSentenceSync } from "@/lib/grammar/explainSentence";
import { useExplanationFromContext } from "./ExplanationsProvider";

/**
 * Sentence explanations are entirely local: curated translations when the
 * reader supplies them, plus the offline grammar and dictionary breakdown.
 */
export function useSentenceExplanation(sentence: string) {
  const ctx = useExplanationFromContext(sentence);

  if (ctx) return ctx;
  return {
    data: explainSentenceSync(sentence),
    loading: false,
  };
}
