import { Router } from 'express';
import { fetchNews } from '../services/newsService.js';
import { getEmbeddings } from '../services/embeddingService.js';
import { kMeansClustering } from '../services/clusteringService.js';
import { analyzeFeed } from '../services/aiService.js';
import { upsertArticle, updateArticleSentiment, updateArticleCluster, saveFeedAnalysis, getRecentFeedAnalysis, getArticleAnalysis } from '../services/db.js';
import type { NewsArticle } from '../../src/types/index.js';

export const analyzeRouter = Router();

export interface AnalyzedFeed {
  summary: string;
  topKeywords: string[];
  clusters: Array<{
    id: number;
    label: string;
    articleIds: string[];
  }>;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
  articles: Array<NewsArticle & {
    sentiment: 'positive' | 'neutral' | 'negative';
    clusterId: number;
  }>;
  nextCursor: string | null;
}

// GET /api/analyze?topic=AI&region=de
// Fetches articles, embeds, clusters, and analyzes in one call
analyzeRouter.get('/', async (req, res) => {
  try {
    const topic = (req.query.topic as string) || 'artificial intelligence';
    const region = (req.query.region as string) || 'de';
    const cursor = req.query.cursor as string | undefined;
    const numClusters = Math.min(3, Math.max(2, parseInt(req.query.clusters as string) || 3));

    // Fetch articles from NewsData
    console.log(`Fetching news for topic="${topic}", region="${region}"${cursor ? `, cursor="${cursor}"` : ''}`);
    const { articles, nextCursor } = await fetchNews(topic, region, cursor);

    if (articles.length === 0) {
      return res.json({
        success: true,
        summary: 'No articles found for this topic and region.',
        topKeywords: [],
        clusters: [],
        sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
        articles: [],
        nextCursor: null,
      });
    }

    // Store articles in DB
    for (const article of articles) {
      upsertArticle(article);
    }

    // Check for cached feed analysis (only for initial load, not pagination)
    if (!cursor) {
      const cached = getRecentFeedAnalysis(topic, region, 30);
      if (cached) {
        // Get stored analysis for these articles
        const articleAnalysis = getArticleAnalysis(articles.map(a => a.article_id));

        // Check if we have sentiment data for most articles
        const articlesWithSentiment = articles.filter(a => {
          const analysis = articleAnalysis.get(a.article_id);
          return analysis && analysis.sentiment && analysis.sentiment !== 'neutral';
        }).length;

        // If at least 50% have real sentiment data, use cache
        if (articlesWithSentiment >= articles.length * 0.5) {
          console.log(`Returning cached feed analysis (${articlesWithSentiment}/${articles.length} articles have sentiment)`);

          const enrichedArticles = articles.map(article => {
            const analysis = articleAnalysis.get(article.article_id);
            return {
              ...article,
              sentiment: (analysis?.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
              clusterId: analysis?.clusterId ?? 0,
            };
          });

          // Rebuild cluster articleIds from enriched articles
          const clusterArticleIds = new Map<number, string[]>();
          for (const article of enrichedArticles) {
            const ids = clusterArticleIds.get(article.clusterId) || [];
            ids.push(article.article_id);
            clusterArticleIds.set(article.clusterId, ids);
          }

          // Recalculate sentiment counts from actual articles
          const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
          for (const article of enrichedArticles) {
            sentimentCounts[article.sentiment]++;
          }

          return res.json({
            success: true,
            cached: true,
            summary: cached.summary,
            topKeywords: cached.topKeywords,
            clusters: cached.clusterLabels.map((label: string, i: number) => ({
              id: i,
              label,
              articleIds: clusterArticleIds.get(i) || [],
            })),
            sentimentCounts,
            articles: enrichedArticles,
            nextCursor,
          });
        } else {
          console.log(`Cache miss: only ${articlesWithSentiment}/${articles.length} articles have sentiment data, re-analyzing`);
        }
      }
    }

    // Fresh analysis needed
    console.log('Getting embeddings...');
    const embeddings = await getEmbeddings(articles);

    console.log('Clustering articles...');
    const clusters = kMeansClustering(embeddings, numClusters);

    // Update cluster assignments in DB
    for (const cluster of clusters) {
      for (const articleId of cluster.articleIds) {
        updateArticleCluster(articleId, cluster.id);
      }
    }

    console.log('Analyzing feed with Claude...');
    const analysis = await analyzeFeed(articles, clusters);

    // Update sentiments in DB
    for (const [articleId, sentiment] of analysis.articleSentiments) {
      updateArticleSentiment(articleId, sentiment);
    }

    // Count sentiments
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const sentiment of analysis.articleSentiments.values()) {
      sentimentCounts[sentiment]++;
    }

    // Build response
    const enrichedArticles = articles.map(article => {
      const cluster = clusters.find(c => c.articleIds.includes(article.article_id));
      return {
        ...article,
        sentiment: analysis.articleSentiments.get(article.article_id) || 'neutral',
        clusterId: cluster?.id ?? 0,
      };
    });

    // Save feed analysis to DB (only for initial load)
    if (!cursor) {
      saveFeedAnalysis(
        topic,
        region,
        analysis.summary,
        analysis.topKeywords,
        sentimentCounts,
        analysis.clusterLabels,
        articles.map(a => a.article_id)
      );
    }

    const response: AnalyzedFeed = {
      summary: analysis.summary,
      topKeywords: analysis.topKeywords,
      clusters: clusters.map((cluster, i) => ({
        id: cluster.id,
        label: analysis.clusterLabels[i] || `Topic ${i + 1}`,
        articleIds: cluster.articleIds,
      })),
      sentimentCounts,
      articles: enrichedArticles,
      nextCursor,
    };

    res.json({ success: true, ...response });
  } catch (error) {
    console.error('Error analyzing feed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
