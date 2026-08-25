import { agentApi } from './agentApi.js';
import { zhihuApi } from './zhihuApi.js';
import { fingerprintPrompt } from '../prompts/fingerprint.js';
import type { Request } from 'express';

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

export async function analyzeFingerprint(userId: string, req?: Request): Promise<FingerprintResult> {
  const cache = (req as any)?.app?.locals?.cache;
  const cacheKey = `fingerprint:${userId}`;
  if (cache) {
    const cached = cache.get(cacheKey) as FingerprintResult | undefined;
    if (cached) return cached;
  }

  const searchData = await zhihuApi.searchContent(userId, req);
  const answersText = extractAnswersText(searchData);

  if (!answersText.trim()) {
    return getFallbackFingerprint(userId);
  }

  const messages = [
    { role: 'system' as const, content: fingerprintPrompt },
    { role: 'user' as const, content: `以下是用户 "${userId}" 相关的知乎回答内容：\n\n${answersText}` },
  ];

  const result = await agentApi.chatJSON(messages);

  if (cache) cache.set(cacheKey, result);

  return result;
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
