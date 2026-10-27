import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export async function generateMetadata() {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: `How to run · ${brand.name}`,
    description: "How to run the CiteBot onboard path.",
  };
}

export default async function OnboardRunPage() {
  const { locale, source } = await getLocaleState();
  const markdown = fs.readFileSync(path.join(process.cwd(), "docs/onboard.md"), "utf8");

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="onboard" locale={locale} source={source} />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <Markdown content={markdown} />
        <p className="mt-10 text-sm">
          <Link
            href="/onboard"
            className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
          >
            Open onboard
          </Link>
          <span className="text-zinc-400"> · </span>
          <Link
            href="/onboard/walkthrough"
            className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
          >
            Walkthrough
          </Link>
        </p>
      </article>
    </main>
  );
}
