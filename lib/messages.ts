import type { Locale } from "./locale";

export type UiCopy = {
  language: string;
  languageDe: string;
  languageEn: string;
  navAsk: string;
  navHandbook: string;
  navHarness: string;
  homeLead: string;
  homeAsk: string;
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
  homeLead:
    "Ask the quality handbook in German or English. Answers stay inside those documents: a short tool loop reads the handbook, then a verify step checks each claim against the passages it used.",
  homeAsk: "Ask the handbook",
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
  homeLead:
    "Fragen Sie das QM-Handbuch auf Deutsch oder Englisch. Antworten bleiben in diesen Dokumenten: eine kurze Werkzeugschleife liest das Handbuch, danach prüft ein Nachweis jede Aussage gegen die verwendeten Textstellen.",
  homeAsk: "Handbuch fragen",
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

export function ui(locale: Locale): UiCopy {
  return locale === "de" ? DE : EN;
}
