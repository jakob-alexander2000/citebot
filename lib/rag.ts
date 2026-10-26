import { CHAT_MODEL, getOpenAI } from "./embeddings";
import { retrieve } from "./vector-store";
import type { ChatResponse } from "./types";

export async function answerWithCitations(
  question: string,
): Promise<ChatResponse> {
  const citations = await retrieve(question, 4);
  const client = getOpenAI();

  const context = citations
    .map(
      (c, i) =>
        `[${i + 1}] id=${c.id} source=${c.source} title=${c.title}\n${c.snippet}`,
    )
    .join("\n\n");

  const completion = await client.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are CiteBot, a concise assistant for the Nordlicht Labs employee handbook.
Answer only from the provided context. If the context is insufficient, say you do not have that in the handbook.
Cite sources inline using [n] markers that match the context numbers.
Keep answers short (2–6 sentences) unless the user asks for detail.`,
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${context || "(no retrieved passages)"}`,
      },
    ],
  });

  const answer =
    completion.choices[0]?.message?.content?.trim() ||
    "I could not generate an answer.";

  return { answer, citations };
}
