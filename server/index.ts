import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { newsRouter } from './routes/news.js';
import { analyzeRouter } from './routes/analyze.js';
import { cachedRouter } from './routes/cached.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/news', newsRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/cached', cachedRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
