"use client";

import { FormEvent, useRef, useState } from "react";
import { CitationChip } from "./CitationChip";
import type { Citation } from "@/lib/types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  error?: boolean;
};

const TOPICS = [
  { title: "Welcome & culture", desc: "Mission, working hours, how the team works" },
  { title: "PTO & leave", desc: "Vacation days, sick leave, time off" },
  { title: "Expenses", desc: "What gets reimbursed and how to submit" },
  { title: "Tools & security", desc: "Approved tools, secrets, device rules" },
  { title: "Friday demo day", desc: "When it runs and how slots work" },
];

const SUGGESTIONS = [
  "What are the core working hours?",
  "How many vacation days do I get?",
  "Can I expense a new office chair?",
  "Is it okay to put API keys in the code repo?",
  "How does Friday demo day work?",
];

export function Chat() {
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
        body: JSON.stringify({ question: trimmed }),
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
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4 pt-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-7">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-500">
                CiteBot · Nordlicht Labs handbook
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Ask the employee handbook. Get the source.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Not a general chatbot. CiteBot only answers from a fixed
                five-document handbook for Nordlicht Labs, a fictional Berlin
                product studio — grounded answers with source chips. If the
                handbook doesn&apos;t cover it, the answer says so.
              </p>
            </div>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                What&apos;s in the handbook
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {TOPICS.map((t) => (
                  <li
                    key={t.title}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t.title}
                    </p>
                    <p className="text-xs text-zinc-500">{t.desc}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Try asking
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void ask(s)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-left text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : msg.error
                      ? "max-w-[95%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                      : "max-w-[95%] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
                {msg.citations && msg.citations.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    {msg.citations.map((c) => (
                      <CitationChip key={c.id} citation={c} />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="max-w-[95%] rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700">
                Retrieving sources and drafting an answer…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 mt-auto border-t border-zinc-200 bg-[var(--background)] pt-4 dark:border-zinc-800"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the handbook — e.g. vacation, expenses, demo day…"
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Ask
            </button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Demo corpus only — not legal or HR advice.
          </p>
        </form>
      </div>
    </div>
  );
}
