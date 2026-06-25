export type ContentCategory =
  | "Daily Life"
  | "Travel"
  | "Pop Culture"
  | "Gen Z / Internet Slang"
  | "Business / Economy"
  | "Food"
  | "China Trip Prep"
  | "Stories & Fables"
  | "News & Society"
  | "Essays & Reflections"
  | "History & Culture"
  | "Science & Tech"
  | "Campus / Student Life"
  | "Health & Wellness"
  | "Technology & AI"
  | "Relationships / Friendship"
  | "Work / Career"
  | "Shopping / Money"
  | "Transportation"
  | "Nature / Environment";

export const CONTENT_CATEGORIES: ContentCategory[] = [
  "Daily Life",
  "Stories & Fables",
  "Travel",
  "Food",
  "Pop Culture",
  "Gen Z / Internet Slang",
  "China Trip Prep",
  "Business / Economy",
  "News & Society",
  "Essays & Reflections",
  "History & Culture",
  "Science & Tech",
  "Campus / Student Life",
  "Health & Wellness",
  "Technology & AI",
  "Relationships / Friendship",
  "Work / Career",
  "Shopping / Money",
  "Transportation",
  "Nature / Environment",
];

export interface ContentItem {
  id: string;
  title: string;
  category: ContentCategory;
  difficulty: number;        // 1-6 estimated HSK-ish band
  keywords: string[];
  text: string;
  englishSummary?: string;
  source?: string;
  imported?: boolean;
  dateAdded?: string;
}
