/**
 * Score the six held-out German paraphrases.
 * BM25 needs no network. Vector and hybrid need CITEBOT_HELD_OUT, a JSON file
 * { queries: number[][] } in HELD_OUT_GERMAN order, embedded with @cf/baai/bge-m3.
 */
import fs from "node:fs";
import path from "node:path";
import { attachPassageEmbeddings } from "../lib/core/passage-embeddings";
import { chunkWithDeterministicContext } from "../lib/core/index-docs";
import { loadHandbookRaw } from "../lib/core/documents";
import { HELD_OUT_GERMAN, scoreBm25, scoreHybrid, scoreVector } from "../lib/core/retrieval-quality";

async function main() {
const raw = await loadHandbookRaw();
const chunks = raw.map(chunkWithDeterministicContext);
attachPassageEmbeddings(chunks);
const scored = chunks.map((chunk) => ({
  id: chunk.id,
  source: chunk.source,
  text: chunk.text,
  indexText: chunk.indexText,
}));
const bm25 = scoreBm25(scored, 3, HELD_OUT_GERMAN);
const file = process.env.CITEBOT_HELD_OUT?.trim();
let vector = null;
let hybrid = null;
if (file) {
  const saved = JSON.parse(fs.readFileSync(file, "utf8")) as { queries: number[][] };
  const matrix = chunks.map((chunk) => chunk.embedding ?? []);
  vector = scoreVector(scored, matrix, saved.queries, 3, HELD_OUT_GERMAN);
  hybrid = scoreHybrid(scored, matrix, saved.queries, 3, HELD_OUT_GERMAN);
}
const report = {
  writtenBeforeRun: true,
  embedder: file ? "@cf/baai/bge-m3" : null,
  labeled: HELD_OUT_GERMAN.length,
  bm25,
  vector,
  hybrid,
};
const out = path.join(process.cwd(), "evals", "held-out-german.json");
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      bm25: { hits: bm25.hits, total: bm25.total, recallAt3: bm25.recallAt3, mrr: bm25.mrr },
      vector: vector && { hits: vector.hits, total: vector.total, recallAt3: vector.recallAt3, mrr: vector.mrr },
      hybrid: hybrid && { hits: hybrid.hits, total: hybrid.total, recallAt3: hybrid.recallAt3, mrr: hybrid.mrr },
      missedBm25: bm25.cases.filter((row) => !row.hit).map((row) => row.id),
      missedVector: vector?.cases.filter((row) => !row.hit).map((row) => row.id) ?? null,
    },
    null,
    2,
  ),
);
}
main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
