import { agentApi } from './agentApi.js';
import { zhihuApi } from './zhihuApi.js';
import { caseGenPrompt } from '../prompts/caseGen.js';
import type { Request } from 'express';

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

export async function generateCaseFromTopic(topic: CaseTopic, req?: Request) {
  const prompt = caseGenPrompt
    .replace('{{hot_topic_title}}', topic.title)
    .replace('{{hot_topic_summary}}', topic.excerpt || '（无摘要，请基于话题标题自由发挥）');

  const caseData = await agentApi.chatJSON([
    { role: 'system', content: '你是知乎社区的AI剧本作家，擅长把社会热点改编成逻辑严密、有人情味的探案故事。' },
    { role: 'user', content: prompt },
  ]);

  return { case: normalizeGeneratedCase(caseData, topic), sourceTopic: topic };
}

export async function generateCase(hotTopicIndex: number, req?: Request) {
  const hotList = await zhihuApi.getHotList(req);
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
    req,
  );
}

export async function generateCaseFromUserInput(userInput: string, req?: Request) {
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

export const caseGenerator = { generateCase, generateCaseFromTopic, generateCaseFromUserInput };
export default caseGenerator;
