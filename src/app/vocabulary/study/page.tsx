"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { getByHskLevel, getCommonNonHsk, getEntry } from "@/lib/dictionary/dictionary";
import { StudySession } from "@/components/vocabulary/StudySession";
import { loadStudySettings } from "@/lib/hsk-study/storage";
import { buildMixedPool } from "@/lib/hsk-study/mixedDeck";
import { applyVerificationOutcomes, emptyCalibrationState } from "@/lib/calibration/state";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import type { CalibrationState } from "@/types/calibration";
import type { DeckKey } from "@/types/hskStudy";
import type { WordEntry } from "@/types/dictionary";
import type { SavedWord } from "@/types/savedWord";
import type { LearnerProfile } from "@/types/learner";

const DECK_LABELS: Record<DeckKey, string> = {
  "1": "HSK 1",
  "2": "HSK 2",
  "3": "HSK 3",
  "4": "HSK 4",
  "5": "HSK 5",
  "6": "HSK 6",
  "7-9": "HSK 7–9",
  common: "Common (non-HSK)",
  saved: "Saved words",
  mixed: "Mixed · due first",
};

function isDeckKey(value: string | null): value is DeckKey {
  return value !== null && value in DECK_LABELS;
}

function poolFor(deck: DeckKey): WordEntry[] {
  if (deck === "common") return getCommonNonHsk(2000);
  if (deck === "7-9") return getByHskLevel("7-9");
  if (deck === "saved" || deck === "mixed") return [];
  return getByHskLevel(Number(deck));
}

/**
 * Convert a SavedWord to a WordEntry-shaped object so the study session can
 * present it just like any HSK card. Prefer the live dictionary entry when
 * available so the latest definitions/readings show.
 */
function savedToEntry(word: SavedWord): WordEntry {
  const live = getEntry(word.simplified);
  if (live) return live;
  return {
    simplified: word.simplified,
    traditional: word.traditional,
    pinyin: word.pinyin,
    primaryReading: word.primaryReading,
    primaryGloss: word.primaryGloss,
    acceptedGlosses: word.acceptedGlosses,
    definitions: word.definitions,
    secondaryDefinitions: word.secondaryDefinitions,
    hskLevel: word.hskLevel,
  };
}

function StudyInner() {
  const params = useSearchParams();
  const deckParam = params.get("deck");
  const deck: DeckKey = isDeckKey(deckParam) ? deckParam : "1";
  const { ready, size } = useDictionary();
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedWord[] | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [calibration, setCalibration] = useState<CalibrationState | null>(null);

  // Lazy-load saved words + profile for the "saved" and "mixed" decks.
  useEffect(() => {
    if (deck !== "saved" && deck !== "mixed") return;
    let cancelled = false;
    const storage = getStorageProvider(user);
    void Promise.all([storage.getSavedWords(), storage.getLearnerProfile()]).then(
      ([words, p]) => {
        if (cancelled) return;
        setSaved(words);
        setProfile(p);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [deck, user]);

  // Calibration applies to every deck: it filters baseline-known words out
  // of the new queue and surfaces due verification check-ins.
  const calibrationRef = useRef<CalibrationState | null>(null);
  const [calibrationSaveFailed, setCalibrationSaveFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void getStorageProvider(user)
      .getCalibrationState()
      .then((load) => {
        if (cancelled) return;
        if (load.kind === "unsupportedVersion") {
          // Data from a newer client: study proceeds without calibration
          // filtering, and calibrationRef stays null so no verification
          // transition can ever write over the future-version payload.
          calibrationRef.current = null;
          setCalibration(emptyCalibrationState());
          return;
        }
        calibrationRef.current = load.state;
        setCalibration(load.state);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Deliberate save pipeline for verification outcomes: the latest state is
  // kept pending until a save for it succeeds; failures are surfaced and
  // retried with a capped backoff. Because saves are full-document replaces,
  // any later successful write also heals earlier failed ones.
  const pendingSave = useRef<CalibrationState | null>(null);
  const savingNow = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesLeft = useRef(0);

  const flushCalibrationSave = useCallback(
    function flush() {
      const state = pendingSave.current;
      if (!state || savingNow.current) return;
      savingNow.current = true;
      getStorageProvider(user)
        .saveCalibrationState(state)
        .then(
          () => {
            savingNow.current = false;
            setCalibrationSaveFailed(false);
            if (pendingSave.current === state) pendingSave.current = null;
            else flush(); // a newer outcome arrived while saving
          },
          (error) => {
            savingNow.current = false;
            console.error("Check-in result save failed", error);
            setCalibrationSaveFailed(true);
            if (retriesLeft.current > 0) {
              retriesLeft.current -= 1;
              if (retryTimer.current) clearTimeout(retryTimer.current);
              retryTimer.current = setTimeout(flush, 4000);
            }
          },
        );
    },
    [user],
  );

  // Persist through a ref, not state: a state update here would rebuild the
  // pool and silently restart the session. Staleness is safe — the verified
  // word now has genuine SRS state, which always outranks the baseline in
  // deck selection. Called per word at first grade, so an abandoned session
  // cannot lose an outcome; replays are no-ops (the word has left the
  // baseline already).
  const handleVerificationOutcome = useCallback(
    (word: string, passed: boolean) => {
      const prev = calibrationRef.current;
      if (!prev) return;
      const next = applyVerificationOutcomes(prev, { [word]: passed }, new Date());
      if (next === prev) return;
      calibrationRef.current = next;
      pendingSave.current = next;
      retriesLeft.current = 3;
      flushCalibrationSave();
    },
    [flushCalibrationSave],
  );

  // Route exit: one last flush attempt for a still-unsaved outcome.
  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      const state = pendingSave.current;
      if (state && !savingNow.current) {
        getStorageProvider(user)
          .saveCalibrationState(state)
          .catch((error) => console.error("Check-in result save failed on exit", error));
      }
    },
    [user],
  );

  const settings = useMemo(() => loadStudySettings(), []);

  const pool = useMemo<WordEntry[]>(() => {
    if (deck === "saved") return (saved ?? []).map(savedToEntry);
    if (deck === "mixed") {
      if (saved === null || calibration === null) return [];
      return buildMixedPool({
        level: profile?.vocabularyLevel ?? 2,
        saved,
        calibration,
      });
    }
    return poolFor(deck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, ready, size, saved, profile, calibration]);

  if (calibration === null || ((deck === "saved" || deck === "mixed") && saved === null)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Vocabulary
        </Link>
        <div className="mt-10 text-sm text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-seal-soft" />
          {deck === "mixed" ? "Building your deck…" : "Loading your study state…"}
        </div>
      </div>
    );
  }

  if (!ready && pool.length === 0 && deck !== "saved" && deck !== "mixed") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Vocabulary
        </Link>
        <div className="mt-10 text-sm text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-seal-soft" />
          Loading dictionary…
        </div>
      </div>
    );
  }

  return (
    <>
      {calibrationSaveFailed && (
        <p
          role="alert"
          className="mx-auto max-w-5xl px-4 pt-4 text-xs font-medium text-rose-700"
        >
          A check-in result could not be saved yet — retrying automatically.
          Your review history is unaffected.
        </p>
      )}
      <StudySession
        key={deck}
        pool={pool}
        deckLabel={DECK_LABELS[deck]}
        newPerSession={settings.maxNew}
        maxReviews={settings.maxReviews}
        calibration={calibration}
        onVerificationOutcome={handleVerificationOutcome}
      />
    </>
  );
}

export default function VocabularyStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted">
          Loading study session…
        </div>
      }
    >
      <StudyInner />
    </Suspense>
  );
}
