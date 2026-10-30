import Link from "next/link";
import golden from "@/evals/golden.json";
import lastRun from "@/evals/last-run.json";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";
import { EVAL_FAIL_MODES, EVAL_SCORECARD } from "@/lib/eval-public";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export async function generateMetadata() {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: `Evals · ${brand.name}`,
    description: "Golden handbook questions, what a pass means, and how a failed check looks.",
  };
}

function kindLabel(kind: string): string {
  if (kind === "gap") return "Gap";
  if (kind === "contradiction") return "Caught fail";
  return "Supported";
}

export default async function EvalsPage() {
  const { locale, source } = await getLocaleState();
  const copy = EVAL_SCORECARD;

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="evals" locale={locale} source={source} />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
          {copy.kicker}
        </p>
        <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
          {copy.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {copy.lead}
        </p>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            Latest run
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            {lastRun.measured} {lastRun.passed} of {lastRun.questionCount} questions passed.
          </p>
          <dl className="mt-3 space-y-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <div>
              <dt className="inline font-medium text-zinc-900 dark:text-zinc-100">When: </dt>
              <dd className="inline">
                {new Date(lastRun.ranAt).toLocaleString("en-GB", {
                  timeZone: "Europe/Berlin",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                Berlin time
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-zinc-900 dark:text-zinc-100">Commit: </dt>
              <dd className="inline font-mono">{lastRun.commit}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-zinc-900 dark:text-zinc-100">Cases written by: </dt>
              <dd className="inline">
                {lastRun.casesAuthor}
                {lastRun.casesCommit ? ` (${lastRun.casesCommit})` : ""}
              </dd>
            </div>
            {lastRun.casesReason ? (
              <div>
                <dt className="sr-only">Why these cases</dt>
                <dd>{lastRun.casesReason}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            Golden questions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] leading-relaxed">
              <caption className="sr-only">Golden handbook questions and what a pass requires</caption>
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-[0.14em] text-zinc-700 dark:text-zinc-300 dark:border-zinc-800">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Case
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Kind
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Pass requires
                  </th>
                </tr>
              </thead>
              <tbody>
                {golden.cases.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                    <th scope="row" className="py-3 pr-3 font-mono text-[12px] font-medium text-zinc-800 dark:text-zinc-200">
                      {row.id}
                    </th>
                    <td className="py-3 pr-3 text-zinc-700 dark:text-zinc-300">{kindLabel(row.kind)}</td>
                    <td className="py-3 text-zinc-700 dark:text-zinc-300">
                      <span className="block text-zinc-900 dark:text-zinc-100">{row.question}</span>
                      <span className="mt-1 block text-zinc-700 dark:text-zinc-300">{row.note}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.passTitle}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.pass}</p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.failTitle}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.failLead}</p>
          <ul className="space-y-3">
            {EVAL_FAIL_MODES.map((mode) => (
              <li key={mode.id}>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {mode.title}{" "}
                  <code className="font-mono text-[12px] font-normal text-zinc-700 dark:text-zinc-300">{mode.check}</code>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {mode.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {copy.runTitle}
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.offline}</p>
          <p className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-[13px] text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
            {copy.command}
          </p>
          <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.sibling}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/ask"
              className="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              {copy.ask} →
            </Link>
            <Link
              href="/harness"
              className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              {copy.harness}
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
