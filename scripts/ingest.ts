/**
 * Precompute embeddings for /corpus into .cache/embeddings-gemini-v2.json
 * Usage: npx tsx scripts/ingest.ts
 */
import { ensureIndex } from "../lib/vector-store";

async function main() {
  const chunks = await ensureIndex();
  console.log(
    `Indexed ${chunks.length} chunks → .cache/embeddings-gemini-v2.json`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
