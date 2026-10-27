/**
 * White-label brand config (NEXT_PUBLIC_* — safe for client + server).
 * Defaults = Grounded Docs / Hartmann Fertigung QM handbook.
 * Override per deployment for another client. Pass a locale for copy that
 * has no env override.
 */
import type { Locale } from "./locale";
export type Brand = {
  name: string;
  tagline: string;
  taglineLine2: string;
  org: string;
  corpusLabel: string;
  accent: string;
  initial: string;
  logoUrl: string | null;
  githubUrl: string | null;
  footerNote: string;
  description: string;
};

function pub(key: string, fallback: string): string {
  const v = process.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

const COPY: Record<
  Locale,
  Pick<Brand, "tagline" | "taglineLine2" | "corpusLabel" | "footerNote" | "description">
> = {
  en: {
    tagline: "Ask the quality handbook.",
    taglineLine2: "See the source.",
    corpusLabel: "quality handbook",
    footerNote:
      "Sample QM handbook — not a certified management system or legal advice.",
    description:
      "Grounded Docs answers quality-handbook questions in German or English, with citations and an evidence check.",
  },
  de: {
    tagline: "Fragen Sie das QM-Handbuch.",
    taglineLine2: "Mit Quellenangabe.",
    corpusLabel: "QM-Handbuch",
    footerNote:
      "Muster-QM-Handbuch — kein zertifiziertes Managementsystem und keine Rechtsberatung.",
    description:
      "Grounded Docs beantwortet Fragen zum QM-Handbuch auf Deutsch oder Englisch, mit Quellen und Nachweis.",
  },
};

export function getBrand(locale: Locale = "en"): Brand {
  const copy = COPY[locale];
  const name = pub("NEXT_PUBLIC_BRAND_NAME", "Grounded Docs");
  const initialDefault = name.charAt(0).toUpperCase() || "G";
  return {
    name,
    tagline: pub("NEXT_PUBLIC_BRAND_TAGLINE", copy.tagline),
    taglineLine2: pub("NEXT_PUBLIC_BRAND_TAGLINE_2", copy.taglineLine2),
    org: pub("NEXT_PUBLIC_BRAND_ORG", "Hartmann Fertigung GmbH"),
    corpusLabel: pub("NEXT_PUBLIC_BRAND_CORPUS_LABEL", copy.corpusLabel),
    accent: pub("NEXT_PUBLIC_BRAND_ACCENT", "#0f4c45"),
    initial: pub("NEXT_PUBLIC_BRAND_INITIAL", initialDefault),
    logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || null,
    githubUrl:
      process.env.NEXT_PUBLIC_BRAND_GITHUB_URL?.trim() ||
      "https://github.com/jakob-alexander2000/citebot",
    footerNote: pub("NEXT_PUBLIC_BRAND_FOOTER", copy.footerNote),
    description: pub("NEXT_PUBLIC_BRAND_DESCRIPTION", copy.description),
  };
}
