import fs from "node:fs";
import path from "node:path";

const CORPUS_DIR = path.join(process.cwd(), "corpus");

export type HandbookDoc = {
  slug: string;
  filename: string;
  title: string;
  summary: string;
  content: string;
};

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
  if (!fs.existsSync(CORPUS_DIR)) return [];
  const files = fs
    .readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith(".md"));

  const docs = files.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const content = fs.readFileSync(path.join(CORPUS_DIR, filename), "utf8");
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
