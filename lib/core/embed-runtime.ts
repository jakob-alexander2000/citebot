import { QuotaExceededError, WORKERS_AI_DEFAULT_EMBED_MODEL, readEnv } from "./models";
import { canSpendNeurons, estimateNeurons } from "./neuron-budget";
import type { ModelProvider } from "./provider";
import type { IndexedChunk } from "./types";

export async function embedUploadedChunks(
  chunks: IndexedChunk[],
  provider: ModelProvider,
): Promise<string> {
  if (chunks.length === 0) return "none";
  if (chunks.every((chunk) => chunk.embedding && chunk.embedding.length > 0)) return "cached";
  if (!provider.embed) return "no embedder";
  const model = readEnv("WORKERS_AI_EMBED_MODEL") || WORKERS_AI_DEFAULT_EMBED_MODEL;
  const chars = chunks.reduce((sum, chunk) => sum + chunk.indexText.length, 0);
  if (!canSpendNeurons(estimateNeurons(model, chars))) return "soft cap";
  try {
    const vectors = await provider.embed(chunks.map((chunk) => chunk.indexText));
    if (!vectors || vectors.length !== chunks.length) return "empty";
    chunks.forEach((chunk, index) => {
      chunk.embedding = vectors[index] ?? null;
    });
    return "embedded";
  } catch (err) {
    if (err instanceof QuotaExceededError) return "quota";
    return "failed";
  }
}
