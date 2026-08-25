export interface FallbackTopic {
  index: number;
  title: string;
  excerpt: string;
  url: string;
}

const TOPIC_POOL: { title: string; excerpt: string }[] = [
  { title: '当AI开始深度介入内容创作，人类创作者的护城河在哪里？', excerpt: 'AI生成的文章、画作、代码越来越多，有人焦虑被替代，有人认为品味与判断力才是稀缺资源。' },
  { title: '为什么越来越多的年轻人开始记录「精神退休」生活？', excerpt: '不辞职但降低欲望、拒绝无效加班、把生活调成低功耗模式，这届年轻人重新定义奋斗。' },
  { title: '网络热点事件反转不断，我们该如何保持独立判断？', excerpt: '从义愤填膺到剧情反转，舆论场的情绪来得快去得也快。信息素养成为当代必修课。' },
  { title: '中小城市的「新返乡青年」，正在创造怎样的生活方式？', excerpt: '远程办公、数字游民、小城创业——离开一线不是退路，而是另一种可能性的开始。' },
  { title: '如果记忆可以被数字化保存，你会选择上传吗？', excerpt: '技术逼近科幻：数字遗产、AI复逝者、意识上传的伦理讨论正在从哲学课堂走进现实。' },
  { title: '「搭子社交」为什么突然流行？浅层关系是治愈还是逃避？', excerpt: '饭搭子、健身搭子、旅行搭子——精准陪伴、边界清晰的轻社交方式引发热议。' },
  { title: '高校学术评价体系改革，年轻学者的出路在哪里？', excerpt: '非升即走、论文崇拜、帽子公司——学术圈的困境与破局成为持续讨论的公共议题。' },
  { title: '当「断亲」成为流行词，年轻人在重新定义亲情吗？', excerpt: '不主动联系亲戚、过年不回家、减少无效人情往来，年轻人开始给亲情关系做减法。' },
];

export function getFallbackTopics(): FallbackTopic[] {
  return TOPIC_POOL.map((t, i) => ({
    index: i,
    title: t.title,
    excerpt: t.excerpt,
    url: '',
  }));
}

export const fallbackTopics = { getFallbackTopics };
export default fallbackTopics;
