import type {
  VocabQuestion,
  GrammarQuestion,
  ReadingSection,
} from "@/types/placement";

/**
 * Sentinel for "I don't know" answers stored in PlacementAnswers.
 * Distinct from null (not yet answered) and from any real option index (0+).
 * The scoring engine treats this as a high-confidence signal that the learner
 * doesn't know the item — different from a wrong guess.
 */
export const DONT_KNOW = -1;

/**
 * Vocabulary placement bank — twelve items per HSK band, ordered easy → hard
 * both *between* bands (HSK 1 first) and *within* each band (high-frequency
 * concrete items before low-frequency abstract ones). Order matters: the UI
 * renders them sequentially so the learner starts on words they almost
 * certainly know before they hit anything that would feel intimidating.
 */
export const vocabQuestions: VocabQuestion[] = [
  // ── HSK 1 ────────────────────────────────────────────────────────────────
  { hsk: 1, prompt: "你好", options: ["goodbye", "hello", "sorry", "thanks"], answer: 1 },
  { hsk: 1, prompt: "我", options: ["you", "he", "I / me", "they"], answer: 2 },
  { hsk: 1, prompt: "谢谢", options: ["please", "sorry", "thank you", "you're welcome"], answer: 2 },
  { hsk: 1, prompt: "妈妈", options: ["mom", "teacher", "friend", "older sister"], answer: 0 },
  { hsk: 1, prompt: "水", options: ["tea", "rice", "water", "milk"], answer: 2 },
  { hsk: 1, prompt: "学校", options: ["hospital", "school", "store", "park"], answer: 1 },
  { hsk: 1, prompt: "苹果", options: ["banana", "rice", "apple", "tea"], answer: 2 },
  { hsk: 1, prompt: "下午", options: ["morning", "evening", "noon", "afternoon"], answer: 3 },
  { hsk: 1, prompt: "今天", options: ["yesterday", "today", "tomorrow", "last week"], answer: 1 },
  { hsk: 1, prompt: "高兴", options: ["tired", "happy", "angry", "busy"], answer: 1 },
  { hsk: 1, prompt: "认识", options: ["to forget", "to know (someone)", "to think", "to remember"], answer: 1 },
  { hsk: 1, prompt: "工作", options: ["to study", "to rest", "work / to work", "to travel"], answer: 2 },

  // ── HSK 2 ────────────────────────────────────────────────────────────────
  { hsk: 2, prompt: "公司", options: ["company", "store", "park", "kitchen"], answer: 0 },
  { hsk: 2, prompt: "已经", options: ["soon", "already", "almost", "just now"], answer: 1 },
  { hsk: 2, prompt: "出去", options: ["to come in", "to go out", "to go up", "to come back"], answer: 1 },
  { hsk: 2, prompt: "聊天", options: ["to sleep", "to eat", "to chat", "to run"], answer: 2 },
  { hsk: 2, prompt: "希望", options: ["to remember", "to hope", "to ask", "to bring"], answer: 1 },
  { hsk: 2, prompt: "新闻", options: ["movie", "music", "news", "novel"], answer: 2 },
  { hsk: 2, prompt: "所以", options: ["because", "but", "therefore", "although"], answer: 2 },
  { hsk: 2, prompt: "应该", options: ["want to", "should", "can", "must not"], answer: 1 },
  { hsk: 2, prompt: "介绍", options: ["to compare", "to explain", "to introduce", "to recommend"], answer: 2 },
  { hsk: 2, prompt: "旅游", options: ["to swim", "to travel", "to camp", "to commute"], answer: 1 },
  { hsk: 2, prompt: "准备", options: ["to prepare", "to finish", "to delay", "to refuse"], answer: 0 },
  { hsk: 2, prompt: "比较", options: ["pretty / fairly", "barely", "never", "always"], answer: 0 },

  // ── HSK 3 ────────────────────────────────────────────────────────────────
  { hsk: 3, prompt: "方法", options: ["question", "method", "problem", "answer"], answer: 1 },
  { hsk: 3, prompt: "重要", options: ["heavy", "important", "rare", "obvious"], answer: 1 },
  { hsk: 3, prompt: "选择", options: ["to refuse", "to receive", "to choose", "to compare"], answer: 2 },
  { hsk: 3, prompt: "习惯", options: ["habit / to be used to", "tradition", "rule", "skill"], answer: 0 },
  { hsk: 3, prompt: "虽然", options: ["although", "therefore", "if", "because"], answer: 0 },
  { hsk: 3, prompt: "受欢迎", options: ["expensive", "popular", "boring", "difficult"], answer: 1 },
  { hsk: 3, prompt: "经历", options: ["plan", "memory", "experience", "rumor"], answer: 2 },
  { hsk: 3, prompt: "解释", options: ["to forget", "to explain", "to argue", "to ignore"], answer: 1 },
  { hsk: 3, prompt: "影响", options: ["impression", "influence", "performance", "reflection"], answer: 1 },
  { hsk: 3, prompt: "决定", options: ["to decide", "to delay", "to deny", "to depart"], answer: 0 },
  { hsk: 3, prompt: "通过", options: ["to pass / via", "to prevent", "to translate", "to test"], answer: 0 },
  { hsk: 3, prompt: "竟然", options: ["finally", "unexpectedly", "definitely", "barely"], answer: 1 },

  // ── HSK 4 ────────────────────────────────────────────────────────────────
  { hsk: 4, prompt: "改变", options: ["to change", "to begin", "to forget", "to wait"], answer: 0 },
  { hsk: 4, prompt: "产品", options: ["culture", "product", "history", "nature"], answer: 1 },
  { hsk: 4, prompt: "现金", options: ["card", "cash", "coin", "bill"], answer: 1 },
  { hsk: 4, prompt: "结果", options: ["reason", "method", "result", "process"], answer: 2 },
  { hsk: 4, prompt: "鼓励", options: ["to encourage", "to demand", "to refuse", "to delay"], answer: 0 },
  { hsk: 4, prompt: "适应", options: ["to adapt", "to admire", "to admit", "to advise"], answer: 0 },
  { hsk: 4, prompt: "尽管", options: ["even though", "as a result", "in case", "because of"], answer: 0 },
  { hsk: 4, prompt: "理论", options: ["theory", "review", "request", "reward"], answer: 0 },
  { hsk: 4, prompt: "成功", options: ["success", "skill", "support", "supply"], answer: 0 },
  { hsk: 4, prompt: "价值", options: ["price", "value", "volume", "venue"], answer: 1 },
  { hsk: 4, prompt: "效率", options: ["effort", "efficiency", "elegance", "endurance"], answer: 1 },
  { hsk: 4, prompt: "怀疑", options: ["to suspect / doubt", "to confess", "to forgive", "to ignore"], answer: 0 },

  // ── HSK 5 ────────────────────────────────────────────────────────────────
  { hsk: 5, prompt: "保持", options: ["to maintain", "to abandon", "to extend", "to lose"], answer: 0 },
  { hsk: 5, prompt: "充分", options: ["briefly", "sufficient(ly)", "secretly", "rarely"], answer: 1 },
  { hsk: 5, prompt: "趋势", options: ["trend", "resistance", "request", "departure"], answer: 0 },
  { hsk: 5, prompt: "宝贵", options: ["heavy", "stubborn", "precious", "fragile"], answer: 2 },
  { hsk: 5, prompt: "导致", options: ["to instruct", "to cause / lead to", "to suspect", "to ignore"], answer: 1 },
  { hsk: 5, prompt: "普遍", options: ["universal / widespread", "uncertain", "unusual", "unfair"], answer: 0 },
  { hsk: 5, prompt: "显著", options: ["slight", "significant / striking", "shameful", "silent"], answer: 1 },
  { hsk: 5, prompt: "资源", options: ["resource", "rumor", "routine", "request"], answer: 0 },
  { hsk: 5, prompt: "妥协", options: ["to argue", "to compromise", "to escape", "to insist"], answer: 1 },
  { hsk: 5, prompt: "谨慎", options: ["careless", "cautious / prudent", "generous", "stubborn"], answer: 1 },
  { hsk: 5, prompt: "依赖", options: ["to disregard", "to delegate", "to depend on", "to dispatch"], answer: 2 },
  { hsk: 5, prompt: "稳定", options: ["sudden", "stable", "strict", "stale"], answer: 1 },

  // ── HSK 6 ────────────────────────────────────────────────────────────────
  { hsk: 6, prompt: "潜在", options: ["explicit", "potential / latent", "rapid", "fragile"], answer: 1 },
  { hsk: 6, prompt: "迄今为止", options: ["from now on", "by all means", "up until now", "never again"], answer: 2 },
  { hsk: 6, prompt: "弊端", options: ["drawback / abuse (of a system)", "shortcut", "tendency", "promise"], answer: 0 },
  { hsk: 6, prompt: "颇有", options: ["barely have", "to have quite a bit of", "to lack", "to overlook"], answer: 1 },
  { hsk: 6, prompt: "辜负", options: ["to fulfil", "to surpass", "to let down (someone)", "to redeem"], answer: 2 },
  { hsk: 6, prompt: "蕴含", options: ["to contain / be imbued with", "to discard", "to expose", "to fluctuate"], answer: 0 },
  { hsk: 6, prompt: "屈指可数", options: ["countless", "very few (countable on fingers)", "all of a sudden", "well known"], answer: 1 },
  { hsk: 6, prompt: "衍生", options: ["to deteriorate", "to derive / be derived from", "to delegate", "to demolish"], answer: 1 },
  { hsk: 6, prompt: "茁壮", options: ["robust / thriving", "fragile", "fleeting", "feverish"], answer: 0 },
  { hsk: 6, prompt: "渺茫", options: ["abundant", "imminent", "uncertain / remote (hope)", "intricate"], answer: 2 },
  { hsk: 6, prompt: "鼎力", options: ["to obstruct", "to wholeheartedly support", "to overlook", "to outshine"], answer: 1 },
  { hsk: 6, prompt: "举足轻重", options: ["irrelevant", "long-winded", "of decisive importance", "easily replaced"], answer: 2 },
];

/**
 * Grammar placement bank — ~4 patterns per HSK band, HSK 2 through 6,
 * ordered easy → hard. Each item carries an `hsk` so scoring can do
 * band-by-band analysis the same way it does for vocab.
 */
export const grammarQuestions: GrammarQuestion[] = [
  // ── HSK 2 ────────────────────────────────────────────────────────────────
  { tag: "了 (change of state)", hsk: 2, prompt: "我该走___。 (it's time to go now)", options: ["了", "吗", "的", "过"], answer: 0 },
  { tag: "因为…所以", hsk: 2, prompt: "因为太累，___很早就睡了。", options: ["但是", "所以", "虽然", "如果"], answer: 1 },
  { tag: "在 (location)", hsk: 2, prompt: "他___图书馆看书。", options: ["在", "是", "的", "和"], answer: 0 },
  { tag: "想 + verb (want to)", hsk: 2, prompt: "我___喝一杯咖啡。", options: ["想", "会", "把", "被"], answer: 0 },

  // ── HSK 3 ────────────────────────────────────────────────────────────────
  { tag: "把-construction", hsk: 3, prompt: "他___书放在桌子上。", options: ["被", "把", "在", "对"], answer: 1 },
  { tag: "被 (passive)", hsk: 3, prompt: "书___他拿走了。", options: ["把", "被", "让", "给"], answer: 1 },
  { tag: "对…来说", hsk: 3, prompt: "___我来说，中文不难。", options: ["对", "把", "被", "给"], answer: 0 },
  { tag: "一边…一边…", hsk: 3, prompt: "他___走___打电话。", options: ["一边…一边…", "越…越…", "又…又…", "也…也…"], answer: 0 },

  // ── HSK 4 ────────────────────────────────────────────────────────────────
  { tag: "越…越…", hsk: 4, prompt: "天气___冷，他___不想出门。", options: ["越…越…", "也…也…", "又…又…", "一…一…"], answer: 0 },
  { tag: "虽然…但是…", hsk: 4, prompt: "___下雨，但是我们还是去了。", options: ["虽然", "因为", "如果", "只要"], answer: 0 },
  { tag: "不是…而是…", hsk: 4, prompt: "他___不努力，___没找到方向。", options: ["不是…而是…", "不仅…而且…", "因为…所以…", "虽然…但是…"], answer: 0 },
  { tag: "连…也…", hsk: 4, prompt: "他___一个字___不认识。", options: ["连…也…", "把…给…", "对…来说…", "因为…所以…"], answer: 0 },

  // ── HSK 5 ────────────────────────────────────────────────────────────────
  { tag: "即使…也…", hsk: 5, prompt: "___下雨，他也要去跑步。", options: ["如果", "即使", "因为", "只要"], answer: 1 },
  { tag: "不仅…而且…", hsk: 5, prompt: "他___聪明，___努力。", options: ["不仅…而且…", "虽然…但是…", "因为…所以…", "如果…就…"], answer: 0 },
  { tag: "一旦…就…", hsk: 5, prompt: "___机会出现，他___会抓住。", options: ["一旦…就…", "只有…才…", "因为…所以…", "不管…都…"], answer: 0 },
  { tag: "与其…不如…", hsk: 5, prompt: "___在家等，___出去走走。", options: ["与其…不如…", "宁可…也不…", "不仅…还…", "因为…所以…"], answer: 0 },

  // ── HSK 6 ────────────────────────────────────────────────────────────────
  { tag: "宁可…也不…", hsk: 6, prompt: "他___一个人走路，___坐那种车。", options: ["宁可…也不…", "与其…不如…", "不但…还…", "无论…都…"], answer: 0 },
  { tag: "无论…都…", hsk: 6, prompt: "___结果怎么样，我都不后悔。", options: ["既然", "无论", "凡是", "尽管"], answer: 1 },
  { tag: "倘若…便…", hsk: 6, prompt: "___你早一点告诉我，事情___不会这样。", options: ["倘若…便…", "只要…就…", "因为…所以…", "虽然…但是…"], answer: 0 },
  { tag: "何况", hsk: 6, prompt: "连大人都做不了，___小孩子呢？", options: ["何况", "因此", "即使", "尽管"], answer: 0 },
];

/**
 * Three reading passages, easy → hard. The runner can show all three and
 * scoring uses the highest one the learner answered cleanly to bound their
 * reading band.
 */
export const readingSections: ReadingSection[] = [
  {
    targetHsk: 2,
    passage:
      "我有一个朋友，他是中国人。他在北京工作，每天早上六点起床，七点去上班。他喜欢喝茶，不喜欢喝咖啡。周末他常常和家人一起去公园。",
    questions: [
      {
        prompt: "What time does he go to work?",
        options: ["6 a.m.", "7 a.m.", "8 a.m.", "9 a.m."],
        answer: 1,
      },
      {
        prompt: "What does he like to drink?",
        options: ["coffee", "milk", "tea", "juice"],
        answer: 2,
      },
      {
        prompt: "What does he often do on weekends?",
        options: ["work overtime", "go to the park with his family", "stay home alone", "travel abroad"],
        answer: 1,
      },
    ],
  },
  {
    targetHsk: 4,
    passage:
      "小明每天一边吃早饭一边看中文书。虽然有点难，但是他越来越喜欢。他觉得，对他来说，看书是学中文最好的方法。最近他还开始把不认识的词写在小本子上，每天复习几次。",
    questions: [
      {
        prompt: "What does Xiaoming do while eating breakfast?",
        options: ["watches TV", "reads a Chinese book", "sleeps", "chats with mom"],
        answer: 1,
      },
      {
        prompt: "How does he feel about it over time?",
        options: ["likes it more and more", "finds it boring", "wants to stop", "thinks it's easy"],
        answer: 0,
      },
      {
        prompt: "What did he recently start doing?",
        options: [
          "stopped reading in the morning",
          "writing unknown words in a notebook to review",
          "translating whole books",
          "only reading on weekends",
        ],
        answer: 1,
      },
    ],
  },
  {
    targetHsk: 6,
    passage:
      "随着网络购物的普及，许多传统商店不得不重新思考自己的生存方式。有人选择与电商平台合作，也有人通过独特的服务来吸引顾客。无论选哪条路，能够灵活应对变化的店家更容易在竞争中生存下来。专家指出，真正的挑战并非来自电商本身，而是来自商家是否愿意放弃过去的经验，重新认识今天的消费者。",
    questions: [
      {
        prompt: "What is the passage mainly about?",
        options: [
          "online shopping discounts",
          "traditional stores adapting to e-commerce",
          "how to start a new online store",
          "consumer complaints about online stores",
        ],
        answer: 1,
      },
      {
        prompt: "What do the stores that survive have in common?",
        options: [
          "they always lower prices",
          "they refuse to change",
          "they adapt flexibly to change",
          "they only sell luxury goods",
        ],
        answer: 2,
      },
      {
        prompt: "According to the experts, what is the real challenge?",
        options: [
          "the rise of e-commerce platforms",
          "shop owners' willingness to abandon past experience and rethink today's customers",
          "government regulation of online retail",
          "the price war between physical and online stores",
        ],
        answer: 1,
      },
    ],
  },
];

/** Back-compat: the original single-section export. */
export const readingSection: ReadingSection = readingSections[0];

export const selfRatingLabels = ["Listening", "Speaking", "Reading", "Writing"];
