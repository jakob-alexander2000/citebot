import { isQuotaFailure, QuotaExceededError } from "./models";
import { estimateNeurons, recordNeurons } from "./neuron-budget";
import type { GenerateRequest, GenerateResult, ModelProvider } from "./provider";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type WorkersAiOptions = {
  accountId: string;
  apiToken: string;
  model: string;
  fallbackModel: string;
  embedModel: string;
  fetchImpl?: FetchLike;
};

export class CloudflareWorkersAI implements ModelProvider {
  readonly id = "workers-ai" as const;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: WorkersAiOptions) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    try {
      const text = await this.complete(this.options.model, request);
      return { text, model: this.options.model, via: "primary" };
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      const text = await this.complete(this.options.fallbackModel, request);
      return { text, model: this.options.fallbackModel, via: "fallback" };
    }
  }

  async embed(texts: string[]): Promise<number[][] | null> {
    if (texts.length === 0) return [];
    const out: number[][] = [];
    const batchSize = 8;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const vectors = await this.embedBatch(batch);
      if (!vectors || vectors.length !== batch.length) return null;
      out.push(...vectors);
    }
    return out;
  }

  private async embedBatch(texts: string[]): Promise<number[][] | null> {
    const url = this.endpoint(this.options.embedModel);
    const inputChars = texts.reduce((sum, text) => sum + text.length, 0);
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text: texts }),
    });
    const parsed = await readJson(response);
    if (isQuotaFailure(response.status, parsed)) {
      recordNeurons({
        kind: "embed",
        model: this.options.embedModel,
        estimated: estimateNeurons(this.options.embedModel, inputChars),
      });
      throw new QuotaExceededError();
    }
    if (!response.ok) return null;
    const vectors = readVectors(parsed, texts.length);
    if (vectors) {
      recordNeurons({
        kind: "embed",
        model: this.options.embedModel,
        estimated: estimateNeurons(this.options.embedModel, inputChars),
      });
    }
    return vectors;
  }

  private async complete(model: string, request: GenerateRequest): Promise<string> {
    const url = this.endpoint(model);
    const payload = JSON.stringify({ messages: messagesFor(request) });
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: this.headers(),
        body: payload,
      });
    } catch (err) {
      throw this.scrub(err);
    }
    const parsed = await readJson(response);
    if (isQuotaFailure(response.status, parsed)) {
      recordNeurons({
        kind: "generate",
        model,
        estimated: estimateNeurons(model, payload.length),
      });
      throw new QuotaExceededError();
    }
    const success =
      parsed && typeof parsed === "object" && "success" in parsed
        ? (parsed as { success?: boolean }).success
        : undefined;
    if (!response.ok || success === false) {
      throw this.scrub(new Error(`Workers AI request failed with status ${response.status}`));
    }
    const text = readResponseText(parsed).replace(/\s+/g, " ").trim().slice(0, 4000);
    if (!text) {
      throw this.scrub(new Error(`Workers AI returned an empty result (status ${response.status})`));
    }
    recordNeurons({
      kind: "generate",
      model,
      estimated: estimateNeurons(model, payload.length, text.length),
    });
    return text;
  }

  private endpoint(model: string): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.options.accountId}/ai/run/${model}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  private scrub(err: unknown): Error {
    if (err instanceof QuotaExceededError) return err;
    const message = err instanceof Error ? err.message : "Workers AI request failed";
    const clean = message
      .split(this.options.apiToken)
      .join("[redacted]")
      .split(this.options.accountId)
      .join("[redacted]");
    return new Error(clean);
  }
}

function messagesFor(request: GenerateRequest): { role: string; content: string }[] {
  const language = request.locale === "de" ? "German" : "English";
  if (request.purpose === "context") {
    const section = (request.headingPath ?? []).filter(Boolean).join(" / ");
    return [
      {
        role: "system",
        content: `Write one short context sentence in ${language}. Say which document and section the passage belongs to. Do not add facts that are not in the title, the section, or the passage.`,
      },
      {
        role: "user",
        content: `Title: ${request.title ?? ""}\nSection: ${section}\nPassage:\n${request.passage ?? ""}`,
      },
    ];
  }
  const passages = (request.passages ?? [])
    .map((passage) => `[${passage.id}] ${passage.title}\n${passage.text}`)
    .join("\n\n");
  return [
    {
      role: "system",
      content: `Answer in ${language}. Use only the passages. Keep conditions such as only, unless, nur, außer, sofern, and erst nach. If the passages do not cover the question, say so in ${language}.`,
    },
    {
      role: "user",
      content: `Question: ${request.question ?? ""}\n\nPassages:\n${passages || "(none)"}`,
    },
  ];
}

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { unparsed: true };
  }
}

function readResponseText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const result = (body as { result?: unknown }).result;
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const response = (result as { response?: unknown }).response;
    if (typeof response === "string") return response;
  }
  return "";
}

function readVectors(body: unknown, count: number): number[][] | null {
  if (!body || typeof body !== "object") return null;
  const result = (body as { result?: { data?: unknown } }).result;
  const data = result?.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  if (Array.isArray(data[0])) return data as number[][];
  if (typeof data[0] === "number" && count === 1) return [data as number[]];
  return null;
}
