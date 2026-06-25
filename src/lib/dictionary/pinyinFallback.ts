import { pinyin } from "pinyin-pro";

/**
 * Get pinyin for a Chinese text string using pinyin-pro.
 * Used as a fallback when a word is not found in the dictionary.
 */
export function getPinyinFallback(text: string): string {
  return pinyin(text, { toneType: "symbol", type: "string" });
}
