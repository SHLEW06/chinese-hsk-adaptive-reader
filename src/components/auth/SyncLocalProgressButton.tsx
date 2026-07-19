"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { classifyCalibrationState } from "@/lib/calibration/load";
import * as firebaseStore from "@/lib/storage/firebaseStore";
import * as localStore from "@/lib/storage/localStore";

export function SyncLocalProgressButton() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  if (!user) return null;

  const sync = async () => {
    if (!window.confirm("Upload browser-only progress that does not already exist in your account? Existing cloud saved words, imported content, and profile will be kept. Local data will not be deleted.")) return;
    setStatus("Syncing…");
    try {
      const [words, profile, content, results, calibration, cloudWords, cloudContent, cloudProfile, cloudCalibration] = await Promise.all([
        localStore.getSavedWords(), localStore.getProfile(), localStore.getImportedContent(), localStore.getPlacementResults(), localStore.getCalibration(),
        firebaseStore.getSavedWords(user.uid), firebaseStore.getImportedContent(user.uid), firebaseStore.getLearnerProfile(user.uid), firebaseStore.getCalibrationState(user.uid),
      ]);
      const newWords = words.filter((word) => !new Set(cloudWords.map((w) => w.id)).has(word.id));
      const newContent = content.filter((item) => !new Set(cloudContent.map((c) => c.id)).has(item.id));
      // Only upload local calibration when it is *valid* current-schema data
      // and the cloud copy is absent or older. A future-version cloud document
      // (written by a newer client) is never overwritten, no matter what
      // timestamps say; malformed local data is never uploaded.
      const localLoad = classifyCalibrationState(calibration);
      const cloudLoad = classifyCalibrationState(cloudCalibration);
      const uploadableCalibration =
        cloudLoad.kind !== "unsupportedVersion" &&
        localLoad.kind === "valid" &&
        localLoad.state.status !== "notStarted" &&
        (localLoad.state.updatedAt ?? "") > (cloudLoad.state.updatedAt ?? "")
          ? localLoad.state
          : null;

      // Use batched writes instead of individual operations — reduces Firestore write ops
      await firebaseStore.batchSyncToCloud(
        user.uid,
        newWords,
        newContent,
        results,
        profile && !cloudProfile ? profile : null,
        uploadableCalibration,
      );
      setStatus("Local progress uploaded.");
    } catch {
      setStatus("Sync failed. Check your Firestore configuration and try again.");
    }
  };
  return <div className="flex items-center gap-2"><button onClick={() => void sync()} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-seal">Sync local progress to cloud</button>{status && <span className="text-xs text-muted">{status}</span>}</div>;
}
