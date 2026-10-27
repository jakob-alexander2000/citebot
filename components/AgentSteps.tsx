"use client";

import type { AgentStep } from "@/lib/types";

export function AgentSteps({ steps }: { steps: AgentStep[] }) {
  if (!steps.length) return null;
  const tools = steps.filter((step) => step.kind === "tool").length;

  return (
    <div className="mt-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        Steps{tools > 0 ? ` · ${tools} tool${tools === 1 ? "" : "s"}` : ""}
      </p>
      <ol className="mt-1.5 space-y-1">
        {steps.map((step, index) => (
          <li
            key={`${step.kind}-${step.label}-${index}`}
            className="flex flex-wrap items-baseline gap-x-2 text-[12px] leading-relaxed"
          >
            <span className="font-mono text-[10px] tabular-nums text-zinc-400">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-medium text-zinc-800 dark:text-zinc-100">
              {step.label}
            </span>
            <span className="min-w-0 text-zinc-500">{step.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
