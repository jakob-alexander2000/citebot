import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = "gemini-3.6-flash";

const EMBED_BATCH_SIZE = 16;

export function getGemini(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing GEMINI_API_KEY. Copy .env.example to .env.local and add your Google AI Studio key.",
    );
  }
  return new GoogleGenerativeAI(key);
}

export async function embedTexts(
  texts: string[],
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getGemini();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const result = await model.batchEmbedContents({
      requests: batch.map((text) => ({
        content: { role: "user", parts: [{ text }] },
        taskType,
      })),
    });
    for (const emb of result.embeddings) {
      out.push(emb.values);
    }
  }

  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
