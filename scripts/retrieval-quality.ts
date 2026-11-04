import fs from "node:fs";
import path from "node:path";
import {
  HANDBOOK_LABELS,
  loadScoredChunks,
  measureHandbookRetrieval,
  scoreBm25,
  scoreHybrid,
  scoreVector,
} from "../lib/core/retrieval-quality";
import { getModelProvider } from "../lib/core/provider";

async function main() {
  const vectorsPath = process.env.CITEBOT_VECTORS?.trim();
  let report;
  if (vectorsPath) {
    const saved = JSON.parse(fs.readFileSync(vectorsPath, "utf8")) as {
      documents: number[][];
      queries: number[][];
    };
    const chunks = await loadScoredChunks();
    if (
      saved.documents.length !== chunks.length ||
      saved.queries.length !== HANDBOOK_LABELS.length
    ) {
      console.error(
        `Vector file has ${saved.documents.length} documents and ${saved.queries.length} queries.`,
      );
      process.exit(1);
    }
    report = {
      method:
        "Top 3. A hit means the chunk source file matches and the chunk's own text contains the labeled phrase. BM25 uses k1=1.2 and b=0.75 on the passage plus its context sentence. Vector is cosine over Workers AI @cf/baai/bge-m3 embeddings of that same text. Hybrid is reciprocal rank fusion (k=60) of the two full lists. Labels were written before this run. Embeddings were produced by @cf/baai/bge-m3.",
      k: 3,
      labeled: HANDBOOK_LABELS.length,
      embedder: "@cf/baai/bge-m3",
      bm25: scoreBm25(chunks, 3),
      vector: scoreVector(chunks, saved.documents, saved.queries, 3),
      hybrid: scoreHybrid(chunks, saved.documents, saved.queries, 3),
    };
  } else {
    const provider = getModelProvider();
    if (!provider.embed) {
      console.error(
        "No embedder. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN so Workers AI @cf/baai/bge-m3 can run. Refusing to write a partial score.",
      );
      process.exit(1);
    }
    report = await measureHandbookRetrieval(3, (texts) => provider.embed!(texts));
  }
  const file = path.join(process.cwd(), "evals", "retrieval-quality.json");
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  const brief = (score: { hits: number; total: number; recallAt3: number; mrr: number } | null) =>
    score
      ? { hits: score.hits, total: score.total, recallAt3: score.recallAt3, mrr: score.mrr }
      : null;
  console.log(
    JSON.stringify(
      {
        file,
        embedder: report.embedder,
        labeled: report.labeled,
        bm25: brief(report.bm25),
        vector: brief(report.vector),
        hybrid: brief(report.hybrid),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "retrieval measurement failed");
  process.exit(1);
});
