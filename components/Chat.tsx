"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { AgentSteps } from "./AgentSteps";
import { Citations } from "./Citations";
import { EvidencePanel } from "./EvidencePanel";
import type { AgentStep, Citation, Verification } from "@/lib/types";
import { getBrand } from "@/lib/brand";
import { DEMO_QUESTIONS } from "@/lib/demo-questions";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/messages";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  verification?: Verification;
  steps?: AgentStep[];
  error?: boolean;
};

export type Topic = { title: string; desc: string };

export function Chat({
  topics = [],
  locale,
}: {
  topics?: Topic[];
  locale: Locale;
}) {
  const TOPICS = topics;
  const brand = getBrand(locale);
  const copy = ui(locale);
  const suggestions = DEMO_QUESTIONS[locale].map((item) => item.question);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer as string,
          citations: (data.citations as Citation[]) || [],
          verification: data.verification as Verification | undefined,
          steps: (data.steps as AgentStep[]) || [],
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6 pt-10 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-10">
            <div className="max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                {brand.org} · {brand.corpusLabel}
              </p>
              <h1 className="mt-3 font-serif text-[2.35rem] leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-50">
                {brand.tagline}
                <br />
                {brand.taglineLine2}
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {copy.askLead}{" "}
                <Link
                  href="/handbook"
                  className="text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-900 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
                >
                  {copy.readHandbook}
                </Link>
                {" · "}
                <Link
                  href="/harness"
                  className="text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-900 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
                >
                  {copy.howHarness}
                </Link>
                .
              </p>
            </div>

            {TOPICS.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {copy.covered}
                </h2>
                <Link
                  href="/handbook"
                  className="text-xs text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {copy.openHandbook} →
                </Link>
              </div>
              <ul className="grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-2">
                {TOPICS.map((t) => (
                  <li
                    key={t.title}
                    className="bg-[var(--background)] px-3.5 py-3 dark:bg-zinc-950"
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                      {t.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            )}

            <section>
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {copy.tryAsking}
              </h2>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void ask(s)}
                    className="group flex items-center justify-between rounded-lg border border-transparent px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:border-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:border-zinc-800 dark:hover:bg-zinc-900/60"
                  >
                    <span>{s}</span>
                    <span className="text-zinc-300 transition group-hover:text-zinc-500 dark:text-zinc-600">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto pb-4">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2.5 text-[15px] leading-relaxed text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div
                  key={msg.id}
                  className={
                    msg.error
                      ? "max-w-[95%] rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3.5 text-[15px] text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200"
                      : "max-w-[95%]"
                  }
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                    {msg.content}
                  </p>
                  {msg.steps && msg.steps.length > 0 ? (
                    <AgentSteps steps={msg.steps} locale={locale} />
                  ) : null}
                  {msg.citations && msg.citations.length > 0 ? (
                    <Citations citations={msg.citations} locale={locale} />
                  ) : null}
                  {msg.verification ? (
                    <EvidencePanel
                      verification={msg.verification}
                      citations={msg.citations || []}
                      locale={locale}
                    />
                  ) : null}
                </div>
              ),
            )}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
                {copy.reading}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 mt-auto border-t border-zinc-200/80 bg-[var(--background)]/95 pt-4 backdrop-blur-sm dark:border-zinc-800/80"
        >
          <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:border-zinc-600">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={copy.placeholder}
              disabled={loading}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-zinc-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="brand-ask rounded-lg px-3.5 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-35"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              {copy.ask}
            </button>
          </div>
          <p className="mt-2.5 text-[11px] text-zinc-400">
            {brand.footerNote}
          </p>
        </form>
      </div>
    </div>
  );
}
