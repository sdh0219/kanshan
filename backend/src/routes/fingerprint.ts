import { Router } from 'express';
import { fingerprintService } from '../services/fingerprintService.js';
import { seedUsers } from '../data/seedUsers.js';

const router = Router();

router.post('/analyze', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId 必填' });
    }

    const seedUser = seedUsers[userId];
    if (seedUser) {
      return res.json({
        userId: seedUser.userId,
        displayName: seedUser.displayName,
        fingerprint: seedUser.fingerprint,
        cached: true,
      });
    }

    const result = await fingerprintService.analyzeFingerprint(userId, req);
    res.json({ userId, fingerprint: result, cached: false });
  } catch (err) {
    next(err);
  }
});

router.get('/seed-users', (_req, res) => {
  const list = Object.values(seedUsers).map(u => ({
    userId: u.userId,
    displayName: u.displayName,
    keywords: u.fingerprint.keywords,
  }));
  res.json({ users: list });
});

export default router;
