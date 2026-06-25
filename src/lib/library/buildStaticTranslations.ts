import { splitSentences } from "@/lib/segmentation/sentenceSplit";
import type { LibraryItem, SentenceExplanationStatic } from "@/types/library";
import type { StaticTranslations } from "@/components/reader/ExplanationsProvider";

/**
 * Build the per-sentence / per-paragraph lookup maps the ExplanationsProvider
 * uses for local, authored library explanations.
 *
 * - sentenceMap: filled when the item supplies sentence-aligned translations.
 *   (We do NOT try to split a paragraph's English by punctuation — Chinese
 *   sentence enders don't line up reliably with English ones.)
 * - paragraphMap: every Chinese sentence in a paragraph points to that
 *   paragraph's full English translation for compatibility with existing
 *   library exports.
 */
export function buildStaticTranslations(item: LibraryItem): StaticTranslations {
  const sentenceMap: Record<string, string> = {};
  const paragraphMap: Record<string, string> = {};
  const explanationMap: Record<string, SentenceExplanationStatic> = {};

  // Authored sentence explanations are the highest-quality source. Populate
  // them first, so paragraph translations can only fill genuine gaps.
  for (const explanation of item.sentenceExplanations ?? []) {
    const sentence = explanation.zh?.trim();
    if (!sentence) continue;
    if (explanation.en?.trim()) sentenceMap[sentence] = explanation.en;
    explanationMap[sentence] = explanation;

    // A few authored sentences include a question-marked title in the middle
    // of a longer sentence. The reader deliberately splits at visible
    // punctuation, so make each resulting display fragment resolve to the
    // same authored explanation rather than falling through to local rules.
    for (const fragment of splitSentences(sentence)) {
      if (fragment === sentence) continue;
      if (explanation.en?.trim()) sentenceMap[fragment] ??= explanation.en;
      explanationMap[fragment] ??= explanation;
    }
  }

  if (item.paragraphTranslations) {
    for (const para of item.paragraphTranslations) {
      const sentences = splitSentences(para.zh);
      // If author provided one Chinese sentence per paragraph, treat that as
      // a sentence-level translation. Otherwise map each sentence to the
      // paragraph English for compatibility with older library items.
      if (sentences.length === 1) {
        const sentence = sentences[0];
        if (!sentenceMap[sentence] && para.en?.trim()) sentenceMap[sentence] = para.en;
      }
      for (const s of sentences) {
        if (para.en?.trim()) paragraphMap[s] = para.en;
      }
    }
  }

  return { contentId: item.id, sentenceMap, paragraphMap, explanationMap };
}
