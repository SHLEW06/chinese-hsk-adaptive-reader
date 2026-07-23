import {
  getByHskLevel,
  getEntry,
} from "@/lib/dictionary/dictionary";
import { isLearned, loadSrsMap } from "@/lib/hsk-study/storage";
import { isVerificationDue } from "@/lib/calibration/deck";
import { emptyCalibrationState } from "@/lib/calibration/state";
import type { CalibrationState } from "@/types/calibration";
import type { WordEntry } from "@/types/dictionary";
import type { SavedWord } from "@/types/savedWord";
import type { SrsState } from "@/types/hskStudy";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build the pool for the "mixed" deck. Order:
 *  1) every word currently due across all bands, oldest-due first
 *  2) calibration-known words due for a verification check-in
 *  3) saved words that have never been studied (so they enter rotation)
 *  4) new HSK words at the learner's level (for novelty / progression)
 *
 * The pool is deduped by simplified form. Already-learned words still ride
 * along when due — they need their weekly check-in — but they sit behind the
 * fresher due reviews because of the lastReviewed sort.
 *
 * Calibration-known words that are not yet due for verification are *not*
 * filtered here — applyCalibrationToPool does that at deck-selection time —
 * but verification-due words are injected here because they can live at any
 * HSK level, not just the bands this pool samples.
 */
export function buildMixedPool({
  level,
  saved,
  calibration = emptyCalibrationState(),
  now = new Date(),
  srsMap = loadSrsMap(),
}: {
  level: number;
  saved: SavedWord[];
  calibration?: CalibrationState;
  now?: Date;
  srsMap?: Record<string, SrsState>;
}): WordEntry[] {
  const nowMs = now.getTime();
  const savedBySimplified = new Map(saved.map((w) => [w.simplified, w]));

  const due: Array<{ entry: WordEntry; srs: SrsState }> = [];
  const seen = new Set<string>();

  const resolveEntry = (simplified: string): WordEntry | null => {
    const live = getEntry(simplified);
    if (live) return live;
    const saved = savedBySimplified.get(simplified);
    if (!saved) return null;
    return {
      simplified: saved.simplified,
      traditional: saved.traditional,
      pinyin: saved.pinyin,
      primaryReading: saved.primaryReading,
      primaryGloss: saved.primaryGloss,
      acceptedGlosses: saved.acceptedGlosses,
      definitions: saved.definitions,
      secondaryDefinitions: saved.secondaryDefinitions,
      hskLevel: saved.hskLevel,
    };
  };

  for (const [simplified, srs] of Object.entries(srsMap)) {
    if (new Date(srs.dueAt).getTime() > nowMs) continue;
    const entry = resolveEntry(simplified);
    if (!entry) continue;
    due.push({ entry, srs });
    seen.add(simplified);
  }
  due.sort((a, b) => a.srs.dueAt.localeCompare(b.srs.dueAt));

  // Calibration-known words whose verification check-in is due. These can be
  // at any HSK band, so they must be injected explicitly.
  const verificationDue: WordEntry[] = [];
  for (const word of Object.keys(calibration.baseline)) {
    if (seen.has(word)) continue;
    if (!isVerificationDue(calibration, word, srsMap[word], now)) continue;
    const entry = resolveEntry(word);
    if (!entry) continue;
    verificationDue.push(entry);
    seen.add(word);
  }

  const newSaved: WordEntry[] = [];
  for (const word of saved) {
    if (seen.has(word.simplified)) continue;
    if (srsMap[word.simplified]) continue;
    const entry = resolveEntry(word.simplified);
    if (!entry) continue;
    newSaved.push(entry);
    seen.add(word.simplified);
  }

  const newAtLevel: WordEntry[] = [];
  const bandLevels: Array<number | "7-9"> = [level, level + 1, level - 1].filter(
    (l): l is number => typeof l === "number" && l >= 1 && l <= 6,
  );
  for (const band of bandLevels) {
    for (const entry of getByHskLevel(band)) {
      if (seen.has(entry.simplified)) continue;
      // Skip ones the user has already learned — no need to reintroduce them.
      if (isLearned(srsMap[entry.simplified])) {
        seen.add(entry.simplified);
        continue;
      }
      newAtLevel.push(entry);
      seen.add(entry.simplified);
    }
  }

  return [...due.map(({ entry }) => entry), ...verificationDue, ...newSaved, ...newAtLevel];
}

/** Counts for the "Due today" widget. */
export interface DueCounts {
  /** SRS-tracked words whose dueAt is in the past or right now. */
  reviewsDue: number;
  /** Saved words with no SRS state yet — they'll enter rotation as "new". */
  freshSaved: number;
  /** Reviews that fall in the next 24 hours but aren't due yet. */
  reviewsTomorrow: number;
  /** Calibration-known words due for a verification check-in. */
  verificationsDue: number;
}

export function dueCounts({
  saved,
  calibration = emptyCalibrationState(),
  now = new Date(),
  srsMap = loadSrsMap(),
}: {
  saved: SavedWord[];
  calibration?: CalibrationState;
  now?: Date;
  srsMap?: Record<string, SrsState>;
}): DueCounts {
  const nowMs = now.getTime();
  let reviewsDue = 0;
  let reviewsTomorrow = 0;
  for (const srs of Object.values(srsMap)) {
    const due = new Date(srs.dueAt).getTime();
    if (due <= nowMs) reviewsDue += 1;
    else if (due - nowMs <= DAY_MS) reviewsTomorrow += 1;
  }
  // Saved words already assumed known by calibration are not "fresh new
  // cards" — they come back through verification instead.
  const freshSaved = saved.filter(
    (w) => !srsMap[w.simplified] && !calibration.baseline[w.simplified],
  ).length;
  let verificationsDue = 0;
  for (const word of Object.keys(calibration.baseline)) {
    if (isVerificationDue(calibration, word, srsMap[word], now)) verificationsDue += 1;
  }
  return { reviewsDue, freshSaved, reviewsTomorrow, verificationsDue };
}
