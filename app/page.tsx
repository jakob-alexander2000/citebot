import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { activeDemoQuestions } from "@/lib/demo-questions";
import type { UiCopy } from "@/lib/messages";
import { ui } from "@/lib/messages";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export default async function Home() {
  const { locale, source } = await getLocaleState();
  const brand = getBrand(locale);
  const copy = ui(locale);
  const questions = activeDemoQuestions(locale);

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="home" locale={locale} source={source} />
      {brand.skin === "craft" ? (
        <CraftHome
          org={brand.org}
          name={brand.name}
          tagline={brand.tagline}
          taglineLine2={brand.taglineLine2}
          copy={copy}
          questions={questions.map((item) => item.question)}
        />
      ) : (
        <ProductHome
          org={brand.org}
          name={brand.name}
          corpusLabel={brand.corpusLabel}
          tagline={brand.tagline}
          taglineLine2={brand.taglineLine2}
          bilingual={brand.bilingual}
          copy={copy}
          questions={questions.map((item) => item.question)}
        />
      )}
    </main>
  );
}

function ProductHome({
  org,
  name,
  corpusLabel,
  tagline,
  taglineLine2,
  bilingual,
  copy,
  questions,
}: {
  org: string;
  name: string;
  corpusLabel: string;
  tagline: string;
  taglineLine2: string;
  bilingual: boolean;
  copy: UiCopy;
  questions: string[];
}) {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-16 sm:px-6">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "var(--brand-accent)" }}
      >
        {org}
      </p>
      <h1 className="mt-4 font-serif text-[3.25rem] leading-[0.95] tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
        {name}
      </h1>
      <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {corpusLabel}
        {bilingual ? (
          <span className="font-normal text-zinc-400"> · {copy.homeLocales}</span>
        ) : null}
      </p>
      <p className="mt-8 max-w-xl font-serif text-[1.65rem] leading-snug text-zinc-800 dark:text-zinc-100">
        {tagline}
        <span className="mt-1 block text-zinc-500 dark:text-zinc-400">{taglineLine2}</span>
      </p>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        {copy.homeLead}
      </p>
      <Actions copy={copy} />
      <Verify copy={copy} />
      <QuestionList title={copy.homeTryTitle} questions={questions} chips={false} />
    </article>
  );
}

function CraftHome({
  org,
  name,
  tagline,
  taglineLine2,
  copy,
  questions,
}: {
  org: string;
  name: string;
  tagline: string;
  taglineLine2: string;
  copy: UiCopy;
  questions: string[];
}) {
  return (
    <article className="mx-auto w-full max-w-xl px-4 pb-16 pt-14 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        Demo · {org}
      </p>
      <h1 className="mt-4 font-serif text-[2.6rem] leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
        {tagline}
        <span className="mt-1 block text-[1.35rem] font-normal text-zinc-500 dark:text-zinc-400">
          {taglineLine2}
        </span>
      </h1>
      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{name}</span>{" "}
        {copy.homeLead}
      </p>
      <Actions copy={copy} />
      <QuestionList title={copy.homeTryTitle} questions={questions} chips />
      <section className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
          {copy.homeVerifyTitle}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{copy.homeVerifyBody}</p>
        <p className="mt-2 text-[13px]">
          <Link
            href="/harness"
            className="text-zinc-600 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-400 dark:decoration-zinc-600"
          >
            {copy.homeHarnessLink}
          </Link>
          <span className="text-zinc-400"> · </span>
          <Link
            href="/growth"
            className="text-zinc-600 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-400 dark:decoration-zinc-600"
          >
            Events
          </Link>
        </p>
      </section>
    </article>
  );
}

function Actions({ copy }: { copy: UiCopy }) {
  return (
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
  );
}

function Verify({ copy }: { copy: UiCopy }) {
  return (
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
  );
}

function QuestionList({
  title,
  questions,
  chips,
}: {
  title: string;
  questions: string[];
  chips: boolean;
}) {
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h2>
      <ul
        className={
          chips
            ? "flex flex-col gap-2"
            : "space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300"
        }
      >
        {questions.map((question) => (
          <li
            key={question}
            className={
              chips
                ? "rounded-full border border-zinc-200 px-3.5 py-2 text-sm leading-snug text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                : undefined
            }
          >
            {question}
          </li>
        ))}
      </ul>
    </section>
  );
}
