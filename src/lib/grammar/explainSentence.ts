import { ruleBasedExplanation } from "./ruleBasedExplanation";
import type { SentenceExplanation } from "@/types/grammar";

/**
 * The shared sentence-explanation interface. The reader intentionally uses
 * only this local rule-based implementation; translations are supplied by
 * curated library data where available.
 */
export async function explainSentence(sentence: string): Promise<SentenceExplanation> {
  return ruleBasedExplanation(sentence);
}

/** Synchronous variant for direct client use without the API round-trip. */
export function explainSentenceSync(sentence: string): SentenceExplanation {
  return ruleBasedExplanation(sentence);
}
