import { lookupLongest } from "@/lib/dictionary/lookup";
import { isCJK } from "@/lib/utils/text";
import type { WordEntry } from "@/types/dictionary";

export type TokenKind = "word" | "char" | "other";

export interface Token {
  text: string;
  kind: TokenKind;
  entry: WordEntry | null;
}

/**
 * Greedy forward maximum-matching segmentation against the dictionary.
 * - multi-character dictionary hits become "word" tokens
 * - unmatched Chinese characters become single "char" tokens (still clickable)
 * - runs of non-Chinese (spaces, latin, punctuation) become "other" tokens
 *
 * For production-grade segmentation you can swap this for jieba-wasm; the
 * Token shape stays the same so the UI does not change.
 */
export const segment = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (isCJK(ch)) {
      const match = lookupLongest(input.slice(i));
      if (match && match.length > 1) {
        tokens.push({ text: match.entry.simplified, kind: "word", entry: match.entry });
        i += match.length;
      } else {
        tokens.push({ text: ch, kind: "char", entry: match ? match.entry : null });
        i += 1;
      }
    } else {
      let j = i;
      while (j < input.length && !isCJK(input[j])) j++;
      tokens.push({ text: input.slice(i, j), kind: "other", entry: null });
      i = j;
    }
  }
  return tokens;
};
