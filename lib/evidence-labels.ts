import type { Locale } from "./locale";
import type { ClaimVerdict, VerificationSummary } from "./types";

const VERDICT: Record<ClaimVerdict, string> = {
  pass: "Pass",
  fail: "Fail",
  unsupported: "Unsupported",
};

const SUMMARY: Record<VerificationSummary, string> = {
  grounded: "All claims grounded",
  mixed: "Mixed — some claims not grounded",
  ungrounded: "Not grounded in retrieved sources",
  unavailable: "Provider unavailable — try again",
};

export function verdictLabel(verdict: ClaimVerdict, locale: Locale = "en"): string {
  void locale;
  return VERDICT[verdict];
}

export function summaryLabel(summary: VerificationSummary, locale: Locale = "en"): string {
  void locale;
  return SUMMARY[summary];
}

export function evidenceTally(
  pass: number,
  fail: number,
  unsupported: number,
  locale: Locale = "en",
): string {
  void locale;
  return `${pass} pass · ${fail} fail · ${unsupported} unsupported`;
}

export function evidenceKicker(locale: Locale = "en"): string {
  void locale;
  return "Evidence · verify step";
}
