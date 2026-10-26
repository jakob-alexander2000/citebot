"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Markdown } from "./Markdown";
import { getBrand } from "@/lib/brand";

export type HandbookDocPayload = {
  slug: string;
  filename: string;
  title: string;
  summary: string;
  content: string;
  format?: "md" | "pdf";
};

export function HandbookBrowser({ docs }: { docs: HandbookDocPayload[] }) {
  const brand = getBrand();
  const [activeSlug, setActiveSlug] = useState(docs[0]?.slug ?? "");
  const active = useMemo(
    () => docs.find((d) => d.slug === activeSlug) ?? docs[0] ?? null,
    [docs, activeSlug],
  );

  if (!docs.length) {
    return <p className="text-sm text-zinc-500">No handbook documents found.</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:py-12">
      <aside className="mb-8 w-full shrink-0 lg:mb-0 lg:w-56">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Corpus
          </p>
          <h1 className="mt-1 font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
            Handbook
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            The {docs.length} document{docs.length === 1 ? "" : "s"}{" "}
            {brand.name} retrieves from. Ask them on the{" "}
            <Link
              href="/"
              className="text-zinc-800 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-200"
            >
              chat
            </Link>
            .
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {docs.map((doc, i) => {
            const selected = doc.slug === active?.slug;
            return (
              <button
                key={doc.slug}
                type="button"
                onClick={() => setActiveSlug(doc.slug)}
                className={
                  selected
                    ? "min-w-[10rem] shrink-0 rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2.5 text-left dark:border-zinc-100 dark:bg-zinc-100 lg:min-w-0"
                    : "min-w-[10rem] shrink-0 rounded-lg border border-transparent px-3 py-2.5 text-left transition hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900/50 lg:min-w-0"
                }
              >
                <span
                  className={
                    selected
                      ? "font-mono text-[10px] text-zinc-400 dark:text-zinc-500"
                      : "font-mono text-[10px] text-zinc-400"
                  }
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  className={
                    selected
                      ? "mt-0.5 text-sm font-medium text-white dark:text-zinc-900"
                      : "mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  }
                >
                  {doc.title}
                </p>
                <p
                  className={
                    selected
                      ? "mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500"
                      : "mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500"
                  }
                >
                  {doc.summary}
                </p>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 flex-1">
        {active ? (
          <article className="rounded-xl border border-zinc-200 bg-white px-5 py-6 sm:px-8 sm:py-8 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
              <span>{active.filename}</span>
              {active.format === "pdf" ? (
                <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-zinc-500 dark:border-zinc-700">
                  PDF
                </span>
              ) : null}
            </p>
            {active.format === "pdf" ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {active.content}
              </pre>
            ) : (
              <Markdown content={active.content} />
            )}
          </article>
        ) : null}
      </section>
    </div>
  );
}
