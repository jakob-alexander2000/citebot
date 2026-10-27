import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";

export default function Home() {
  const brand = getBrand();
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="home" />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          {brand.org} · {brand.corpusLabel}
        </p>
        <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
          {brand.name}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {brand.tagline} {brand.taglineLine2} Answers stay inside the{" "}
          {brand.corpusLabel}: a short tool loop reads the documents, then a
          verify step checks each claim against the passages it used.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/ask"
            className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Ask the handbook →
          </Link>
          <Link
            href="/harness"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            How verify works
          </Link>
          <Link
            href="/handbook"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Handbook
          </Link>
        </div>

        <section className="mt-12 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            How verify works
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            After the draft, one shared step splits the answer into claims and
            marks each <span className="font-medium text-zinc-900 dark:text-zinc-100">pass</span>,{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">fail</span>, or{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">unsupported</span>{" "}
            against those same passages. A correct “not in the handbook”
            refusal counts as pass. The Evidence panel shows the quote.
          </p>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            The full path — plan, tools, draft, verify — is on{" "}
            <Link
              href="/harness"
              className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
            >
              the harness writeup
            </Link>
            .
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            How to try
          </h2>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>
              Ask how many vacation days full-time employees get — expect{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">pass</span>{" "}
              on 30 days.
            </li>
            <li>
              Ask about an office chair and daily team lunches — the chair
              should pass; lunches should be{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                unsupported
              </span>
              .
            </li>
            <li>
              Ask for the office dog’s name — a refusal should pass. An
              invented name must not.
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
