/**
 * Write data/passage-embeddings.json for the sample handbook.
 * Pass CITEBOT_VECTORS=/path/to.json with { documents: number[][] } in handbook order,
 * or set Cloudflare credentials to embed live. CI must not run this.
 */
import fs from "node:fs";
import path from "node:path";
import { loadScoredChunks } from "../lib/core/retrieval-quality";
import { contentHash, textHash } from "../lib/core/passage-embeddings";
import { WORKERS_AI_DEFAULT_EMBED_MODEL } from "../lib/core/models";
import { getModelProvider } from "../lib/core/provider";

function roundVector(values: number[]): number[] {
  return values.map((value) => Number(value.toFixed(6)));
}

async function vectorsFor(count: number): Promise<number[][]> {
  const file = process.env.CITEBOT_VECTORS?.trim();
  if (file) {
    const saved = JSON.parse(fs.readFileSync(file, "utf8")) as { documents: number[][] };
    if (saved.documents.length !== count) {
      throw new Error(`Vector file has ${saved.documents.length} rows, handbook has ${count}.`);
    }
    return saved.documents;
  }
  const provider = getModelProvider();
  if (!provider.embed) throw new Error("No embedder and no CITEBOT_VECTORS file.");
  const chunks = await loadScoredChunks();
  const embedded = await provider.embed(chunks.map((chunk) => chunk.indexText));
  if (!embedded || embedded.length !== count) throw new Error("Embedding call failed.");
  return embedded;
}

async function main() {
  const chunks = await loadScoredChunks();
  const vectors = await vectorsFor(chunks.length);
  const rows = chunks.map((chunk, index) => ({
    id: chunk.id,
    textHash: textHash(chunk.indexText),
    embedding: roundVector(vectors[index] ?? []),
  }));
  const payload = {
    model: WORKERS_AI_DEFAULT_EMBED_MODEL,
    dim: rows[0]?.embedding.length ?? 0,
    contentHash: contentHash(chunks.map((chunk) => ({ id: chunk.id, indexText: chunk.indexText }))),
    chunks: rows,
  };
  const out = path.join(process.cwd(), "data", "passage-embeddings.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(payload)}\n`);
  console.log(
    JSON.stringify({
      file: out,
      model: payload.model,
      dim: payload.dim,
      chunks: payload.chunks.length,
      contentHash: payload.contentHash,
    }),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "embed failed");
  process.exit(1);
});
