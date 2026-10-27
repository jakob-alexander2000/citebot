import { runAgentLoop } from "./agent";
import { loadCorpusChunks } from "./corpus";
import { CHAT_MODEL, getGemini } from "./embeddings";
import type { ChatResponse } from "./types";
import { ensureIndex, retrieve } from "./vector-store";
import { verifyAnswer } from "./verify";

async function geminiGenerate(prompt: string): Promise<string> {
  const client = getGemini();
  const model = client.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text()?.trim() ?? "";
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

  return runAgentLoop({
    question,
    chunks,
    generate: geminiGenerate,
    search: async (query, topK = 4) => {
      const failure = await warmIndex;
      if (failure) throw failure;
      return retrieve(query, topK);
    },
    verify: verifyAnswer,
  });
}
