import { createHash } from "node:crypto";

export const DICTIONARY_ALGORITHM_VERSION = 6;

export const SOURCE_PINS = Object.freeze({
  cedict: {
    releasedAt: "2026-07-13T07:02:08Z",
    sha256: "93694f79555d06d58b12653c3efdbe56218c682f22decb0aa6416904d80bcf81",
    archiveSha256: "6a31189a3f745b61adbeb8ba1c9a353bf12baa4a99fb200c3a616c63f1978b72",
    license: "CC-BY-SA-4.0",
  },
  hsk: {
    commit: "7ac65bf1a6387d35f1ade478906172a19311c7f9",
    sha256: "c869a0ce353279c9333d9b42c31fc3549785e8b40673dab57ee42bc99cd14131",
    license: "MIT",
  },
});

const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à", "a"],
  e: ["ē", "é", "ě", "è", "e"],
  i: ["ī", "í", "ǐ", "ì", "i"],
  o: ["ō", "ó", "ǒ", "ò", "o"],
  u: ["ū", "ú", "ǔ", "ù", "u"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
};

const DIACRITIC_PARTS = new Map(
  Object.entries(TONE_MARKS).flatMap(([base, chars]) =>
    chars.map((char, index) => [char, [base, index < 4 ? String(index + 1) : ""]]),
  ),
);

const REFERENCE_PREFIX = /^(?:old\s+)?(?:erhua\s+)?variant of\b|^euphemistic variant of\b|^see(?: also)?\b|^abbr\. for\b|^used in\b|^erhua form of\b/i;
const VARIANT_PREFIX = /^(?:old\s+)?(?:erhua\s+)?variant of\b|^euphemistic variant of\b/i;
const ARCHAIC_PREFIX = /^(?:\(archaic\)|archaic\b|\(literary\)|literary\b)/i;
const DIALECT_PREFIX = /^(?:\(dialect\)|dialect\b)/i;
const METADATA_PREFIX = /^(?:CL:|classifier abbreviation\b)/i;
const SCRIPT_METADATA = /\b(?:Kangxi radical|radical in Chinese characters|Chinese characters|gongche notation)\b/i;
const HISTORICAL_CONTEXT = /\b(?:archaic|literary|imperial China|ancient Chinese)\b/i;
const LOW_UTILITY_LEARNER_GLOSS = /\b(?:loanword|onom\.|euphemistic|slang|vulgar|mythical beast)\b/i;
const PARTICLE_POS = new Set(["u", "y", "e", "o"]);
const CLASSIFIER_POS = new Set(["q", "qv", "qt", "mq"]);
const NOUN_POS = new Set(["n", "nr", "ns", "nt", "nz", "s"]);
const VERB_POS = new Set(["v", "vn"]);
const ADJECTIVE_POS = new Set(["a", "an", "ad", "b", "z"]);
const ADVERB_POS = new Set(["d"]);
const LOCATION_TIME_POS = new Set(["f", "t"]);

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = String(value ?? "").trim();
    const key = normalizeMeaning(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeMeaning(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function comparisonMeaning(value) {
  return normalizeMeaning(value)
    .replace(/[(){}\[\]|,;:./_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function meaningsMateriallyDiffer(left, rightValues) {
  const leftKey = comparisonMeaning(left);
  if (!leftKey) return true;
  return !rightValues.some((right) => {
    const rightKey = comparisonMeaning(right);
    if (!rightKey) return false;
    return (
      leftKey === rightKey ||
      (leftKey.length >= 4 && rightKey.includes(leftKey)) ||
      (rightKey.length >= 4 && leftKey.includes(rightKey))
    );
  });
}

export function canonicalPinyin(value) {
  const input = String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/u\s*:\s*/g, "v")
    .split(/\s+/)
    .filter((token) => !/^\d+$/.test(token))
    .join("");
  let base = "";
  let tones = "";
  for (const char of input) {
    const marked = DIACRITIC_PARTS.get(char);
    if (marked) {
      base += marked[0];
      tones += marked[1];
    } else if (/[a-zv]/.test(char)) {
      base += char;
    } else if (/[1-4]/.test(char)) {
      tones += char;
    }
  }
  return base ? `${base}|${tones}` : "";
}

export function convertSyllable(syllable) {
  let value = syllable.replace(/u:/g, "v").replace(/U:/g, "V");
  const toneMatch = value.match(/([1-5])$/);
  if (!toneMatch) return syllable;
  const tone = Number(toneMatch[1]);
  value = value.slice(0, -1);
  if (tone === 5 || value.length === 0) {
    return value.replace(/v/g, "ü").replace(/V/g, "Ü");
  }

  const lower = value.toLowerCase();
  let markPosition = lower.indexOf("a");
  if (markPosition === -1) markPosition = lower.indexOf("e");
  if (markPosition === -1) markPosition = lower.indexOf("ou");
  if (markPosition === -1) {
    for (let index = lower.length - 1; index >= 0; index -= 1) {
      if ("aiouev".includes(lower[index])) {
        markPosition = index;
        break;
      }
    }
  }
  if (markPosition === -1) {
    const output = value.replace(/v/g, "ü").replace(/V/g, "Ü");
    return tone === 5 ? output : `${output}${tone}`;
  }

  const base = lower[markPosition] === "v" ? "v" : lower[markPosition];
  const marked = TONE_MARKS[base][tone - 1];
  const output =
    value.slice(0, markPosition) +
    (value[markPosition] === lower[markPosition] ? marked : marked.toUpperCase()) +
    value.slice(markPosition + 1);
  return output.replace(/v/g, "ü").replace(/V/g, "Ü");
}

export function numberedToDiacritic(value) {
  return String(value ?? "")
    .split(/\s+/)
    .map((token) =>
      /^\d+$/.test(token)
        ? token
        : token.replace(/(?:(?:u:|U:)|[A-Za-zVvÜü])+[1-5]/g, convertSyllable),
    )
    .join(" ")
    .trim();
}

export function classifyGloss(gloss, { properReading = false } = {}) {
  const text = String(gloss ?? "").trim();
  const flags = [];
  let score = 0;
  if (!text) return { score: 1000, flags: ["primary-empty"] };

  if (/\bsurname\b/i.test(text)) flags.push("primary-contains-surname");
  if (/^surname\b/i.test(text)) {
    flags.push("primary-surname");
    score = Math.max(score, 900);
  }
  if (VARIANT_PREFIX.test(text)) {
    flags.push("primary-variant-only", "primary-reference-only");
    score = Math.max(score, 800);
  } else if (REFERENCE_PREFIX.test(text)) {
    flags.push("primary-reference-only");
    score = Math.max(score, 750);
  }
  if (METADATA_PREFIX.test(text) || SCRIPT_METADATA.test(text)) {
    flags.push("primary-metadata");
    score = Math.max(score, 700);
  }
  if (ARCHAIC_PREFIX.test(text) || HISTORICAL_CONTEXT.test(text)) {
    flags.push("primary-archaic");
    score = Math.max(score, 600);
  }
  if (DIALECT_PREFIX.test(text)) {
    flags.push("primary-dialect");
    score = Math.max(score, 500);
  }
  if (properReading) {
    flags.push("primary-proper-name");
    score = Math.max(score, 400);
  }
  if (text.length > 160) flags.push("long-primary-gloss");
  return { score, flags: [...new Set(flags)] };
}

function parseHskLevels(levels) {
  let hsk30;
  let hsk20;
  for (const level of levels ?? []) {
    if (/^new-[1-7]$/.test(level)) {
      const number = Number(level.slice(4));
      hsk30 = number === 7 ? "7-9" : number;
    } else if (/^old-[1-6]$/.test(level)) {
      hsk20 = Number(level.slice(4));
    }
  }
  return { hsk30, hsk20 };
}

const CEDICT_RE = /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.+)\/\s*$/;

export function parseCedictText(text) {
  const bySimplified = new Map();
  let order = 0;
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(CEDICT_RE);
    if (!match) continue;
    const [, traditional, simplified, pinyinNumbered, rawDefinitions] = match;
    const record = {
      traditional,
      simplified,
      pinyinNumbered,
      pinyin: numberedToDiacritic(pinyinNumbered),
      definitions: rawDefinitions.split("/").map((value) => value.trim()).filter(Boolean),
      order,
    };
    order += 1;
    const records = bySimplified.get(simplified) ?? [];
    records.push(record);
    bySimplified.set(simplified, records);
  }
  return bySimplified;
}

export function parseHskData(rawItems) {
  const bySimplified = new Map();
  for (const raw of rawItems) {
    const { hsk30, hsk20 } = parseHskLevels(raw.level);
    bySimplified.set(raw.simplified, {
      simplified: raw.simplified,
      hsk30,
      hsk20,
      hskLevel: hsk20 ?? (hsk30 === "7-9" ? 6 : hsk30),
      frequency: raw.frequency,
      partOfSpeech: raw.pos,
      forms: (raw.forms ?? []).map((form, index) => ({
        traditional: form.traditional,
        pinyin: form.transcriptions?.pinyin ?? numberedToDiacritic(form.transcriptions?.numeric),
        pinyinNumbered: form.transcriptions?.numeric ?? "",
        definitions: form.meanings ?? [],
        properReading: /^[A-Z]/.test(form.transcriptions?.numeric ?? form.transcriptions?.pinyin ?? ""),
        partOfSpeech: raw.pos ?? [],
        simplified: raw.simplified,
        order: index,
      })),
    });
  }
  return bySimplified;
}

function makeReadingGroups(records, source) {
  const groups = new Map();
  for (const record of records ?? []) {
    const key = canonicalPinyin(record.pinyinNumbered || record.pinyin);
    if (!key) continue;
    const group = groups.get(key) ?? { key, candidates: [], records: [], source };
    group.records.push(record);
    for (const [definitionOrder, definition] of (record.definitions ?? []).entries()) {
      group.candidates.push({
        text: definition,
        source,
        properReading:
          record.properReading ?? /^[A-Z]/.test(record.pinyinNumbered || record.pinyin || ""),
        pinyin: record.pinyin,
        pinyinNumbered: record.pinyinNumbered,
        traditional: record.traditional,
        partOfSpeech: record.partOfSpeech ?? [],
        simplified: record.simplified,
        order: record.order,
        definitionOrder,
      });
    }
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    const candidates = new Map();
    for (const candidate of group.candidates) {
      const key = normalizeMeaning(candidate.text);
      const existing = candidates.get(key);
      if (!existing || (existing.properReading && !candidate.properReading)) {
        candidates.set(key, candidate);
      }
    }
    group.candidates = [...candidates.values()];
  }
  return groups;
}

function mergeReadingGroups(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, group] of map) {
      const target = merged.get(key) ?? { key, candidates: [], records: [], source: group.source };
      target.candidates.push(...group.candidates);
      target.records.push(...group.records);
      if (group.source === "hsk") target.source = "hsk";
      merged.set(key, target);
    }
  }
  for (const group of merged.values()) {
    const byMeaning = new Map();
    for (const candidate of group.candidates) {
      const key = normalizeMeaning(candidate.text);
      const existing = byMeaning.get(key);
      if (!existing || (existing.source !== "hsk" && candidate.source === "hsk")) {
        byMeaning.set(key, candidate);
      }
    }
    group.candidates = [...byMeaning.values()];
  }
  return merged;
}

function hasAnyPos(candidate, tags) {
  return (candidate.partOfSpeech ?? []).some((tag) => tags.has(tag));
}

function hasNeutralTone(candidate) {
  return /(?:^|\s)[A-Za-züÜv:]+5(?:\s|$)/.test(candidate.pinyinNumbered ?? "");
}

function hskPartOfSpeechScore(candidate) {
  if (candidate.source !== "hsk") return 0;
  const text = normalizeMeaning(candidate.text);
  let score = 0;

  if (hasAnyPos(candidate, PARTICLE_POS)) {
    if (/\b(?:particle|marker)\b/.test(text)) score -= 90;
    if (/\binterjection\b/.test(text)) score -= 35;
    if (hasNeutralTone(candidate)) score -= 45;
  }
  if (hasAnyPos(candidate, CLASSIFIER_POS) && /^classifier\b/.test(text)) {
    score -= 55;
  }
  if (hasAnyPos(candidate, VERB_POS)) {
    if (/^(?:to|can|be able|unable|must|ought)\b/.test(text)) score -= 45;
    else if (/\bto\b/.test(text)) score -= 20;
  }
  if (hasAnyPos(candidate, ADJECTIVE_POS) && !/^(?:to|classifier|particle|variant|old variant|surname)\b/.test(text)) {
    score -= 30;
  }
  if (hasAnyPos(candidate, NOUN_POS) && !/^(?:to|variant|old variant)\b/.test(text)) {
    score -= 25;
  }
  if (
    hasAnyPos(candidate, ADVERB_POS) &&
    /^(?:all|already|also|again|still|only|just|then|not|very|too|more|most|as much|formerly|originally|-ly)\b/.test(text)
  ) {
    score -= 35;
  }
  if (
    hasAnyPos(candidate, LOCATION_TIME_POS) &&
    /^(?:in|at|on|under|above|below|before|after|inside|outside|within|middle|left|right|east|west|north|south|today|tomorrow|yesterday|morning|evening|between|where)\b/.test(text)
  ) {
    score -= 35;
  }

  return score;
}

function candidateDefinitionScore(candidate, group, preferredSource) {
  const classification = classifyGloss(candidate.text, { properReading: candidate.properReading });
  let score = classification.score * 1000;
  const text = normalizeMeaning(candidate.text);

  if (candidate.source === preferredSource) score -= 120;

  if (LOW_UTILITY_LEARNER_GLOSS.test(candidate.text)) score += 45;
  if (/\b(?:used in|abbr\. for|variant of|old variant of|unofficial variant of)\b/i.test(candidate.text)) {
    score += 120;
  }
  if (/\b(?:Kangxi radical|radical in Chinese characters|gongche notation|turning stroke)\b/i.test(candidate.text)) {
    score += 160;
  }
  if (/\b(?:imperial China|ancient Chinese|mythical beast)\b/i.test(candidate.text)) {
    score += 110;
  }
  if (/^\(bound form\)/.test(text)) score += 15;

  return score;
}

function readingSelectionScore(candidate, group, preferredSource) {
  let score = candidateDefinitionScore(candidate, group, preferredSource);
  score += hskPartOfSpeechScore(candidate);
  if (candidate.source === "hsk" && hasNeutralTone(candidate)) {
    if ((candidate.simplified?.length ?? 0) > 1) score -= 45;
    else if (!hasAnyPos(candidate, PARTICLE_POS)) score += 35;
  }
  score -= Math.min(group.candidates.length, 7) * 8;
  return score;
}

function rankedCandidates(group, preferredSource) {
  return [...group.candidates].sort((left, right) => {
    const leftScore = candidateDefinitionScore(left, group, preferredSource);
    const rightScore = candidateDefinitionScore(right, group, preferredSource);
    if (leftScore !== rightScore) return leftScore - rightScore;
    const leftSource = left.source === preferredSource ? 0 : 1;
    const rightSource = right.source === preferredSource ? 0 : 1;
    if (leftSource !== rightSource) return leftSource - rightSource;
    // CC-CEDICT does not claim sense-frequency ordering. For non-HSK entries,
    // prefer a compact learner-facing gloss before using record order as the
    // final stable tie-breaker. HSK retains its reviewed learner-source order.
    if (preferredSource !== "hsk") {
      const leftLong = left.text.length > 160 ? 1 : 0;
      const rightLong = right.text.length > 160 ? 1 : 0;
      if (leftLong !== rightLong) return leftLong - rightLong;
      const leftClauses = (left.text.match(/[;,/]/g) ?? []).length;
      const rightClauses = (right.text.match(/[;,/]/g) ?? []).length;
      if (leftClauses !== rightClauses) return leftClauses - rightClauses;
      if (left.text.length !== right.text.length) return left.text.length - right.text.length;
      const lexical = normalizeMeaning(left.text).localeCompare(normalizeMeaning(right.text), "en");
      if (lexical !== 0) return lexical;
    }
    const leftOrder = left.order ?? Number.POSITIVE_INFINITY;
    const rightOrder = right.order ?? Number.POSITIVE_INFINITY;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    const leftDefinitionOrder = left.definitionOrder ?? Number.POSITIVE_INFINITY;
    const rightDefinitionOrder = right.definitionOrder ?? Number.POSITIVE_INFINITY;
    if (leftDefinitionOrder !== rightDefinitionOrder) return leftDefinitionOrder - rightDefinitionOrder;
    const leftLong = left.text.length > 160 ? 1 : 0;
    const rightLong = right.text.length > 160 ? 1 : 0;
    if (leftLong !== rightLong) return leftLong - rightLong;
    if (left.text.length !== right.text.length) return left.text.length - right.text.length;
    return normalizeMeaning(left.text).localeCompare(normalizeMeaning(right.text), "en");
  });
}

function displayPinyin(group, selectedCandidate) {
  if (selectedCandidate?.pinyin) return selectedCandidate.pinyin;
  const lexical = group.records.find(
    (record) => !/^[A-Z]/.test(record.pinyinNumbered || record.pinyin || ""),
  );
  return lexical?.pinyin ?? group.records[0]?.pinyin ?? "";
}

function selectCandidate(groups, preferredSource) {
  const options = [];
  for (const group of groups.values()) {
    const candidate = rankedCandidates(group, preferredSource)[0];
    if (!candidate) continue;
    const classification = classifyGloss(candidate.text, {
      properReading: candidate.properReading,
    });
    options.push({
      group,
      candidate,
      classification,
      selectionScore: readingSelectionScore(candidate, group, preferredSource),
    });
  }
  options.sort((left, right) => {
    if (left.selectionScore !== right.selectionScore) {
      return left.selectionScore - right.selectionScore;
    }
    const leftOrder = left.candidate.order ?? Number.POSITIVE_INFINITY;
    const rightOrder = right.candidate.order ?? Number.POSITIVE_INFINITY;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (left.candidate.text.length !== right.candidate.text.length) return left.candidate.text.length - right.candidate.text.length;
    return left.group.key.localeCompare(right.group.key, "en");
  });
  const selected = options[0];
  const equallySuitable = selected
    ? options.filter((option) => option.selectionScore === selected.selectionScore)
    : [];
  return { selected, equallySuitable };
}

function validateOverride(override, groups) {
  for (const field of ["simplified", "pinyin", "primaryGloss", "rationale", "sourceNote"]) {
    if (typeof override[field] !== "string" || !override[field].trim()) {
      throw new Error(`${override.simplified ?? "unknown"}: override is missing ${field}`);
    }
  }
  if (!Array.isArray(override.acceptedGlosses) || override.acceptedGlosses.length === 0) {
    throw new Error(`${override.simplified}: override must include acceptedGlosses`);
  }
  if (!override.acceptedGlosses.some((gloss) => normalizeMeaning(gloss) === normalizeMeaning(override.primaryGloss))) {
    throw new Error(`${override.simplified}: acceptedGlosses must include primaryGloss`);
  }
  if (override.secondaryDefinitions !== undefined && !Array.isArray(override.secondaryDefinitions)) {
    throw new Error(`${override.simplified}: override secondaryDefinitions must be an array`);
  }
  const key = canonicalPinyin(override.pinyin);
  const group = groups.get(key);
  if (!group) {
    throw new Error(`${override.simplified}: override pinyin ${override.pinyin} is absent from sources`);
  }
  const sourceMeanings = new Set(group.candidates.map((candidate) => normalizeMeaning(candidate.text)));
  for (const gloss of [
    override.primaryGloss,
    ...(override.acceptedGlosses ?? []),
    ...(override.secondaryDefinitions ?? []),
  ]) {
    if (!sourceMeanings.has(normalizeMeaning(gloss))) {
      throw new Error(`${override.simplified}: override gloss is not source-backed: ${gloss}`);
    }
  }
  return group;
}

function keyedRecords(records, label) {
  const keyed = new Map();
  for (const record of records) {
    if (!record?.simplified) throw new Error(`${label} entry is missing simplified`);
    if (keyed.has(record.simplified)) throw new Error(`Duplicate ${label} entry: ${record.simplified}`);
    keyed.set(record.simplified, record);
  }
  return keyed;
}

function auditOldPrimary(oldPinyin, oldGloss, oldDefinitions) {
  const reasons = [];
  const classification = classifyGloss(oldGloss, {
    properReading: /^[A-Z]/.test(oldPinyin || ""),
  });
  for (const flag of classification.flags) reasons.push(`old-${flag.replace(/^primary-/, "primary-")}`);
  const normalized = oldDefinitions.map(normalizeMeaning).filter(Boolean);
  if (new Set(normalized).size < normalized.length) reasons.push("duplicate-meanings");
  return reasons;
}

function unresolvedFlags(flags) {
  const severe = new Set([
    "primary-empty",
    "primary-surname",
    "primary-reference-only",
    "primary-variant-only",
    "primary-archaic",
    "primary-dialect",
    "primary-metadata",
    "ambiguous-primary-reading",
    "hsk-reading-unmatched",
  ]);
  return flags.filter((flag) => severe.has(flag));
}

function extractReference(gloss) {
  const text = String(gloss ?? "").trim();
  const patterns = [
    /^(?:old\s+)?(?:erhua\s+)?variant of\s+(?:[\p{Script=Han}]+\|)?(?<target>[\p{Script=Han}]+)(?:\[(?<pinyin>[^\]]+)\])?/u,
    /^see(?: also)?\s+(?:[\p{Script=Han}]+\|)?(?<target>[\p{Script=Han}]+)(?:\[(?<pinyin>[^\]]+)\])?/u,
    /^abbr\. for\s+(?:[\p{Script=Han}]+\|)?(?<target>[\p{Script=Han}]+)(?:\[(?<pinyin>[^\]]+)\])?/u,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.groups?.target) {
      const excludedGlosses = [...text.matchAll(/not for (?:the )?.*?\bsense\s+"([^"]+)"/gi)]
        .map((excluded) => excluded[1])
        .filter(Boolean);
      return {
        target: match.groups.target,
        pinyin: match.groups.pinyin,
        excludedGlosses,
      };
    }
  }
  return undefined;
}

function resolveReferenceGloss(gloss, simplified, cedictMap, hskMap) {
  const reference = extractReference(gloss);
  if (!reference || reference.target === simplified) return undefined;

  const targetCedictRecords = cedictMap.get(reference.target) ?? [];
  const targetHsk = hskMap.get(reference.target);
  const targetHskRecords = targetHsk?.forms ?? [];
  if (targetCedictRecords.length === 0 && targetHskRecords.length === 0) return undefined;

  const targetCedictGroups = makeReadingGroups(targetCedictRecords, "cedict");
  const targetHskGroups = makeReadingGroups(targetHskRecords, "hsk");
  const targetGroups = mergeReadingGroups(targetCedictGroups, targetHskGroups);
  const targetPreferredSource = targetHsk ? "hsk" : "cedict";
  const preferredTargetGroups =
    targetHskGroups.size > 0 ? targetHskGroups : targetCedictGroups.size > 0 ? targetCedictGroups : targetGroups;
  const referenceKey = reference.pinyin ? canonicalPinyin(reference.pinyin) : undefined;
  const group = referenceKey
    ? targetGroups.get(referenceKey)
    : selectCandidate(preferredTargetGroups, targetPreferredSource).selected?.group;
  if (!group) return undefined;

  const excluded = new Set(reference.excludedGlosses.map(normalizeMeaning));
  const candidate = rankedCandidates(group, targetPreferredSource).find(
    (item) => !excluded.has(normalizeMeaning(item.text)),
  );
  if (!group || !candidate) return undefined;
  if (unresolvedFlags(classifyGloss(candidate.text, { properReading: candidate.properReading }).flags).length > 0) {
    return undefined;
  }

  const targetReading = readingOutput(group, targetPreferredSource);
  const referenceLabel = reference.pinyin
    ? `${reference.target}[${reference.pinyin}]`
    : reference.target;
  return {
    target: reference.target,
    targetPinyin: reference.pinyin,
    primaryGloss: candidate.text,
    acceptedGlosses: targetReading.acceptedGlosses.filter(
      (definition) => !excluded.has(normalizeMeaning(definition)),
    ),
    secondaryDefinitions: targetReading.definitions.filter(
      (definition) =>
        normalizeMeaning(definition) !== normalizeMeaning(candidate.text) &&
        !excluded.has(normalizeMeaning(definition)),
    ),
    definitionSource: candidate.source,
    properReading: candidate.properReading,
    sourceNote: `Resolved source reference "${gloss}" through ${referenceLabel}`,
  };
}

function readingOutput(group, preferredSource) {
  const ranked = rankedCandidates(group, preferredSource);
  const best = ranked[0];
  const acceptable = ranked.filter(
    (candidate) =>
      classifyGloss(candidate.text, { properReading: candidate.properReading }).score < 400,
  );
  return {
    pinyin: displayPinyin(group, best),
    primaryGloss: best?.text ?? "",
    acceptedGlosses: uniqueStrings(
      preferredSource === "hsk"
        ? acceptable.filter((candidate) => candidate.source === "hsk").map((candidate) => candidate.text)
        : best
          ? [best.text]
          : [],
    ),
    definitions: uniqueStrings(ranked.map((candidate) => candidate.text)),
    source: best?.source ?? preferredSource,
  };
}

export function buildDictionary({ cedictMap, hskMap, overrides = [], manualReviews = [] }) {
  const overrideMap = keyedRecords(overrides, "override");
  const manualReviewMap = keyedRecords(manualReviews, "manual review");
  const words = new Set([...cedictMap.keys(), ...hskMap.keys()]);
  const entries = [];
  const auditRecords = [];

  for (const simplified of words) {
    const cedictRecords = cedictMap.get(simplified) ?? [];
    const hsk = hskMap.get(simplified);
    const hskRecords = hsk?.forms ?? [];
    const cedictGroups = makeReadingGroups(cedictRecords, "cedict");
    const hskGroups = makeReadingGroups(hskRecords, "hsk");
    const allGroups = mergeReadingGroups(cedictGroups, hskGroups);
    const preferredGroups = hsk ? hskGroups : cedictGroups;
    const preferredSource = hsk ? "hsk" : "cedict";
    const override = overrideMap.get(simplified);
    const auditFlags = [];

    let selectedGroup;
    let selectedCandidate;
    let equallySuitable = [];
    if (override) {
      selectedGroup = validateOverride(override, allGroups);
      selectedCandidate = selectedGroup.candidates.find(
        (candidate) => normalizeMeaning(candidate.text) === normalizeMeaning(override.primaryGloss),
      );
    } else {
      const selection = selectCandidate(preferredGroups.size > 0 ? preferredGroups : allGroups, preferredSource);
      selectedGroup = selection.selected?.group;
      selectedCandidate = selection.selected?.candidate;
      equallySuitable = selection.equallySuitable;
      if (equallySuitable.length > 1) {
        auditFlags.push("ambiguous-primary-reading");
      }
    }

    if (!selectedGroup) {
      selectedGroup = allGroups.values().next().value;
      selectedCandidate = selectedGroup?.candidates[0];
      auditFlags.push("primary-empty");
    }

    const selectedKey = selectedGroup?.key ?? "";
    const combinedSelectedGroup = allGroups.get(selectedKey) ?? selectedGroup;
    const selectedReference = extractReference(selectedCandidate?.text);
    const qualifiedReferenceCandidate = selectedReference && !selectedReference.pinyin
      ? combinedSelectedGroup?.candidates.find((candidate) => {
          const candidateReference = extractReference(candidate.text);
          return (
            candidateReference?.pinyin &&
            candidateReference.target === selectedReference.target
          );
        })
      : undefined;
    const referenceResolution = !override
      ? resolveReferenceGloss(
          qualifiedReferenceCandidate?.text ?? selectedCandidate?.text,
          simplified,
          cedictMap,
          hskMap,
        )
      : undefined;
    if (referenceResolution) auditFlags.push("resolved-source-reference");
    const sourceClassification = classifyGloss(
      override?.primaryGloss ?? referenceResolution?.primaryGloss ?? selectedCandidate?.text ?? "",
      { properReading: referenceResolution?.properReading ?? selectedCandidate?.properReading },
    );
    auditFlags.push(...sourceClassification.flags);

    if (!override && hsk && selectedKey && cedictGroups.size > 0 && !cedictGroups.has(selectedKey)) {
      auditFlags.push("hsk-reading-unmatched");
    }
    if (allGroups.size > 1) auditFlags.push("multiple-pronunciations");
    const viableSelectedSenses = (combinedSelectedGroup?.candidates ?? []).filter(
      (candidate) =>
        classifyGloss(candidate.text, { properReading: candidate.properReading }).score < 400,
    ).length;
    if (!hsk && viableSelectedSenses > 1) auditFlags.push("sense-frequency-unavailable");

    const primaryGloss = override?.primaryGloss ?? referenceResolution?.primaryGloss ?? selectedCandidate?.text ?? "";
    const selectedReading = readingOutput(combinedSelectedGroup, preferredSource);
    const acceptedGlosses = uniqueStrings(
      override?.acceptedGlosses?.length
        ? override.acceptedGlosses
        : referenceResolution
          ? [primaryGloss, ...referenceResolution.acceptedGlosses]
        : hsk
          ? [primaryGloss, ...selectedReading.acceptedGlosses]
          : [primaryGloss],
    );
    const secondaryDefinitions = uniqueStrings([
      ...(override?.secondaryDefinitions ?? []),
      ...(referenceResolution ? [selectedCandidate?.text, ...referenceResolution.secondaryDefinitions] : []),
      ...selectedReading.definitions.filter(
        (definition) => normalizeMeaning(definition) !== normalizeMeaning(primaryGloss),
      ),
    ]);
    const definitions = uniqueStrings([primaryGloss, ...secondaryDefinitions]);

    const primaryPinyin = override?.pinyin ?? displayPinyin(combinedSelectedGroup, selectedCandidate);
    const traditional =
      override?.traditional ??
      selectedCandidate?.traditional ??
      combinedSelectedGroup?.records.find((record) => record.traditional)?.traditional;
    const readings = [...allGroups.values()]
      .map((group) => readingOutput(group, preferredSource))
      .sort((left, right) => {
        const leftPrimary = canonicalPinyin(left.pinyin) === canonicalPinyin(primaryPinyin) ? 0 : 1;
        const rightPrimary = canonicalPinyin(right.pinyin) === canonicalPinyin(primaryPinyin) ? 0 : 1;
        return leftPrimary - rightPrimary || canonicalPinyin(left.pinyin).localeCompare(canonicalPinyin(right.pinyin), "en");
      });

    let definitionConfidence;
    if (override || referenceResolution) definitionConfidence = "high";
    else if (unresolvedFlags(auditFlags).length > 0) definitionConfidence = "review";
    else if (hsk && (!cedictGroups.size || cedictGroups.has(selectedKey))) definitionConfidence = "high";
    else definitionConfidence = allGroups.size === 1 && viableSelectedSenses <= 1 ? "high" : "medium";

    const manualReview = manualReviewMap.get(simplified);
    if (manualReview) {
      if (manualReview.status !== "reviewed" && manualReview.status !== "pending") {
        throw new Error(`${simplified}: manual review status must be reviewed or pending`);
      }
      if (!["high", "medium", "review"].includes(manualReview.confidence)) {
        throw new Error(`${simplified}: manual review confidence must be high, medium, or review`);
      }
      for (const field of ["pinyin", "primaryGloss", "rationale", "sourceNote"]) {
        if (typeof manualReview[field] !== "string" || !manualReview[field].trim()) {
          throw new Error(`${simplified}: manual review is missing ${field}`);
        }
      }
      if (
        canonicalPinyin(manualReview.pinyin) !== canonicalPinyin(primaryPinyin) ||
        normalizeMeaning(manualReview.primaryGloss) !== normalizeMeaning(primaryGloss)
      ) {
        throw new Error(`${simplified}: manual-review expectation no longer matches generated selection`);
      }
      definitionConfidence = manualReview.status === "pending" ? "review" : manualReview.confidence;
    }
    const manualReviewStatus =
      override
        ? "reviewed"
        : manualReview
          ? manualReview.status
        : unresolvedFlags(auditFlags).length > 0
          ? "pending"
          : "not-required";
    const definitionSource = override
      ? "curated"
      : referenceResolution?.definitionSource ?? preferredSource;

    const entry = {
      simplified,
      traditional: traditional && traditional !== simplified ? traditional : undefined,
      pinyin: primaryPinyin,
      primaryReading: primaryPinyin,
      primaryGloss,
      acceptedGlosses,
      definitions,
      secondaryDefinitions,
      readings: readings.length > 1 ? readings : undefined,
      definitionSource,
      definitionConfidence,
      auditFlags: [...new Set(auditFlags)].sort(),
      manualReviewStatus,
      hsk30: hsk?.hsk30,
      hsk20: hsk?.hsk20,
      hskLevel: hsk?.hskLevel,
      frequency: hsk?.frequency,
    };
    entries.push(entry);

    const oldPrimary = cedictRecords[0] ?? hskRecords[0];
    const oldPinyin = oldPrimary?.pinyin ?? "";
    const oldDefinitions = cedictRecords.length
      ? uniqueStrings(cedictRecords.flatMap((record) => record.definitions))
      : uniqueStrings(hskRecords.flatMap((record) => record.definitions));
    const oldFirstDefinition = oldDefinitions[0] ?? "";
    const auditReasons = auditOldPrimary(oldPinyin, oldFirstDefinition, oldDefinitions);
    if (allGroups.size > 1) auditReasons.push("flattened-pronunciations");
    if (canonicalPinyin(oldPinyin) !== canonicalPinyin(primaryPinyin)) {
      auditReasons.push("primary-reading-changed");
    }
    if (normalizeMeaning(oldFirstDefinition) !== normalizeMeaning(primaryGloss)) {
      auditReasons.push("primary-gloss-changed");
    }
    if (hsk && meaningsMateriallyDiffer(oldFirstDefinition, acceptedGlosses)) {
      auditReasons.push("hsk-learner-gloss-differs");
    }
    const unresolved = unresolvedFlags(entry.auditFlags);
    auditRecords.push({
      simplified,
      traditional: entry.traditional,
      hskLevel: entry.hsk30,
      frequency: entry.frequency,
      hskPinyin: hsk
        ? uniqueStrings(hskRecords.map((record) => record.pinyin)).join(" / ")
        : undefined,
      oldSelectedPinyin: oldPinyin,
      newSelectedPinyin: primaryPinyin,
      oldFirstDefinition,
      proposedPrimaryGloss: primaryGloss,
      acceptedGlosses,
      definitionSource,
      confidence: definitionConfidence,
      auditReasons: [...new Set(auditReasons)].sort(),
      auditFlags: entry.auditFlags,
      manualReviewStatus,
      status:
        manualReviewStatus === "pending"
          ? "unresolved"
          : auditReasons.length > 0 || unresolved.length > 0
            ? "resolved"
            : "unchanged",
      rationale: override?.rationale ?? manualReview?.rationale,
      sourceNote:
        override?.sourceNote ??
        (referenceResolution
          ? `${referenceResolution.sourceNote}${manualReview?.sourceNote ? `; manual review: ${manualReview.sourceNote}` : ""}`
          : manualReview?.sourceNote),
    });
  }

  return { entries, auditRecords };
}

export function compactEntry(entry) {
  const compact = {
    s: entry.simplified,
    p: entry.pinyin,
    g: entry.primaryGloss,
    d: entry.definitions,
    ds: entry.definitionSource,
  };
  if (
    entry.acceptedGlosses.length !== 1 ||
    normalizeMeaning(entry.acceptedGlosses[0]) !== normalizeMeaning(entry.primaryGloss)
  ) {
    compact.a = entry.acceptedGlosses;
  }
  if (entry.definitionConfidence !== "high") compact.dc = entry.definitionConfidence;
  if (entry.manualReviewStatus !== "not-required") compact.mr = entry.manualReviewStatus;
  if (entry.traditional) compact.t = entry.traditional;
  if (entry.primaryReading && entry.primaryReading !== entry.pinyin) compact.pr = entry.primaryReading;
  if (entry.readings?.length) {
    compact.r = entry.readings.map((reading) => ({
      p: reading.pinyin,
      g: reading.primaryGloss,
      d: reading.definitions,
      s: reading.source,
      ...(reading.acceptedGlosses.length === 1 &&
      normalizeMeaning(reading.acceptedGlosses[0]) === normalizeMeaning(reading.primaryGloss)
        ? {}
        : { a: reading.acceptedGlosses }),
    }));
  }
  if (entry.auditFlags?.length) compact.af = entry.auditFlags;
  if (entry.hsk30 !== undefined) compact.h3 = entry.hsk30;
  if (entry.hsk20 !== undefined) compact.h2 = entry.hsk20;
  if (entry.hskLevel !== undefined) compact.hl = entry.hskLevel;
  if (entry.frequency !== undefined) compact.f = entry.frequency;
  return compact;
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")));
}

export function buildAuditSummary(entries, auditRecords, recordedBaseline) {
  const hsk16 = entries.filter(
    (entry) => Number.isInteger(entry.hsk30) && entry.hsk30 >= 1 && entry.hsk30 <= 6,
  );
  const unresolved = auditRecords.filter((record) => record.status === "unresolved");
  const resolved = auditRecords.filter((record) => record.status === "resolved");
  const nonHsk = entries.filter(
    (entry) => entry.hsk30 === undefined && entry.hsk20 === undefined && entry.hskLevel === undefined,
  );
  const markerPatterns = {
    surname: /^surname\b/i,
    variantOf: /^variant of\b/i,
    oldVariantOf: /^old variant of\b/i,
    archaic: /^(?:\(archaic\)|archaic\b)/i,
    dialect: /^(?:\(dialect\)|dialect\b)/i,
    see: /^see(?: also)?\b/i,
    abbreviation: /^abbr\. for\b/i,
    usedIn: /^used in\b/i,
  };
  const markerCounts = (values) =>
    Object.fromEntries(
      Object.entries(markerPatterns).map(([label, pattern]) => [
        label,
        values.filter((entry) => pattern.test(entry.primaryGloss)).length,
      ]),
    );
  const hasDuplicateDefinitions = (entry) => {
    const meanings = entry.definitions.map(normalizeMeaning).filter(Boolean);
    return new Set(meanings).size < meanings.length;
  };
  const frequencyRankedNonHsk = nonHsk.filter((entry) => entry.frequency !== undefined);
  const baselineSevereReasons = new Set([
    "old-primary-empty",
    "old-primary-surname",
    "old-primary-reference-only",
    "old-primary-variant-only",
    "old-primary-archaic",
    "old-primary-dialect",
    "old-primary-metadata",
  ]);
  const hasBaselineSevereReason = (record) =>
    record.auditReasons.some((reason) => baselineSevereReasons.has(reason));
  const baselineHskCalibrationEntries = auditRecords.filter(
    (record) =>
      Number.isInteger(record.hskLevel) &&
      record.hskLevel >= 1 &&
      record.hskLevel <= 6 &&
      (hasBaselineSevereReason(record) || record.auditReasons.includes("hsk-learner-gloss-differs")),
  );
  return {
    schemaVersion: 1,
    sourcePins: SOURCE_PINS,
    ...(recordedBaseline ? { recordedBaseline } : {}),
    legacyProjectionTotals: {
      generatedEntries: entries.length,
      hsk1To6Entries: hsk16.length,
      flattenedPronunciationEntries: auditRecords.filter((record) =>
        record.auditReasons.includes("flattened-pronunciations"),
      ).length,
      emptyPrimaryGlosses: auditRecords.filter((record) => !record.oldFirstDefinition.trim()).length,
      surnamePrimaryGlosses: auditRecords.filter((record) => /^surname\b/i.test(record.oldFirstDefinition)).length,
      unsuitablePrimaryGlosses: auditRecords.filter(hasBaselineSevereReason).length,
      longPrimaryGlosses: auditRecords.filter((record) => record.oldFirstDefinition.length > 160).length,
      duplicateMeaningEntries: auditRecords.filter((record) =>
        record.auditReasons.includes("duplicate-meanings"),
      ).length,
      hskLearnerMeaningDiffersFromOldPrimary: auditRecords.filter((record) =>
        record.auditReasons.includes("hsk-learner-gloss-differs"),
      ).length,
      unsuitableCalibrationEntries: baselineHskCalibrationEntries.length,
      unresolvedHsk1To6: baselineHskCalibrationEntries.length,
    },
    totals: {
      generatedEntries: entries.length,
      hsk1To6Entries: hsk16.length,
      multiplePronunciations: entries.filter((entry) => entry.readings?.length > 1).length,
      hskMultiplePronunciations: hsk16.filter((entry) => entry.readings?.length > 1).length,
      hskReadingUnmatchedToCedict: hsk16.filter((entry) =>
        entry.auditFlags.includes("hsk-reading-unmatched"),
      ).length,
      emptyPrimaryGlosses: entries.filter((entry) => !entry.primaryGloss.trim()).length,
      surnamePrimaryGlosses: entries.filter((entry) => /\bsurname\b/i.test(entry.primaryGloss)).length,
      properNamePrimaryGlosses: entries.filter((entry) => entry.auditFlags.includes("primary-proper-name")).length,
      unsuitablePrimaryGlosses: entries.filter(
        (entry) => entry.manualReviewStatus !== "reviewed" && unresolvedFlags(entry.auditFlags).length > 0,
      ).length,
      longPrimaryGlosses: entries.filter((entry) => entry.primaryGloss.length > 160).length,
      duplicateMeaningEntries: entries.filter(hasDuplicateDefinitions).length,
      flattenedPronunciationEntries: 0,
      hskLearnerMeaningChangedFromOldPrimary: auditRecords.filter(
        (record) =>
          Number.isInteger(record.hskLevel) &&
          record.hskLevel >= 1 &&
          record.hskLevel <= 6 &&
          record.auditReasons.includes("hsk-learner-gloss-differs"),
      ).length,
      unsuitableCalibrationEntries: hsk16.filter(
        (entry) =>
          entry.definitionConfidence === "review" ||
          entry.manualReviewStatus === "pending" ||
          unresolvedFlags(entry.auditFlags).length > 0,
      ).length,
      unresolved: unresolved.length,
      unresolvedHsk1To6: unresolved.filter(
        (record) => Number.isInteger(record.hskLevel) && record.hskLevel >= 1 && record.hskLevel <= 6,
      ).length,
      reviewed: entries.filter((entry) => entry.manualReviewStatus === "reviewed").length,
      nonHskEntries: nonHsk.length,
      frequencyRankedNonHskEntries: frequencyRankedNonHsk.length,
    },
    markerLedPrimaryGlosses: markerCounts(entries),
    hskMarkerLedPrimaryGlosses: markerCounts(hsk16),
    byAuditReason: countBy(auditRecords.flatMap((record) => record.auditReasons)),
    resolvedByAuditReason: countBy(resolved.flatMap((record) => record.auditReasons)),
    unresolvedByAuditReason: countBy(unresolved.flatMap((record) => record.auditReasons)),
    byHskLevel: countBy(
      entries.map((entry) => (entry.hsk30 === undefined ? "unbanded" : String(entry.hsk30))),
    ),
    byConfidence: countBy(entries.map((entry) => entry.definitionConfidence)),
    byDefinitionSource: countBy(entries.map((entry) => entry.definitionSource)),
    byManualReviewStatus: countBy(entries.map((entry) => entry.manualReviewStatus)),
    byResolutionStatus: countBy(auditRecords.map((record) => record.status)),
    unresolvedByHskLevel: countBy(
      unresolved.map((record) => (record.hskLevel === undefined ? "unbanded" : String(record.hskLevel))),
    ),
    tierC: {
      requestedFrequencyRankedNonHskEntries: 5000,
      availableFrequencyRankedNonHskEntries: frequencyRankedNonHsk.length,
      deterministicStrictAuditAppliedToAllNonHskEntries: nonHsk.length,
      status:
        frequencyRankedNonHsk.length > 0
          ? "available"
          : "blocked-by-missing-non-hsk-frequency-data",
    },
  };
}

export function deterministicVersion(cedictText, hskText, overridesText, manualReviewsText = "") {
  return sha256(
    `${DICTIONARY_ALGORITHM_VERSION}\n${cedictText}\n${hskText}\n${overridesText}\n${manualReviewsText}`,
  ).slice(0, 16);
}
