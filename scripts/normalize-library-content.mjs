import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pinyin } from "pinyin-pro";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libraryDirectory = path.join(root, "src", "data", "library");
const dictionary = JSON.parse(
  fs.readFileSync(path.join(root, "public", "dict", "dictionary.min.json"), "utf8"),
);

const HAN = /[\u3400-\u9fff]/u;
const HAN_SEQUENCE = /[\u3400-\u9fff]+/gu;
const libraryFiles = [1, 2, 3, 4, 5, 6].map((level) =>
  path.join(libraryDirectory, `hsk${level}.json`),
);

/**
 * Context-specific replacements that a dictionary cannot safely infer. These
 * deliberately use English labels for grammar words, not pinyin, because they
 * are rendered inside English explanations.
 */
const MANUAL_TRANSLATIONS = new Map([
  ["小明", "Xiao Ming"],
  ["小王", "Xiao Wang"],
  ["小张", "Xiao Zhang"],
  ["小李", "Xiao Li"],
  ["安娜", "Anna"],
  ["爸爸", "Dad"],
  ["妈妈", "Mom"],
  ["姐姐", "older sister"],
  ["同学", "classmate"],
  ["老师", "teacher"],
  ["上午", "morning"],
  ["中午", "noon"],
  ["下午", "afternoon"],
  ["晚上", "evening"],
  ["早上", "morning"],
  ["学校", "school"],
  ["家", "home"],
  ["广州", "Guangzhou"],
  ["杭州", "Hangzhou"],
  ["成都", "Chengdu"],
  ["南京", "Nanjing"],
  ["苹果", "apples"],
  ["护照复印件", "passport photocopy"],
  ["手机地图", "phone map"],
  ["朋友家", "a friend's home"],
  ["作业文件", "assignment file"],
  ["小礼物", "small gift"],
  ["进了课堂", "entered the classroom"],
  ["吃了吗", "Have you eaten"],
  ["中国人常说", "Chinese people often say"],
  ["很多人喜欢成都", "why many people like Chengdu"],
  ["朋友之间谈钱", "how friends talk about money"],
  ["第面试", "a job interview"],
  ["是", "the verb \"to be\""],
  ["有", "the verb \"to have\""],
  ["了", "the completed-action particle"],
  ["在", "the location/progressive marker"],
  ["比", "the comparison marker"],
  ["被", "the passive marker"],
  ["把", "the object-disposal marker"],
  ["如果", "if"],
  ["就", "then"],
  ["越来越", "increasingly"],
  ["虽然", "although"],
  ["但是", "but"],
  ["并非", "not necessarily"],
  ["未必", "not necessarily"],
]);

const PLACEHOLDER_REPAIRS = new Map([
  ["lib-h1-drink-water", "home"],
  ["lib-h1-012-my-small-room", "home"],
  ["lib-h1-018-eight-in-the-morning", "home"],
  ["lib-h1-024-today-is-not-too-cold", "home"],
  ["lib-h1-030-sunday-at-home", "home"],
  ["lib-h1-036-my-new-classmate", "home"],
  ["lib-h1-042-i-love-my-city", "home"],
  ["lib-h1-048-what-is-todays-date", "home"],
  ["lib-h3-online-shopping", "Guangzhou"],
  ["lib-h3-011-a-day-in-shanghai", "Guangzhou"],
  ["lib-h3-017-an-ordinary-but-memorable-tr", "Guangzhou"],
  ["lib-h3-023-a-sudden-rain", "Guangzhou"],
  ["lib-h3-029-why-people-like-high-speed-r", "Guangzhou"],
  ["lib-h3-035-balancing-study-and-work", "Guangzhou"],
  ["lib-h3-041-a-cultural-exchange-event", "Guangzhou"],
  ["lib-h3-047-before-the-semester-ends", "Guangzhou"],
  [
    "lib-h4-025-why-chinese-study-cannot-onl",
    "learning Chinese cannot consist solely of memorizing words",
  ],
  ["lib-h4-039-hot-and-cold-in-chinese-food", "“Hot” and “Cold” in Chinese Food Culture"],
]);

const LEGACY_TEXT_REPAIRS = [
  ["surname Shui", "water"],
  ["surname Hang prefecture", "Hangzhou"],
  ["surname Cheng surname Du", "Chengdu"],
  ["surname Nan surname Jing", "Nanjing"],
  ["very many person like Chengdu", "why many people like Chengdu"],
  ["friend between surname Tan surname Qian", "how friends talk about money"],
];

const entriesByWord = new Map();
for (const entry of dictionary) {
  const existing = entriesByWord.get(entry.s) ?? [];
  existing.push(entry);
  entriesByWord.set(entry.s, existing);
}

function cleanDefinition(definition) {
  return definition
    .replace(/\s*CL:[^;,)]+/gu, "")
    .replace(/\[[^\]]+\]/gu, "")
    .replace(/\([^)]*\)/gu, "")
    .split(";")[0]
    .replace(/^to\s+/iu, "")
    .replace(/^the\s+/iu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function translationForEntry(entry) {
  const definitions = entry?.d
    ?.map(cleanDefinition)
    .filter((definition) =>
      definition &&
      !HAN.test(definition) &&
      !/^(?:old )?variant\b|^surname\b|^one who/u.test(definition),
    );
  return definitions?.[0] ?? null;
}

/**
 * Return a dictionary-based English gloss for a Chinese run. The dynamic
 * program favors known, longer words, so compounds remain intact whenever
 * possible instead of being reduced to individual-character glosses.
 */
function translateChineseRun(text, titleTranslations) {
  const exactTitle = titleTranslations.get(text);
  if (exactTitle) return exactTitle;

  const exactManual = MANUAL_TRANSLATIONS.get(text);
  if (exactManual) return exactManual;

  const best = Array(text.length + 1).fill(null);
  best[0] = { score: 0, words: [] };

  for (let start = 0; start < text.length; start += 1) {
    if (!best[start]) continue;

    for (let end = start + 1; end <= text.length; end += 1) {
      const word = text.slice(start, end);
      const manual = MANUAL_TRANSLATIONS.get(word);
      const entry = entriesByWord.get(word)?.find(translationForEntry);
      const translation = manual ?? (entry ? translationForEntry(entry) : null);
      if (!translation) continue;

      const length = end - start;
      const candidate = {
        // Long dictionary words are much more useful than individual-character
        // glosses. The small per-word penalty breaks otherwise equal ties.
        score: best[start].score + length * length * 100 - 1,
        words: [...best[start].words, translation],
      };
      if (!best[end] || candidate.score > best[end].score) best[end] = candidate;
    }
  }

  if (best[text.length]) return best[text.length].words.join(" ");

  // The static dictionary covers normal words. This preserves readability for
  // an isolated malformed fragment while still ensuring English fields never
  // silently retain Han characters.
  return "untranslated term";
}

function normalizeEnglish(value, titleTranslations) {
  if (typeof value !== "string" || !HAN.test(value)) return value;
  return value.replace(HAN_SEQUENCE, (text) =>
    translateChineseRun(text, titleTranslations),
  );
}

function repairPlaceholder(value, itemId) {
  const replacement = PLACEHOLDER_REPAIRS.get(itemId);
  let repaired = value;
  if (replacement) {
    repaired = repaired
      .replaceAll(
        "untranslated term“warm up”untranslated term“untranslated term”",
        replacement,
      )
      .replaceAll("untranslated term", replacement)
      .replaceAll("go to home", "go home")
      .replaceAll(
        "studying Chinese cannot be only memorizing words",
        "learning Chinese cannot consist solely of memorizing words",
      );
  }
  for (const [from, to] of LEGACY_TEXT_REPAIRS) {
    repaired = repaired.replaceAll(from, to);
  }
  return repaired;
}

function pinyinForPhrase(phrase) {
  return pinyin(phrase, {
    toneType: "symbol",
    type: "string",
    nonZh: "removed",
  }).replace(/\s{2,}/gu, " ").trim();
}

function englishFields(item) {
  const fields = [];
  const add = (owner, key) => {
    if (typeof owner?.[key] === "string") fields.push({ owner, key });
  };

  add(item, "titleEn");
  add(item, "summaryEn");
  add(item, "translation");
  add(item, "translationEn");

  for (const paragraph of item.paragraphTranslations ?? []) add(paragraph, "en");
  for (const explanation of item.sentenceExplanations ?? []) {
    add(explanation, "en");
    add(explanation, "naturalMeaning");
    for (const phrase of explanation.phrases ?? []) {
      add(phrase, "en");
      add(phrase, "note");
    }
    for (const grammar of explanation.grammar ?? []) {
      add(grammar, "explanationEn");
      add(grammar, "exampleEn");
    }
  }
  for (const question of item.comprehensionQuestions ?? []) {
    add(question, "questionEn");
    add(question, "answerEn");
    add(question, "explanationEn");
  }
  return fields;
}

function titleTranslationsFor(items) {
  const translations = new Map();
  for (const item of items) {
    if (!item.titleZh || !item.titleEn) continue;
    translations.set(item.titleZh.replace(/[^\u3400-\u9fff]/gu, ""), item.titleEn);
  }
  return translations;
}

function normalize(items) {
  const titleTranslations = titleTranslationsFor(items);
  let translatedFieldCount = 0;
  let phraseCount = 0;

  for (const item of items) {
    for (const { owner, key } of englishFields(item)) {
      const normalized = normalizeEnglish(owner[key], titleTranslations);
      const repaired = repairPlaceholder(normalized, item.id);
      if (repaired !== owner[key]) {
        owner[key] = repaired;
        translatedFieldCount += 1;
      }
    }
    for (const explanation of item.sentenceExplanations ?? []) {
      for (const phrase of explanation.phrases ?? []) {
        const isTitleFragment =
          phrase.zh.length >= 3 && item.titleZh.replace(/[^\u3400-\u9fff]/gu, "").includes(phrase.zh);
        const needsGlossRepair = /(?:untranslated term|\bsurname\b|old variant)/iu.test(
          phrase.en ?? "",
        );
        // Some older exports sliced title text at arbitrary character
        // boundaries. Translating the slice word-by-word creates nonsense
        // (for example, \"坐公共汽\" → \"take public steam\"). The authored
        // article title is the reliable English meaning for these fragments.
        if (isTitleFragment && phrase.en !== item.titleEn) {
          phrase.en = item.titleEn;
          translatedFieldCount += 1;
        } else if (needsGlossRepair) {
          const normalized = translateChineseRun(phrase.zh, titleTranslations);
          if (normalized !== phrase.en) {
            phrase.en = normalized;
            translatedFieldCount += 1;
          }
        }
        phrase.pinyin = pinyinForPhrase(phrase.zh);
        phraseCount += 1;
      }
    }
  }
  return { translatedFieldCount, phraseCount };
}

function validate(items) {
  const issues = [];
  for (const item of items) {
    for (const { owner, key } of englishFields(item)) {
      if (HAN.test(owner[key])) issues.push(`${item.id}: ${key} contains Han characters`);
      if (owner[key].includes("untranslated term")) {
        issues.push(`${item.id}: ${key} contains an untranslated placeholder`);
      }
      if (/\bsurname\b/iu.test(owner[key])) {
        issues.push(`${item.id}: ${key} contains an unresolved dictionary sense`);
      }
    }
    for (const explanation of item.sentenceExplanations ?? []) {
      for (const phrase of explanation.phrases ?? []) {
        if (!phrase.pinyin?.trim()) issues.push(`${item.id}: ${phrase.zh} has no pinyin`);
        if (HAN.test(phrase.pinyin ?? "")) {
          issues.push(`${item.id}: ${phrase.zh} has Han characters in pinyin`);
        }
      }
    }
  }
  return issues;
}

function countPhrases(items) {
  return items.reduce(
    (count, item) =>
      count +
      (item.sentenceExplanations ?? []).reduce(
        (sentenceCount, explanation) => sentenceCount + (explanation.phrases?.length ?? 0),
        0,
      ),
    0,
  );
}

const write = process.argv.includes("--write");
let totalTranslatedFields = 0;
let totalPhrases = 0;
const allItems = [];

for (const file of libraryFiles) {
  const items = JSON.parse(fs.readFileSync(file, "utf8"));
  const result = write
    ? normalize(items)
    : { translatedFieldCount: 0, phraseCount: countPhrases(items) };
  totalTranslatedFields += result.translatedFieldCount;
  totalPhrases += result.phraseCount;
  allItems.push(...items);
  if (write) fs.writeFileSync(file, `${JSON.stringify(items, null, 2)}\n`);
}

const issues = validate(allItems);
if (issues.length > 0) {
  console.error(`Library normalization failed with ${issues.length} issue(s):`);
  console.error(issues.slice(0, 50).join("\n"));
  process.exit(1);
}

console.log(
  `${write ? "Normalized" : "Validated"} ${totalTranslatedFields} English fields and ${totalPhrases} phrase pinyin values.`,
);
