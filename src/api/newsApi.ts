import type { NewsArticle, EnrichedArticle } from '../types';

const API_BASE = 'http://localhost:3001/api';

export interface FetchNewsParams {
  topic?: string;
  country?: string;
}

export interface NewsResponse {
  success: boolean;
  count: number;
  articles: NewsArticle[];
  error?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  articles: EnrichedArticle[];
  error?: string;
}

export async function fetchNews(params: FetchNewsParams = {}): Promise<NewsArticle[]> {
  const { topic = 'artificial intelligence', country = 'de' } = params;

  const searchParams = new URLSearchParams({ topic, country });
  const response = await fetch(`${API_BASE}/news?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.status}`);
  }

  const data: NewsResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch news');
  }

  return data.articles;
}

export async function analyzeArticles(articles: NewsArticle[]): Promise<EnrichedArticle[]> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles }),
  });

  if (!response.ok) {
    throw new Error(`Failed to analyze articles: ${response.status}`);
  }

  const data: AnalyzeResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to analyze articles');
  }

  return data.articles;
}
