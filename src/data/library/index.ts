import type { LibraryItem, LibraryListItem } from "@/types/library";
import hsk1 from "./hsk1.json";
import hsk2 from "./hsk2.json";
import hsk3 from "./hsk3.json";
import hsk4 from "./hsk4.json";
import hsk5 from "./hsk5.json";
import hsk6 from "./hsk6.json";

/**
 * Expanded static library passages, ordered by HSK level.
 *
 * These JSON files now include full translations, paragraph translations,
 * sentenceExplanations, grammar points, phrase breakdowns, target words,
 * covered/new HSK words, and comprehension questions.
 *
 * Performance note: this drop-in file preserves the old synchronous API.
 * For a very large corpus, move to lazy loading by level/slug so the library
 * page does not eagerly bundle every reading.
 */
export const libraryItems: LibraryItem[] = [
  ...(hsk1 as unknown as LibraryItem[]),
  ...(hsk2 as unknown as LibraryItem[]),
  ...(hsk3 as unknown as LibraryItem[]),
  ...(hsk4 as unknown as LibraryItem[]),
  ...(hsk5 as unknown as LibraryItem[]),
  ...(hsk6 as unknown as LibraryItem[]),
];

export function getLibraryItem(idOrSlug: string): LibraryItem | undefined {
  return libraryItems.find((it) => it.id === idOrSlug || it.slug === idOrSlug);
}

const countChineseCharacters = (text: string) => Array.from(text.replace(/\s/g, "")).length;

const previewText = (text: string, limit = 110) => {
  const compact = text.replace(/\s+/g, "").trim();
  return compact.length > limit ? `${compact.slice(0, limit)}…` : compact;
};

/**
 * Card-only data. Keeping this projection server-side prevents the Library
 * browser from downloading the paragraph translations and sentence-level
 * explanation payload for every reading before one is opened.
 */
export const libraryListItems: LibraryListItem[] = libraryItems.map((item) => ({
  id: item.id,
  slug: item.slug,
  titleZh: item.titleZh,
  titleEn: item.titleEn,
  hskLevel: item.hskLevel,
  category: item.category,
  difficulty: item.difficulty,
  summaryEn: item.summaryEn,
  targetWords: item.targetWords ?? [],
  characterCount: countChineseCharacters(item.textZh),
  textPreview: previewText(item.textZh),
}));
