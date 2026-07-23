import { describe, expect, it } from "vitest";

import { _hydrateIndex, searchEntries } from "./dictionary";
import type { WordEntry } from "@/types/dictionary";

describe("dictionary search", () => {
  it("keeps secondary and alternate-reading definitions searchable", () => {
    const entry: WordEntry = {
      simplified: "还",
      traditional: "還",
      pinyin: "hái",
      primaryGloss: "still",
      acceptedGlosses: ["still", "yet"],
      definitions: ["still", "yet"],
      secondaryDefinitions: ["yet"],
      readings: [
        { pinyin: "hái", primaryGloss: "still", definitions: ["still", "yet"] },
        { pinyin: "huán", primaryGloss: "to return", definitions: ["to return", "to give back"] },
      ],
    };
    _hydrateIndex([entry], 1);

    expect(searchEntries("yet")).toContainEqual(entry);
    expect(searchEntries("give back")).toContainEqual(entry);
  });
});
