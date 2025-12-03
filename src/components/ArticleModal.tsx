import { useEffect } from 'react';
import type { EnrichedArticle } from '../types';

interface ArticleModalProps {
  article: EnrichedArticle;
  onClose: () => void;
}

export function ArticleModal({ article, onClose }: ArticleModalProps) {
  const hasClaude = !!article.claude;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/90 backdrop-blur-sm animate-in" style={{ animationDuration: '150ms' }} />

      {/* Modal */}
      <div
        className="relative bg-ink-light border border-ink-lighter rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-in"
        style={{ animationDuration: '200ms' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate hover:text-cream transition-colors font-mono text-xl leading-none p-1"
          aria-label="Close"
        >
          ×
        </button>

        {/* Image */}
        {article.image_url && (
          <img
            src={article.image_url}
            alt=""
            className="w-full h-48 object-cover opacity-80"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        <div className="p-6">
          {/* Source & date */}
          <div className="flex items-center gap-2 mb-3">
            {article.source_icon && (
              <img src={article.source_icon} alt="" className="w-5 h-5 rounded" />
            )}
            <span className="font-mono text-sm text-cream-dim">
              {article.source_name}
            </span>
            {hasClaude && (
              <span className={`font-mono text-xs px-2 py-0.5 border rounded ml-auto sentiment-${article.claude!.sentiment}`}>
                {article.claude!.sentiment}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-cream mb-2 leading-tight">
            {article.title}
          </h2>

          {/* Date */}
          <p className="font-mono text-xs text-slate mb-6">
            {formatDate(article.pubDate)}
          </p>

          {/* AI Summary */}
          {hasClaude ? (
            <div className="mb-6">
              <h3 className="font-mono text-xs text-amber uppercase tracking-wider mb-3">
                AI Summary
              </h3>
              <p className="text-cream-dim leading-relaxed text-lg">
                {article.claude!.summary}
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <h3 className="font-mono text-xs text-slate uppercase tracking-wider mb-3">
                Description
              </h3>
              <p className="text-cream-dim leading-relaxed">
                {article.description || 'No description available. Click "Read Article" to view the full story.'}
              </p>
            </div>
          )}

          {/* Keywords */}
          {hasClaude && article.claude!.keywords.length > 0 && (
            <div className="mb-6">
              <h3 className="font-mono text-xs text-slate uppercase tracking-wider mb-3">
                Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {article.claude!.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="font-mono text-sm bg-amber/20 text-amber px-3 py-1 rounded"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Topic group */}
          {hasClaude && article.claude!.groupLabel && (
            <div className="mb-6">
              <h3 className="font-mono text-xs text-slate uppercase tracking-wider mb-2">
                Topic Cluster
              </h3>
              <p className="text-cream-dim">{article.claude!.groupLabel}</p>
            </div>
          )}

          {/* Categories */}
          {article.category && article.category.length > 0 && (
            <div className="mb-6">
              <h3 className="font-mono text-xs text-slate uppercase tracking-wider mb-3">
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {article.category.map((cat) => (
                  <span
                    key={cat}
                    className="font-mono text-sm bg-ink-lighter text-slate px-3 py-1 rounded"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-ink-lighter">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-amber text-ink font-mono text-sm font-medium px-4 py-3 rounded text-center hover:bg-amber-bright transition-colors"
            >
              Read Full Article →
            </a>
            <button
              onClick={onClose}
              className="px-4 py-3 border border-ink-lighter text-cream-dim font-mono text-sm rounded hover:border-slate transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
