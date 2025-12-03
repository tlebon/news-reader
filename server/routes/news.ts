import { Router } from 'express';
import { fetchNews } from '../services/newsService.js';

export const newsRouter = Router();

// GET /api/news?topic=AI&country=de
newsRouter.get('/', async (req, res) => {
  try {
    const topic = (req.query.topic as string) || 'artificial intelligence';
    const country = (req.query.country as string) || 'de';

    const articles = await fetchNews(topic, country);

    res.json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
