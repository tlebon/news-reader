import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNews, analyzeArticles, type FetchNewsParams } from '../api/newsApi';
import type { NewsArticle, EnrichedArticle } from '../types';

export function useNews(params: FetchNewsParams = {}) {
  return useQuery({
    queryKey: ['news', params.topic, params.country],
    queryFn: () => fetchNews(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAnalyzeArticles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articles: NewsArticle[]) => analyzeArticles(articles),
    onSuccess: (enrichedArticles, originalArticles) => {
      // Cache the enriched articles
      queryClient.setQueryData(['enrichedArticles'], enrichedArticles);
    },
  });
}

export function useEnrichedArticles() {
  return useQuery<EnrichedArticle[]>({
    queryKey: ['enrichedArticles'],
    enabled: false, // Only populated by mutation
    staleTime: Infinity,
  });
}
