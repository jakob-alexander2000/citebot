import { CHAT_MODEL, getGemini } from "./embeddings";
import { retrieve } from "./vector-store";
import { verifyAnswer } from "./verify";
import type { ChatResponse } from "./types";

export async function answerWithCitations(
  question: string,
): Promise<ChatResponse> {
  const citations = await retrieve(question, 4);
  const client = getGemini();
  const model = client.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: { temperature: 0.2 },
  });

  const context = citations
    .map(
      (c, i) =>
        `[${i + 1}] id=${c.id} source=${c.source} title=${c.title}\n${c.snippet}`,
    )
    .join("\n\n");

  const prompt = `You are CiteBot, a concise assistant for the Nordlicht Labs employee handbook.
Answer only from the provided context. If the context is insufficient, say you do not have that in the handbook.
Cite sources inline using [n] markers that match the context numbers.
Keep answers short (2–6 sentences) unless the user asks for detail.

Question: ${question}

Context:
${context || "(no retrieved passages)"}`;

  const result = await model.generateContent(prompt);
  const answer =
    result.response.text()?.trim() || "I could not generate an answer.";

  const verification = await verifyAnswer(question, answer, citations);

  return { answer, citations, verification };
}
