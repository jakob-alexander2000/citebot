import fs from "node:fs";
import path from "node:path";

function corpusDir(): string {
  // Relative to project root only (e.g. corpus or client-docs). PDF ingest = next.
  const rel = process.env.CORPUS_DIR?.trim() || "corpus";
  return path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
}

export type HandbookDoc = {
  slug: string;
  filename: string;
  title: string;
  summary: string;
  content: string;
};

/** Preferred order for the sample Nordlicht corpus; unknown files sort after. */
const ORDER = [
  "welcome",
  "pto-and-leave",
  "expense-policy",
  "tools-and-security",
  "demo-day",
] as const;

function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function summaryFromMarkdown(content: string): string {
  const withoutTitle = content.replace(/^#\s+.+$/m, "").trim();
  const firstPara = withoutTitle
    .split(/\n{2,}/)
    .map((p) => p.replace(/^##\s+.+$/m, "").replace(/\n/g, " ").trim())
    .find((p) => p.length > 0);
  if (!firstPara) return "";
  return firstPara.length > 140 ? `${firstPara.slice(0, 137)}…` : firstPara;
}

export function listHandbookDocs(): HandbookDoc[] {
  const dir = corpusDir();
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"));

  const docs = files.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const content = fs.readFileSync(path.join(dir, filename), "utf8");
    return {
      slug,
      filename,
      title: titleFromMarkdown(content, slug),
      summary: summaryFromMarkdown(content),
      content,
    };
  });

  docs.sort((a, b) => {
    const ai = ORDER.indexOf(a.slug as (typeof ORDER)[number]);
    const bi = ORDER.indexOf(b.slug as (typeof ORDER)[number]);
    const ao = ai === -1 ? 999 : ai;
    const bo = bi === -1 ? 999 : bi;
    return ao - bo || a.slug.localeCompare(b.slug);
  });

  return docs;
}

export function getHandbookDoc(slug: string): HandbookDoc | null {
  return listHandbookDocs().find((d) => d.slug === slug) ?? null;
}
