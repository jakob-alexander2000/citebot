import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { WALKTHROUGH } from "@/lib/onboard-copy";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export async function generateMetadata() {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: `Walkthrough · ${brand.name}`,
    description: "English and German script for the CiteBot onboard path.",
  };
}

export default async function OnboardWalkthroughPage() {
  const { locale, source } = await getLocaleState();
  const brand = getBrand(locale);

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="onboard" locale={locale} source={source} />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Walkthrough
        </p>
        <h1 className="mt-3 text-[2rem] font-medium leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
          Two scripts, one English page
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          CiteBot does not switch the interface to German. The second script is for reading with
          a German-speaking client while the page stays in English.
        </p>
        {brand.skin === "craft" ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            <Link
              href="/onboard?preset=en"
              className="underline decoration-zinc-300 underline-offset-4"
            >
              English pages
            </Link>
            <span className="text-zinc-400"> · </span>
            <Link
              href="/onboard?preset=de-gap"
              className="underline decoration-zinc-300 underline-offset-4"
            >
              German question, English pages
            </Link>
            <span className="text-zinc-400"> · </span>
            <Link
              href="/onboard?preset=de-docs"
              className="underline decoration-zinc-300 underline-offset-4"
            >
              German pages
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            The links that load a packet are on the CiteBot skin. This deploy keeps its handbook
            Q&amp;A.
          </p>
        )}

        {WALKTHROUGH.map((script) => (
          <section key={script.id} className="mt-12" lang={script.id}>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              {script.kicker}
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
              {script.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              {script.lead}
            </p>
            <ol className="mt-6 space-y-5">
              {script.steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {step.title}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <p className="mt-12 text-sm">
          <Link
            href="/onboard/run"
            className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
          >
            How to run
          </Link>
        </p>
      </article>
    </main>
  );
}
