import type { NewsArticle, ClaudeAnalysis } from '../../src/types/index.js';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Raw Claude response (includes articleId)
type ClaudeRawResponse = Array<{
  articleId: string;
  summary: string;
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  groupId: string;
  groupLabel: string;
}>;

// Simple in-memory cache with TTL
const cache = new Map<string, { data: ClaudeRawResponse; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(articles: NewsArticle[]): string {
  return articles.map(a => a.article_id).sort().join(':');
}

export async function analyzeArticles(
  articles: NewsArticle[]
): Promise<ClaudeRawResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Check cache
  const cacheKey = getCacheKey(articles);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('Returning cached Claude analysis');
    return cached.data;
  }

  console.log(`Analyzing ${articles.length} articles with Claude...`);

  const prompt = buildPrompt(articles);

  const response = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'News Reader Dashboard',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-4.5-sonnet',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as OpenRouterResponse;
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Claude');
  }

  // Parse the JSON response
  // Try direct parsing first (if Claude returns clean JSON)
  let analyses: ClaudeRawResponse;
  try {
    analyses = JSON.parse(content);
  } catch {
    // Fall back to extracting JSON from code blocks or other text
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                      content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.error('Failed to parse Claude response:', content);
      throw new Error('Could not parse Claude response as JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    analyses = JSON.parse(jsonStr);
  }

  // Cache the result
  cache.set(cacheKey, { data: analyses, timestamp: Date.now() });

  console.log(`Claude analysis complete for ${analyses.length} articles`);

  return analyses;
}

function buildPrompt(articles: NewsArticle[]): string {
  const articleSummaries = articles.map((a, i) => `
Article ${i + 1} (ID: ${a.article_id}):
Title: ${a.title}
Description: ${a.description || 'N/A'}
Content: ${a.content?.slice(0, 500) || a.description || 'N/A'}...
Source: ${a.source_name}
`).join('\n---\n');

  return `Analyze these news articles. For each article, provide:
1. A concise summary (2-3 sentences, focus on key facts)
2. Keywords (3-5 relevant terms)
3. Sentiment (positive/neutral/negative) and a score from -1 to 1
4. Group similar articles together with a groupId and groupLabel

Return a JSON array with this exact structure:
\`\`\`json
[
  {
    "articleId": "article_id_here",
    "summary": "Concise summary...",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "sentiment": "neutral",
    "sentimentScore": 0.1,
    "groupId": "group-1",
    "groupLabel": "Topic name for this cluster"
  }
]
\`\`\`

Articles to analyze:
${articleSummaries}

Return ONLY the JSON array, no other text.`;
}

// Map Claude response back to our ClaudeAnalysis type
export function mapClaudeResponse(
  analyses: ClaudeRawResponse
): Map<string, ClaudeAnalysis> {
  const map = new Map<string, ClaudeAnalysis>();

  for (const analysis of analyses) {
    map.set(analysis.articleId, {
      summary: analysis.summary,
      keywords: analysis.keywords,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      groupId: analysis.groupId,
      groupLabel: analysis.groupLabel,
    });
  }

  return map;
}
