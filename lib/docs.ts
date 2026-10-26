import fs from "node:fs";
import path from "node:path";
import { extractPdfText, titleFromPlainText } from "./pdf";

function corpusDir(): string {
  // Relative to project root only (e.g. corpus or client-docs).
  const rel = process.env.CORPUS_DIR?.trim() || "corpus";
  return path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
}

export type HandbookDoc = {
  slug: string;
  filename: string;
  title: string;
  summary: string;
  content: string;
  /** Source format for UI badges. */
  format: "md" | "pdf";
};

/** Preferred order for the sample Nordlicht corpus; unknown files sort after. */
const ORDER = [
  "welcome",
  "pto-and-leave",
  "expense-policy",
  "tools-and-security",
  "remote-work-policy",
  "demo-day",
] as const;

function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function summaryFromText(content: string): string {
  const withoutTitle = content.replace(/^#\s+.+$/m, "").trim();
  const firstPara = withoutTitle
    .split(/\n{2,}/)
    .map((p) => p.replace(/^##\s+.+$/m, "").replace(/\n/g, " ").trim())
    .find((p) => p.length > 0);
  if (!firstPara) return "";
  return firstPara.length > 140 ? `${firstPara.slice(0, 137)}…` : firstPara;
}

function isCorpusFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === "readme.md" || lower.startsWith("readme.")) return false;
  return lower.endsWith(".md") || lower.endsWith(".pdf");
}

export async function listHandbookDocs(): Promise<HandbookDoc[]> {
  const dir = corpusDir();
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => isCorpusFile(f) && !f.startsWith("."));

  const docs: HandbookDoc[] = [];
  for (const filename of files) {
    const lower = filename.toLowerCase();
    const slug = filename.replace(/\.(md|pdf)$/i, "");
    const full = path.join(dir, filename);

    if (lower.endsWith(".md")) {
      const content = fs.readFileSync(full, "utf8");
      docs.push({
        slug,
        filename,
        title: titleFromMarkdown(content, slug),
        summary: summaryFromText(content),
        content,
        format: "md",
      });
      continue;
    }

    const data = new Uint8Array(fs.readFileSync(full));
    const content = await extractPdfText(data);
    if (!content) continue;
    docs.push({
      slug,
      filename,
      title: titleFromPlainText(content, slug),
      summary: summaryFromText(content),
      content,
      format: "pdf",
    });
  }

  docs.sort((a, b) => {
    const ai = ORDER.indexOf(a.slug as (typeof ORDER)[number]);
    const bi = ORDER.indexOf(b.slug as (typeof ORDER)[number]);
    const ao = ai === -1 ? 999 : ai;
    const bo = bi === -1 ? 999 : bi;
    return ao - bo || a.slug.localeCompare(b.slug);
  });

  return docs;
}

export async function getHandbookDoc(slug: string): Promise<HandbookDoc | null> {
  const docs = await listHandbookDocs();
  return docs.find((d) => d.slug === slug) ?? null;
}
