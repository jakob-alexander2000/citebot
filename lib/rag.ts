import { answerQuestion } from "./core/answer";
import { chatResponseFromCore } from "./core/chat-bridge";
import type { Locale } from "./locale";
import type { ChatResponse } from "./types";

/** Handbook ask path. Uses the shared model provider, never a separate vendor. */
export async function answerWithCitations(
  question: string,
  locale: Locale = "en",
): Promise<ChatResponse> {
  const result = await answerQuestion({ question, locale, collection: "handbook" });
  return chatResponseFromCore(result);
}
