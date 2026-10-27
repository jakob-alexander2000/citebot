/**
 * White-label brand config (NEXT_PUBLIC_* — safe for client + server).
 * Defaults = Grounded Docs / Hartmann Fertigung QM handbook (bilingual).
 * CiteBot is the English-only hire demo over the Nordlicht employee handbook.
 * Another client stays English-only unless NEXT_PUBLIC_BILINGUAL opts into DE|EN.
 */
import type { Locale } from "./locale";

export type BrandSkin = "product" | "craft" | "client";

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
  /** Product (Grounded Docs), craft demo (CiteBot), or another white-label. */
  skin: BrandSkin;
  /** Header DE|EN switch and Accept-Language. Off for CiteBot unless opted in. */
  bilingual: boolean;
};

function pub(key: string, fallback: string): string {
  const v = process.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function flag(key: string): boolean | null {
  const v = process.env[key]?.trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off" || v === "en") return false;
  return null;
}

/** Product when unset or named Grounded Docs / QM. CiteBot is the craft demo. */
export function brandSkin(): BrandSkin {
  const explicit = process.env.NEXT_PUBLIC_BRAND_SKIN?.trim().toLowerCase();
  if (explicit === "product" || explicit === "craft" || explicit === "client") {
    return explicit;
  }
  const name = process.env.NEXT_PUBLIC_BRAND_NAME?.trim().toLowerCase() ?? "";
  if (!name || name === "grounded docs" || name === "qm" || name.startsWith("grounded docs")) {
    return "product";
  }
  if (name === "citebot") return "craft";
  return "client";
}

/**
 * DE|EN when this is the Grounded Docs product, or when a deploy opts in.
 * CiteBot and other client names stay English-only until NEXT_PUBLIC_BILINGUAL.
 */
export function isBilingual(): boolean {
  const explicit = flag("NEXT_PUBLIC_BILINGUAL");
  if (explicit !== null) return explicit;
  return brandSkin() === "product";
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

const CRAFT_COPY: (typeof COPY)["en"] = {
  tagline: "Ask the handbook.",
  taglineLine2: "See the line it came from.",
  corpusLabel: "employee handbook",
  footerNote: "Sample employee handbook — a demo, not legal or HR advice.",
  description:
    "CiteBot answers from the Nordlicht Labs employee handbook and shows the passage.",
};

export function getBrand(locale: Locale = "en"): Brand {
  const skin = brandSkin();
  const bilingual = isBilingual();
  const copy = skin === "craft" ? CRAFT_COPY : COPY[bilingual ? locale : "en"];
  const name = pub(
    "NEXT_PUBLIC_BRAND_NAME",
    skin === "craft" ? "CiteBot" : "Grounded Docs",
  );
  const initialDefault = name.charAt(0).toUpperCase() || "G";
  return {
    name,
    tagline: pub("NEXT_PUBLIC_BRAND_TAGLINE", copy.tagline),
    taglineLine2: pub("NEXT_PUBLIC_BRAND_TAGLINE_2", copy.taglineLine2),
    org: pub(
      "NEXT_PUBLIC_BRAND_ORG",
      skin === "craft" ? "Nordlicht Labs" : "Hartmann Fertigung GmbH",
    ),
    corpusLabel: pub("NEXT_PUBLIC_BRAND_CORPUS_LABEL", copy.corpusLabel),
    accent: pub("NEXT_PUBLIC_BRAND_ACCENT", skin === "craft" ? "#1d4ed8" : "#0f4c45"),
    initial: pub("NEXT_PUBLIC_BRAND_INITIAL", initialDefault),
    logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || null,
    githubUrl:
      process.env.NEXT_PUBLIC_BRAND_GITHUB_URL?.trim() ||
      "https://github.com/jakob-alexander2000/citebot",
    footerNote: pub("NEXT_PUBLIC_BRAND_FOOTER", copy.footerNote),
    description: pub("NEXT_PUBLIC_BRAND_DESCRIPTION", copy.description),
    skin,
    bilingual,
  };
}
