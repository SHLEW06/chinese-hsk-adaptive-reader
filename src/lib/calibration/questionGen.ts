import type {
  CalibrationLevel,
  CalibrationQuestion,
} from "@/types/calibration";
import type { WordEntry } from "@/types/dictionary";
import { CALIBRATION_CONFIG } from "./config";

/**
 * Deterministic multiple-choice question generation. No AI grading, no
 * network: for a given (seed, word, pool) the same question is produced every
 * time, so a paused calibration resumes with identical questions and tests
 * can assert exact output.
 */

/** FNV-1a string hash mixed with the calibration seed. */
function hashWord(seed: number, word: string): number {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The meaning string a question shows for a word. */
export function meaningLabel(entry: WordEntry): string {
  return entry.definitions[0]?.trim() ?? "";
}

/**
 * Build the question for one word. Distractor meanings are drawn from the
 * same HSK-level pool so they stay plausible (similar frequency band), and
 * candidates whose meaning duplicates the correct one — or another
 * distractor — are skipped so the answer is never trivially the odd one out.
 */
export function buildQuestion(
  entry: WordEntry,
  level: CalibrationLevel,
  pool: WordEntry[],
  seed: number,
): CalibrationQuestion {
  const rand = mulberry32(hashWord(seed, entry.simplified));
  const correct = meaningLabel(entry);
  const wanted = CALIBRATION_CONFIG.optionCount - 1;

  const used = new Set<string>([normalizeMeaning(correct)]);
  const distractors: string[] = [];

  // Walk the pool from a seeded start offset so different words sample
  // different neighborhoods, deterministically.
  const start = pool.length > 0 ? Math.floor(rand() * pool.length) : 0;
  for (let step = 0; step < pool.length && distractors.length < wanted; step++) {
    const candidate = pool[(start + step) % pool.length];
    if (candidate.simplified === entry.simplified) continue;
    const label = meaningLabel(candidate);
    if (!label) continue;
    const norm = normalizeMeaning(label);
    if (used.has(norm)) continue;
    used.add(norm);
    distractors.push(label);
  }

  // Deterministically place the correct answer among the options.
  const options = [...distractors];
  const answer = Math.floor(rand() * (options.length + 1));
  options.splice(answer, 0, correct);

  return { word: entry.simplified, level, options, answer };
}

/** Lowercased, whitespace-collapsed meaning key for duplicate detection. */
function normalizeMeaning(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
