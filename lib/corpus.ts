import fs from "node:fs";
import path from "node:path";
import type { Chunk } from "./types";

const CORPUS_DIR = path.join(process.cwd(), "corpus");
const TARGET_CHARS = 700;

function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function splitIntoChunks(source: string, title: string, content: string): Chunk[] {
  const sections = content
    .split(/\n(?=##\s)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const section of sections) {
    if (section.length <= TARGET_CHARS) {
      pieces.push(section);
      continue;
    }
    const paragraphs = section.split(/\n{2,}/);
    let buffer = "";
    for (const p of paragraphs) {
      if ((buffer + "\n\n" + p).trim().length > TARGET_CHARS && buffer) {
        pieces.push(buffer.trim());
        buffer = p;
      } else {
        buffer = buffer ? `${buffer}\n\n${p}` : p;
      }
    }
    if (buffer.trim()) pieces.push(buffer.trim());
  }

  return pieces.map((text, index) => ({
    id: `${source.replace(/\.md$/, "")}-${index + 1}`,
    source,
    title,
    text,
  }));
}

export function listCorpusFiles(): string[] {
  if (!fs.existsSync(CORPUS_DIR)) return [];
  return fs
    .readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

export function loadCorpusChunks(): Chunk[] {
  const files = listCorpusFiles();
  const chunks: Chunk[] = [];
  for (const file of files) {
    const full = path.join(CORPUS_DIR, file);
    const content = fs.readFileSync(full, "utf8");
    const title = titleFromMarkdown(content, file);
    chunks.push(...splitIntoChunks(file, title, content));
  }
  return chunks;
}

export function corpusFingerprint(): string {
  const files = listCorpusFiles();
  const parts = files.map((file) => {
    const stat = fs.statSync(path.join(CORPUS_DIR, file));
    return `${file}:${stat.size}:${stat.mtimeMs}`;
  });
  return parts.join("|");
}
