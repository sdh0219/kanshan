import { Hono } from 'hono';
import { setKV, syncEnvFromBindings } from './utils/runtime.js';

import { fingerprintService } from './services/fingerprintService.js';
import { companionService } from './services/companionService.js';
import { gameEngine } from './services/gameEngine.js';
import { caseGenerator } from './services/caseGenerator.js';
import { caseStore } from './services/caseStore.js';
import { zhihuApi } from './services/zhihuApi.js';
import { agentApi } from './services/agentApi.js';
import { socialPrompt } from './prompts/social.js';
import { seedUsers } from './data/seedUsers.js';
import { companionTemplates } from './data/companionTemplates.js';
import { getFallbackTopics } from './data/fallbackTopics.js';
import type { FingerprintResult } from './services/fingerprintService.js';

type Env = {
  Bindings: {
    ASSETS: { fetch: (req: Request) => Promise<Response> };
    DATA: any;
    [key: string]: any;
  };
};

const app = new Hono<Env>();

// 每次请求前注入 KV 与环境变量（vars/secrets 同步到 process.env，供服务层读取）
app.use('*', async (c, next) => {
  syncEnvFromBindings(c.env as unknown as Record<string, unknown>);
  if (c.env?.DATA) setKV(c.env.DATA);
  await next();
});

// 统一错误响应
app.onError((err, c) => {
  console.error('[ERROR]', err.message);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

/* ---------------- 指纹 ---------------- */
app.post('/api/fingerprint/analyze', async (c) => {
  const { userId } = await c.req.json<any>().catch(() => ({}));
  if (!userId) return c.json({ error: 'userId 必填' }, 400);
  const seedUser = (seedUsers as any)[userId];
  if (seedUser) {
    return c.json({ userId: seedUser.userId, displayName: seedUser.displayName, fingerprint: seedUser.fingerprint, cached: true });
  }
  const result = await fingerprintService.analyzeFingerprint(userId);
  return c.json({ userId, fingerprint: result, cached: false });
});

app.get('/api/fingerprint/seed-users', (c) => {
  const list = Object.values(seedUsers as Record<string, any>).map(u => ({
    userId: u.userId,
    displayName: u.displayName,
    keywords: u.fingerprint.keywords,
  }));
  return c.json({ users: list });
});

/* ---------------- 搭档 ---------------- */
app.post('/api/companion/generate', async (c) => {
  const { fingerprint } = await c.req.json<any>().catch(() => ({}));
  if (!fingerprint?.dimensions) return c.json({ error: 'fingerprint 必填' }, 400);
  return c.json({ companion: companionService.generateCompanion(fingerprint as FingerprintResult) });
});

app.post('/api/companion/intro', async (c) => {
  const { fingerprint, companion } = await c.req.json<any>().catch(() => ({}));
  if (!fingerprint || !companion) return c.json({ error: 'fingerprint 和 companion 必填' }, 400);
  const intro = await companionService.generateCompanionIntro(fingerprint as FingerprintResult, companion);
  return c.json({ intro });
});

app.post('/api/companion/action', async (c) => {
  const { companion, fingerprint, gamePhase, playerInput, context } = await c.req.json<any>().catch(() => ({}));
  if (!companion || !fingerprint || !gamePhase) return c.json({ error: 'companion, fingerprint, gamePhase 必填' }, 400);
  const reply = await companionService.companionAction(companion, fingerprint as FingerprintResult, gamePhase, playerInput || '', context);
  return c.json({ reply });
});

app.get('/api/companion/templates', (c) => c.json({ templates: companionTemplates }));

/* ---------------- 游戏 ---------------- */
app.get('/api/game/case', async (c) => {
  const caseId = c.req.query('caseId') || 'preset';
  const found = await caseStore.getCaseById(caseId);
  if (!found) return c.json({ error: '案件不存在' }, 404);
  return c.json({ case: found });
});

app.get('/api/game/cases', async (c) => {
  const cases = (await caseStore.listCases()).map(k => ({
    id: k.case_id,
    title: k.case_title,
    intro: (k.case_intro || '').substring(0, 80) + '...',
    source: k.source,
  }));
  return c.json({ cases });
});

app.post('/api/game/start', async (c) => {
  const { caseId } = await c.req.json<any>().catch(() => ({}));
  return c.json({ state: gameEngine.startGame(caseId || 'preset') });
});

app.post('/api/game/search', async (c) => {
  const { keyword, state, caseId } = await c.req.json<any>().catch(() => ({}));
  if (!keyword) return c.json({ error: 'keyword 必填' }, 400);
  const result = await gameEngine.searchForClues(keyword, { ...state, caseId: state?.caseId || caseId || 'preset' });
  return c.json(result as any);
});

app.post('/api/game/talk', async (c) => {
  const { npcId, question, state, companionFollowup, caseId } = await c.req.json<any>().catch(() => ({}));
  if (!npcId || !question) return c.json({ error: 'npcId 和 question 必填' }, 400);
  const reply = await gameEngine.talkToNpc(npcId, question, { ...state, caseId: state?.caseId || caseId || 'preset' }, companionFollowup);
  return c.json({ reply });
});

app.post('/api/game/evaluate', async (c) => {
  const { state, caseId, reasoning } = await c.req.json<any>().catch(() => ({}));
  if (!state?.clues) return c.json({ error: 'state.clues 必填' }, 400);
  const finalState = { ...state, caseId: state?.caseId || caseId || 'preset' };
  const { endingType, reasoningScore, reasoningComment } = await gameEngine.evaluateWithReasoning(finalState, reasoning || '');
  const caseData = await caseStore.getCaseById(finalState.caseId);
  const ending = caseData?.endings?.[endingType] || '';
  return c.json({ endingType, ending, truth: caseData?.truth || '', reasoningScore, reasoningComment });
});

app.post('/api/game/generate-case', async (c) => {
  const { hotTopicIndex } = await c.req.json<any>().catch(() => ({}));
  const result = await caseGenerator.generateCase(hotTopicIndex || 0);
  return c.json(result as any);
});

/* ---------------- 黑客松专用内容接口（官方 skill 0.5.3，无需鉴权）+ 额度 ---------------- */

app.get('/api/archive/stories', async (c) => {
  try {
    const raw = await zhihuApi.getHackathonStories();
    const items = (Array.isArray(raw) ? raw : []).slice(0, 12).map((s: any, i: number) => ({
      index: i,
      work_id: s.work_id || '',
      title: s.title || '未知故事',
      description: s.description || '',
      labels: s.labels || [],
    }));
    return c.json({ stories: items });
  } catch (err: any) {
    console.error(`[Archive] 故事列表不可用: ${err.message}`);
    return c.json({ stories: [], error: err.message }, 200);
  }
});

app.post('/api/archive/generate-story', async (c) => {
  const { workId } = await c.req.json<any>().catch(() => ({}));
  if (!workId) return c.json({ error: 'workId 必填' }, 400);
  const detail = await zhihuApi.getHackathonStoryDetail(String(workId));
  const { case: caseData, sourceTopic } = await caseGenerator.generateCaseFromStory(detail);
  const saved = await caseStore.saveGeneratedCase(caseData, sourceTopic);
  return c.json({ case: saved, sourceTopic });
});

app.get('/api/quota', async (c) => {
  try {
    const data = await zhihuApi.getQuota();
    return c.json({ quota: data?.Data || data });
  } catch (err: any) {
    return c.json({ error: err.message }, 200);
  }
});

/* ---------------- 档案室 ---------------- */
app.get('/api/archive/cases', async (c) => {
  const cases = (await caseStore.listCases()).map(k => ({
    case_id: k.case_id,
    case_title: k.case_title,
    case_intro: k.case_intro,
    source: k.source,
    source_topic: k.source_topic,
    created_by: k.created_by,
    created_at: k.created_at,
    npc_count: (k.npcs || []).length,
    search_direction_count: (k.search_directions || []).length,
    key_evidence_count: k.key_evidence_count || 3,
  }));
  return c.json({ cases });
});

app.get('/api/archive/case', async (c) => {
  const caseId = c.req.query('caseId') || 'preset';
  const found = await caseStore.getCaseById(caseId);
  if (!found) return c.json({ error: '案件不存在' }, 404);
  return c.json({ case: found });
});

function parseHotTopics(hotList: any) {
  const items = hotList?.Data?.Items || hotList?.data?.items || hotList?.data || hotList || [];
  return (Array.isArray(items) ? items : []).slice(0, 8).map((t: any, i: number) => ({
    index: i,
    title: t.Title || t.title || t.target?.title || `热榜话题${i + 1}`,
    excerpt: t.Summary || t.Excerpt || t.excerpt || t.summary || t.target?.excerpt || '',
    url: t.Url || t.url || '',
  })).filter((t: any) => t.title && !t.title.startsWith('热榜话题'));
}

app.get('/api/archive/hot-topics', async (c) => {
  try {
    const hotList = await zhihuApi.getHotList();
    const topics = parseHotTopics(hotList);
    if (topics.length === 0) throw new Error('热榜为空');
    return c.json({ topics, fallback: false });
  } catch (err: any) {
    console.warn(`[Archive] 热榜不可用(${err.message})，启用备用话题池`);
    return c.json({ topics: getFallbackTopics(), fallback: true });
  }
});

app.post('/api/archive/generate', async (c) => {
  const { hotTopicIndex } = await c.req.json<any>().catch(() => ({}));
  let topics: any[] = [];
  let usedFallback = false;
  try {
    const hotList = await zhihuApi.getHotList();
    topics = parseHotTopics(hotList);
  } catch {
    topics = [];
  }
  if (topics.length === 0) {
    topics = getFallbackTopics();
    usedFallback = true;
  }
  const topic = topics[hotTopicIndex || 0] || topics[0];
  const { case: caseData } = await caseGenerator.generateCaseFromTopic({ title: topic.title, excerpt: topic.excerpt });
  const saved = await caseStore.saveGeneratedCase(caseData, topic.title);
  return c.json({ case: saved, sourceTopic: topic, fallback: usedFallback });
});

app.post('/api/archive/custom', async (c) => {
  const { userInput, userId } = await c.req.json<any>().catch(() => ({}));
  if (!userInput || userInput.trim().length < 10) {
    return c.json({ error: '请输入至少10个字的事件描述' }, 400);
  }
  const { case: caseData } = await caseGenerator.generateCaseFromUserInput(userInput.trim());
  const saved = await caseStore.saveCustomCase(caseData, userId || 'anonymous', userInput.trim().substring(0, 50));
  return c.json({ case: saved });
});

app.post('/api/archive/record', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const { user_id, case_id, case_title, game_mode, ending_type, clue_count, key_clue_count, companion_clue_count, companion_name, user_display_name, duration_seconds } = body;
  if (!user_id || !case_id || !ending_type) {
    return c.json({ error: 'user_id, case_id, ending_type 必填' }, 400);
  }
  const record = await caseStore.saveExploreRecord({
    user_id,
    user_display_name,
    case_id,
    case_title: case_title || '未知案件',
    game_mode: game_mode === 'team' ? 'team' : 'solo',
    companion_name,
    ending_type,
    clue_count: clue_count || 0,
    key_clue_count: key_clue_count || 0,
    companion_clue_count: companion_clue_count || 0,
    duration_seconds,
  });
  return c.json({ record });
});

app.get('/api/archive/records', async (c) => {
  const userId = c.req.query('userId') || '';
  if (!userId) return c.json({ error: 'userId 必填' }, 400);
  const records = await caseStore.getUserRecords(userId);
  const stats = caseStore.computeStats(records);
  return c.json({ records, stats });
});

/* ---------------- 社交侦探榜 ---------------- */
app.post('/api/social/detective-board', async (c) => {
  const { fingerprint } = await c.req.json<any>().catch(() => ({}));
  if (!fingerprint?.dimensions) return c.json({ error: 'fingerprint 必填' }, 400);

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
        const searchResult = await zhihuApi.searchContent(q.query);
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

  return c.json({ detectiveBoard, cardText });
});

/* ---------------- 静态资源（前端 SPA） ---------------- */
app.get('*', async (c) => {
  if (c.env?.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not Found', 404);
});

export default app;
