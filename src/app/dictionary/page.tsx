"use client";

import {
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { HskBadge } from "@/components/ui/Badge";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { searchEntries } from "@/lib/dictionary/dictionary";
import type { WordEntry } from "@/types/dictionary";

function DictionarySearch() {
  const { ready, size } = useDictionary();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  // Defer the heavy search so typing stays interactive even on 121k entries.
  const deferredQuery = useDeferredValue(debounced);

  const syncUrl = (value: string) => {
    const current = searchParams.get("q") ?? "";
    if (value === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(
      `/dictionary${params.toString() ? `?${params.toString()}` : ""}`,
      { scroll: false },
    );
  };

  const results: WordEntry[] = useMemo(() => {
    if (!deferredQuery) return [];
    return searchEntries(deferredQuery, { limit: 200 });
  }, [deferredQuery, ready]);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-4 py-6 pb-24 sm:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dictionary</h1>
        <p className="mt-1 text-sm text-muted">
          Search by Chinese, pinyin (tones optional), or English.{" "}
          {!ready ? (
            <span className="inline-flex items-center gap-1 italic text-seal/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-seal/70" />
              Loading full dictionary…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-celadon">
              <span className="h-1.5 w-1.5 rounded-full bg-celadon" />
              {size.toLocaleString()} words available
            </span>
          )}
        </p>
      </header>

      <div className="sticky top-[60px] z-10 -mx-4 mb-5 bg-paper/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => syncUrl(query)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setDebounced(query);
                syncUrl(query);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="e.g. 学习 · xuexi · to study"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-3 text-base shadow-paper transition-all focus:border-seal/40 focus:outline-none focus:ring-2 focus:ring-seal/15"
          />
        </div>
      </div>

      {!debounced && (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center shadow-paper">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-seal-soft text-seal">
            <Search size={20} />
          </div>
          <div className="text-sm font-medium text-ink">
            Search the full CC-CEDICT dictionary
          </div>
          <div className="mt-1 text-xs text-muted">
            Try{" "}
            <button onClick={() => setQuery("学习")} className="font-cjk text-seal hover:underline">
              学习
            </button>
            ,{" "}
            <button onClick={() => setQuery("xuexi")} className="text-seal hover:underline">
              xuexi
            </button>
            , or{" "}
            <button onClick={() => setQuery("to study")} className="text-seal hover:underline">
              to study
            </button>
          </div>
        </div>
      )}

      {debounced && results.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted shadow-paper">
          No results for{" "}
          <span className="font-cjk text-ink">&ldquo;{debounced}&rdquo;</span>.
          {!ready && (
            <div className="mt-1 italic">
              Dictionary is still loading — try again in a moment.
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="mb-2 text-xs text-muted">
            <span className="font-medium text-ink">{results.length}</span> result
            {results.length === 1 ? "" : "s"}
            {results.length === 200 && " (showing first 200)"}
          </div>
          <ul className="space-y-2.5">
            {results.map((e) => (
              <li
                key={e.simplified}
                className="rounded-xl border border-line bg-surface p-4 shadow-paper transition-all hover:-translate-y-0.5 hover:border-seal/30 hover:shadow-paper-md"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-cjk text-2xl text-ink">{e.simplified}</span>
                  {e.traditional && e.traditional !== e.simplified && (
                    <span className="font-cjk text-base text-muted">{e.traditional}</span>
                  )}
                  <span className="text-sm font-medium text-seal/85">{e.pinyin}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <HskBadge level={e.hsk30 ?? e.hskLevel} />
                    {e.frequency !== undefined && (
                      <span className="text-[11px] text-muted">
                        #{e.frequency.toLocaleString()}
                      </span>
                    )}
                  </span>
                </div>
                <ol className="mt-2.5 space-y-1 text-sm text-ink">
                  {e.definitions.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-0.5 shrink-0 text-seal/50">{i + 1}.</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ol>
                {e.readings && e.readings.length > 0 && (
                  <div className="mt-3 border-t border-line/70 pt-2.5 text-xs text-muted">
                    <div className="mb-1 font-semibold uppercase tracking-wide text-seal/80">
                      Other readings
                    </div>
                    <ul className="space-y-0.5">
                      {e.readings.map((r, i) => (
                        <li key={i}>
                          <span className="font-medium text-ink">{r.pinyin}</span> — {r.definitions.join("; ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
      <DictionarySearch />
    </Suspense>
  );
}
