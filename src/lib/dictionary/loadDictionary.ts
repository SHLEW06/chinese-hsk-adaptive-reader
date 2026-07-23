import { get, set } from "idb-keyval";
import { _hydrateIndex, isFullDictionaryLoaded } from "./dictionary";
import type {
  DefinitionConfidence,
  DefinitionSource,
  ManualReviewStatus,
  WordEntry,
  WordReading,
} from "@/types/dictionary";

/** Compact wire format produced by build-dictionary.mjs */
interface CompactEntry {
  s: string;            // simplified
  p: string;            // pinyin
  pr?: string;          // primary reading (omitted when identical to p)
  g?: string;           // primary learner gloss (legacy artifacts omit it)
  a?: string[];         // accepted learner glosses
  d: string[];          // definitions
  t?: string;           // traditional
  r?: { p: string; g?: string; a?: string[]; d: string[]; s?: DefinitionSource }[];
  ds?: DefinitionSource;
  dc?: DefinitionConfidence;
  mr?: ManualReviewStatus;
  af?: string[];
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

export function expandCompactEntry(c: CompactEntry): WordEntry {
  const entry: WordEntry = {
    simplified: c.s,
    pinyin: c.p,
    primaryReading: c.pr ?? c.p,
    primaryGloss: c.g ?? c.d[0]?.trim() ?? "",
    acceptedGlosses: c.a ?? (c.g || c.d[0] ? [c.g ?? c.d[0]] : []),
    definitions: c.d,
    secondaryDefinitions: c.d.filter(
      (definition) => definition.trim().toLowerCase() !== (c.g ?? c.d[0] ?? "").trim().toLowerCase(),
    ),
  };
  if (c.t) entry.traditional = c.t;
  if (c.r) {
    entry.readings = c.r.map(
      (r): WordReading => ({
        pinyin: r.p,
        primaryGloss: r.g ?? r.d[0]?.trim() ?? "",
        acceptedGlosses: r.a ?? (r.g || r.d[0] ? [r.g ?? r.d[0]] : []),
        definitions: r.d,
        source: r.s,
      }),
    );
  }
  if (c.ds) entry.definitionSource = c.ds;
  if (c.dc) entry.definitionConfidence = c.dc;
  if (c.mr) entry.manualReviewStatus = c.mr;
  if (c.af) entry.auditFlags = c.af;
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
    const entries = compact.map(expandCompactEntry);

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
