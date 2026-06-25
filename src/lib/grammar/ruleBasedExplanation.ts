import { segment } from "@/lib/segmentation/segment";
import { getPinyinFallback } from "@/lib/dictionary/pinyinFallback";
import { isCJK } from "@/lib/utils/text";
import { detectors } from "./grammarPatterns";
import type { GrammarPoint, PhraseBreakdownItem, SentenceExplanation } from "@/types/grammar";

/** Rough word-by-word gloss from the dictionary (offline only). */
const roughGloss = (sentence: string): string =>
  segment(sentence)
    .filter((t) => t.kind !== "other" || t.text.trim())
    .map((t) =>
      t.entry ? t.entry.definitions[0].split(";")[0].replace(/\(.*?\)/g, "").trim() : t.text,
    )
    .filter(Boolean)
    .join(" ");

const buildBreakdown = (sentence: string): PhraseBreakdownItem[] =>
  segment(sentence)
    // Keep every Chinese token, even when the dictionary has not loaded yet or
    // does not contain a particular word. That keeps the explanation panel's
    // word-by-word layout complete; pinyin is always available locally.
    .filter((t) => t.kind !== "other" && isCJK(t.text[0]))
    .map((t) => ({
      phrase: t.text,
      pinyin: t.entry?.pinyin ?? getPinyinFallback(t.text),
      meaning: t.entry?.definitions[0] ?? "Dictionary entry unavailable",
      note: t.entry?.partOfSpeech,
    }));

const detectGrammar = (sentence: string): { points: GrammarPoint[]; casual: string[] } => {
  const points: GrammarPoint[] = [];
  const casual: string[] = [];
  for (const d of detectors) {
    const r = d.detect(sentence);
    if (r) {
      points.push(r.point);
      if (r.casualNotes) casual.push(...r.casualNotes);
    }
  }
  // omitted-subject heuristic
  if (/^(该|要|想|累|喜欢)/.test(sentence.replace(/^[\s，,]+/, ""))) {
    casual.push("The subject (often 我 \"I\") is dropped — common in casual Chinese when it is obvious from context.");
  }
  return { points, casual };
};

/** The offline, rule-based explanation engine. */
export const ruleBasedExplanation = (sentence: string): SentenceExplanation => {
  const { points, casual } = detectGrammar(sentence);
  return {
    sentence,
    translation: roughGloss(sentence),
    isRough: true,
    phraseBreakdown: buildBreakdown(sentence),
    grammarPoints: points.length
      ? points
      : [
          {
            pattern: "No tracked pattern detected",
            explanation:
              "No grammar pattern in the offline ruleset fired for this sentence.",
            example: "",
          },
        ],
    casualNotes: casual,
    naturalMeaning: "",
  };
};
