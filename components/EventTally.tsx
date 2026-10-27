"use client";

import { useState } from "react";
import { emptyVariantTally, type EventSummary, type VariantTally } from "@/lib/analytics";
import { CHIP_ORDER_EXPERIMENT, CHIP_ORDER_VARIANTS } from "@/lib/experiment";

const LABELS: Record<string, string> = {
  page_view: "Page view",
  ask_chip_click: "Chip click",
  ask_submit: "Submit",
  verify_result: "Verify result",
  experiment_assignment: "Assignment",
  experiment_conversion: "Conversion",
  locale_ignored: "Locale ignored",
};

export function EventTally({ initial }: { initial: EventSummary }) {
  const [summary, setSummary] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) throw new Error(`The tally returned ${res.status}.`);
      setSummary((await res.json()) as EventSummary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the tally.");
    } finally {
      setLoading(false);
    }
  }

  const rows = emptyVariantTally();
  const recorded = summary.experiments[CHIP_ORDER_EXPERIMENT];
  if (recorded) {
    for (const variant of CHIP_ORDER_VARIANTS) {
      const tally = recorded[variant];
      if (tally) rows[variant] = tally;
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            This process
          </h2>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
          >
            {loading ? "Loading…" : "Reload tally"}
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          {summary.count === 0
            ? "No events in this process yet."
            : `${summary.count} event${summary.count === 1 ? "" : "s"} in memory.`}
          {error ? ` ${error}` : null}
        </p>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-3">
          {Object.entries(LABELS).map(([name, label]) => (
            <div key={name} className="bg-[var(--background)] px-3 py-2.5 dark:bg-zinc-950">
              <dt className="text-[11px] text-zinc-500">{label}</dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                {summary.totals[name as keyof EventSummary["totals"]] ?? 0}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          {CHIP_ORDER_EXPERIMENT}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:bg-zinc-900/60">
              <tr>
                <th className="px-3 py-2 font-medium">Variant</th>
                <th className="px-3 py-2 font-medium">Assigned</th>
                <th className="px-3 py-2 font-medium">First submit</th>
                <th className="px-3 py-2 font-medium">First verify</th>
                <th className="px-3 py-2 font-medium">Verify / assigned</th>
              </tr>
            </thead>
            <tbody>
              {CHIP_ORDER_VARIANTS.map((variant) => (
                <tr key={variant} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 font-mono text-[13px] text-zinc-800 dark:text-zinc-200">
                    {variant}
                  </td>
                  <Count cells={rows[variant]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Count({ cells }: { cells: VariantTally }) {
  const rate = cells.assignment === 0 ? "n/a" : (cells.verify / cells.assignment).toFixed(2);
  return (
    <>
      <td className="px-3 py-2 font-mono tabular-nums">{cells.assignment}</td>
      <td className="px-3 py-2 font-mono tabular-nums">{cells.ask_submit}</td>
      <td className="px-3 py-2 font-mono tabular-nums">{cells.verify}</td>
      <td className="px-3 py-2 font-mono tabular-nums">{rate}</td>
    </>
  );
}
