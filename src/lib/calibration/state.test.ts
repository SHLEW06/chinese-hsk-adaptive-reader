import { describe, expect, it } from "vitest";

import {
  applyBaseline,
  applyQuickSetup,
  applyStartFromScratch,
  applyVerificationOutcomes,
  calibrationProgress,
  emptyCalibrationState,
  gradeVerification,
  normalizeCalibrationState,
  reconcileCalibrationPlan,
  recordAnswer,
  resetCalibration,
  returnWordToStudy,
  resolveWordStatus,
  startComprehensive,
} from "./state";
import type {
  CalibrationState,
  CalibrationWordResult,
} from "@/types/calibration";
import type { SrsState } from "@/types/hskStudy";

const NOW = new Date("2026-07-14T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * DAY_MS).toISOString();
}

function result(
  outcome: CalibrationWordResult["outcome"],
  confidence: CalibrationWordResult["confidence"] = "low",
  level: CalibrationWordResult["level"] = 1,
): CalibrationWordResult {
  return { outcome, confidence, answeredAt: NOW.toISOString(), level };
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

const MASTERED = srs({ interval: 14, reps: 4 });
const LEARNING = srs({ interval: 0, reps: 0 });

function startedState(words: string[] = ["一", "二", "三", "四"]): CalibrationState {
  return startComprehensive(emptyCalibrationState(), {
    levels: [1],
    wordsByLevel: { 1: words },
    seed: 42,
    now: NOW,
    blockSize: 2,
  });
}

describe("normalizeCalibrationState", () => {
  it("returns the empty state for older records without calibration data", () => {
    expect(normalizeCalibrationState(null)).toMatchObject({
      status: "notStarted",
      results: {},
      baseline: {},
    });
    expect(normalizeCalibrationState(undefined).status).toBe("notStarted");
    expect(normalizeCalibrationState("junk").status).toBe("notStarted");
    expect(normalizeCalibrationState({ schemaVersion: 99 }).status).toBe("notStarted");
  });

  it("repairs missing maps and unknown status values", () => {
    const state = normalizeCalibrationState({
      schemaVersion: 1,
      status: "banana",
      results: ["not", "a", "map"],
    });
    expect(state.status).toBe("notStarted");
    expect(state.results).toEqual({});
    expect(state.baseline).toEqual({});
  });

  it("round-trips a valid state", () => {
    const original = applyBaseline(
      recordAnswer(startedState(), "一", result("known", "high"), NOW),
      {},
      NOW,
    );
    expect(normalizeCalibrationState(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });
});

describe("startComprehensive / recordAnswer / progress", () => {
  it("snapshots the plan and starts in progress", () => {
    const state = startedState();
    expect(state.status).toBe("inProgress");
    expect(state.method).toBe("comprehensive");
    expect(state.plan?.wordsByLevel[1]).toEqual(["一", "二", "三", "四"]);
    expect(state.results).toEqual({});
  });

  it("records answers, walks blocks in order, and resumes at the first gap", () => {
    let state = startedState();
    let progress = calibrationProgress(state);
    expect(progress.next).toEqual({ level: 1, word: "一", indexInLevel: 0 });
    expect(progress.currentBlock).toMatchObject({
      blockIndex: 0,
      blocksInLevel: 2,
      answeredInBlock: 0,
      blockLength: 2,
    });

    state = recordAnswer(state, "一", result("known", "high"), NOW);
    state = recordAnswer(state, "二", result("dontKnow"), NOW);
    progress = calibrationProgress(state);
    expect(progress.answered).toBe(2);
    expect(progress.known).toBe(1);
    expect(progress.dontKnow).toBe(1);
    // Next block begins exactly at the boundary — resumable mid-plan.
    expect(progress.next?.word).toBe("三");
    expect(progress.currentBlock).toMatchObject({ blockIndex: 1, answeredInBlock: 0 });
  });

  it("handles duplicate answers safely (last commit wins, no double count)", () => {
    let state = startedState();
    state = recordAnswer(state, "一", result("dontKnow"), NOW);
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    const progress = calibrationProgress(state);
    expect(progress.answered).toBe(1);
    expect(progress.known).toBe(1);
    expect(progress.dontKnow).toBe(0);
  });

  it("ignores answers when no calibration is in progress", () => {
    const state = emptyCalibrationState();
    expect(recordAnswer(state, "一", result("known"), NOW)).toBe(state);
  });

  it("removes unsafe saved-plan words without recording fabricated misses", () => {
    let state = startedState(["一", "旧", "二"]);
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    state = recordAnswer(state, "旧", result("missed"), NOW);

    const reconciled = reconcileCalibrationPlan(
      state,
      { 1: ["一", "二"] },
      new Date("2026-07-15T12:00:00.000Z"),
    );
    expect(reconciled.plan?.wordsByLevel[1]).toEqual(["一", "二"]);
    expect(reconciled.results).toEqual({ "一": result("known", "high") });
    expect(calibrationProgress(reconciled).next?.word).toBe("二");
  });

  it("preserves a valid saved plan byte-for-byte for deterministic resume", () => {
    const state = recordAnswer(startedState(), "一", result("known", "high"), NOW);
    expect(reconcileCalibrationPlan(state, { 1: ["一", "二", "三", "四"] }, NOW)).toBe(state);
  });
});

describe("applyBaseline", () => {
  it("turns known results into delayed-verification entries and finalizes", () => {
    let state = startedState();
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    state = recordAnswer(state, "二", result("known", "low"), NOW);
    state = recordAnswer(state, "三", result("missed"), NOW);
    state = recordAnswer(state, "四", result("dontKnow"), NOW);
    const applied = applyBaseline(state, {}, NOW);

    expect(applied.status).toBe("completed");
    expect(applied.completedAt).toBe(NOW.toISOString());
    expect(Object.keys(applied.baseline).sort()).toEqual(["一", "二"]);
    // High confidence verifies at ~21 days, low at ~7.
    expect(applied.baseline["一"].verifyAt).toBe(daysFromNow(21));
    expect(applied.baseline["二"].verifyAt).toBe(daysFromNow(7));
    // Completed state does not duplicate baseline-known words or retain the
    // finished plan, keeping a full HSK 1-6 document below persistence limits.
    expect(applied.results).toEqual({
      "三": result("missed"),
      "四": result("dontKnow"),
    });
    expect(applied.plan).toBeUndefined();
    expect(applied.seed).toBeUndefined();
    // Missed and don't-know words are NOT baseline-excluded.
    expect(applied.baseline["三"]).toBeUndefined();
    expect(applied.baseline["四"]).toBeUndefined();
  });

  it("never adds a word with genuine SRS history to the baseline", () => {
    let state = startedState();
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    const srsMap = { "一": MASTERED };
    const applied = applyBaseline(state, srsMap, NOW);
    expect(applied.baseline["一"]).toBeUndefined();
    // And the SRS map itself is untouched.
    expect(srsMap["一"]).toEqual(MASTERED);
  });

  it("keeps a full six-level completed state below the Firestore size limit", () => {
    const results = Object.fromEntries(
      Array.from({ length: 5_864 }, (_, index) => [
        `词${index}`,
        result("known", "high", ((index % 6) + 1) as CalibrationWordResult["level"]),
      ]),
    );
    const state: CalibrationState = {
      ...startedState(),
      plan: {
        levels: [1, 2, 3, 4, 5, 6],
        wordsByLevel: { 1: Object.keys(results) },
        blockSize: 50,
      },
      results,
    };

    const applied = applyBaseline(state, {}, NOW);
    expect(Object.keys(applied.baseline)).toHaveLength(5_864);
    expect(applied.results).toEqual({});
    expect(new TextEncoder().encode(JSON.stringify(applied)).byteLength).toBeLessThan(
      900_000,
    );
  });

  it("is not applied automatically — an interrupted calibration keeps an empty baseline", () => {
    let state = startedState();
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    expect(state.status).toBe("inProgress");
    expect(state.baseline).toEqual({});
    expect(state.baselineAppliedAt).toBeUndefined();
  });
});

describe("applyQuickSetup", () => {
  const wordsByLevel = {
    1: ["一", "二"],
    2: ["三", "四"],
    3: ["五", "六"],
  };

  it("excludes only levels strictly below the selected level", () => {
    const state = applyQuickSetup(emptyCalibrationState(), {
      level: 3,
      wordsByLevel,
      srsMap: {},
      now: NOW,
    });
    expect(Object.keys(state.baseline).sort()).toEqual(["一", "三", "二", "四"].sort());
    // The boundary level (3) is never wholly excluded.
    expect(state.baseline["五"]).toBeUndefined();
    expect(state.baseline["六"]).toBeUndefined();
    expect(state.status).toBe("completed");
    expect(state.method).toBe("quickSetup");
    expect(state.quickSetupLevel).toBe(3);
  });

  it("staggers verification dates instead of flooding one day", () => {
    const state = applyQuickSetup(emptyCalibrationState(), {
      level: 3,
      wordsByLevel,
      srsMap: {},
      now: NOW,
    });
    const dates = new Set(Object.values(state.baseline).map((e) => e.verifyAt));
    expect(dates.size).toBeGreaterThan(1);
    for (const date of dates) {
      expect(new Date(date).getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("existing history overrides the quick baseline", () => {
    const state = applyQuickSetup(emptyCalibrationState(), {
      level: 3,
      wordsByLevel,
      srsMap: { "一": MASTERED, "三": LEARNING },
      now: NOW,
    });
    expect(state.baseline["一"]).toBeUndefined();
    expect(state.baseline["三"]).toBeUndefined();
    expect(state.baseline["二"]).toBeDefined();
  });
});

describe("applyStartFromScratch", () => {
  it("records the deliberate choice without excluding anything", () => {
    const state = applyStartFromScratch(emptyCalibrationState(), NOW);
    expect(state.status).toBe("completed");
    expect(state.method).toBe("startFromScratch");
    expect(state.baseline).toEqual({});
    expect(state.results).toEqual({});
  });
});

describe("reset and recalibration", () => {
  it("reset clears only calibration-derived state", () => {
    const state = resetCalibration(NOW);
    expect(state).toEqual({
      ...emptyCalibrationState(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("timestamps reset so an older local calibration cannot win cloud sync", () => {
    const oldLocal = applyStartFromScratch(
      emptyCalibrationState(),
      new Date("2026-07-13T12:00:00.000Z"),
    );
    const cloudReset = resetCalibration(NOW);
    expect((oldLocal.updatedAt ?? "") < (cloudReset.updatedAt ?? "")).toBe(true);
  });

  it("recalibration replaces the prior baseline and keeps failed words out", () => {
    // First calibration: 一 and 二 assumed known.
    let first = startedState(["一", "二"]);
    first = recordAnswer(first, "一", result("known", "high"), NOW);
    first = recordAnswer(first, "二", result("known", "high"), NOW);
    first = applyBaseline(first, {}, NOW);

    // 二 fails verification → genuine SRS state now exists for it.
    first = applyVerificationOutcomes(first, { "二": false }, NOW);
    const srsMap = { "二": srs({ interval: 1, reps: 0, lapses: 1 }) };

    // Recalibrate; the learner claims 二 again — but genuine history wins.
    let second = startComprehensive(first, {
      levels: [1],
      wordsByLevel: { 1: ["一", "二"] },
      seed: 7,
      now: NOW,
    });
    // Prior baseline stays active until the new run is confirmed.
    expect(second.baseline["一"]).toBeDefined();
    second = recordAnswer(second, "一", result("known", "high"), NOW);
    second = recordAnswer(second, "二", result("known", "high"), NOW);
    second = applyBaseline(second, srsMap, NOW);

    expect(second.baseline["一"]).toBeDefined();
    expect(second.baseline["二"]).toBeUndefined();
  });

  it("returnWordToStudy removes a single word from the baseline", () => {
    let state = startedState(["一", "二"]);
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    state = recordAnswer(state, "二", result("known", "high"), NOW);
    state = applyBaseline(state, {}, NOW);
    state = returnWordToStudy(state, "一", NOW);
    expect(state.baseline["一"]).toBeUndefined();
    expect(state.baseline["二"]).toBeDefined();
  });
});

describe("gradeVerification", () => {
  it("passes on good with a maturing interval and genuine review metadata", () => {
    const { passed, srs: next } = gradeVerification("good", NOW);
    expect(passed).toBe(true);
    expect(next).toMatchObject({ interval: 21, reps: 1, lapses: 0 });
    expect(next.dueAt).toBe(daysFromNow(21));
    expect(next.lastReviewed).toBe(NOW.toISOString());
  });

  it("passes on easy with a longer interval", () => {
    const { passed, srs: next } = gradeVerification("easy", NOW);
    expect(passed).toBe(true);
    expect(next.interval).toBe(35);
  });

  it("fails on again/hard through the ordinary new-card path", () => {
    const again = gradeVerification("again", NOW);
    expect(again.passed).toBe(false);
    expect(again.srs).toMatchObject({ interval: 1, reps: 0, lapses: 1 });

    const hard = gradeVerification("hard", NOW);
    expect(hard.passed).toBe(false);
    expect(hard.srs.interval).toBe(1);
  });
});

describe("applyVerificationOutcomes", () => {
  function withBaseline(): CalibrationState {
    let state = startedState(["一", "二", "三"]);
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    state = recordAnswer(state, "二", result("known", "high"), NOW);
    state = recordAnswer(state, "三", result("known", "high"), NOW);
    return applyBaseline(state, {}, NOW);
  }

  it("removes verified and failed words from the baseline permanently", () => {
    const state = applyVerificationOutcomes(withBaseline(), { "一": true, "二": false }, NOW);
    expect(state.baseline["一"]).toBeUndefined();
    expect(state.baseline["二"]).toBeUndefined();
    expect(state.baseline["三"]).toBeDefined();
    expect(state.verifiedCount).toBe(1);
    expect(state.failedVerificationCount).toBe(1);
  });

  it("ignores outcomes for words that were never in the baseline", () => {
    const state = withBaseline();
    expect(applyVerificationOutcomes(state, { "外": true }, NOW)).toBe(state);
  });
});

describe("resolveWordStatus precedence", () => {
  it("genuine SRS state always outranks calibration", () => {
    let state = startedState(["一"]);
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    state = applyBaseline(state, {}, NOW);
    // Even with a lingering baseline entry, SRS wins.
    state = { ...state, baseline: { ...state.baseline, "一": state.baseline["一"] } };

    expect(resolveWordStatus(MASTERED, state, "一")).toBe("masteredThroughSrs");
    expect(resolveWordStatus(srs({ interval: 3, reps: 2 }), state, "一")).toBe("review");
    expect(resolveWordStatus(LEARNING, state, "一")).toBe("learning");
  });

  it("missed/don't-know results outrank the baseline; baseline outranks untested", () => {
    let state = startedState(["一", "二", "三"]);
    state = recordAnswer(state, "一", result("known", "high"), NOW);
    state = recordAnswer(state, "二", result("missed"), NOW);
    state = applyBaseline(state, {}, NOW);

    expect(resolveWordStatus(undefined, state, "一")).toBe("calibratedKnown");
    expect(resolveWordStatus(undefined, state, "二")).toBe("learning");
    expect(resolveWordStatus(undefined, state, "三")).toBe("untested");
  });
});
