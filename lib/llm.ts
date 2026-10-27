import { getGemini, getChatModel } from "./embeddings";

export type LlmProvider = "gemini" | "openai";

export type GenerateWithFallbackOptions = {
  prompt: string;
  /** Ask for JSON-shaped output (Gemini responseMimeType / OpenAI json_object). */
  json?: boolean;
  temperature?: number;
};

export type GenerateWithFallbackResult = {
  text: string;
  provider: LlmProvider;
  viaFallback: boolean;
};

export class ProviderUnavailableError extends Error {
  readonly attempts: string[];

  constructor(message: string, attempts: string[]) {
    super(message);
    this.name = "ProviderUnavailableError";
    this.attempts = attempts;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Classify Gemini / Google API errors that merit retry or OpenAI fallback. */
export function isRetryableGeminiError(err: unknown): boolean {
  return isTransientGeminiError(err) || isGeminiModelNotFound(err);
}

export function isTransientGeminiError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("service unavailable") ||
    msg.includes("high demand") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("resource_exhausted") ||
    msg.includes("resource exhausted") ||
    msg.includes("too many requests")
  );
}

export function isGeminiModelNotFound(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("not_found") ||
    msg.includes("is not supported") ||
    msg.includes("unknown model")
  );
}

function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

async function generateGemini(
  options: GenerateWithFallbackOptions,
): Promise<string> {
  const client = getGemini();
  const model = client.getGenerativeModel({
    model: getChatModel(),
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  });
  const result = await model.generateContent(options.prompt);
  return result.response.text()?.trim() ?? "";
}

async function generateOpenAi(
  options: GenerateWithFallbackOptions,
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new ProviderUnavailableError(
      "OPENAI_API_KEY is not set — cannot fall back from Gemini.",
      ["openai: skipped (no API key)"],
    );
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      messages: [{ role: "user", content: options.prompt }],
      temperature: options.temperature ?? 0.2,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  const payload = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!res.ok) {
    const detail = payload.error?.message ?? res.statusText;
    throw new Error(`OpenAI chat (${res.status}): ${detail}`);
  }

  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error("OpenAI returned an empty completion.");
  }
  return text;
}

/**
 * Gemini first (with one retry on transient errors), then OpenAI when configured.
 * Non-retryable Gemini errors (bad request, auth) are not masked by fallback.
 */
export async function generateWithFallback(
  options: GenerateWithFallbackOptions,
): Promise<GenerateWithFallbackResult> {
  const attempts: string[] = [];

  const runGemini = async (): Promise<string> => {
    try {
      return await generateGemini(options);
    } catch (err) {
      attempts.push(`gemini: ${errorMessage(err)}`);
      throw err;
    }
  };

  try {
    const text = await runGemini();
    return { text, provider: "gemini", viaFallback: false };
  } catch (firstErr) {
    if (!isRetryableGeminiError(firstErr)) {
      throw firstErr;
    }

    if (isTransientGeminiError(firstErr)) {
      try {
        const text = await runGemini();
        return { text, provider: "gemini", viaFallback: false };
      } catch (retryErr) {
        if (!isRetryableGeminiError(retryErr)) {
          throw retryErr;
        }
      }
    }
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.warn(
      "[citebot/llm] Gemini unavailable and OPENAI_API_KEY is missing — fallback skipped.",
    );
    throw new ProviderUnavailableError(
      "AI provider is temporarily unavailable. Please try again in a moment.",
      attempts,
    );
  }

  try {
    const text = await generateOpenAi(options);
    return { text, provider: "openai", viaFallback: true };
  } catch (err) {
    attempts.push(`openai: ${errorMessage(err)}`);
    throw new ProviderUnavailableError(
      "AI provider is temporarily unavailable. Please try again in a moment.",
      attempts,
    );
  }
}
