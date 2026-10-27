import { runAgentLoop } from "./agent";
import { loadCorpusChunks } from "./corpus";
import type { Locale } from "./locale";
import { generateWithFallback } from "./llm";
import { localOnboardGenerate, localPassageVerify } from "./onboard-local";
import { loadOnboardChunks, type OnboardConfig } from "./onboard";
import { lexicalSearch } from "./tools";
import type { ChatResponse } from "./types";
import { ensureIndex, retrieve } from "./vector-store";
import { verifyAnswer } from "./verify";

function clipDetail(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

function noteFallback(response: ChatResponse, locale: Locale): void {
  const draft = response.steps.find((step) => step.kind === "draft");
  if (!draft) return;
  const via = locale === "de" ? "über OpenAI-Fallback" : "via OpenAI fallback";
  draft.detail = clipDetail(`${draft.detail} · ${via}`);
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

  if (usedFallback) noteFallback(response, locale);

  return response;
}

/**
 * Same loop and verify as `answerWithCitations`, scoped to the onboard
 * document packet and the tools that packet left on. Retrieval stays lexical
 * over those pages so the product embedding index is left alone.
 */
export async function answerOnboard(
  question: string,
  config: OnboardConfig,
): Promise<ChatResponse> {
  const chunks = await loadOnboardChunks(config);
  const local = !process.env.GEMINI_API_KEY?.trim();

  if (local) {
    const response = await runAgentLoop({
      question,
      chunks,
      generate: localOnboardGenerate(question, config.enabledTools),
      search: async (query, topK = 4) => lexicalSearch(chunks, query, topK),
      verify: async (_question, answer, citations) => localPassageVerify(answer, citations),
      locale: "en",
      enabledTools: config.enabledTools,
      instructions: config.systemPrompt,
    });
    const draft = response.steps.find((step) => step.kind === "draft");
    if (draft) draft.detail = clipDetail(`${draft.detail} · local passage check`, 240);
    return response;
  }

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
    search: async (query, topK = 4) => lexicalSearch(chunks, query, topK),
    verify: (q, answer, citations) => verifyAnswer(q, answer, citations, "en"),
    locale: "en",
    enabledTools: config.enabledTools,
    instructions: config.systemPrompt,
  });

  if (usedFallback) noteFallback(response, "en");
  return response;
}
