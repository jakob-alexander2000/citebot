"use client";

import { useState } from "react";
import type { Citation } from "@/lib/types";

export function CitationChip({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
        aria-expanded={open}
      >
        <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          src
        </span>
        <span className="max-w-[14rem] truncate">{citation.title}</span>
        <span className="text-zinc-400">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="mt-2 max-w-md rounded-xl border border-zinc-200 bg-white p-3 text-left text-xs leading-relaxed text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {citation.source}
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              score {citation.score}
            </span>
          </div>
          <p>{citation.snippet}</p>
        </div>
      ) : null}
    </div>
  );
}
