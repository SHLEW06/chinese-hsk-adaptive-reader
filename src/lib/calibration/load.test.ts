import { describe, expect, it } from "vitest";

import {
  assertCalibrationOverwriteSafe,
  classifyCalibrationState,
  resolveCalibrationLoad,
  UnsupportedCalibrationSchemaError,
} from "./load";
import {
  applyStartFromScratch,
  emptyCalibrationState,
  recordAnswer,
  startComprehensive,
} from "./state";
import type { CalibrationState, CalibrationWordResult } from "@/types/calibration";

const NOW = new Date("2026-07-19T12:00:00.000Z");
const EARLIER = new Date("2026-07-18T12:00:00.000Z");

function result(outcome: CalibrationWordResult["outcome"]): CalibrationWordResult {
  return { outcome, confidence: "high", answeredAt: NOW.toISOString(), level: 1 };
}

function validState(now: Date = NOW): CalibrationState {
  return startComprehensive(emptyCalibrationState(), {
    levels: [1],
    wordsByLevel: { 1: ["一", "二"] },
    seed: 1,
    now,
  });
}

/** A payload shaped like what a hypothetical newer client would write. */
const FUTURE_STATE = {
  schemaVersion: 2,
  status: "completed",
  baselineGroups: { advanced: ["一", "二"] },
  updatedAt: NOW.toISOString(),
};

describe("classifyCalibrationState", () => {
  it("classifies missing data as absent with an empty writable state", () => {
    for (const raw of [null, undefined]) {
      const load = classifyCalibrationState(raw);
      expect(load.kind).toBe("absent");
      if (load.kind === "absent") {
        expect(load.state).toEqual(emptyCalibrationState());
      }
    }
  });

  it("classifies well-formed current-version state as valid and round-trips it", () => {
    const original = recordAnswer(validState(), "一", result("known"), NOW);
    const load = classifyCalibrationState(JSON.parse(JSON.stringify(original)));
    expect(load.kind).toBe("valid");
    if (load.kind === "valid") expect(load.state).toEqual(original);
  });

  it("classifies structurally broken current-version data as malformed, not unsupported", () => {
    const cases: unknown[] = [
      "junk",
      42,
      ["not", "an", "object"],
      { schemaVersion: 1, status: "banana", results: {}, baseline: {} },
      { schemaVersion: 1, status: "inProgress", results: ["array"], baseline: {} },
      { schemaVersion: 1, status: "inProgress", results: {}, baseline: null },
      { schemaVersion: 1 },
      { status: "inProgress", results: {}, baseline: {} }, // version missing
      { schemaVersion: "2", status: "completed" }, // non-numeric version claim
    ];
    for (const raw of cases) {
      const load = classifyCalibrationState(raw);
      expect(load.kind).toBe("malformed");
      if (load.kind === "malformed") {
        // Repaired into something the app can safely hold in memory.
        expect(load.state.results).toBeTypeOf("object");
        expect(load.state.baseline).toBeTypeOf("object");
      }
    }
  });

  it("classifies integer future versions as unsupported and keeps the version", () => {
    for (const version of [2, 3, 99]) {
      const load = classifyCalibrationState({ ...FUTURE_STATE, schemaVersion: version });
      expect(load).toEqual({ kind: "unsupportedVersion", schemaVersion: version });
    }
  });

  it("keeps malformed current data distinct from valid future data", () => {
    expect(classifyCalibrationState({ schemaVersion: 1, status: "???" }).kind).toBe(
      "malformed",
    );
    expect(classifyCalibrationState(FUTURE_STATE).kind).toBe("unsupportedVersion");
  });
});

describe("assertCalibrationOverwriteSafe", () => {
  it("permits overwriting absent, valid, and malformed data", () => {
    expect(() => assertCalibrationOverwriteSafe(null)).not.toThrow();
    expect(() => assertCalibrationOverwriteSafe(validState())).not.toThrow();
    expect(() => assertCalibrationOverwriteSafe({ schemaVersion: 1 })).not.toThrow();
    expect(() => assertCalibrationOverwriteSafe("junk")).not.toThrow();
  });

  it("refuses to overwrite future-version data", () => {
    expect(() => assertCalibrationOverwriteSafe(FUTURE_STATE)).toThrow(
      UnsupportedCalibrationSchemaError,
    );
    try {
      assertCalibrationOverwriteSafe(FUTURE_STATE);
    } catch (error) {
      expect((error as UnsupportedCalibrationSchemaError).schemaVersion).toBe(2);
    }
  });
});

describe("resolveCalibrationLoad", () => {
  it("returns absent when neither cloud nor checkpoint exists (older profiles)", () => {
    const load = resolveCalibrationLoad(null, null);
    expect(load.kind).toBe("absent");
  });

  it("prefers a newer local checkpoint over an older cloud document", () => {
    const cloud = validState(EARLIER);
    const checkpoint = recordAnswer(validState(EARLIER), "一", result("known"), NOW);
    const load = resolveCalibrationLoad(
      JSON.parse(JSON.stringify(cloud)),
      JSON.parse(JSON.stringify(checkpoint)),
    );
    expect(load.kind).toBe("valid");
    if (load.kind === "valid") expect(load.state).toEqual(checkpoint);
  });

  it("prefers the cloud document when it is newer or tied", () => {
    const checkpoint = validState(EARLIER);
    const cloud = applyStartFromScratch(emptyCalibrationState(), NOW);
    const newer = resolveCalibrationLoad(cloud, checkpoint);
    expect(newer.kind).toBe("valid");
    if (newer.kind === "valid") expect(newer.state).toEqual(cloud);

    const tied = resolveCalibrationLoad(cloud, JSON.parse(JSON.stringify(cloud)));
    if (tied.kind === "valid") expect(tied.state).toEqual(cloud);
  });

  it("uses a valid checkpoint over an absent cloud document", () => {
    const checkpoint = validState();
    const load = resolveCalibrationLoad(null, checkpoint);
    expect(load.kind).toBe("valid");
    if (load.kind === "valid") expect(load.state).toEqual(checkpoint);
  });

  it("never trusts a malformed checkpoint over the cloud", () => {
    const cloud = validState(EARLIER);
    const load = resolveCalibrationLoad(cloud, {
      schemaVersion: 1,
      status: "banana",
      updatedAt: NOW.toISOString(),
    });
    expect(load.kind).toBe("valid");
    if (load.kind === "valid") expect(load.state).toEqual(cloud);
  });

  it("future-version cloud data wins over any older local checkpoint", () => {
    const checkpoint = recordAnswer(validState(), "一", result("known"), NOW);
    const load = resolveCalibrationLoad(FUTURE_STATE, checkpoint);
    expect(load).toEqual({ kind: "unsupportedVersion", schemaVersion: 2 });
  });
});
