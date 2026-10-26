import fs from "node:fs";
import path from "node:path";
import type { Chunk } from "./types";
import { extractPdfText, titleFromPlainText } from "./pdf";

const TARGET_CHARS = 700;
const CORPUS_EXTS = [".md", ".pdf"] as const;

function corpusDir(): string {
  // Relative to project root only (e.g. corpus or client-docs).
  const rel = process.env.CORPUS_DIR?.trim() || "corpus";
  return path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
}

function isCorpusFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === "readme.md" || lower.startsWith("readme.")) return false;
  return CORPUS_EXTS.some((ext) => lower.endsWith(ext));
}

function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function splitIntoChunks(source: string, title: string, content: string): Chunk[] {
  // Prefer markdown ## sections; plain PDF text falls through as one/few chunks.
  const sections = content.includes("\n## ")
    ? content
        .split(/\n(?=##\s)/)
        .map((s) => s.trim())
        .filter(Boolean)
    : content
        .split(/\n{2,}/)
        .reduce<string[]>((acc, para) => {
          const p = para.trim();
          if (!p) return acc;
          const last = acc[acc.length - 1];
          if (last && (last + "\n\n" + p).length <= TARGET_CHARS) {
            acc[acc.length - 1] = `${last}\n\n${p}`;
          } else if (p.length <= TARGET_CHARS) {
            acc.push(p);
          } else {
            // Hard-wrap long paragraphs
            for (let i = 0; i < p.length; i += TARGET_CHARS) {
              acc.push(p.slice(i, i + TARGET_CHARS).trim());
            }
          }
          return acc;
        }, []);

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

  const stem = source.replace(/\.(md|pdf)$/i, "");
  return pieces.map((text, index) => ({
    id: `${stem}-${index + 1}`,
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
    .filter((f) => isCorpusFile(f) && !f.startsWith("."))
    .sort();
}

async function readCorpusDocument(
  file: string,
): Promise<{ title: string; content: string } | null> {
  const dir = corpusDir();
  const full = path.join(dir, file);
  const lower = file.toLowerCase();

  if (lower.endsWith(".md")) {
    const content = fs.readFileSync(full, "utf8");
    return {
      title: titleFromMarkdown(content, file),
      content,
    };
  }

  if (lower.endsWith(".pdf")) {
    const data = new Uint8Array(fs.readFileSync(full));
    const content = await extractPdfText(data);
    if (!content) return null;
    return {
      title: titleFromPlainText(content, file.replace(/\.pdf$/i, "")),
      content,
    };
  }

  return null;
}

export async function loadCorpusChunks(): Promise<Chunk[]> {
  const files = listCorpusFiles();
  const chunks: Chunk[] = [];
  for (const file of files) {
    const doc = await readCorpusDocument(file);
    if (!doc) continue;
    chunks.push(...splitIntoChunks(file, doc.title, doc.content));
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
