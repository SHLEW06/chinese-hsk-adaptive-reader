import type { ContentItem } from "@/types/content";
import type { LibraryListItem } from "@/types/library";

/**
 * Pick a small, calm set of "right-now" reading recommendations for a learner.
 * Heuristic: prefer passages whose difficulty is at the learner's level or
 * exactly one band above (the i+1 sweet spot for reading acquisition).
 * If we run out, fall back to items at the level itself, then 2 above.
 */
export function recommendForLevel(
  items: ContentItem[],
  level: number,
  count = 3,
): ContentItem[] {
  return pickByLevel(items, (c) => c.difficulty, (c) => c.id, level, count);
}

/**
 * Same heuristic, applied to static library cards. Routing learners to the
 * library detail route ensures they see the hand-authored translations and
 * explanations rather than the reader's runtime fallback.
 */
export function recommendLibraryForLevel(
  items: LibraryListItem[],
  level: number,
  count = 3,
): LibraryListItem[] {
  return pickByLevel(items, (c) => c.hskLevel, (c) => c.id, level, count);
}

function pickByLevel<T>(
  items: T[],
  getLevel: (item: T) => number,
  getId: (item: T) => string,
  level: number,
  count: number,
): T[] {
  if (items.length === 0) return [];

  const at = items.filter((c) => getLevel(c) === level);
  const plus1 = items.filter((c) => getLevel(c) === level + 1);
  const plus2 = items.filter((c) => getLevel(c) === level + 2);
  const minus1 = items.filter((c) => getLevel(c) === level - 1);

  const ordered: T[] = [];
  const seen = new Set<string>();
  const push = (arr: T[]) => {
    for (const item of arr) {
      const id = getId(item);
      if (seen.has(id)) continue;
      ordered.push(item);
      seen.add(id);
    }
  };

  if (at[0]) push([at[0]]);
  push(plus1);
  push(at);
  push(plus2);
  push(minus1);

  return ordered.slice(0, count);
}
