import {
  evidenceKicker,
  evidenceTally,
  summaryLabel,
  verdictLabel,
} from "@/lib/evidence-labels";
import type { Locale } from "@/lib/locale";
import type { ClaimVerdict, VerificationSummary } from "@/lib/types";

export type SnapshotClaim = {
  claim: string;
  verdict: ClaimVerdict;
  evidence: string;
  sourceTitle?: string;
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

/**
 * Static recreation of EvidencePanel for the harness page.
 * Same chrome and verdict colors as the live chat panel.
 */
export function EvidenceSnapshot({
  summary,
  claims,
  locale = "en",
}: {
  summary: VerificationSummary;
  claims: SnapshotClaim[];
  locale?: Locale;
}) {
  const passCount = claims.filter((c) => c.verdict === "pass").length;
  const failCount = claims.filter((c) => c.verdict === "fail").length;
  const unsupportedCount = claims.filter(
    (c) => c.verdict === "unsupported",
  ).length;

  return (
    <div
      aria-hidden={false}
      className="rounded-xl border border-zinc-200 bg-white/60 p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300">
            {evidenceKicker(locale)}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {summaryLabel(summary, locale)}
          </p>
        </div>
        <p className="font-mono text-[10px] tabular-nums text-zinc-700 dark:text-zinc-300">
          {evidenceTally(passCount, failCount, unsupportedCount, locale)}
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {claims.map((claim, i) => (
          <li
            key={`${i}-${claim.claim.slice(0, 24)}`}
            className={`rounded-lg border px-3 py-2.5 ${verdictClasses(claim.verdict)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] leading-relaxed">{claim.claim}</p>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClasses(claim.verdict)}`}
              >
                {verdictLabel(claim.verdict, locale)}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed opacity-80">
              {claim.evidence}
              {claim.sourceTitle ? (
                <span className="opacity-70"> · {claim.sourceTitle}</span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
