import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNews, useAnalyzeArticles } from './hooks/useNews';
import { FilterBar } from './components/FilterBar';
import { ArticleCard } from './components/ArticleCard';
import { ArticleModal } from './components/ArticleModal';
import type { TopicId, RegionCode, EnrichedArticle } from './types';

const queryClient = new QueryClient();

function Dashboard() {
  const [topic, setTopic] = useState<TopicId>('artificial intelligence');
  const [region, setRegion] = useState<RegionCode>('de');
  const [enrichedArticles, setEnrichedArticles] = useState<EnrichedArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<EnrichedArticle | null>(null);

  const { data: articles, isLoading, error } = useNews({ topic, country: region });
  const analyzeMutation = useAnalyzeArticles();

  // Auto-analyze when articles are fetched
  useEffect(() => {
    if (articles && articles.length > 0 && !analyzeMutation.isPending) {
      analyzeMutation.mutateAsync(articles)
        .then(setEnrichedArticles)
        .catch((err) => console.error('Analysis failed:', err));
    }
  }, [articles]);

  // Use enriched articles if available, otherwise use raw articles
  const displayArticles: EnrichedArticle[] = enrichedArticles.length > 0
    ? enrichedArticles
    : (articles as EnrichedArticle[]) || [];

  const isAnalyzing = analyzeMutation.isPending;

  return (
    <div className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8">
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
        onTopicChange={(t) => {
          setTopic(t);
          setEnrichedArticles([]);
        }}
        onRegionChange={(r) => {
          setRegion(r);
          setEnrichedArticles([]);
        }}
        isLoading={isLoading}
        isAnalyzing={isAnalyzing}
        articleCount={articles?.length || 0}
      />

      {/* Status */}
      {isAnalyzing && (
        <div className="mb-6 font-mono text-sm text-amber flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-amber border-t-transparent rounded-full animate-spin" />
          Analyzing with Claude...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-rust/20 border border-rust text-rust px-4 py-3 rounded mb-6 font-mono text-sm">
          Error: {error instanceof Error ? error.message : 'Failed to fetch news'}
        </div>
      )}

      {/* Articles grid */}
      {displayArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayArticles.map((article, index) => (
            <ArticleCard
              key={article.article_id}
              article={article}
              index={index}
              onClick={() => setSelectedArticle(article)}
            />
          ))}
        </div>
      ) : !isLoading ? (
        <div className="text-center py-16 text-cream-dim">
          <p className="text-xl mb-2">No articles found</p>
          <p className="font-mono text-sm text-slate">
            Try changing the region or topic
          </p>
        </div>
      ) : null}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-ink-lighter text-center">
        <p className="font-mono text-xs text-slate">
          Powered by NewsData.io + OpenRouter (Claude Sonnet)
        </p>
      </footer>

      {/* Article Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
