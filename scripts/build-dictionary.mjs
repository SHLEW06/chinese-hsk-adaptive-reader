#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SOURCE_PINS,
  buildDictionary,
  compactEntry,
  deterministicVersion,
  parseCedictText,
  parseHskData,
  sha256,
} from "./lib/dictionary-quality.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = join(root, "data-sources");
const outputDirectory = join(root, "public", "dict");
const cedictPath = join(dataDirectory, "cedict.txt");
const hskPath = join(dataDirectory, "hsk-complete.json");
const overridesPath = join(root, "scripts", "dictionary-overrides.json");
const manualReviewsPath = join(root, "scripts", "dictionary-manual-reviews.json");

function readInputs() {
  for (const path of [cedictPath, hskPath, overridesPath]) {
    if (!existsSync(path)) throw new Error(`Missing dictionary input: ${path}`);
  }
  const cedictText = readFileSync(cedictPath, "utf8");
  const hskText = readFileSync(hskPath, "utf8");
  const overridesText = readFileSync(overridesPath, "utf8");
  const manualReviewsText = existsSync(manualReviewsPath)
    ? readFileSync(manualReviewsPath, "utf8")
    : "[]";

  const cedictHash = sha256(cedictText);
  const hskHash = sha256(hskText);
  if (cedictHash !== SOURCE_PINS.cedict.sha256) {
    throw new Error(`CC-CEDICT hash mismatch: expected ${SOURCE_PINS.cedict.sha256}, got ${cedictHash}`);
  }
  if (hskHash !== SOURCE_PINS.hsk.sha256) {
    throw new Error(`HSK hash mismatch: expected ${SOURCE_PINS.hsk.sha256}, got ${hskHash}`);
  }
  return { cedictText, hskText, overridesText, manualReviewsText };
}

export function buildFromPinnedInputs() {
  const input = readInputs();
  const cedictMap = parseCedictText(input.cedictText);
  const hskMap = parseHskData(JSON.parse(input.hskText));
  const overrides = JSON.parse(input.overridesText);
  const manualReviews = JSON.parse(input.manualReviewsText);
  const built = buildDictionary({ cedictMap, hskMap, overrides, manualReviews });
  return {
    ...built,
    sourceCounts: { cedict: cedictMap.size, hsk: hskMap.size },
    version: deterministicVersion(
      input.cedictText,
      input.hskText,
      input.overridesText,
      input.manualReviewsText,
    ),
  };
}

async function main() {
  console.log("Building pronunciation-aware dictionary from pinned sources...\n");
  const { entries, sourceCounts, version } = buildFromPinnedInputs();
  const compact = entries.map(compactEntry);
  const dictionaryJson = JSON.stringify(compact);
  const maxWordLen = Math.min(
    entries.reduce((longest, entry) => Math.max(longest, entry.simplified.length), 0),
    12,
  );

  await mkdir(outputDirectory, { recursive: true });
  const dictionaryPath = join(outputDirectory, "dictionary.min.json");
  writeFileSync(dictionaryPath, dictionaryJson);
  writeFileSync(
    join(outputDirectory, "meta.json"),
    `${JSON.stringify(
      {
        version,
        builtAt: SOURCE_PINS.cedict.releasedAt,
        entryCount: entries.length,
        maxWordLen,
        source: "CC-CEDICT (CC-BY-SA 4.0) + complete-hsk-vocabulary (MIT)",
        sourcePins: SOURCE_PINS,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`  CC-CEDICT forms: ${sourceCounts.cedict.toLocaleString()}`);
  console.log(`  HSK forms: ${sourceCounts.hsk.toLocaleString()}`);
  console.log(`  Generated entries: ${entries.length.toLocaleString()}`);
  console.log(`  Dictionary version: ${version}`);
  console.log(`  Output size: ${(Buffer.byteLength(dictionaryJson) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Max segmentation length: ${maxWordLen}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("build-dictionary failed:", error);
    process.exit(1);
  });
}
