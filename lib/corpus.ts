import fs from "node:fs";
import path from "node:path";
import type { Chunk } from "./types";

const TARGET_CHARS = 700;

function corpusDir(): string {
  // Relative to project root only (e.g. corpus or client-docs). PDF ingest = next.
  const rel = process.env.CORPUS_DIR?.trim() || "corpus";
  return path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
}

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
  const dir = corpusDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

export function loadCorpusChunks(): Chunk[] {
  const dir = corpusDir();
  const files = listCorpusFiles();
  const chunks: Chunk[] = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const content = fs.readFileSync(full, "utf8");
    const title = titleFromMarkdown(content, file);
    chunks.push(...splitIntoChunks(file, title, content));
  }
  return chunks;
}

export function corpusFingerprint(): string {
  const dir = corpusDir();
  const files = listCorpusFiles();
  const parts = files.map((file) => {
    const stat = fs.statSync(path.join(dir, file));
    return `${file}:${stat.size}:${stat.mtimeMs}`;
  });
  return `${dir}|${parts.join("|")}`;
}
