import { getEntry, getMaxWordLen } from "./dictionary";
import type { WordEntry } from "@/types/dictionary";

/** Exact lookup of a word/character. */
export const lookup = (text: string): WordEntry | null =>
  getEntry(text) ?? null;

/**
 * Longest-match starting at the beginning of `text`.
 * Returns the matched entry and how many characters it consumed.
 */
export const lookupLongest = (
  text: string,
): { entry: WordEntry; length: number } | null => {
  const max = Math.min(getMaxWordLen(), text.length);
  for (let len = max; len >= 1; len--) {
    const sub = text.slice(0, len);
    const entry = getEntry(sub);
    if (entry) return { entry, length: len };
  }
  return null;
};
