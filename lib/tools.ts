import type { Chunk, Citation } from "./types";

export const TOOL_NAMES = [
  "search_handbook",
  "list_topics",
  "get_section",
  "quote_check",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export function isToolName(value: string): value is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(value);
}

export type ToolRuntime = {
  chunks: Chunk[];
  search: (query: string, topK?: number) => Promise<Citation[]>;
};

export type ToolExecution = {
  ok: boolean;
  summary: string;
  /** Text fed back to the model. Kept shorter than the full corpus. */
  body: string;
  citations: Citation[];
};

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

function asString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function toCitation(chunk: Chunk, score: number): Citation {
  return {
    id: chunk.id,
    source: chunk.source,
    title: chunk.title,
    snippet: chunk.text.slice(0, 280).replace(/\s+/g, " ").trim(),
    score: Number(score.toFixed(4)),
  };
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9äöüß€]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

/** Offline stand-in for embedding search. Used by fixture tests, not production. */
export function lexicalSearch(
  chunks: Chunk[],
  query: string,
  topK = 4,
): Citation[] {
  const q = tokens(query);
  if (q.length === 0 || topK <= 0) return [];
  const phrase = query.toLowerCase().replace(/\s+/g, " ").trim();

  const scored = chunks
    .map((chunk) => {
      const hay = new Set(tokens(`${chunk.title} ${chunk.source} ${chunk.text}`));
      let hits = 0;
      for (const token of q) {
        if (hay.has(token)) hits += 1;
      }
      const bonus = phrase.length > 3 && chunk.text.toLowerCase().includes(phrase) ? 0.35 : 0;
      return { chunk, score: hits / q.length + bonus };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ chunk, score }) => toCitation(chunk, score));
}

function normalizeQuote(text: string): string {
  return text
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function headings(text: string): string[] {
  return [...text.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
}

function listTopics(chunks: Chunk[]): ToolExecution {
  const bySource = new Map<string, { title: string; sections: string[] }>();
  for (const chunk of chunks) {
    const current = bySource.get(chunk.source) ?? {
      title: chunk.title,
      sections: [],
    };
    for (const heading of headings(chunk.text)) {
      if (!current.sections.includes(heading)) current.sections.push(heading);
    }
    bySource.set(chunk.source, current);
  }

  const topics = [...bySource.entries()].map(([source, doc]) => ({
    source,
    title: doc.title,
    sections: doc.sections.slice(0, 8),
  }));

  const lines = topics.map((topic) => {
    const sections = topic.sections.length
      ? `: ${topic.sections.join(", ")}`
      : "";
    return `- ${topic.title} (${topic.source})${sections}`;
  });

  const summary =
    topics.length === 0
      ? "Handbook has no documents."
      : `${topics.length} document${topics.length === 1 ? "" : "s"}`;

  return {
    ok: true,
    summary,
    body: lines.join("\n") || summary,
    citations: [],
  };
}

function findSection(chunks: Chunk[], input: Record<string, unknown>): Chunk[] {
  const id = asString(input.id, 120);
  const source = asString(input.source, 160).toLowerCase();
  const title = asString(input.title, 160).toLowerCase();

  if (id) {
    const hit = chunks.filter((chunk) => chunk.id === id);
    if (hit.length) return hit;
  }

  if (source) {
    const needle = source.replace(/\.(md|pdf)$/i, "");
    const hit = chunks.filter((chunk) => {
      const file = chunk.source.toLowerCase();
      return file.includes(needle) || chunk.id.toLowerCase().includes(needle);
    });
    if (hit.length) return hit.slice(0, 3);
  }

  if (title) {
    const byTitle = chunks.filter((chunk) =>
      chunk.title.toLowerCase().includes(title),
    );
    if (byTitle.length) return byTitle.slice(0, 3);
    return chunks
      .filter((chunk) => chunk.text.toLowerCase().includes(title))
      .slice(0, 2);
  }

  return [];
}

function getSection(
  chunks: Chunk[],
  input: Record<string, unknown>,
): ToolExecution {
  const id = asString(input.id, 120);
  const source = asString(input.source, 160);
  const title = asString(input.title, 160);
  if (!id && !source && !title) {
    return {
      ok: false,
      summary: "Need an id, source, or title.",
      body: "get_section needs id, source, or title.",
      citations: [],
    };
  }

  const hits = findSection(chunks, input);
  if (hits.length === 0) {
    return {
      ok: true,
      summary: "No section matched.",
      body: "No handbook section matched that id, source, or title.",
      citations: [],
    };
  }

  const citations = hits.map((chunk) =>
    toCitation(chunk, chunk.id === id ? 1 : 0.8),
  );
  const body = hits
    .map((chunk) => `id=${chunk.id} source=${chunk.source}\n${clip(chunk.text, 700)}`)
    .join("\n\n");
  const titles = [...new Set(hits.map((chunk) => chunk.title))].join(", ");

  return {
    ok: true,
    summary: `${hits.length} section${hits.length === 1 ? "" : "s"} · ${titles}`,
    body,
    citations,
  };
}

function quoteCheck(chunks: Chunk[], input: Record<string, unknown>): ToolExecution {
  const quote = asString(input.quote, 400);
  if (quote.length < 4) {
    return {
      ok: false,
      summary: "Missing quote.",
      body: "quote_check needs a quote of at least 4 characters.",
      citations: [],
    };
  }

  const citationId = asString(input.citationId, 120);
  const pool = citationId
    ? chunks.filter((chunk) => chunk.id === citationId)
    : chunks;
  const needle = normalizeQuote(quote);

  for (const chunk of pool) {
    if (!normalizeQuote(chunk.text).includes(needle)) continue;
    return {
      ok: true,
      summary: `Matched in ${chunk.source}`,
      body: `Quote found in ${chunk.title} (${chunk.id}).\n${clip(chunk.text, 320)}`,
      citations: [toCitation(chunk, 1)],
    };
  }

  const where = citationId ? ` in ${citationId}` : "";
  return {
    ok: true,
    summary: `No match${where}.`,
    body: `The quote does not appear in the handbook${where}: "${clip(quote, 160)}"`,
    citations: [],
  };
}

export async function executeTool(
  name: ToolName,
  input: Record<string, unknown>,
  runtime: ToolRuntime,
): Promise<ToolExecution> {
  if (name === "list_topics") return listTopics(runtime.chunks);
  if (name === "get_section") return getSection(runtime.chunks, input);
  if (name === "quote_check") return quoteCheck(runtime.chunks, input);

  const query = asString(input.query, 300);
  if (!query) {
    return {
      ok: false,
      summary: "Missing query.",
      body: "search_handbook needs a query.",
      citations: [],
    };
  }

  const requested = typeof input.topK === "number" ? input.topK : 4;
  const topK = Math.min(4, Math.max(1, Math.floor(requested)));
  const citations = await runtime.search(query, topK);
  const titles = [...new Set(citations.map((c) => c.title))].slice(0, 3);
  const summary =
    citations.length === 0
      ? "No matching passages."
      : `${citations.length} passage${citations.length === 1 ? "" : "s"} · ${titles.join(", ")}`;
  const body =
    citations.length === 0
      ? `No passages for "${query}".`
      : citations
          .map((c) => `id=${c.id} source=${c.source} title=${c.title}\n${c.snippet}`)
          .join("\n\n");

  return { ok: true, summary, body, citations };
}
