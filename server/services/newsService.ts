import type { NewsArticle, NewsDataResponse } from '../../src/types/index.js';

const NEWS_API_BASE = 'https://newsdata.io/api/1/latest';

export interface FetchNewsResult {
  articles: NewsArticle[];
  nextCursor: string | null;
}

export async function fetchNews(
  topic: string = 'artificial intelligence',
  country: string = 'de',
  cursor?: string
): Promise<FetchNewsResult> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    throw new Error('NEWS_API_KEY not configured');
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    q: topic,
    country: country,
    language: 'en',
  });

  if (cursor) {
    params.set('page', cursor);
  }

  const url = `${NEWS_API_BASE}?${params}`;

  console.log(`Fetching news: topic="${topic}", country="${country}"${cursor ? `, cursor="${cursor}"` : ''}`);

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NewsData API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as NewsDataResponse;

  if (data.status !== 'success') {
    throw new Error(`NewsData API returned status: ${data.status}`);
  }

  // Filter out duplicates flagged by NewsData
  const articles = data.results.filter(article => !article.duplicate);

  console.log(`Fetched ${articles.length} articles (filtered from ${data.results.length})`);

  return {
    articles,
    nextCursor: data.nextPage || null,
  };
}
