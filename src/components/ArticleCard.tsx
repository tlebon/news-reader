import type { EnrichedArticle } from '../types';

interface ArticleCardProps {
  article: EnrichedArticle;
  index: number;
  onClick: () => void;
}

export function ArticleCard({ article, index, onClick }: ArticleCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasClaude = !!article.claude;
  const sentimentClass = hasClaude ? `sentiment-${article.claude!.sentiment}` : '';

  return (
    <article
      onClick={onClick}
      className="animate-in bg-ink-light border border-ink-lighter rounded-lg overflow-hidden hover:border-amber cursor-pointer transition-colors flex flex-col"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header with image */}
      {article.image_url && (
        <div className="relative">
          <img
            src={article.image_url}
            alt=""
            className="w-full h-36 object-cover opacity-70"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {hasClaude && (
            <span
              className={`absolute top-2 left-2 font-mono text-xs px-2 py-1 border rounded bg-ink/80 ${sentimentClass}`}
            >
              {article.claude!.sentiment}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Source & date */}
        <div className="flex items-center gap-2 mb-2">
          {article.source_icon && (
            <img src={article.source_icon} alt="" className="w-4 h-4 rounded" />
          )}
          <span className="font-mono text-xs text-cream-dim">
            {article.source_name}
          </span>
          <span className="font-mono text-xs text-slate">
            {formatDate(article.pubDate)}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-3 leading-snug text-cream">
          {article.title}
        </h2>

        {/* Claude AI analysis or description fallback */}
        <div className="flex-1">
          {hasClaude ? (
            <>
              <p className="text-sm text-cream-dim leading-relaxed mb-3 line-clamp-3">
                {article.claude!.summary}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {article.claude!.keywords.slice(0, 3).map((kw) => (
                  <span
                    key={kw}
                    className="font-mono text-xs bg-amber/20 text-amber px-2 py-0.5 rounded"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-cream-dim leading-relaxed mb-3 line-clamp-3">
              {article.description || 'No description available'}
            </p>
          )}
        </div>

        {/* Categories from NewsData */}
        {article.category && article.category.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-3 border-t border-ink-lighter">
            {article.category.map((cat) => (
              <span
                key={cat}
                className="font-mono text-xs bg-ink-lighter text-slate px-2 py-0.5 rounded"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Group label if analyzed */}
        {hasClaude && article.claude!.groupLabel && (
          <div className="mt-2 font-mono text-xs text-slate">
            <span className="text-cream-dim">Topic:</span>{' '}
            {article.claude!.groupLabel}
          </div>
        )}
      </div>
    </article>
  );
}
