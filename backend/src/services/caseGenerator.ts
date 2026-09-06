import { agentApi } from './agentApi.js';
import { zhihuApi } from './zhihuApi.js';
import { caseGenPrompt } from '../prompts/caseGen.js';

export interface CaseTopic {
  title: string;
  excerpt: string;
}

function normalizeGeneratedCase(caseData: any, topic: CaseTopic): any {
  const normalized = { ...caseData };
  if (!normalized.case_title) normalized.case_title = topic.title;
  if (!normalized.case_intro) normalized.case_intro = topic.excerpt;
  if (!Array.isArray(normalized.npcs) || normalized.npcs.length === 0) {
    normalized.npcs = [];
  }
  if (!Array.isArray(normalized.search_directions) || normalized.search_directions.length === 0) {
    normalized.search_directions = [];
  }
  if (!normalized.key_evidence_count) {
    normalized.key_evidence_count = Math.min(3, normalized.search_directions?.length || 3);
  }
  return normalized;
}

export async function generateCaseFromTopic(topic: CaseTopic) {
  const prompt = caseGenPrompt
    .replace('{{hot_topic_title}}', topic.title)
    .replace('{{hot_topic_summary}}', topic.excerpt || '（无摘要，请基于话题标题自由发挥）');

  const caseData = await agentApi.chatJSON([
    { role: 'system', content: '你是知乎社区的AI剧本作家，擅长把社会热点改编成逻辑严密、有人情味的探案故事。' },
    { role: 'user', content: prompt },
  ]);

  return { case: normalizeGeneratedCase(caseData, topic), sourceTopic: topic };
}

export async function generateCase(hotTopicIndex: number) {
  const hotList = await zhihuApi.getHotList();
  const items = hotList?.Data?.Items || hotList?.data?.items || [];
  const list = (Array.isArray(items) ? items : []).slice(0, 8);
  const topic: any = list[hotTopicIndex] || list[0];

  if (!topic) {
    throw new Error('无法获取热榜话题');
  }

  return generateCaseFromTopic(
    {
      title: topic.Title || topic.title || topic.target?.title || '未知话题',
      excerpt: topic.Summary || topic.Excerpt || topic.excerpt || topic.target?.excerpt || '',
    },
  );
}

export async function generateCaseFromUserInput(userInput: string) {
  const prompt = caseGenPrompt
    .replace('{{hot_topic_title}}', '用户自定义事件')
    .replace('{{hot_topic_summary}}', userInput);

  const caseData = await agentApi.chatJSON([
    {
      role: 'system',
      content: '你是知乎社区的AI剧本作家，擅长把用户描述的事件改编成逻辑严密、有人情味、有悬疑感的探案故事。保持事件核心事实不变，但加入合理的推理层次和隐藏真相。',
    },
    { role: 'user', content: prompt },
  ]);

  return {
    case: normalizeGeneratedCase(caseData, { title: userInput.substring(0, 30) + '...', excerpt: userInput }),
    sourceInput: userInput,
  };
}

/**
 * 从盐言故事生成探案案件（黑客松专用内容接口，比赛宣传的"故事改编互动叙事"方向）。
 * 取故事导语+正文前 3000 字作为改编素材，要求保留原作氛围但重写为探案结构。
 */
export async function generateCaseFromStory(storyDetail: {
  chapter_name?: string;
  introduction?: string;
  content?: string;
  author_name?: string;
  labels?: string[];
}) {
  const material = [
    `标题：${storyDetail.chapter_name || '未知故事'}`,
    storyDetail.author_name ? `原作者：${storyDetail.author_name}` : '',
    storyDetail.labels?.length ? `标签：${storyDetail.labels.join('、')}` : '',
    `导语：${storyDetail.introduction || '（无）'}`,
    `正文节选：${(storyDetail.content || '').substring(0, 3000)}`,
  ].filter(Boolean).join('\n');

  const prompt = caseGenPrompt
    .replace('{{hot_topic_title}}', `盐言故事《${storyDetail.chapter_name || '未知故事'}》`)
    .replace('{{hot_topic_summary}}', material);

  const caseData = await agentApi.chatJSON([
    {
      role: 'system',
      content: '你是知乎社区的AI剧本作家，擅长把盐言故事改编成探案游戏：保留原作的背景与人物氛围，但把叙事重构为"悬案→搜证→证词→真相"的探案结构，设计合理的凶手、动机与三档结局。改编需尊重原作气质，不照抄原文句子。',
    },
    { role: 'user', content: prompt },
  ]);

  const topic: CaseTopic = {
    title: `盐言故事《${storyDetail.chapter_name || '未知'}》`,
    excerpt: storyDetail.introduction || (storyDetail.content || '').substring(0, 80),
  };
  return {
    case: normalizeGeneratedCase(caseData, topic),
    sourceTopic: topic.title,
  };
}

export const caseGenerator = {
  generateCase,
  generateCaseFromTopic,
  generateCaseFromUserInput,
  generateCaseFromStory,
};
export default caseGenerator;
