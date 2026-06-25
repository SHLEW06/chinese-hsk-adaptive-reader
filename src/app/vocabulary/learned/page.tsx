"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  RotateCcw,
  Search,
  Square,
} from "lucide-react";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { getEntry } from "@/lib/dictionary/dictionary";
import { hskColor } from "@/lib/dictionary/hsk";
import { HskBadge } from "@/components/ui/Badge";
import {
  isLearned,
  loadSrsMap,
  resetSrs,
} from "@/lib/hsk-study/storage";
import { useAuth } from "@/components/auth/AuthProvider";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import type { SrsState } from "@/types/hskStudy";
import type { WordEntry } from "@/types/dictionary";
import type { SavedWord } from "@/types/savedWord";

interface LearnedRow {
  simplified: string;
  pinyin: string;
  definitions: string[];
  hskLevel?: number | "7-9";
  sourceSentence?: string;
  srs: SrsState;
}

export default function LearnedWordsPage() {
  const { ready, size } = useDictionary();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState<SavedWord[]>([]);
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void getStorageProvider(user)
      .getSavedWords()
      .then((words) => {
        if (!cancelled) setSaved(words);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const rows = useMemo<LearnedRow[]>(() => {
    const map = loadSrsMap();
    const savedBySimplified = new Map(saved.map((w) => [w.simplified, w]));

    const out: LearnedRow[] = [];
    for (const [simplified, srs] of Object.entries(map)) {
      if (!isLearned(srs)) continue;
      const entry: WordEntry | undefined = getEntry(simplified);
      const fallback = savedBySimplified.get(simplified);
      if (!entry && !fallback) continue;
      out.push({
        simplified,
        pinyin: entry?.pinyin ?? fallback?.pinyin ?? "",
        definitions: entry?.definitions ?? fallback?.definitions ?? [],
        hskLevel: entry?.hsk30 ?? entry?.hskLevel ?? fallback?.hskLevel,
        sourceSentence: fallback?.sourceSentence,
        srs,
      });
    }
    out.sort((a, b) => (b.srs.lastReviewed ?? "").localeCompare(a.srs.lastReviewed ?? ""));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, saved, ready, size]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (r.simplified.includes(q)) return true;
      if (r.pinyin.toLowerCase().includes(q)) return true;
      if (r.sourceSentence?.toLowerCase().includes(q)) return true;
      return r.definitions.some((d) => d.toLowerCase().includes(q));
    });
  }, [rows, query]);

  const toggleSelectMode = () => {
    setSelectMode((v) => {
      const next = !v;
      if (!next) setSelected(new Set());
      return next;
    });
  };

  const toggleOne = (simplified: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(simplified)) next.delete(simplified);
      else next.add(simplified);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((r) => r.simplified)));
  };

  const clearSelection = () => setSelected(new Set());

  const forget = (simplified: string) => {
    if (!confirm(`Push "${simplified}" back into review?`)) return;
    resetSrs(simplified);
    setVersion((v) => v + 1);
  };

  const forgetSelected = () => {
    const n = selected.size;
    if (n === 0) return;
    if (!confirm(`Push ${n} word${n === 1 ? "" : "s"} back into review?`)) return;
    for (const simplified of selected) resetSrs(simplified);
    setSelected(new Set());
    setSelectMode(false);
    setVersion((v) => v + 1);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:py-8">
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> Vocabulary
      </Link>

      <header className="mt-4 mb-6">
        <div
          className="text-[10.5px] uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
        >
          熟词 · Words you know
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Learned words
        </h1>
        <p className="mt-1 font-serif text-sm italic text-muted">
          Words that have moved past the weekly review interval. Anything here
          you can read at a glance — push one back if you start to forget it.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Chinese, pinyin, English, or source"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 pl-8 text-sm shadow-paper transition-colors focus:border-seal/50 focus:outline-none focus:ring-2 focus:ring-seal/15"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>
            <span className="font-medium text-ink">{rows.length.toLocaleString()}</span> learned
            {query && (
              <span className="text-muted/70">
                {" "}· {filtered.length.toLocaleString()} match
                {filtered.length === 1 ? "" : "es"}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={toggleSelectMode}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors ${
              selectMode
                ? "border-seal/50 bg-seal/10 text-seal"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
            aria-pressed={selectMode}
            disabled={rows.length === 0}
          >
            <CheckSquare size={12} /> {selectMode ? "Done" : "Select"}
          </button>
        </div>
      </div>

      {selectMode && (
        <div
          className="sticky top-2 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm shadow-paper"
          style={{
            background: "color-mix(in srgb, var(--surface) 92%, transparent)",
            backdropFilter: "blur(6px)",
            borderColor: "color-mix(in srgb, var(--seal) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 text-muted">
            <span className="font-medium text-ink">{selected.size}</span> selected
            <button
              type="button"
              onClick={selectAllVisible}
              className="rounded-md border border-line bg-paper px-2 py-0.5 text-[11.5px] text-ink hover:border-seal/40"
            >
              Select all visible
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selected.size === 0}
              className="rounded-md border border-line bg-paper px-2 py-0.5 text-[11.5px] text-muted disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <button
            type="button"
            onClick={forgetSelected}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-seal px-3 py-1 text-[12.5px] font-medium text-white shadow-paper disabled:opacity-40"
          >
            <RotateCcw size={12} /> Forget selected
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyHero ready={ready} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
          No matches.
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((row) => (
            <LearnedCard
              key={row.simplified}
              row={row}
              selectMode={selectMode}
              selected={selected.has(row.simplified)}
              onToggle={() => toggleOne(row.simplified)}
              onForget={forget}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LearnedCard({
  row,
  selectMode,
  selected,
  onToggle,
  onForget,
}: {
  row: LearnedRow;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onForget: (simplified: string) => void;
}) {
  const nextDue = row.srs.dueAt ? new Date(row.srs.dueAt) : null;
  const intervalLabel =
    row.srs.interval >= 30
      ? `${Math.round(row.srs.interval / 30)}mo`
      : row.srs.interval >= 7
        ? `${Math.round(row.srs.interval / 7)}w`
        : `${row.srs.interval}d`;
  const color = typeof row.hskLevel === "number"
    ? hskColor(row.hskLevel)
    : row.hskLevel === "7-9"
      ? hskColor("7-9")
      : "#9A9285";

  const handleClick = () => {
    if (selectMode) onToggle();
  };

  return (
    <li
      onClick={handleClick}
      className={`group rounded-xl border bg-surface px-3.5 py-3 shadow-paper transition-all ${
        selectMode ? "cursor-pointer" : ""
      } ${selected ? "border-seal/50 ring-2 ring-seal/20" : "border-line"}`}
    >
      <div className="flex items-start gap-2">
        {selectMode && (
          <span
            className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors"
            style={{
              borderColor: selected ? "var(--seal)" : "var(--line)",
              background: selected ? "var(--seal)" : "transparent",
              color: "white",
            }}
            aria-hidden="true"
          >
            {selected ? <Check size={11} /> : <Square size={11} className="opacity-0" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-cjk text-2xl text-ink">{row.simplified}</span>
            <span className="shrink-0 text-xs font-medium text-seal/80">{row.pinyin}</span>
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-muted">
            {row.definitions[0] ?? "—"}
          </div>
          {row.sourceSentence && (
            <div className="mt-2 line-clamp-2 border-l-2 pl-2 font-cjk text-[12.5px] italic text-muted"
              style={{ borderColor: "color-mix(in srgb, var(--celadon) 50%, transparent)" }}
            >
              <span className="not-italic font-serif text-[10.5px] uppercase tracking-[0.16em] text-celadon/80">
                First met
              </span>
              <span className="ml-1.5">“{row.sourceSentence}”</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
            <div className="flex items-center gap-2">
              {row.hskLevel !== undefined ? (
                <HskBadge level={row.hskLevel} />
              ) : (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ background: color }}
                >
                  custom
                </span>
              )}
              <span>· every ~{intervalLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {nextDue && (
                <span className="italic">due {nextDue.toLocaleDateString()}</span>
              )}
              {!selectMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onForget(row.simplified);
                  }}
                  aria-label={`Push ${row.simplified} back to review`}
                  className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 focus:opacity-100"
                >
                  <RotateCcw size={11} /> Forget
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyHero({ ready }: { ready: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
      {!ready ? (
        <>
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-seal-soft" />
          Loading dictionary…
        </>
      ) : (
        <>
          <p>
            No learned words yet. Study a deck or your saved list — words you
            recall well move here once they reach the weekly review interval.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/vocabulary"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-paper transition-all hover:-translate-y-px"
            >
              Pick a deck
            </Link>
            <Link
              href="/vocabulary/study?deck=saved"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-muted shadow-paper hover:text-ink"
            >
              Study saved words
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
