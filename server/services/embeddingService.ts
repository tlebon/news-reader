import type { NewsArticle } from '../../src/types/index.js';
import { getArticleEmbedding, updateArticleEmbedding } from './db.js';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
}

// Get embeddings for articles (checks cache first)
export async function getEmbeddings(articles: NewsArticle[]): Promise<Map<string, number[]>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const result = new Map<string, number[]>();
  const needsEmbedding: NewsArticle[] = [];

  // Check cache first
  for (const article of articles) {
    const cached = getArticleEmbedding(article.article_id);
    if (cached) {
      result.set(article.article_id, cached);
    } else {
      needsEmbedding.push(article);
    }
  }

  if (needsEmbedding.length === 0) {
    console.log(`All ${articles.length} embeddings found in cache`);
    return result;
  }

  console.log(`Fetching embeddings for ${needsEmbedding.length} articles (${articles.length - needsEmbedding.length} cached)`);

  // Prepare texts for embedding (title + description)
  const texts = needsEmbedding.map(a =>
    `${a.title}. ${a.description || ''}`
  );

  // Call OpenRouter embeddings API
  const response = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embeddings API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as EmbeddingResponse;

  // Store and return embeddings
  for (let i = 0; i < needsEmbedding.length; i++) {
    const article = needsEmbedding[i];
    const embedding = data.data[i].embedding;

    // Cache in DB
    updateArticleEmbedding(article.article_id, embedding);

    result.set(article.article_id, embedding);
  }

  console.log(`Fetched and cached ${needsEmbedding.length} embeddings`);

  return result;
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
