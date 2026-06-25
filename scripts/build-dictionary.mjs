#!/usr/bin/env node
/**
 * Parse CC-CEDICT + HSK vocabulary → public/dict/dictionary.min.json + meta.json
 *
 * Usage:  node scripts/build-dictionary.mjs
 *
 * Requires:  data-sources/cedict.txt  and  data-sources/hsk-complete.json
 *   (run  npm run fetch:dict-sources  first)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "data-sources");
const OUT = join(ROOT, "public", "dict");

// ────────────────────── Numbered pinyin → diacritic ──────────────────────

const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à", "a"],
  e: ["ē", "é", "ě", "è", "e"],
  i: ["ī", "í", "ǐ", "ì", "i"],
  o: ["ō", "ó", "ǒ", "ò", "o"],
  u: ["ū", "ú", "ǔ", "ù", "u"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
};

/**
 * Convert a single numbered-pinyin syllable like "han4" → "hàn".
 * Handles u: → ü, tone 5 (neutral) = no mark, capitalization.
 */
function convertSyllable(syl) {
  // Handle "u:" → "v" internally (CC-CEDICT convention for ü)
  let s = syl.replace(/u:/g, "v").replace(/U:/g, "V");
  const toneMatch = s.match(/([1-5])$/);
  if (!toneMatch) return syl; // no tone number → return as-is
  const tone = parseInt(toneMatch[1], 10);
  s = s.slice(0, -1); // strip tone digit

  if (tone === 5 || s.length === 0) {
    // neutral tone: just return without mark, but fix v→ü
    return s.replace(/v/g, "ü").replace(/V/g, "Ü");
  }

  const idx = tone - 1;
  const lower = s.toLowerCase();

  // Standard tone placement rules:
  // 1) If syllable contains "a" or "e", put mark on it
  // 2) If syllable contains "ou", put mark on "o"
  // 3) Otherwise put mark on the last vowel
  let markPos = -1;

  const aIdx = lower.indexOf("a");
  const eIdx = lower.indexOf("e");
  if (aIdx !== -1) {
    markPos = aIdx;
  } else if (eIdx !== -1) {
    markPos = eIdx;
  } else {
    const ouIdx = lower.indexOf("ou");
    if (ouIdx !== -1) {
      markPos = ouIdx; // mark on the "o"
    } else {
      // last vowel
      for (let i = lower.length - 1; i >= 0; i--) {
        if ("aiouev".includes(lower[i])) {
          markPos = i;
          break;
        }
      }
    }
  }

  if (markPos === -1) {
    // no vowel found (rare; e.g. "m2" → "m" with mark; handle gracefully)
    return s.replace(/v/g, "ü").replace(/V/g, "Ü");
  }

  const ch = lower[markPos];
  const base = ch === "v" ? "v" : ch;
  const marked = TONE_MARKS[base][idx];
  const isUpper = s[markPos] !== lower[markPos];
  const result =
    s.slice(0, markPos) +
    (isUpper ? marked.toUpperCase() : marked) +
    s.slice(markPos + 1);

  return result.replace(/v/g, "ü").replace(/V/g, "Ü");
}

/**
 * Convert a full numbered-pinyin string like "han4 zi4" → "hàn zì".
 * Handles multi-syllable entries separated by spaces.
 */
function numberedToDiacritic(pinyin) {
  return pinyin
    .split(/\s+/)
    .map(convertSyllable)
    .join(" ");
}

/**
 * Normalize a numbered pinyin string for comparison.
 * Lowercases, removes spaces, strips tone 5.
 */
function normalizePinyin(p) {
  return p
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/u:/g, "v")
    .replace(/5/g, "");
}

// ────────────────────── Parse CC-CEDICT ──────────────────────

const CEDICT_RE = /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.+)\/\s*$/;

function parseCedict(filePath) {
  const text = readFileSync(filePath, "utf-8");
  const lines = text.split("\n");
  /** @type {Map<string, Array<{traditional:string, simplified:string, pinyinNumbered:string, pinyin:string, defs:string[]}>>} */
  const entries = new Map();
  let parsed = 0;

  for (const line of lines) {
    if (line.startsWith("#") || line.trim() === "") continue;
    const m = line.match(CEDICT_RE);
    if (!m) continue;
    const [, traditional, simplified, pinyinRaw, defsRaw] = m;
    const defs = defsRaw
      .split("/")
      .map((d) => d.trim())
      .filter(Boolean);
    const pinyinNumbered = pinyinRaw;
    const pinyin = numberedToDiacritic(pinyinRaw);

    const entry = { traditional, simplified, pinyinNumbered, pinyin, defs };
    if (!entries.has(simplified)) {
      entries.set(simplified, [entry]);
    } else {
      entries.get(simplified).push(entry);
    }
    parsed++;
  }

  console.log(`  Parsed ${parsed} CC-CEDICT entries → ${entries.size} unique simplified forms`);
  return entries;
}

// ────────────────────── Parse HSK vocabulary ──────────────────────

/**
 * Parse "level" array from HSK data.
 * "new-1".."new-7" → hsk30:  1..6 or "7-9"
 * "old-1".."old-6" → hsk20:  1..6
 */
function parseHskLevels(levels) {
  let hsk30 = undefined;
  let hsk20 = undefined;
  for (const lv of levels) {
    if (lv.startsWith("new-")) {
      const n = parseInt(lv.slice(4), 10);
      if (n === 7) hsk30 = "7-9";
      else if (n >= 1 && n <= 6) hsk30 = n;
    } else if (lv.startsWith("old-")) {
      const n = parseInt(lv.slice(4), 10);
      if (n >= 1 && n <= 6) hsk20 = n;
    }
  }
  return { hsk30, hsk20 };
}

function loadHsk(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  /** @type {Map<string, {hsk30?:number|string, hsk20?:number, frequency?:number, meanings:string[], pinyinNumeric?:string}>} */
  const bySimplified = new Map();

  for (const item of raw) {
    const { hsk30, hsk20 } = parseHskLevels(item.level || []);
    const freq = item.frequency;
    // collect meanings from all forms
    const meanings = [];
    let pinyinNumeric = undefined;
    for (const form of item.forms || []) {
      if (form.meanings) meanings.push(...form.meanings);
      if (!pinyinNumeric && form.transcriptions?.numeric) {
        pinyinNumeric = form.transcriptions.numeric;
      }
    }

    const existing = bySimplified.get(item.simplified);
    if (!existing) {
      bySimplified.set(item.simplified, {
        hsk30,
        hsk20,
        frequency: freq,
        meanings,
        pinyinNumeric,
      });
    } else {
      // take the lower (easier) level when duplicated
      if (hsk30 !== undefined) {
        if (existing.hsk30 === undefined) existing.hsk30 = hsk30;
        else {
          const ex = existing.hsk30 === "7-9" ? 7 : existing.hsk30;
          const nw = hsk30 === "7-9" ? 7 : hsk30;
          if (nw < ex) existing.hsk30 = hsk30;
        }
      }
      if (hsk20 !== undefined) {
        if (existing.hsk20 === undefined) existing.hsk20 = hsk20;
        else if (hsk20 < existing.hsk20) existing.hsk20 = hsk20;
      }
      if (freq !== undefined && (existing.frequency === undefined || freq < existing.frequency)) {
        existing.frequency = freq;
      }
      existing.meanings.push(...meanings);
    }
  }

  console.log(`  Loaded ${raw.length} HSK entries → ${bySimplified.size} unique simplified forms`);
  return bySimplified;
}

// ────────────────────── Merge ──────────────────────

function merge(cedictMap, hskMap) {
  const result = [];

  for (const [simplified, cedictEntries] of cedictMap) {
    const primary = cedictEntries[0];

    // Deduplicate definitions across all readings
    const allDefs = new Set();
    for (const e of cedictEntries) {
      for (const d of e.defs) allDefs.add(d);
    }

    // Build readings array if there are multiple pronunciations
    let readings = undefined;
    if (cedictEntries.length > 1) {
      readings = cedictEntries.map((e) => ({
        pinyin: e.pinyin,
        definitions: e.defs,
      }));
    }

    const entry = {
      simplified,
      traditional: primary.traditional !== simplified ? primary.traditional : undefined,
      pinyin: primary.pinyin,
      definitions: [...allDefs],
      readings,
    };

    // Attach HSK data
    const hsk = hskMap.get(simplified);
    if (hsk) {
      if (hsk.hsk30 !== undefined) entry.hsk30 = hsk.hsk30;
      if (hsk.hsk20 !== undefined) entry.hsk20 = hsk.hsk20;
      if (hsk.frequency !== undefined) entry.frequency = hsk.frequency;

      // Fill in definitions from HSK if CC-CEDICT had none (shouldn't happen, but safety)
      if (entry.definitions.length === 0 && hsk.meanings.length > 0) {
        entry.definitions = [...new Set(hsk.meanings)];
      }
    }

    // Backward-compatible hskLevel: prefer hsk20, else map hsk30
    if (hsk) {
      if (hsk.hsk20 !== undefined) {
        entry.hskLevel = hsk.hsk20;
      } else if (hsk.hsk30 !== undefined) {
        entry.hskLevel = hsk.hsk30 === "7-9" ? 6 : hsk.hsk30;
      }
    }

    result.push(entry);
  }

  // Add HSK words that are missing from CC-CEDICT (very rare)
  let hskOnly = 0;
  for (const [simplified, hsk] of hskMap) {
    if (cedictMap.has(simplified)) continue;
    hskOnly++;
    const entry = {
      simplified,
      pinyin: hsk.pinyinNumeric ? numberedToDiacritic(hsk.pinyinNumeric) : "",
      definitions: [...new Set(hsk.meanings)],
    };
    if (hsk.hsk30 !== undefined) entry.hsk30 = hsk.hsk30;
    if (hsk.hsk20 !== undefined) entry.hsk20 = hsk.hsk20;
    if (hsk.frequency !== undefined) entry.frequency = hsk.frequency;
    if (hsk.hsk20 !== undefined) {
      entry.hskLevel = hsk.hsk20;
    } else if (hsk.hsk30 !== undefined) {
      entry.hskLevel = hsk.hsk30 === "7-9" ? 6 : hsk.hsk30;
    }
    result.push(entry);
  }

  if (hskOnly > 0) {
    console.log(`  Added ${hskOnly} HSK-only entries not in CC-CEDICT`);
  }

  return result;
}

// ────────────────────── Main ──────────────────────

async function main() {
  const cedictPath = join(DATA, "cedict.txt");
  const hskPath = join(DATA, "hsk-complete.json");

  if (!existsSync(cedictPath) || !existsSync(hskPath)) {
    console.error(
      "Missing source files. Run:  npm run fetch:dict-sources"
    );
    process.exit(1);
  }

  console.log("Building dictionary…\n");

  const cedictMap = parseCedict(cedictPath);
  const hskMap = loadHsk(hskPath);

  const entries = merge(cedictMap, hskMap);
  console.log(`\n  Merged: ${entries.length} total entries`);

  // Compute maxWordLen (capped at 12 for segmentation perf)
  let longestKey = 0;
  for (const e of entries) {
    if (e.simplified.length > longestKey) longestKey = e.simplified.length;
  }
  const maxWordLen = Math.min(longestKey, 12);
  console.log(`  Longest simplified key: ${longestKey} chars → maxWordLen capped at ${maxWordLen}`);

  // Strip undefined values for compact JSON
  const compact = entries.map((e) => {
    const out = {
      s: e.simplified,
      p: e.pinyin,
      d: e.definitions,
    };
    if (e.traditional) out.t = e.traditional;
    if (e.readings) out.r = e.readings.map((r) => ({ p: r.pinyin, d: r.definitions }));
    if (e.hsk30 !== undefined) out.h3 = e.hsk30;
    if (e.hsk20 !== undefined) out.h2 = e.hsk20;
    if (e.hskLevel !== undefined) out.hl = e.hskLevel;
    if (e.frequency !== undefined) out.f = e.frequency;
    return out;
  });

  await mkdir(OUT, { recursive: true });

  // Write dictionary.min.json
  const dictPath = join(OUT, "dictionary.min.json");
  writeFileSync(dictPath, JSON.stringify(compact));
  const sizeMB = (Buffer.byteLength(JSON.stringify(compact)) / 1024 / 1024).toFixed(2);
  console.log(`\n  Wrote ${dictPath} (${sizeMB} MB)`);

  // Write meta.json
  const meta = {
    version: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    builtAt: new Date().toISOString(),
    entryCount: entries.length,
    maxWordLen,
    source: "CC-CEDICT (CC-BY-SA 4.0) + complete-hsk-vocabulary",
  };
  const metaPath = join(OUT, "meta.json");
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`  Wrote ${metaPath}`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("build-dictionary failed:", err);
  process.exit(1);
});
