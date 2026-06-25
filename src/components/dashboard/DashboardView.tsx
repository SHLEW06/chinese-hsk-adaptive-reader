"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Library, Bookmark, GraduationCap } from "lucide-react";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { DailyPlan } from "@/components/dashboard/DailyPlan";
import { RightNowRail } from "@/components/dashboard/RightNowRail";
import { DueTodayWidget } from "@/components/dashboard/DueTodayWidget";
import { Button } from "@/components/ui/Button";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { SyncLocalProgressButton } from "@/components/auth/SyncLocalProgressButton";
import { recommendLibraryForLevel } from "@/lib/content/recommend";
import { dueCounts } from "@/lib/hsk-study/mixedDeck";
import { getCompletedReadingIds } from "@/lib/library/completedReadings";
import type { LearnerProfile } from "@/types/learner";
import type { SavedWord } from "@/types/savedWord";
import type { LibraryListItem } from "@/types/library";

interface Props {
  libraryItems: LibraryListItem[];
}

export function DashboardView({ libraryItems }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [words, setWords] = useState<SavedWord[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storage = getStorageProvider(user);
      const [nextProfile, nextWords] = await Promise.all([
        storage.getLearnerProfile(),
        storage.getSavedWords(),
      ]);
      if (!cancelled) {
        setProfile(nextProfile);
        setWords(nextWords);
        setCompletedIds(getCompletedReadingIds());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const counts = {
    saved: words.length,
    known: words.filter((w) => w.status === "known").length,
    review: words.filter((w) => w.status !== "known").length,
  };

  // dueCounts reads localStorage so it can only run client-side. The memo is
  // keyed by `words` so newly saved words bump the "Due today" widget the
  // moment the dashboard finishes hydrating.
  const due = useMemo(() => dueCounts({ saved: words }), [words]);

  // Prefer readings the learner hasn't finished yet. If everything they've
  // been pointed at is read we fall back to the full catalog so the rail
  // never goes empty.
  const fresh = useMemo(() => {
    if (completedIds.size === 0) return libraryItems;
    const remaining = libraryItems.filter(
      (item) => !completedIds.has(item.id) && !completedIds.has(item.slug),
    );
    return remaining.length > 0 ? remaining : libraryItems;
  }, [libraryItems, completedIds]);

  const recommendations = recommendLibraryForLevel(
    fresh,
    profile?.vocabularyLevel ?? 2,
    3,
  );

  return (
    <div className="space-y-9 animate-fade-in">
      <div>
        <div
          className="text-[10.5px] uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
        >
          书房 · The reading room
        </div>
        <h1
          className="mt-1 font-serif text-3xl font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Welcome back.
        </h1>
        <p
          className="mt-1 font-serif text-sm italic"
          style={{ color: "var(--muted)" }}
        >
          Your level, your plan, and where to read next.
        </p>
      </div>

      <DashboardSummary profile={profile} counts={counts} />

      <DueTodayWidget counts={due} />

      {recommendations.length > 0 && (
        <RightNowRail
          level={profile?.vocabularyLevel ?? 2}
          items={recommendations}
        />
      )}

      <DailyPlan profile={profile} reviewCount={counts.review} />

      <SyncLocalProgressButton />

      <div>
        <div
          className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 85%, transparent)" }}
        >
          Jump to
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button href="/reader" variant="secondary" className="justify-start">
            <BookOpen size={16} /> Reader
          </Button>
          <Button href="/library" variant="secondary" className="justify-start">
            <Library size={16} /> Library
          </Button>
          <Button href="/saved-words" variant="secondary" className="justify-start">
            <Bookmark size={16} /> Saved
          </Button>
          <Button href="/placement" variant="secondary" className="justify-start">
            <GraduationCap size={16} /> Placement
          </Button>
        </div>
      </div>
    </div>
  );
}
