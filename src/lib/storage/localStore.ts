import type { SavedWord } from "@/types/savedWord";
import type { LearnerProfile } from "@/types/learner";
import type { ContentItem } from "@/types/content";

/**
 * Thin, typed wrapper over persistence so the rest of the app never touches
 * localStorage directly. Cloud persistence is selected by storageProvider.
 */

const KEYS = {
  savedWords: "savedWords",
  profile: "learnerProfile",
  importedContent: "importedContent",
  readingHistory: "readingHistory",
  placementResults: "placementResults",
} as const;

const LEGACY_KEYS: Record<keyof AppState, string> = {
  savedWords: "car.savedWords",
  profile: "car.learnerProfile",
  importedContent: "car.importedContent",
  readingHistory: "car.readingHistory",
  placementResults: "car.placementResults",
};

const isBrowser = (): boolean => typeof window !== "undefined";

export interface ReadingHistoryEntry {
  id: string;
  title: string;
  date: string;
}

interface AppState {
  savedWords: SavedWord[];
  profile: LearnerProfile | null;
  importedContent: ContentItem[];
  readingHistory: ReadingHistoryEntry[];
  placementResults: LearnerProfile[];
}

const defaultState: AppState = {
  savedWords: [],
  profile: null,
  importedContent: [],
  readingHistory: [],
  placementResults: [],
};


function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / serialization errors are non-fatal for this MVP */
  }
}

async function readField<K extends keyof AppState>(field: K): Promise<AppState[K]> {
  return read(LEGACY_KEYS[field], defaultState[field]);
}

async function writeField<K extends keyof AppState>(
  field: K,
  value: AppState[K],
): Promise<void> {
  write(LEGACY_KEYS[field], value);
}

/* ---- Saved words ---- */
export const getSavedWords = (): Promise<SavedWord[]> => readField("savedWords");
export const setSavedWords = (words: SavedWord[]): Promise<void> =>
  writeField("savedWords", words);

/* ---- Learner profile ---- */
export const getProfile = (): Promise<LearnerProfile | null> => readField("profile");
export const setProfile = (profile: LearnerProfile): Promise<void> =>
  writeField("profile", profile);
export const getPlacementResults = (): Promise<LearnerProfile[]> => readField("placementResults");
export const addPlacementResult = async (profile: LearnerProfile): Promise<void> => {
  await writeField("placementResults", [profile, ...(await getPlacementResults())]);
};

/* ---- Imported content ---- */
export const getImportedContent = (): Promise<ContentItem[]> => readField("importedContent");
export const setImportedContent = (items: ContentItem[]): Promise<void> =>
  writeField("importedContent", items);

/* ---- Reading history (simple: list of content ids + timestamps) ---- */
export const getReadingHistory = (): Promise<ReadingHistoryEntry[]> =>
  readField("readingHistory");
export const pushReadingHistory = async (entry: ReadingHistoryEntry): Promise<void> => {
  const history = (await getReadingHistory()).filter((h) => h.id !== entry.id);
  await writeField("readingHistory", [entry, ...history].slice(0, 30));
};

/* ---- Active reading handoff (Library -> Reader) ---- */
const ACTIVE_KEY = "car.activeReading";
export const setActiveReading = (item: ContentItem): void => write(ACTIVE_KEY, item);
export const getActiveReading = (): ContentItem | null => read<ContentItem | null>(ACTIVE_KEY, null);
export const clearActiveReading = (): void => {
  if (isBrowser()) window.localStorage.removeItem(ACTIVE_KEY);
};
