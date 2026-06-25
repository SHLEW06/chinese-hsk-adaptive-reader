import type { User } from "firebase/auth";
import type { ContentItem } from "@/types/content";
import type { LearnerProfile } from "@/types/learner";
import type { SavedWord } from "@/types/savedWord";
import * as firebaseStore from "./firebaseStore";
import * as localStore from "./localStore";

export interface StorageProvider {
  getSavedWords(): Promise<SavedWord[]>;
  saveSavedWord(word: SavedWord): Promise<void>;
  updateSavedWord(wordId: string, updates: Partial<SavedWord>): Promise<void>;
  deleteSavedWord(wordId: string): Promise<void>;
  getLearnerProfile(): Promise<LearnerProfile | null>;
  saveLearnerProfile(profile: LearnerProfile): Promise<void>;
  getImportedContent(): Promise<ContentItem[]>;
  saveImportedContent(content: ContentItem): Promise<void>;
  savePlacementResult(result: LearnerProfile): Promise<void>;
  saveReadingEvent(event: Record<string, unknown>): Promise<void>;
}

export function getStorageProvider(user: User | null): StorageProvider {
  if (user) return {
    getSavedWords: () => firebaseStore.getSavedWords(user.uid),
    saveSavedWord: (word) => firebaseStore.saveSavedWord(user.uid, word),
    updateSavedWord: (id, updates) => firebaseStore.updateSavedWord(user.uid, id, updates),
    deleteSavedWord: (id) => firebaseStore.deleteSavedWord(user.uid, id),
    getLearnerProfile: () => firebaseStore.getLearnerProfile(user.uid),
    saveLearnerProfile: (profile) => firebaseStore.saveLearnerProfile(user.uid, profile),
    getImportedContent: () => firebaseStore.getImportedContent(user.uid),
    saveImportedContent: (content) => firebaseStore.saveImportedContent(user.uid, content),
    savePlacementResult: async (result) => { await firebaseStore.savePlacementResult(user.uid, result); await firebaseStore.saveLearnerProfile(user.uid, result); },
    saveReadingEvent: async (event) => { await firebaseStore.saveReadingEvent(user.uid, event); },
  };
  return {
    getSavedWords: localStore.getSavedWords,
    saveSavedWord: async (word) => localStore.setSavedWords([word, ...(await localStore.getSavedWords()).filter((item) => item.id !== word.id)]),
    updateSavedWord: async (id, updates) => localStore.setSavedWords((await localStore.getSavedWords()).map((word) => word.id === id ? { ...word, ...updates } : word)),
    deleteSavedWord: async (id) => localStore.setSavedWords((await localStore.getSavedWords()).filter((word) => word.id !== id)),
    getLearnerProfile: localStore.getProfile,
    saveLearnerProfile: localStore.setProfile,
    getImportedContent: localStore.getImportedContent,
    saveImportedContent: async (content) => localStore.setImportedContent([content, ...(await localStore.getImportedContent()).filter((item) => item.id !== content.id)]),
    savePlacementResult: async (result) => { await localStore.addPlacementResult(result); await localStore.setProfile(result); },
    saveReadingEvent: async (event) => {
      const { id, title, date } = event;
      if (typeof id === "string" && typeof title === "string" && typeof date === "string") {
        await localStore.pushReadingHistory({ id, title, date });
      }
    },
  };
}
