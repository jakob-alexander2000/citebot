import { SiteHeader } from "@/components/SiteHeader";
import { HandbookBrowser } from "@/components/HandbookBrowser";
import { listHandbookDocs } from "@/lib/docs";

export default function HandbookPage() {
  const docs = listHandbookDocs().map((d) => ({
    slug: d.slug,
    filename: d.filename,
    title: d.title,
    summary: d.summary,
    content: d.content,
  }));

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="handbook" />
      <HandbookBrowser docs={docs} />
    </main>
  );
}
