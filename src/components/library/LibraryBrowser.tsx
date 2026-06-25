"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { ContentCard } from "@/components/library/ContentCard";
import { LibraryCard } from "@/components/library/LibraryCard";
import {
  ContentFilters,
  type CategoryFilter,
  type LevelFilter,
} from "@/components/library/ContentFilters";
import { ContentImportForm } from "@/components/library/ContentImportForm";
import { recommendForLevel } from "@/lib/content/recommend";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ContentItem } from "@/types/content";
import type { LibraryListItem } from "@/types/library";
import type { LearnerProfile } from "@/types/learner";

/**
 * Client-side filtering and imported-content handling for the Library page.
 * `staticItems` is deliberately card metadata only: the full reading and its
 * sentence explanations are loaded only by the selected detail route.
 */
export function LibraryBrowser({ staticItems }: { staticItems: LibraryListItem[] }) {
  const { user } = useAuth();
  const [imported, setImported] = useState<ContentItem[]>([]);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [level, setLevel] = useState<LevelFilter>("All");

  useEffect(() => {
    let cancelled = false;
    const storage = getStorageProvider(user);
    void Promise.all([storage.getImportedContent(), storage.getLearnerProfile()])
      .then(([items, learnerProfile]) => {
        if (!cancelled) {
          setImported(items);
          setProfile(learnerProfile);
        }
      })
      .catch((error) => {
        // The static catalog must remain usable if a local cache or a
        // Firestore request is unavailable. Imported content is additive,
        // never a prerequisite for opening library stories.
        console.warn("[library] Could not load personal library data:", error);
        if (!cancelled) {
          setImported([]);
          setProfile(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refresh = async () => {
    try {
      setImported(await getStorageProvider(user).getImportedContent());
    } catch (error) {
      console.warn("[library] Could not refresh imported content:", error);
    }
  };

  const shownImported = useMemo(() => {
    let pool = imported;
    if (category !== "All") pool = pool.filter((item) => item.category === category);
    if (level !== "All") pool = pool.filter((item) => item.difficulty === level);
    return pool;
  }, [imported, category, level]);

  const shownLibraryItems = useMemo(() => {
    let pool = staticItems;
    if (category !== "All") pool = pool.filter((item) => item.category === category);
    if (level !== "All") pool = pool.filter((item) => item.hskLevel === level);
    return pool;
  }, [staticItems, category, level]);

  // Imported text keeps the legacy ContentItem recommendation behavior. Static
  // library passages are already grouped prominently by their authored HSK band.
  const forYou =
    profile && level === "All"
      ? recommendForLevel(imported, profile.vocabularyLevel, 3)
      : [];

  const groupedByLevel = useMemo(() => {
    if (level !== "All") return null;
    const groups: Record<number, { library: LibraryListItem[]; imported: ContentItem[] }> = {};
    for (const item of shownLibraryItems) {
      const group = (groups[item.hskLevel] ??= { library: [], imported: [] });
      group.library.push(item);
    }
    for (const item of shownImported) {
      const group = (groups[item.difficulty] ??= { library: [], imported: [] });
      group.imported.push(item);
    }
    return groups;
  }, [level, shownImported, shownLibraryItems]);

  return (
    <div className="space-y-7 animate-fade-in">
      <div>
        <div
          className="text-[10.5px] uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
        >
          书库 · The library
        </div>
        <h1
          className="mt-1 font-serif text-3xl font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Pick something to read.
        </h1>
        <p
          className="mt-1 font-serif text-sm italic"
          style={{ color: "var(--muted)" }}
        >
          A growing collection of original passages across HSK 1–6 — stories, essays,
          news, and more. Or paste your own text below.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <ContentFilters
          category={category}
          onCategoryChange={setCategory}
          level={level}
          onLevelChange={setLevel}
        />
        <Link
          href="/library/path"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors"
          style={{
            background: "color-mix(in srgb, var(--seal) 6%, transparent)",
            borderColor: "color-mix(in srgb, var(--seal) 30%, transparent)",
            color: "var(--seal)",
          }}
        >
          <MapIcon size={13} /> Reading Path
        </Link>
      </div>

      {forYou.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2
              className="font-serif text-xl font-semibold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              From your imports
            </h2>
            <span className="text-[11.5px] italic" style={{ color: "var(--muted)" }}>
              picked to be a small stretch
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forYou.map((item) => (
              <ContentCard key={`for-you-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {groupedByLevel ? (
        <div className="space-y-7">
          {[1, 2, 3, 4, 5, 6].map((hskLevel) => {
            const group = groupedByLevel[hskLevel];
            const totalCount = (group?.library.length ?? 0) + (group?.imported.length ?? 0);
            if (!group || totalCount === 0) return null;
            return (
              <section key={hskLevel}>
                <div className="mb-3 flex items-end justify-between">
                  <h2
                    className="font-serif text-xl font-semibold tracking-tight"
                    style={{ color: "var(--ink)" }}
                  >
                    HSK {hskLevel}
                  </h2>
                  <span className="text-[11.5px] italic" style={{ color: "var(--muted)" }}>
                    {totalCount} passage{totalCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.library.map((item) => (
                    <LibraryCard key={item.id} item={item} />
                  ))}
                  {group.imported.map((item) => (
                    <ContentCard key={`imported-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shownLibraryItems.map((item) => (
            <LibraryCard key={item.id} item={item} />
          ))}
          {shownImported.map((item) => (
            <ContentCard key={`imported-${item.id}`} item={item} />
          ))}
          {shownImported.length === 0 && shownLibraryItems.length === 0 && (
            <div
              className="col-span-full rounded-2xl p-8 text-center font-serif italic"
              style={{
                background: "color-mix(in srgb, var(--paper-2) 70%, transparent)",
                border: "1px dashed var(--line)",
                color: "var(--muted)",
              }}
            >
              No passages match this filter yet. Try another level or category.
            </div>
          )}
        </div>
      )}

      <ContentImportForm onImported={refresh} />
    </div>
  );
}
