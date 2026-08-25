import { Router } from 'express';
import { caseStore } from '../services/caseStore.js';
import { caseGenerator } from '../services/caseGenerator.js';
import { zhihuApi } from '../services/zhihuApi.js';
import { getFallbackTopics } from '../data/fallbackTopics.js';

const router = Router();

function parseHotTopics(hotList: any) {
  const items = hotList?.Data?.Items || hotList?.data?.items || hotList?.data || hotList || [];
  return (Array.isArray(items) ? items : []).slice(0, 8).map((t: any, i: number) => ({
    index: i,
    title: t.Title || t.title || t.target?.title || `热榜话题${i + 1}`,
    excerpt: t.Summary || t.Excerpt || t.excerpt || t.summary || t.target?.excerpt || '',
    url: t.Url || t.url || '',
  })).filter((t: any) => t.title && !t.title.startsWith('热榜话题'));
}

router.get('/cases', (_req, res) => {
  const cases = caseStore.listCases().map(c => ({
    case_id: c.case_id,
    case_title: c.case_title,
    case_intro: c.case_intro,
    source: c.source,
    source_topic: c.source_topic,
    created_by: c.created_by,
    created_at: c.created_at,
    npc_count: (c.npcs || []).length,
    search_direction_count: (c.search_directions || []).length,
    key_evidence_count: c.key_evidence_count || 3,
  }));
  res.json({ cases });
});

router.get('/case', (req, res) => {
  const caseId = (req.query.caseId as string) || 'preset';
  const c = caseStore.getCaseById(caseId);
  if (!c) return res.status(404).json({ error: '案件不存在' });
  res.json({ case: c });
});

router.get('/hot-topics', async (req, res) => {
  try {
    const hotList = await zhihuApi.getHotList(req);
    const topics = parseHotTopics(hotList);
    if (topics.length === 0) throw new Error('热榜为空');
    res.json({ topics, fallback: false });
  } catch (err: any) {
    console.warn(`[Archive] 热榜不可用(${err.message})，启用备用话题池`);
    res.json({ topics: getFallbackTopics(), fallback: true });
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const { hotTopicIndex } = req.body;
    let topics: any[] = [];
    let usedFallback = false;

    try {
      const hotList = await zhihuApi.getHotList(req);
      topics = parseHotTopics(hotList);
    } catch {
      topics = [];
    }
    if (topics.length === 0) {
      topics = getFallbackTopics();
      usedFallback = true;
    }

    const topic = topics[hotTopicIndex || 0] || topics[0];
    const { case: caseData } = await caseGenerator.generateCaseFromTopic(
      { title: topic.title, excerpt: topic.excerpt },
      req,
    );
    const saved = caseStore.saveGeneratedCase(caseData, topic.title);
    res.json({ case: saved, sourceTopic: topic, fallback: usedFallback });
  } catch (err) {
    next(err);
  }
});

router.post('/custom', async (req, res, next) => {
  try {
    const { userInput, userId } = req.body;
    if (!userInput || userInput.trim().length < 10) {
      return res.status(400).json({ error: '请输入至少10个字的事件描述' });
    }
    const { case: caseData } = await caseGenerator.generateCaseFromUserInput(userInput.trim(), req);
    const saved = caseStore.saveCustomCase(caseData, userId || 'anonymous', userInput.trim().substring(0, 50));
    res.json({ case: saved });
  } catch (err) {
    next(err);
  }
});

router.post('/record', (req, res) => {
  const { user_id, case_id, case_title, game_mode, ending_type, clue_count, key_clue_count, companion_clue_count, companion_name, user_display_name, duration_seconds } = req.body;
  if (!user_id || !case_id || !ending_type) {
    return res.status(400).json({ error: 'user_id, case_id, ending_type 必填' });
  }
  const record = caseStore.saveExploreRecord({
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
  res.json({ record });
});

router.get('/records', (req, res) => {
  const userId = (req.query.userId as string) || '';
  if (!userId) return res.status(400).json({ error: 'userId 必填' });
  const records = caseStore.getUserRecords(userId);
  const stats = caseStore.computeStats(records);
  res.json({ records, stats });
});

export default router;
