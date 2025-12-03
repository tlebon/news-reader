import { Router } from 'express';
import { getCachedArticles } from '../services/db.js';

export const cachedRouter = Router();

// GET /api/cached?topic=AI&region=de
// Returns cached articles with analysis from DB (instant, no API calls)
cachedRouter.get('/', async (req, res) => {
  try {
    const topic = (req.query.topic as string) || 'artificial intelligence';
    const region = (req.query.region as string) || 'de';

    const cached = getCachedArticles(topic, region);

    if (!cached) {
      return res.json({
        success: true,
        cached: false,
        articles: [],
        summary: '',
        topKeywords: [],
        clusters: [],
        sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
      });
    }

    // Build clusters from articles
    const clusterArticleIds = new Map<number, string[]>();
    for (const article of cached.articles) {
      const ids = clusterArticleIds.get(article.clusterId) || [];
      ids.push(article.article_id);
      clusterArticleIds.set(article.clusterId, ids);
    }

    // Recalculate sentiment counts
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const article of cached.articles) {
      if (article.sentiment in sentimentCounts) {
        sentimentCounts[article.sentiment as keyof typeof sentimentCounts]++;
      }
    }

    res.json({
      success: true,
      cached: true,
      articles: cached.articles,
      summary: cached.analysis.summary,
      topKeywords: cached.analysis.topKeywords,
      clusters: cached.analysis.clusterLabels.map((label: string, i: number) => ({
        id: i,
        label,
        articleIds: clusterArticleIds.get(i) || [],
      })),
      sentimentCounts,
    });
  } catch (error) {
    console.error('Error getting cached articles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
