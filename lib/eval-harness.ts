import fs from "node:fs";
import path from "node:path";
import { runAgentLoop, type GenerateFn } from "./agent";
import { loadCorpusChunks } from "./corpus";
import { answerLooksLikeRefusal } from "./onboard";
import { localOnboardGenerate, localPassageVerify } from "./onboard-local";
import { TOOL_NAMES, lexicalSearch } from "./tools";
import type { Citation, ClaimVerdict, Verification, VerificationSummary } from "./types";
import { summarizeClaims } from "./verify";

export const GOLDEN_PATH = path.join(process.cwd(), "evals", "golden.json");

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "how",
  "many",
  "when",
  "does",
  "what",
  "full",
  "time",
  "per",
  "can",
  "until",
]);

export type GoldenKind = "grounded" | "gap" | "contradiction";

export type GoldenExpect = {
  answerIncludesAny?: string[];
  answerIncludesAll?: string[];
  answerMustNotInclude?: string[];
  citationSourcesAny?: string[];
  minCitations?: number;
  mustRefuse?: boolean;
  verificationSummariesAny?: VerificationSummary[];
  verdictAny?: ClaimVerdict[];
  verdictNone?: ClaimVerdict[];
};

export type GoldenCase = {
  id: string;
  kind: GoldenKind;
  question: string;
  note: string;
  /** Bad draft scored by the same loop. The agent search still runs. */
  fixedAnswer?: string;
  expect: GoldenExpect;
};

export type GoldenSuite = {
  suite: string;
  corpus: string;
  description: string;
  cases: GoldenCase[];
};

export type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

export type ObservedRun = {
  answer: string;
  citations: Pick<Citation, "source">[];
  verification?: Verification;
  stoppedEarly?: boolean;
  tools?: string[];
  error?: string;
};

export type CaseResult = {
  id: string;
  kind: GoldenKind;
  question: string;
  pass: boolean;
  checks: CheckResult[];
  summary?: VerificationSummary;
  verdicts: ClaimVerdict[];
  sources: string[];
  answerPreview: string;
};

export type EvalReport = {
  suite: string;
  corpus: string;
  passed: number;
  failed: number;
  total: number;
  score: string;
  results: CaseResult[];
};

type SuiteFile = {
  suite?: unknown;
  corpus?: unknown;
  description?: unknown;
  cases?: unknown;
};

export function loadGolden(filePath = GOLDEN_PATH): GoldenSuite {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as SuiteFile;
  if (typeof parsed.suite !== "string" || !parsed.suite.trim()) {
    throw new Error("Golden suite is missing a name.");
  }
  if (parsed.corpus !== "examples/nordlicht-corpus") {
    throw new Error("Golden suite must read the English handbook corpus.");
  }
  if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    throw new Error("Golden suite has no cases.");
  }

  const cases = parsed.cases.map((row, index) => parseCase(row, index));
  const ids = new Set<string>();
  for (const row of cases) {
    if (ids.has(row.id)) throw new Error(`Duplicate golden case: ${row.id}`);
    ids.add(row.id);
    assertShape(row);
  }

  return {
    suite: parsed.suite,
    corpus: parsed.corpus,
    description: typeof parsed.description === "string" ? parsed.description : "",
    cases,
  };
}

function parseCase(row: unknown, index: number): GoldenCase {
  if (!row || typeof row !== "object") throw new Error(`Case ${index} is not an object.`);
  const item = row as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const kind = item.kind;
  const question = typeof item.question === "string" ? item.question.trim() : "";
  const note = typeof item.note === "string" ? item.note.trim() : "";
  const fixedAnswer = typeof item.fixedAnswer === "string" ? item.fixedAnswer.trim() : undefined;
  if (!id || !question || !note) throw new Error(`Case ${index} is missing id, question, or note.`);
  if (kind !== "grounded" && kind !== "gap" && kind !== "contradiction") {
    throw new Error(`Case ${id} has an unknown kind.`);
  }
  if (!item.expect || typeof item.expect !== "object") throw new Error(`Case ${id} is missing expect.`);
  return {
    id,
    kind,
    question,
    note,
    fixedAnswer: fixedAnswer || undefined,
    expect: item.expect as GoldenExpect,
  };
}

/** Grounded cases must demand a clean verify. Gap cases must refuse. The bad draft must demand fail. */
function assertShape(row: GoldenCase): void {
  const expect = row.expect;
  if (row.kind === "grounded") {
    if (!expect.citationSourcesAny?.length) throw new Error(`${row.id} needs a citation source.`);
    if (!expect.verificationSummariesAny?.includes("grounded")) {
      throw new Error(`${row.id} must expect summary grounded.`);
    }
    if (!expect.verdictNone?.includes("fail") || !expect.verdictNone?.includes("unsupported")) {
      throw new Error(`${row.id} must reject fail and unsupported claims.`);
    }
    if (!expect.answerIncludesAny?.length && !expect.answerIncludesAll?.length) {
      throw new Error(`${row.id} needs a required phrase.`);
    }
  }
  if (row.kind === "gap") {
    if (expect.mustRefuse !== true) throw new Error(`${row.id} must require a refusal.`);
    if (!expect.verificationSummariesAny?.includes("grounded")) {
      throw new Error(`${row.id} must treat a real gap as grounded.`);
    }
  }
  if (row.kind === "contradiction") {
    if (!row.fixedAnswer) throw new Error(`${row.id} needs a fixed bad draft.`);
    if (!expect.verdictAny?.includes("fail")) throw new Error(`${row.id} must expect a fail verdict.`);
    const summaries = expect.verificationSummariesAny ?? [];
    if (!summaries.includes("ungrounded") && !summaries.includes("mixed")) {
      throw new Error(`${row.id} must expect an ungrounded or mixed summary.`);
    }
  }
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[*_`#]/g, " ")
    .split(/[^a-z0-9äöüß]+/i)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

function sentences(text: string): string[] {
  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("[") || /^#{1,6}\s/.test(trimmed)) return false;
    return true;
  });
  return lines
    .join(" ")
    .replace(/[*_`#]/g, " ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);
}

/** A retrieved sentence shares enough question words that a flat refusal is not a real gap. */
export function questionCovered(question: string, citations: Citation[]): boolean {
  const wanted = new Set(tokens(question));
  if (wanted.size === 0) return false;
  for (const citation of citations) {
    for (const sentence of sentences(`${citation.title}\n${citation.snippet}`)) {
      const score = tokens(sentence).filter((token) => wanted.has(token)).length;
      if (score >= 2) return true;
    }
  }
  return false;
}

function figures(text: string): string[] {
  return text.match(/\d+(?:[.,]\d+)?/g) ?? [];
}

function passageHasFigure(citations: Citation[], citationId: string | undefined, figure: string): boolean {
  const pool = citationId ? citations.filter((citation) => citation.id === citationId) : citations;
  const hay = (pool.length > 0 ? pool : citations).flatMap((citation) => figures(citation.snippet));
  return hay.includes(figure);
}

/**
 * Offline verify for the golden set. Verdict tokens and the summary rule come
 * from `lib/verify.ts`. A correct refusal is pass. A number the passage does
 * not state is fail, which is the contradiction the live verifier is asked to catch.
 */
export function evalVerify(question: string, answer: string, citations: Citation[]): Verification {
  if (answerLooksLikeRefusal(answer)) {
    if (!questionCovered(question, citations)) {
      const claims = [
        {
          claim: "The handbook does not cover the question.",
          verdict: "pass" as const,
          evidence: "No retrieved sentence states an answer.",
        },
      ];
      return { summary: summarizeClaims(claims), claims };
    }
    const claims = [
      {
        claim: "The answer refuses a question the retrieved passages cover.",
        verdict: "unsupported" as const,
        evidence: citations[0]?.snippet.slice(0, 180) || "A passage was retrieved.",
        citationId: citations[0]?.id,
      },
    ];
    return { summary: summarizeClaims(claims), claims };
  }

  const base = localPassageVerify(answer, citations);
  const claims = base.claims.map((claim) => {
    if (claim.verdict !== "pass") return claim;
    const missing = figures(claim.claim).filter(
      (figure) => !passageHasFigure(citations, claim.citationId, figure),
    );
    if (missing.length === 0) return claim;
    return {
      ...claim,
      verdict: "fail" as const,
      evidence: `The passage does not state ${missing.join(", ")}.`,
    };
  });
  return { summary: summarizeClaims(claims), claims };
}

function includesAny(haystack: string, needles: string[]): boolean {
  const hay = haystack.toLowerCase();
  return needles.some((needle) => hay.includes(needle.toLowerCase()));
}

export function scoreCase(expect: GoldenExpect, run: ObservedRun): CheckResult[] {
  const checks: CheckResult[] = [];
  const answer = run.answer || "";

  if (run.error) {
    checks.push({ name: "response", ok: false, detail: run.error });
    return checks;
  }
  if (!answer.trim()) {
    checks.push({ name: "answer-nonempty", ok: false, detail: "Empty answer" });
    return checks;
  }
  checks.push({ name: "answer-nonempty", ok: true, detail: "Answer has text" });

  if (run.stoppedEarly) {
    checks.push({ name: "loop-finished", ok: false, detail: "The loop stopped before a draft" });
  } else if (run.stoppedEarly === false) {
    checks.push({ name: "loop-finished", ok: true, detail: "Draft completed" });
  }

  if (run.tools) {
    const ok = run.tools.includes("search_handbook");
    checks.push({
      name: "tool-search",
      ok,
      detail: ok ? "search_handbook ran" : "search_handbook did not run",
    });
  }

  if (expect.answerIncludesAny?.length) {
    const ok = includesAny(answer, expect.answerIncludesAny);
    checks.push({
      name: "answer-includes",
      ok,
      detail: ok
        ? `matched one of: ${expect.answerIncludesAny.join(" | ")}`
        : `missing all of: ${expect.answerIncludesAny.join(" | ")}`,
    });
  }

  if (expect.answerIncludesAll?.length) {
    const missing = expect.answerIncludesAll.filter((needle) => !includesAny(answer, [needle]));
    checks.push({
      name: "answer-includes-all",
      ok: missing.length === 0,
      detail: missing.length === 0 ? "all required phrases present" : `missing: ${missing.join(", ")}`,
    });
  }

  if (expect.answerMustNotInclude?.length) {
    const hit = expect.answerMustNotInclude.filter((needle) => includesAny(answer, [needle]));
    checks.push({
      name: "answer-excludes",
      ok: hit.length === 0,
      detail: hit.length === 0 ? "no forbidden phrases" : `hit forbidden: ${hit.join(", ")}`,
    });
  }

  if (typeof expect.minCitations === "number") {
    const count = run.citations.length;
    checks.push({
      name: "min-citations",
      ok: count >= expect.minCitations,
      detail: `${count} citation(s); need ≥ ${expect.minCitations}`,
    });
  }

  if (expect.citationSourcesAny?.length) {
    const sources = run.citations.map((citation) => citation.source).join(" | ");
    const ok = expect.citationSourcesAny.some((want) =>
      run.citations.some((citation) => citation.source.toLowerCase().includes(want.toLowerCase())),
    );
    checks.push({
      name: "citation-source",
      ok,
      detail: ok
        ? `sources: ${sources || "(none)"}`
        : `wanted one of [${expect.citationSourcesAny.join(", ")}]; got [${sources || "none"}]`,
    });
  }

  if (expect.mustRefuse) {
    const ok = answerLooksLikeRefusal(answer);
    checks.push({
      name: "refusal",
      ok,
      detail: ok ? "answer refuses" : "expected a not-in-the-handbook refusal",
    });
  }

  if (expect.verificationSummariesAny?.length) {
    const summary = run.verification?.summary;
    const ok = Boolean(summary && expect.verificationSummariesAny.includes(summary));
    checks.push({
      name: "verification-summary",
      ok,
      detail: `summary=${summary ?? "missing"}; allowed=${expect.verificationSummariesAny.join("|")}`,
    });
  }

  if (expect.verdictAny?.length || expect.verdictNone?.length) {
    const verdicts = run.verification?.claims.map((claim) => claim.verdict) ?? [];
    const missing = (expect.verdictAny ?? []).filter((verdict) => !verdicts.includes(verdict));
    const forbidden = (expect.verdictNone ?? []).filter((verdict) => verdicts.includes(verdict));
    const ok = missing.length === 0 && forbidden.length === 0;
    const detail = ok
      ? `verdicts: ${verdicts.join(", ") || "(none)"}`
      : [
          missing.length ? `missing verdict ${missing.join(", ")}` : "",
          forbidden.length ? `unexpected verdict ${forbidden.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("; ");
    checks.push({ name: "claim-verdicts", ok, detail });
  }

  return checks;
}

export function casePassed(checks: CheckResult[]): boolean {
  return checks.length > 0 && checks.every((check) => check.ok);
}

function fixedDraft(question: string, answer: string): GenerateFn {
  let turns = 0;
  return async () => {
    turns += 1;
    if (turns === 1) {
      return JSON.stringify({
        action: "tool",
        plan: "Search the handbook.",
        tool: "search_handbook",
        input: { query: question },
      });
    }
    return JSON.stringify({ action: "answer", answer });
  };
}

export async function runGoldenSuite(filePath = GOLDEN_PATH): Promise<EvalReport> {
  const golden = loadGolden(filePath);
  const chunks = await loadCorpusChunks({ dir: golden.corpus });
  if (chunks.length === 0) throw new Error(`No handbook pages in ${golden.corpus}.`);

  const results: CaseResult[] = [];

  for (const row of golden.cases) {
    const generate = row.fixedAnswer
      ? fixedDraft(row.question, row.fixedAnswer)
      : localOnboardGenerate(row.question, TOOL_NAMES);
    const response = await runAgentLoop({
      question: row.question,
      chunks,
      locale: "en",
      generate,
      search: async (query, topK) => lexicalSearch(chunks, query, topK),
      verify: async (question, answer, citations) => evalVerify(question, answer, citations),
    });
    const checks = scoreCase(row.expect, {
      answer: response.answer,
      citations: response.citations,
      verification: response.verification,
      stoppedEarly: response.stoppedEarly,
      tools: response.steps.flatMap((step) => (step.tool ? [step.tool] : [])),
    });
    results.push({
      id: row.id,
      kind: row.kind,
      question: row.question,
      pass: casePassed(checks),
      checks,
      summary: response.verification.summary,
      verdicts: response.verification.claims.map((claim) => claim.verdict),
      sources: response.citations.map((citation) => citation.source),
      answerPreview: response.answer.replace(/\s+/g, " ").slice(0, 160),
    });
  }

  const passed = results.filter((result) => result.pass).length;
  const total = results.length;
  return {
    suite: golden.suite,
    corpus: golden.corpus,
    passed,
    failed: total - passed,
    total,
    score: `${passed}/${total} (${total === 0 ? 0 : Math.round((passed / total) * 100)}%)`,
    results,
  };
}

export function formatReport(report: EvalReport): string {
  const lines = [
    `Suite:    ${report.suite}`,
    `Corpus:   ${report.corpus}`,
    "Runner:   agent loop + verify (no API key)",
    `Cases:    ${report.total}`,
    "",
  ];
  for (const result of report.results) {
    const mark = result.pass ? "PASS" : "FAIL";
    lines.push(`[${mark}] ${result.id}  ${result.summary ?? "—"}  ${result.verdicts.join(",") || "—"}`);
    if (!result.pass) {
      for (const check of result.checks.filter((item) => !item.ok)) {
        lines.push(`       ${check.name}: ${check.detail}`);
      }
      if (result.answerPreview) lines.push(`       answer: ${result.answerPreview}`);
    }
  }
  lines.push("", `Score: ${report.score}`);
  return lines.join("\n");
}
