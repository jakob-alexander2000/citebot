import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunkWithDeterministicContext } from "../lib/core/index-docs";
import { loadHandbookRaw } from "../lib/core/documents";
import {
  attachPassageEmbeddings,
  contentHash,
  loadPassageEmbeddings,
  textHash,
} from "../lib/core/passage-embeddings";

describe("committed passage embeddings", () => {
  it("matches the current handbook text and model", async () => {
    const file = loadPassageEmbeddings();
    assert.ok(file);
    assert.equal(file?.model, "@cf/baai/bge-m3");
    assert.equal(file?.dim, 1024);
    const raw = await loadHandbookRaw();
    const chunks = raw.map(chunkWithDeterministicContext);
    const hash = contentHash(chunks.map((chunk) => ({ id: chunk.id, indexText: chunk.indexText })));
    assert.equal(file?.contentHash, hash);
    assert.equal(attachPassageEmbeddings(chunks), chunks.length);
    for (const chunk of chunks) {
      assert.equal(chunk.embedding?.length, 1024);
      const row: { id: string; textHash: string; embedding: number[] } | undefined = file?.chunks.find(
        (item) => item.id === chunk.id,
      );
      assert.equal(row?.textHash, textHash(chunk.indexText));
    }
  });
});
