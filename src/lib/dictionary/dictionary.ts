import { sampleDictionary } from "@/data/sampleDictionary";
import { hsk1Glossary } from "@/data/hsk1Glossary";
import { hsk2Glossary } from "@/data/hsk2Glossary";
import { hsk3Glossary } from "@/data/hsk3Glossary";
import { hsk4Glossary } from "@/data/hsk4Glossary";
import { hsk5Glossary } from "@/data/hsk5Glossary";
import { hsk6Glossary } from "@/data/hsk6Glossary";
import type { WordEntry } from "@/types/dictionary";

/**
 * Mutable module-level dictionary index.
 * Starts seeded from sampleDictionary; replaced when the full dictionary loads.
 */
const _index = new Map<string, WordEntry>();

/** Current max word length for segmentation lookups. */
let _maxWordLen = 1;

/** Whether the full dictionary has been loaded. */
let _fullLoaded = false;

/** Callbacks waiting for the full dictionary. */
const _readyCallbacks: Array<() => void> = [];

// ── Seed from the compact base dictionary plus library-level glossaries ──
//
// A reader should never need to wait for the full 12 MB dictionary just to
// see a complete explanation for a completed library level. The first source
// wins so hand-curated base definitions remain preferred where sources overlap.
for (const entry of [
  ...sampleDictionary,
  ...hsk1Glossary,
  ...hsk2Glossary,
  ...hsk3Glossary,
  ...hsk4Glossary,
  ...hsk5Glossary,
  ...hsk6Glossary,
]) {
  if (!_index.has(entry.simplified)) {
    _index.set(entry.simplified, entry);
  }
}
_maxWordLen = 1;
for (const key of _index.keys()) {
  if (key.length > _maxWordLen) _maxWordLen = key.length;
}

// ── Public API ──

/** Look up a single word by its simplified form. */
export function getEntry(word: string): WordEntry | undefined {
  return _index.get(word);
}

/** Current maximum word length in the index. */
export function getMaxWordLen(): number {
  return _maxWordLen;
}

/** Number of entries in the current index. */
export function dictionarySize(): number {
  return _index.size;
}

/** Whether the full CC-CEDICT dictionary has been loaded. */
export function isFullDictionaryLoaded(): boolean {
  return _fullLoaded;
}

/**
 * Replace the seed index with the full dictionary entries.
 * Called by loadDictionary once the data is ready.
 */
export function _hydrateIndex(entries: WordEntry[], maxWordLen: number): void {
  _index.clear();
  for (const entry of entries) {
    if (!_index.has(entry.simplified)) {
      _index.set(entry.simplified, entry);
    }
  }
  _maxWordLen = maxWordLen;
  _fullLoaded = true;

  // Notify all subscribers
  for (const cb of _readyCallbacks) cb();
  _readyCallbacks.length = 0;
}

/**
 * Subscribe to be notified when the full dictionary is ready.
 * If already loaded, callback fires immediately.
 * Returns an unsubscribe function.
 */
export function subscribeDictionaryReady(cb: () => void): () => void {
  if (_fullLoaded) {
    cb();
    return () => {};
  }
  _readyCallbacks.push(cb);
  return () => {
    const idx = _readyCallbacks.indexOf(cb);
    if (idx !== -1) _readyCallbacks.splice(idx, 1);
  };
}

// ── Query helpers ──

const TONE_MAP: Record<string, string> = {
  ā: "a", á: "a", ǎ: "a", à: "a",
  ē: "e", é: "e", ě: "e", è: "e",
  ī: "i", í: "i", ǐ: "i", ì: "i",
  ō: "o", ó: "o", ǒ: "o", ò: "o",
  ū: "u", ú: "u", ǔ: "u", ù: "u",
  ǖ: "u", ǘ: "u", ǚ: "u", ǜ: "u",
  ü: "u",
};

function stripTones(s: string): string {
  let out = "";
  for (const ch of s) out += TONE_MAP[ch] ?? ch;
  return out.toLowerCase();
}

/** Iterate every entry currently in the index. */
export function getAllEntries(): WordEntry[] {
  return Array.from(_index.values());
}

/** All entries tagged at this HSK level (prefers hsk30, falls back to legacy hskLevel). */
export function getByHskLevel(level: number | "7-9"): WordEntry[] {
  const out: WordEntry[] = [];
  for (const e of _index.values()) {
    const lvl = e.hsk30 ?? e.hskLevel;
    if (lvl === level) out.push(e);
  }
  out.sort((a, b) => {
    const fa = a.frequency ?? Number.POSITIVE_INFINITY;
    const fb = b.frequency ?? Number.POSITIVE_INFINITY;
    if (fa !== fb) return fa - fb;
    return a.simplified.localeCompare(b.simplified);
  });
  return out;
}

/** Frequent words that are not in any HSK list, ordered by frequency. */
export function getCommonNonHsk(limit = 5000): WordEntry[] {
  const out: WordEntry[] = [];
  for (const e of _index.values()) {
    const lvl = e.hsk30 ?? e.hskLevel ?? e.hsk20;
    if (lvl === undefined && e.frequency !== undefined) out.push(e);
  }
  out.sort((a, b) => (a.frequency ?? 1e9) - (b.frequency ?? 1e9));
  return out.slice(0, limit);
}

export interface SearchEntriesOptions {
  limit?: number;
}

/**
 * Search the full dictionary. Auto-detects:
 *  - Chinese characters → prefix match on simplified (then traditional)
 *  - Latin input → tone-insensitive pinyin prefix, then English substring
 */
export function searchEntries(query: string, opts: SearchEntriesOptions = {}): WordEntry[] {
  const q = query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 100;
  const looksChinese = /[一-鿿]/.test(q);
  const seen = new Set<string>();
  const out: WordEntry[] = [];

  const push = (e: WordEntry) => {
    if (out.length >= limit || seen.has(e.simplified)) return;
    seen.add(e.simplified);
    out.push(e);
  };

  if (looksChinese) {
    for (const e of _index.values()) {
      if (out.length >= limit) break;
      if (e.simplified.startsWith(q)) push(e);
    }
    if (out.length < limit) {
      for (const e of _index.values()) {
        if (out.length >= limit) break;
        if (e.traditional && e.traditional.startsWith(q)) push(e);
      }
    }
  } else {
    const qLower = q.toLowerCase();
    const qPinyin = stripTones(qLower).replace(/\s+/g, "");
    if (qPinyin.length > 0) {
      for (const e of _index.values()) {
        if (out.length >= limit) break;
        const pin = stripTones(e.pinyin).replace(/\s+/g, "");
        if (pin.startsWith(qPinyin)) push(e);
      }
    }
    if (out.length < limit) {
      for (const e of _index.values()) {
        if (out.length >= limit) break;
        if (e.definitions.some((d) => d.toLowerCase().includes(qLower))) push(e);
      }
    }
  }

  return out;
}
