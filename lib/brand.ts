/**
 * CiteBot brand. English handbook Q&A.
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

const BRAND: Brand = {
  name: "CiteBot",
  tagline: "Ask the handbook.",
  taglineLine2: "See the line it came from.",
  org: "Nordlicht Labs",
  corpusLabel: "employee handbook",
  accent: "#1d4ed8",
  initial: "C",
  logoUrl: null,
  githubUrl: "https://github.com/jakob-alexander2000/citebot",
  footerNote: "Sample employee handbook. Not legal advice.",
  description:
    "CiteBot answers questions from a sample employee handbook, cites the passage, and checks each claim.",
};

export function getBrand(locale: Locale = "en"): Brand {
  void locale;
  return BRAND;
}
