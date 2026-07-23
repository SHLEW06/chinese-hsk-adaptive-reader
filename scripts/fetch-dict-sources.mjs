#!/usr/bin/env node
/** Materialize and verify the immutable dictionary inputs in data-sources/. */
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { SOURCE_PINS, sha256 } from "./lib/dictionary-quality.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(root, "data-sources");
const cedictArchivePath = join(root, "data-pins", "cedict-2026-07-13.txt.gz");
const cedictPath = join(outputDirectory, "cedict.txt");
const hskPath = join(outputDirectory, "hsk-complete.json");
const hskUrl =
  `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/${SOURCE_PINS.hsk.commit}/complete.json`;
const force = process.argv.includes("--force");
const checkOnly = process.argv.includes("--check");

function verifyBytes(bytes, expected, label) {
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(`${label} SHA-256 mismatch: expected ${expected}, got ${actual}`);
  }
}

function verifyFile(path, expected, label) {
  if (!existsSync(path)) throw new Error(`${label} is missing at ${path}`);
  verifyBytes(readFileSync(path), expected, label);
}

function writeAtomic(path, bytes) {
  const temporaryPath = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temporaryPath, bytes);
    renameSync(temporaryPath, path);
  } finally {
    if (existsSync(temporaryPath)) rmSync(temporaryPath);
  }
}

function materializeCedict() {
  if (!existsSync(cedictArchivePath)) {
    throw new Error(`Pinned CC-CEDICT archive is missing: ${cedictArchivePath}`);
  }
  const archive = readFileSync(cedictArchivePath);
  if (SOURCE_PINS.cedict.archiveSha256) {
    verifyBytes(archive, SOURCE_PINS.cedict.archiveSha256, "CC-CEDICT archive");
  }
  const text = gunzipSync(archive);
  verifyBytes(text, SOURCE_PINS.cedict.sha256, "CC-CEDICT snapshot");
  writeAtomic(cedictPath, text);
  console.log("  [materialized] pinned CC-CEDICT 2026-07-13 snapshot");
}

async function materializeHsk() {
  const response = await fetch(hskUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${hskUrl}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  verifyBytes(bytes, SOURCE_PINS.hsk.sha256, "HSK source");
  writeAtomic(hskPath, bytes);
  console.log(`  [downloaded] HSK source at commit ${SOURCE_PINS.hsk.commit.slice(0, 12)}`);
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });

  if (checkOnly) {
    verifyFile(cedictPath, SOURCE_PINS.cedict.sha256, "CC-CEDICT source");
    verifyFile(hskPath, SOURCE_PINS.hsk.sha256, "HSK source");
    const archive = readFileSync(cedictArchivePath);
    if (SOURCE_PINS.cedict.archiveSha256) {
      verifyBytes(archive, SOURCE_PINS.cedict.archiveSha256, "CC-CEDICT archive");
    }
    verifyBytes(gunzipSync(archive), SOURCE_PINS.cedict.sha256, "CC-CEDICT archive contents");
    console.log("Pinned dictionary sources are present and hash-verified.");
    return;
  }

  if (force || !existsSync(cedictPath)) materializeCedict();
  else verifyFile(cedictPath, SOURCE_PINS.cedict.sha256, "CC-CEDICT source");

  if (force || !existsSync(hskPath)) await materializeHsk();
  else verifyFile(hskPath, SOURCE_PINS.hsk.sha256, "HSK source");

  console.log("All dictionary sources match their pinned revisions.");
}

main().catch((error) => {
  console.error("fetch-dict-sources failed:", error);
  process.exit(1);
});
