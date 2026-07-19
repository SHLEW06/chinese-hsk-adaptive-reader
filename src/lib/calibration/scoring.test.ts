import { describe, expect, it } from "vitest";

import { scoreAnswer } from "./scoring";
import type { CalibrationQuestion } from "@/types/calibration";

const NOW = new Date("2026-07-14T12:00:00.000Z");

const QUESTION: CalibrationQuestion = {
  word: "学习",
  level: 1,
  options: ["to eat", "to study", "book", "teacher"],
  answer: 1,
};

describe("scoreAnswer", () => {
  it("scores a correct high-confidence answer as known/high", () => {
    expect(scoreAnswer(QUESTION, "know", 1, NOW)).toEqual({
      outcome: "known",
      confidence: "high",
      answeredAt: "2026-07-14T12:00:00.000Z",
      level: 1,
    });
  });

  it("scores a correct low-confidence answer as known/low", () => {
    expect(scoreAnswer(QUESTION, "unsure", 1, NOW)).toMatchObject({
      outcome: "known",
      confidence: "low",
    });
  });

  it("scores a wrong pick as missed even when the learner claimed to know it", () => {
    expect(scoreAnswer(QUESTION, "know", 0, NOW)).toMatchObject({
      outcome: "missed",
      confidence: "low",
    });
  });

  it("scores don't-know without requiring a meaning pick", () => {
    expect(scoreAnswer(QUESTION, "dontKnow", null, NOW)).toMatchObject({
      outcome: "dontKnow",
    });
  });

  it("never scores malformed input as known", () => {
    expect(scoreAnswer(QUESTION, "know", null, NOW).outcome).toBe("missed");
    expect(scoreAnswer(QUESTION, "know", -1, NOW).outcome).toBe("missed");
    expect(scoreAnswer(QUESTION, "know", 4, NOW).outcome).toBe("missed");
    expect(scoreAnswer(QUESTION, "unsure", 1.5, NOW).outcome).toBe("missed");
    expect(scoreAnswer(QUESTION, "unsure", Number.NaN, NOW).outcome).toBe("missed");
  });

  it("is deterministic for a fixed clock", () => {
    const a = scoreAnswer(QUESTION, "know", 1, NOW);
    const b = scoreAnswer(QUESTION, "know", 1, NOW);
    expect(a).toEqual(b);
  });
});
