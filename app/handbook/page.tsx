import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { HandbookBrowser } from "@/components/HandbookBrowser";
import { listHandbookDocs } from "@/lib/docs";

async function HandbookContent() {
  const docs = (await listHandbookDocs()).map((d) => ({
    slug: d.slug,
    filename: d.filename,
    title: d.title,
    summary: d.summary,
    content: d.content,
    format: d.format,
  }));
  return <HandbookBrowser docs={docs} />;
}

export default function HandbookPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="handbook" />
      <Suspense
        fallback={
          <p className="mx-auto w-full max-w-5xl px-4 py-12 text-sm text-zinc-500 sm:px-6">
            Loading handbook…
          </p>
        }
      >
        <HandbookContent />
      </Suspense>
    </main>
  );
}
