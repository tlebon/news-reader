import { useState } from 'react';
import type { Cluster, SentimentCounts, Sentiment } from '../types';

// Reusable sentiment bar component
function SentimentBar({
  sentimentCounts,
  activeSentiment,
  onSentimentClick,
  compact = false,
}: {
  sentimentCounts: SentimentCounts;
  activeSentiment: Sentiment | null;
  onSentimentClick: (sentiment: Sentiment | null) => void;
  compact?: boolean;
}) {
  const totalArticles = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
  const height = compact ? 'h-8' : 'h-12';
  const textSize = compact ? 'text-xs' : 'text-sm';

  if (totalArticles === 0) {
    return <div className={`w-full ${height} bg-ink-lighter rounded-lg`} />;
  }

  return (
    <div className={`flex-1 ${height} rounded-lg overflow-hidden flex ${compact ? 'max-w-md' : ''}`}>
      {sentimentCounts.positive > 0 && (
        <button
          onClick={() => onSentimentClick(activeSentiment === 'positive' ? null : 'positive')}
          className={`group h-full flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSentiment === 'positive'
              ? 'ring-2 ring-inset ring-cream'
              : activeSentiment ? 'opacity-40 hover:opacity-70' : ''
          }`}
          style={{
            width: `${(sentimentCounts.positive / totalArticles) * 100}%`,
            backgroundColor: 'var(--sage)',
          }}
        >
          <span className={`font-mono ${textSize} text-ink font-medium group-hover:hidden`}>
            +{compact ? '' : ' '}{sentimentCounts.positive}
          </span>
          <span className={`font-mono ${textSize} text-ink font-medium hidden group-hover:inline`}>
            Positive
          </span>
        </button>
      )}
      {sentimentCounts.neutral > 0 && (
        <button
          onClick={() => onSentimentClick(activeSentiment === 'neutral' ? null : 'neutral')}
          className={`group h-full flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSentiment === 'neutral'
              ? 'ring-2 ring-inset ring-cream'
              : activeSentiment ? 'opacity-40 hover:opacity-70' : ''
          }`}
          style={{
            width: `${(sentimentCounts.neutral / totalArticles) * 100}%`,
            backgroundColor: 'var(--amber)',
          }}
        >
          <span className={`font-mono ${textSize} text-ink font-medium group-hover:hidden`}>
            ~{compact ? '' : ' '}{sentimentCounts.neutral}
          </span>
          <span className={`font-mono ${textSize} text-ink font-medium hidden group-hover:inline`}>
            Neutral
          </span>
        </button>
      )}
      {sentimentCounts.negative > 0 && (
        <button
          onClick={() => onSentimentClick(activeSentiment === 'negative' ? null : 'negative')}
          className={`group h-full flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSentiment === 'negative'
              ? 'ring-2 ring-inset ring-cream'
              : activeSentiment ? 'opacity-40 hover:opacity-70' : ''
          }`}
          style={{
            width: `${(sentimentCounts.negative / totalArticles) * 100}%`,
            backgroundColor: 'var(--rust)',
          }}
        >
          <span className={`font-mono ${textSize} text-cream font-medium group-hover:hidden`}>
            -{compact ? '' : ' '}{sentimentCounts.negative}
          </span>
          <span className={`font-mono ${textSize} text-cream font-medium hidden group-hover:inline`}>
            Negative
          </span>
        </button>
      )}
    </div>
  );
}

interface SummaryBarProps {
  summary: string;
  topKeywords: string[];
  clusters: Cluster[];
  sentimentCounts: SentimentCounts;
  activeClusterId: number | null;
  activeSentiment: Sentiment | null;
  onClusterClick: (id: number | null) => void;
  onSentimentClick: (sentiment: Sentiment | null) => void;
  isLoading: boolean;
  isAnalyzing: boolean;
}

export function SummaryBar({
  summary,
  topKeywords,
  clusters,
  sentimentCounts,
  activeClusterId,
  activeSentiment,
  onClusterClick,
  onSentimentClick,
  isLoading,
  isAnalyzing,
}: SummaryBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const totalArticles = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;

  if (isLoading) {
    return (
      <div className="bg-ink-light border border-ink-lighter rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-cream-dim">Loading articles...</span>
        </div>
      </div>
    );
  }

  // Show analyzing state when we have no summary yet
  if (isAnalyzing && !summary) {
    return (
      <div className="bg-ink-light border border-ink-lighter rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-cream-dim">Analyzing feed with Claude...</span>
        </div>
      </div>
    );
  }

  if (!summary && !isAnalyzing) {
    return null;
  }

  return (
    <div className="bg-ink-light border border-ink-lighter rounded-lg mb-8 animate-in">
      {/* Header - always visible */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-ink-lighter">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-sm text-amber uppercase tracking-wider font-medium">
            The Brief
          </h2>
          <span className="font-mono text-xs text-slate">
            AI-generated summary
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-cream-dim hover:text-cream transition-colors font-mono text-sm flex items-center gap-1"
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable content */}
      {!isCollapsed && (
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div>
            {(() => {
              // Parse bullets - handle various formats
              const bulletPattern = /^[\-\•\*]\s*|^\d+\.\s+/;
              let lines = summary.split('\n').map(l => l.trim()).filter(l => l);

              // If it's mostly one line with " - " separators, split on those
              if (lines.length <= 2 && summary.includes(' - ')) {
                lines = summary.split(/\s+-\s+/).map(l => l.trim()).filter(l => l);
              }

              // Clean up any leading bullets/symbols from each line
              const cleanedLines = lines.map(l => l.replace(bulletPattern, '').trim()).filter(l => l);

              if (cleanedLines.length > 1) {
                return (
                  <ul className="space-y-2">
                    {cleanedLines.map((line, i) => (
                      <li key={i} className="text-cream text-lg leading-relaxed flex gap-3">
                        <span className="text-amber">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return <p className="text-cream text-lg leading-relaxed">{summary}</p>;
            })()}
          </div>

          {/* Keywords */}
          {topKeywords.length > 0 && (
            <div>
              <h3 className="font-mono text-xs text-cream-dim uppercase tracking-wider mb-3">
                Top Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {topKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="font-mono text-sm bg-amber/20 text-amber px-3 py-1.5 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Topics / Clusters */}
          {clusters.length > 0 && (
            <div>
              <h3 className="font-mono text-xs text-cream-dim uppercase tracking-wider mb-3">
                Topic Clusters
              </h3>
              <div className="flex flex-wrap gap-2">
                {clusters.map((cluster) => (
                  <button
                    key={cluster.id}
                    onClick={() => onClusterClick(activeClusterId === cluster.id ? null : cluster.id)}
                    className={`font-mono text-sm px-4 py-2 rounded-lg border transition-all cursor-pointer ${
                      activeClusterId === cluster.id
                        ? 'bg-amber text-ink border-amber'
                        : 'bg-ink border-ink-lighter text-cream hover:border-amber'
                    }`}
                  >
                    {cluster.label}
                    <span className={`ml-2 ${activeClusterId === cluster.id ? 'text-ink/70' : 'text-slate'}`}>
                      ({cluster.articleIds.length})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Analysis - Clickable Bar */}
          <div>
            <h3 className="font-mono text-xs text-cream-dim uppercase tracking-wider mb-3">
              Sentiment Distribution
              {activeSentiment && (
                <button
                  onClick={() => onSentimentClick(null)}
                  className="ml-2 text-amber hover:text-cream"
                >
                  (clear filter)
                </button>
              )}
            </h3>
            <div className="flex items-center gap-4">
              <SentimentBar
                sentimentCounts={sentimentCounts}
                activeSentiment={activeSentiment}
                onSentimentClick={onSentimentClick}
              />
              <span className="font-mono text-xs text-slate whitespace-nowrap">{totalArticles} articles</span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed view - show filters only */}
      {isCollapsed && (
        <div className="px-6 py-4 space-y-4">
          {/* Topic clusters - compact */}
          {clusters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate uppercase tracking-wider mr-2">Topics:</span>
              {clusters.map((cluster) => (
                <button
                  key={cluster.id}
                  onClick={() => onClusterClick(activeClusterId === cluster.id ? null : cluster.id)}
                  className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    activeClusterId === cluster.id
                      ? 'bg-amber text-ink border-amber'
                      : 'bg-ink border-ink-lighter text-cream hover:border-amber'
                  }`}
                >
                  {cluster.label}
                  <span className={`ml-1 ${activeClusterId === cluster.id ? 'text-ink/70' : 'text-slate'}`}>
                    ({cluster.articleIds.length})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Sentiment bar - compact */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate uppercase tracking-wider">Sentiment:</span>
            <SentimentBar
              sentimentCounts={sentimentCounts}
              activeSentiment={activeSentiment}
              onSentimentClick={onSentimentClick}
              compact
            />
            {activeSentiment && (
              <button
                onClick={() => onSentimentClick(null)}
                className="font-mono text-xs text-amber hover:text-cream cursor-pointer"
              >
                clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
