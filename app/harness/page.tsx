import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand } from "@/lib/brand";

export function generateMetadata() {
  const brand = getBrand();
  return {
    title: `Verify harness · ${brand.name}`,
    description: `How ${brand.name} checks its own answers against retrieved handbook chunks — a hiring-manager writeup.`,
  };
}

export default function HarnessPage() {
  const brand = getBrand();
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="harness" />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Portfolio note · verify harness
        </p>
        <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
          An agent that checks its own work.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {brand.name} answers from a small employee handbook. That alone is
          table stakes. The interesting part is the second pass: after
          generation, a shared verify step scores each claim against the same
          retrieved chunks — pass, fail, or unsupported — and shows the
          evidence in the UI.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Problem
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            RAG demos often stop at “here are some sources.” Citation chips can
            look authoritative while the prose quietly drifts. Hiring managers
            (and users) need a visible check that the answer actually survived
            contact with the evidence — not a confidence slider.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Harness
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>Retrieve top-k handbook chunks (embeddings + cosine).</li>
            <li>Generate a short answer constrained to that context.</li>
            <li>
              Run <code className="font-mono text-[13px]">verifyAnswer</code>{" "}
              in <code className="font-mono text-[13px]">lib/verify.ts</code>:
              split the answer into atomic claims; label each against the
              retrieved passages only.
            </li>
            <li>
              Render an evidence panel under the sources — pass / fail /
              unsupported with a short evidence note. Same path for every
              answer; no parallel “judge agent” theater.
            </li>
          </ol>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            See{" "}
            <Link
              href="https://github.com/jakob-alexander2000/citebot/blob/main/FEATURE_MAP.md"
              className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
              target="_blank"
              rel="noreferrer"
            >
              FEATURE_MAP.md
            </Link>{" "}
            for drive / verify steps.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            How to try
          </h2>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Grounded:
              </span>{" "}
              ask{" "}
              <em>“How many vacation days do full-time employees get?”</em> —
              evidence panel should show{" "}
              <span className="font-medium">pass</span> on the “30 days” claim
              with a PTO passage.
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Unsupported / refuse:
              </span>{" "}
              ask{" "}
              <em>“What’s our office dog’s name?”</em> — {brand.name} should
              say it isn’t in the handbook; the verify step should mark the
              refusal as{" "}
              <span className="font-medium">pass</span> (correct gap) or any
              invented detail as{" "}
              <span className="font-medium">unsupported</span> /{" "}
              <span className="font-medium">fail</span>.
            </li>
          </ul>
          <p className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Open {brand.name} →
            </Link>
          </p>
        </section>

        <section className="mt-12 border-t border-zinc-200 pt-6 text-[13px] leading-relaxed text-zinc-500 dark:border-zinc-800">
          Built by{" "}
          <a
            href="https://github.com/jakob-alexander2000"
            className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
            target="_blank"
            rel="noreferrer"
          >
            Jakob Alex
          </a>{" "}
          — white-label via env (see WHITE_LABEL.md). No multi-agent stack, no
          Electron.
        </section>
      </article>
    </main>
  );
}
