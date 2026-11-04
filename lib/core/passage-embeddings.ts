import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { WORKERS_AI_DEFAULT_EMBED_MODEL } from "./models";
import type { IndexedChunk } from "./types";

export const PASSAGE_EMBEDDINGS_PATH = path.join(process.cwd(), "data", "passage-embeddings.json");

export type PassageEmbeddingFile = {
  model: string;
  dim: number;
  contentHash: string;
  chunks: { id: string; textHash: string; embedding: number[] }[];
};

let loaded: PassageEmbeddingFile | null | undefined;

export function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function contentHash(rows: { id: string; indexText: string }[]): string {
  const hash = createHash("sha256");
  for (const row of rows) {
    hash.update(row.id);
    hash.update("\n");
    hash.update(row.indexText);
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function resetPassageEmbeddingsForTests(): void {
  loaded = undefined;
}

export function loadPassageEmbeddings(file = PASSAGE_EMBEDDINGS_PATH): PassageEmbeddingFile | null {
  if (loaded !== undefined && file === PASSAGE_EMBEDDINGS_PATH) return loaded;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as PassageEmbeddingFile;
    if (parsed.model !== WORKERS_AI_DEFAULT_EMBED_MODEL || !Array.isArray(parsed.chunks)) {
      loaded = null;
      return null;
    }
    if (file === PASSAGE_EMBEDDINGS_PATH) loaded = parsed;
    return parsed;
  } catch {
    if (file === PASSAGE_EMBEDDINGS_PATH) loaded = null;
    return null;
  }
}

/** Attach committed vectors when the chunk text still matches. Never calls a model. */
export function attachPassageEmbeddings(chunks: IndexedChunk[]): number {
  const file = loadPassageEmbeddings();
  if (!file) return 0;
  const byId = new Map(file.chunks.map((row) => [row.id, row]));
  let attached = 0;
  for (const chunk of chunks) {
    const row = byId.get(chunk.id);
    if (!row || row.textHash !== textHash(chunk.indexText)) continue;
    chunk.embedding = row.embedding;
    attached += 1;
  }
  return attached;
}
