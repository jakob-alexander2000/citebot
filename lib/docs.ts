import fs from "node:fs";
import path from "node:path";
import { corpusRoot, listCorpusEntries } from "./corpus";
import type { Locale } from "./locale";
import { extractPdfText, titleFromPlainText } from "./pdf";

export type HandbookDoc = {
  slug: string;
  filename: string;
  title: string;
  summary: string;
  content: string;
  /** Source format for UI badges. */
  format: "md" | "pdf";
  lang?: Locale;
};

/** Topic order for the sample employee handbook. */
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

export type ListHandbookOptions = {
  dir?: string;
  locale?: Locale;
};

export async function listHandbookDocs(
  options?: ListHandbookOptions,
): Promise<HandbookDoc[]> {
  const root = corpusRoot(options?.dir);
  const docs: HandbookDoc[] = [];

  for (const entry of listCorpusEntries(root)) {
    if (options?.locale && entry.lang && entry.lang !== options.locale) continue;
    const lower = entry.relativePath.toLowerCase();
    const slug = entry.relativePath.replace(/\.(md|pdf)$/i, "");
    const filename = entry.relativePath;

    if (lower.endsWith(".md")) {
      const content = fs.readFileSync(entry.absolutePath, "utf8");
      docs.push({
        slug,
        filename,
        title: titleFromMarkdown(content, path.basename(slug)),
        summary: summaryFromText(content),
        content,
        format: "md",
        lang: entry.lang,
      });
      continue;
    }

    const data = new Uint8Array(fs.readFileSync(entry.absolutePath));
    const content = await extractPdfText(data);
    if (!content) continue;
    docs.push({
      slug,
      filename,
      title: titleFromPlainText(content, path.basename(slug)),
      summary: summaryFromText(content),
      content,
      format: "pdf",
      lang: entry.lang,
    });
  }

  docs.sort((a, b) => {
    const aBase = path.basename(a.slug);
    const bBase = path.basename(b.slug);
    const ai = ORDER.indexOf(aBase as (typeof ORDER)[number]);
    const bi = ORDER.indexOf(bBase as (typeof ORDER)[number]);
    const ao = ai === -1 ? 999 : ai;
    const bo = bi === -1 ? 999 : bi;
    return ao - bo || a.slug.localeCompare(b.slug);
  });

  return docs;
}

export async function getHandbookDoc(
  slug: string,
  options?: ListHandbookOptions,
): Promise<HandbookDoc | null> {
  const docs = await listHandbookDocs(options);
  return docs.find((d) => d.slug === slug) ?? null;
}
