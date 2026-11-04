import { deterministicContext } from "./draft";
import { attachPassageEmbeddings } from "./passage-embeddings";
import type { Collection, IndexedChunk, RawChunk } from "./types";
import { loadHandbookRaw, loadPhoneRaw } from "./documents";

const cache = new Map<string, IndexedChunk[]>();
const inflight = new Map<string, Promise<IndexedChunk[]>>();

export function resetIndexesForTests(): void {
  cache.clear();
  inflight.clear();
}

export function chunkWithDeterministicContext(raw: RawChunk): IndexedChunk {
  const locale = raw.lang ?? "en";
  const context = deterministicContext({
    title: raw.title,
    headingPath: raw.headingPath,
    locale,
  });
  return {
    ...raw,
    context,
    contextSource: "deterministic",
    indexText: `${context}\n\n${raw.text}`,
    embedding: null,
  };
}

async function build(collection: Exclude<Collection, "upload">): Promise<IndexedChunk[]> {
  const raw = collection === "handbook" ? await loadHandbookRaw() : loadPhoneRaw();
  const indexed = raw.map(chunkWithDeterministicContext);
  attachPassageEmbeddings(indexed);
  return indexed;
}

export async function indexedCollection(
  collection: Exclude<Collection, "upload">,
): Promise<IndexedChunk[]> {
  const hit = cache.get(collection);
  if (hit) return hit;
  const pending = inflight.get(collection);
  if (pending) return pending;
  const work = build(collection)
    .then((chunks) => {
      cache.set(collection, chunks);
      inflight.delete(collection);
      return chunks;
    })
    .catch((err: unknown) => {
      inflight.delete(collection);
      throw err;
    });
  inflight.set(collection, work);
  return work;
}

export async function indexRawChunks(raw: RawChunk[]): Promise<IndexedChunk[]> {
  return raw.map(chunkWithDeterministicContext);
}
