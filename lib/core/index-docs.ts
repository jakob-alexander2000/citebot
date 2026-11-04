import { deterministicContext, oneSentence } from "./draft";
import { QuotaExceededError } from "./models";
import type { GenerateVia, ModelProvider } from "./provider";
import type { Collection, IndexedChunk, RawChunk } from "./types";
import { loadHandbookRaw, loadPhoneRaw } from "./documents";

const cache = new Map<string, IndexedChunk[]>();
const inflight = new Map<string, Promise<IndexedChunk[]>>();

export function resetIndexesForTests(): void {
  cache.clear();
  inflight.clear();
}

function contextSource(via: GenerateVia): IndexedChunk["contextSource"] {
  if (via === "mock") return "mock";
  return "workers-ai";
}

async function withContext(raw: RawChunk, provider: ModelProvider): Promise<IndexedChunk> {
  const locale = raw.lang ?? "en";
  const fallback = deterministicContext({
    title: raw.title,
    headingPath: raw.headingPath,
    locale,
  });
  try {
    const result = await provider.generate({
      purpose: "context",
      locale,
      title: raw.title,
      headingPath: raw.headingPath,
      passage: raw.text,
    });
    const context = oneSentence(result.text) || fallback;
    return {
      ...raw,
      context,
      contextSource: result.text.trim() ? contextSource(result.via) : "deterministic",
      indexText: `${context}\n\n${raw.text}`,
      embedding: null,
    };
  } catch (err) {
    if (err instanceof QuotaExceededError) throw err;
    return {
      ...raw,
      context: fallback,
      contextSource: "deterministic",
      indexText: `${fallback}\n\n${raw.text}`,
      embedding: null,
    };
  }
}

async function build(collection: Exclude<Collection, "upload">, provider: ModelProvider): Promise<IndexedChunk[]> {
  const raw = collection === "handbook" ? await loadHandbookRaw() : loadPhoneRaw();
  const indexed: IndexedChunk[] = [];
  for (const chunk of raw) {
    indexed.push(await withContext(chunk, provider));
  }
  return indexed;
}

export async function indexedCollection(
  collection: Exclude<Collection, "upload">,
  provider: ModelProvider,
): Promise<IndexedChunk[]> {
  const key = `${collection}:${provider.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;
  const work = build(collection, provider)
    .then((chunks) => {
      cache.set(key, chunks);
      inflight.delete(key);
      return chunks;
    })
    .catch((err: unknown) => {
      inflight.delete(key);
      throw err;
    });
  inflight.set(key, work);
  return work;
}

export async function indexRawChunks(raw: RawChunk[], provider: ModelProvider): Promise<IndexedChunk[]> {
  const indexed: IndexedChunk[] = [];
  for (const chunk of raw) indexed.push(await withContext(chunk, provider));
  return indexed;
}
