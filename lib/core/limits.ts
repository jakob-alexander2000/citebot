import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_PAGES,
  SESSION_TTL_MS,
  UPLOAD_RATE_LIMIT,
  UPLOAD_RATE_WINDOW_MS,
  WORKERS_AI_DEFAULT_FALLBACK_MODEL,
  WORKERS_AI_DEFAULT_MODEL,
  WORKERS_AI_NEURONS_PER_DAY,
  WORKERS_AI_QUOTA_RESET,
  readEnv,
} from "./models";
import { getModelProvider } from "./provider";

export function limitsPayload(env: NodeJS.ProcessEnv = process.env) {
  return {
    provider: getModelProvider(env).id,
    upload: {
      maxBytes: MAX_UPLOAD_BYTES,
      maxPages: MAX_UPLOAD_PAGES,
      sessionTtlMinutes: Math.round(SESSION_TTL_MS / 60000),
      rateLimit: {
        limit: UPLOAD_RATE_LIMIT,
        windowMinutes: Math.round(UPLOAD_RATE_WINDOW_MS / 60000),
      },
    },
    models: {
      main: readEnv("WORKERS_AI_MODEL", env) || WORKERS_AI_DEFAULT_MODEL,
      fallback: readEnv("WORKERS_AI_FALLBACK_MODEL", env) || WORKERS_AI_DEFAULT_FALLBACK_MODEL,
    },
    quota: {
      neuronsPerDay: WORKERS_AI_NEURONS_PER_DAY,
      resets: WORKERS_AI_QUOTA_RESET,
      note: "The Workers AI free allowance is 10,000 Neurons per day. On the Free plan, requests over that limit fail.",
    },
  };
}
