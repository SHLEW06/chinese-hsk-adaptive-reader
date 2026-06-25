import { get, set } from "idb-keyval";
import { _hydrateIndex, isFullDictionaryLoaded } from "./dictionary";
import type { WordEntry, WordReading } from "@/types/dictionary";

/** Compact wire format produced by build-dictionary.mjs */
interface CompactEntry {
  s: string;            // simplified
  p: string;            // pinyin
  d: string[];          // definitions
  t?: string;           // traditional
  r?: { p: string; d: string[] }[]; // readings
  h3?: number | "7-9";  // hsk30
  h2?: number;          // hsk20
  hl?: number;          // hskLevel (back-compat)
  f?: number;           // frequency
}

interface Meta {
  version: string;
  builtAt: string;
  entryCount: number;
  maxWordLen: number;
  source: string;
}

const IDB_KEY = "dict-cache";
const IDB_VERSION_KEY = "dict-version";

/** In-flight promise so we only load once. */
let _loadPromise: Promise<void> | null = null;

function expandEntry(c: CompactEntry): WordEntry {
  const entry: WordEntry = {
    simplified: c.s,
    pinyin: c.p,
    definitions: c.d,
  };
  if (c.t) entry.traditional = c.t;
  if (c.r) {
    entry.readings = c.r.map(
      (r): WordReading => ({ pinyin: r.p, definitions: r.d }),
    );
  }
  if (c.h3 !== undefined) entry.hsk30 = c.h3;
  if (c.h2 !== undefined) entry.hsk20 = c.h2;
  if (c.hl !== undefined) entry.hskLevel = c.hl;
  if (c.f !== undefined) entry.frequency = c.f;
  return entry;
}

/**
 * Load the full dictionary from public/dict/, cache in IndexedDB.
 * Safe to call multiple times — subsequent calls return the same promise.
 */
export function loadDictionary(): Promise<void> {
  if (isFullDictionaryLoaded()) return Promise.resolve();
  if (_loadPromise) return _loadPromise;

  _loadPromise = doLoad();
  return _loadPromise;
}

async function doLoad(): Promise<void> {
  try {
    // 1. Fetch meta.json to get the version
    const metaRes = await fetch("/dict/meta.json");
    if (!metaRes.ok) throw new Error(`meta.json: HTTP ${metaRes.status}`);
    const meta: Meta = await metaRes.json();

    // 2. Check IndexedDB cache
    const cachedVersion = await get<string>(IDB_VERSION_KEY).catch(() => null);
    if (cachedVersion === meta.version) {
      const cachedEntries = await get<WordEntry[]>(IDB_KEY).catch(() => null);
      if (cachedEntries && cachedEntries.length > 0) {
        _hydrateIndex(cachedEntries, meta.maxWordLen);
        return;
      }
    }

    // 3. Fetch the full dictionary
    const dictRes = await fetch("/dict/dictionary.min.json");
    if (!dictRes.ok) throw new Error(`dictionary.min.json: HTTP ${dictRes.status}`);
    const compact: CompactEntry[] = await dictRes.json();

    // 4. Expand to full WordEntry[]
    const entries = compact.map(expandEntry);

    // 5. Hydrate the in-memory index
    _hydrateIndex(entries, meta.maxWordLen);

    // 6. Cache in IndexedDB for next visit
    await set(IDB_KEY, entries).catch(() => {});
    await set(IDB_VERSION_KEY, meta.version).catch(() => {});
  } catch (err) {
    console.error("[loadDictionary] Failed to load full dictionary:", err);
    // The app keeps working on the seed — this is non-fatal.
    _loadPromise = null; // allow retry
  }
}
