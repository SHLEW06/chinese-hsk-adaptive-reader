#!/usr/bin/env node
/**
 * Download raw dictionary sources into data-sources/.
 *   - CC-CEDICT .txt.gz → data-sources/cedict.txt
 *   - complete-hsk-vocabulary complete.json → data-sources/hsk-complete.json
 *
 * Usage:  node scripts/fetch-dict-sources.mjs [--force]
 */
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data-sources");

const CEDICT_URL =
  "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";
const HSK_URL =
  "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json";

const force = process.argv.includes("--force");

async function download(url, dest, label) {
  if (!force && existsSync(dest)) {
    console.log(`  [skip] ${label} already exists at ${dest}`);
    return;
  }
  console.log(`  [download] ${label} → ${dest}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return { res, dest };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("Fetching dictionary sources…\n");

  // --- CC-CEDICT (gzipped) ---
  const cedictDest = join(OUT_DIR, "cedict.txt");
  const cedictResult = await download(CEDICT_URL, cedictDest, "CC-CEDICT");
  if (cedictResult) {
    const { res } = cedictResult;
    const gunzip = createGunzip();
    const fileStream = createWriteStream(cedictDest);
    // res.body is a ReadableStream (web); convert to Node readable
    const { Readable } = await import("node:stream");
    const nodeReadable = Readable.fromWeb(res.body);
    await pipeline(nodeReadable, gunzip, fileStream);
    console.log("  [done] CC-CEDICT decompressed\n");
  }

  // --- HSK complete.json ---
  const hskDest = join(OUT_DIR, "hsk-complete.json");
  const hskResult = await download(HSK_URL, hskDest, "HSK complete.json");
  if (hskResult) {
    const { res } = hskResult;
    const fileStream = createWriteStream(hskDest);
    const { Readable } = await import("node:stream");
    const nodeReadable = Readable.fromWeb(res.body);
    await pipeline(nodeReadable, fileStream);
    console.log("  [done] HSK complete.json saved\n");
  }

  console.log("All sources ready in data-sources/.");
}

main().catch((err) => {
  console.error("fetch-dict-sources failed:", err);
  process.exit(1);
});
