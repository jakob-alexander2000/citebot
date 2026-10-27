import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { DEMO_QUESTIONS } from "@/lib/demo-questions";
import { ui } from "@/lib/messages";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export default async function Home() {
  const { locale, source } = await getLocaleState();
  const brand = getBrand(locale);
  const copy = ui(locale);
  const questions = DEMO_QUESTIONS[locale];

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="home" locale={locale} source={source} />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          {brand.org} · {brand.corpusLabel}
        </p>
        <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
          {brand.name}
        </h1>
        <p className="mt-3 font-serif text-xl leading-snug text-zinc-800 dark:text-zinc-100">
          {brand.tagline}
          <br />
          {brand.taglineLine2}
        </p>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {copy.homeLead}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/ask"
            className="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            {copy.homeAsk} →
          </Link>
          <Link
            href="/harness"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {copy.homeHarness}
          </Link>
          <Link
            href="/handbook"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {copy.homeHandbook}
          </Link>
        </div>

        <section className="mt-12 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            {copy.homeVerifyTitle}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {copy.homeVerifyBody}
          </p>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            <Link
              href="/harness"
              className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
            >
              {copy.homeHarnessLink}
            </Link>
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            {copy.homeTryTitle}
          </h2>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {questions.map((item) => (
              <li key={item.question}>{item.question}</li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
