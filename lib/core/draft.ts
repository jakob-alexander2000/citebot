import type { Locale } from "../locale";
import { relevantSentences } from "./text";

export function gapSentence(locale: Locale): string {
  return locale === "de"
    ? "Die Unterlagen enthalten dazu nichts."
    : "The documents do not cover that.";
}

export function deterministicContext(input: {
  title: string;
  headingPath: string[];
  locale: Locale;
}): string {
  const section = input.headingPath.filter(Boolean).join(" / ") || input.title;
  if (input.locale === "de") {
    return `Dieser Abschnitt stammt aus „${input.title}“, Abschnitt „${section}“.`;
  }
  return `This passage is from "${input.title}", section "${section}".`;
}

export function oneSentence(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const cut = flat.split(/(?<=[.!?])\s/)[0] ?? flat;
  return cut.slice(0, 400);
}

export function extractiveDraft(
  question: string,
  passages: { text: string }[],
  locale: Locale,
): string {
  const top = passages[0];
  if (!top) return gapSentence(locale);
  const picked = relevantSentences(question, top.text)
    .map((span) => span.text.trim())
    .filter(Boolean);
  if (picked.length === 0) return gapSentence(locale);
  return picked.join(" ");
}
