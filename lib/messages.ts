import type { Locale } from "./locale";

export type UiCopy = {
  navAsk: string;
  navHandbook: string;
  navHarness: string;
  homeLead: string;
  homeAsk: string;
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
  navAsk: "Ask",
  navHandbook: "Handbook",
  navHarness: "Harness",
  homeLead:
    "CiteBot answers questions from one employee handbook. It reads those pages, cites the passage, and checks each claim against that passage.",
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
  placeholder: "Ask about time off, expenses, desk days…",
  ask: "Ask",
  reading: "Reading the handbook…",
  sources: "Sources",
  steps: "Steps",
  toolOne: "tool",
  toolMany: "tools",
  handbookTitle: "Employee handbook",
  handbookKicker: "Pages",
  handbookIntro: (count, name) =>
    `The ${count} page${count === 1 ? "" : "s"} ${name} can cite.`,
  askInChat: "Ask in the chat",
  loadingHandbook: "Loading handbook…",
  noDocs: "No handbook documents found.",
  metaTitle: (name) => `${name} — Handbook answers`,
  askMeta: (name) => `Ask · ${name}`,
};

export function ui(locale: Locale = "en"): UiCopy {
  void locale;
  return EN;
}
