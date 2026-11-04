import { extractText, getDocumentProxy } from "unpdf";
import { MAX_UPLOAD_PAGES } from "./models";
import { chunkPlainText } from "./documents";
import type { RawChunk } from "./types";

export function isPdfBytes(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 1024))).toString("latin1");
  return head.includes("%PDF-");
}

export class PdfRejected extends Error {
  constructor(
    readonly status: number,
    readonly code: "not_pdf" | "too_large" | "too_many_pages" | "empty_pdf",
    message: string,
  ) {
    super(message);
    this.name = "PdfRejected";
  }
}

export async function chunksFromPdf(bytes: Uint8Array, idPrefix: string): Promise<{
  pageCount: number;
  chunks: RawChunk[];
  parseMs: number;
}> {
  const started = Date.now();
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch {
    throw new PdfRejected(415, "not_pdf", "The file is not a readable PDF.");
  }
  const pageCount = pdf.numPages;
  if (pageCount > MAX_UPLOAD_PAGES) {
    throw new PdfRejected(
      422,
      "too_many_pages",
      `A PDF can have at most ${MAX_UPLOAD_PAGES} pages.`,
    );
  }
  let pages: string[] = [];
  try {
    const extracted = await extractText(pdf, { mergePages: false });
    const text = extracted.text;
    pages = Array.isArray(text) ? text.map((page) => String(page ?? "")) : [String(text ?? "")];
  } catch {
    throw new PdfRejected(415, "not_pdf", "The file is not a readable PDF.");
  }
  const titleLine = pages
    .join("\n")
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const title = titleLine ? titleLine.slice(0, 80) : "Uploaded document";
  const chunks: RawChunk[] = [];
  pages.forEach((page, index) => {
    const text = page.replace(/\s+/g, " ").trim();
    if (!text) return;
    chunks.push(
      ...chunkPlainText({
        text,
        title,
        source: "upload",
        idPrefix,
        page: index + 1,
      }),
    );
  });
  if (chunks.length === 0) {
    throw new PdfRejected(422, "empty_pdf", "The PDF has no text to index.");
  }
  return { pageCount, chunks, parseMs: Date.now() - started };
}
