import { REGIONS, TOPICS, type RegionCode, type TopicId } from '../types';

interface FilterBarProps {
  topic: TopicId;
  region: RegionCode;
  onTopicChange: (topic: TopicId) => void;
  onRegionChange: (region: RegionCode) => void;
  isLoading: boolean;
  isAnalyzing: boolean;
  articleCount: number;
}

export function FilterBar({
  topic,
  region,
  onTopicChange,
  onRegionChange,
  isLoading,
  isAnalyzing,
  articleCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      {/* Region dropdown */}
      <div className="flex flex-col gap-1">
        <label className="font-mono text-xs text-cream-dim uppercase tracking-wider">
          Region
        </label>
        <select
          value={region}
          onChange={(e) => onRegionChange(e.target.value as RegionCode)}
          disabled={isLoading || isAnalyzing}
          className="bg-ink-light border border-ink-lighter text-cream px-3 py-2 rounded font-mono text-sm focus:border-amber focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Topic dropdown */}
      <div className="flex flex-col gap-1">
        <label className="font-mono text-xs text-cream-dim uppercase tracking-wider">
          Topic
        </label>
        <select
          value={topic}
          onChange={(e) => onTopicChange(e.target.value as TopicId)}
          disabled={isLoading || isAnalyzing}
          className="bg-ink-light border border-ink-lighter text-cream px-3 py-2 rounded font-mono text-sm focus:border-amber focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
        >
          {TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Article count */}
      <div className="ml-auto font-mono text-sm text-cream-dim">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-amber border-t-transparent rounded-full animate-spin" />
            Loading...
          </span>
        ) : (
          <span>
            <span className="text-amber">{articleCount}</span> articles
          </span>
        )}
      </div>
    </div>
  );
}
