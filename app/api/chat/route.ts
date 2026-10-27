import { NextResponse } from "next/server";
import { z } from "zod";
import { ProviderUnavailableError } from "@/lib/llm";
import { answerWithCitations } from "@/lib/rag";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Send a non-empty question (max 1000 chars)." },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Server is missing GEMINI_API_KEY. Add it to .env.local and restart.",
        },
        { status: 503 },
      );
    }

    const result = await answerWithCitations(parsed.data.question);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      console.warn("[citebot/chat] provider unavailable", err.attempts);
      return NextResponse.json(
        {
          error:
            "AI provider is temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[citebot/chat]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
