const cache = new Map<string, number[]>();
const MAX = 200;

export function resetQueryCacheForTests(): void {
  cache.clear();
}

export function cachedQueryEmbedding(question: string): number[] | null {
  const key = question.trim().toLowerCase();
  const hit = cache.get(key);
  return hit ? hit.slice() : null;
}

export function rememberQueryEmbedding(question: string, embedding: number[]): void {
  const key = question.trim().toLowerCase();
  if (cache.has(key)) cache.delete(key);
  cache.set(key, embedding.slice());
  while (cache.size > MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}
