export interface WordReading {
  pinyin: string;
  definitions: string[];
}

export interface WordEntry {
  simplified: string;
  traditional?: string;
  pinyin: string;
  definitions: string[];
  readings?: WordReading[];
  hskLevel?: number;        // back-compat (prefer hsk20, else mapped hsk30)
  hsk20?: number;           // HSK 2.0 level 1-6
  hsk30?: number | "7-9";   // HSK 3.0 level
  frequency?: number;
  partOfSpeech?: string;
  examples?: string[];
}

export type Dictionary = Record<string, WordEntry>;
