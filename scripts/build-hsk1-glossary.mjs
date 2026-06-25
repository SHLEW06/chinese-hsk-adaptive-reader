import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const levelIndex = process.argv.indexOf("--level");
const level = levelIndex >= 0 ? Number(process.argv[levelIndex + 1]) : 1;
if (!Number.isInteger(level) || level < 1 || level > 6) {
  console.error("Pass --level with an HSK level from 1 to 6.");
  process.exit(1);
}

const sourcePath = path.join(root, "src", "data", "library", `hsk${level}.json`);
const dictionaryPath = path.join(root, "public", "dict", "dictionary.min.json");
const outputPath = path.join(root, "src", "data", `hsk${level}Glossary.ts`);
const checkOnly = process.argv.includes("--check");

const HAN = /[\u3400-\u9fff]/u;
const MAX_WORD_LENGTH = 8;
const ENDERS = "。！？!?；;…";
const OPEN_TO_CLOSE = {
  "《": "》",
  "〈": "〉",
  "（": "）",
  "【": "】",
  "[": "]",
  "(": ")",
  "“": "”",
  "‘": "’",
  "「": "」",
  "『": "』",
};

const items = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf8"));

// Some readings use personal names. Treating them as individual characters
// makes an otherwise complete word breakdown misleading.
const CONTEXTUAL_ENTRIES = [
  {
    s: "小王",
    t: "小王",
    p: "Xiǎo Wáng",
    d: ["Xiao Wang (a personal name)"],
  },
  {
    s: "小张",
    t: "小張",
    p: "Xiǎo Zhāng",
    d: ["Xiao Zhang (a personal name)"],
  },
  {
    s: "小李",
    t: "小李",
    p: "Xiǎo Lǐ",
    d: ["Xiao Li (a personal name)"],
  },
  {
    s: "安娜",
    t: "安娜",
    p: "Ān Nà",
    d: ["Anna (a personal name)"],
  },
  {
    s: "小明",
    t: "小明",
    p: "Xiǎo Míng",
    d: ["Xiao Ming (a personal name)"],
  },
  {
    s: "得",
    t: "得",
    p: "de",
    d: ["structural particle linking a verb to its complement"],
  },
];

function splitSentences(text) {
  const sentences = [];
  const closingStack = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const closing = OPEN_TO_CLOSE[char];
    if (closing) {
      closingStack.push(closing);
      continue;
    }
    if (closingStack.at(-1) === char) {
      closingStack.pop();
      continue;
    }
    if (!ENDERS.includes(char) || closingStack.length > 0) continue;

    let end = i + 1;
    while (end < text.length && ENDERS.includes(text[end])) end += 1;
    const sentence = text.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
    i = end - 1;
  }

  const remainder = text.slice(start).trim();
  if (remainder) sentences.push(remainder);
  return sentences;
}

function compact(text) {
  return text.replace(/\s/gu, "");
}

function validateLibraryLevel() {
  const issues = [];
  const ids = new Set();
  const slugs = new Set();

  for (const item of items) {
    if (item.hskLevel !== level) issues.push(`${item.id}: hskLevel must be ${level}`);
    for (const key of ["id", "slug", "titleZh", "titleEn", "summaryEn", "textZh", "translationEn"]) {
      if (typeof item[key] !== "string" || !item[key].trim()) {
        issues.push(`${item.id || "unknown"}: missing ${key}`);
      }
    }
    if (ids.has(item.id)) issues.push(`${item.id}: duplicate id`);
    if (slugs.has(item.slug)) issues.push(`${item.id}: duplicate slug ${item.slug}`);
    ids.add(item.id);
    slugs.add(item.slug);

    const sourceSentences = splitSentences(item.textZh);
    const explanations = new Map(
      (item.sentenceExplanations ?? []).map((entry) => [entry.zh, entry]),
    );
    for (const sentence of sourceSentences) {
      const explanation = explanations.get(sentence);
      if (!explanation) {
        issues.push(`${item.id}: no explanation for ${sentence}`);
        continue;
      }
      if (!explanation.en?.trim()) {
        issues.push(`${item.id}: explanation has no English for ${sentence}`);
      }
      if (!explanation.naturalMeaning?.trim()) {
        issues.push(`${item.id}: explanation has no natural meaning for ${sentence}`);
      }
    }

    const paragraphText = (item.paragraphTranslations ?? []).map((paragraph) => paragraph.zh).join("");
    if (compact(paragraphText) !== compact(item.textZh)) {
      issues.push(`${item.id}: paragraph translations do not align with textZh`);
    }
    for (const paragraph of item.paragraphTranslations ?? []) {
      if (!paragraph.en?.trim()) issues.push(`${item.id}: paragraph has no English`);
    }

    if (!item.comprehensionQuestions?.length) {
      issues.push(`${item.id}: no comprehension questions`);
    }
    for (const question of item.comprehensionQuestions ?? []) {
      if (!question.questionZh?.trim() || !question.questionEn?.trim()) {
        issues.push(`${item.id}: incomplete comprehension question`);
      }
      if (!(question.answerEn ?? question.answer)?.trim() || !question.explanationEn?.trim()) {
        issues.push(`${item.id}: incomplete comprehension answer`);
      }
    }
  }

  if (issues.length > 0) {
    console.error(`HSK ${level} library integrity check failed with ${issues.length} issue(s):`);
    console.error(issues.slice(0, 50).join("\n"));
    process.exit(1);
  }
}

validateLibraryLevel();

/** The compact dictionary can contain multiple readings for one spelling. */
const byWord = new Map();
for (const entry of dictionary) {
  if (!byWord.has(entry.s) && entry.p && entry.d?.length) {
    byWord.set(entry.s, entry);
  }
}
for (const entry of CONTEXTUAL_ENTRIES) byWord.set(entry.s, entry);

function addEntry(entries, entry) {
  if (!entries.has(entry.s)) entries.set(entry.s, entry);
}

function collectTextEntries(text, entries, unresolved) {
  for (let start = 0; start < text.length;) {
    if (!HAN.test(text[start])) {
      start += 1;
      continue;
    }

    let match;
    for (let end = Math.min(text.length, start + MAX_WORD_LENGTH); end > start; end -= 1) {
      const candidate = text.slice(start, end);
      const entry = byWord.get(candidate);
      if (entry) {
        match = entry;
        break;
      }
    }

    if (match) {
      addEntry(entries, match);
      start += match.s.length;
    } else {
      unresolved.add(text[start]);
      start += 1;
    }
  }
}

const selected = new Map();
const unresolved = new Set();
for (const item of items) {
  collectTextEntries(item.textZh, selected, unresolved);
}

if (unresolved.size > 0) {
  console.error(
    `HSK 1 glossary cannot resolve: ${[...unresolved].sort().join("、")}`,
  );
  process.exit(1);
}

const entries = [...selected.values()].sort((a, b) => a.s.localeCompare(b.s, "zh-Hans-CN"));
const wordEntries = entries.map((entry) => {
  const result = {
    simplified: entry.s,
    pinyin: entry.p,
    definitions: entry.d,
  };
  if (entry.t) result.traditional = entry.t;
  if (entry.r) {
    result.readings = entry.r.map((reading) => ({
      pinyin: reading.p,
      definitions: reading.d,
    }));
  }
  if (entry.h3 !== undefined) result.hsk30 = entry.h3;
  if (entry.h2 !== undefined) result.hsk20 = entry.h2;
  if (entry.hl !== undefined) result.hskLevel = entry.hl;
  if (entry.f !== undefined) result.frequency = entry.f;
  return result;
});

const source = `import type { WordEntry } from "@/types/dictionary";

/**
 * Generated from every Chinese token used by src/data/library/hsk${level}.json.
 * This seed keeps HSK ${level} sentence explanations complete before the full
 * downloadable dictionary is ready. Regenerate with:
 *   node scripts/build-hsk1-glossary.mjs --level ${level}
 */
export const hsk${level}Glossary: WordEntry[] = ${JSON.stringify(wordEntries, null, 2)};
`;

if (!checkOnly) fs.writeFileSync(outputPath, source);

console.log(
  `${checkOnly ? "Validated" : "Built"} HSK ${level} glossary with ${wordEntries.length} entries; all HSK ${level} passage characters resolve.`,
);
