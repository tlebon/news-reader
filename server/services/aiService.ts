import type { NewsArticle } from '../../src/types/index.js';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

export interface FeedAnalysis {
  summary: string;
  topKeywords: string[];
  clusters: Array<{ label: string; articleIds: string[] }>;
  articleSentiments: Map<string, 'positive' | 'neutral' | 'negative'>;
}

// Analyze a feed of articles - Claude handles grouping, labeling, and sentiment
export async function analyzeFeed(
  articles: NewsArticle[],
  numClusters: number = 3
): Promise<FeedAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  console.log(`Analyzing feed: ${articles.length} articles, requesting ${numClusters} clusters`);

  const prompt = buildFeedPrompt(articles, numClusters);

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
    clusters: parsed.clusters || [],
    articleSentiments,
  };
}

function buildFeedPrompt(articles: NewsArticle[], numClusters: number): string {
  const articleList = articles.map(a => {
    const desc = a.description ? ` — ${a.description.slice(0, 200)}` : '';
    return `[${a.article_id}] "${a.title}"${desc}`;
  }).join('\n');

  return `Analyze this news feed and provide:

1. A structured summary ("The Brief") with 3-5 bullet points, each covering a key story or theme. Each bullet should be 1-2 sentences with specific details. Format as a markdown list with "- " prefixes.
2. Top 5 keywords/topics across all articles
3. Group the articles into ${numClusters} topic clusters based on what they're about. Give each cluster a specific, descriptive label (3-6 words). Include specific names, companies, events, or locations. Avoid generic labels like "Tech News" — be specific (e.g., "OpenAI GPT-5 Launch", "EU AI Regulation Vote").
4. Sentiment (positive/neutral/negative) for each article

Articles:
${articleList}

Return JSON in this exact format:
\`\`\`json
{
  "summary": "- First bullet point about key story\\n- Second bullet point\\n- Third bullet point",
  "topKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "clusters": [
    {"label": "Specific Topic Label", "articleIds": ["id1", "id2"]},
    {"label": "Another Topic", "articleIds": ["id3", "id4", "id5"]}
  ],
  "articleSentiments": [
    {"articleId": "xxx", "sentiment": "positive"},
    {"articleId": "yyy", "sentiment": "neutral"}
  ]
}
\`\`\`

Return ONLY the JSON, no other text.`;
}
