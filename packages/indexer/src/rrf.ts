/** Reciprocal rank fusion constant (matches SQLite BM25 score ladder). */
export const RRF_K = 60;

export interface RrfRanked {
  id: string;
  /** 1-based rank in this list */
  rank: number;
}

/**
 * Merge multiple ordered ID lists using reciprocal rank fusion.
 * Higher score is better.
 */
export function mergeRrf(lists: RrfRanked[][], k = RRF_K): { id: string; score: number }[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    for (const item of list) {
      const add = 1 / (k + item.rank);
      scores.set(item.id, (scores.get(item.id) ?? 0) + add);
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ id, score }));
}

/** Convert ordered agent_id list to RRF ranks (1-based). */
export function toRrfRanks(ids: string[]): RrfRanked[] {
  return ids.map((id, i) => ({ id, rank: i + 1 }));
}
