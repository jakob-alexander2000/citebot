import fs from "node:fs";
import path from "node:path";
import { isLocale, type Locale } from "./locale";
import type { Chunk } from "./types";
import { extractPdfText, titleFromPlainText } from "./pdf";

const TARGET_CHARS = 700;
const CORPUS_EXTS = [".md", ".pdf"] as const;

const DEFAULT_CORPUS = "examples/nordlicht-corpus";

function corpusDir(): string {
  // Relative to project root only.
  // The default path stays statically joinable for file tracing;
  // CORPUS_DIR overrides use turbopackIgnore (pair with outputFileTracingIncludes).
  const rel = process.env.CORPUS_DIR?.trim();
  if (rel) {
    return path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
  }
  return path.join(process.cwd(), DEFAULT_CORPUS);
}

export function corpusRoot(dir?: string): string {
  if (!dir) return corpusDir();
  return path.isAbsolute(dir)
    ? dir
    : path.join(/*turbopackIgnore: true*/ process.cwd(), dir);
}

export type CorpusEntry = {
  /** Path relative to the corpus root, using `/` separators. */
  relativePath: string;
  absolutePath: string;
  /** `de` or `en` when the file sits in that language folder. */
  lang?: Locale;
};

export type LoadCorpusOptions = {
  /** Absolute or project-relative corpus root. Defaults to CORPUS_DIR or the sample handbook. */
  dir?: string;
  /**
   * Keep language-neutral files plus this language.
   * Files tagged with the other language are omitted.
   */
  locale?: Locale;
};

function isCorpusFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === "readme.md" || lower.startsWith("readme.")) return false;
  return CORPUS_EXTS.some((ext) => lower.endsWith(ext));
}

function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function splitIntoChunks(
  source: string,
  title: string,
  content: string,
  lang?: Locale,
): Chunk[] {
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

  const stem = source.replace(/\.(md|pdf)$/i, "").replace(/[\\/]/g, "-");
  return pieces.map((text, index) => ({
    id: `${stem}-${index + 1}`,
    source,
    title,
    text,
    ...(lang ? { lang } : {}),
  }));
}

/** Root files, plus one level inside `de/` and `en/`. README files are skipped. */
export function listCorpusEntries(root = corpusDir()): CorpusEntry[] {
  if (!fs.existsSync(/*turbopackIgnore: true*/ root)) return [];
  const entries: CorpusEntry[] = [];

  const consider = (absolutePath: string, relativePath: string) => {
    const filename = path.basename(relativePath);
    if (filename.startsWith(".") || !isCorpusFile(filename)) return;
    const top = relativePath.split("/")[0] ?? "";
    const lang = relativePath.includes("/") && isLocale(top) ? top : undefined;
    entries.push({ relativePath, absolutePath, lang });
  };

  for (const name of fs.readdirSync(/*turbopackIgnore: true*/ root)) {
    if (name.startsWith(".")) continue;
    const absolute = path.join(/*turbopackIgnore: true*/ root, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(/*turbopackIgnore: true*/ absolute);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!isLocale(name)) continue;
      for (const child of fs.readdirSync(/*turbopackIgnore: true*/ absolute)) {
        if (child.startsWith(".")) continue;
        const childAbs = path.join(/*turbopackIgnore: true*/ absolute, child);
        let childStat: fs.Stats;
        try {
          childStat = fs.statSync(/*turbopackIgnore: true*/ childAbs);
        } catch {
          continue;
        }
        if (!childStat.isFile()) continue;
        consider(childAbs, `${name}/${child}`);
      }
      continue;
    }
    if (stat.isFile()) consider(absolute, name);
  }

  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return entries;
}

function matchesLocale(lang: Locale | undefined, locale: Locale | undefined): boolean {
  if (!locale || !lang) return true;
  return lang === locale;
}

async function readCorpusDocument(
  absolutePath: string,
  relativePath: string,
): Promise<{ title: string; content: string } | null> {
  const lower = relativePath.toLowerCase();
  const filename = path.basename(relativePath);

  if (lower.endsWith(".md")) {
    const content = fs.readFileSync(absolutePath, "utf8");
    return {
      title: titleFromMarkdown(content, filename),
      content,
    };
  }

  if (lower.endsWith(".pdf")) {
    const data = new Uint8Array(fs.readFileSync(absolutePath));
    const content = await extractPdfText(data);
    if (!content) return null;
    return {
      title: titleFromPlainText(content, filename.replace(/\.pdf$/i, "")),
      content,
    };
  }

  return null;
}

export async function loadCorpusChunks(options?: LoadCorpusOptions): Promise<Chunk[]> {
  const root = corpusRoot(options?.dir);
  const chunks: Chunk[] = [];
  for (const entry of listCorpusEntries(root)) {
    if (!matchesLocale(entry.lang, options?.locale)) continue;
    const doc = await readCorpusDocument(entry.absolutePath, entry.relativePath);
    if (!doc) continue;
    chunks.push(
      ...splitIntoChunks(entry.relativePath, doc.title, doc.content, entry.lang),
    );
  }
  return chunks;
}

export function corpusFingerprint(): string {
  const dir = corpusDir();
  const parts = listCorpusEntries(dir).map((entry) => {
    const stat = fs.statSync(entry.absolutePath);
    return `${entry.relativePath}:${stat.size}:${stat.mtimeMs}`;
  });
  return `${dir}|${parts.join("|")}`;
}
