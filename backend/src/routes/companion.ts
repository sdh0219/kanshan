import { Router } from 'express';
import { companionService } from '../services/companionService.js';
import { companionTemplates } from '../data/companionTemplates.js';
import type { FingerprintResult } from '../services/fingerprintService.js';

const router = Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { fingerprint } = req.body;
    if (!fingerprint?.dimensions) {
      return res.status(400).json({ error: 'fingerprint 必填' });
    }

    const companion = companionService.generateCompanion(fingerprint as FingerprintResult);
    res.json({ companion });
  } catch (err) {
    next(err);
  }
});

router.post('/intro', async (req, res, next) => {
  try {
    const { fingerprint, companion } = req.body;
    if (!fingerprint || !companion) {
      return res.status(400).json({ error: 'fingerprint 和 companion 必填' });
    }

    const intro = await companionService.generateCompanionIntro(
      fingerprint as FingerprintResult,
      companion,
    );
    res.json({ intro });
  } catch (err) {
    next(err);
  }
});

router.post('/action', async (req, res, next) => {
  try {
    const { companion, fingerprint, gamePhase, playerInput, context } = req.body;
    if (!companion || !fingerprint || !gamePhase) {
      return res.status(400).json({ error: 'companion, fingerprint, gamePhase 必填' });
    }

    const reply = await companionService.companionAction(
      companion,
      fingerprint as FingerprintResult,
      gamePhase,
      playerInput || '',
      context,
    );
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

router.get('/templates', (_req, res) => {
  res.json({ templates: companionTemplates });
});

export default router;
