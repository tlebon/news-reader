import { Router } from 'express';
import { getEmbeddings } from '../services/embeddingService.js';
import { kMeansClustering } from '../services/clusteringService.js';
import { analyzeFeed } from '../services/aiService.js';
import { updateArticleSentiment, updateArticleCluster, saveFeedAnalysis, getRecentFeedAnalysis, getArticleAnalysis, getArticlesByIds } from '../services/db.js';
import type { NewsArticle } from '../../src/types/index.js';

export const analyzeRouter = Router();

// GET /api/analyze?topic=AI&region=de&articleIds=id1,id2,id3
// Analyzes articles that are already in DB (pass IDs from /api/news response)
analyzeRouter.get('/', async (req, res) => {
  try {
    const topic = (req.query.topic as string) || 'artificial intelligence';
    const region = (req.query.region as string) || 'de';
    const articleIdsParam = req.query.articleIds as string | undefined;
    const numClusters = Math.min(3, Math.max(2, parseInt(req.query.clusters as string) || 3));

    if (!articleIdsParam) {
      return res.status(400).json({
        success: false,
        error: 'articleIds parameter required. Call /api/news first, then pass article IDs here.',
      });
    }

    const articleIds = articleIdsParam.split(',').filter(id => id.trim());

    // Get articles from DB (they were stored by /api/news)
    const dbRows = getArticlesByIds(articleIds);

    if (dbRows.length === 0) {
      return res.json({
        success: true,
        summary: 'No articles found.',
        topKeywords: [],
        clusters: [],
        sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
        articles: [],
      });
    }

    // Map DB rows to NewsArticle format
    const articles: NewsArticle[] = dbRows.map((row: any) => ({
      article_id: row.article_id,
      title: row.title,
      link: row.link,
      description: row.description,
      content: row.content,
      pubDate: row.pub_date,
      image_url: row.image_url,
      source_id: row.source_id || '',
      source_name: row.source_name || '',
      source_icon: row.source_icon,
      country: JSON.parse(row.country || '[]'),
      category: JSON.parse(row.category || '[]'),
    }));

    console.log(`Analyzing ${articles.length} articles for topic="${topic}", region="${region}"`);

    // Check for cached analysis - if we have recent feed analysis AND most articles have sentiment
    const cachedFeed = getRecentFeedAnalysis(topic, region, 60);
    const existingAnalysis = getArticleAnalysis(articleIds);
    const analyzedCount = Array.from(existingAnalysis.values()).filter(a => a.sentiment).length;

    if (cachedFeed && analyzedCount >= articles.length * 0.8) {
      console.log(`Using cached analysis (${analyzedCount}/${articles.length} articles have sentiment)`);

      // Build enriched articles from cached data
      const enrichedArticles = articles.map(article => {
        const analysis = existingAnalysis.get(article.article_id);
        return {
          ...article,
          sentiment: (analysis?.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
          clusterId: analysis?.clusterId ?? 0,
        };
      });

      // Rebuild clusters from articles
      const clusterMap = new Map<number, string[]>();
      for (const article of enrichedArticles) {
        const ids = clusterMap.get(article.clusterId) || [];
        ids.push(article.article_id);
        clusterMap.set(article.clusterId, ids);
      }

      // Recalculate sentiment counts
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      for (const article of enrichedArticles) {
        sentimentCounts[article.sentiment]++;
      }

      return res.json({
        success: true,
        cached: true,
        summary: cachedFeed.summary,
        topKeywords: cachedFeed.topKeywords,
        clusters: cachedFeed.clusterLabels.map((label: string, i: number) => ({
          id: i,
          label,
          articleIds: clusterMap.get(i) || [],
        })),
        sentimentCounts,
        articles: enrichedArticles,
      });
    }

    // Fresh analysis needed
    // Get embeddings (cached in DB)
    console.log('Getting embeddings...');
    const embeddings = await getEmbeddings(articles);

    // Cluster articles
    console.log('Clustering articles...');
    const clusters = kMeansClustering(embeddings, numClusters);

    // Update cluster assignments in DB
    for (const cluster of clusters) {
      for (const articleId of cluster.articleIds) {
        updateArticleCluster(articleId, cluster.id);
      }
    }

    // Analyze with Claude
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

    // Build enriched articles
    const enrichedArticles = articles.map(article => {
      const cluster = clusters.find(c => c.articleIds.includes(article.article_id));
      return {
        ...article,
        sentiment: analysis.articleSentiments.get(article.article_id) || 'neutral',
        clusterId: cluster?.id ?? 0,
      };
    });

    // Save feed analysis
    saveFeedAnalysis(
      topic,
      region,
      analysis.summary,
      analysis.topKeywords,
      sentimentCounts,
      analysis.clusterLabels,
      articles.map(a => a.article_id)
    );

    res.json({
      success: true,
      summary: analysis.summary,
      topKeywords: analysis.topKeywords,
      clusters: clusters.map((cluster, i) => ({
        id: cluster.id,
        label: analysis.clusterLabels[i] || `Topic ${i + 1}`,
        articleIds: cluster.articleIds,
      })),
      sentimentCounts,
      articles: enrichedArticles,
    });
  } catch (error) {
    console.error('Error analyzing feed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
