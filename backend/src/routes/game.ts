import { Router } from 'express';
import { gameEngine } from '../services/gameEngine.js';
import { caseGenerator } from '../services/caseGenerator.js';
import { caseStore } from '../services/caseStore.js';

const router = Router();

router.get('/case', (req, res) => {
  const caseId = (req.query.caseId as string) || 'preset';
  const c = caseStore.getCaseById(caseId);
  if (!c) return res.status(404).json({ error: '案件不存在' });
  res.json({ case: c });
});

router.get('/cases', (_req, res) => {
  const cases = caseStore.listCases().map(c => ({
    id: c.case_id,
    title: c.case_title,
    intro: (c.case_intro || '').substring(0, 80) + '...',
    source: c.source,
  }));
  res.json({ cases });
});

router.post('/start', (req, res) => {
  const { caseId } = req.body;
  const state = gameEngine.startGame(caseId || 'preset');
  res.json({ state });
});

router.post('/search', async (req, res, next) => {
  try {
    const { keyword, state } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: 'keyword 必填' });
    }
    const result = await gameEngine.searchForClues(
      keyword,
      { ...state, caseId: state?.caseId || req.body.caseId || 'preset' },
      req,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/talk', async (req, res, next) => {
  try {
    const { npcId, question, state, companionFollowup, caseId } = req.body;
    if (!npcId || !question) {
      return res.status(400).json({ error: 'npcId 和 question 必填' });
    }
    const reply = await gameEngine.talkToNpc(
      npcId,
      question,
      { ...state, caseId: state?.caseId || caseId || 'preset' },
      companionFollowup,
    );
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

router.post('/evaluate', async (req, res, next) => {
  try {
    const { state, caseId, reasoning } = req.body;
    if (!state?.clues) {
      return res.status(400).json({ error: 'state.clues 必填' });
    }
    const finalState = { ...state, caseId: state?.caseId || caseId || 'preset' };
    const { endingType, reasoningScore, reasoningComment } = await gameEngine.evaluateWithReasoning(
      finalState,
      reasoning || '',
      req,
    );
    const caseData = caseStore.getCaseById(finalState.caseId);
    const ending = caseData?.endings?.[endingType] || '';
    res.json({ endingType, ending, truth: caseData?.truth || '', reasoningScore, reasoningComment });
  } catch (err) {
    next(err);
  }
});

router.post('/generate-case', async (req, res, next) => {
  try {
    const { hotTopicIndex } = req.body;
    const result = await caseGenerator.generateCase(hotTopicIndex || 0, req);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
