import { runAgentLoop } from "./agent";
import { loadCorpusChunks } from "./corpus";
import { generateWithFallback } from "./llm";
import type { ChatResponse } from "./types";
import { ensureIndex, retrieve } from "./vector-store";
import { verifyAnswer } from "./verify";

function clipDetail(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Ask path: capped handbook tool loop, then the shared verify harness.
 * Index warm-up starts immediately and overlaps the first model turn.
 * A failure is held on the promise so it is not an unhandled rejection
 * when the model never searches.
 */
export async function answerWithCitations(
  question: string,
): Promise<ChatResponse> {
  const chunksPromise = loadCorpusChunks();
  const warmIndex: Promise<unknown> = ensureIndex().then(
    () => undefined,
    (err: unknown) => err,
  );
  const chunks = await chunksPromise;

  let usedFallback = false;
  const generate = async (prompt: string): Promise<string> => {
    const result = await generateWithFallback({
      prompt,
      json: true,
      temperature: 0.2,
    });
    if (result.viaFallback) usedFallback = true;
    return result.text;
  };

  const response = await runAgentLoop({
    question,
    chunks,
    generate,
    search: async (query, topK = 4) => {
      const failure = await warmIndex;
      if (failure) throw failure;
      return retrieve(query, topK);
    },
    verify: verifyAnswer,
  });

  if (usedFallback) {
    const draft = response.steps.find((step) => step.kind === "draft");
    if (draft) {
      draft.detail = clipDetail(`${draft.detail} · via OpenAI fallback`);
    }
  }

  return response;
}
