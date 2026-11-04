export type RankedId = { id: string; score: number };

/** Reciprocal rank fusion. `k` is the constant from Cormack et al., usually 60. */
export function reciprocalRankFusion(lists: RankedId[][], k = 60): RankedId[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    if (list.length === 0) continue;
    list.forEach((item, index) => {
      const rank = index + 1;
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + rank));
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
