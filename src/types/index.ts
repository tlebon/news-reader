// News article from NewsData.io (free tier)
export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  pubDate: string;
  pubDateTZ: string;
  image_url: string | null;
  video_url: string | null;
  source_id: string;
  source_name: string;
  source_url: string;
  source_icon: string | null;
  source_priority: number;
  language: string;
  country: string[];
  category: string[];
  creator: string[] | null;
  keywords: string[] | null;
  duplicate: boolean;
}

// Claude's analysis (for comparison)
export interface ClaudeAnalysis {
  summary: string;
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  groupId: string;
  groupLabel: string;
}

// Article with both NewsData AI and Claude analysis
export interface EnrichedArticle extends NewsArticle {
  claude?: ClaudeAnalysis;
}

// Article group (clustered by AI)
export interface ArticleGroup {
  id: string;
  label: string;
  articles: EnrichedArticle[];
}

// API response from NewsData.io
export interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsArticle[];
  nextPage?: string;
}

// Available regions
export const REGIONS = [
  { code: 'de', name: 'Germany' },
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'fr', name: 'France' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'at', name: 'Austria' },
  { code: 'ch', name: 'Switzerland' },
] as const;

// Available topics
export const TOPICS = [
  { id: 'artificial intelligence', name: 'AI' },
  { id: 'technology', name: 'Technology' },
  { id: 'business', name: 'Business' },
  { id: 'politics', name: 'Politics' },
  { id: 'science', name: 'Science' },
  { id: 'world', name: 'World' },
  { id: 'entertainment', name: 'Entertainment' },
] as const;

export type RegionCode = typeof REGIONS[number]['code'];
export type TopicId = typeof TOPICS[number]['id'];
