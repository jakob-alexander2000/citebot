import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { activeDemoQuestions } from "@/lib/demo-questions";
import { ui } from "@/lib/messages";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export default async function Home() {
  const { locale, source } = await getLocaleState();
  const brand = getBrand(locale);
  const copy = ui(locale);
  const questions = activeDemoQuestions();

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="home" locale={locale} source={source} />
      <article className="mx-auto w-full max-w-xl px-4 pb-16 pt-14 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
          {brand.org}
        </p>
        <h1 className="mt-4 font-serif text-[2.6rem] leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
          {brand.tagline}
          <span className="mt-1 block text-[1.35rem] font-normal text-zinc-700 dark:text-zinc-300">
            {brand.taglineLine2}
          </span>
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
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
            className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            {copy.homeHarness}
          </Link>
          <Link
            href="/handbook"
            className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            {copy.homeHandbook}
          </Link>
          <Link
            href="/evals"
            className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Evals
          </Link>
        </div>
        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.homeTryTitle}
          </h2>
          <ul className="flex flex-col gap-2">
            {questions.map((item) => (
              <li
                key={item.question}
                className="rounded-full border border-zinc-200 px-3.5 py-2 text-sm leading-snug text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                {item.question}
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.homeVerifyTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.homeVerifyBody}</p>
          <p className="mt-2 text-[13px]">
            <Link
              href="/harness"
              className="text-zinc-600 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-400 dark:decoration-zinc-600"
            >
              {copy.homeHarnessLink}
            </Link>
            <span className="text-zinc-700 dark:text-zinc-300"> · </span>
            <Link
              href="/evals"
              className="text-zinc-600 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-400 dark:decoration-zinc-600"
            >
              Evals
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
