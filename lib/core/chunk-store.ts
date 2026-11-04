import fs from "node:fs";
import path from "node:path";
import type { IndexedChunk } from "./types";

export const KEYWORD_SQL = `
select id, source, title, text, heading_path, lang,
       ts_rank(tsv, plainto_tsquery('simple', $1)) as score
from citebot_chunks
where collection = $2
  and ($3::text is null or lang is null or lang = $3)
  and tsv @@ plainto_tsquery('simple', $1)
order by score desc
limit $4`.trim();

export const VECTOR_SQL = `
select id, source, title, text, heading_path, lang,
       1 - (embedding <=> $1::vector) as score
from citebot_chunks
where collection = $2
  and embedding is not null
  and ($3::text is null or lang is null or lang = $3)
order by embedding <=> $1::vector
limit $4`.trim();

export const UPSERT_SQL = `
insert into citebot_chunks (
  id, collection, source, title, heading_path, lang, text, index_text, context, context_source, embedding
) values (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector
)
on conflict (id) do update set
  collection = excluded.collection,
  source = excluded.source,
  title = excluded.title,
  heading_path = excluded.heading_path,
  lang = excluded.lang,
  text = excluded.text,
  index_text = excluded.index_text,
  context = excluded.context,
  context_source = excluded.context_source,
  embedding = excluded.embedding`.trim();

export type Sql = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

export function storeKind(env: NodeJS.ProcessEnv = process.env): "memory" | "pgvector" {
  const url = env["DATABASE_URL"];
  return typeof url === "string" && url.trim() ? "pgvector" : "memory";
}

function assertNotUpload(chunks: IndexedChunk[]): void {
  if (chunks.some((chunk) => chunk.collection === "upload")) {
    throw new Error("Refusing to persist an uploaded document.");
  }
}

export class PgVectorStore {
  constructor(private readonly sql: Sql) {}

  async upsert(chunks: IndexedChunk[]): Promise<void> {
    assertNotUpload(chunks);
    for (const chunk of chunks) {
      const embedding =
        chunk.embedding && chunk.embedding.length > 0
          ? `[${chunk.embedding.join(",")}]`
          : null;
      await this.sql.query(UPSERT_SQL, [
        chunk.id,
        chunk.collection,
        chunk.source,
        chunk.title,
        chunk.headingPath,
        chunk.lang ?? null,
        chunk.text,
        chunk.indexText,
        chunk.context,
        chunk.contextSource,
        embedding,
      ]);
    }
  }

  async keywordSearch(query: string, collection: string, lang: string | null, limit: number) {
    return this.sql.query(KEYWORD_SQL, [query, collection, lang, limit]);
  }

  async vectorSearch(embedding: number[], collection: string, lang: string | null, limit: number) {
    const literal = `[${embedding.join(",")}]`;
    return this.sql.query(VECTOR_SQL, [literal, collection, lang, limit]);
  }
}

export async function createPgVectorStore(connectionString: string): Promise<PgVectorStore> {
  const pg = await import("pg");
  const client = new pg.Client({ connectionString });
  await client.connect();
  return new PgVectorStore(client);
}

export function defaultIndexPath(): string {
  return process.env.CITEBOT_INDEX_PATH?.trim() || path.join(process.cwd(), ".cache", "citebot-index.json");
}

export function persistHandbookIndex(chunks: IndexedChunk[], filePath = defaultIndexPath()): void {
  assertNotUpload(chunks);
  if (process.env.NODE_TEST_CONTEXT && process.env.CITEBOT_PERSIST_INDEX !== "1") return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ chunks }), "utf8");
}

export function readHandbookIndex(filePath = defaultIndexPath()): IndexedChunk[] | null {
  if (process.env.NODE_TEST_CONTEXT && process.env.CITEBOT_PERSIST_INDEX !== "1") return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { chunks?: IndexedChunk[] };
    if (!Array.isArray(parsed.chunks)) return null;
    if (parsed.chunks.some((chunk) => chunk.collection === "upload")) return null;
    return parsed.chunks;
  } catch {
    return null;
  }
}
