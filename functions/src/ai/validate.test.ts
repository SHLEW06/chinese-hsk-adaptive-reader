import { describe, expect, it } from "vitest";
import {
  MAX_RULEBASED_JSON_BYTES,
  validateRuleBasedBatch,
} from "./validate";

describe("validateRuleBasedBatch", () => {
  it("accepts omitted and bounded rule-based entries", () => {
    expect(validateRuleBasedBatch(undefined, 2)).toEqual([]);
    expect(validateRuleBasedBatch([{ grammar: [] }], 2)).toEqual([
      { grammar: [] },
    ]);
  });

  it("rejects non-array input and entries beyond the sentence count", () => {
    expect(() => validateRuleBasedBatch({}, 1)).toThrow(
      "ruleBased must be an array",
    );
    expect(() => validateRuleBasedBatch([{}, {}], 1)).toThrow(
      "ruleBased may contain at most 1 entries",
    );
  });

  it("rejects an oversized entry", () => {
    const oversized = "x".repeat(MAX_RULEBASED_JSON_BYTES + 1);
    expect(() => validateRuleBasedBatch([{ oversized }], 1)).toThrow(
      "ruleBased too large",
    );
  });
});
