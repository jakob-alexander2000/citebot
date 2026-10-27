"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/locale";
import { ui } from "@/lib/messages";
import type { Citation } from "@/lib/types";

export function Citations({
  citations,
  locale = "en",
}: {
  citations: Citation[];
  locale?: Locale;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [display, setDisplay] = useState<Citation | null>(null);
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  if (!citations.length) return null;
  const copy = ui(locale);

  function select(id: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    if (openId === id) {
      setOpenId(null);
      setExpanded(false);
      closeTimer.current = setTimeout(() => setDisplay(null), 300);
      return;
    }

    const next = citations.find((c) => c.id === id) ?? null;
    setOpenId(id);
    setDisplay(next);
    // Expand on next frame so 0fr → 1fr animates when opening from empty
    requestAnimationFrame(() => setExpanded(true));
  }

  return (
    <div className="mt-4 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {copy.sources}
      </p>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Citations">
        {citations.map((c, index) => {
          const selected = openId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              id={`${baseId}-tab-${c.id}`}
              onClick={() => select(c.id)}
              className={
                selected
                  ? "inline-flex items-center gap-2 rounded-md border border-zinc-900 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-transparent px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              }
            >
              <span className="font-mono text-[10px] opacity-60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="max-w-[12rem] truncate">{c.title}</span>
            </button>
          );
        })}
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-hidden={!expanded}
            className="pt-3"
          >
            {display ? (
              <article className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {display.title}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500">
                      {display.source}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-400">
                    {display.score.toFixed(3)}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {display.snippet}
                </p>
              </article>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
