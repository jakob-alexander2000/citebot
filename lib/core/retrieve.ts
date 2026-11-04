import { bm25Rank } from "./bm25";
import { reciprocalRankFusion, type RankedId } from "./fuse";
import type { IndexedChunk } from "./types";

export type Hit = { id: string; score: number };

export type HybridResult = {
  keyword: Hit[];
  vector: Hit[];
  fused: Hit[];
};

function cosine(a: number[], b: number[]): number {
  const width = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < width; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function hybridRank(input: {
  query: string;
  chunks: IndexedChunk[];
  queryEmbedding: number[] | null;
  topK: number;
  /** Rank this field. Contextual retrieval uses indexText. */
  field?: "text" | "indexText";
}): HybridResult {
  const field = input.field ?? "indexText";
  const docs = input.chunks.map((chunk) => chunk[field]);
  const keyword = bm25Rank(input.query, docs, input.topK).map((hit) => ({
    id: input.chunks[hit.index]!.id,
    score: hit.score,
  }));
  let vector: Hit[] = [];
  if (input.queryEmbedding) {
    vector = input.chunks
      .map((chunk) => ({
        id: chunk.id,
        score: chunk.embedding ? cosine(input.queryEmbedding!, chunk.embedding) : 0,
      }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, input.topK);
  }
  const lists: RankedId[][] = [keyword];
  if (vector.length > 0) lists.push(vector);
  const fused = reciprocalRankFusion(lists).slice(0, input.topK);
  return { keyword, vector, fused };
}
