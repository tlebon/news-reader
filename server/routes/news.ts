import { Router } from 'express';
import { fetchNews } from '../services/newsService.js';

export const newsRouter = Router();

// GET /api/news?topic=AI&country=de&cursor=xxx
newsRouter.get('/', async (req, res) => {
  try {
    const topic = (req.query.topic as string) || 'artificial intelligence';
    const country = (req.query.country as string) || 'de';
    const cursor = req.query.cursor as string | undefined;

    const { articles, nextCursor } = await fetchNews(topic, country, cursor);

    res.json({
      success: true,
      count: articles.length,
      articles,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
