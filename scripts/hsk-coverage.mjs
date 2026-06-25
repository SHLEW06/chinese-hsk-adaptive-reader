#!/usr/bin/env node
/**
 * HSK coverage report for the library.
 *
 * Reads:
 *   data-sources/hsk-complete.json
 *   src/data/library/hsk{1..6}.json
 *
 * Writes:
 *   src/data/hskCoverageReport.json
 *
 * Coverage logic uses `newest-N` tags (HSK 3.0 9-level standard, exposing 1-6).
 * Distinguishes:
 *   - level-exclusive coverage: words newly introduced at that level
 *   - cumulative coverage:      all words from HSK 1 through that level
 *
 * Runs structural validation before computing coverage. Exits non-zero if any
 * required field is missing, ids/slugs collide, or a level has zero passages.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_SOURCES = join(ROOT, "data-sources");
const LIBRARY_DIR = join(ROOT, "src", "data", "library");
const OUT = join(ROOT, "src", "data", "hskCoverageReport.json");

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];
const REQUIRED_FIELDS = [
  "id",
  "slug",
  "titleZh",
  "titleEn",
  "hskLevel",
  "category",
  "sourceType",
  "difficulty",
  "summaryEn",
  "textZh",
];

function loadHskLevelSets(hskPath) {
  const raw = JSON.parse(readFileSync(hskPath, "utf-8"));
  // exclusive[N] = words tagged newest-N exactly at this level
  const exclusive = Object.fromEntries(HSK_LEVELS.map((l) => [l, new Set()]));
  for (const item of raw) {
    const levels = item.level || [];
    for (const lv of levels) {
      if (!lv.startsWith("newest-")) continue;
      const n = parseInt(lv.slice("newest-".length), 10);
      if (!HSK_LEVELS.includes(n)) continue;
      // A word tagged at multiple newest-N levels: assign it to the lowest.
      let alreadyLower = false;
      for (const lower of HSK_LEVELS) {
        if (lower >= n) break;
        if (exclusive[lower].has(item.simplified)) {
          alreadyLower = true;
          break;
        }
      }
      if (!alreadyLower) exclusive[n].add(item.simplified);
    }
  }
  // Cumulative[N] = union of exclusive[1..N]
  const cumulative = Object.fromEntries(HSK_LEVELS.map((l) => [l, new Set()]));
  for (const n of HSK_LEVELS) {
    for (const k of HSK_LEVELS) {
      if (k <= n) for (const w of exclusive[k]) cumulative[n].add(w);
    }
  }
  return { exclusive, cumulative };
}

function loadLibraryItems() {
  const items = [];
  for (const lvl of HSK_LEVELS) {
    const p = join(LIBRARY_DIR, `hsk${lvl}.json`);
    if (!existsSync(p)) continue;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(p, "utf-8"));
    } catch (err) {
      throw new Error(`Failed to parse ${p}: ${err.message}`);
    }
    if (!Array.isArray(parsed)) throw new Error(`${p} must export a JSON array`);
    for (const item of parsed) items.push(item);
  }
  return items;
}

function validate(items) {
  const issues = [];
  const ids = new Set();
  const slugs = new Set();
  const countByLevel = {};

  for (const item of items) {
    const id = item?.id ?? "(no-id)";
    for (const field of REQUIRED_FIELDS) {
      const v = item?.[field];
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
        issues.push(`${id}: missing required field "${field}"`);
      }
    }
    if (!(item.translation ?? "").trim() && !(item.translationEn ?? "").trim()) {
      issues.push(`${id}: requires translation or translationEn`);
    }
    if (item.id) {
      if (ids.has(item.id)) issues.push(`${id}: duplicate id`);
      ids.add(item.id);
    }
    if (item.slug) {
      if (slugs.has(item.slug)) issues.push(`${id}: duplicate slug "${item.slug}"`);
      slugs.add(item.slug);
    }
    if (!HSK_LEVELS.includes(item.hskLevel)) {
      issues.push(`${id}: hskLevel ${item.hskLevel} not in 1-6`);
    } else {
      countByLevel[item.hskLevel] = (countByLevel[item.hskLevel] ?? 0) + 1;
    }
    if (item.sourceType === "news_explainer" && !(item.factCheckNotes ?? "").trim()) {
      issues.push(`${id}: news_explainer requires factCheckNotes`);
    }
    if (Array.isArray(item.paragraphTranslations) && item.paragraphTranslations.length > 0) {
      const concat = item.paragraphTranslations.map((p) => p.zh).join("");
      if (concat.replace(/\s/g, "") !== (item.textZh ?? "").replace(/\s/g, "")) {
        issues.push(`${id}: paragraphTranslations zh does not concat to textZh`);
      }
    }
  }
  for (const lvl of HSK_LEVELS) {
    if (!countByLevel[lvl]) issues.push(`HSK ${lvl}: zero passages`);
  }
  return issues;
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    count++;
    from = idx + needle.length;
  }
  return count;
}

function buildLevelCoverage(levelSets, items) {
  const levels = [];
  // For each library item, also need: distinct word count, above-level words.
  // We compute "distinct words found" against the cumulative set for the item's HSK level.
  const passagesOut = [];

  for (const lvl of HSK_LEVELS) {
    const passagesAtLvl = items.filter((it) => it.hskLevel === lvl);

    // Exclusive coverage uses the level-exclusive HSK set.
    const exclusiveSet = levelSets.exclusive[lvl];
    const cumulativeSet = levelSets.cumulative[lvl];

    const exposure = {};
    for (const word of exclusiveSet) exposure[word] = 0;

    const cumulativeCovered = new Set();

    // Coverage is computed across ALL passages at this level (cumulative is also
    // checked against passages at this level — passages at lower levels already
    // contribute their words at their own level's accounting; we keep the
    // cumulative-here check focused on what this level's reading set covers).
    for (const passage of passagesAtLvl) {
      const text = passage.textZh ?? "";
      for (const word of exclusiveSet) {
        const c = countOccurrences(text, word);
        if (c > 0) exposure[word] += c;
      }
      for (const word of cumulativeSet) {
        if (text.includes(word)) cumulativeCovered.add(word);
      }
    }

    const exclusiveCovered = Object.values(exposure).filter((c) => c > 0).length;
    const exclusiveMissing = [...exclusiveSet].filter((w) => exposure[w] === 0);
    const cumulativeMissing = [...cumulativeSet].filter((w) => !cumulativeCovered.has(w));

    const single = Object.entries(exposure)
      .filter(([, c]) => c === 1)
      .map(([w]) => w);
    const overused = Object.entries(exposure)
      .filter(([, c]) => c >= 12)
      .map(([w, c]) => ({ word: w, count: c }))
      .sort((a, b) => b.count - a.count);

    levels.push({
      level: lvl,
      exclusiveTotal: exclusiveSet.size,
      exclusiveCovered,
      exclusiveCoveragePct:
        exclusiveSet.size === 0 ? 0 : Math.round((exclusiveCovered / exclusiveSet.size) * 1000) / 10,
      exclusiveMissing,
      cumulativeTotal: cumulativeSet.size,
      cumulativeCovered: cumulativeCovered.size,
      cumulativeCoveragePct:
        cumulativeSet.size === 0
          ? 0
          : Math.round((cumulativeCovered.size / cumulativeSet.size) * 1000) / 10,
      cumulativeMissing,
      exposureCounts: exposure,
      singleExposureWords: single,
      overusedWords: overused,
      passageCount: passagesAtLvl.length,
    });
  }

  for (const item of items) {
    const text = item.textZh ?? "";
    const cumulativeSet = levelSets.cumulative[item.hskLevel] ?? new Set();
    // distinct cumulative-set words found in this passage
    const distinct = new Set();
    for (const w of cumulativeSet) if (text.includes(w)) distinct.add(w);

    // above-level: HSK words whose newest-N tag is above this passage's level
    const aboveSet = new Set();
    for (const lvl of HSK_LEVELS) {
      if (lvl <= item.hskLevel) continue;
      for (const w of levelSets.exclusive[lvl]) if (text.includes(w)) aboveSet.add(w);
    }

    passagesOut.push({
      id: item.id,
      slug: item.slug,
      hskLevel: item.hskLevel,
      chars: text.length,
      distinctWords: distinct.size,
      aboveLevelWords: [...aboveSet].slice(0, 100),
    });
  }

  return { levels, passages: passagesOut };
}

function fmtPct(n) {
  return `${n.toFixed(1)}%`;
}

function main() {
  const hskPath = join(DATA_SOURCES, "hsk-complete.json");
  if (!existsSync(hskPath)) {
    console.error(`Missing ${hskPath}. Run: npm run fetch:dict-sources`);
    process.exit(1);
  }

  console.log("Loading HSK vocabulary…");
  const levelSets = loadHskLevelSets(hskPath);
  for (const lvl of HSK_LEVELS) {
    console.log(
      `  newest-${lvl}: ${levelSets.exclusive[lvl].size} exclusive · ${levelSets.cumulative[lvl].size} cumulative`,
    );
  }

  console.log("Loading library items…");
  const items = loadLibraryItems();
  console.log(`  ${items.length} passages across ${LIBRARY_DIR}`);

  console.log("Validating…");
  const issues = validate(items);
  if (issues.length) {
    console.error("\nValidation issues:");
    for (const i of issues) console.error(`  ✗ ${i}`);
    process.exit(1);
  }
  console.log("  OK");

  console.log("Computing coverage…");
  const { levels, passages } = buildLevelCoverage(levelSets, items);

  const report = {
    generatedAt: new Date().toISOString(),
    hskSystem: "newest-1..6",
    levels,
    passages,
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUT}`);

  console.log("\nCoverage summary:");
  console.log("  Level | Passages | Exclusive cov.  | Cumulative cov.");
  console.log("  ------+----------+-----------------+----------------");
  for (const l of levels) {
    const ex = `${l.exclusiveCovered}/${l.exclusiveTotal} (${fmtPct(l.exclusiveCoveragePct)})`;
    const cu = `${l.cumulativeCovered}/${l.cumulativeTotal} (${fmtPct(l.cumulativeCoveragePct)})`;
    console.log(
      `  HSK ${l.level} | ${String(l.passageCount).padStart(8)} | ${ex.padEnd(15)} | ${cu}`,
    );
  }

  console.log("\nDone.");
}

main();
