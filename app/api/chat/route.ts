import { NextResponse } from "next/server";
import { z } from "zod";
import { brandSkin } from "@/lib/brand";
import { getLocaleState } from "@/lib/request-locale";
import type { Locale } from "@/lib/locale";
import { ProviderUnavailableError } from "@/lib/llm";
import { parseOnboardConfig, shouldApplyOnboard } from "@/lib/onboard";
import { answerOnboard, answerWithCitations } from "@/lib/rag";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1000),
  locale: z.enum(["de", "en"]).optional(),
  /** Present only from the CiteBot onboard page. Ignored on other skins. */
  onboard: z.unknown().optional(),
});

function apiError(locale: Locale, kind: "question" | "key" | "down"): string {
  if (locale === "de") {
    if (kind === "question") return "Bitte eine Frage senden (höchstens 1000 Zeichen).";
    if (kind === "key") {
      return "Auf dem Server fehlt GEMINI_API_KEY. Tragen Sie den Schlüssel in .env.local ein und starten Sie neu.";
    }
    return "Der KI-Anbieter ist vorübergehend nicht erreichbar. Bitte versuchen Sie es gleich noch einmal.";
  }
  if (kind === "question") return "Send a non-empty question (max 1000 chars).";
  if (kind === "key") {
    return "Server is missing GEMINI_API_KEY. Add it to .env.local and restart.";
  }
  return "AI provider is temporarily unavailable. Please try again in a moment.";
}

export async function POST(request: Request) {
  let locale: Locale = await getLocaleState()
    .then((state) => state.locale)
    .catch(() => "en" as const);
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (parsed.success && parsed.data.locale) locale = parsed.data.locale;
    if (!parsed.success) {
      return NextResponse.json({ error: apiError(locale, "question") }, { status: 400 });
    }

    const useOnboard =
      parsed.data.onboard !== undefined && shouldApplyOnboard(brandSkin());
    if (!process.env.GEMINI_API_KEY && !useOnboard) {
      return NextResponse.json({ error: apiError(locale, "key") }, { status: 503 });
    }

    const result = useOnboard
      ? await answerOnboard(parsed.data.question, parseOnboardConfig(parsed.data.onboard))
      : await answerWithCitations(parsed.data.question, locale);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      console.warn("[citebot/chat] provider unavailable", err.attempts);
      return NextResponse.json({ error: apiError(locale, "down") }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[citebot/chat]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
