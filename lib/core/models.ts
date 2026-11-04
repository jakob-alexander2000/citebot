export const WORKERS_AI_DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const WORKERS_AI_DEFAULT_FALLBACK_MODEL = "@cf/zai-org/glm-4.7-flash";
export const WORKERS_AI_DEFAULT_EMBED_MODEL = "@cf/baai/bge-m3";
export const WORKERS_AI_NEURONS_PER_DAY = 10_000;
export const WORKERS_AI_QUOTA_RESET = "00:00 UTC";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_PAGES = 50;
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const UPLOAD_RATE_LIMIT = 10;
export const UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000;

export function readEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

/** Daily neuron allowance is used up, or the Workers AI call came back as HTTP 429. */
export class QuotaExceededError extends Error {
  readonly code = "quota_exceeded" as const;
  constructor(
    message = "Workers AI daily neuron allowance is used up. It resets at 00:00 UTC.",
  ) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export function isQuotaFailure(status: number, body: unknown): boolean {
  if (status === 429) return true;
  const text = JSON.stringify(body ?? "").toLowerCase();
  if (text.includes("neuron")) return true;
  if (text.includes("quota")) return true;
  if (text.includes("daily") && text.includes("limit")) return true;
  return false;
}
