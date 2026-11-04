import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { bm25Rank } from "../lib/core/bm25";
import { flagDroppedConditions } from "../lib/core/conditions";
import { checkClaims } from "../lib/core/claims";
import { PgVectorStore, UPSERT_SQL, storeKind } from "../lib/core/chunk-store";
import { reciprocalRankFusion } from "../lib/core/fuse";
import { measureHandbookRetrieval } from "../lib/core/retrieval-quality";
import type { IndexedChunk } from "../lib/core/types";

describe("hybrid search pieces", () => {
  it("ranks the vacation passage above an unrelated one", () => {
    const docs = [
      "Desk days are Tuesday and Thursday.",
      "Full-time employees receive 30 days of paid vacation per calendar year.",
    ];
    const ranked = bm25Rank("How many paid vacation days do full-time employees get?", docs, 2);
    assert.equal(ranked[0]?.index, 1);
  });

  it("fuses a strong vector hit ahead of the keyword winner", () => {
    const fused = reciprocalRankFusion(
      [
        [
          { id: "keyword-winner", score: 3 },
          { id: "middle", score: 2 },
          { id: "vector-winner", score: 1 },
        ],
        [{ id: "vector-winner", score: 0.9 }],
      ],
      60,
    );
    assert.equal(fused[0]?.id, "vector-winner");
  });

  it("flags dropped conditions in English and German", () => {
    const english = flagDroppedConditions(
      "Unused leave does not carry over past March 31 unless a manager approves an exception. Full-time employees only.",
      "Unused leave does not carry over past March 31.",
    );
    assert.ok(english.some((flag) => flag.kind === "unless"));
    assert.ok(english.some((flag) => flag.kind === "only"));

    const german = flagDroppedConditions(
      "Ein schriftliches Angebot gibt es erst nach einer Besichtigung, sofern der Auftrag in Berlin liegt. Weiter fahren wir nicht, außer ein Angebot erlaubt es. Die Anfahrt entfällt nur wenn die Reparatur gebucht wird.",
      "Ein schriftliches Angebot gibt es nach einer Besichtigung.",
    );
    const kinds = german.map((flag) => flag.kind);
    for (const kind of ["außer", "erst nach", "nur", "sofern"]) {
      assert.ok(kinds.includes(kind), kind);
    }
  });

  it("ties a sentence to the passage and does not flag a kept condition", () => {
    const checks = checkClaims("Full-time employees receive 30 days of paid vacation per calendar year.", [
      {
        id: "pto",
        source: "pto-and-leave.md",
        title: "Time off",
        text: "Full-time employees receive 30 days of paid vacation per calendar year unless they are new.",
        score: 1,
        headingPath: ["Time off"],
      },
    ]);
    assert.equal(checks[0]?.match, "supported");
    assert.equal(checks[0]?.passages[0]?.id, "pto");
    assert.ok(checks[0]?.flaggedConditions.some((flag) => flag.kind === "unless"));
  });

  it("refuses to store an upload in pgvector and keeps text out of the SQL string", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const store = new PgVectorStore({
      query: async (sql, params) => {
        calls.push({ sql, params: params ?? [] });
        return { rows: [] };
      },
    });
    const secret = "UNIQUE_SQL_TEXT_SHOULD_BE_A_PARAM";
    const chunk: IndexedChunk = {
      id: "handbook:1",
      collection: "handbook",
      source: "welcome.md",
      title: "Welcome",
      headingPath: ["Welcome"],
      text: secret,
      indexText: secret,
      context: "context",
      contextSource: "deterministic",
      embedding: [0.1, 0.2],
    };
    await assert.rejects(() => store.upsert([{ ...chunk, collection: "upload" }]));
    assert.equal(calls.length, 0);
    await store.upsert([chunk]);
    assert.equal(calls[0]?.sql, UPSERT_SQL);
    assert.equal(calls[0]?.sql.includes(secret), false);
    assert.ok(calls[0]?.params.includes(secret));
    assert.equal(storeKind({ ...process.env, DATABASE_URL: "" }), "memory");
    assert.equal(storeKind({ ...process.env, DATABASE_URL: "postgres://example" }), "pgvector");
  });

  it("matches the committed BM25 half of the retrieval measurement", async () => {
    const measured = await measureHandbookRetrieval(3);
    const file = path.join(process.cwd(), "evals", "retrieval-quality.json");
    const committed = JSON.parse(fs.readFileSync(file, "utf8")) as {
      embedder: string;
      labeled: number;
      bm25: typeof measured.bm25;
      vector: { total: number } | null;
      hybrid: { total: number } | null;
    };
    assert.equal(measured.vector, null);
    assert.deepEqual(measured.bm25, committed.bm25);
    assert.equal(committed.embedder, "@cf/baai/bge-m3");
    assert.ok(committed.labeled >= 20);
    assert.equal(committed.vector?.total, committed.labeled);
    assert.equal(committed.hybrid?.total, committed.labeled);
  });

  it("migration creates the pgvector table and excludes uploads", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase", "migrations", "20261104120000_citebot_chunks.sql"),
      "utf8",
    );
    assert.match(sql, /create extension if not exists vector/i);
    assert.match(sql, /citebot_chunks/);
    assert.match(sql, /tsvector/);
    assert.match(sql, /vector\(1024\)/);
    assert.match(sql, /collection in \('handbook', 'phone'\)/);
    assert.equal(/collection in \([^)]*upload/.test(sql), false);
  });
});
