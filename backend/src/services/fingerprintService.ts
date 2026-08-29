import { agentApi } from './agentApi.js';
import { zhihuApi } from './zhihuApi.js';
import { fingerprintPrompt } from '../prompts/fingerprint.js';
import { cache } from '../utils/runtime.js';

export interface FingerprintDimension {
  name: string;
  score: number;
  toward: string;
  evidence: string;
}

export interface DetectiveProfile {
  strength: string[];
  weakness: string[];
  style: string;
}

export interface FingerprintResult {
  dimensions: FingerprintDimension[];
  detective_profile: DetectiveProfile;
  summary: string;
  keywords: string[];
}

export async function analyzeFingerprint(userId: string): Promise<FingerprintResult> {
  const cacheKey = `fingerprint:${userId}`;
  const cached = cache.get(cacheKey) as FingerprintResult | undefined;
  if (cached) return cached;

  let answersText = '';
  try {
    const searchData = await zhihuApi.searchContent(userId);
    answersText = extractAnswersText(searchData);
  } catch (err) {
    console.error(`[Fingerprint] 获取用户内容失败，使用默认画像: ${(err as Error).message}`);
    return getFallbackFingerprint(userId);
  }

  if (!answersText.trim()) {
    return getFallbackFingerprint(userId);
  }

  const messages = [
    { role: 'system' as const, content: fingerprintPrompt },
    { role: 'user' as const, content: `以下是用户 "${userId}" 相关的知乎回答内容：\n\n${answersText}` },
  ];

  try {
    const result = await agentApi.chatJSON(messages);
    // 直答模型经常无视输出 schema，字段不合规就回退默认画像
    const dims = result?.dimensions;
    const dimsValid = Array.isArray(dims) && dims.length === 5
      && dims.every((d: any) => d && typeof d.name === 'string' && typeof d.score === 'number');
    const profileValid = result?.detective_profile
      && Array.isArray(result.detective_profile.strength)
      && Array.isArray(result.detective_profile.weakness);
    if (!dimsValid || !profileValid) {
      console.error('[Fingerprint] Agent 输出不符合 schema，使用默认画像');
      return getFallbackFingerprint(userId);
    }
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`[Fingerprint] Agent 分析失败，使用默认画像: ${(err as Error).message}`);
    return getFallbackFingerprint(userId);
  }
}

function extractAnswersText(searchData: any): string {
  const items = searchData?.Data?.Items || searchData?.data?.items || [];
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .slice(0, 10)
    .map((item: any) => {
      const title = item.Title || item.title || '';
      const text = item.ContentText || item.content_text || item.excerpt || '';
      return `${title}\n${text}`;
    })
    .filter((t: string) => t.length > 0)
    .join('\n\n---\n\n')
    .substring(0, 8000);
}

function getFallbackFingerprint(userId: string): FingerprintResult {
  return {
    dimensions: [
      { name: '逻辑-感性', score: 6.0, toward: '均衡', evidence: '无法获取足够数据，使用默认值' },
      { name: '宏观-微观', score: 5.0, toward: '均衡', evidence: '无法获取足够数据，使用默认值' },
      { name: '理论-实践', score: 5.0, toward: '均衡', evidence: '无法获取足够数据，使用默认值' },
      { name: '乐观-批判', score: 6.0, toward: '偏批判型', evidence: '无法获取足够数据，使用默认值' },
      { name: '深度-广度', score: 5.0, toward: '均衡', evidence: '无法获取足够数据，使用默认值' },
    ],
    detective_profile: {
      strength: ['综合分析'],
      weakness: ['数据不足'],
      style: '无法确定具体风格，使用默认均衡型侦探画像',
    },
    summary: `用户 ${userId} 的知乎内容数据不足，使用默认侦探画像。建议使用预设用户快速体验。`,
    keywords: ['默认', '均衡', '通用'],
  };
}

export const fingerprintService = { analyzeFingerprint };
export default fingerprintService;
