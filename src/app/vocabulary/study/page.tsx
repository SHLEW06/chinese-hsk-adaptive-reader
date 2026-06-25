"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { getByHskLevel, getCommonNonHsk, getEntry } from "@/lib/dictionary/dictionary";
import { StudySession } from "@/components/vocabulary/StudySession";
import { loadStudySettings } from "@/lib/hsk-study/storage";
import { buildMixedPool } from "@/lib/hsk-study/mixedDeck";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
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
    definitions: word.definitions,
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

  const settings = useMemo(() => loadStudySettings(), []);

  const pool = useMemo<WordEntry[]>(() => {
    if (deck === "saved") return (saved ?? []).map(savedToEntry);
    if (deck === "mixed") {
      if (saved === null) return [];
      return buildMixedPool({
        level: profile?.vocabularyLevel ?? 2,
        saved,
      });
    }
    return poolFor(deck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, ready, size, saved, profile]);

  if ((deck === "saved" || deck === "mixed") && saved === null) {
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
          {deck === "mixed" ? "Building your deck…" : "Loading saved words…"}
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
    <StudySession
      key={deck}
      pool={pool}
      deckLabel={DECK_LABELS[deck]}
      newPerSession={settings.maxNew}
      maxReviews={settings.maxReviews}
    />
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
