import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extract plain text from a PDF buffer (Node + Vercel serverless via unpdf).
 */
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n\n") : String(text ?? "");
  return joined.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

/** First non-empty line as a title fallback for PDFs without markdown headings. */
export function titleFromPlainText(content: string, fallback: string): string {
  const line = content
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return fallback;
  return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}
