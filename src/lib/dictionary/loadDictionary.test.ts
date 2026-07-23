import { describe, expect, it } from "vitest";

import { expandCompactEntry } from "./loadDictionary";

describe("expandCompactEntry", () => {
  it("loads the audited compact schema", () => {
    const entry = expandCompactEntry({
      s: "还",
      t: "還",
      p: "hái",
      g: "still",
      a: ["still", "yet"],
      d: ["still", "yet"],
      ds: "curated",
      dc: "medium",
      mr: "reviewed",
      af: ["multiple-pronunciations"],
      r: [
        { p: "hái", g: "still", a: ["still", "yet"], d: ["still", "yet"], s: "hsk" },
        { p: "huán", g: "to return", d: ["to return"], s: "hsk" },
      ],
    });

    expect(entry).toMatchObject({
      simplified: "还",
      primaryReading: "hái",
      primaryGloss: "still",
      acceptedGlosses: ["still", "yet"],
      secondaryDefinitions: ["yet"],
      definitionSource: "curated",
      definitionConfidence: "medium",
      manualReviewStatus: "reviewed",
    });
    expect(entry.readings?.[1]).toMatchObject({
      pinyin: "huán",
      primaryGloss: "to return",
      acceptedGlosses: ["to return"],
    });
  });

  it("loads legacy entries that only contain pinyin and definitions", () => {
    const entry = expandCompactEntry({ s: "旧", p: "jiù", d: ["old", "former"] });
    expect(entry.primaryReading).toBe("jiù");
    expect(entry.primaryGloss).toBe("old");
    expect(entry.acceptedGlosses).toEqual(["old"]);
    expect(entry.secondaryDefinitions).toEqual(["former"]);
  });
});
