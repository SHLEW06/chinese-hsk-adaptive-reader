import {
  getByHskLevel,
  getEntry,
} from "@/lib/dictionary/dictionary";
import { isLearned, loadSrsMap } from "@/lib/hsk-study/storage";
import type { WordEntry } from "@/types/dictionary";
import type { SavedWord } from "@/types/savedWord";
import type { SrsState } from "@/types/hskStudy";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build the pool for the "mixed" deck. Order:
 *  1) every word currently due across all bands, oldest-due first
 *  2) saved words that have never been studied (so they enter rotation)
 *  3) new HSK words at the learner's level (for novelty / progression)
 *
 * The pool is deduped by simplified form. Already-learned words still ride
 * along when due — they need their weekly check-in — but they sit behind the
 * fresher due reviews because of the lastReviewed sort.
 */
export function buildMixedPool({
  level,
  saved,
  now = new Date(),
}: {
  level: number;
  saved: SavedWord[];
  now?: Date;
}): WordEntry[] {
  const srsMap = loadSrsMap();
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
      definitions: saved.definitions,
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

  return [...due.map(({ entry }) => entry), ...newSaved, ...newAtLevel];
}

/** Counts for the "Due today" widget. */
export interface DueCounts {
  /** SRS-tracked words whose dueAt is in the past or right now. */
  reviewsDue: number;
  /** Saved words with no SRS state yet — they'll enter rotation as "new". */
  freshSaved: number;
  /** Reviews that fall in the next 24 hours but aren't due yet. */
  reviewsTomorrow: number;
}

export function dueCounts({
  saved,
  now = new Date(),
}: {
  saved: SavedWord[];
  now?: Date;
}): DueCounts {
  const srsMap = loadSrsMap();
  const nowMs = now.getTime();
  let reviewsDue = 0;
  let reviewsTomorrow = 0;
  for (const srs of Object.values(srsMap)) {
    const due = new Date(srs.dueAt).getTime();
    if (due <= nowMs) reviewsDue += 1;
    else if (due - nowMs <= DAY_MS) reviewsTomorrow += 1;
  }
  const freshSaved = saved.filter((w) => !srsMap[w.simplified]).length;
  return { reviewsDue, freshSaved, reviewsTomorrow };
}
