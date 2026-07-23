import type { SavedWord } from "@/types/savedWord";
import type { WordEntry, WordReading } from "@/types/dictionary";

type LearnerEntry = Pick<WordEntry, "pinyin" | "primaryReading" | "primaryGloss" | "acceptedGlosses" | "definitions" | "secondaryDefinitions">;
type SavedLearnerEntry = Pick<SavedWord, "pinyin" | "primaryReading" | "primaryGloss" | "acceptedGlosses" | "definitions" | "secondaryDefinitions">;

const UNSUITABLE_CALIBRATION_FLAGS = new Set([
  "primary-empty",
  "primary-surname",
  "primary-reference-only",
  "primary-variant-only",
  "primary-archaic",
  "primary-dialect",
  "primary-metadata",
  "ambiguous-primary-reading",
  "hsk-reading-unmatched",
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    if (!text) continue;
    const key = normalize(text);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
}

export function primaryReading(entry: LearnerEntry | SavedLearnerEntry): string {
  return entry.primaryReading?.trim() || entry.pinyin.trim();
}

export function primaryGloss(entry: LearnerEntry | SavedLearnerEntry): string {
  return entry.primaryGloss?.trim() || entry.definitions[0]?.trim() || "";
}

export function acceptedGlosses(entry: LearnerEntry | SavedLearnerEntry): string[] {
  return unique([primaryGloss(entry), ...(entry.acceptedGlosses ?? [])]);
}

export function secondaryDefinitions(entry: LearnerEntry | SavedLearnerEntry): string[] {
  const primary = normalize(primaryGloss(entry));
  const values = entry.secondaryDefinitions ?? entry.definitions;
  return unique(values).filter((definition) => normalize(definition) !== primary);
}

export function alternateReadings(entry: WordEntry): WordReading[] {
  const selected = normalizePinyin(primaryReading(entry));
  return (entry.readings ?? []).filter((reading) => normalizePinyin(reading.pinyin) !== selected);
}

/** Entries awaiting source reconciliation are never used in scored calibration. */
export function isCalibrationSuitable(entry: WordEntry): boolean {
  // Legacy entries still load for display, but scored calibration requires
  // explicit provenance from the audited dictionary pipeline.
  if (!entry.primaryGloss?.trim() || !entry.definitionSource) return false;
  if (entry.definitionConfidence === "review" || entry.manualReviewStatus === "pending") return false;
  return !(entry.auditFlags ?? []).some((flag) => UNSUITABLE_CALIBRATION_FLAGS.has(flag));
}

/**
 * Keys used to keep accepted synonyms from competing in one multiple-choice
 * question. The source-backed accepted-gloss set is authoritative; splitting
 * common list punctuation also catches legacy semicolon-delimited glosses.
 */
export function glossComparisonKeys(entry: WordEntry): Set<string> {
  const keys = new Set<string>();
  for (const gloss of acceptedGlosses(entry)) {
    const full = normalize(gloss);
    if (full) keys.add(full);
    for (const part of gloss.split(/\s*(?:;|\/|,|\bor\b)\s*/i)) {
      const key = normalize(part.replace(/^to\s+/, ""));
      if (key.length >= 2) keys.add(key);
    }
  }
  return keys;
}

function normalizePinyin(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

export function toSavedGlossFields(entry: WordEntry): Pick<
  SavedWord,
  "pinyin" | "primaryReading" | "primaryGloss" | "acceptedGlosses" | "definitions" | "secondaryDefinitions"
> {
  return {
    pinyin: entry.pinyin,
    primaryReading: primaryReading(entry),
    primaryGloss: primaryGloss(entry),
    acceptedGlosses: acceptedGlosses(entry),
    definitions: entry.definitions,
    secondaryDefinitions: secondaryDefinitions(entry),
  };
}
