import type { MockExam } from "@/types/mockExam";

/**
 * Curated HSK 1–6 mock exams. Each is shorter than the official 听力+阅读+
 * (写作) exam, but the question shape (vocab meaning · cloze · short
 * passages) maps to the real thing so a strong score is a real signal.
 */

const hsk1: MockExam = {
  level: 1,
  durationMinutes: 12,
  passingPct: 60,
  intro:
    "HSK 1 covers the most basic survival vocabulary (family, food, time) and a few core grammar patterns. If you can comfortably answer ~12/18 of these, you have a solid HSK 1 footing.",
  parts: [
    {
      section: "vocabulary",
      title: "Vocabulary",
      description: "Choose the meaning of each word.",
      questions: [
        { prompt: "爸爸", options: ["mom", "dad", "older brother", "uncle"], answer: 1 },
        { prompt: "学生", options: ["teacher", "doctor", "student", "worker"], answer: 2 },
        { prompt: "椅子", options: ["table", "chair", "bed", "door"], answer: 1 },
        { prompt: "中午", options: ["morning", "evening", "noon", "midnight"], answer: 2 },
        { prompt: "高兴", options: ["tired", "happy", "hungry", "angry"], answer: 1 },
        { prompt: "电话", options: ["computer", "TV", "telephone", "watch"], answer: 2 },
        { prompt: "朋友", options: ["family", "friend", "neighbor", "classmate"], answer: 1 },
      ],
    },
    {
      section: "grammar",
      title: "Grammar",
      description: "Fill the blank with the best option.",
      questions: [
        {
          prompt: "我___北京人。",
          options: ["是", "不", "也", "在"],
          answer: 0,
          explanation: "是 = the copula 'to be': 我是北京人 (I am from Beijing).",
        },
        {
          prompt: "你叫___名字？",
          options: ["哪", "什么", "几", "谁"],
          answer: 1,
          explanation: "什么 (what) is used to ask 'what is your name'.",
        },
        {
          prompt: "今天___月几号？",
          options: ["几", "什么", "多少", "怎么"],
          answer: 0,
          explanation: "几 + measure word asks for a small number (which date).",
        },
        {
          prompt: "我有两___哥哥。",
          options: ["个", "本", "张", "口"],
          answer: 0,
          explanation: "个 is the general measure word, including for people.",
        },
        {
          prompt: "他不___咖啡。",
          options: ["喝", "吃", "看", "听"],
          answer: 0,
          explanation: "喝 = to drink (coffee/tea/water).",
        },
      ],
    },
    {
      section: "reading",
      title: "Short reading",
      description: "Read the passage, then answer.",
      questions: [
        {
          passage: "我叫王明。我是中国人，今年十八岁。我有一个妹妹，她六岁。我们都喜欢看书。",
          prompt: "How old is the younger sister?",
          options: ["18", "8", "6", "16"],
          answer: 2,
        },
        {
          passage: "我叫王明。我是中国人，今年十八岁。我有一个妹妹，她六岁。我们都喜欢看书。",
          prompt: "What do they both like?",
          options: ["sports", "reading books", "TV shows", "music"],
          answer: 1,
        },
        {
          passage: "今天星期六，天气很好。我和爸爸去公园。",
          prompt: "What day of the week is it?",
          options: ["Friday", "Saturday", "Sunday", "Monday"],
          answer: 1,
        },
        {
          passage: "今天星期六，天气很好。我和爸爸去公园。",
          prompt: "Where do they go?",
          options: ["the park", "the supermarket", "school", "home"],
          answer: 0,
        },
      ],
    },
  ],
};

const hsk2: MockExam = {
  level: 2,
  durationMinutes: 18,
  passingPct: 60,
  intro:
    "HSK 2 adds ~150 more words and patterns for daily situations: travel, weather, time, simple feelings. You should be comfortable handling everyday small talk in writing.",
  parts: [
    {
      section: "vocabulary",
      title: "Vocabulary",
      description: "Choose the meaning of each word.",
      questions: [
        { prompt: "已经", options: ["soon", "already", "still", "not yet"], answer: 1 },
        { prompt: "可能", options: ["impossible", "probably / maybe", "certain", "rare"], answer: 1 },
        { prompt: "希望", options: ["to wait", "to refuse", "to hope", "to bring"], answer: 2 },
        { prompt: "公共汽车", options: ["taxi", "bicycle", "bus", "subway"], answer: 2 },
        { prompt: "聪明", options: ["clever", "shy", "tall", "lazy"], answer: 0 },
        { prompt: "新闻", options: ["letter", "story", "news", "report card"], answer: 2 },
        { prompt: "教室", options: ["library", "classroom", "office", "kitchen"], answer: 1 },
      ],
    },
    {
      section: "grammar",
      title: "Grammar",
      description: "Fill the blank.",
      questions: [
        {
          prompt: "我___学过中文。 (have studied Chinese before)",
          options: ["了", "过", "着", "的"],
          answer: 1,
          explanation: "过 marks past experience: 学过 = have studied (at some point).",
        },
        {
          prompt: "他比我___一岁。",
          options: ["大", "多", "高", "很"],
          answer: 0,
          explanation: "比-comparisons use 大 / 小 (older / younger) for age.",
        },
        {
          prompt: "今天___昨天热。",
          options: ["比", "和", "跟", "有"],
          answer: 0,
          explanation: "A 比 B X = A is more X than B.",
        },
        {
          prompt: "他正在___饭。",
          options: ["吃", "做", "买", "卖"],
          answer: 1,
          explanation: "做饭 = to cook (literally 'make food').",
        },
        {
          prompt: "你___去过北京吗？",
          options: ["是不是", "有没有", "为什么", "怎么样"],
          answer: 1,
          explanation: "有没有 + V + 过 asks 'have you ever V-ed?'.",
        },
      ],
    },
    {
      section: "reading",
      title: "Short reading",
      description: "Read carefully.",
      questions: [
        {
          passage:
            "上个周末我和家人一起去了北京。我们看了长城，还吃了北京烤鸭。我觉得北京又好看又好玩，下次还想去。",
          prompt: "When did they go to Beijing?",
          options: ["this weekend", "last weekend", "next weekend", "two weeks ago"],
          answer: 1,
        },
        {
          passage:
            "上个周末我和家人一起去了北京。我们看了长城，还吃了北京烤鸭。我觉得北京又好看又好玩，下次还想去。",
          prompt: "What did they eat?",
          options: ["dumplings", "hot pot", "Beijing roast duck", "noodles"],
          answer: 2,
        },
        {
          passage:
            "我每天早上六点起床，七点出门去上班。下班以后我喜欢去跑步，然后回家做饭。",
          prompt: "What does the writer do after work?",
          options: ["watches TV", "goes running", "studies", "sleeps right away"],
          answer: 1,
        },
        {
          passage:
            "我每天早上六点起床，七点出门去上班。下班以后我喜欢去跑步，然后回家做饭。",
          prompt: "What time do they leave for work?",
          options: ["6:00", "6:30", "7:00", "8:00"],
          answer: 2,
        },
      ],
    },
  ],
};

const hsk3: MockExam = {
  level: 3,
  durationMinutes: 25,
  passingPct: 60,
  intro:
    "HSK 3 is the bridge to real reading: 600+ words, more compound sentences, and patterns like 把/被/虽然…但是…/对…来说. Most learners feel a noticeable jump.",
  parts: [
    {
      section: "vocabulary",
      title: "Vocabulary",
      description: "Choose the meaning.",
      questions: [
        { prompt: "经历", options: ["plan", "experience", "rumor", "memory"], answer: 1 },
        { prompt: "解决", options: ["to delay", "to ask", "to solve", "to ignore"], answer: 2 },
        { prompt: "举行", options: ["to lift", "to hold (an event)", "to introduce", "to behave"], answer: 1 },
        { prompt: "厉害", options: ["careful", "patient", "amazing / fierce", "modest"], answer: 2 },
        { prompt: "礼貌", options: ["gift", "manners / politeness", "smile", "promise"], answer: 1 },
        { prompt: "受不了", options: ["unbearable", "well-received", "without question", "newly developed"], answer: 0 },
        { prompt: "其实", options: ["maybe", "actually", "almost", "really not"], answer: 1 },
        { prompt: "提供", options: ["to refuse", "to provide", "to delete", "to repair"], answer: 1 },
      ],
    },
    {
      section: "grammar",
      title: "Grammar",
      description: "Fill the blank with the best pattern.",
      questions: [
        {
          prompt: "他___书放在桌子上。",
          options: ["被", "把", "给", "对"],
          answer: 1,
          explanation: "把 fronts the object to focus on what is done to it.",
        },
        {
          prompt: "___下雨，我们也要去。",
          options: ["因为", "即使", "如果", "由于"],
          answer: 1,
          explanation: "即使…也… = even if … still …",
        },
        {
          prompt: "他___不来，我们等他。",
          options: ["除非", "只要", "无论", "因为"],
          answer: 0,
          explanation: "除非 = unless. The companion is often 才/否则.",
        },
        {
          prompt: "她说话的时候，他___听___笑。",
          options: ["一边…一边…", "又…又…", "也…也…", "越…越…"],
          answer: 0,
          explanation: "一边 X 一边 Y = doing X and Y simultaneously.",
        },
        {
          prompt: "对我___，这件事很重要。",
          options: ["来说", "说来", "来看", "看来"],
          answer: 0,
          explanation: "对 X 来说 = 'from X's perspective; for X'.",
        },
      ],
    },
    {
      section: "reading",
      title: "Reading",
      description: "Two short passages.",
      questions: [
        {
          passage:
            "小李最近开始学钢琴了。一开始他觉得很难，几次都想放弃。但是他妈妈说：「做什么都要坚持，慢慢就会越来越好。」于是他每天练习半个小时，三个月以后，他真的弹得不错了。",
          prompt: "What does Xiao Li's mother emphasize?",
          options: [
            "play the piano twice a week",
            "find a better teacher",
            "stick with it and improve slowly",
            "stop if it gets too hard",
          ],
          answer: 2,
        },
        {
          passage:
            "小李最近开始学钢琴了。一开始他觉得很难，几次都想放弃。但是他妈妈说：「做什么都要坚持，慢慢就会越来越好。」于是他每天练习半个小时，三个月以后，他真的弹得不错了。",
          prompt: "How long did Xiao Li practice each day?",
          options: ["15 minutes", "half an hour", "one hour", "two hours"],
          answer: 1,
        },
        {
          passage:
            "我以前不喜欢运动，工作以后身体也变差了。后来我每天早上跑步二十分钟，三个月以后我觉得自己精神好多了。",
          prompt: "What change did the writer make?",
          options: [
            "started running 20 min each morning",
            "stopped working overtime",
            "began drinking less coffee",
            "started cooking healthier food",
          ],
          answer: 0,
        },
        {
          passage:
            "我以前不喜欢运动，工作以后身体也变差了。后来我每天早上跑步二十分钟，三个月以后我觉得自己精神好多了。",
          prompt: "After three months, the writer felt:",
          options: ["more tired", "in better spirits", "the same", "sad"],
          answer: 1,
        },
      ],
    },
  ],
};

const hsk4: MockExam = {
  level: 4,
  durationMinutes: 35,
  passingPct: 60,
  intro:
    "HSK 4 requires roughly 1200 words and most of the core grammar of modern written Chinese. You should be able to read short news, casual essays, and social posts with effort.",
  parts: [
    {
      section: "vocabulary",
      title: "Vocabulary",
      description: "Pick the closest meaning.",
      questions: [
        { prompt: "结果", options: ["reason", "method", "result", "process"], answer: 2 },
        { prompt: "尽管", options: ["even though", "as a result", "in case", "because of"], answer: 0 },
        { prompt: "竞争", options: ["competition", "cooperation", "collection", "compensation"], answer: 0 },
        { prompt: "通过", options: ["because of", "through / by means of", "instead of", "regardless of"], answer: 1 },
        { prompt: "适应", options: ["to adapt", "to refuse", "to expand", "to insist"], answer: 0 },
        { prompt: "意外", options: ["plan", "accident / unexpected event", "promise", "habit"], answer: 1 },
        { prompt: "效果", options: ["expense", "effect / result", "reason", "duration"], answer: 1 },
        { prompt: "推广", options: ["to promote / spread", "to abandon", "to forget", "to maintain"], answer: 0 },
      ],
    },
    {
      section: "grammar",
      title: "Grammar",
      description: "Choose the correct pattern.",
      questions: [
        {
          prompt: "他___年轻，___很有经验。",
          options: ["不仅…而且…", "虽然…但是…", "因为…所以…", "如果…就…"],
          answer: 1,
          explanation: "虽然 introduces an unexpected pair: young but experienced.",
        },
        {
          prompt: "他在公司里负责管理___的工作。",
          options: ["产品", "员工", "市场", "全部"],
          answer: 3,
          explanation: "全部 = 'all of', here modifying 工作.",
        },
        {
          prompt: "我跟他___朋友___十年了。",
          options: ["做…的", "做…已经", "成…了", "当…为"],
          answer: 1,
          explanation: "做朋友已经十年了 = '(we've) been friends for ten years already'.",
        },
        {
          prompt: "你___努力，___能成功。",
          options: ["只要…就…", "只有…才…", "宁愿…也不…", "与其…不如…"],
          answer: 1,
          explanation: "只有 X 才 Y = 'only when X, then Y' — a hard condition.",
        },
        {
          prompt: "他___不会同意这个方案。",
          options: ["恐怕", "一定", "已经", "刚刚"],
          answer: 0,
          explanation: "恐怕 = 'I'm afraid (he) won't…' — a polite negative prediction.",
        },
        {
          prompt: "他对自己的工作___负责。",
          options: ["十分", "一直", "实在", "无非"],
          answer: 0,
          explanation: "十分 = very / extremely (formal register).",
        },
      ],
    },
    {
      section: "reading",
      title: "Reading",
      description: "A short essay and a short news note.",
      questions: [
        {
          passage:
            "近年来，越来越多的年轻人选择在网上买东西。一方面是价格便宜，另一方面是种类多。但是有调查显示，网购也带来了一些问题：包装太多、退货很麻烦，有时候收到的东西和图片不一样。",
          prompt: "Which is NOT a problem the article mentions?",
          options: ["too much packaging", "returns are inconvenient", "items don't match photos", "delivery is slow"],
          answer: 3,
        },
        {
          passage:
            "近年来，越来越多的年轻人选择在网上买东西。一方面是价格便宜，另一方面是种类多。但是有调查显示，网购也带来了一些问题：包装太多、退货很麻烦，有时候收到的东西和图片不一样。",
          prompt: "Why do young people choose to shop online?",
          options: [
            "low prices and variety",
            "free shipping and bonuses",
            "quick reviews and ratings",
            "store loyalty programs",
          ],
          answer: 0,
        },
        {
          passage:
            "李教授认为，学外语最重要的不是天赋，而是坚持。他说：「每天学一点，比一周学一次更有效。」很多学生听了他的话以后，开始养成每天复习的习惯。",
          prompt: "What does Professor Li believe is most important?",
          options: ["talent", "consistency / persistence", "a good teacher", "a quiet environment"],
          answer: 1,
        },
        {
          passage:
            "李教授认为，学外语最重要的不是天赋，而是坚持。他说：「每天学一点，比一周学一次更有效。」很多学生听了他的话以后，开始养成每天复习的习惯。",
          prompt: "What habit did students start?",
          options: ["weekly tutoring sessions", "daily review", "speaking practice on weekends", "writing essays"],
          answer: 1,
        },
      ],
    },
  ],
};

const hsk5: MockExam = {
  level: 5,
  durationMinutes: 50,
  passingPct: 60,
  intro:
    "HSK 5 expects ~2500 words and the ability to read short editorial pieces, business articles, and personal essays without heavy support. The grammar gets more nuanced (formal connectors, idioms).",
  parts: [
    {
      section: "vocabulary",
      title: "Vocabulary",
      description: "Pick the closest meaning.",
      questions: [
        { prompt: "宝贵", options: ["heavy", "stubborn", "precious", "fragile"], answer: 2 },
        { prompt: "保持", options: ["to maintain", "to abandon", "to extend", "to lose"], answer: 0 },
        { prompt: "导致", options: ["to instruct", "to cause", "to suspect", "to ignore"], answer: 1 },
        { prompt: "充分", options: ["briefly", "sufficiently", "secretly", "rarely"], answer: 1 },
        { prompt: "趋势", options: ["trend", "resistance", "request", "departure"], answer: 0 },
        { prompt: "矛盾", options: ["agreement", "contradiction / conflict", "promise", "preference"], answer: 1 },
        { prompt: "事先", options: ["afterwards", "in advance", "simultaneously", "in turn"], answer: 1 },
        { prompt: "抓紧", options: ["to grasp tightly / hurry up with", "to release", "to weigh", "to delay"], answer: 0 },
      ],
    },
    {
      section: "grammar",
      title: "Grammar",
      description: "Fill the blank.",
      questions: [
        {
          prompt: "___他多忙，他每天都会回家吃晚饭。",
          options: ["既然", "无论", "只要", "尽管"],
          answer: 1,
          explanation: "无论 X，都 Y = 'no matter X, Y' — covers all conditions.",
        },
        {
          prompt: "这件事___在我，不在他。",
          options: ["主要", "首先", "根本", "总之"],
          answer: 0,
          explanation: "主要 = 'mainly / principally'.",
        },
        {
          prompt: "他___留下来工作，___回家休息。",
          options: ["宁可…也要…", "宁可…也不…", "与其…不如…", "不如…还…"],
          answer: 1,
          explanation: "宁可 X 也不 Y = 'would rather X than (do) Y' (negative).",
        },
        {
          prompt: "考试还有一周，他___紧张得睡不着了。",
          options: ["已经", "竟然", "果然", "依然"],
          answer: 0,
          explanation: "已经 (already) emphasizes that the state has set in.",
        },
        {
          prompt: "他这样做完全是___大家好。",
          options: ["为", "对", "向", "由"],
          answer: 0,
          explanation: "为 X (好) = 'for X's benefit'.",
        },
        {
          prompt: "他对中国文化的了解___一般人深得多。",
          options: ["比", "跟", "对", "由"],
          answer: 0,
          explanation: "比 + N + adj + 得多 = 'much more adj than N'.",
        },
      ],
    },
    {
      section: "reading",
      title: "Reading",
      description: "Two short essay-style passages.",
      questions: [
        {
          passage:
            "随着城市化进程的加快，越来越多的年轻人选择在大城市工作。这虽然带来了更多的发展机会，但是也增加了生活成本，工作压力也明显上升。专家认为，单纯追求高收入并不一定意味着更高的生活质量，平衡的生活方式同样重要。",
          prompt: "What does the expert suggest?",
          options: [
            "stick to small cities",
            "high income alone doesn't equal high quality of life",
            "find a higher-paying job",
            "young people should retire earlier",
          ],
          answer: 1,
        },
        {
          passage:
            "随着城市化进程的加快，越来越多的年轻人选择在大城市工作。这虽然带来了更多的发展机会，但是也增加了生活成本，工作压力也明显上升。专家认为，单纯追求高收入并不一定意味着更高的生活质量，平衡的生活方式同样重要。",
          prompt: "Which is NOT mentioned as a result of urbanization?",
          options: ["more development opportunities", "higher living costs", "more work pressure", "fewer social ties"],
          answer: 3,
        },
        {
          passage:
            "近年来，纸质书的销量略有回升。许多读者反映，长时间盯着屏幕容易疲劳，纸质书的阅读体验更舒服。也有出版社抓住机会，推出装帧精美的书籍，希望以独特的设计吸引读者。",
          prompt: "Why are paper books making a comeback?",
          options: [
            "they are cheaper than e-books",
            "screens cause eye fatigue and paper feels more comfortable",
            "schools now require them",
            "new tax incentives",
          ],
          answer: 1,
        },
        {
          passage:
            "近年来，纸质书的销量略有回升。许多读者反映，长时间盯着屏幕容易疲劳，纸质书的阅读体验更舒服。也有出版社抓住机会，推出装帧精美的书籍，希望以独特的设计吸引读者。",
          prompt: "What are some publishers doing?",
          options: [
            "releasing beautifully designed books to attract readers",
            "stopping all e-book sales",
            "translating more foreign novels",
            "lowering paper book prices significantly",
          ],
          answer: 0,
        },
      ],
    },
  ],
};

const hsk6: MockExam = {
  level: 6,
  durationMinutes: 70,
  passingPct: 60,
  intro:
    "HSK 6 expects 5000+ words and near-native reading comprehension: editorials, short stories, abstract argument. The grammar of this exam reflects formal written Chinese (书面语).",
  parts: [
    {
      section: "vocabulary",
      title: "Vocabulary",
      description: "Choose the closest meaning. Formal / literary register.",
      questions: [
        { prompt: "潜在", options: ["explicit", "potential / latent", "rapid", "fragile"], answer: 1 },
        { prompt: "辜负", options: ["to fulfil", "to surpass", "to let down (someone)", "to redeem"], answer: 2 },
        { prompt: "迄今为止", options: ["from now on", "by all means", "up until now", "never again"], answer: 2 },
        { prompt: "弊端", options: ["drawback / abuse (of a system)", "shortcut", "tendency", "promise"], answer: 0 },
        { prompt: "颇有", options: ["barely have", "to have quite a bit of", "to lack", "to overlook"], answer: 1 },
        { prompt: "斟酌", options: ["to deliberate / weigh (a decision)", "to declare", "to renounce", "to publish"], answer: 0 },
        { prompt: "兼顾", options: ["to attend to both sides", "to combine forcibly", "to alternate", "to give up one for the other"], answer: 0 },
        { prompt: "贡献", options: ["contribution", "obligation", "consumption", "renunciation"], answer: 0 },
        { prompt: "层出不穷", options: ["disappearing fast", "appearing endlessly", "always the same", "rarely seen"], answer: 1 },
      ],
    },
    {
      section: "grammar",
      title: "Grammar / register",
      description: "Pick the most natural formal register option.",
      questions: [
        {
          prompt: "___数据显示，今年的销量略有下降。",
          options: ["依据", "由于", "通过", "凭借"],
          answer: 0,
          explanation: "依据 = 'according to' — formal, used with reports/data.",
        },
        {
          prompt: "公司应当对员工的福利___给予重视。",
          options: ["予以", "得以", "加以", "致以"],
          answer: 0,
          explanation: "予以 + N = 'to give (sb./sth.) X' — formal written register.",
        },
        {
          prompt: "这一现象的出现，___与近年来的政策变化有关。",
          options: ["无非", "无非是", "未尝不", "未必"],
          answer: 3,
          explanation: "未必 = 'not necessarily' — adds nuanced hedge in essays.",
        },
        {
          prompt: "他的研究方法___传统，又结合了现代的手段。",
          options: ["既…又…", "不仅…就…", "宁可…也…", "尽管…但…"],
          answer: 0,
          explanation: "既 X 又 Y = 'both X and Y' — pairs traits.",
        },
        {
          prompt: "他的提议___大家深思。",
          options: ["值得", "可惜", "勉强", "想必"],
          answer: 0,
          explanation: "值得 + V = 'worth V-ing' — 值得深思 = worth contemplating.",
        },
        {
          prompt: "尽管面对很多困难，他___从未放弃过。",
          options: ["却", "都", "也", "已"],
          answer: 0,
          explanation: "尽管 X，却 Y = 'although X, yet Y' — 却 is the typical anchor.",
        },
      ],
    },
    {
      section: "reading",
      title: "Reading",
      description: "Two abstract passages.",
      questions: [
        {
          passage:
            "在快节奏的现代生活中，越来越多的人开始重新思考「慢」的价值。无论是慢食、慢阅读，还是步行而非乘车，这种生活方式的核心并非反对效率，而是希望在速度之外，找回对细节的体察和对自我的关照。",
          prompt: "According to the passage, the core of the 'slow' lifestyle is:",
          options: [
            "opposing all forms of efficiency",
            "rediscovering attention to detail and to oneself",
            "rejecting modern technology entirely",
            "living in the countryside",
          ],
          answer: 1,
        },
        {
          passage:
            "在快节奏的现代生活中，越来越多的人开始重新思考「慢」的价值。无论是慢食、慢阅读，还是步行而非乘车，这种生活方式的核心并非反对效率，而是希望在速度之外，找回对细节的体察和对自我的关照。",
          prompt: "Which is NOT given as an example of 'slow' living?",
          options: ["slow eating", "slow reading", "walking instead of driving", "early sleeping"],
          answer: 3,
        },
        {
          passage:
            "近年来，人工智能在创作领域引发了广泛讨论。有人担忧机器会逐步替代人类创作者，也有人认为人工智能恰恰能成为创作者的助手，让他们从重复劳动中解放出来。如何在创新和保护之间取得平衡，已成为各方关注的议题。",
          prompt: "What is the main tension described?",
          options: [
            "between authors and translators",
            "between innovation and protection",
            "between students and teachers",
            "between publishers and bookstores",
          ],
          answer: 1,
        },
        {
          passage:
            "近年来，人工智能在创作领域引发了广泛讨论。有人担忧机器会逐步替代人类创作者，也有人认为人工智能恰恰能成为创作者的助手，让他们从重复劳动中解放出来。如何在创新和保护之间取得平衡，已成为各方关注的议题。",
          prompt: "What does the author say AI could do for creators?",
          options: [
            "free them from repetitive work",
            "make their work obsolete",
            "earn money for them automatically",
            "translate their work",
          ],
          answer: 0,
        },
      ],
    },
  ],
};

export const mockExams: MockExam[] = [hsk1, hsk2, hsk3, hsk4, hsk5, hsk6];

export function getMockExam(level: number): MockExam | undefined {
  return mockExams.find((e) => e.level === level);
}
