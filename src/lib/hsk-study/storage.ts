import type { SrsState } from "@/types/hskStudy";

const KEY = "car.hskSrs";
const SETTINGS_KEY = "car.studySettings";

type SrsMap = Record<string, SrsState>;

export interface StudySettings {
  maxNew: number;
  maxReviews: number;
}

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  maxNew: 10,
  maxReviews: 30,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadSrsMap(): SrsMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SrsMap) : {};
  } catch {
    return {};
  }
}

export function saveSrsMap(map: SrsMap): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota errors are non-fatal */
  }
}

export function getSrs(word: string): SrsState | undefined {
  return loadSrsMap()[word];
}

export function setSrsBatch(updates: Record<string, SrsState>): void {
  const current = loadSrsMap();
  saveSrsMap({ ...current, ...updates });
}

/** Reset a word's SRS state so it returns to the new/learning queue. */
export function resetSrs(word: string): void {
  if (!isBrowser()) return;
  const map = loadSrsMap();
  if (map[word]) {
    delete map[word];
    saveSrsMap(map);
  }
}

export function loadStudySettings(): StudySettings {
  if (!isBrowser()) return DEFAULT_STUDY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_STUDY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StudySettings>;
    return {
      maxNew: clamp(parsed.maxNew ?? DEFAULT_STUDY_SETTINGS.maxNew, 0, 200),
      maxReviews: clamp(
        parsed.maxReviews ?? DEFAULT_STUDY_SETTINGS.maxReviews,
        0,
        500,
      ),
    };
  } catch {
    return DEFAULT_STUDY_SETTINGS;
  }
}

export function saveStudySettings(settings: StudySettings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * A word is considered "learned" once it has survived the gap between a
 * daily and weekly review — i.e. its scheduled interval has reached a week
 * and it has been graded successfully at least a few times. Anything below
 * that still belongs in the active study rotation.
 */
export function isLearned(srs: SrsState | undefined): boolean {
  if (!srs) return false;
  return srs.interval >= 7 && srs.reps >= 2;
}

/** All simplified forms whose SRS state classifies them as learned. */
export function learnedWordList(map: SrsMap = loadSrsMap()): string[] {
  return Object.entries(map)
    .filter(([, srs]) => isLearned(srs))
    .map(([word]) => word);
}
