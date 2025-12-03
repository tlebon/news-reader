// News article from NewsData.io (free tier)
export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  pubDate: string;
  pubDateTZ?: string;
  image_url: string | null;
  video_url?: string | null;
  source_id: string;
  source_name: string;
  source_url?: string;
  source_icon: string | null;
  source_priority?: number;
  language?: string;
  country: string[];
  category: string[];
  creator?: string[] | null;
  keywords?: string[] | null;
  duplicate?: boolean;
}

// Article with sentiment and cluster assignment
export interface EnrichedArticle extends NewsArticle {
  sentiment: 'positive' | 'neutral' | 'negative';
  clusterId: number;
}

// Cluster info
export interface Cluster {
  id: number;
  label: string;
  articleIds: string[];
}

// Sentiment counts
export interface SentimentCounts {
  positive: number;
  neutral: number;
  negative: number;
}

// Full feed analysis response
export interface FeedAnalysis {
  summary: string;
  topKeywords: string[];
  clusters: Cluster[];
  sentimentCounts: SentimentCounts;
  articles: EnrichedArticle[];
  nextCursor: string | null;
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

export type RegionCode = (typeof REGIONS)[number]['code'];
export type TopicId = (typeof TOPICS)[number]['id'];
export type Sentiment = 'positive' | 'neutral' | 'negative';
