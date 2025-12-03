import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { NewsArticle } from '../../src/types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/news.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    article_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    description TEXT,
    content TEXT,
    pub_date TEXT NOT NULL,
    image_url TEXT,
    source_id TEXT,
    source_name TEXT,
    source_icon TEXT,
    country TEXT,
    category TEXT,
    sentiment TEXT,
    embedding BLOB,
    cluster_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feed_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    region TEXT NOT NULL,
    summary TEXT NOT NULL,
    top_keywords TEXT NOT NULL,
    sentiment_counts TEXT NOT NULL,
    cluster_labels TEXT NOT NULL,
    article_ids TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON articles(sentiment);
  CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
  CREATE INDEX IF NOT EXISTS idx_feed_topic_region ON feed_analyses(topic, region);
`);

// Article operations
export function getArticlesByIds(articleIds: string[]) {
  const placeholders = articleIds.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM articles WHERE article_id IN (${placeholders})`).all(...articleIds);
}

export function upsertArticle(article: NewsArticle) {
  const stmt = db.prepare(`
    INSERT INTO articles (article_id, title, link, description, content, pub_date, image_url, source_id, source_name, source_icon, country, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(article_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      content = excluded.content
  `);

  stmt.run(
    article.article_id,
    article.title,
    article.link,
    article.description,
    article.content,
    article.pubDate,
    article.image_url,
    article.source_id,
    article.source_name,
    article.source_icon,
    JSON.stringify(article.country),
    JSON.stringify(article.category)
  );
}

export function updateArticleEmbedding(articleId: string, embedding: number[]) {
  const buffer = Buffer.from(new Float32Array(embedding).buffer);
  db.prepare('UPDATE articles SET embedding = ? WHERE article_id = ?').run(buffer, articleId);
}

export function updateArticleSentiment(articleId: string, sentiment: string) {
  db.prepare('UPDATE articles SET sentiment = ? WHERE article_id = ?').run(sentiment, articleId);
}

export function updateArticleCluster(articleId: string, clusterId: number) {
  db.prepare('UPDATE articles SET cluster_id = ? WHERE article_id = ?').run(clusterId, articleId);
}

export function getArticleEmbedding(articleId: string): number[] | null {
  const row = db.prepare('SELECT embedding FROM articles WHERE article_id = ?').get(articleId) as { embedding: Buffer } | undefined;
  if (!row?.embedding) return null;
  return Array.from(new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.length / 4));
}

// Get sentiment and cluster for articles
export function getArticleAnalysis(articleIds: string[]): Map<string, { sentiment: string; clusterId: number }> {
  if (articleIds.length === 0) return new Map();

  const placeholders = articleIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT article_id, sentiment, cluster_id FROM articles WHERE article_id IN (${placeholders})`).all(...articleIds) as Array<{ article_id: string; sentiment: string | null; cluster_id: number | null }>;

  const result = new Map<string, { sentiment: string; clusterId: number }>();
  for (const row of rows) {
    result.set(row.article_id, {
      sentiment: row.sentiment || 'neutral',
      clusterId: row.cluster_id ?? 0
    });
  }
  return result;
}

// Get cached articles for a topic (with sentiment/cluster data)
export function getCachedArticles(topic: string, region: string, limit = 50) {
  // Get recent feed analysis to find which articles belong to this topic
  const analysis = getRecentFeedAnalysis(topic, region, 60); // 1 hour cache
  if (!analysis) return null;

  // Get all articles that have been analyzed for this topic
  const rows = db.prepare(`
    SELECT
      article_id, title, link, description, content, pub_date,
      image_url, source_id, source_name, source_icon,
      country, category, sentiment, cluster_id
    FROM articles
    WHERE sentiment IS NOT NULL
    ORDER BY pub_date DESC
    LIMIT ?
  `).all(limit) as Array<{
    article_id: string;
    title: string;
    link: string;
    description: string | null;
    content: string | null;
    pub_date: string;
    image_url: string | null;
    source_id: string | null;
    source_name: string | null;
    source_icon: string | null;
    country: string;
    category: string;
    sentiment: string;
    cluster_id: number;
  }>;

  if (rows.length === 0) return null;

  const articles = rows.map(row => ({
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
    sentiment: row.sentiment as 'positive' | 'neutral' | 'negative',
    clusterId: row.cluster_id,
  }));

  return {
    articles,
    analysis: {
      summary: analysis.summary,
      topKeywords: analysis.topKeywords,
      sentimentCounts: analysis.sentimentCounts,
      clusterLabels: analysis.clusterLabels,
    }
  };
}

// Feed analysis operations
export function saveFeedAnalysis(
  topic: string,
  region: string,
  summary: string,
  topKeywords: string[],
  sentimentCounts: { positive: number; neutral: number; negative: number },
  clusterLabels: string[],
  articleIds: string[]
) {
  const stmt = db.prepare(`
    INSERT INTO feed_analyses (topic, region, summary, top_keywords, sentiment_counts, cluster_labels, article_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    topic,
    region,
    summary,
    JSON.stringify(topKeywords),
    JSON.stringify(sentimentCounts),
    JSON.stringify(clusterLabels),
    JSON.stringify(articleIds)
  );
}

export function getRecentFeedAnalysis(topic: string, region: string, maxAgeMinutes = 30) {
  const row = db.prepare(`
    SELECT * FROM feed_analyses
    WHERE topic = ? AND region = ?
    AND datetime(created_at) > datetime('now', ?)
    ORDER BY created_at DESC
    LIMIT 1
  `).get(topic, region, `-${maxAgeMinutes} minutes`);

  if (!row) return null;

  const analysis = row as any;
  return {
    summary: analysis.summary,
    topKeywords: JSON.parse(analysis.top_keywords),
    sentimentCounts: JSON.parse(analysis.sentiment_counts),
    clusterLabels: JSON.parse(analysis.cluster_labels),
    articleIds: JSON.parse(analysis.article_ids),
    createdAt: analysis.created_at
  };
}

export { db };
