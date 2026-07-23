export type SavedWordStatus = "new" | "learning" | "known";

export interface SavedWord {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  primaryReading?: string;
  primaryGloss?: string;
  acceptedGlosses?: string[];
  definitions: string[];
  secondaryDefinitions?: string[];
  hskLevel?: number;
  sourceSentence?: string;
  status: SavedWordStatus;
  dateSaved: string;       // ISO date (YYYY-MM-DD)
  lastReviewed?: string;   // ISO datetime
  reviewCount: number;
}
