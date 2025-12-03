import { cosineSimilarity } from './embeddingService.js';

export interface Cluster {
  id: number;
  articleIds: string[];
  centroid: number[];
}

// Simple k-means clustering
export function kMeansClustering(
  embeddings: Map<string, number[]>,
  k: number = 3,
  maxIterations: number = 20
): Cluster[] {
  const articleIds = Array.from(embeddings.keys());
  const vectors = articleIds.map(id => embeddings.get(id)!);

  if (articleIds.length < k) {
    // Not enough articles for k clusters, put all in one
    return [{
      id: 0,
      articleIds,
      centroid: vectors[0] || []
    }];
  }

  // Initialize centroids randomly (pick k random articles)
  const shuffled = [...articleIds].sort(() => Math.random() - 0.5);
  let centroids = shuffled.slice(0, k).map(id => [...embeddings.get(id)!]);

  let assignments = new Array(articleIds.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign each article to nearest centroid
    const newAssignments = vectors.map(vec => {
      let bestCluster = 0;
      let bestSimilarity = -Infinity;

      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(vec, centroids[c]);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestCluster = c;
        }
      }
      return bestCluster;
    });

    // Check for convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;

    if (!changed) {
      console.log(`K-means converged after ${iter + 1} iterations`);
      break;
    }

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterVectors = vectors.filter((_, i) => assignments[i] === c);
      if (clusterVectors.length > 0) {
        centroids[c] = averageVectors(clusterVectors);
      }
    }
  }

  // Build clusters
  const clusters: Cluster[] = [];
  for (let c = 0; c < k; c++) {
    const clusterArticleIds = articleIds.filter((_, i) => assignments[i] === c);
    if (clusterArticleIds.length > 0) {
      clusters.push({
        id: c,
        articleIds: clusterArticleIds,
        centroid: centroids[c]
      });
    }
  }

  // Sort clusters by size (largest first)
  clusters.sort((a, b) => b.articleIds.length - a.articleIds.length);

  // Re-assign IDs after sorting
  clusters.forEach((cluster, index) => {
    cluster.id = index;
  });

  console.log(`Created ${clusters.length} clusters: ${clusters.map(c => c.articleIds.length).join(', ')} articles each`);

  return clusters;
}

// Average multiple vectors
function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];

  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += vec[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    avg[i] /= vectors.length;
  }

  return avg;
}