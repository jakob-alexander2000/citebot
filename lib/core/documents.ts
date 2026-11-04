import fs from "node:fs";
import path from "node:path";
import { loadCorpusChunks } from "../corpus";
import type { Locale } from "../locale";
import type { RawChunk } from "./types";

type PhoneSection = { heading?: string[]; text?: string };
type PhoneDoc = {
  locale?: string;
  title?: string;
  source?: string;
  sections?: PhoneSection[];
};

function headingFromChunk(text: string, title: string): string[] {
  const match = text.match(/^#{1,3}\s+(.+)$/m);
  const heading = match?.[1]?.replace(/[*_`]/g, "").trim();
  return heading ? [title, heading] : [title];
}

export async function loadHandbookRaw(): Promise<RawChunk[]> {
  const chunks = await loadCorpusChunks();
  return chunks.map((chunk) => ({
    id: `handbook:${chunk.id}`,
    collection: "handbook",
    source: chunk.source,
    title: chunk.title,
    headingPath: headingFromChunk(chunk.text, chunk.title),
    text: chunk.text,
    lang: chunk.lang,
  }));
}

export function loadPhoneRaw(
  file = path.join(process.cwd(), "examples", "phone-kb", "services.json"),
): RawChunk[] {
  const parsed = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as {
    documents?: PhoneDoc[];
  };
  const docs = parsed.documents ?? [];
  const chunks: RawChunk[] = [];
  for (const doc of docs) {
    const locale: Locale | undefined = doc.locale === "de" || doc.locale === "en" ? doc.locale : undefined;
    const title = doc.title?.trim() || "Phone";
    const source = doc.source?.trim() || title;
    const sections = doc.sections ?? [];
    sections.forEach((section, index) => {
      const text = section.text?.trim() ?? "";
      if (!text) return;
      const heading = (section.heading ?? []).map((part) => part.trim()).filter(Boolean);
      chunks.push({
        id: `phone:${source}:${index + 1}`,
        collection: "phone",
        source,
        title,
        headingPath: heading.length > 0 ? [title, ...heading] : [title],
        text,
        lang: locale,
      });
    });
  }
  return chunks;
}

export function chunkPlainText(input: {
  text: string;
  title: string;
  source: string;
  idPrefix: string;
  page?: number;
}): RawChunk[] {
  const paragraphs = input.text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const pieces: string[] = [];
  let buffer = "";
  for (const paragraph of paragraphs.length > 0 ? paragraphs : [input.text.trim()]) {
    if (!paragraph) continue;
    if ((buffer + "\n\n" + paragraph).trim().length > 700 && buffer) {
      pieces.push(buffer.trim());
      buffer = paragraph;
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    }
  }
  if (buffer.trim()) pieces.push(buffer.trim());
  const heading = input.page ? [input.title, `Page ${input.page}`] : [input.title];
  return pieces.filter(Boolean).map((text, index) => ({
    id: `${input.idPrefix}:${input.page ?? 1}:${index + 1}`,
    collection: "upload" as const,
    source: input.source,
    title: input.title,
    headingPath: heading,
    text,
  }));
}
