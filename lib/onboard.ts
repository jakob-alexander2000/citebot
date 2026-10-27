import { loadCorpusChunks } from "./corpus";
import { TOOL_NAMES, type ToolName } from "./tools";
import type {
  AgentStep,
  Citation,
  ClaimVerdict,
  Verification,
  VerificationSummary,
} from "./types";
import type { BrandSkin } from "./brand";

/** Session cookie. The value is URI-encoded JSON. No Max-Age: it ends with the browser session. */
export const ONBOARD_COOKIE = "cb_onboard";

/** Run log for the handoff ticket. Survives a reload in the same tab. */
export const ONBOARD_RUNS_KEY = "cb_onboard_runs";

const LABEL_MAX = 80;
const PROMPT_MAX = 600;

export const DEFAULT_CLIENT_LABEL = "Sample client";

export const DEFAULT_SYSTEM_PROMPT =
  "Answer only from the enabled client documents. If they do not cover the question, say so and do not guess. If the question is in German, answer in German. Otherwise answer in English.";

export type OnboardDoc = {
  id: string;
  title: string;
  /** Filename as stored on the chunk `source` field. */
  file: string;
  /** Project-relative folder. Not taken from the request. */
  dir: string;
  lang: "en" | "de";
  blurb: string;
};

/**
 * Sample pages the onboard path can turn on or off.
 * English pages are the Nordlicht handbook. German pages are a short client packet
 * used by the walkthrough. Neither replaces the product corpus.
 */
export const ONBOARD_DOCS: readonly OnboardDoc[] = [
  {
    id: "welcome",
    title: "Welcome",
    file: "welcome.md",
    dir: "examples/nordlicht-corpus",
    lang: "en",
    blurb: "How the handbook is organized.",
  },
  {
    id: "pto",
    title: "Time off and leave",
    file: "pto-and-leave.md",
    dir: "examples/nordlicht-corpus",
    lang: "en",
    blurb: "Vacation days and when unused PTO expires.",
  },
  {
    id: "expenses",
    title: "Expenses",
    file: "expense-policy.md",
    dir: "examples/nordlicht-corpus",
    lang: "en",
    blurb: "Client meals and receipt timing.",
  },
  {
    id: "tools",
    title: "Tools and security",
    file: "tools-and-security.md",
    dir: "examples/nordlicht-corpus",
    lang: "en",
    blurb: "Accounts and devices.",
  },
  {
    id: "demo-day",
    title: "Demo day",
    file: "demo-day.md",
    dir: "examples/nordlicht-corpus",
    lang: "en",
    blurb: "Friday demo time and slot length.",
  },
  {
    id: "dok",
    title: "Dokumentenlenkung",
    file: "dokumentenlenkung.md",
    dir: "examples/de-qm-corpus",
    lang: "de",
    blurb: "German document control. Retention is five years.",
  },
  {
    id: "arbeit",
    title: "Arbeitsschutz",
    file: "arbeitsschutz-grundlagen.md",
    dir: "examples/de-qm-corpus",
    lang: "de",
    blurb: "German safety basics.",
  },
  {
    id: "psa",
    title: "Schutzausrüstung",
    file: "schutzausruestung.md",
    dir: "examples/de-qm-corpus",
    lang: "de",
    blurb: "German protective equipment.",
  },
];

export const ONBOARD_TOOL_BLURB: Record<ToolName, string> = {
  search_handbook: "Search the enabled pages.",
  list_topics: "List titles and sections.",
  get_section: "Open one section.",
  quote_check: "Check a quote against the pages.",
};

export type OnboardConfig = {
  clientLabel: string;
  systemPrompt: string;
  enabledTools: ToolName[];
  documentIds: string[];
};

export type GuardrailStatus = "passed" | "refused" | "failed";

export type HandoffSource = {
  id: string;
  source: string;
  title: string;
};

export type HandoffToolCall = {
  name: string;
  detail: string;
};

export type HandoffClaim = {
  claim: string;
  verdict: ClaimVerdict;
};

export type HandoffRun = {
  at: string;
  question: string;
  answer: string;
  clientLabel: string;
  systemPrompt: string;
  enabledTools: ToolName[];
  documents: { id: string; title: string }[];
  sources: HandoffSource[];
  tools: HandoffToolCall[];
  verifySummary: VerificationSummary;
  claims: HandoffClaim[];
  guardrail: GuardrailStatus;
};

export type HandoffTicket = {
  kind: "citebot-handoff";
  exportedAt: string;
  runs: HandoffRun[];
};

export type OnboardPrompt = {
  id: string;
  label: string;
  question: string;
};

export const ONBOARD_PROMPTS: readonly OnboardPrompt[] = [
  {
    id: "pto",
    label: "English — vacation days",
    question:
      "How many paid vacation days do full-time employees get, and when does unused PTO expire?",
  },
  {
    id: "de-retention",
    label: "German — retention",
    question: "Wie lange werden lenkungsrelevante Aufzeichnungen aufbewahrt?",
  },
];

const REFUSAL_PATTERNS: readonly RegExp[] = [
  /do not cover/i,
  /does not cover/i,
  /not covered/i,
  /not in the (handbook|documents|pages|client)/i,
  /nicht (im |in den |in diesem )?(handbuch|dokument|unterlagen|seiten)/i,
  /nicht behandelt/i,
  /steht nicht/i,
  /nicht enthalten/i,
  /keine angabe/i,
  /dazu liegt nichts/i,
  /kann ich (dazu )?nicht/i,
];

const GUARDRAILS = new Set<GuardrailStatus>(["passed", "refused", "failed"]);
const SUMMARIES = new Set<VerificationSummary>([
  "grounded",
  "mixed",
  "ungrounded",
  "unavailable",
]);
const VERDICTS = new Set<ClaimVerdict>(["pass", "fail", "unsupported"]);

export function defaultOnboardConfig(): OnboardConfig {
  return {
    clientLabel: DEFAULT_CLIENT_LABEL,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    enabledTools: [...TOOL_NAMES],
    documentIds: ONBOARD_DOCS.filter((doc) => doc.lang === "en").map((doc) => doc.id),
  };
}

function cleanLabel(value: string): string {
  const flat = value.replace(/\s+/g, " ").trim().slice(0, LABEL_MAX);
  return flat || DEFAULT_CLIENT_LABEL;
}

function knownTools(value: unknown): ToolName[] | null {
  if (!Array.isArray(value)) return null;
  const wanted = new Set(
    value.filter((item): item is ToolName =>
      typeof item === "string" && (TOOL_NAMES as readonly string[]).includes(item),
    ),
  );
  return TOOL_NAMES.filter((name) => wanted.has(name));
}

function knownDocs(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set(ONBOARD_DOCS.map((doc) => doc.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !ids.has(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Drop unknown fields. Missing fields fall back to the default. An explicit empty list stays empty. */
export function parseOnboardConfig(raw: unknown): OnboardConfig {
  const base = defaultOnboardConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const row = raw as Record<string, unknown>;
  const tools = knownTools(row.enabledTools);
  const docs = knownDocs(row.documentIds);
  const systemPrompt =
    typeof row.systemPrompt === "string"
      ? row.systemPrompt.trim().slice(0, PROMPT_MAX)
      : base.systemPrompt;
  const clientLabel =
    typeof row.clientLabel === "string" ? cleanLabel(row.clientLabel) : base.clientLabel;
  return {
    clientLabel,
    systemPrompt,
    enabledTools: tools ?? base.enabledTools,
    documentIds: docs ?? base.documentIds,
  };
}

export function serializeOnboardConfig(config: OnboardConfig): string {
  const tools = knownTools(config.enabledTools) ?? [];
  const docs = knownDocs(config.documentIds) ?? [];
  return encodeURIComponent(
    JSON.stringify({
      clientLabel: config.clientLabel.replace(/\s+/g, " ").trim().slice(0, LABEL_MAX),
      systemPrompt: config.systemPrompt.trim().slice(0, PROMPT_MAX),
      enabledTools: tools,
      documentIds: docs,
    }),
  );
}

export function onboardCookieAssignment(config: OnboardConfig): string {
  return `${ONBOARD_COOKIE}=${serializeOnboardConfig(config)}; Path=/; SameSite=Lax`;
}

function tryJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Accept either raw JSON or the URI-encoded cookie value. */
export function parseOnboardCookie(value: string | null | undefined): OnboardConfig | null {
  if (!value?.trim()) return null;
  const direct = tryJson(value);
  if (direct && typeof direct === "object") return parseOnboardConfig(direct);
  try {
    const decoded = decodeURIComponent(value);
    const parsed = tryJson(decoded);
    if (parsed && typeof parsed === "object") return parseOnboardConfig(parsed);
  } catch {
    return null;
  }
  return null;
}

export function onboardConfigFromCookieHeader(header: string): OnboardConfig | null {
  const parts = header.split(";").map((part) => part.trim());
  const hit = parts.find((part) => part.startsWith(`${ONBOARD_COOKIE}=`));
  if (!hit) return null;
  return parseOnboardCookie(hit.slice(ONBOARD_COOKIE.length + 1));
}

/**
 * `en` and `de-gap` load the English pages (a German question should be refused).
 * `de-docs` loads only the German packet.
 */
export function presetOnboardConfig(preset: string | null | undefined): OnboardConfig | null {
  if (preset === "en" || preset === "de-gap") return defaultOnboardConfig();
  if (preset === "de-docs") {
    return {
      ...defaultOnboardConfig(),
      documentIds: ONBOARD_DOCS.filter((doc) => doc.lang === "de").map((doc) => doc.id),
    };
  }
  return null;
}

/** The interactive path is the CiteBot craft skin. Other skins keep the handbook Q&A. */
export function shouldApplyOnboard(skin: BrandSkin): boolean {
  return skin === "craft";
}

export function answerLooksLikeRefusal(answer: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(answer));
}

/**
 * Passed: verify accepted the claims and the answer is not a gap refusal.
 * Refused: verify accepted a "not in the documents" answer.
 * Failed: a claim failed, is unsupported, or verify did not run cleanly.
 * A refusal phrase does not override a failed check.
 */
export function guardrailFrom(answer: string, verification: Verification): GuardrailStatus {
  const evidenceBad =
    verification.summary === "unavailable" ||
    verification.summary === "ungrounded" ||
    verification.summary === "mixed" ||
    verification.claims.some(
      (claim) => claim.verdict === "fail" || claim.verdict === "unsupported",
    );
  if (evidenceBad) return "failed";
  const cited = verification.claims.some((claim) => claim.citationId);
  if (verification.summary === "grounded" && !cited && answerLooksLikeRefusal(answer)) {
    return "refused";
  }
  if (verification.summary === "grounded") return "passed";
  return "failed";
}

export function guardrailCopy(
  status: GuardrailStatus,
  refusalPhrase: boolean,
): { title: string; body: string } {
  if (status === "failed" && refusalPhrase) {
    return {
      title: "Do not hand this off",
      body: "The answer refuses, but the evidence check did not accept that refusal.",
    };
  }
  if (status === "failed") {
    return {
      title: "Do not hand this off",
      body: "The evidence check failed. Fix the answer before sending it on.",
    };
  }
  if (status === "refused") {
    return {
      title: "Refused",
      body: "The client documents do not cover this, and the evidence check accepted that refusal.",
    };
  }
  return {
    title: "Guardrail passed",
    body: "The evidence check accepted the claims against the retrieved passages.",
  };
}

export function selectedOnboardDocs(config: OnboardConfig): OnboardDoc[] {
  const ids = new Set(config.documentIds);
  return ONBOARD_DOCS.filter((doc) => ids.has(doc.id));
}

export async function loadOnboardChunks(config: OnboardConfig) {
  const selected = selectedOnboardDocs(config);
  const dirs = [...new Set(selected.map((doc) => doc.dir))];
  const groups = await Promise.all(
    dirs.map(async (dir) => ({
      dir,
      chunks: await loadCorpusChunks({ dir }),
    })),
  );
  const filesByDir = new Map<string, Set<string>>();
  for (const doc of selected) {
    const files = filesByDir.get(doc.dir) ?? new Set<string>();
    files.add(doc.file);
    filesByDir.set(doc.dir, files);
  }
  return groups.flatMap((group) => {
    const files = filesByDir.get(group.dir) ?? new Set<string>();
    return group.chunks.filter((chunk) => files.has(chunk.source));
  });
}

export function handoffRun(input: {
  at: string;
  question: string;
  answer: string;
  config: OnboardConfig;
  citations: Citation[];
  steps: AgentStep[];
  verification: Verification;
}): HandoffRun {
  const config = parseOnboardConfig(input.config);
  const docs = selectedOnboardDocs(config).map((doc) => ({
    id: doc.id,
    title: doc.title,
  }));
  return {
    at: input.at,
    question: input.question,
    answer: input.answer,
    clientLabel: config.clientLabel,
    systemPrompt: config.systemPrompt,
    enabledTools: config.enabledTools,
    documents: docs,
    sources: input.citations.map((citation) => ({
      id: citation.id,
      source: citation.source,
      title: citation.title,
    })),
    tools: input.steps
      .filter((step) => step.kind === "tool" && step.tool)
      .map((step) => ({
        name: step.tool ?? step.label,
        detail: step.detail,
      })),
    verifySummary: input.verification.summary,
    claims: input.verification.claims.map((claim) => ({
      claim: claim.claim,
      verdict: claim.verdict,
    })),
    guardrail: guardrailFrom(input.answer, input.verification),
  };
}

export function handoffTicket(exportedAt: string, runs: HandoffRun[]): HandoffTicket {
  return {
    kind: "citebot-handoff",
    exportedAt,
    runs,
  };
}

export function handoffJson(ticket: HandoffTicket): string {
  return JSON.stringify(ticket, null, 2);
}

function mdEscape(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function handoffMarkdown(ticket: HandoffTicket): string {
  const lines: string[] = [
    "# Handoff",
    "",
    `- Exported: ${ticket.exportedAt}`,
    `- Runs: ${ticket.runs.length}`,
    "",
  ];

  ticket.runs.forEach((run, index) => {
    lines.push(`## Run ${index + 1}`, "");
    lines.push(`- At: ${run.at}`);
    lines.push(`- Client: ${run.clientLabel}`);
    lines.push(`- Guardrail: ${run.guardrail}`);
    lines.push(`- Verify: ${run.verifySummary}`);
    lines.push("");
    lines.push("### Config", "");
    lines.push(mdEscape(run.systemPrompt) || "(no extra system prompt)");
    lines.push("");
    lines.push(`Tools: ${run.enabledTools.join(", ") || "(none)"}`);
    lines.push("");
    lines.push("Documents:");
    if (run.documents.length === 0) lines.push("- (none)");
    for (const doc of run.documents) lines.push(`- ${doc.title} (${doc.id})`);
    lines.push("");
    lines.push("### Question", "");
    lines.push(mdEscape(run.question));
    lines.push("");
    lines.push("### Answer", "");
    lines.push(mdEscape(run.answer));
    lines.push("");
    lines.push("### Tools called", "");
    if (run.tools.length === 0) lines.push("- (none)");
    for (const tool of run.tools) lines.push(`- ${tool.name} — ${tool.detail}`);
    lines.push("");
    lines.push("### Sources", "");
    if (run.sources.length === 0) lines.push("- (none)");
    for (const source of run.sources) {
      lines.push(`- ${source.title} — ${source.source} (${source.id})`);
    }
    lines.push("");
    lines.push("### Claims", "");
    if (run.claims.length === 0) lines.push("- (none)");
    for (const claim of run.claims) lines.push(`- ${claim.verdict} — ${claim.claim}`);
    lines.push("");
  });

  return lines.join("\n").trimEnd() + "\n";
}

function isToolNameList(value: unknown): value is ToolName[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string" && (TOOL_NAMES as readonly string[]).includes(item),
    )
  );
}

/** Restore a session run log. Invalid entries are dropped. */
export function parseHandoffRuns(raw: string | null | undefined): HandoffRun[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const runs: HandoffRun[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const guardrail = row.guardrail;
    const verifySummary = row.verifySummary;
    if (typeof row.at !== "string" || typeof row.question !== "string") continue;
    if (typeof row.answer !== "string" || typeof row.clientLabel !== "string") continue;
    if (typeof row.systemPrompt !== "string") continue;
    if (!isToolNameList(row.enabledTools)) continue;
    if (typeof guardrail !== "string" || !GUARDRAILS.has(guardrail as GuardrailStatus)) continue;
    if (typeof verifySummary !== "string" || !SUMMARIES.has(verifySummary as VerificationSummary)) {
      continue;
    }
    const documents = Array.isArray(row.documents)
      ? row.documents.flatMap((doc) => {
          if (!doc || typeof doc !== "object") return [];
          const entry = doc as Record<string, unknown>;
          if (typeof entry.id !== "string" || typeof entry.title !== "string") return [];
          return [{ id: entry.id, title: entry.title }];
        })
      : [];
    const sources = Array.isArray(row.sources)
      ? row.sources.flatMap((source) => {
          if (!source || typeof source !== "object") return [];
          const entry = source as Record<string, unknown>;
          if (
            typeof entry.id !== "string" ||
            typeof entry.source !== "string" ||
            typeof entry.title !== "string"
          ) {
            return [];
          }
          return [{ id: entry.id, source: entry.source, title: entry.title }];
        })
      : [];
    const tools = Array.isArray(row.tools)
      ? row.tools.flatMap((tool) => {
          if (!tool || typeof tool !== "object") return [];
          const entry = tool as Record<string, unknown>;
          if (typeof entry.name !== "string" || typeof entry.detail !== "string") return [];
          return [{ name: entry.name, detail: entry.detail }];
        })
      : [];
    const claims = Array.isArray(row.claims)
      ? row.claims.flatMap((claim) => {
          if (!claim || typeof claim !== "object") return [];
          const entry = claim as Record<string, unknown>;
          if (typeof entry.claim !== "string" || typeof entry.verdict !== "string") return [];
          if (!VERDICTS.has(entry.verdict as ClaimVerdict)) return [];
          return [{ claim: entry.claim, verdict: entry.verdict as ClaimVerdict }];
        })
      : [];
    runs.push({
      at: row.at,
      question: row.question,
      answer: row.answer,
      clientLabel: row.clientLabel,
      systemPrompt: row.systemPrompt,
      enabledTools: row.enabledTools,
      documents,
      sources,
      tools,
      verifySummary: verifySummary as VerificationSummary,
      claims,
      guardrail: guardrail as GuardrailStatus,
    });
  }
  return runs.slice(0, 20);
}
