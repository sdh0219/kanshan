import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';

import fingerprintRouter from './routes/fingerprint.js';
import companionRouter from './routes/companion.js';
import gameRouter from './routes/game.js';
import socialRouter from './routes/social.js';
import archiveRouter from './routes/archive.js';

const app = express();
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.locals.cache = cache;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/fingerprint', fingerprintRouter);
app.use('/api/companion', companionRouter);
app.use('/api/game', gameRouter);
app.use('/api/social', socialRouter);
app.use('/api/archive', archiveRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`看山探案录后端已启动: http://localhost:${PORT}`);
});

export default app;
