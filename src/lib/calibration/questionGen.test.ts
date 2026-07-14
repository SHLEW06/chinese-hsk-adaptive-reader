import { describe, expect, it } from "vitest";

import { buildQuestion, meaningLabel } from "./questionGen";
import type { WordEntry } from "@/types/dictionary";

function entry(simplified: string, definition: string): WordEntry {
  return { simplified, pinyin: "x", definitions: [definition] };
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
});

describe("meaningLabel", () => {
  it("uses the first definition, trimmed", () => {
    expect(meaningLabel(entry("好", "  good "))).toBe("good");
    expect(meaningLabel({ simplified: "x", pinyin: "x", definitions: [] })).toBe("");
  });
});
