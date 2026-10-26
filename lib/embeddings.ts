import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const CHAT_MODEL = "gpt-4o-mini";

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing OPENAI_API_KEY. Copy .env.example to .env.local and add your key.",
    );
  }
  return new OpenAI({ apiKey: key });
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
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
