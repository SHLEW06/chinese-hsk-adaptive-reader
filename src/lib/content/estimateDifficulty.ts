import { segment } from "@/lib/segmentation/segment";

/**
 * Estimate text difficulty on a 1-6 (HSK-ish) scale.
 * Combines the average HSK level of known words with the ratio of unknown words.
 */
export const estimateDifficulty = (text: string): number => {
  const tokens = segment(text).filter((t) => t.kind === "word" || t.kind === "char");
  if (tokens.length === 0) return 1;

  let hskSum = 0;
  let hskCount = 0;
  let unknown = 0;

  for (const t of tokens) {
    if (t.entry?.hskLevel) {
      hskSum += t.entry.hskLevel;
      hskCount += 1;
    } else {
      unknown += 1;
    }
  }

  const avgHsk = hskCount > 0 ? hskSum / hskCount : 3;
  const unknownRatio = unknown / tokens.length;

  // unknown words push difficulty up by up to ~2 bands
  const raw = avgHsk + unknownRatio * 2;
  return Math.max(1, Math.min(6, Math.round(raw)));
};
