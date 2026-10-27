import { runAgentLoop } from "./agent";
import { loadCorpusChunks } from "./corpus";
import type { Locale } from "./locale";
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
  locale: Locale = "en",
): Promise<ChatResponse> {
  const chunksPromise = loadCorpusChunks({ locale });
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
      return retrieve(query, topK, locale);
    },
    verify: (q, answer, citations) => verifyAnswer(q, answer, citations, locale),
    locale,
  });

  if (usedFallback) {
    const draft = response.steps.find((step) => step.kind === "draft");
    if (draft) {
      const via = locale === "de" ? "über OpenAI-Fallback" : "via OpenAI fallback";
      draft.detail = clipDetail(`${draft.detail} · ${via}`);
    }
  }

  return response;
}
