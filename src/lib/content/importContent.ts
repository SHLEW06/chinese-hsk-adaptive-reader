import { estimateDifficulty } from "./estimateDifficulty";
import { classifyContent } from "./classifyContent";
import { segment } from "@/lib/segmentation/segment";
import { uid, todayISO, truncate } from "@/lib/utils/text";
import type { ContentCategory, ContentItem } from "@/types/content";

const topKeywords = (text: string, n = 4): string[] => {
  const counts = new Map<string, number>();
  for (const t of segment(text)) {
    if (t.kind === "word") counts.set(t.text, (counts.get(t.text) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
};

export interface ImportInput {
  title?: string;
  text: string;
  category?: ContentCategory;
  englishSummary?: string;
}

/** Normalize pasted text into a ContentItem (does not persist — caller stores it). */
export const buildImportedContent = (input: ImportInput): ContentItem => {
  const text = input.text.trim();
  return {
    id: uid("content"),
    title: input.title?.trim() || truncate(text, 16),
    category: input.category ?? classifyContent(text),
    difficulty: estimateDifficulty(text),
    keywords: topKeywords(text),
    text,
    englishSummary: input.englishSummary?.trim() || undefined,
    imported: true,
    dateAdded: todayISO(),
  };
};
