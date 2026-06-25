import type { GrammarPoint } from "@/types/grammar";

/**
 * Rule-based detectors. Each detector inspects a raw sentence and, if it
 * matches, returns a GrammarPoint plus optional casual/omitted notes.
 * Keep the `id`s aligned with data/grammarPatterns.ts and placement tags.
 */
export interface DetectorResult {
  point: GrammarPoint;
  casualNotes?: string[];
}

export interface Detector {
  id: string;
  detect: (sentence: string) => DetectorResult | null;
}

const has = (s: string, x: string) => s.includes(x);

export const detectors: Detector[] = [
  {
    id: "gai",
    detect: (s) => {
      // bare 该 used as 应该 (not the 应该 compound itself)
      const bareGai = [...s].some((c, i) => c === "该" && s[i - 1] !== "应");
      if (!bareGai) return null;
      return {
        point: {
          pattern: "该 (should / ought to)",
          explanation:
            "该 means \"should / ought to.\" In casual speech it is a shorter stand-in for 应该 — same meaning, fewer syllables.",
          example: "我该走了。 = I should get going.",
        },
        casualNotes: ["该 here is the casual short form of 应该."],
      };
    },
  },
  {
    id: "yinggai",
    detect: (s) =>
      has(s, "应该")
        ? {
            point: {
              pattern: "应该 (should)",
              explanation: "应该 = should / ought to. It expresses expectation or obligation.",
              example: "你应该多休息。 = You should rest more.",
            },
          }
        : null,
  },
  {
    id: "le-change",
    detect: (s) =>
      has(s, "了")
        ? {
            point: {
              pattern: "了 (change of state / completed action)",
              explanation:
                "了 has two jobs. After a verb it marks a completed action; at the end of a sentence it signals a NEW situation — something is different now than before.",
              example: "我该走了。 = It's time to go now (it wasn't before).",
            },
            casualNotes: ["Sentence-final 了 = \"now\" / \"a change has happened,\" not just past tense."],
          }
        : null,
  },
  {
    id: "ba",
    detect: (s) =>
      has(s, "把")
        ? {
            point: {
              pattern: "把-construction (Subj 把 Obj Verb)",
              explanation:
                "把 pulls the object in front of the verb to focus on what is DONE to it. Structure: Subject + 把 + Object + Verb + result.",
              example: "他把书放在桌子上。 = He put the book on the table.",
            },
          }
        : null,
  },
  {
    id: "bei",
    detect: (s) =>
      has(s, "被")
        ? {
            point: {
              pattern: "被 (passive)",
              explanation: "被 marks the passive: the subject has something done TO it. Subject + 被 (+ doer) + Verb.",
              example: "书被他拿走了。 = The book was taken away by him.",
            },
          }
        : null,
  },
  {
    id: "yuelaiyue",
    detect: (s) =>
      has(s, "越来越")
        ? {
            point: {
              pattern: "越来越… (more and more)",
              explanation: "越来越 + adjective/verb = \"more and more …\", an increasing change over time.",
              example: "天气越来越冷。 = The weather is getting colder and colder.",
            },
          }
        : null,
  },
  {
    id: "a-not-a",
    detect: (s) => {
      const m = s.match(/([\u4e00-\u9fff])不\1/);
      if (!m) return null;
      const x = m[1];
      return {
        point: {
          pattern: `A不A question (${x}不${x})`,
          explanation:
            "Repeating a word around 不 makes a yes/no question without needing 吗. It asks \"X or not X?\"",
          example: `${x}不${x} ≈ \"is it / do you ${x} or not?\"`,
        },
      };
    },
  },
  {
    id: "yibian",
    detect: (s) =>
      has(s, "一边")
        ? {
            point: {
              pattern: "一边…一边… (doing two things at once)",
              explanation: "一边 A 一边 B = doing A and B simultaneously.",
              example: "他一边吃饭一边看手机。 = He eats while looking at his phone.",
            },
          }
        : null,
  },
  {
    id: "yinwei-suoyi",
    detect: (s) =>
      has(s, "因为") || has(s, "所以")
        ? {
            point: {
              pattern: "因为…所以… (because … therefore)",
              explanation: "因为 gives the reason, 所以 gives the result. Either half can be dropped in casual speech.",
              example: "因为太累，所以早睡了。 = Because (I was) too tired, (I) slept early.",
            },
          }
        : null,
  },
  {
    id: "suiran-danshi",
    detect: (s) =>
      has(s, "虽然") || has(s, "但是")
        ? {
            point: {
              pattern: "虽然…但是… (although … but)",
              explanation:
                "虽然 sets up a concession; 但是 gives the contrasting point. Chinese keeps BOTH words (unlike English).",
              example: "虽然难，但是有意思。 = Although hard, it's interesting.",
            },
          }
        : null,
  },
  {
    id: "duilaishuo",
    detect: (s) =>
      has(s, "来说")
        ? {
            point: {
              pattern: "对…来说 (as for / for someone)",
              explanation: "对 X 来说 frames a statement from X's point of view: \"for X / as far as X is concerned.\"",
              example: "对我来说，看书是个好方法。 = For me, reading is a good method.",
            },
          }
        : null,
  },
  {
    id: "jiu",
    detect: (s) =>
      has(s, "就")
        ? {
            point: {
              pattern: "就 (then / right away / emphasis)",
              explanation: "就 stresses that something happens soon, easily, or exactly as expected. Often pairs with a time word.",
              example: "他六点就起床了。 = He got up as early as six.",
            },
          }
        : null,
  },
  {
    id: "cai",
    detect: (s) =>
      has(s, "才")
        ? {
            point: {
              pattern: "才 (only then / not until)",
              explanation: "才 is the flip side of 就: it stresses that something happened later, with difficulty, or is less than expected.",
              example: "他九点才到。 = He didn't arrive until nine.",
            },
          }
        : null,
  },
];
