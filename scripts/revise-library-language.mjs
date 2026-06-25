import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libraryDirectory = path.join(root, "src", "data", "library");
const files = [1, 2, 3, 4, 5, 6].map((level) =>
  path.join(libraryDirectory, `hsk${level}.json`),
);

const sentenceTranslations = new Map([
  ["早上我七点起床。", "I get up at seven in the morning."],
  ["吃完饭以后，我去学校。", "After eating, I go to school."],
  ["吃完饭以后，我去商店。", "After eating, I go to the store."],
  ["吃完饭以后，我去公园。", "After eating, I go to the park."],
  ["吃完饭以后，我去北京。", "After eating, I go to Beijing."],
  ["我吃面包，也喝茶。", "I eat bread and drink tea."],
  ["我喝水，也喝茶。", "I drink water and tea."],
  ["我吃面，也喝茶。", "I eat noodles and drink tea."],
  ["朋友喜欢面条。", "My friend likes noodles."],
  ["妈妈在家，爸爸也在家。", "Mom and Dad are both at home."],
  ["吃完饭以后，我回家。", "After eating, I go home."],
  ["爸爸问我：今天过得好吗？", "Dad asks me, “Did you have a good day today?”"],
  [
    "我喜欢这一天，因为有家人、朋友，也有学习中文的时间。",
    "I like this day because I have family, friends, and time to study Chinese.",
  ],
  ["我想了想，然后回答。", "I thought for a moment and then answered."],
  ["我笑了。", "I smiled."],
  ["妈妈问我：你今天高兴吗？", "Mom asks me, “Are you happy today?”"],
  ["我说：我很高兴。", "I say, “I’m very happy.”"],
  ["我说：老师好。", "I say, “Hello, teacher.”"],
  ["我说：很好。", "I say, “It was very good.”"],
  ["我说：我知道了。", "I say, “I understand now.”"],
  ["老师说：早上好。", "The teacher says, “Good morning.”"],
  ["她说：你很不错。", "She says, “You’re doing very well.”"],
  ["妈妈说：七点半。", "Mom says, “Seven thirty.”"],
  ["爸爸说：好好学习。", "Dad says, “Study hard.”"],
  ["我说：好的。", "I say, “Okay.”"],
  ["我拿书，也拿水。", "I take my book and some water."],
  ["我把书放进书包里。", "I put my book into my backpack."],
  [
    "我觉得有点儿晚，所以很快洗脸，吃早饭。",
    "I was running a little late, so I quickly washed my face and ate breakfast.",
  ],
  ["妈妈问我今天要不要去公园。", "Mom asked whether I needed to go to the park today."],
  ["妈妈问我今天要不要去图书馆。", "Mom asked whether I needed to go to the library today."],
  ["妈妈问我今天要不要去饭店。", "Mom asked whether I needed to go to the restaurant today."],
  ["妈妈问我今天要不要去地铁站。", "Mom asked whether I needed to go to the subway station today."],
  ["妈妈问我今天要不要去超市。", "Mom asked whether I needed to go to the supermarket today."],
  ["妈妈问我今天要不要去公司。", "Mom asked whether I needed to go to the office today."],
  ["我说要去，因为我和老师有一个计划。", "I said yes, because the teacher and I had a plan."],
  ["我说要去，因为我和同学有一个计划。", "I said yes, because my classmate and I had a plan."],
  ["老师说他还有五分钟到。", "The teacher said he would arrive in five minutes."],
  ["同学说他还有五分钟到。", "My classmate said he would arrive in five minutes."],
  ["老师帮我看了看，说问题不大。", "The teacher looked it over for me and said it was not a big problem."],
  ["同学帮我看了看，说问题不大。", "My classmate looked it over for me and said it was not a big problem."],
  ["老师点了一碗面。", "The teacher ordered a bowl of noodles."],
  ["同学点了一碗面。", "My classmate ordered a bowl of noodles."],
  ["我打开手机地图，看了好几遍路线。", "I opened the map on my phone and looked at the route several times."],
  ["上个周末，我因为一件小事去了上海。", "Last weekend, I went to Shanghai for a small errand."],
  ["上个周末，我因为一件小事去了北京。", "Last weekend, I went to Beijing for a small errand."],
  ["我们在上海的一条老街走了走。", "We strolled along an old street in Shanghai."],
  ["我们在北京的一条老街走了走。", "We strolled along an old street in Beijing."],
  ["以这个话题为例，它不只是个人选择。", "Take this topic as an example: it is not merely a matter of personal choice."],
  ["安娜说她五分钟后到。", "Anna said she would arrive in five minutes."],
  ["我在门口等她。", "I waited for her at the entrance."],
  ["她说慢慢来，不要着急。", "She said to take it slowly and not worry."],
  ["因为她说得很清楚，所以我很快明白了。", "Because she explained it clearly, I understood quickly."],
  ["她说最近学习很忙。", "She said she had been busy studying recently."],
]);

const grammarDefinitions = [
  {
    pattern: "因为…所以…",
    label: "Reason and result",
    matches: (sentence) => sentence.includes("因为") && sentence.includes("所以"),
    explanationEn:
      "The first connector introduces the reason and the second introduces the result. Together they make the cause-and-effect relationship explicit.",
  },
  {
    pattern: "如果…就…",
    label: "Condition and result",
    matches: (sentence) => sentence.includes("如果") && sentence.includes("就"),
    explanationEn:
      "The first connector introduces a condition; the second marks what happens when that condition is met.",
  },
  {
    pattern: "只要…就…",
    label: "Sufficient condition",
    matches: (sentence) => sentence.includes("只要") && sentence.includes("就"),
    explanationEn:
      "The opening phrase means “as long as.” Together with the result marker, it states that one condition is enough for the result to follow.",
  },
  {
    pattern: "虽然…但是…",
    label: "Concession and contrast",
    matches: (sentence) => sentence.includes("虽然") && sentence.includes("但是"),
    explanationEn:
      "The first connector introduces a concession, and the second gives the contrasting main point. English often uses only “although,” but Chinese commonly keeps both markers.",
  },
  {
    pattern: "一方面…另一方面…",
    label: "Two sides of an issue",
    matches: (sentence) => sentence.includes("一方面") && sentence.includes("另一方面"),
    explanationEn:
      "The two paired phrases present related sides of the same issue. They organize a balanced comparison rather than a simple opposition.",
  },
  {
    pattern: "不仅…也…",
    label: "Adding a second point",
    matches: (sentence) => sentence.includes("不仅") && sentence.includes("也"),
    explanationEn:
      "The first marker introduces one point, and the second adds another. The pattern means “not only … but also …”.",
  },
  {
    pattern: "与其…不如…",
    label: "Choosing the better option",
    matches: (sentence) => sentence.includes("与其") && sentence.includes("不如"),
    explanationEn:
      "This pattern compares two options and recommends the second as the better choice: “rather than A, it is better to B.”",
  },
  {
    pattern: "即使…也…",
    label: "Concession",
    matches: (sentence) => sentence.includes("即使") && sentence.includes("也"),
    explanationEn:
      "The opening phrase means “even if.” The following marker shows that the main statement still holds despite that condition.",
  },
  {
    pattern: "只有…才…",
    label: "Necessary condition",
    matches: (sentence) => sentence.includes("只有") && sentence.includes("才"),
    explanationEn:
      "The opening phrase sets a necessary condition, and the second marker introduces the result that can happen only under that condition.",
  },
  {
    pattern: "并非…而是…",
    label: "Formal correction",
    matches: (sentence) => sentence.includes("并非") && sentence.includes("而是"),
    explanationEn:
      "The first phrase formally rejects the first description, while the second supplies the more accurate one: “is not … but rather …”.",
  },
  {
    pattern: "并不…而是…",
    label: "Correction and contrast",
    matches: (sentence) => sentence.includes("并不") && sentence.includes("而是"),
    explanationEn:
      "The first phrase emphasizes that the first description is not true; the second introduces the corrected description.",
  },
  {
    pattern: "对…来说",
    label: "Point of view",
    matches: (sentence) => sentence.includes("对") && sentence.includes("来说"),
    explanationEn:
      "This phrase frames the statement from a particular person’s or group’s perspective: “for …” or “as far as … is concerned.”",
  },
  {
    pattern: "把字句",
    label: "Disposing of an object",
    matches: (sentence) => /把.+?(?:放|写|拿|告诉|带|看|做|变|当|给)/u.test(sentence),
    explanationEn:
      "This construction brings a specific object before the verb to emphasize what is done with it and the resulting action or state.",
  },
  {
    pattern: "被字句",
    label: "Passive voice",
    matches: (sentence) => /被.+?(?:看|说|当|用|带|影响|改变|接受|忽略|排除)/u.test(sentence),
    explanationEn:
      "This marks a passive construction: the subject receives an action instead of performing it.",
  },
  {
    pattern: "越来越…",
    label: "Gradual change",
    matches: (sentence) => sentence.includes("越来越"),
    explanationEn:
      "This form is followed by a quality or state to show gradual change over time: “more and more …”.",
  },
  {
    pattern: "动词 + 得 + 补语",
    label: "Degree complement",
    matches: (sentence) => /(?:写|说|走|跑|回答|过|吃|做|学|唱|睡|跳|讲|看)得(?:很|不|太|好|多|快|慢|清楚|认真)/u.test(sentence),
    explanationEn:
      "The complement marker introduces a phrase that describes the degree or manner of an action. It answers how well, how quickly, or to what extent something is done.",
  },
  {
    pattern: "动词 + 完 + 以后",
    label: "Completed action before the next step",
    matches: (sentence) => /[\u3400-\u9fff]完.+以后/u.test(sentence),
    explanationEn:
      "The completed-action form means “finish doing [the verb].” The following time word then places the next action after that completed action.",
  },
  {
    pattern: "一…就…",
    label: "Immediate sequence",
    matches: (sentence) => /一(?:到|看|听|出|开始|离开|回到|完成).{0,18}就/u.test(sentence),
    explanationEn:
      "This paired pattern links two actions that follow each other immediately: “as soon as A happens, B happens.”",
  },
  {
    pattern: "…的时候",
    label: "Time frame",
    matches: (sentence) => sentence.includes("的时候"),
    explanationEn:
      "This time phrase follows an action, event, or time expression and sets the time frame for the main clause: “when …”.",
  },
  {
    pattern: "不要 + 动词",
    label: "Negative instruction",
    matches: (sentence) => sentence.includes("不要"),
    explanationEn:
      "This form placed before a verb tells someone not to do that action. It is the standard negative form for an instruction or request.",
  },
  {
    pattern: "才",
    label: "Only then / not until",
    matches: (sentence) => sentence.includes("才") && !sentence.includes("刚才"),
    explanationEn:
      "This word emphasizes that something happens only then, later than expected, or after a necessary condition has been met.",
  },
];

function grammarFor(sentence, translation, level) {
  return grammarDefinitions
    .filter((definition) => definition.matches(sentence))
    .slice(0, 3)
    .map((definition) => ({
      pattern: definition.pattern,
      label: definition.label,
      explanationEn: definition.explanationEn,
      hskLevel: level,
      exampleZh: sentence,
      exampleEn: translation,
    }));
}

function sentenceWithTitle(item) {
  const title = item.titleEn.trim();
  const terminal = /[.!?]$/u.test(title) ? "" : ".";
  return `The topic I want to discuss today is “${title}”${terminal}`;
}

function summaryWithTitle(item) {
  const title = item.titleEn.trim();
  const terminal = /[.!?]$/u.test(title) ? "" : ".";
  return `An HSK ${item.hskLevel} reading titled “${title}”${terminal}`;
}

function reviseLine(item, line) {
  let revised = line.replaceAll("我们们", "我们");
  let translation;

  if (item.hskLevel === 1 && /^今天我想说.+。$/u.test(revised)) {
    revised = `今天我想谈谈《${item.titleZh}》。`;
    translation = sentenceWithTitle(item);
  }

  const sourceRepairs = new Map([
    ["中午我七点起床。", "早上我七点起床。"],
    ["下午我七点起床。", "早上我七点起床。"],
    ["晚上我七点起床。", "早上我七点起床。"],
    ["我吃茶，也喝茶。", "我吃面包，也喝茶。"],
    ["我吃水，也喝茶。", "我喝水，也喝茶。"],
    ["朋友喜欢面。", "朋友喜欢面条。"],
    ["妈妈在家，妈妈也在家。", "妈妈在家，爸爸也在家。"],
    ["吃完饭以后，我去家。", "吃完饭以后，我回家。"],
    ["爸爸问我：今天好吗？", "爸爸问我：今天过得好吗？"],
    [
      "因为有家人，有朋友，也有中文。",
      "我喜欢这一天，因为有家人、朋友，也有学习中文的时间。",
    ],
    [
      "因为有家人，有朋友，也有学习中文的时间。",
      "我喜欢这一天，因为有家人、朋友，也有学习中文的时间。",
    ],
    ["我把书包放进书包里。", "我把书放进书包里。"],
  ]);
  revised = sourceRepairs.get(revised) ?? revised;

  if (item.hskLevel === 3 && /^我打开[^，]+，看了好几遍路线。$/u.test(revised)) {
    revised = "我打开手机地图，看了好几遍路线。";
  }

  if (item.hskLevel === 4 && /^以.+为例，它不只是一个个人选择。$/u.test(revised)) {
    revised = "以这个话题为例，它不只是个人选择。";
  }

  if (item.hskLevel === 2 && item.textZh.includes("安娜")) {
    const annaRepairs = new Map([
      ["安娜说他还有五分钟到。", "安娜说她五分钟后到。"],
      ["我在门口等他。", "我在门口等她。"],
      ["他说慢慢来，不要着急。", "她说慢慢来，不要着急。"],
      ["因为他说得很清楚，所以我很快明白了。", "因为她说得很清楚，所以我很快明白了。"],
      ["他说最近学习很忙。", "她说最近学习很忙。"],
    ]);
    revised = annaRepairs.get(revised) ?? revised;
  }

  return { revised, translation };
}

function reviseItem(item) {
  item.summaryEn = summaryWithTitle(item);
  const existingTranslations = new Map(
    (item.sentenceExplanations ?? []).map((entry) => [entry.zh, entry.en]),
  );
  const sentences = [];
  const seen = new Set();

  for (const line of item.textZh.split(/\n+/u).map((value) => value.trim()).filter(Boolean)) {
    const { revised, translation: titleTranslation } = reviseLine(item, line);
    if (seen.has(revised)) continue;
    seen.add(revised);

    const translation =
      titleTranslation ??
      sentenceTranslations.get(revised) ??
      existingTranslations.get(line) ??
      existingTranslations.get(revised);
    if (!translation?.trim()) {
      throw new Error(`${item.id}: no translation for ${revised}`);
    }
    sentences.push({ zh: revised, en: translation.trim() });
  }

  item.textZh = sentences.map((sentence) => sentence.zh).join("\n");
  item.translation = sentences.map((sentence) => sentence.en).join(" ");
  item.translationEn = item.translation;
  item.paragraphTranslations = sentences.map((sentence, index) => ({
    zh: sentence.zh,
    en: sentence.en,
    sentenceIds: [`s${index + 1}`],
  }));
  item.sentenceExplanations = sentences.map((sentence, index) => ({
    id: `s${index + 1}`,
    zh: sentence.zh,
    en: sentence.en,
    naturalMeaning: sentence.en,
    grammar: grammarFor(sentence.zh, sentence.en, item.hskLevel),
    // The previous generated phrase lists contained unreliable dictionary
    // senses. An explicit empty list prevents a misleading fallback gloss.
    phrases: [],
  }));
  item.grammarFocus = [
    ...new Set(item.sentenceExplanations.flatMap((sentence) => sentence.grammar.map((grammar) => grammar.pattern))),
  ];
  item.estimatedChars = Array.from(item.textZh.replace(/\s/gu, "")).length;
  item.estimatedWords = sentences.length;
  item.estimatedMinutes = Math.max(1, Math.ceil(sentences.length / 12));
  return { revisedSentences: sentences.length };
}

const write = process.argv.includes("--write");
let itemCount = 0;
let sentenceCount = 0;

for (const file of files) {
  const items = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const item of items) {
    const result = reviseItem(item);
    itemCount += 1;
    sentenceCount += result.revisedSentences;
  }
  if (write) fs.writeFileSync(file, `${JSON.stringify(items, null, 2)}\n`);
}

console.log(`${write ? "Revised" : "Validated"} ${itemCount} readings and ${sentenceCount} sentence records.`);
