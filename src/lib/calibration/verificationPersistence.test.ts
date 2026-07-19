import { describe, expect, it } from "vitest";

import { applyCalibrationToPool } from "./deck";
import {
  applyBaseline,
  applyVerificationOutcomes,
  emptyCalibrationState,
  gradeVerification,
  recordAnswer,
  resolveWordStatus,
  startComprehensive,
} from "./state";
import type { CalibrationState, CalibrationWordResult } from "@/types/calibration";
import type { SrsState } from "@/types/hskStudy";

/**
 * Interrupted-verification safety. The study session persists a check-in's
 * outcome at its *first grade* — seeded (pass) or new-card (fail) SRS state
 * plus the calibration baseline removal — so these tests drive exactly that
 * persisted data through a simulated interruption: the session is abandoned,
 * the page reloads, and a new session is built from storage alone.
 */

const NOW = new Date("2026-07-19T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function result(
  outcome: CalibrationWordResult["outcome"],
  confidence: CalibrationWordResult["confidence"] = "low",
): CalibrationWordResult {
  return { outcome, confidence, answeredAt: NOW.toISOString(), level: 1 };
}

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

const POOL = ["checkin", "otherKnown", "reviewed", "untested"];

/** Baseline with a due check-in ("checkin"), a not-yet-due baseline word,
 * one genuinely reviewed word, and one untested word. */
function fixture(): {
  calibration: CalibrationState;
  srsMap: Record<string, SrsState>;
} {
  let state = startComprehensive(emptyCalibrationState(), {
    levels: [1],
    wordsByLevel: { 1: ["checkin", "otherKnown"] },
    seed: 1,
    now: new Date(NOW.getTime() - 10 * DAY_MS),
  });
  const answeredAt = new Date(NOW.getTime() - 10 * DAY_MS);
  state = recordAnswer(state, "checkin", result("known", "low"), answeredAt);
  state = recordAnswer(state, "otherKnown", result("known", "high"), answeredAt);
  // Applied 10 days ago: low-confidence (7d) is due, high-confidence (21d) is not.
  state = applyBaseline(state, {}, answeredAt);
  const srsMap: Record<string, SrsState> = {
    reviewed: srs({ interval: 3, reps: 2, dueAt: new Date(NOW.getTime() - DAY_MS).toISOString() }),
  };
  return { calibration: state, srsMap };
}

function verificationDue(
  calibration: CalibrationState,
  srsMap: Record<string, SrsState>,
): Set<string> {
  return applyCalibrationToPool(POOL, (w) => w, srsMap, calibration, NOW)
    .verificationIds;
}

describe("interrupted verification", () => {
  it("a passed check-in survives session abandonment with genuine seeded SRS state", () => {
    const { calibration, srsMap } = fixture();
    expect(verificationDue(calibration, srsMap).has("checkin")).toBe(true);

    // First grade: persisted immediately (SRS seed + baseline removal)…
    const graded = gradeVerification("good", NOW);
    const persistedSrs: Record<string, SrsState> = { ...srsMap, checkin: graded.srs };
    const persistedCalibration = applyVerificationOutcomes(
      calibration,
      { checkin: graded.passed },
      NOW,
    );
    // …then the session is abandoned. Nothing else runs.

    expect(persistedCalibration.baseline.checkin).toBeUndefined();
    expect(persistedCalibration.verifiedCount).toBe(1);
    expect(persistedSrs.checkin).toMatchObject({ interval: 21, reps: 1, lapses: 0 });
    expect(resolveWordStatus(persistedSrs.checkin, persistedCalibration, "checkin")).toBe(
      "review",
    );
  });

  it("a failed check-in immediately leaves the baseline and enters active learning", () => {
    const { calibration, srsMap } = fixture();

    const graded = gradeVerification("again", NOW);
    const persistedSrs: Record<string, SrsState> = { ...srsMap, checkin: graded.srs };
    const persistedCalibration = applyVerificationOutcomes(
      calibration,
      { checkin: graded.passed },
      NOW,
    );

    expect(persistedCalibration.baseline.checkin).toBeUndefined();
    expect(persistedCalibration.failedVerificationCount).toBe(1);
    expect(persistedSrs.checkin).toMatchObject({ interval: 1, reps: 0, lapses: 1 });
    expect(resolveWordStatus(persistedSrs.checkin, persistedCalibration, "checkin")).toBe(
      "learning",
    );
    // A rebuilt session can never re-hide the word behind the old baseline.
    const rebuilt = applyCalibrationToPool(POOL, (w) => w, persistedSrs, persistedCalibration, NOW);
    expect(rebuilt.pool).toContain("checkin");
    expect(rebuilt.verificationIds.has("checkin")).toBe(false);
  });

  it("reloading after an interrupted verification does not offer the check-in again", () => {
    const { calibration, srsMap } = fixture();
    const graded = gradeVerification("good", NOW);
    const persistedSrs: Record<string, SrsState> = { ...srsMap, checkin: graded.srs };
    const persistedCalibration = applyVerificationOutcomes(calibration, { checkin: true }, NOW);

    // Fresh page load: session rebuilt purely from persisted stores.
    expect(verificationDue(persistedCalibration, persistedSrs).has("checkin")).toBe(false);
    // The still-pending baseline word stays excluded, untouched by the interruption.
    expect(persistedCalibration.baseline.otherKnown).toBeDefined();
  });

  it("a duplicate verification submission is a no-op and never double-counts", () => {
    const { calibration } = fixture();
    const once = applyVerificationOutcomes(calibration, { checkin: true }, NOW);
    const twice = applyVerificationOutcomes(once, { checkin: true }, NOW);
    expect(twice).toBe(once); // identical reference → no second write is issued
    expect(twice.verifiedCount).toBe(1);
    expect(twice.failedVerificationCount).toBe(0);
  });

  it("genuine SRS history and due-review state remain untouched by verification", () => {
    const { calibration, srsMap } = fixture();
    const reviewedBefore = JSON.parse(JSON.stringify(srsMap.reviewed)) as SrsState;

    const graded = gradeVerification("again", NOW);
    const persistedSrs: Record<string, SrsState> = { ...srsMap, checkin: graded.srs };
    const persistedCalibration = applyVerificationOutcomes(calibration, { checkin: false }, NOW);

    expect(persistedSrs.reviewed).toEqual(reviewedBefore);
    // The genuinely reviewed word still enters the session as a due review.
    const rebuilt = applyCalibrationToPool(POOL, (w) => w, persistedSrs, persistedCalibration, NOW);
    expect(rebuilt.pool).toContain("reviewed");
    expect(rebuilt.verificationIds.has("reviewed")).toBe(false);
    expect(new Date(persistedSrs.reviewed.dueAt).getTime()).toBeLessThanOrEqual(NOW.getTime());
  });
});
