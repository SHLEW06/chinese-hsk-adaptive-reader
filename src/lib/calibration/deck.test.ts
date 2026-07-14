import { describe, expect, it } from "vitest";

import {
  applyCalibrationToPool,
  calibrationMetrics,
  completeVerificationCard,
} from "./deck";
import {
  applyBaseline,
  applyVerificationOutcomes,
  emptyCalibrationState,
  recordAnswer,
  startComprehensive,
} from "./state";
import { buildSession, pickDeck } from "@/lib/hsk-study/scheduler";
import { dueCounts } from "@/lib/hsk-study/mixedDeck";
import type { CalibrationState, CalibrationWordResult } from "@/types/calibration";
import type { SrsState } from "@/types/hskStudy";
import type { SavedWord } from "@/types/savedWord";

const NOW = new Date("2026-07-14T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function srs(partial: Partial<SrsState> = {}): SrsState {
  return {
    interval: 1,
    ease: 2.5,
    reps: 1,
    lapses: 0,
    dueAt: NOW.toISOString(),
    ...partial,
  };
}

function result(
  outcome: CalibrationWordResult["outcome"],
  confidence: CalibrationWordResult["confidence"] = "high",
): CalibrationWordResult {
  return { outcome, confidence, answeredAt: NOW.toISOString(), level: 1 };
}

/**
 * Calibrated fixture over six words:
 *  - knownFresh: known, verification in the future (21d) → excluded
 *  - knownDue:   known low-confidence, verification due at NOW+7d
 *  - missed / dontKnow: priority learning candidates
 *  - untested: never answered
 *  - reviewed: has genuine SRS state (due review)
 */
function fixture(): { state: CalibrationState; srsMap: Record<string, SrsState> } {
  let state = startComprehensive(emptyCalibrationState(), {
    levels: [1],
    wordsByLevel: { 1: ["knownFresh", "knownDue", "missed", "dontKnow", "untested"] },
    seed: 1,
    now: NOW,
  });
  state = recordAnswer(state, "knownFresh", result("known", "high"), NOW);
  state = recordAnswer(state, "knownDue", result("known", "low"), NOW);
  state = recordAnswer(state, "missed", result("missed"), NOW);
  state = recordAnswer(state, "dontKnow", result("dontKnow"), NOW);
  const srsMap = {
    reviewed: srs({ dueAt: new Date(NOW.getTime() - DAY_MS).toISOString() }),
  };
  return { state: applyBaseline(state, srsMap, NOW), srsMap };
}

/** 8 days after NOW: knownDue (7d) is due for verification, knownFresh (21d) is not. */
const LATER = new Date(NOW.getTime() + 8 * DAY_MS);

const POOL = ["reviewed", "knownFresh", "knownDue", "missed", "dontKnow", "untested"];

describe("applyCalibrationToPool", () => {
  it("hides baseline words until verification is due and prioritizes missed/unsure", () => {
    const { state, srsMap } = fixture();
    const { pool, verificationIds } = applyCalibrationToPool(
      POOL,
      (w) => w,
      srsMap,
      state,
      LATER,
    );
    // knownFresh (verify in 21d) is gone; everything else is present once.
    expect(pool).toEqual(["reviewed", "knownDue", "missed", "dontKnow", "untested"]);
    expect(verificationIds).toEqual(new Set(["knownDue"]));
  });

  it("keeps genuine SRS words untouched even if they linger in the baseline", () => {
    const { state, srsMap } = fixture();
    const tampered: CalibrationState = {
      ...state,
      baseline: {
        ...state.baseline,
        reviewed: { verifyAt: state.baseline["knownFresh"].verifyAt, confidence: "high", source: "comprehensive", level: 1 },
      },
    };
    const { pool, verificationIds } = applyCalibrationToPool(
      POOL,
      (w) => w,
      srsMap,
      tampered,
      LATER,
    );
    expect(pool).toContain("reviewed");
    expect(verificationIds.has("reviewed")).toBe(false);
  });

  it("emits each word at most once even with duplicate pool entries", () => {
    const { state, srsMap } = fixture();
    const { pool } = applyCalibrationToPool(
      [...POOL, "knownDue", "untested"],
      (w) => w,
      srsMap,
      state,
      LATER,
    );
    expect(pool.filter((w) => w === "knownDue")).toHaveLength(1);
    expect(pool.filter((w) => w === "untested")).toHaveLength(1);
  });

  it("passes through unchanged for learners with no calibration", () => {
    const { pool, verificationIds } = applyCalibrationToPool(
      POOL,
      (w) => w,
      {},
      emptyCalibrationState(),
      LATER,
    );
    expect(pool).toEqual(POOL);
    expect(verificationIds.size).toBe(0);
  });
});

describe("pickDeck over a calibrated pool", () => {
  it("selects due reviews first and admits check-ins and priority words before untested ones", () => {
    const { state, srsMap } = fixture();
    const { pool, verificationIds } = applyCalibrationToPool(
      POOL,
      (w) => w,
      srsMap,
      state,
      LATER,
    );
    const deck = pickDeck(pool, (w) => w, srsMap, { maxReviews: 10, maxNew: 3 }, LATER);
    const ids = deck.map((c) => c.id);

    // The genuine due review is present with its SRS state.
    const reviewed = deck.find((c) => c.id === "reviewed");
    expect(reviewed?.srs).toEqual(srsMap.reviewed);
    // maxNew=3 admits the check-in and both priority words — not "untested".
    expect(ids).toContain("knownDue");
    expect(ids).toContain("missed");
    expect(ids).toContain("dontKnow");
    expect(ids).not.toContain("untested");
    // The excluded baseline word never appears anywhere.
    expect(ids).not.toContain("knownFresh");
    // No card appears twice.
    expect(new Set(ids).size).toBe(ids.length);
    expect(verificationIds.has("knownDue")).toBe(true);
  });

  it("keeps ordinary due-review ordering (oldest due first) intact", () => {
    const { state } = fixture();
    const srsMap = {
      older: srs({ dueAt: new Date(NOW.getTime() - 3 * DAY_MS).toISOString() }),
      newer: srs({ dueAt: new Date(NOW.getTime() - DAY_MS).toISOString() }),
    };
    const { pool } = applyCalibrationToPool(
      ["newer", "older", "untested"],
      (w) => w,
      srsMap,
      state,
      LATER,
    );
    const deck = pickDeck(pool, (w) => w, srsMap, { maxReviews: 10, maxNew: 0 }, LATER);
    expect(deck.map((c) => c.id)).toEqual(["older", "newer"]);
  });
});

describe("completeVerificationCard", () => {
  it("marks the card done with the genuine post-verification SRS state", () => {
    const session = buildSession([
      { id: "knownDue", data: "knownDue" },
      { id: "other", data: "other" },
    ]);
    const passed = srs({ interval: 21, reps: 1 });
    const next = completeVerificationCard(session, "knownDue", passed);
    const card = next.cards.find((c) => c.id === "knownDue");
    expect(card?.done).toBe(true);
    expect(card?.srs).toEqual(passed);
    expect(next.cards.find((c) => c.id === "other")?.done).toBe(false);
    // Input state is not mutated.
    expect(session.cards.find((c) => c.id === "knownDue")?.done).toBe(false);
  });

  it("returns the state unchanged for an unknown card id", () => {
    const session = buildSession([{ id: "a", data: "a" }]);
    expect(completeVerificationCard(session, "missing", srs())).toBe(session);
  });
});

describe("calibrationMetrics", () => {
  it("never counts calibration-known words as mastered and keeps counts consistent", () => {
    const { state } = fixture();
    const srsMap = {
      mastered: srs({ interval: 14, reps: 4 }),
      learning: srs({ interval: 1, reps: 1 }),
    };
    const metrics = calibrationMetrics(srsMap, state, LATER);
    expect(metrics.masteredThroughSrs).toBe(1);
    expect(metrics.currentlyLearning).toBe(1);
    // knownFresh + knownDue estimated known; only knownDue is due for check-in.
    expect(metrics.estimatedKnown).toBe(2);
    expect(metrics.verificationsDue).toBe(1);
  });

  it("drops baseline words from estimated-known once genuine SRS state exists", () => {
    const { state } = fixture();
    const metrics = calibrationMetrics({ knownDue: srs() }, state, LATER);
    expect(metrics.estimatedKnown).toBe(1); // only knownFresh remains estimated
    expect(metrics.verificationsDue).toBe(0);
  });

  it("shrinks estimated-known as verification outcomes arrive", () => {
    const { state } = fixture();
    const afterPass = applyVerificationOutcomes(state, { knownDue: true }, LATER);
    expect(calibrationMetrics({}, afterPass, LATER).estimatedKnown).toBe(1);
    expect(afterPass.verifiedCount).toBe(1);
  });
});

describe("dueCounts with calibration", () => {
  const savedWord = (simplified: string): SavedWord => ({
    id: `id-${simplified}`,
    simplified,
    pinyin: "x",
    definitions: ["x"],
    status: "new",
    dateSaved: "2026-07-14",
    reviewCount: 0,
  });

  it("counts due verifications and excludes baseline words from fresh saved", () => {
    const { state, srsMap } = fixture();
    const counts = dueCounts({
      saved: [savedWord("knownFresh"), savedWord("untested")],
      calibration: state,
      now: LATER,
      srsMap,
    });
    expect(counts.verificationsDue).toBe(1); // knownDue
    expect(counts.freshSaved).toBe(1); // untested only — knownFresh is baseline
    expect(counts.reviewsDue).toBe(1); // reviewed
  });

  it("keeps legacy behavior when no calibration exists", () => {
    const counts = dueCounts({
      saved: [savedWord("a")],
      now: NOW,
      srsMap: {},
    });
    expect(counts).toEqual({
      reviewsDue: 0,
      freshSaved: 1,
      reviewsTomorrow: 0,
      verificationsDue: 0,
    });
  });
});
