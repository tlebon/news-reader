import type { NewsArticle } from '../../src/types/index.js';
import type { Cluster } from './clusteringService.js';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

export interface FeedAnalysis {
  summary: string;
  topKeywords: string[];
  clusterLabels: string[];
  articleSentiments: Map<string, 'positive' | 'neutral' | 'negative'>;
}

// Analyze a feed of articles with clusters
export async function analyzeFeed(
  articles: NewsArticle[],
  clusters: Cluster[]
): Promise<FeedAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  console.log(`Analyzing feed: ${articles.length} articles in ${clusters.length} clusters`);

  const prompt = buildFeedPrompt(articles, clusters);

  const response = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'News Reader Dashboard',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Claude');
  }

  // Parse JSON response
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse Claude response:', content);
      throw new Error('Could not parse Claude response');
    }
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    parsed = JSON.parse(jsonStr);
  }

  // Build sentiment map
  const articleSentiments = new Map<string, 'positive' | 'neutral' | 'negative'>();
  for (const item of parsed.articleSentiments || []) {
    articleSentiments.set(item.articleId, item.sentiment);
  }

  console.log(`Feed analysis complete: "${parsed.summary.slice(0, 50)}..."`);

  return {
    summary: parsed.summary,
    topKeywords: parsed.topKeywords || [],
    clusterLabels: parsed.clusterLabels || [],
    articleSentiments,
  };
}

function buildFeedPrompt(articles: NewsArticle[], clusters: Cluster[]): string {
  // Build article summaries grouped by cluster with descriptions for better context
  const clusterSections = clusters.map((cluster, i) => {
    const clusterArticles = articles.filter(a => cluster.articleIds.includes(a.article_id));
    const articleList = clusterArticles.map(a => {
      const desc = a.description ? ` — ${a.description.slice(0, 150)}` : '';
      return `  - [${a.article_id}] "${a.title}"${desc}`;
    }).join('\n');

    return `Cluster ${i + 1} (${clusterArticles.length} articles):\n${articleList}`;
  }).join('\n\n');

  const allArticles = articles.map(a =>
    `[${a.article_id}] "${a.title}" - ${a.description || 'No description'}`
  ).join('\n');

  return `Analyze this news feed and provide:

1. A structured summary ("The Brief") with 3-5 bullet points, each covering a key story or theme. Each bullet should be 1-2 sentences with specific details. Format as a markdown list with "- " prefixes.
2. Top 5 keywords/topics across all articles
3. A specific, descriptive label (3-6 words) for each cluster. Include specific names, companies, events, or locations when relevant. Avoid generic labels like "Tech News" or "Business Updates" — be specific about WHAT is happening (e.g., "OpenAI GPT-5 Launch", "EU AI Regulation Vote", "Tesla Q3 Earnings").
4. Sentiment (positive/neutral/negative) for each article

The articles have been pre-grouped into ${clusters.length} clusters by semantic similarity:

${clusterSections}

All articles:
${allArticles}

Return JSON in this exact format:
\`\`\`json
{
  "summary": "Brief overview of the news feed...",
  "topKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "clusterLabels": ["Specific Event Label", "Company/Person Action", "Location Policy Change"],
  "articleSentiments": [
    {"articleId": "xxx", "sentiment": "positive"},
    {"articleId": "yyy", "sentiment": "neutral"}
  ]
}
\`\`\`

Return ONLY the JSON, no other text.`;
}
