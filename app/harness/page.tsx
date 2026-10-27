import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { EvidenceSnapshot } from "@/components/EvidenceSnapshot";
import { getBrand } from "@/lib/brand";

export function generateMetadata() {
  const brand = getBrand();
  return {
    title: `Verify harness · ${brand.name}`,
    description:
      "How CiteBot checks its own answers against retrieved handbook chunks — architecture, annotated evidence examples, how to try.",
  };
}

const EXAMPLES = [
  {
    id: "grounded",
    label: "01 · Grounded pass",
    question: "How many vacation days do full-time employees get?",
    answer:
      "Full-time employees receive 30 days of paid vacation per calendar year, plus German public holidays observed in Berlin.",
    note: "PTO claim lands on the handbook sentence. Hiring skim: green Pass + quote + source title.",
    summary: "grounded" as const,
    claims: [
      {
        claim:
          "Full-time employees receive 30 days of paid vacation per calendar year.",
        verdict: "pass" as const,
        evidence:
          'Supported: “Full-time employees receive 30 days of paid vacation per calendar year”',
        sourceTitle: "Time off and leave",
      },
      {
        claim:
          "Full-time employees also receive German public holidays observed in Berlin.",
        verdict: "pass" as const,
        evidence:
          'Supported: “plus German public holidays observed in Berlin”',
        sourceTitle: "Time off and leave",
      },
    ],
  },
  {
    id: "mixed",
    label: "02 · Partial / weak support",
    question: "Can I expense a new office chair, and are daily team lunches covered?",
    answer:
      "Yes — home-office equipment is reimbursed up to €400 per year with manager approval. Daily team lunches are also covered under the meal policy.",
    note: "One claim is real (€400 equipment). The lunch line is invented — verify marks Unsupported so the mixed summary is visible.",
    summary: "mixed" as const,
    claims: [
      {
        claim:
          "Home-office equipment is reimbursed up to €400 per year with prior manager approval.",
        verdict: "pass" as const,
        evidence:
          'Supported: “Home-office equipment up to €400 per year … with prior manager approval”',
        sourceTitle: "Expense policy",
      },
      {
        claim: "Daily team lunches are covered under the meal policy.",
        verdict: "unsupported" as const,
        evidence:
          "Retrieved expense policy covers client meals (up to €45/person) and home-office gear — not daily team lunches.",
        sourceTitle: "Expense policy",
      },
    ],
  },
  {
    id: "trick",
    label: "03 · Trick / refusal",
    question: "What’s our office dog’s name?",
    answer:
      "The Nordlicht handbook doesn’t mention an office dog, so I can’t give a name from the docs.",
    note: "Correct gap → Pass on the refusal. An invented name (“Bruno”) would be Unsupported / Fail — never a quiet Pass.",
    summary: "grounded" as const,
    claims: [
      {
        claim:
          "The handbook does not mention an office dog or a dog’s name.",
        verdict: "pass" as const,
        evidence:
          "No retrieved passage names a pet or office dog; refusal matches the gap.",
      },
    ],
  },
] as const;

const ARCH_STEPS = [
  { step: "1", title: "Plan", body: "Choose a handbook tool — search, a section, topics, or a quote check." },
  { step: "2", title: "Tools", body: "Run at most three corpus-only calls. No web, no shell." },
  { step: "3", title: "Draft", body: "Write a short answer from the passages those tools returned." },
  { step: "4", title: "Verify", body: "Split claims and mark each pass / fail / unsupported." },
] as const;

const TOOLS = [
  { name: "search_handbook", body: "Passages for a query." },
  { name: "list_topics", body: "Document titles and section names." },
  { name: "get_section", body: "One section by id, file, or title." },
  { name: "quote_check", body: "Whether a claimed quote appears in the text." },
] as const;

export default function HarnessPage() {
  const brand = getBrand();
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <SiteHeader active="harness" />
      <article className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Hire writeup · verify harness
        </p>
        <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
          An agent that checks its own work.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {brand.name} answers from a small English employee handbook
          (Nordlicht Labs). That alone is table stakes. The interesting part is
          the second pass: after generation, a shared verify step scores each
          claim against the same retrieved chunks — pass, fail, or unsupported —
          and shows the evidence in the UI.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Problem
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            RAG demos often stop at “here are some sources.” Citation chips can
            look authoritative while the prose quietly drifts. Hiring managers
            need a visible check that the answer survived contact with the
            evidence — not a confidence slider, not a parallel “judge agent”
            theater.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Architecture
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            One path for every answer:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              plan → tools → draft → verify
            </span>
            . The draft and the verifier share the passages those tools
            returned — no second corpus, no hidden judge.
          </p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {ARCH_STEPS.map((s) => (
              <li
                key={s.step}
                className="rounded-xl border border-zinc-200/90 bg-white/50 px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-950/30"
              >
                <p className="font-mono text-[10px] tabular-nums text-zinc-400">
                  {s.step}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {s.title}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            Code:{" "}
            <code className="font-mono text-[12px]">lib/verify.ts</code> ·{" "}
            <code className="font-mono text-[12px]">
              components/EvidencePanel.tsx
            </code>{" "}
            · map in{" "}
            <Link
              href="https://github.com/jakob-alexander2000/citebot/blob/main/FEATURE_MAP.md"
              className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
              target="_blank"
              rel="noreferrer"
            >
              FEATURE_MAP.md
            </Link>
            . Pair with{" "}
            <Link
              href="https://github.com/jakob-alexander2000/citebot-evals"
              className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
              target="_blank"
              rel="noreferrer"
            >
              citebot-evals
            </Link>{" "}
            (18/18 fixture).
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Agent loop
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Each question runs a short loop before the draft: a plan, then at
            most three handbook tools. Verify still scores that draft against
            the passages the tools returned. A fourth tool call, or the same
            call twice, stops the loop with a clear message instead of spinning.
            The transcript shows the tool names and a one-line result; the
            Evidence panel stays the pass / fail surface.
          </p>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {TOOLS.map((tool) => (
              <li key={tool.name}>
                <code className="font-mono text-[12px] text-zinc-800 dark:text-zinc-200">
                  {tool.name}
                </code>
                <span> — {tool.body}</span>
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            Tools stay inside the corpus. Fixture tests for the loop and the
            verifier run in CI with a scripted model — no live API key.
          </p>
        </section>

        <section className="mt-12 space-y-8">
          <div className="space-y-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Evidence examples
            </h2>
            <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Three panels a hiring manager can skim in ~90 seconds. Faithful
              recreations of the live Evidence UI on the Nordlicht handbook —
              same chrome, same verdict language.
            </p>
          </div>

          {EXAMPLES.map((ex) => (
            <figure
              key={ex.id}
              id={ex.id}
              className="scroll-mt-8 space-y-3 border-t border-zinc-200/80 pt-8 dark:border-zinc-800/80"
            >
              <figcaption className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {ex.label}
                </p>
                <p className="text-[13px] leading-relaxed text-zinc-500">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    Q ·{" "}
                  </span>
                  {ex.question}
                </p>
                <p className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2 text-[13px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    A ·{" "}
                  </span>
                  {ex.answer}
                </p>
              </figcaption>
              <EvidenceSnapshot summary={ex.summary} claims={[...ex.claims]} />
              <p className="text-[13px] leading-relaxed text-zinc-500">
                {ex.note}
              </p>
            </figure>
          ))}
        </section>

        <section className="mt-12 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            How to try live
          </h2>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Grounded:
              </span>{" "}
              ask the vacation question — expect{" "}
              <span className="font-medium">pass</span> on “30 days” with a PTO
              passage.
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Mixed:
              </span>{" "}
              ask about an office chair <em>and</em> daily team lunches — chair
              should <span className="font-medium">pass</span>; lunch should be{" "}
              <span className="font-medium">unsupported</span>.
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Trick:
              </span>{" "}
              ask for the office dog’s name — refusal should{" "}
              <span className="font-medium">pass</span> as a real gap; any
              invented name must not.
            </li>
          </ul>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Open {brand.name} →
            </Link>
            <a
              href="https://github.com/jakob-alexander2000/citebot"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
              target="_blank"
              rel="noreferrer"
            >
              Source →
            </a>
          </div>
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
          </a>
          . Portfolio bet: verify-its-own-work agent — English Nordlicht demo,
          one harness, no multi-agent stack.
        </section>
      </article>
    </main>
  );
}
