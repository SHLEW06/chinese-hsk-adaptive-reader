import type { ContentCategory } from "@/types/content";

const KEYWORDS: Record<ContentCategory, string[]> = {
  "Daily Life": ["每天", "起床", "上班", "周末", "习惯", "睡", "早饭"],
  Travel: ["旅行", "北京", "长城", "故宫", "机场", "酒店", "旅游"],
  "Pop Culture": ["电视剧", "电影", "演员", "歌", "明星", "奶茶"],
  "Gen Z / Internet Slang": ["网络", "用语", "yyds", "emo", "年轻人", "梗"],
  "Business / Economy": ["公司", "产品", "网购", "经济", "市场", "钱", "卖"],
  Food: ["吃", "好吃", "包子", "豆浆", "菜", "餐", "肉"],
  "China Trip Prep": ["手机", "付钱", "打车", "现金", "应用", "签证"],
  "Stories & Fables": ["故事", "从前", "狐狸", "寓言", "讲", "传说"],
  "News & Society": ["社会", "城市化", "调查", "现象", "政策", "趋势"],
  "Essays & Reflections": ["思考", "认为", "感受", "意义", "我觉得", "也许"],
  "History & Culture": ["历史", "古代", "朝", "诗", "传统", "文化"],
  "Science & Tech": ["技术", "人工智能", "量子", "互联网", "数据", "实验"],
  "Campus / Student Life": ["同学", "宿舍", "考试", "课", "校园", "毕业"],
  "Health & Wellness": ["健康", "运动", "感冒", "医生", "药", "休息"],
  "Technology & AI": ["人工智能", "AI", "算法", "模型", "软件", "智能"],
  "Relationships / Friendship": ["朋友", "感情", "恋爱", "结婚", "陪", "认识"],
  "Work / Career": ["工作", "面试", "公司", "项目", "经理", "职业"],
  "Shopping / Money": ["买", "卖", "便宜", "贵", "钱", "支付", "网购"],
  Transportation: ["地铁", "公共汽车", "高铁", "飞机", "出租车", "火车"],
  "Nature / Environment": ["环境", "森林", "河", "山", "天气", "污染", "鸟"],
};

/** Guess a category from text by simple keyword scoring. */
export const classifyContent = (text: string): ContentCategory => {
  let best: ContentCategory = "Daily Life";
  let bestScore = -1;
  (Object.keys(KEYWORDS) as ContentCategory[]).forEach((cat) => {
    const score = KEYWORDS[cat].reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  });
  return best;
};
