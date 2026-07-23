import { beforeAll, describe, expect, it } from "vitest";

import {
  buildAuditSummary,
  buildDictionary,
  canonicalPinyin,
  compactEntry,
  numberedToDiacritic,
  parseCedictText,
  parseHskData,
} from "./dictionary-quality.mjs";
import { buildFromPinnedInputs } from "../build-dictionary.mjs";

function hskItem({ simplified, level = ["new-1"], frequency = 1, pos = ["n"], forms }) {
  return {
    simplified,
    level,
    frequency,
    pos,
    forms: forms.map(([numeric, pinyin, meanings, traditional = simplified]) => ({
      traditional,
      transcriptions: { numeric, pinyin },
      meanings,
    })),
  };
}

function build({ cedict, hsk = [], overrides = [], manualReviews = [] }) {
  return buildDictionary({
    cedictMap: parseCedictText(cedict),
    hskMap: parseHskData(hsk),
    overrides,
    manualReviews,
  });
}

describe("dictionary-quality builder", () => {
  it("uses HSK pinyin and meanings for the learner primary gloss", () => {
    const { entries } = build({
      cedict: [
        "便宜 便宜 [bian4 yi2] /convenient/",
        "便宜 便宜 [pian2 yi5] /cheap; inexpensive/a petty advantage/to let sb off lightly/",
      ].join("\n"),
      hsk: [
        hskItem({
          simplified: "便宜",
          level: ["new-2"],
          pos: ["a", "v", "an"],
          forms: [
            ["bian4 yi2", "biàn yí", ["convenient"]],
            ["pian2 yi5", "pián yi", ["cheap", "inexpensive", "small advantages", "to let sb off lightly"]],
          ],
        }),
      ],
    });

    const entry = entries.find((item) => item.simplified === "便宜");
    expect(entry.pinyin).toBe("pián yi");
    expect(entry.primaryGloss).toBe("cheap");
    expect(entry.definitions).toEqual(
      expect.arrayContaining(["cheap", "inexpensive", "small advantages", "to let sb off lightly"]),
    );
    expect(entry.definitions).not.toContain("convenient");
    expect(entry.readings?.map((reading) => [reading.pinyin, reading.primaryGloss])).toContainEqual([
      "biàn yí",
      "convenient",
    ]);
  });

  it("separates definitions by pronunciation while preserving compact legacy fields", () => {
    const { entries } = build({
      cedict: [
        "還 还 [hai2] /still/yet/also/",
        "還 还 [huan2] /to return/to give back/",
      ].join("\n"),
      hsk: [
        hskItem({
          simplified: "还",
          pos: ["d", "v"],
          forms: [
            ["hai2", "hái", ["still", "yet", "also"]],
            ["huan2", "huán", ["to return", "to give back"]],
          ],
        }),
      ],
      overrides: [
        {
          simplified: "还",
          pinyin: "hái",
          primaryGloss: "still",
          acceptedGlosses: ["still", "yet", "also"],
          rationale: "Prefer the HSK adverb reading in this fixture.",
          sourceNote: "test fixture hai2",
        },
      ],
    });

    const entry = entries.find((item) => item.simplified === "还");
    expect(entry.primaryGloss).toBe("still");
    expect(entry.definitions).toEqual(["still", "yet", "also"]);
    expect(entry.readings).toHaveLength(2);

    const compact = compactEntry(entry);
    expect(compact).toMatchObject({
      s: "还",
      p: "hái",
      g: "still",
      d: ["still", "yet", "also"],
      h3: 1,
      hl: 1,
    });
    expect(compact.r?.find((reading) => reading.p === "huán")?.d).toEqual(["to return", "to give back"]);
  });

  it("requires curated overrides to be source-backed and documented", () => {
    expect(() =>
      build({
        cedict: "好 好 [hao3] /good/",
        overrides: [
          {
            simplified: "好",
            pinyin: "hǎo",
            primaryGloss: "excellent",
            acceptedGlosses: ["excellent"],
            rationale: "Unsupported by source.",
            sourceNote: "test",
          },
        ],
      }),
    ).toThrow(/not source-backed/);
  });

  it("requires curated secondary definitions to be source-backed", () => {
    expect(() =>
      build({
        cedict: "好 好 [hao3] /good/",
        overrides: [
          {
            simplified: "好",
            pinyin: "hǎo",
            primaryGloss: "good",
            acceptedGlosses: ["good"],
            secondaryDefinitions: ["excellent"],
            rationale: "Unsupported secondary fixture.",
            sourceNote: "test",
          },
        ],
      }),
    ).toThrow(/not source-backed/);
  });

  it("rejects a surname homograph when an ordinary meaning exists", () => {
    const { entries } = build({
      cedict: [
        "錢 钱 [Qian2] /surname Qian/",
        "錢 钱 [qian2] /money/coin/",
      ].join("\n"),
    });
    const entry = entries.find((item) => item.simplified === "钱");
    expect(entry.primaryGloss).toBe("coin");
    expect(entry.primaryGloss).not.toMatch(/surname/i);
  });

  it("rejects reference-only and variant-only candidates when lexical meanings exist", () => {
    const { entries } = build({
      cedict: [
        "測 测 [ce4] /variant of 測試|测试[ce4 shi4]/",
        "測 测 [ce4] /to measure/",
        "瞧 瞧 [qiao2] /see 看[kan4]/",
        "瞧 瞧 [qiao2] /to look at/",
      ].join("\n"),
    });
    expect(entries.find((item) => item.simplified === "测")?.primaryGloss).toBe("to measure");
    expect(entries.find((item) => item.simplified === "瞧")?.primaryGloss).toBe("to look at");
  });

  it("rejects archaic and proper-name candidates when modern lexical meanings exist", () => {
    const { entries } = build({
      cedict: [
        "某 某 [mou3] /(archaic) so-and-so/person/",
        "王 王 [Wang2] /surname Wang/",
        "王 王 [wang2] /king/",
      ].join("\n"),
    });
    expect(entries.find((item) => item.simplified === "某")?.primaryGloss).toBe("person");
    expect(entries.find((item) => item.simplified === "王")?.primaryGloss).toBe("king");
  });

  it("keeps a common classifier primary over an unsuitable alternate reading", () => {
    const { entries } = build({
      cedict: [
        "個 个 [ge3] /used in 個舊|个旧[Ge4 jiu4]/",
        "個 个 [ge4] /classifier for people or objects/",
      ].join("\n"),
    });
    const entry = entries.find((item) => item.simplified === "个");
    expect(entry.pinyin).toBe("gè");
    expect(entry.primaryGloss).toBe("classifier for people or objects");
  });

  it("records HSK accepted alternatives without mixing another pronunciation", () => {
    const { entries } = build({
      cedict: "種 种 [zhong3] /kind/type/\n種 种 [zhong4] /to plant/",
      hsk: [
        hskItem({
          simplified: "种",
          pos: ["q", "n", "v"],
          forms: [
            ["zhong3", "zhǒng", ["kind", "type"]],
            ["zhong4", "zhòng", ["to plant"]],
          ],
        }),
      ],
      overrides: [{
        simplified: "种",
        pinyin: "zhǒng",
        primaryGloss: "kind",
        acceptedGlosses: ["kind", "type"],
        rationale: "Test classifier reading.",
        sourceNote: "test source",
      }],
    });
    const entry = entries.find((item) => item.simplified === "种");
    expect(entry.acceptedGlosses).toEqual(["kind", "type"]);
    expect(entry.acceptedGlosses).not.toContain("to plant");
    expect(entry.readings?.find((reading) => reading.pinyin === "zhòng")?.definitions).toContain("to plant");
  });

  it("does not let CC-CEDICT source order alone choose a non-HSK gloss", () => {
    const { entries } = build({
      cedict: "甲 甲 [jia3] /a lengthy explanatory phrase with many, many clauses/first/",
    });
    expect(entries.find((item) => item.simplified === "甲")?.primaryGloss).toBe("first");
  });

  it("can resolve source reference glosses through their target entries", () => {
    const { entries } = build({
      cedict: [
        "幹嗎 干吗 [gan4 ma2] /variant of 幹嘛|干嘛[gan4 ma2]/",
        "幹嘛 干嘛 [gan4 ma2] /what are you doing?/whatever for?/why on earth?/",
      ].join("\n"),
      hsk: [
        hskItem({
          simplified: "干吗",
          pos: ["r"],
          forms: [["gan4 ma2", "gàn má", ["see 干嘛"]]],
        }),
      ],
    });

    const entry = entries.find((item) => item.simplified === "干吗");
    expect(entry.primaryGloss).not.toMatch(/^(?:see|variant of)\b/);
    expect(entry.auditFlags).toContain("resolved-source-reference");
    expect(entry.secondaryDefinitions).toContain("see 干嘛");
  });

  it("uses a matching source form to recover a stripped HSK target reading", () => {
    const { entries, auditRecords } = build({
      cedict: [
        "紀錄 纪录 [ji4 lu4] /variant of 記錄|记录[ji4 lu4]/",
        "記錄 记录 [ji4 lu4] /to record/record (written account)/",
      ].join("\n"),
      hsk: [
        hskItem({
          simplified: "纪录",
          level: ["new-3"],
          forms: [["ji4 lu4", "jì lù", ["variant of 记录"]]],
        }),
      ],
    });
    expect(entries.find((item) => item.simplified === "纪录")?.primaryGloss).toBe("to record");
    expect(auditRecords.find((item) => item.simplified === "纪录")?.sourceNote).toContain(
      "记录[ji4 lu4]",
    );
  });

  it("resolves references through the explicitly named pronunciation", () => {
    const { entries } = build({
      cedict: [
        "墬 墬 [di4] /variant of 地[di4]/",
        "地 地 [de5] /-ly/",
        "地 地 [di4] /earth/ground/",
        "刱 刱 [chuang4] /variant of 創|创[chuang1]/",
        "創 创 [chuang1] /wound/",
        "創 创 [chuang4] /to begin/",
        "盤川 盘川 [pan2 chuan1] /see 盤纏|盘缠[pan2 chan5]/",
        "盤纏 盘缠 [pan2 chan5] /travel expenses/",
        "盤纏 盘缠 [pan2 chan2] /to coil/",
      ].join("\n"),
    });

    expect(entries.find((item) => item.simplified === "墬")?.primaryGloss).toBe("earth");
    expect(entries.find((item) => item.simplified === "刱")?.primaryGloss).toBe("wound");
    expect(entries.find((item) => item.simplified === "盘川")?.primaryGloss).toBe("travel expenses");
  });

  it("preserves a reference when its named pronunciation is absent", () => {
    const { entries } = build({
      cedict: "異 异 [yi4] /variant of 行[hang4]/\n行 行 [hang2] /row/\n行 行 [xing2] /to walk/",
    });
    const entry = entries.find((item) => item.simplified === "异");
    expect(entry?.primaryGloss).toBe("variant of 行[hang4]");
    expect(entry?.manualReviewStatus).toBe("pending");
    expect(entry?.auditFlags).toContain("primary-reference-only");
  });

  it("honors source-qualified excluded target senses", () => {
    const { entries } = build({
      cedict: [
        '紀錄 纪录 [ji4 lu4] /variant of 記錄|记录[ji4 lu4] (but in Taiwan, not for the verb sense "to record")/',
        "記錄 记录 [ji4 lu4] /to record/record (written account)/",
      ].join("\n"),
    });
    const entry = entries.find((item) => item.simplified === "纪录");
    expect(entry?.primaryGloss).toBe("record (written account)");
    expect(entry?.acceptedGlosses).not.toContain("to record");
    expect(entry?.definitions).not.toContain("to record");
  });

  it("fails if a manual-review expectation no longer matches generated output", () => {
    expect(() =>
      build({
        cedict: "給予 给予 [ji3 yu3] /(literary) to give; to accord; to render/",
        manualReviews: [
          {
            simplified: "给予",
            pinyin: "jǐ yǔ",
            primaryGloss: "to give",
            confidence: "high",
            status: "reviewed",
            rationale: "Mismatch should fail.",
            sourceNote: "test",
          },
        ],
      }),
    ).toThrow(/manual-review expectation/);
  });

  it("preserves unresolved polyphonic entries and marks them for review", () => {
    const { entries, auditRecords } = build({
      cedict: "行 行 [hang2] /row/\n行 行 [xing2] /to walk/",
    });
    const entry = entries.find((item) => item.simplified === "行");
    expect(entry).toBeDefined();
    expect(entry.readings).toHaveLength(2);
    expect(entry.definitionConfidence).toBe("review");
    expect(entry.manualReviewStatus).toBe("pending");
    expect(auditRecords.find((record) => record.simplified === "行")?.status).toBe("unresolved");
  });
});

describe("pinyin normalization", () => {
  it("normalizes numeric and diacritic pinyin equivalently", () => {
    expect(canonicalPinyin("lü4")).toBe(canonicalPinyin("lu:4"));
    expect(canonicalPinyin("nǚ ér")).toBe(canonicalPinyin("nu:3 er2"));
    expect(canonicalPinyin("ma5")).toBe(canonicalPinyin("ma"));
  });

  it("preserves literal numbers and converts every numbered syllable", () => {
    expect(numberedToDiacritic("11 Qu1")).toBe("11 Qū");
    expect(numberedToDiacritic("qian1ke4")).toBe("qiānkè");
    expect(numberedToDiacritic("Shuang1 11")).toBe("Shuāng 11");
    expect(canonicalPinyin("11 Qu1")).toBe(canonicalPinyin("Qū"));
  });

  it("keeps vowel-less tone distinctions visible", () => {
    expect(numberedToDiacritic("m2")).toBe("m2");
    expect(numberedToDiacritic("m4")).toBe("m4");
    expect(canonicalPinyin("m2")).not.toBe(canonicalPinyin("m4"));
  });
});

describe("pinned dictionary regressions", () => {
  let built;

  beforeAll(() => {
    built = buildFromPinnedInputs();
  }, 30_000);

  const regressions = [
    ["还", "hái", "still"],
    ["比", "bǐ", "to compare"],
    ["几", "jǐ", "how many"],
    ["后", "hòu", "after"],
    ["告诉", "gào su", "to tell; to inform; to let know"],
    ["坐", "zuò", "to sit"],
    ["钱", "qián", "money"],
    ["个", "gè", "(classifier used before a noun that has no specific classifier)"],
    ["在", "zài", "(of sb or sth) to be (located) at"],
    ["很", "hěn", "very"],
    ["才", "cái", "then and only then"],
    ["被", "bèi", "used to indicate passive voice"],
    ["张", "zhāng", "classifier for flat objects, sheet"],
    ["所", "suǒ", "particle introducing a relative clause or passive"],
    ["于", "yú", "(of time or place) in; at; on"],
    ["总", "zǒng", "in every case; always; invariably"],
    ["利", "lì", "benefit"],
  ];

  it.each(regressions)("keeps the reviewed %s selection", (word, pinyin, gloss) => {
    const entry = built.entries.find((item) => item.simplified === word);
    expect(entry?.pinyin).toBe(pinyin);
    if (word === "被") expect(entry?.primaryGloss).toMatch(new RegExp(`^${gloss}`));
    else expect(entry?.primaryGloss).toBe(gloss);
    expect(entry?.definitionSource).toBe("curated");
    expect(entry?.manualReviewStatus).toBe("reviewed");
  });

  it("is deterministic for both the compact dictionary and audit summary", () => {
    const rebuilt = buildFromPinnedInputs();
    expect(rebuilt.version).toBe(built.version);
    expect(rebuilt.entries.map(compactEntry)).toEqual(built.entries.map(compactEntry));
    expect(buildAuditSummary(rebuilt.entries, rebuilt.auditRecords)).toEqual(
      buildAuditSummary(built.entries, built.auditRecords),
    );
  }, 30_000);

  it("never emits an unclassified definition source", () => {
    expect(new Set(built.entries.map((entry) => entry.definitionSource))).toEqual(
      new Set(["curated", "hsk", "cedict"]),
    );
    for (const entry of built.entries) {
      expect(entry.primaryGloss.trim()).not.toBe("");
      expect(entry.acceptedGlosses).toContain(entry.primaryGloss);
    }
  });
});
