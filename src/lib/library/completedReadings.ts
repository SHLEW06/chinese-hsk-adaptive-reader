/**
 * Lightweight tracker for which library readings the learner has finished.
 *
 * Stored under one localStorage key as `id -> ISO date`. The id can be a
 * library item id, a slug, or an imported-content id; callers should be
 * consistent. We avoid mixing this into the existing `readingHistory` entry
 * (which is per-open, capped at 30) because "completed" is a one-way signal
 * we want to remember indefinitely.
 */

const KEY = "car.completedReadings";

type CompletedMap = Record<string, string>;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): CompletedMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as CompletedMap;
    return {};
  } catch {
    return {};
  }
}

function persist(map: CompletedMap): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota errors are non-fatal */
  }
}

export function getCompletedReadings(): CompletedMap {
  return load();
}

export function getCompletedReadingIds(): Set<string> {
  return new Set(Object.keys(load()));
}

export function isCompleted(id: string): boolean {
  if (!id) return false;
  return Boolean(load()[id]);
}

/**
 * Mark a reading complete. If the reading was already marked the original
 * completion date is preserved — re-reading shouldn't reset the badge.
 */
export function markCompleted(id: string): void {
  if (!id) return;
  const map = load();
  if (map[id]) return;
  map[id] = new Date().toISOString();
  persist(map);
}

export function unmarkCompleted(id: string): void {
  if (!id) return;
  const map = load();
  if (!map[id]) return;
  delete map[id];
  persist(map);
}

/**
 * Mark several aliases for the same reading in one go (e.g. its id and slug).
 * Done as one localStorage write to avoid duplicate persistence work.
 */
export function markCompletedAliases(ids: Array<string | undefined>): void {
  const filtered = ids.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (filtered.length === 0) return;
  const map = load();
  let changed = false;
  const now = new Date().toISOString();
  for (const id of filtered) {
    if (!map[id]) {
      map[id] = now;
      changed = true;
    }
  }
  if (changed) persist(map);
}

export function unmarkCompletedAliases(ids: Array<string | undefined>): void {
  const filtered = ids.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (filtered.length === 0) return;
  const map = load();
  let changed = false;
  for (const id of filtered) {
    if (map[id]) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) persist(map);
}
