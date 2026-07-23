#!/usr/bin/env node
import { createWriteStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

import { buildFromPinnedInputs } from "./build-dictionary.mjs";
import { SOURCE_PINS, buildAuditSummary } from "./lib/dictionary-quality.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactJsonlGzPath = join(root, "artifacts", "dictionary-audit.full.jsonl.gz");
const baselinePath = join(root, "docs", "dictionary-audit-baseline.json");
const summaryPath = join(root, "docs", "dictionary-audit-summary.json");
const compactPath = join(root, "docs", "dictionary-audit-report.json");
const checkOnly = process.argv.includes("--check");

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertCurrent(path, expected) {
  if (!existsSync(path) || readFileSync(path, "utf8") !== expected) {
    throw new Error(`${path} is stale; run npm run audit:dict and inspect the report`);
  }
}

async function main() {
  const { entries, auditRecords, version } = buildFromPinnedInputs();
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const summary = buildAuditSummary(entries, auditRecords, {
    capturedAt: baseline.capturedAt,
    baselineCommit: baseline.baselineCommit,
    dictionarySha256: baseline.dictionarySha256,
    totals: baseline.totals,
  });
  const report = {
    schemaVersion: 1,
    dictionaryVersion: version,
    sourcePins: SOURCE_PINS,
    entries: auditRecords.filter(
      (record) =>
        record.definitionSource === "curated" ||
        Boolean(record.rationale) ||
        (Number.isInteger(record.hskLevel) &&
          record.hskLevel >= 1 &&
          record.hskLevel <= 6 &&
          record.status === "unresolved"),
    ),
  };
  const summaryJson = stableJson(summary);
  const compactJson = stableJson(report);

  if (checkOnly) {
    assertCurrent(summaryPath, summaryJson);
    assertCurrent(compactPath, compactJson);
    console.log("Dictionary audit reports are deterministic and current.");
    return;
  }

  await mkdir(dirname(artifactJsonlGzPath), { recursive: true });
  const gzip = createGzip({ level: 9 });
  const artifact = createWriteStream(artifactJsonlGzPath);
  gzip.pipe(artifact);
  gzip.write(`${JSON.stringify({ schemaVersion: 1, dictionaryVersion: version })}\n`);
  for (const record of auditRecords) gzip.write(`${JSON.stringify(record)}\n`);
  gzip.end();
  await once(artifact, "finish");
  writeFileSync(summaryPath, summaryJson);
  writeFileSync(compactPath, compactJson);
  console.log(`Audited ${entries.length.toLocaleString()} entries.`);
  console.log(`Unresolved: ${summary.totals.unresolved.toLocaleString()}`);
  console.log(`Full local compressed JSONL report: ${artifactJsonlGzPath}`);
  console.log(`Compact tracked report: ${compactPath}`);
}

main().catch((error) => {
  console.error("audit-dictionary failed:", error);
  process.exit(1);
});
