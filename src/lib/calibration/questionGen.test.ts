import { describe, expect, it } from "vitest";

import { buildQuestion, meaningLabel } from "./questionGen";
import type { WordEntry } from "@/types/dictionary";

function entry(simplified: string, definition: string): WordEntry {
  return {
    simplified,
    pinyin: "x",
    primaryGloss: definition,
    definitions: [definition],
    definitionSource: "cedict",
    definitionConfidence: "high",
    manualReviewStatus: "not-required",
  };
}

const POOL: WordEntry[] = [
  entry("一", "one"),
  entry("二", "two"),
  entry("三", "three"),
  entry("四", "four"),
  entry("五", "five"),
  entry("六", "six"),
  entry("七", "seven"),
];

describe("buildQuestion", () => {
  it("is deterministic for the same seed", () => {
    const a = buildQuestion(POOL[0], 1, POOL, 42);
    const b = buildQuestion(POOL[0], 1, POOL, 42);
    expect(a).toEqual(b);
  });

  it("places the correct meaning at the answer index", () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const q = buildQuestion(POOL[2], 1, POOL, seed);
      expect(q.options[q.answer]).toBe("three");
      expect(q.word).toBe("三");
    }
  });

  it("builds four unique options without the word's own meaning as a distractor", () => {
    const q = buildQuestion(POOL[1], 2, POOL, 7);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options.filter((o) => o === "two")).toHaveLength(1);
    expect(q.level).toBe(2);
  });

  it("skips distractors whose meaning duplicates the correct one", () => {
    const pool = [
      entry("目", "eye"),
      entry("眼", "eye"), // duplicate meaning must not appear twice
      entry("口", "mouth"),
      entry("耳", "ear"),
      entry("鼻", "nose"),
    ];
    for (const seed of [1, 5, 9, 21]) {
      const q = buildQuestion(pool[0], 1, pool, seed);
      expect(q.options.filter((o) => o === "eye")).toHaveLength(1);
    }
  });

  it("degrades gracefully when the pool is too small for full options", () => {
    const tiny = [entry("上", "up"), entry("下", "down")];
    const q = buildQuestion(tiny[0], 1, tiny, 3);
    expect(q.options).toContain("up");
    expect(q.options.length).toBeGreaterThanOrEqual(1);
    expect(q.options.length).toBeLessThanOrEqual(4);
  });

  it("rejects an unsafe or legacy fallback prompt", () => {
    expect(() =>
      buildQuestion(
        { simplified: "旧", pinyin: "jiù", definitions: ["legacy fallback"] },
        1,
        POOL,
        3,
      ),
    ).toThrow(/not source-audited/);
    expect(() =>
      buildQuestion(
        {
          ...entry("某", "surname Mou"),
          definitionConfidence: "review",
          manualReviewStatus: "pending",
        },
        1,
        POOL,
        3,
      ),
    ).toThrow(/not source-audited/);
  });
});

describe("meaningLabel", () => {
  it("prefers primaryGloss and remains backward compatible", () => {
    expect(meaningLabel({ ...entry("好", "fine"), primaryGloss: "  good " })).toBe("good");
    expect(meaningLabel(entry("旧", "  legacy "))).toBe("legacy");
    expect(meaningLabel({ simplified: "x", pinyin: "x", definitions: [] })).toBe("");
  });
});

describe("dictionary-quality integration", () => {
  it("never presents an accepted synonym as a competing option", () => {
    const target = {
      ...entry("好", "fine"),
      primaryGloss: "good",
      acceptedGlosses: ["good", "fine"],
    };
    const synonym = {
      ...entry("佳", "fine"),
      primaryGloss: "fine",
      acceptedGlosses: ["fine", "good"],
    };
    const pool = [target, synonym, entry("坏", "bad"), entry("大", "large"), entry("小", "small")];
    const question = buildQuestion(target, 1, pool, 11);
    expect(question.options).toContain("good");
    expect(question.options).not.toContain("fine");
  });

  it("does not use alternate meanings from the same spelling as distractors", () => {
    const target = {
      ...entry("还", "still"),
      primaryGloss: "still",
      readings: [{ pinyin: "huán", primaryGloss: "to return", definitions: ["to return"] }],
    };
    const sameWordAlternate = { ...entry("还", "to return"), pinyin: "huán" };
    const pool = [target, sameWordAlternate, entry("给", "to give"), entry("走", "to walk"), entry("看", "to see")];
    const question = buildQuestion(target, 1, pool, 29);
    expect(question.options).not.toContain("to return");
  });

  it("rejects review-only and metadata-like distractors", () => {
    const unsafe = {
      ...entry("某", "surname Mou"),
      definitionConfidence: "review" as const,
      auditFlags: ["primary-surname"],
    };
    const pool = [entry("一", "one"), unsafe, entry("二", "two"), entry("三", "three"), entry("四", "four")];
    const question = buildQuestion(pool[0], 1, pool, 3);
    expect(question.options).not.toContain("surname Mou");
  });

  it("keeps manually reviewed archaic labels out of distractors", () => {
    const reviewed = {
      ...entry("给予", "(literary) to give; to accord; to render"),
      primaryGloss: "(literary) to give; to accord; to render",
      definitionConfidence: "high" as const,
      manualReviewStatus: "reviewed" as const,
      auditFlags: ["primary-archaic"],
    };
    const pool = [entry("一", "one"), reviewed, entry("二", "two"), entry("三", "three")];
    const question = buildQuestion(pool[0], 6, pool, 1);
    expect(question.options).not.toContain("(literary) to give; to accord; to render");
  });
});
