"use client";

import { useEffect, useState, type FormEvent } from "react";

type Limits = {
  provider: string;
  upload: { maxBytes: number; maxPages: number; sessionTtlMinutes: number };
  quota: { neuronsPerDay: number; resets: string };
};

type Sentence = {
  text: string;
  match: string;
  passages: { id: string; source: string; title: string; text: string }[];
  flaggedConditions: { kind: string; phrase: string }[];
};

type AnswerBody = {
  provider?: string;
  generation?: string;
  sentences?: Sentence[];
  trace?: { step: string; detail: string }[];
  error?: string;
  code?: string;
};

function megabytes(bytes: number): string {
  return `${bytes / (1024 * 1024)} MB`;
}

export function AnswerDesk() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [limitsError, setLimitsError] = useState("");
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [locale, setLocale] = useState<"en" | "de">("en");
  const [collection, setCollection] = useState<"handbook" | "phone">("handbook");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AnswerBody | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/limits")
      .then(async (response) => {
        if (!response.ok) throw new Error("limits");
        return (await response.json()) as Limits;
      })
      .then((body) => {
        if (!cancelled) setLimits(body);
      })
      .catch(() => {
        if (!cancelled) setLimitsError("Limits could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          locale,
          collection,
          draft: draft.trim() ? draft : undefined,
        }),
      });
      setResult((await response.json()) as AnswerBody);
    } catch {
      setResult({ error: "The request did not finish.", code: "network" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="font-serif text-4xl tracking-tight text-zinc-900 dark:text-zinc-50">
        Answer from the documents.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Each sentence stays tied to a passage. A condition such as only, unless, nur, außer, sofern, or erst nach is flagged when the passage has it and the answer does not.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200" data-testid="limits">
        {limits
          ? `Provider: ${limits.provider}. Uploads up to ${megabytes(limits.upload.maxBytes)} and ${limits.upload.maxPages} pages, kept in memory for ${limits.upload.sessionTtlMinutes} minutes. Workers AI free allowance: ${limits.quota.neuronsPerDay} Neurons per day, resets ${limits.quota.resets}.`
          : limitsError || "Loading limits…"}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">
          Question
          <input
            data-testid="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Language
            <select
              data-testid="locale"
              value={locale}
              onChange={(event) => setLocale(event.target.value === "de" ? "de" : "en")}
              className="mt-1 block rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="en">English</option>
              <option value="de">German</option>
            </select>
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Documents
            <select
              data-testid="collection"
              value={collection}
              onChange={(event) => setCollection(event.target.value === "phone" ? "phone" : "handbook")}
              className="mt-1 block rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="handbook">Handbook</option>
              <option value="phone">Phone facts</option>
            </select>
          </label>
        </div>
        <label className="block text-sm text-zinc-700 dark:text-zinc-300">
          Optional draft to check
          <textarea
            data-testid="draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <button
          type="submit"
          data-testid="ask-submit"
          disabled={pending || question.trim().length === 0}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-accent)" }}
        >
          {pending ? "Reading…" : "Ask"}
        </button>
      </form>
      {result ? (
        <div data-testid="answer-result" className="mt-8 space-y-4">
          {result.error ? (
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {result.error} {result.code ? `(${result.code})` : ""}
            </p>
          ) : null}
          {result.provider ? (
            <p className="font-mono text-[11px] uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {result.provider} · {result.generation}
            </p>
          ) : null}
          <ul className="space-y-4">
            {(result.sentences ?? []).map((sentence, index) => (
              <li key={`${index}-${sentence.text.slice(0, 40)}`} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800" data-testid="sentence">
                <p className="text-sm text-zinc-900 dark:text-zinc-100">{sentence.text}</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{sentence.match}</p>
                {sentence.flaggedConditions.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {sentence.flaggedConditions.map((flag) => (
                      <li key={flag.kind} className="text-sm text-zinc-800 dark:text-zinc-200" data-testid="flag">
                        Dropped {flag.kind}: {flag.phrase}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ul className="mt-2 space-y-2">
                  {sentence.passages.map((passage) => (
                    <li key={passage.id} className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{passage.source}</span>
                      <span className="mt-1 block">{passage.text}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {result.trace ? (
            <ol className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              {result.trace.map((step) => (
                <li key={step.step}>
                  {step.step}: {step.detail}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
