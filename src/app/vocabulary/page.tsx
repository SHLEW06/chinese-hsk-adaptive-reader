"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GraduationCap, Play, Settings, Sparkles } from "lucide-react";
import { HskBadge } from "@/components/ui/Badge";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { getByHskLevel, getCommonNonHsk } from "@/lib/dictionary/dictionary";
import { hskColor } from "@/lib/dictionary/hsk";
import { WordPopup } from "@/components/reader/WordPopup";
import { useAuth } from "@/components/auth/AuthProvider";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import {
  DEFAULT_STUDY_SETTINGS,
  isLearned,
  loadSrsMap,
  loadStudySettings,
  saveStudySettings,
  type StudySettings,
} from "@/lib/hsk-study/storage";
import { uid, todayISO } from "@/lib/utils/text";
import type { WordEntry } from "@/types/dictionary";
import type { SavedWord } from "@/types/savedWord";

type TabKey = "1" | "2" | "3" | "4" | "5" | "6" | "7-9" | "common" | "saved" | "mixed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "mixed", label: "Mixed" },
  { key: "1", label: "HSK 1" },
  { key: "2", label: "HSK 2" },
  { key: "3", label: "HSK 3" },
  { key: "4", label: "HSK 4" },
  { key: "5", label: "HSK 5" },
  { key: "6", label: "HSK 6" },
  { key: "7-9", label: "HSK 7–9" },
  { key: "common", label: "Common" },
  { key: "saved", label: "Saved" },
];

const CHUNK_SIZE = 1000;

function entriesForTab(tab: TabKey, saved: SavedWord[]): WordEntry[] {
  if (tab === "mixed") return [];
  if (tab === "saved") {
    return saved.map((w) => ({
      simplified: w.simplified,
      traditional: w.traditional,
      pinyin: w.pinyin,
      definitions: w.definitions,
      hskLevel: w.hskLevel,
    }));
  }
  if (tab === "common") return getCommonNonHsk(5000);
  if (tab === "7-9") return getByHskLevel("7-9");
  return getByHskLevel(Number(tab));
}

export default function VocabularyPage() {
  const { ready, size } = useDictionary();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("1");
  const [visible, setVisible] = useState(CHUNK_SIZE);
  const [filter, setFilter] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [popup, setPopup] = useState<WordEntry | null>(null);
  const [saved, setSaved] = useState<SavedWord[]>([]);
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_STUDY_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStorageProvider(user).getSavedWords().then((words) => {
      if (!cancelled) setSaved(words);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setSettings(loadStudySettings());
  }, []);

  const updateSettings = (patch: Partial<StudySettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveStudySettings(next);
  };

  const savedSet = useMemo(() => new Set(saved.map((w) => w.simplified)), [saved]);

  const learnedCount = useMemo(() => {
    const map = loadSrsMap();
    let n = 0;
    for (const srs of Object.values(map)) if (isLearned(srs)) n += 1;
    return n;
  }, [saved, tab, ready, size]);

  const saveWord = (entry: WordEntry) => {
    if (savedSet.has(entry.simplified)) return;
    const word: SavedWord = {
      id: uid("word"),
      simplified: entry.simplified,
      traditional: entry.traditional,
      pinyin: entry.pinyin,
      definitions: entry.definitions,
      hskLevel: entry.hskLevel,
      status: "new",
      dateSaved: todayISO(),
      reviewCount: 0,
    };
    setSaved((prev) => [word, ...prev]);
    void getStorageProvider(user).saveSavedWord(word);
  };

  const markKnown = (entry: WordEntry) => {
    const existing = saved.find((w) => w.simplified === entry.simplified);
    if (existing) {
      setSaved((prev) =>
        prev.map((w) => (w.id === existing.id ? { ...w, status: "known" } : w)),
      );
      void getStorageProvider(user).updateSavedWord(existing.id, { status: "known" });
    } else {
      const word: SavedWord = {
        id: uid("word"),
        simplified: entry.simplified,
        traditional: entry.traditional,
        pinyin: entry.pinyin,
        definitions: entry.definitions,
        hskLevel: entry.hskLevel,
        status: "known",
        dateSaved: todayISO(),
        reviewCount: 0,
      };
      setSaved((prev) => [word, ...prev]);
      void getStorageProvider(user).saveSavedWord(word);
    }
  };

  const entries = useMemo(
    () => entriesForTab(tab, saved),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, ready, size, saved],
  );

  useEffect(() => {
    setVisible(CHUNK_SIZE);
  }, [tab, filter]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      if (e.simplified.includes(q)) return true;
      if (e.pinyin.toLowerCase().includes(q)) return true;
      return e.definitions.some((d) => d.toLowerCase().includes(q));
    });
  }, [entries, filter]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(filtered.length, v + CHUNK_SIZE));
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  return (
    <div className="mx-auto max-w-5xl animate-fade-in px-4 py-6 pb-24 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Vocabulary</h1>
          <p className="mt-1 text-sm text-muted">
            Browse HSK 3.0, common non-HSK words, and your saved list.{" "}
            {!ready ? (
              <span className="inline-flex items-center gap-1 italic text-seal/80">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-seal/70" />
                Loading full dictionary…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-celadon">
                <span className="h-1.5 w-1.5 rounded-full bg-celadon" />
                {size.toLocaleString()} words loaded
              </span>
            )}
          </p>
        </div>
        <Link
          href="/vocabulary/learned"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-paper transition-all hover:-translate-y-px hover:border-celadon/40"
        >
          <GraduationCap size={13} />
          Learned
          <span className="rounded-full bg-celadon/15 px-1.5 py-0.5 text-[10px] font-semibold text-celadon">
            {learnedCount}
          </span>
        </Link>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          const color =
            key === "common"
              ? "#9A9285"
              : key === "saved"
                ? "#7C4A2F"
                : hskColor(key === "7-9" ? "7-9" : Number(key));
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "text-white shadow-paper-md"
                  : "border border-line bg-surface text-muted shadow-paper hover:-translate-y-px hover:border-seal/30 hover:text-ink"
              }`}
              style={
                active
                  ? {
                      backgroundColor: color,
                      boxShadow: `0 2px 6px ${color}40, inset 0 1px 0 rgba(255,255,255,0.18)`,
                    }
                  : undefined
              }
            >
              {label}
              {key === "saved" && saved.length > 0 && (
                <span className="ml-1 opacity-80">· {saved.length}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter this tab (Chinese, pinyin, or English)"
            className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-paper transition-colors focus:border-seal/50 focus:outline-none focus:ring-2 focus:ring-seal/15"
          />
          <Link
            href={`/vocabulary/study?deck=${encodeURIComponent(tab)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink shadow-paper transition-all hover:-translate-y-px hover:border-seal/40"
          >
            <Play size={14} /> Study (SRS)
          </Link>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-muted shadow-paper transition-all hover:-translate-y-px hover:text-ink"
          >
            <Settings size={14} /> Settings
          </button>
        </div>
        <span className="text-xs text-muted">
          <span className="font-medium text-ink">{filtered.length.toLocaleString()}</span> words
          {hasMore && (
            <span className="text-muted/70"> · showing {shown.length.toLocaleString()}</span>
          )}
        </span>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {tab === "mixed" ? (
        <MixedHero />
      ) : !ready && entries.length === 0 && tab !== "saved" ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted shadow-paper">
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-seal-soft" />
          Loading the full dictionary…
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
          {tab === "saved"
            ? "No saved words yet. Tap a word in the Reader or Vocabulary to save it."
            : "No matches."}
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {shown.map((e) => (
            <li key={e.simplified}>
              <button
                type="button"
                onClick={() => setPopup(e)}
                className="group block w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-left shadow-paper transition-all duration-150 hover:-translate-y-0.5 hover:border-seal/30 hover:shadow-paper-md"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-cjk text-xl text-ink">{e.simplified}</span>
                  <span className="shrink-0 text-xs font-medium text-seal/80">{e.pinyin}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-sm text-muted group-hover:text-ink">
                  {e.definitions[0]}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                  <HskBadge level={e.hsk30 ?? e.hskLevel} />
                  {e.frequency !== undefined && <span>· #{e.frequency.toLocaleString()}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <div ref={sentinelRef} className="mt-6 flex justify-center py-6 text-xs text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-seal/60" />
            Loading more…
          </span>
        </div>
      ) : filtered.length > CHUNK_SIZE ? (
        <div className="mt-6 text-center text-xs text-muted">
          End of list · {filtered.length.toLocaleString()} words
        </div>
      ) : null}

      {popup && (
        <WordPopup
          text={popup.simplified}
          entry={popup}
          alreadySaved={savedSet.has(popup.simplified)}
          onClose={() => setPopup(null)}
          onSave={(entry) => {
            saveWord(entry);
            setPopup(null);
          }}
          onMarkKnown={(entry) => {
            markKnown(entry);
            setPopup(null);
          }}
        />
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: StudySettings;
  onChange: (patch: Partial<StudySettings>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="mb-4 rounded-2xl border border-line bg-surface p-4 shadow-paper"
      role="region"
      aria-label="Study session settings"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-seal">
            <Sparkles size={11} /> Study session
          </div>
          <p className="mt-0.5 text-xs italic text-muted">
            How many words each session pulls in. Reviews come from due
            words; new words are introduced from whichever deck you pick.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted hover:text-ink"
        >
          Hide
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Max new words"
          value={settings.maxNew}
          min={0}
          max={50}
          onChange={(n) => onChange({ maxNew: n })}
          help="Brand-new cards introduced per session."
        />
        <NumberField
          label="Max reviews"
          value={settings.maxReviews}
          min={0}
          max={200}
          onChange={(n) => onChange({ maxReviews: n })}
          help="Due cards pulled from the schedule each session."
        />
      </div>
    </div>
  );
}

function MixedHero() {
  return (
    <div
      className="rounded-2xl border border-line p-6 text-center shadow-paper"
      style={{
        background:
          "linear-gradient(140deg, color-mix(in srgb, var(--seal) 8%, var(--surface)) 0%, var(--paper-2) 60%, var(--surface) 100%)",
      }}
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-seal">
        Mixed deck
      </div>
      <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight text-ink">
        One session, every band.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm italic text-muted">
        Pulls every word that&apos;s due across the SRS schedule, your saved
        list, and new HSK words at your level — interleaved so you don&apos;t
        front-load reviews or new cards.
      </p>
      <div className="mt-4">
        <Link
          href="/vocabulary/study?deck=mixed"
          className="inline-flex items-center gap-1.5 rounded-full bg-seal px-4 py-2 text-sm font-medium text-white shadow-paper transition-all hover:-translate-y-px hover:shadow-paper-md"
        >
          <Play size={14} /> Start mixed session
        </Link>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (Number.isNaN(raw)) return;
          onChange(Math.max(min, Math.min(max, Math.round(raw))));
        }}
        className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-base font-medium text-ink shadow-paper transition-colors focus:border-seal/50 focus:outline-none focus:ring-2 focus:ring-seal/15"
      />
      {help && <span className="mt-1 block text-[11px] italic text-muted">{help}</span>}
    </label>
  );
}
