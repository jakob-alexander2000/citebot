/**
 * White-label brand config (NEXT_PUBLIC_* — safe for client + server).
 * Defaults = CiteBot / Nordlicht demo. Override per Vercel project for each client.
 */
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

export function getBrand(): Brand {
  const name = pub("NEXT_PUBLIC_BRAND_NAME", "CiteBot");
  const initialDefault = name.charAt(0).toUpperCase() || "C";
  return {
    name,
    tagline: pub("NEXT_PUBLIC_BRAND_TAGLINE", "Ask the handbook."),
    taglineLine2: pub("NEXT_PUBLIC_BRAND_TAGLINE_2", "Get the source."),
    org: pub("NEXT_PUBLIC_BRAND_ORG", "Nordlicht Labs"),
    corpusLabel: pub(
      "NEXT_PUBLIC_BRAND_CORPUS_LABEL",
      "employee handbook",
    ),
    accent: pub("NEXT_PUBLIC_BRAND_ACCENT", "#18181b"),
    initial: pub("NEXT_PUBLIC_BRAND_INITIAL", initialDefault),
    logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || null,
    githubUrl:
      process.env.NEXT_PUBLIC_BRAND_GITHUB_URL?.trim() ||
      "https://github.com/jakob-alexander2000/citebot",
    footerNote: pub(
      "NEXT_PUBLIC_BRAND_FOOTER",
      "Demo corpus only — not legal or HR advice.",
    ),
    description: pub(
      "NEXT_PUBLIC_BRAND_DESCRIPTION",
      "Ask a sample employee handbook and get answers with source citation chips.",
    ),
  };
}
