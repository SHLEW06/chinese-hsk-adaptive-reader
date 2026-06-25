export type SavedWordStatus = "new" | "learning" | "known";

export interface SavedWord {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  definitions: string[];
  hskLevel?: number;
  sourceSentence?: string;
  status: SavedWordStatus;
  dateSaved: string;       // ISO date (YYYY-MM-DD)
  lastReviewed?: string;   // ISO datetime
  reviewCount: number;
}
