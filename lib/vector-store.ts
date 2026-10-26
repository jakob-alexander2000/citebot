import fs from "node:fs";
import path from "node:path";
import { corpusFingerprint, loadCorpusChunks } from "./corpus";
import { TaskType } from "@google/generative-ai";
import { cosineSimilarity, embedTexts, EMBEDDING_MODEL } from "./embeddings";
import type { Citation, EmbeddedChunk } from "./types";

/** Gemini embedding cache — do not reuse OpenAI vectors from embeddings.json */
const CACHE_PATH = path.join(
  process.cwd(),
  ".cache",
  "embeddings-gemini-v2.json",
);

type CacheFile = {
  fingerprint: string;
  model: string;
  chunks: EmbeddedChunk[];
};

let memoryStore: EmbeddedChunk[] | null = null;
let memoryFingerprint: string | null = null;
let ingestPromise: Promise<EmbeddedChunk[]> | null = null;

function readCache(): CacheFile | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_PATH, "utf8");
    return JSON.parse(raw) as CacheFile;
  } catch {
    return null;
  }
}

function writeCache(data: CacheFile): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data));
}

export async function ensureIndex(): Promise<EmbeddedChunk[]> {
  const fingerprint = corpusFingerprint();
  if (memoryStore && memoryFingerprint === fingerprint) {
    return memoryStore;
  }

  const cached = readCache();
  if (
    cached &&
    cached.fingerprint === fingerprint &&
    cached.model === EMBEDDING_MODEL &&
    cached.chunks?.length
  ) {
    memoryStore = cached.chunks;
    memoryFingerprint = fingerprint;
    return cached.chunks;
  }

  if (!ingestPromise) {
    ingestPromise = (async () => {
      const chunks = loadCorpusChunks();
      if (chunks.length === 0) {
        throw new Error("No corpus documents found under /corpus.");
      }
      const embeddings = await embedTexts(
        chunks.map((c) => c.text),
        TaskType.RETRIEVAL_DOCUMENT,
      );
      const embedded: EmbeddedChunk[] = chunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i]!,
      }));
      writeCache({ fingerprint, model: EMBEDDING_MODEL, chunks: embedded });
      memoryStore = embedded;
      memoryFingerprint = fingerprint;
      return embedded;
    })().finally(() => {
      ingestPromise = null;
    });
  }

  return ingestPromise;
}

export async function retrieve(
  query: string,
  topK = 4,
): Promise<Citation[]> {
  const store = await ensureIndex();
  const [queryEmbedding] = await embedTexts([query], TaskType.RETRIEVAL_QUERY);
  if (!queryEmbedding) return [];

  const scored = store
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ chunk, score }) => ({
    id: chunk.id,
    source: chunk.source,
    title: chunk.title,
    snippet: chunk.text.slice(0, 280).replace(/\s+/g, " ").trim(),
    score: Number(score.toFixed(4)),
  }));
}
