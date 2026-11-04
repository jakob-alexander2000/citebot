import { randomUUID } from "node:crypto";
import type { Locale } from "../locale";
import { recordAnswerAudit } from "./audit";
import { checkClaims, type PassageRef } from "./claims";
import { extractiveDraft } from "./draft";
import { indexedCollection } from "./index-docs";
import { QuotaExceededError } from "./models";
import { getModelProvider, type ModelProvider } from "./provider";
import { hybridRank } from "./retrieve";
import { getSession } from "./session-store";
import type { Collection, IndexedChunk } from "./types";

export type AnswerInput = {
  question: string;
  locale?: Locale;
  collection?: "handbook" | "phone";
  sessionId?: string;
  draft?: string;
  topK?: number;
  provider?: ModelProvider;
};

export class SessionExpiredError extends Error {
  readonly code = "session_expired" as const;
  readonly status = 404;
  constructor() {
    super("That upload session has ended.");
    this.name = "SessionExpiredError";
  }
}

type TraceStep = {
  step: string;
  ms: number;
  detail: string;
  hits?: { id: string; score: number }[];
};

function round(score: number): number {
  return Number(score.toFixed(4));
}

function hits(rows: { id: string; score: number }[]) {
  return rows.map((row) => ({ id: row.id, score: round(row.score) }));
}

async function embedQuery(
  provider: ModelProvider,
  chunks: IndexedChunk[],
  question: string,
): Promise<{ embedding: number[] | null; detail: string }> {
  if (!provider.embed) return { embedding: null, detail: "skipped: provider has no embedder" };
  try {
    if (chunks.some((chunk) => !chunk.embedding)) {
      const vectors = await provider.embed(chunks.map((chunk) => chunk.indexText));
      if (vectors && vectors.length === chunks.length) {
        chunks.forEach((chunk, index) => {
          chunk.embedding = vectors[index] ?? null;
        });
      }
    }
    const queryVectors = await provider.embed([question]);
    const embedding = queryVectors?.[0] ?? null;
    return {
      embedding,
      detail: embedding ? "embedded the question" : "embedder returned nothing",
    };
  } catch (err) {
    if (err instanceof QuotaExceededError) throw err;
    return { embedding: null, detail: "skipped: embedder failed" };
  }
}

export async function answerQuestion(input: AnswerInput) {
  const started = Date.now();
  const locale: Locale = input.locale ?? "en";
  const topK = input.topK ?? 4;
  const provider = input.provider ?? getModelProvider();
  const requestId = randomUUID();
  const trace: TraceStep[] = [
    { step: "provider", ms: 0, detail: provider.id },
  ];

  let collection: Collection = input.collection ?? "handbook";
  let pool: IndexedChunk[];
  const indexStarted = Date.now();
  if (input.sessionId) {
    const session = getSession(input.sessionId);
    if (!session) throw new SessionExpiredError();
    pool = session.chunks;
    collection = "upload";
    trace.push({
      step: "index",
      ms: Date.now() - indexStarted,
      detail: `${pool.length} uploaded chunks`,
    });
  } else {
    pool = await indexedCollection(collection, provider);
    const visible = pool.filter((chunk) => !chunk.lang || chunk.lang === locale);
    pool = visible.length > 0 ? visible : pool;
    trace.push({
      step: "index",
      ms: Date.now() - indexStarted,
      detail: `${pool.length} chunks, context ${pool[0]?.contextSource ?? "none"}`,
    });
  }

  const keywordStarted = Date.now();
  const embedded = await embedQuery(provider, pool, input.question);
  const ranked = hybridRank({
    query: input.question,
    chunks: pool,
    queryEmbedding: embedded.embedding,
    topK,
    field: "indexText",
  });
  trace.push({
    step: "keyword",
    ms: Date.now() - keywordStarted,
    detail: `${ranked.keyword.length} hits`,
    hits: hits(ranked.keyword),
  });
  trace.push({
    step: "vector",
    ms: 0,
    detail: embedded.detail,
    hits: hits(ranked.vector),
  });
  trace.push({
    step: "fuse",
    ms: 0,
    detail: ranked.vector.length > 0 ? "reciprocal rank fusion k=60" : "keyword only",
    hits: hits(ranked.fused),
  });

  const byId = new Map(pool.map((chunk) => [chunk.id, chunk]));
  const passages: PassageRef[] = ranked.fused.flatMap((hit) => {
    const chunk = byId.get(hit.id);
    if (!chunk) return [];
    return [
      {
        id: chunk.id,
        source: chunk.source,
        title: chunk.title,
        text: chunk.text,
        score: round(hit.score),
        headingPath: chunk.headingPath,
      },
    ];
  });

  const draftStarted = Date.now();
  let answerText = "";
  let generation: "mock" | "primary" | "fallback" | "deterministic" | "caller-draft" = "deterministic";
  let model: string | null = null;
  const supplied = input.draft?.trim();
  if (supplied) {
    answerText = supplied;
    generation = "caller-draft";
  } else {
    try {
      const result = await provider.generate({
        purpose: "draft",
        locale,
        question: input.question,
        passages: passages.map((passage) => ({
          id: passage.id,
          title: passage.title,
          text: passage.text,
        })),
      });
      answerText = result.text.trim();
      generation = result.via;
      model = result.model;
      if (!answerText) {
        answerText = extractiveDraft(input.question, passages, locale);
        generation = "deterministic";
        model = null;
      }
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      answerText = extractiveDraft(input.question, passages, locale);
      generation = "deterministic";
    }
  }
  trace.push({ step: "draft", ms: Date.now() - draftStarted, detail: generation });

  const claimStarted = Date.now();
  const sentences = checkClaims(answerText, passages);
  const supportedCount = sentences.filter((sentence) => sentence.match === "supported").length;
  const flaggedCount = sentences.reduce((sum, sentence) => sum + sentence.flaggedConditions.length, 0);
  trace.push({
    step: "claims",
    ms: Date.now() - claimStarted,
    detail: `${supportedCount} supported, ${flaggedCount} flagged`,
  });

  const audit = recordAnswerAudit({
    requestId,
    kind: "answer",
    provider: provider.id,
    generation,
    locale,
    collection,
    questionChars: input.question.length,
    sentenceCount: sentences.length,
    supportedCount,
    flaggedCount,
    ms: Date.now() - started,
  });
  console.info(
    JSON.stringify({
      citebot_answer: true,
      requestId,
      provider: provider.id,
      generation,
      ms: Date.now() - started,
      sentenceCount: sentences.length,
    }),
  );

  return {
    requestId,
    provider: provider.id,
    generation,
    model,
    locale,
    collection,
    sentences,
    trace,
    auditId: audit.id,
  };
}
