import Link from "next/link";
import { connection } from "next/server";
import { SiteHeader } from "@/components/SiteHeader";
import { EventTally } from "@/components/EventTally";
import { getBrand } from "@/lib/brand";
import { eventSummary } from "@/lib/event-log";
import { CHIP_ORDER_COOKIE, CHIP_ORDER_EXPERIMENT } from "@/lib/experiment";
import { getLocaleState } from "@/lib/request-locale";

export const instant = false;

export async function generateMetadata() {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: `Events · ${brand.name}`,
    description: "What the demo records, the chip-order experiment, and how to read the tally.",
  };
}

export default async function GrowthPage() {
  await connection();
  const { locale, source } = await getLocaleState();
  const brand = getBrand(locale);
  const summary = eventSummary();

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader locale={locale} source={source} />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Events
        </p>
        <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
          What got counted
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          The ask loop is unchanged. A page view, a chip, a submit, and a verify result are
          posted to <code className="font-mono text-[13px]">/api/events</code>. The handler
          keeps a short ring in this process, appends{" "}
          <code className="font-mono text-[13px]">.cache/events.jsonl</code> when the disk
          allows it, and prints one JSON line to the server log.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Events
          </h2>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="font-mono text-[13px]">page_view</span> on home, ask, harness,
              handbook, and this page.
            </li>
            <li>
              <span className="font-mono text-[13px]">ask_chip_click</span> with the chip index
              and the handbook filename.
            </li>
            <li>
              <span className="font-mono text-[13px]">ask_submit</span> from a chip or the typed
              box. The payload is an 8-character hash and a character count.
            </li>
            <li>
              <span className="font-mono text-[13px]">verify_result</span> after a checked
              answer: summary plus pass, fail, and unsupported counts. Claim text stays in the
              Evidence panel.
            </li>
            <li>
              <span className="font-mono text-[13px]">locale_ignored</span> only on the CiteBot
              craft skin, when a German preference is present and the demo stays English.
              German page views are not recorded for that skin. Grounded Docs still records{" "}
              <span className="font-mono text-[13px]">de</span> and <span className="font-mono text-[13px]">en</span>.
            </li>
          </ul>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            Blocked fields include the question, the answer, claim text, and anything that
            looks like an API key. A rejected body is not written.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Experiment
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <span className="font-mono text-[13px]">{CHIP_ORDER_EXPERIMENT}</span> runs on the
            CiteBot empty state only. Grounded Docs and other brands keep their own chip list
            and do not get a variant.
          </p>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Hypothesis: leading with the Friday demo question produces more first submits, and
            then more first verifies, than opening on the vacation rule. The three questions
            are the same. The verify step is the same. The only diff is order.
          </p>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="font-mono text-[13px]">control</span> — vacation days, client
              meal, Friday demo.
            </li>
            <li>
              <span className="font-mono text-[13px]">demo_first</span> — Friday demo, then the
              other two.
            </li>
          </ul>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            The first visit to <Link href="/ask" className="underline decoration-zinc-300 underline-offset-4">/ask</Link>{" "}
            on CiteBot assigns a variant at random and stores it in the{" "}
            <span className="font-mono text-[13px]">{CHIP_ORDER_COOKIE}</span> cookie for 180
            days. That visit sends <span className="font-mono text-[13px]">experiment_assignment</span>.
            The first submit in a tab sends{" "}
            <span className="font-mono text-[13px]">experiment_conversion</span> with goal{" "}
            <span className="font-mono text-[13px]">ask_submit</span>. The first checked answer
            sends goal <span className="font-mono text-[13px]">verify</span>. Later questions
            still increment <span className="font-mono text-[13px]">ask_submit</span> and{" "}
            <span className="font-mono text-[13px]">verify_result</span>, not the conversion
            counts.
          </p>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Read <span className="font-medium">verify / assigned</span>. If{" "}
            <span className="font-mono text-[13px]">demo_first</span> is not higher once both
            columns have assignments, keep handbook order.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            How to read it
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>Open home, ask, and harness. Submit one chip on /ask.</li>
            <li>
              <span className="font-mono text-[13px]">curl -s localhost:3000/api/events</span>{" "}
              or reload the tally below.
            </li>
            <li>
              Locally, <span className="font-mono text-[13px]">tail .cache/events.jsonl</span>.
              On a host, the same line is in the server log. The memory ring is per process, so
              a serverless instance can look empty after a cold start.
            </li>
          </ol>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            Optional forward, off unless set: <span className="font-mono">ANALYTICS_URL</span>,{" "}
            <span className="font-mono">PLAUSIBLE_DOMAIN</span>, or{" "}
            <span className="font-mono">VERCEL_ANALYTICS_URL</span>. No vendor package is
            required. See <span className="font-mono">.env.example</span>.
          </p>
        </section>

        <EventTally initial={summary} />

        <p className="mt-10 text-[13px] text-zinc-500">
          <Link
            href="/ask"
            className="underline decoration-zinc-300 underline-offset-4"
          >
            Ask
          </Link>
          {" · "}
          <Link
            href="/harness"
            className="underline decoration-zinc-300 underline-offset-4"
          >
            {brand.skin === "craft" ? "How the check works" : "Harness"}
          </Link>
        </p>
      </article>
    </main>
  );
}
