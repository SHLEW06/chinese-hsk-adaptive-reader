/**
 * Static catalog of the grammar patterns this app teaches.
 * Used for reference (e.g. the dashboard "weak grammar" links) and to keep
 * the rule-based detector and the placement tags aligned on one vocabulary.
 */
export interface GrammarPatternDoc {
  id: string;
  name: string;
  summary: string;
  example: string;
}

export const grammarPatternCatalog: GrammarPatternDoc[] = [
  { id: "gai", name: "该 / 应该 (should)", summary: "该 means should/ought; in casual speech it is a short form of 应该.", example: "我该走了。" },
  { id: "le-change", name: "了 (change of state)", summary: "Sentence-final 了 signals a new situation — something is different now.", example: "我该走了。" },
  { id: "ba", name: "把-construction", summary: "把 moves the object before the verb to focus on what is done to it.", example: "他把书放在桌子上。" },
  { id: "bei", name: "被 (passive)", summary: "被 marks the passive: something is done TO the subject.", example: "书被他拿走了。" },
  { id: "jiu-cai", name: "就 / 才", summary: "就 = sooner/easier than expected; 才 = later/harder/fewer than expected.", example: "他六点就起床了。 / 他九点才到。" },
  { id: "a-not-a", name: "A不A questions", summary: "Repeat a word around 不 to ask yes/no without 吗 (要不要, 会不会, 是不是).", example: "你要不要喝水?" },
  { id: "yibian", name: "一边…一边…", summary: "Doing two actions at the same time.", example: "他一边吃饭一边看书。" },
  { id: "yinwei-suoyi", name: "因为…所以…", summary: "因为 gives the reason, 所以 gives the result.", example: "因为太累，所以早睡了。" },
  { id: "suiran-danshi", name: "虽然…但是…", summary: "Although … but. Chinese keeps both halves.", example: "虽然难，但是有意思。" },
  { id: "duilaishuo", name: "对…来说", summary: "From X's point of view; as for X.", example: "对我来说，看书很有用。" },
  { id: "yuelaiyue", name: "越来越…", summary: "More and more …, an increasing change over time.", example: "天气越来越冷。" },
];
