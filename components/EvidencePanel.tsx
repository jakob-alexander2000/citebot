"use client";

import type {
  Citation,
  EvidenceClaim,
  Verification,
  ClaimVerdict,
} from "@/lib/types";

const VERDICT_LABEL: Record<ClaimVerdict, string> = {
  pass: "Pass",
  fail: "Fail",
  unsupported: "Unsupported",
};

function verdictClasses(verdict: ClaimVerdict): string {
  switch (verdict) {
    case "pass":
      return "border-emerald-200/90 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200";
    case "fail":
      return "border-red-200/90 bg-red-50/70 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200";
    case "unsupported":
      return "border-amber-200/90 bg-amber-50/70 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100";
  }
}

function pillClasses(verdict: ClaimVerdict): string {
  switch (verdict) {
    case "pass":
      return "bg-emerald-900 text-emerald-50 dark:bg-emerald-200 dark:text-emerald-950";
    case "fail":
      return "bg-red-900 text-red-50 dark:bg-red-200 dark:text-red-950";
    case "unsupported":
      return "bg-amber-800 text-amber-50 dark:bg-amber-200 dark:text-amber-950";
  }
}

function summaryLabel(summary: Verification["summary"]): string {
  switch (summary) {
    case "grounded":
      return "All claims grounded";
    case "mixed":
      return "Mixed — some claims not grounded";
    case "ungrounded":
      return "Not grounded in retrieved sources";
  }
}

function citationTitle(
  claim: EvidenceClaim,
  citations: Citation[],
): string | null {
  if (!claim.citationId) return null;
  const hit = citations.find((c) => c.id === claim.citationId);
  return hit ? hit.title : null;
}

export function EvidencePanel({
  verification,
  citations,
}: {
  verification: Verification;
  citations: Citation[];
}) {
  if (!verification.claims.length) return null;

  const passCount = verification.claims.filter((c) => c.verdict === "pass")
    .length;
  const failCount = verification.claims.filter((c) => c.verdict === "fail")
    .length;
  const unsupportedCount = verification.claims.filter(
    (c) => c.verdict === "unsupported",
  ).length;

  return (
    <div className="mt-5 rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Evidence · verify step
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {summaryLabel(verification.summary)}
          </p>
        </div>
        <p className="font-mono text-[10px] tabular-nums text-zinc-400">
          {passCount} pass · {failCount} fail · {unsupportedCount} unsupported
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {verification.claims.map((claim, i) => {
          const sourceTitle = citationTitle(claim, citations);
          return (
            <li
              key={`${i}-${claim.claim.slice(0, 24)}`}
              className={`rounded-lg border px-3 py-2.5 ${verdictClasses(claim.verdict)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] leading-relaxed">{claim.claim}</p>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClasses(claim.verdict)}`}
                >
                  {VERDICT_LABEL[claim.verdict]}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed opacity-80">
                {claim.evidence}
                {sourceTitle ? (
                  <span className="opacity-70"> · {sourceTitle}</span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
