import { getBrand } from "./brand";
import type { Locale } from "./locale";
import {
  executeTool,
  isToolName,
  type ToolExecution,
  type ToolName,
  type ToolRuntime,
} from "./tools";
import type { AgentStep, ChatResponse, Chunk, Citation, Verification } from "./types";

/** Hard cap on handbook tool calls per question. */
export const MAX_TOOL_ROUNDS = 3;

/** How much of a chunk the model and the verifier both see. Chips stay shorter. */
const PASSAGE_CHARS = 1200;

export const AGENT_LOOP_STOP_MESSAGE =
  "Stopped after 3 tool rounds — the model kept calling tools instead of answering. Try a narrower handbook question.";

export const AGENT_DRAFT_STOP_MESSAGE =
  "Stopped after 3 tool rounds — the handbook search did not produce an answer. Try a narrower question.";

export const AGENT_LOOP_STOP_MESSAGE_DE =
  "Nach 3 Werkzeugrunden gestoppt — das Modell hat weiter Werkzeuge aufgerufen, statt zu antworten. Bitte eine engere Frage zum Handbuch stellen.";

export const AGENT_DRAFT_STOP_MESSAGE_DE =
  "Nach 3 Werkzeugrunden gestoppt — die Handbuchsuche hat keine Antwort ergeben. Bitte eine engere Frage stellen.";

export type GenerateFn = (prompt: string) => Promise<string>;

export type VerifyFn = (
  question: string,
  answer: string,
  citations: Citation[],
) => Promise<Verification>;

export type ModelTurn =
  | { action: "tool"; tool: ToolName; input: Record<string, unknown>; plan?: string }
  | { action: "answer"; answer: string; plan?: string };

type Observation = {
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  body: string;
};

export type AgentLoopInput = {
  question: string;
  chunks: Chunk[];
  generate: GenerateFn;
  search: (query: string, topK?: number) => Promise<Citation[]>;
  verify: VerifyFn;
  /** Answer, evidence prompt, and visible step labels. Defaults to English. */
  locale?: Locale;
};

const INPUT_KEYS = ["query", "id", "source", "title", "quote", "citationId", "topK"] as const;

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

function readInput(row: Record<string, unknown>): Record<string, unknown> {
  const base =
    row.input && typeof row.input === "object" && !Array.isArray(row.input)
      ? { ...(row.input as Record<string, unknown>) }
      : {};
  for (const key of INPUT_KEYS) {
    if (base[key] == null && row[key] != null) base[key] = row[key];
  }
  return base;
}

/** Pull one tool call or a final answer out of a model response. No network. */
export function parseModelTurn(raw: string): ModelTurn | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const row = parsed as Record<string, unknown>;
  const plan = typeof row.plan === "string" ? row.plan.trim() : undefined;
  const action = typeof row.action === "string" ? row.action.trim() : "";
  const toolRaw = typeof row.tool === "string" ? row.tool.trim() : "";
  const answer = typeof row.answer === "string" ? row.answer.trim() : "";

  const toolAction = action === "tool" || (!action && isToolName(toolRaw));
  if (toolAction && isToolName(toolRaw)) {
    return { action: "tool", tool: toolRaw, input: readInput(row), plan: plan || undefined };
  }

  if ((action === "answer" || (!action && answer)) && answer) {
    return { action: "answer", answer: answer.slice(0, 6000), plan: plan || undefined };
  }

  return null;
}

function callKey(tool: string, input: Record<string, unknown>): string {
  const keys = Object.keys(input).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of keys) normalized[key] = input[key];
  return `${tool}:${JSON.stringify(normalized)}`;
}

function mergeCitations(current: Citation[], incoming: Citation[]): Citation[] {
  const order: string[] = [];
  const byId = new Map<string, Citation>();
  for (const citation of [...current, ...incoming]) {
    const prev = byId.get(citation.id);
    if (!prev) {
      order.push(citation.id);
      byId.set(citation.id, citation);
      continue;
    }
    if (citation.score > prev.score) byId.set(citation.id, citation);
  }
  return order.slice(0, 8).map((id) => byId.get(id)!);
}

function citationsForVerify(citations: Citation[], chunks: Chunk[]): Citation[] {
  return citations.map((citation) => {
    const full = chunks.find((chunk) => chunk.id === citation.id)?.text;
    if (!full || full.length <= citation.snippet.length) return citation;
    const snippet =
      full.length > PASSAGE_CHARS ? `${full.slice(0, PASSAGE_CHARS).trimEnd()}…` : full;
    return { ...citation, snippet };
  });
}

function passagesBlock(citations: Citation[], chunks: Chunk[]): string {
  if (citations.length === 0) return "(none yet)";
  return citations
    .map((citation, index) => {
      const full = chunks.find((chunk) => chunk.id === citation.id)?.text ?? citation.snippet;
      const text = full.length > PASSAGE_CHARS ? `${full.slice(0, PASSAGE_CHARS).trimEnd()}…` : full;
      return `[${index + 1}] id=${citation.id} source=${citation.source} title=${citation.title}\n${text}`;
    })
    .join("\n\n");
}

function buildPrompt(args: {
  question: string;
  history: Observation[];
  citations: Citation[];
  chunks: Chunk[];
  mode: "act" | "draft";
  toolRounds: number;
  locale: Locale;
}): string {
  const brand = getBrand(args.locale);
  const observations = args.history.length
    ? args.history
        .map(
          (item, index) =>
            `(${index + 1}) ${item.tool} ${JSON.stringify(item.input)}\n${item.summary}\n${item.body}`,
        )
        .join("\n\n")
    : args.locale === "de"
      ? "(noch keine)"
      : "(none yet)";

  const contract =
    args.locale === "de"
      ? args.mode === "draft"
        ? `Die Werkzeuge sind geschlossen. Nur JSON zurückgeben:
{"action":"answer","answer":"..."}
Kein weiteres Werkzeug anfordern. Wenn die Textstellen die Frage nicht abdecken, sage, dass das Handbuch das nicht behandelt.`
        : `Nur JSON, eine Aktion:
{"action":"tool","plan":"kurzer Grund","tool":"search_handbook"|"list_topics"|"get_section"|"quote_check","input":{}}
oder, sobald die Textstellen reichen:
{"action":"answer","answer":"..."}

Werkzeugrunden: ${args.toolRounds} von ${MAX_TOOL_ROUNDS}. Zuerst search_handbook. Keinen Aufruf wiederholen. Keine Handbuchfakten erfinden.`
      : args.mode === "draft"
        ? `Tools are closed. Return JSON only:
{"action":"answer","answer":"..."}
Do not request another tool. If the passages do not cover the question, say the handbook does not cover it.`
        : `Return JSON only, one action:
{"action":"tool","plan":"short reason","tool":"search_handbook"|"list_topics"|"get_section"|"quote_check","input":{}}
or, once the passages are enough:
{"action":"answer","answer":"..."}

Tool rounds used: ${args.toolRounds} of ${MAX_TOOL_ROUNDS}. Prefer search_handbook first. Do not repeat a call. Do not invent handbook facts.`;

  if (args.locale === "de") {
    return `Du bist ${brand.name}, ein knapper Assistent für das ${brand.corpusLabel} der ${brand.org}.
Antworte nur anhand der Handbuch-Werkzeuge und der Textstellen unten. Kein Web. Kein Außenwissen.
Antworte auf Deutsch, in 2–6 Sätzen. Zitiere Textstellen inline als [n], passend zu den Nummern unten.
Die JSON-Schlüssel bleiben Englisch. Nur das Feld answer ist Deutsch.

Werkzeuge:
- search_handbook input {"query":"..."} — Textstellen suchen
- list_topics input {} — Dokumenttitel und Abschnitte
- get_section input {"id":"..."} oder {"source":"..."} oder {"title":"..."} — einen Abschnitt öffnen
- quote_check input {"quote":"..."} — prüfen, ob ein Zitat im Handbuch steht

${contract}

Frage:
${args.question}

Werkzeugbeobachtungen:
${observations}

Textstellen:
${passagesBlock(args.citations, args.chunks)}`;
  }

  return `You are ${brand.name}, a concise assistant for the ${brand.org} ${brand.corpusLabel}.
Answer only from the handbook tools and passages below. No web. No outside knowledge.
Write the answer in English. Keep answers to 2–6 sentences. Cite passages inline as [n] matching the numbers below.

Tools:
- search_handbook input {"query":"..."} — retrieve passages
- list_topics input {} — list document titles and sections
- get_section input {"id":"..."} or {"source":"..."} or {"title":"..."} — open a section
- quote_check input {"quote":"..."} — check whether a quote appears in the handbook

${contract}

Question:
${args.question}

Tool observations:
${observations}

Passages:
${passagesBlock(args.citations, args.chunks)}`;
}

function isFatalToolError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return (
    message.includes("GEMINI_API_KEY") || message.includes("No corpus documents")
  );
}

/**
 * Plan → up to 3 corpus tools → draft → existing verify.
 * `generate` and `verify` are injected so fixture tests never call a model.
 */
export async function runAgentLoop(input: AgentLoopInput): Promise<ChatResponse> {
  const locale: Locale = input.locale ?? "en";
  const runtime: ToolRuntime = {
    chunks: input.chunks,
    search: input.search,
    locale,
  };
  const stops =
    locale === "de"
      ? { loop: AGENT_LOOP_STOP_MESSAGE_DE, draft: AGENT_DRAFT_STOP_MESSAGE_DE }
      : { loop: AGENT_LOOP_STOP_MESSAGE, draft: AGENT_DRAFT_STOP_MESSAGE };
  const labels =
    locale === "de"
      ? {
          plan: "Plan",
          draft: "Entwurf",
          stopped: "Gestoppt",
          skipped: "Übersprungen — dieser Aufruf lief bereits.",
          invalid: "Die Modellausgabe war kein verwendbares JSON.",
          limit: "Werkzeuggrenze erreicht, bevor eine Handbuchantwort vorlag.",
        }
      : {
          plan: "Plan",
          draft: "Draft",
          stopped: "Stopped",
          skipped: "Skipped — this call already ran.",
          invalid: "Model output was not usable JSON.",
          limit: "Tool limit reached before a handbook answer.",
        };
  const steps: AgentStep[] = [];
  const history: Observation[] = [];
  const seen = new Set<string>();
  let citations: Citation[] = [];
  let toolRounds = 0;
  let stalls = 0;
  let draft: string | null = null;
  let stoppedEarly = false;
  let planned = false;

  const notePlan = (plan?: string) => {
    if (!plan || planned) return;
    planned = true;
    steps.push({ kind: "plan", label: labels.plan, detail: clip(plan, 180) });
  };

  const applyTool = async (
    tool: ToolName,
    toolInput: Record<string, unknown>,
  ): Promise<"ok" | "repeat"> => {
    const key = callKey(tool, toolInput);
    if (seen.has(key)) {
      steps.push({
        kind: "tool",
        tool,
        label: tool,
        detail: labels.skipped,
      });
      return "repeat";
    }
    seen.add(key);

    let execution: ToolExecution;
    try {
      execution = await executeTool(tool, toolInput, runtime);
    } catch (err) {
      if (isFatalToolError(err)) throw err;
      const message = err instanceof Error ? err.message : "Tool failed.";
      execution = {
        ok: false,
        summary: clip(message, 180),
        body: message,
        citations: [],
      };
    }

    toolRounds += 1;
    citations = mergeCitations(citations, execution.citations);
    history.push({
      tool,
      input: toolInput,
      summary: execution.summary,
      body: clip(execution.body, 1200),
    });
    steps.push({
      kind: "tool",
      tool,
      label: tool,
      detail: clip(execution.summary, 180),
    });
    return "ok";
  };

  while (toolRounds < MAX_TOOL_ROUNDS && stalls < 2 && draft === null) {
    const raw = await input.generate(
      buildPrompt({
        question: input.question,
        history,
        citations,
        chunks: input.chunks,
        mode: "act",
        toolRounds,
        locale,
      }),
    );
    const turn = parseModelTurn(raw);
    if (!turn) {
      stalls += 1;
      history.push({
        tool: "invalid",
        input: {},
        summary: labels.invalid,
        body: clip(raw, 400),
      });
      continue;
    }

    notePlan(turn.plan);

    if (turn.action === "answer") {
      if (toolRounds === 0) {
        const status = await applyTool("search_handbook", { query: input.question });
        if (status === "repeat") break;
        continue;
      }
      draft = turn.answer;
      break;
    }

    const status = await applyTool(turn.tool, turn.input);
    if (status === "repeat") break;
  }

  if (draft === null && toolRounds === 0) {
    await applyTool("search_handbook", { query: input.question });
  }

  if (draft === null) {
    const raw = await input.generate(
      buildPrompt({
        question: input.question,
        history,
        citations,
        chunks: input.chunks,
        mode: "draft",
        toolRounds,
        locale,
      }),
    );
    const turn = parseModelTurn(raw);
    notePlan(turn?.plan);
    if (turn?.action === "answer") {
      draft = turn.answer;
    } else if (turn?.action === "tool") {
      stoppedEarly = true;
      draft = stops.loop;
    } else {
      stoppedEarly = true;
      draft = stops.draft;
    }
  }

  if (stoppedEarly) {
    steps.push({
      kind: "stop",
      label: labels.stopped,
      detail: labels.limit,
    });
  } else {
    steps.push({ kind: "draft", label: labels.draft, detail: clip(draft!, 180) });
  }

  const verification = await input.verify(
    input.question,
    draft!,
    citationsForVerify(citations, input.chunks),
  );
  return {
    answer: draft!,
    citations,
    verification,
    steps,
    stoppedEarly,
  };
}
