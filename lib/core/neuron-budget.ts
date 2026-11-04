import { readEnv } from "./models";

/** Published Workers AI rates, neurons per 1,000,000 tokens. Source: Cloudflare pricing, 20 Oct 2026. */
const RATES: Record<string, { input: number; output: number }> = {
  "@cf/baai/bge-m3": { input: 1075, output: 0 },
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { input: 26668, output: 204805 },
  "@cf/zai-org/glm-4.7-flash": { input: 5500, output: 36400 },
};

const FALLBACK_RATE = RATES["@cf/meta/llama-3.3-70b-instruct-fp8-fast"]!;

export const DEFAULT_NEURON_SOFT_CAP = 6_000;

let used = 0;
let dayKey = utcDay(Date.now());

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function roll(now = Date.now()): void {
  const next = utcDay(now);
  if (next !== dayKey) {
    dayKey = next;
    used = 0;
  }
}

export function resetNeuronBudgetForTests(now = Date.now()): void {
  used = 0;
  dayKey = utcDay(now);
}

export function neuronSoftCap(env: NodeJS.ProcessEnv = process.env): number {
  const raw = readEnv("CITEBOT_NEURON_SOFT_CAP", env);
  if (!raw) return DEFAULT_NEURON_SOFT_CAP;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_NEURON_SOFT_CAP;
}

/** Rough token count. This is an estimate, not Cloudflare's meter. */
export function estimateTokens(chars: number): number {
  if (chars <= 0) return 0;
  return Math.ceil(chars / 4);
}

export function estimateNeurons(model: string, inputChars: number, outputChars = 0): number {
  const rate = RATES[model] ?? FALLBACK_RATE;
  const neurons =
    (estimateTokens(inputChars) * rate.input + estimateTokens(outputChars) * rate.output) / 1_000_000;
  return Number(neurons.toFixed(4));
}

export function neuronsUsedToday(now = Date.now()): number {
  roll(now);
  return Number(used.toFixed(4));
}

export function canSpendNeurons(estimate: number, env: NodeJS.ProcessEnv = process.env, now = Date.now()): boolean {
  roll(now);
  return used + estimate <= neuronSoftCap(env);
}

export function recordNeurons(input: {
  kind: "embed" | "generate";
  model: string;
  estimated: number;
  now?: number;
}): number {
  roll(input.now ?? Date.now());
  used = Number((used + input.estimated).toFixed(4));
  console.info(
    JSON.stringify({
      citebot_neurons: {
        kind: input.kind,
        model: input.model,
        estimated: input.estimated,
        usedToday: used,
      },
    }),
  );
  return used;
}
