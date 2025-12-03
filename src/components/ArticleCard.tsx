import type { EnrichedArticle } from '../types';

interface ArticleCardProps {
	article: EnrichedArticle;
	index: number;
	clusterLabel: string;
	onClick: () => void;
}

export function ArticleCard({
	article,
	index,
	clusterLabel,
	onClick,
}: ArticleCardProps) {
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Berlin',
		});
	};

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
							(e.target as HTMLImageElement).style.display =
								'none';
						}}
					/>
					{article.sentiment && (
						<span
							className={`absolute top-2 left-2 font-mono text-xs px-2 py-1 border rounded bg-ink/80 sentiment-${article.sentiment}`}
						>
							{article.sentiment}
						</span>
					)}
				</div>
			)}

			{/* Sentiment badge when no image - only show if analyzed */}
			{!article.image_url && article.sentiment && (
				<div className="px-4 pt-4">
					<span
						className={`font-mono text-xs px-2 py-1 rounded sentiment-${article.sentiment}`}
					>
						{article.sentiment}
					</span>
				</div>
			)}

			{/* Content */}
			<div className="p-4 flex-1 flex flex-col">
				{/* Source & date */}
				<div className="flex items-center gap-2 mb-2">
					{article.source_icon && (
						<img
							src={article.source_icon}
							alt=""
							className="w-4 h-4 rounded"
						/>
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

				{/* Description */}
				<div className="flex-1">
					<p className="text-sm text-cream-dim leading-relaxed mb-3 line-clamp-3">
						{article.description || 'No description available'}
					</p>
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

				{/* Cluster/Topic label - only show if analyzed */}
				{article.clusterId >= 0 && (
					<div className="mt-2 font-mono text-xs text-slate">
						<span className="text-cream-dim">Topic:</span>{' '}
						{clusterLabel}
					</div>
				)}
			</div>
		</article>
	);
}
