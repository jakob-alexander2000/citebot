import { MockModelProvider } from "./mock-provider";
import {
  readEnv,
  WORKERS_AI_DEFAULT_EMBED_MODEL,
  WORKERS_AI_DEFAULT_FALLBACK_MODEL,
  WORKERS_AI_DEFAULT_MODEL,
} from "./models";
import { CloudflareWorkersAI } from "./workers-ai";

export type ProviderId = "mock" | "workers-ai";

export type GenerateVia = "mock" | "primary" | "fallback";

export type GenerateRequest = {
  purpose: "context" | "draft";
  locale: "de" | "en";
  question?: string;
  title?: string;
  headingPath?: string[];
  passage?: string;
  passages?: { id: string; title: string; text: string }[];
};

export type GenerateResult = {
  text: string;
  model: string | null;
  via: GenerateVia;
};

export interface ModelProvider {
  readonly id: ProviderId;
  generate(request: GenerateRequest): Promise<GenerateResult>;
  embed?(texts: string[]): Promise<number[][] | null>;
}

export function workersCredentials(env: NodeJS.ProcessEnv = process.env): {
  accountId: string;
  apiToken: string;
} | null {
  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID", env);
  const apiToken = readEnv("CLOUDFLARE_API_TOKEN", env);
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

/**
 * Mock when credentials are missing, when CI sets CITEBOT_ALLOW_LIVE_MODEL=0,
 * or during unit tests unless a test opts in with CITEBOT_ALLOW_LIVE_MODEL=1.
 */
export function getModelProvider(env: NodeJS.ProcessEnv = process.env): ModelProvider {
  if (readEnv("CITEBOT_ALLOW_LIVE_MODEL", env) === "0") return new MockModelProvider();
  if (readEnv("CITEBOT_ALLOW_LIVE_MODEL", env) !== "1" && env.NODE_TEST_CONTEXT) {
    return new MockModelProvider();
  }
  const creds = workersCredentials(env);
  if (!creds) return new MockModelProvider();
  return new CloudflareWorkersAI({
    accountId: creds.accountId,
    apiToken: creds.apiToken,
    model: readEnv("WORKERS_AI_MODEL", env) || WORKERS_AI_DEFAULT_MODEL,
    fallbackModel:
      readEnv("WORKERS_AI_FALLBACK_MODEL", env) || WORKERS_AI_DEFAULT_FALLBACK_MODEL,
    embedModel: readEnv("WORKERS_AI_EMBED_MODEL", env) || WORKERS_AI_DEFAULT_EMBED_MODEL,
  });
}
