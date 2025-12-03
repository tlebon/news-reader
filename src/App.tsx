import { useState, useEffect, useRef, useCallback } from 'react';
import { FilterBar } from './components/FilterBar';
import { SummaryBar } from './components/SummaryBar';
import { ArticleCard } from './components/ArticleCard';
import { ArticleModal } from './components/ArticleModal';
import type { TopicId, RegionCode, EnrichedArticle, Cluster, SentimentCounts, Sentiment } from './types';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [topic, setTopic] = useState<TopicId>('artificial intelligence');
  const [region, setRegion] = useState<RegionCode>('de');

  // Feed data
  const [articles, setArticles] = useState<EnrichedArticle[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [sentimentCounts, setSentimentCounts] = useState<SentimentCounts>({ positive: 0, neutral: 0, negative: 0 });

  // UI state
  const [selectedArticle, setSelectedArticle] = useState<EnrichedArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Filters
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);
  const [activeSentiment, setActiveSentiment] = useState<Sentiment | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);

  // Load cached articles first, then poll for new
  const fetchArticles = useCallback(async (cursor?: string, append = false) => {
    if (!append) {
      setIsLoading(true);
      setActiveClusterId(null);
      setActiveSentiment(null);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      // For initial load, try cache first
      if (!append && !cursor) {
        const cachedRes = await fetch(`${API_BASE}/cached?topic=${encodeURIComponent(topic)}&region=${encodeURIComponent(region)}`);
        if (cachedRes.ok) {
          const cachedData = await cachedRes.json();
          if (cachedData.success && cachedData.cached && cachedData.articles.length > 0) {
            console.log(`Loaded ${cachedData.articles.length} cached articles`);
            setArticles(cachedData.articles);
            setSummary(cachedData.summary);
            setTopKeywords(cachedData.topKeywords);
            setClusters(cachedData.clusters);
            setSentimentCounts(cachedData.sentimentCounts);
            setIsLoading(false);

            // Poll for new articles in background
            pollForNewArticles();
            return;
          }
        }
      }

      // No cache or pagination - fetch fresh
      const params = new URLSearchParams({
        topic,
        country: region,
      });
      if (cursor) params.set('cursor', cursor);

      // Fetch articles from /api/news
      const newsRes = await fetch(`${API_BASE}/news?${params}`);
      if (!newsRes.ok) throw new Error('Failed to fetch news');
      const newsData = await newsRes.json();

      if (!newsData.success) {
        throw new Error(newsData.error || 'Unknown error');
      }

      // Show articles immediately without sentiment/cluster
      const placeholderArticles: EnrichedArticle[] = newsData.articles.map((article: EnrichedArticle) => ({
        ...article,
        sentiment: undefined as unknown as 'positive' | 'neutral' | 'negative',
        clusterId: -1,
      }));

      if (append) {
        setArticles(prev => [...prev, ...placeholderArticles]);
      } else {
        setArticles(placeholderArticles);
        setSummary('');
        setTopKeywords([]);
        setClusters([]);
        setSentimentCounts({ positive: 0, neutral: 0, negative: 0 });
      }
      setNextCursor(newsData.nextCursor);
      setIsLoading(false);
      setIsLoadingMore(false);

      // Analyze in background (only for initial load)
      if (!append && newsData.articles.length > 0) {
        setIsAnalyzing(true);

        const analyzeParams = new URLSearchParams({ topic, region });
        const analyzeRes = await fetch(`${API_BASE}/analyze?${analyzeParams}`);

        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          if (analyzeData.success) {
            setSummary(analyzeData.summary);
            setTopKeywords(analyzeData.topKeywords);
            setClusters(analyzeData.clusters);
            setSentimentCounts(analyzeData.sentimentCounts);

            // Merge sentiment/cluster into articles
            const analysisMap = new Map<string, { sentiment: string; clusterId: number }>();
            for (const article of analyzeData.articles) {
              analysisMap.set(article.article_id, {
                sentiment: article.sentiment,
                clusterId: article.clusterId,
              });
            }

            setArticles(prev => prev.map(article => {
              const analysis = analysisMap.get(article.article_id);
              if (analysis) {
                return {
                  ...article,
                  sentiment: analysis.sentiment as 'positive' | 'neutral' | 'negative',
                  clusterId: analysis.clusterId,
                };
              }
              return article;
            }));
          }
        }
        setIsAnalyzing(false);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsAnalyzing(false);
    }
  }, [topic, region]);

  // Poll for new articles (check if there are newer articles than what we have)
  const pollForNewArticles = useCallback(async () => {
    try {
      const newsRes = await fetch(`${API_BASE}/news?topic=${encodeURIComponent(topic)}&country=${encodeURIComponent(region)}`);
      if (!newsRes.ok) return;
      const newsData = await newsRes.json();
      if (!newsData.success) return;

      // Check for new articles we don't have
      setArticles(prev => {
        const existingIds = new Set(prev.map(a => a.article_id));
        const newArticles = newsData.articles.filter(
          (a: EnrichedArticle) => !existingIds.has(a.article_id)
        );

        if (newArticles.length > 0) {
          console.log(`Found ${newArticles.length} new articles`);
          // Add new articles at the top (without sentiment yet)
          const placeholders = newArticles.map((article: EnrichedArticle) => ({
            ...article,
            sentiment: undefined as unknown as 'positive' | 'neutral' | 'negative',
            clusterId: -1,
          }));
          return [...placeholders, ...prev];
        }
        return prev;
      });

      setNextCursor(newsData.nextCursor);
    } catch (err) {
      console.error('Error polling for new articles:', err);
    }
  }, [topic, region]);

  // Initial fetch when topic/region changes
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Check if filtering is active
  const isFiltering = activeClusterId !== null || activeSentiment !== null;

  // Infinite scroll observer - disabled when filtering
  useEffect(() => {
    if (isFiltering) return; // Don't paginate while filtering

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore && !isLoading) {
          fetchArticles(nextCursor, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, isLoading, fetchArticles, isFiltering]);

  // Filter articles
  const filteredArticles = articles.filter(article => {
    if (activeClusterId !== null && article.clusterId !== activeClusterId) {
      return false;
    }
    if (activeSentiment !== null && article.sentiment !== activeSentiment) {
      return false;
    }
    return true;
  });

  // Get cluster label for an article
  const getClusterLabel = (clusterId: number): string => {
    const cluster = clusters.find(c => c.id === clusterId);
    return cluster?.label || `Topic ${clusterId + 1}`;
  };

  return (
    <div className="min-h-screen">
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-baseline gap-4 mb-2">
            <h1 className="text-4xl font-bold text-cream">
              News<span className="text-amber">Reader</span>
            </h1>
            <span className="font-mono text-sm text-slate">Your News Now</span>
          </div>
          <p className="text-cream-dim italic">
            Fetch news and understand the topics of the day
          </p>
        </header>

        {/* Filters */}
        <FilterBar
          topic={topic}
          region={region}
          onTopicChange={(t) => setTopic(t)}
          onRegionChange={(r) => setRegion(r)}
          isLoading={isLoading}
          articleCount={filteredArticles.length}
          totalCount={articles.length}
        />

        {/* The Brief - Summary Panel */}
        <SummaryBar
          summary={summary}
          topKeywords={topKeywords}
          clusters={clusters}
          sentimentCounts={sentimentCounts}
          activeClusterId={activeClusterId}
          activeSentiment={activeSentiment}
          onClusterClick={setActiveClusterId}
          onSentimentClick={setActiveSentiment}
          isLoading={isLoading}
          isAnalyzing={isAnalyzing}
        />

        {/* Error state */}
        {error && (
          <div className="bg-rust/20 border border-rust text-rust px-4 py-3 rounded mb-6 font-mono text-sm">
            Error: {error}
          </div>
        )}

        {/* Active filters indicator */}
        {(activeClusterId !== null || activeSentiment !== null) && (
          <div className="mb-4 flex items-center gap-2 font-mono text-sm">
            <span className="text-cream-dim">Filtering:</span>
            {activeClusterId !== null && (
              <span className="bg-amber/20 text-amber px-2 py-1 rounded flex items-center gap-1">
                {getClusterLabel(activeClusterId)}
                <button
                  onClick={() => setActiveClusterId(null)}
                  className="ml-1 hover:text-cream"
                >
                  ×
                </button>
              </span>
            )}
            {activeSentiment !== null && (
              <span className={`sentiment-${activeSentiment} px-2 py-1 rounded flex items-center gap-1`}>
                {activeSentiment}
                <button
                  onClick={() => setActiveSentiment(null)}
                  className="ml-1 hover:opacity-70"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setActiveClusterId(null);
                setActiveSentiment(null);
              }}
              className="text-slate hover:text-cream ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Articles grid */}
        {filteredArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, index) => (
                <ArticleCard
                  key={article.article_id}
                  article={article}
                  index={index}
                  clusterLabel={getClusterLabel(article.clusterId)}
                  onClick={() => setSelectedArticle(article)}
                />
              ))}
            </div>

            {/* Infinite scroll loader */}
            <div ref={loaderRef} className="py-8 flex justify-center">
              {isLoadingMore && (
                <div className="font-mono text-sm text-cream-dim flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin" />
                  Loading more...
                </div>
              )}
              {isFiltering && nextCursor && (
                <p className="font-mono text-sm text-slate">
                  Clear filters to load more articles
                </p>
              )}
              {!isFiltering && !nextCursor && !isLoadingMore && (
                <p className="font-mono text-sm text-slate">No more articles</p>
              )}
            </div>
          </>
        ) : !isLoading ? (
          <div className="text-center py-16 text-cream-dim">
            <p className="text-xl mb-2">No articles found</p>
            <p className="font-mono text-sm text-slate">
              {activeClusterId !== null || activeSentiment !== null
                ? 'Try clearing filters'
                : 'Try changing the region or topic'}
            </p>
          </div>
        ) : null}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-ink-light border border-ink-lighter rounded-lg h-64 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-8 border-t border-ink-lighter text-center">
          <p className="font-mono text-xs text-slate">
            Powered by NewsData.io + OpenRouter (Claude Sonnet)
          </p>
        </footer>
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          clusterLabel={getClusterLabel(selectedArticle.clusterId)}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}

export default App;
