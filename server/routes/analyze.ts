import { Router } from 'express';
import { analyzeArticles, mapClaudeResponse } from '../services/aiService.js';
import type { NewsArticle, EnrichedArticle } from '../../src/types/index.js';

export const analyzeRouter = Router();

// POST /api/analyze
// Body: { articles: NewsArticle[] }
// Returns articles enriched with Claude analysis
analyzeRouter.post('/', async (req, res) => {
  try {
    const { articles } = req.body as { articles: NewsArticle[] };

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No articles provided',
      });
    }

    console.log(`Analyzing ${articles.length} articles...`);

    const analyses = await analyzeArticles(articles);
    const analysisMap = mapClaudeResponse(analyses);

    // Merge Claude analysis into articles
    const enrichedArticles: EnrichedArticle[] = articles.map(article => ({
      ...article,
      claude: analysisMap.get(article.article_id),
    }));

    res.json({
      success: true,
      articles: enrichedArticles,
    });
  } catch (error) {
    console.error('Error analyzing articles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
