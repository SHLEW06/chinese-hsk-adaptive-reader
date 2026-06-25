import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ContentItem } from "@/types/content";
import type { LearnerProfile } from "@/types/learner";
import type { SavedWord } from "@/types/savedWord";

/* ------------------------------------------------------------------ */
/*  In-memory read cache – avoids redundant Firestore reads on every  */
/*  page navigation.  Writes invalidate the relevant cache entry.     */
/* ------------------------------------------------------------------ */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cacheKey(userId: string, coll: string) {
  return `${userId}:${coll}`;
}

function getFromCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, ts: Date.now() });
}

function invalidateCache(userId: string, coll: string) {
  cache.delete(cacheKey(userId, coll));
}

/* ------------------------------------------------------------------ */

const userCollection = (userId: string, name: string) => collection(db, "users", userId, name);

/* ---- Saved words ---- */

export async function getSavedWords(userId: string): Promise<SavedWord[]> {
  const key = cacheKey(userId, "savedWords");
  const cached = getFromCache<SavedWord[]>(key);
  if (cached) return cached;
  const snapshot = await getDocs(userCollection(userId, "savedWords"));
  const words = snapshot.docs.map((item) => item.data() as SavedWord);
  setCache(key, words);
  return words;
}

export const saveSavedWord = async (userId: string, word: SavedWord) => {
  await setDoc(doc(db, "users", userId, "savedWords", word.id), { ...word, updatedAt: serverTimestamp() }, { merge: true });
  invalidateCache(userId, "savedWords");
};

export const updateSavedWord = async (userId: string, wordId: string, updates: Partial<SavedWord>) => {
  await updateDoc(doc(db, "users", userId, "savedWords", wordId), { ...updates, updatedAt: serverTimestamp() });
  invalidateCache(userId, "savedWords");
};

export const deleteSavedWord = async (userId: string, wordId: string) => {
  await deleteDoc(doc(db, "users", userId, "savedWords", wordId));
  invalidateCache(userId, "savedWords");
};

/* ---- Learner profile ---- */

export async function getLearnerProfile(userId: string): Promise<LearnerProfile | null> {
  const key = cacheKey(userId, "profile");
  const cached = getFromCache<LearnerProfile | null>(key);
  if (cached !== undefined) return cached;
  const snapshot = await getDoc(doc(db, "users", userId, "profile", "main"));
  const profile = snapshot.exists() ? (snapshot.data() as LearnerProfile) : null;
  setCache(key, profile);
  return profile;
}

export const saveLearnerProfile = async (userId: string, profile: LearnerProfile) => {
  await setDoc(doc(db, "users", userId, "profile", "main"), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
  invalidateCache(userId, "profile");
};

/* ---- Imported content ---- */

export async function getImportedContent(userId: string): Promise<ContentItem[]> {
  const key = cacheKey(userId, "importedContent");
  const cached = getFromCache<ContentItem[]>(key);
  if (cached) return cached;
  const snapshot = await getDocs(userCollection(userId, "importedContent"));
  const items = snapshot.docs.map((item) => item.data() as ContentItem);
  setCache(key, items);
  return items;
}

export const saveImportedContent = async (userId: string, content: ContentItem) => {
  await setDoc(doc(db, "users", userId, "importedContent", content.id), { ...content, updatedAt: serverTimestamp() }, { merge: true });
  invalidateCache(userId, "importedContent");
};

/* ---- Placement results ---- */

export async function getPlacementResults(userId: string): Promise<LearnerProfile[]> {
  const snapshot = await getDocs(userCollection(userId, "placementResults"));
  return snapshot.docs.map((item) => item.data() as LearnerProfile);
}

export const savePlacementResult = (userId: string, result: LearnerProfile) =>
  addDoc(userCollection(userId, "placementResults"), { ...result, createdAt: serverTimestamp() });

/* ---- Reading events ---- */

export const saveReadingEvent = (userId: string, event: Record<string, unknown>) =>
  addDoc(userCollection(userId, "readingEvents"), { ...event, createdAt: serverTimestamp() });

/* ---- Batched writes (for sync) ---- */

export async function batchSyncToCloud(
  userId: string,
  words: SavedWord[],
  content: ContentItem[],
  results: LearnerProfile[],
  profile: LearnerProfile | null,
) {
  // Firestore batches are limited to 500 ops each
  const MAX_BATCH = 500;
  const ops: Array<() => void> = [];
  let batch = writeBatch(db);
  let count = 0;

  const flush = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  const addOp = async (fn: (b: ReturnType<typeof writeBatch>) => void) => {
    fn(batch);
    count++;
    if (count >= MAX_BATCH) await flush();
  };

  for (const word of words) {
    await addOp((b) => b.set(doc(db, "users", userId, "savedWords", word.id), { ...word, updatedAt: serverTimestamp() }, { merge: true }));
  }
  for (const item of content) {
    await addOp((b) => b.set(doc(db, "users", userId, "importedContent", item.id), { ...item, updatedAt: serverTimestamp() }, { merge: true }));
  }
  for (const result of results) {
    const ref = doc(collection(db, "users", userId, "placementResults"));
    await addOp((b) => b.set(ref, { ...result, createdAt: serverTimestamp() }));
  }
  if (profile) {
    await addOp((b) => b.set(doc(db, "users", userId, "profile", "main"), { ...profile, updatedAt: serverTimestamp() }, { merge: true }));
  }

  await flush();

  // Invalidate all caches after bulk sync
  invalidateCache(userId, "savedWords");
  invalidateCache(userId, "profile");
  invalidateCache(userId, "importedContent");
}
