import { brandSkin, isBilingual } from "./brand";
import type { Locale } from "./locale";

export type UiCopy = {
  language: string;
  languageDe: string;
  languageEn: string;
  navAsk: string;
  navHandbook: string;
  navHarness: string;
  /** Shown beside the corpus label when the product is bilingual. */
  homeLocales: string;
  homeLead: string;
  homeAsk: string;
  /** Ask-page headline for the craft demo. Product ask uses the brand tagline. */
  askHeadline: string;
  homeHarness: string;
  homeHandbook: string;
  homeVerifyTitle: string;
  homeVerifyBody: string;
  homeHarnessLink: string;
  homeTryTitle: string;
  covered: string;
  openHandbook: string;
  tryAsking: string;
  askLead: string;
  readHandbook: string;
  howHarness: string;
  placeholder: string;
  ask: string;
  reading: string;
  sources: string;
  steps: string;
  toolOne: string;
  toolMany: string;
  handbookTitle: string;
  handbookKicker: string;
  handbookIntro: (count: number, name: string) => string;
  askInChat: string;
  loadingHandbook: string;
  noDocs: string;
  metaTitle: (name: string) => string;
  askMeta: (name: string) => string;
};

const EN: UiCopy = {
  language: "Language",
  languageDe: "Deutsch",
  languageEn: "English",
  navAsk: "Ask",
  navHandbook: "Handbook",
  navHarness: "Harness",
  homeLocales: "German and English",
  homeLead:
    "Ask the quality handbook in German or English. Answers stay inside those documents: a short tool loop reads the handbook, then a verify step checks each claim against the passages it used.",
  homeAsk: "Ask the handbook",
  askHeadline: "Ask the quality handbook.",
  homeHarness: "How verify works",
  homeHandbook: "Handbook",
  homeVerifyTitle: "How verify works",
  homeVerifyBody:
    "After the draft, one shared step splits the answer into claims and marks each pass, fail, or unsupported against the same passages. A correct “not in the handbook” refusal counts as pass. The Evidence panel shows the quote.",
  homeHarnessLink: "the verify harness",
  homeTryTitle: "Questions to try",
  covered: "What's covered",
  openHandbook: "Open handbook",
  tryAsking: "Try asking",
  askLead:
    "Document-grounded answers only. The loop reads the quality handbook, then verify checks each claim against those passages.",
  readHandbook: "Read the handbook",
  howHarness: "How verify works",
  placeholder: "Ask the quality handbook…",
  ask: "Ask",
  reading: "Reading the handbook…",
  sources: "Sources",
  steps: "Steps",
  toolOne: "tool",
  toolMany: "tools",
  handbookTitle: "Handbook",
  handbookKicker: "Corpus",
  handbookIntro: (count, name) =>
    `The ${count} document${count === 1 ? "" : "s"} ${name} retrieves from in this language.`,
  askInChat: "Ask in the chat",
  loadingHandbook: "Loading handbook…",
  noDocs: "No handbook documents found.",
  metaTitle: (name) => `${name} — Quality handbook`,
  askMeta: (name) => `Ask · ${name}`,
};

const DE: UiCopy = {
  language: "Sprache",
  languageDe: "Deutsch",
  languageEn: "English",
  navAsk: "Fragen",
  navHandbook: "Handbuch",
  navHarness: "Nachweis",
  homeLocales: "Deutsch und Englisch",
  homeLead:
    "Fragen Sie das QM-Handbuch auf Deutsch oder Englisch. Antworten bleiben in diesen Dokumenten: eine kurze Werkzeugschleife liest das Handbuch, danach prüft ein Nachweis jede Aussage gegen die verwendeten Textstellen.",
  homeAsk: "Handbuch fragen",
  askHeadline: "Fragen Sie das QM-Handbuch.",
  homeHarness: "So funktioniert der Nachweis",
  homeHandbook: "Handbuch",
  homeVerifyTitle: "So funktioniert der Nachweis",
  homeVerifyBody:
    "Nach dem Entwurf zerlegt ein gemeinsamer Schritt die Antwort in Aussagen und markiert jede als belegt, Widerspruch oder nicht belegt — gegen dieselben Textstellen. Eine korrekte Auskunft „steht nicht im Handbuch“ gilt als belegt. Das Nachweis-Feld zeigt das Zitat.",
  homeHarnessLink: "den Nachweis",
  homeTryTitle: "Fragen zum Ausprobieren",
  covered: "Themen",
  openHandbook: "Handbuch öffnen",
  tryAsking: "Fragen Sie zum Beispiel",
  askLead:
    "Antworten nur aus dem QM-Handbuch. Die Schleife liest die Dokumente, danach prüft der Nachweis jede Aussage gegen diese Textstellen.",
  readHandbook: "Handbuch lesen",
  howHarness: "So funktioniert der Nachweis",
  placeholder: "Fragen Sie das QM-Handbuch…",
  ask: "Fragen",
  reading: "Handbuch wird gelesen…",
  sources: "Quellen",
  steps: "Schritte",
  toolOne: "Werkzeug",
  toolMany: "Werkzeuge",
  handbookTitle: "Handbuch",
  handbookKicker: "Korpus",
  handbookIntro: (count, name) =>
    count === 1
      ? `Das Dokument, aus dem ${name} in dieser Sprache antwortet.`
      : `Die ${count} Dokumente, aus denen ${name} in dieser Sprache antwortet.`,
  askInChat: "Im Chat fragen",
  loadingHandbook: "Handbuch wird geladen…",
  noDocs: "Keine Handbuchdokumente gefunden.",
  metaTitle: (name) => `${name} — QM-Handbuch`,
  askMeta: (name) => `Fragen · ${name}`,
};

/** English chrome for a client deploy that has not opted into DE|EN. */
const MONO_EN: UiCopy = {
  ...EN,
  homeLead:
    "Ask the handbook. Answers stay inside those documents: a short tool loop reads the handbook, then a verify step checks each claim against the passages it used.",
  askLead:
    "Document-grounded answers only. The loop reads the handbook, then verify checks each claim against those passages.",
  placeholder: "Ask the handbook…",
  askHeadline: "Ask the handbook.",
};

/**
 * CiteBot hire demo. English employee-handbook tone — not the QM product.
 * Nordlicht specifics stay in brand env (org, corpus) and the demo chips.
 */
const CRAFT: UiCopy = {
  ...EN,
  homeLocales: "English",
  homeLead:
    "is a working demo over one employee handbook. It reads those pages, then checks each claim against the passage it used.",
  homeAsk: "Try a question",
  askHeadline: "What does the handbook say?",
  homeHarness: "How the check works",
  homeHandbook: "Read the pages",
  homeVerifyTitle: "The check",
  homeVerifyBody:
    "After the draft, one step splits the answer into claims and marks each pass, fail, or unsupported against the same passages. If the page doesn't say it, a straight refusal counts as pass.",
  homeHarnessLink: "how the check works",
  homeTryTitle: "From the employee handbook",
  covered: "In the handbook",
  openHandbook: "Read the pages",
  tryAsking: "Try one",
  askLead:
    "Questions stay inside this employee handbook. The loop reads a page, then verify checks the claim against that passage.",
  readHandbook: "Read the pages",
  howHarness: "How the check works",
  placeholder: "Ask about time off, expenses, remote days…",
  handbookTitle: "Employee handbook",
  handbookKicker: "Demo",
  handbookIntro: (count, name) =>
    `The ${count} page${count === 1 ? "" : "s"} ${name} can cite in this demo.`,
  metaTitle: (name) => `${name} — Employee handbook demo`,
};

export function ui(locale: Locale): UiCopy {
  const skin = brandSkin();
  const bilingual = isBilingual();
  if (skin === "craft") {
    if (bilingual && locale === "de") return DE;
    return CRAFT;
  }
  if (!bilingual) return MONO_EN;
  return locale === "de" ? DE : EN;
}
