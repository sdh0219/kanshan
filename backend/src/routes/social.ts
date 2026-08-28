import { Router } from 'express';
import { zhihuApi } from '../services/zhihuApi.js';
import { agentApi } from '../services/agentApi.js';
import { socialPrompt } from '../prompts/social.js';
import type { FingerprintResult } from '../services/fingerprintService.js';

const router = Router();

router.post('/detective-board', async (req, res, next) => {
  try {
    const { fingerprint } = req.body;
    if (!fingerprint?.dimensions) {
      return res.status(400).json({ error: 'fingerprint 必填' });
    }

    const fp = fingerprint as FingerprintResult;
    const sorted = [...fp.dimensions].sort((a, b) => a.score - b.score);
    const weakDims = sorted.slice(0, 2).map(d => `${d.name}(${d.toward})`).join(', ');
    const weakKeywords = fp.detective_profile.weakness;

    const prompt = socialPrompt
      .replace('{{weak_dims}}', weakDims)
      .replace('{{weak_keywords}}', weakKeywords.join(', '));

    let queries: any[] = [];
    let cardText = '如果和TA一起探案，你们将是完美搭档。';

    try {
      const socialResult = await agentApi.chatJSON([
        { role: 'system', content: '你是知乎社区的社交匹配顾问。' },
        { role: 'user', content: prompt },
      ]);
      queries = socialResult.search_queries || [];
      cardText = socialResult.detective_card_text || cardText;
    } catch (err) {
      console.error(`[Social] Agent API失败，使用预设: ${(err as Error).message}`);
      queries = weakKeywords.slice(0, 2).map((kw: string, i: number) => ({
        query: `${kw} 知乎答主`,
        reason: `你的弱项是${kw}，找到这方面的优秀答主可以互补`,
        complement_dim: sorted[i]?.name || '',
      }));
    }

    const detectiveBoard = await Promise.all(
      queries.slice(0, 3).map(async (q: any) => {
        try {
          const searchResult = await zhihuApi.searchContent(q.query, req);
          const items = searchResult?.Data?.Items || searchResult?.data?.items || searchResult?.data || [];
          const topItem = Array.isArray(items) ? items[0] : null;
          // 搜索接口返回扁平的 PascalCase 字段（AuthorName/AuthorAvatar/Url）
          const name = topItem?.AuthorName || topItem?.author?.name || topItem?.target?.author?.name || '';
          const avatar = topItem?.AuthorAvatar || topItem?.author?.avatar_url || '';
          const url = topItem?.Url || topItem?.url || topItem?.target?.url || '';
          return {
            query: q.query,
            reason: q.reason,
            complementDim: q.complement_dim,
            zhihuUser: name ? { name, avatar, url } : null,
          };
        } catch {
          return { query: q.query, reason: q.reason, complementDim: q.complement_dim, zhihuUser: null };
        }
      }),
    );

    res.json({ detectiveBoard, cardText });
  } catch (err) {
    next(err);
  }
});

export default router;
