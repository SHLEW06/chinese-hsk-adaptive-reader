import { describe, expect, it } from "vitest";

import {
  applyGrade,
  buildSession,
  gradeSrs,
  pickDeck,
  pickNext,
  remaining,
} from "./scheduler";

const NOW = new Date("2026-07-13T12:00:00.000Z");

describe("gradeSrs", () => {
  it("schedules a new card one day after a Good grade", () => {
    expect(gradeSrs(undefined, "good", NOW)).toMatchObject({
      interval: 1,
      ease: 2.5,
      reps: 1,
      lapses: 0,
      dueAt: "2026-07-14T12:00:00.000Z",
      lastReviewed: "2026-07-13T12:00:00.000Z",
    });
  });

  it("resets a review after Again without mutating its prior state", () => {
    const prior = {
      interval: 6,
      ease: 1.4,
      reps: 3,
      lapses: 1,
      dueAt: "2026-07-12T12:00:00.000Z",
    };

    expect(gradeSrs(prior, "again", NOW)).toMatchObject({
      interval: 1,
      ease: 1.3,
      reps: 0,
      lapses: 2,
      dueAt: "2026-07-14T12:00:00.000Z",
    });
    expect(prior).toEqual({
      interval: 6,
      ease: 1.4,
      reps: 3,
      lapses: 1,
      dueAt: "2026-07-12T12:00:00.000Z",
    });
  });
});

describe("pickDeck", () => {
  it("takes the oldest due reviews, caps new cards, and interleaves both", () => {
    const deck = pickDeck(
      ["new-a", "review-late", "review-old", "new-b", "new-c"],
      (word) => word,
      {
        "review-late": { interval: 1, ease: 2.5, reps: 1, lapses: 0, dueAt: "2026-07-13T11:00:00.000Z" },
        "review-old": { interval: 1, ease: 2.5, reps: 1, lapses: 0, dueAt: "2026-07-11T12:00:00.000Z" },
      },
      { maxReviews: 2, maxNew: 2 },
      NOW,
    );

    expect(deck.map((card) => card.id)).toEqual([
      "new-a",
      "review-old",
      "new-b",
      "review-late",
    ]);
  });
});

describe("in-session scheduling", () => {
  it("requeues a failed card and graduates it after two successful grades", () => {
    let session = buildSession([{ id: "wo", data: "我" }, { id: "ni", data: "你" }]);

    expect(pickNext(session)?.id).toBe("wo");
    session = applyGrade(session, "wo", "again", NOW);
    expect(pickNext(session)?.id).toBe("ni");

    session = applyGrade(session, "wo", "good", NOW);
    session = applyGrade(session, "wo", "good", NOW);

    expect(session.cards.find((card) => card.id === "wo")).toMatchObject({
      done: true,
      goodReps: 2,
    });
    expect(remaining(session)).toBe(1);
  });
});
