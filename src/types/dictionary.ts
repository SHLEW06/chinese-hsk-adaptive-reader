export type DefinitionSource = "curated" | "hsk" | "cedict";
export type DefinitionConfidence = "high" | "medium" | "review";
export type ManualReviewStatus = "not-required" | "pending" | "reviewed";

export interface WordReading {
  pinyin: string;
  primaryGloss?: string;
  acceptedGlosses?: string[];
  definitions: string[];
  source?: DefinitionSource;
}

export interface WordEntry {
  simplified: string;
  traditional?: string;
  pinyin: string;
  /** Preferred learner-facing reading. Falls back to pinyin for legacy data. */
  primaryReading?: string;
  /** Preferred learner-facing meaning. Falls back to definitions[0]. */
  primaryGloss?: string;
  /** Source-backed meanings accepted for this reading. */
  acceptedGlosses?: string[];
  definitions: string[];
  secondaryDefinitions?: string[];
  readings?: WordReading[];
  definitionSource?: DefinitionSource;
  definitionConfidence?: DefinitionConfidence;
  auditFlags?: string[];
  manualReviewStatus?: ManualReviewStatus;
  hskLevel?: number;        // back-compat (prefer hsk20, else mapped hsk30)
  hsk20?: number;           // HSK 2.0 level 1-6
  hsk30?: number | "7-9";   // HSK 3.0 level
  frequency?: number;
  partOfSpeech?: string;
  examples?: string[];
}

export type Dictionary = Record<string, WordEntry>;
