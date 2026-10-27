import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { HandbookBrowser } from "@/components/HandbookBrowser";
import { listHandbookDocs } from "@/lib/docs";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/messages";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

async function HandbookContent({ locale }: { locale: Locale }) {
  const docs = (await listHandbookDocs({ locale })).map((d) => ({
    slug: d.slug,
    filename: d.filename,
    title: d.title,
    summary: d.summary,
    content: d.content,
    format: d.format,
  }));
  return <HandbookBrowser docs={docs} locale={locale} />;
}

export default async function HandbookPage() {
  const { locale, source } = await getLocaleState();
  const copy = ui(locale);
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="handbook" locale={locale} source={source} />
      <Suspense
        fallback={
          <p className="mx-auto w-full max-w-5xl px-4 py-12 text-sm text-zinc-500 sm:px-6">
            {copy.loadingHandbook}
          </p>
        }
      >
        <HandbookContent locale={locale} />
      </Suspense>
    </main>
  );
}
