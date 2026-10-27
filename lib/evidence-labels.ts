import type { Locale } from "./locale";
import type { ClaimVerdict, VerificationSummary } from "./types";

const VERDICT: Record<Locale, Record<ClaimVerdict, string>> = {
  en: { pass: "Pass", fail: "Fail", unsupported: "Unsupported" },
  de: { pass: "Belegt", fail: "Widerspruch", unsupported: "Nicht belegt" },
};

const SUMMARY: Record<Locale, Record<VerificationSummary, string>> = {
  en: {
    grounded: "All claims grounded",
    mixed: "Mixed — some claims not grounded",
    ungrounded: "Not grounded in retrieved sources",
    unavailable: "Provider unavailable — try again",
  },
  de: {
    grounded: "Alle Aussagen belegt",
    mixed: "Gemischt — nicht alle Aussagen belegt",
    ungrounded: "Nicht durch die Quellen belegt",
    unavailable: "Anbieter vorübergehend nicht erreichbar",
  },
};

export function verdictLabel(verdict: ClaimVerdict, locale: Locale): string {
  return VERDICT[locale][verdict];
}

export function summaryLabel(summary: VerificationSummary, locale: Locale): string {
  return SUMMARY[locale][summary];
}

export function evidenceTally(
  pass: number,
  fail: number,
  unsupported: number,
  locale: Locale,
): string {
  if (locale === "de") {
    return `${pass} belegt · ${fail} Widerspruch · ${unsupported} nicht belegt`;
  }
  return `${pass} pass · ${fail} fail · ${unsupported} unsupported`;
}

export function evidenceKicker(locale: Locale): string {
  return locale === "de" ? "Nachweis · Prüfschritt" : "Evidence · verify step";
}
