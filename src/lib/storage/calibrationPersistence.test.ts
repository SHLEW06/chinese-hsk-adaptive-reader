import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as localStore from "./localStore";
import {
  classifyCalibrationState,
  resolveCalibrationLoad,
  UnsupportedCalibrationSchemaError,
} from "@/lib/calibration/load";
import {
  calibrationProgress,
  emptyCalibrationState,
  recordAnswer,
  startComprehensive,
} from "@/lib/calibration/state";
import type { CalibrationState, CalibrationWordResult } from "@/types/calibration";

/**
 * Interruption-safety tests for the localStorage-backed calibration paths:
 * every accepted answer is checkpointed durably, so a refresh, navigation, or
 * browser closure between answers loses nothing that was accepted. "Reload"
 * is simulated by re-reading storage from scratch, exactly like a fresh page.
 */

const NOW = new Date("2026-07-19T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

class MemoryStorage {
  private map = new Map<string, string>();
  failNextWrite = false;

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new DOMException("QuotaExceededError");
    }
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  raw(key: string): string | null {
    return this.getItem(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: storage } as unknown as Window &
    typeof globalThis);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function answer(
  outcome: CalibrationWordResult["outcome"] = "known",
  at: Date = NOW,
): CalibrationWordResult {
  return { outcome, confidence: "high", answeredAt: at.toISOString(), level: 1 };
}

const WORDS = ["一", "二", "三", "四", "五", "六"];

function started(now: Date = NOW): CalibrationState {
  return startComprehensive(emptyCalibrationState(), {
    levels: [1],
    wordsByLevel: { 1: WORDS },
    seed: 1,
    now,
    blockSize: 3,
  });
}

/** Fresh-page load, as the signed-out storage provider performs it. */
async function reload(): Promise<CalibrationState> {
  const load = classifyCalibrationState(await localStore.getCalibration());
  if (load.kind === "unsupportedVersion") throw new Error("unexpected unsupported");
  return load.state;
}

const FUTURE_STATE = {
  schemaVersion: 2,
  status: "completed",
  baselineGroups: { advanced: WORDS },
  updatedAt: NOW.toISOString(),
};

describe("per-answer checkpointing (signed out)", () => {
  it("persists a single answer well before five are accumulated", async () => {
    let state = started();
    await localStore.setCalibration(state);
    state = recordAnswer(state, "一", answer(), new Date(NOW.getTime() + 1000));
    await localStore.setCalibration(state);

    const restored = await reload();
    const progress = calibrationProgress(restored);
    expect(progress.answered).toBe(1);
    expect(progress.next?.word).toBe("二");
  });

  it("keeps two to four answers across a refresh or navigation", async () => {
    let state = started();
    await localStore.setCalibration(state);
    for (const [i, word] of (["一", "二", "三", "四"] as const).entries()) {
      state = recordAnswer(
        state,
        word,
        answer(i % 2 === 0 ? "known" : "dontKnow"),
        new Date(NOW.getTime() + i * 1000),
      );
      // Checkpoint after *every* accepted answer, not every fifth.
      await localStore.setCalibration(state);
    }

    const restored = await reload();
    const progress = calibrationProgress(restored);
    expect(progress.answered).toBe(4);
    expect(progress.known).toBe(2);
    expect(progress.dontKnow).toBe(2);
    // Exact next-question position: the first unanswered word in plan order.
    expect(progress.next).toEqual({ level: 1, word: "五", indexInLevel: 4 });
  });

  it("resumes at the exact next word after pause with one answer", async () => {
    let state = started();
    state = recordAnswer(state, "一", answer(), NOW);
    await localStore.setCalibration(state); // pause forces a save

    const restored = await reload();
    expect(restored.status).toBe("inProgress");
    expect(calibrationProgress(restored).next?.word).toBe("二");
  });

  it("does not double-count a duplicate answer submission", async () => {
    let state = started();
    state = recordAnswer(state, "一", answer("dontKnow"), NOW);
    await localStore.setCalibration(state);
    // Replay of the same word (e.g. a replayed block): last commit wins.
    state = recordAnswer(state, "一", answer("known"), new Date(NOW.getTime() + 1000));
    await localStore.setCalibration(state);
    await localStore.setCalibration(state); // idempotent duplicate write

    const progress = calibrationProgress(await reload());
    expect(progress.answered).toBe(1);
    expect(progress.known).toBe(1);
    expect(progress.dontKnow).toBe(0);
  });

  it("surfaces a failed write and recovers on the next full-state save", async () => {
    let state = started();
    await localStore.setCalibration(state);
    state = recordAnswer(state, "一", answer(), NOW);

    storage.failNextWrite = true;
    await expect(localStore.setCalibration(state)).rejects.toThrow();

    // The next answer's save carries the complete state, healing the gap.
    state = recordAnswer(state, "二", answer(), new Date(NOW.getTime() + 1000));
    await localStore.setCalibration(state);
    const progress = calibrationProgress(await reload());
    expect(progress.answered).toBe(2);
    expect(progress.next?.word).toBe("三");
  });

  it("never touches genuine SRS, saved-word, or reading-history data", async () => {
    const srsRaw = JSON.stringify({
      好: { interval: 14, ease: 2.5, reps: 4, lapses: 0, dueAt: NOW.toISOString() },
    });
    const savedRaw = JSON.stringify([{ id: "w1", simplified: "好", status: "known" }]);
    const historyRaw = JSON.stringify([{ id: "r1", title: "Reading", date: "2026-07-01" }]);
    window.localStorage.setItem("car.hskSrs", srsRaw);
    window.localStorage.setItem("car.savedWords", savedRaw);
    window.localStorage.setItem("car.readingHistory", historyRaw);

    let state = started();
    await localStore.setCalibration(state);
    state = recordAnswer(state, "一", answer(), NOW);
    await localStore.setCalibration(state);
    await localStore.setCalibrationCheckpoint("uid-1", state);

    expect(storage.raw("car.hskSrs")).toBe(srsRaw);
    expect(storage.raw("car.savedWords")).toBe(savedRaw);
    expect(storage.raw("car.readingHistory")).toBe(historyRaw);
  });
});

describe("signed-in local checkpoint", () => {
  it("round-trips per-user checkpoints without touching signed-out state", async () => {
    const signedOut = started();
    await localStore.setCalibration(signedOut);

    const checkpoint = recordAnswer(started(), "一", answer(), NOW);
    await localStore.setCalibrationCheckpoint("uid-1", checkpoint);

    expect(await localStore.getCalibrationCheckpoint("uid-1")).toEqual(
      JSON.parse(JSON.stringify(checkpoint)),
    );
    expect(await localStore.getCalibrationCheckpoint("uid-2")).toBeNull();
    // The signed-out slot is untouched by the per-user checkpoint.
    expect(await reload()).toEqual(JSON.parse(JSON.stringify(signedOut)));
  });

  it("resolves the newer of cloud and checkpoint at load, cloud winning ties", async () => {
    const older = started(new Date(NOW.getTime() - DAY_MS));
    const newer = recordAnswer(started(new Date(NOW.getTime() - DAY_MS)), "一", answer(), NOW);
    await localStore.setCalibrationCheckpoint("uid-1", newer);
    const checkpointRaw = await localStore.getCalibrationCheckpoint("uid-1");

    const load = resolveCalibrationLoad(JSON.parse(JSON.stringify(older)), checkpointRaw);
    expect(load.kind).toBe("valid");
    if (load.kind === "valid") {
      expect(calibrationProgress(load.state).answered).toBe(1);
    }
  });
});

describe("future-schema overwrite protection", () => {
  it("refuses to overwrite a future-version signed-out state and preserves it verbatim", async () => {
    window.localStorage.setItem("car.calibration", JSON.stringify(FUTURE_STATE));
    const before = storage.raw("car.calibration");

    await expect(localStore.setCalibration(started())).rejects.toThrow(
      UnsupportedCalibrationSchemaError,
    );
    expect(storage.raw("car.calibration")).toBe(before);
  });

  it("refuses to overwrite a future-version checkpoint and preserves it verbatim", async () => {
    const key = "car.calibrationCheckpoint.uid-1";
    window.localStorage.setItem(key, JSON.stringify(FUTURE_STATE));
    const before = storage.raw(key);

    await expect(
      localStore.setCalibrationCheckpoint("uid-1", started()),
    ).rejects.toThrow(UnsupportedCalibrationSchemaError);
    expect(storage.raw(key)).toBe(before);
  });

  it("loads future-version data as read-only unsupported, never as not-started", async () => {
    window.localStorage.setItem("car.calibration", JSON.stringify(FUTURE_STATE));
    const load = classifyCalibrationState(await localStore.getCalibration());
    expect(load).toEqual({ kind: "unsupportedVersion", schemaVersion: 2 });
  });

  it("still classifies older profiles without calibration data as writable absent", async () => {
    const load = classifyCalibrationState(await localStore.getCalibration());
    expect(load.kind).toBe("absent");
    await expect(localStore.setCalibration(started())).resolves.toBeUndefined();
  });
});
