import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { EvidenceSnapshot } from "@/components/EvidenceSnapshot";
import { getBrand } from "@/lib/brand";
import { HARNESS } from "@/lib/harness-copy";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export async function generateMetadata() {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: `${HARNESS.kicker} · ${brand.name}`,
    description: `How ${brand.name} checks answers against the ${brand.corpusLabel}.`,
  };
}

export default async function HarnessPage() {
  const { locale, source } = await getLocaleState();
  const brand = getBrand(locale);
  const copy = HARNESS;

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="harness" locale={locale} source={source} />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
          {copy.kicker}
        </p>
        <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
          {copy.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {copy.lead(brand.name, brand.org)}
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.problemTitle}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {copy.problem}
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.architectureTitle}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {copy.architectureBefore}{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              plan, tools, draft, verify
            </span>
            . {copy.architectureAfter}
          </p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {copy.steps.map((step) => (
              <li
                key={step.step}
                className="rounded-xl border border-zinc-200/90 bg-white/50 px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-950/30"
              >
                <p className="font-mono text-[10px] tabular-nums text-zinc-700 dark:text-zinc-300">{step.step}</p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">{step.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.loopTitle}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.loop}</p>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {copy.tools.map((tool) => (
              <li key={tool.name}>
                <code className="font-mono text-[12px] text-zinc-800 dark:text-zinc-200">{tool.name}</code>
                <span> — {tool.body}</span>
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.testsNote}</p>
          <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            The golden questions, and how a failed check looks, are on{" "}
            <Link
              href="/evals"
              className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
            >
              Evals
            </Link>
            . <code className="font-mono text-[12px]">npm run eval</code> scores them with no model key.
          </p>
        </section>

        <section className="mt-12 space-y-8">
          <div className="space-y-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
              {copy.examplesTitle}
            </h2>
            <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {copy.examplesLead}
            </p>
          </div>
          {copy.examples.map((example) => (
            <figure
              key={example.id}
              id={example.id}
              className="scroll-mt-8 space-y-3 border-t border-zinc-200/80 pt-8 dark:border-zinc-800/80"
            >
              <figcaption className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
                  {example.label}
                </p>
                <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">Q · </span>
                  {example.question}
                </p>
                <p className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2 text-[13px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">A · </span>
                  {example.answer}
                </p>
              </figcaption>
              <EvidenceSnapshot summary={example.summary} claims={example.claims} locale={locale} />
              <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{example.note}</p>
            </figure>
          ))}
        </section>

        <section className="mt-12 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.tryTitle}
          </h2>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {copy.tryItems.map((item) => (
              <li key={item.label}>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}:</span>{" "}
                {item.body}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href="/ask"
              className="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              {copy.openAsk(brand.name)} →
            </Link>
            {brand.githubUrl ? (
              <a
                href={brand.githubUrl}
                className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                target="_blank"
                rel="noreferrer"
              >
                {copy.source} →
              </a>
            ) : null}
          </div>
        </section>

        <p className="mt-12 border-t border-zinc-200 pt-6 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300 dark:border-zinc-800">
          {copy.footer}
        </p>
      </article>
    </main>
  );
}
