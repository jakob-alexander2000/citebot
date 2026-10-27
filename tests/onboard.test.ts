import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runAgentLoop } from "../lib/agent";
import { loadCorpusChunks } from "../lib/corpus";
import { loadOnboardChunks } from "../lib/onboard-corpus";
import { answerOnboard } from "../lib/rag";
import { WALKTHROUGH } from "../lib/onboard-copy";
import {
  DEFAULT_SYSTEM_PROMPT,
  ONBOARD_COOKIE,
  ONBOARD_DOCS,
  ONBOARD_PROMPTS,
  answerLooksLikeRefusal,
  defaultOnboardConfig,
  guardrailCopy,
  guardrailFrom,
  handoffJson,
  handoffMarkdown,
  handoffRun,
  handoffTicket,
  onboardConfigFromCookieHeader,
  onboardCookieAssignment,
  parseHandoffRuns,
  parseOnboardConfig,
  parseOnboardCookie,
  presetOnboardConfig,
  serializeOnboardConfig,
  shouldApplyOnboard,
} from "../lib/onboard";
import { lexicalSearch, TOOL_NAMES } from "../lib/tools";
import type { Verification } from "../lib/types";

const grounded: Verification = {
  summary: "grounded",
  claims: [
    {
      claim: "Full-time employees receive 30 days.",
      verdict: "pass",
      evidence: "30 days",
      citationId: "pto-and-leave-1",
    },
  ],
};

const refused: Verification = {
  summary: "grounded",
  claims: [
    {
      claim: "The documents do not cover retention.",
      verdict: "pass",
      evidence: "No passage states a retention period.",
    },
  ],
};

const failed: Verification = {
  summary: "ungrounded",
  claims: [
    {
      claim: "Records are kept for 40 years.",
      verdict: "unsupported",
      evidence: "No passage says 40 years.",
    },
  ],
};

describe("onboard config", () => {
  it("defaults to the English pages and every handbook tool", () => {
    const config = defaultOnboardConfig();
    assert.equal(config.clientLabel, "Sample client");
    assert.equal(config.systemPrompt, DEFAULT_SYSTEM_PROMPT);
    assert.deepEqual(config.enabledTools, [...TOOL_NAMES]);
    assert.deepEqual(
      config.documentIds,
      ONBOARD_DOCS.filter((doc) => doc.lang === "en").map((doc) => doc.id),
    );
    assert.equal(config.documentIds.includes("dok"), false);
  });

  it("drops unknown tools and documents and keeps an explicit empty list", () => {
    const config = parseOnboardConfig({
      clientLabel: "  North shop  ",
      systemPrompt: "  Stay inside the pages.  ",
      enabledTools: ["quote_check", "not-a-tool", "search_handbook"],
      documentIds: ["pto", "missing", "dok"],
    });
    assert.equal(config.clientLabel, "North shop");
    assert.equal(config.systemPrompt, "Stay inside the pages.");
    assert.deepEqual(config.enabledTools, ["search_handbook", "quote_check"]);
    assert.deepEqual(config.documentIds, ["pto", "dok"]);

    const empty = parseOnboardConfig({ enabledTools: [], documentIds: [] });
    assert.deepEqual(empty.enabledTools, []);
    assert.deepEqual(empty.documentIds, []);
  });

  it("round-trips through the session cookie", () => {
    const config = parseOnboardConfig({
      clientLabel: "Sample client",
      systemPrompt: "Answer only from the enabled pages.",
      enabledTools: ["search_handbook"],
      documentIds: ["pto"],
    });
    const header = onboardCookieAssignment(config);
    assert.match(header, new RegExp(`^${ONBOARD_COOKIE}=`));
    assert.equal(header.includes("Max-Age"), false);
    const restored = onboardConfigFromCookieHeader(header);
    assert.deepEqual(restored, config);

    const encoded = serializeOnboardConfig(config);
    assert.deepEqual(parseOnboardCookie(encoded), config);
    assert.equal(parseOnboardCookie("not-json"), null);
  });

  it("loads presets for the English packet and the German packet", () => {
    const english = presetOnboardConfig("de-gap");
    assert.ok(english);
    assert.equal(english.documentIds.includes("pto"), true);
    assert.equal(english.documentIds.includes("dok"), false);

    const german = presetOnboardConfig("de-docs");
    assert.ok(german);
    assert.deepEqual(
      german.documentIds,
      ONBOARD_DOCS.filter((doc) => doc.lang === "de").map((doc) => doc.id),
    );
    assert.equal(presetOnboardConfig("other"), null);
  });

  it("applies only on the CiteBot craft skin", () => {
    assert.equal(shouldApplyOnboard("craft"), true);
    assert.equal(shouldApplyOnboard("product"), false);
    assert.equal(shouldApplyOnboard("client"), false);
  });
});

describe("onboard documents", () => {
  it("loads only the pages that are on", async () => {
    const chunks = await loadOnboardChunks(
      parseOnboardConfig({ documentIds: ["pto", "dok"] }),
    );
    const sources = new Set(chunks.map((chunk) => chunk.source));
    assert.deepEqual([...sources].sort(), ["dokumentenlenkung.md", "pto-and-leave.md"]);
    assert.ok(chunks.some((chunk) => chunk.text.includes("30 days")));
    assert.ok(chunks.some((chunk) => /fünf Jahre/i.test(chunk.text)));
    assert.equal(
      chunks.some((chunk) => chunk.source === "expense-policy.md"),
      false,
    );
  });
});

describe("guardrail", () => {
  it("marks a cited pass, a refusal, and a failed check", () => {
    assert.equal(
      guardrailFrom("Full-time employees receive 30 days of vacation.", grounded),
      "passed",
    );
    assert.equal(
      guardrailFrom("The documents do not cover how long records are kept.", refused),
      "refused",
    );
    assert.equal(guardrailFrom("Records are kept for 40 years.", failed), "failed");
    assert.equal(
      guardrailFrom("The documents do not cover this, so I will guess 40 years.", failed),
      "failed",
    );
    assert.equal(answerLooksLikeRefusal("The documents do not cover this."), true);
    assert.equal(guardrailCopy("failed", true).title, "Do not hand this off");
    assert.equal(guardrailCopy("refused", false).title, "Refused");
    assert.equal(guardrailCopy("passed", false).title, "Guardrail passed");
  });
});

describe("handoff", () => {
  it("writes sources, tools, verify, and the time into JSON and Markdown", () => {
    const run = handoffRun({
      at: "2026-10-27T16:00:00.000Z",
      question: "How many vacation days?",
      answer: "Full-time employees receive 30 days.",
      config: defaultOnboardConfig(),
      citations: [
        {
          id: "pto-and-leave-1",
          source: "pto-and-leave.md",
          title: "Time off and leave",
          snippet: "30 days",
          score: 1,
        },
      ],
      steps: [
        {
          kind: "tool",
          tool: "search_handbook",
          label: "search_handbook",
          detail: "1 passage · Time off and leave",
        },
        { kind: "draft", label: "Draft", detail: "Full-time employees receive 30 days." },
      ],
      verification: grounded,
    });
    const ticket = handoffTicket("2026-10-27T16:05:00.000Z", [run]);
    const json = JSON.parse(handoffJson(ticket)) as {
      kind: string;
      exportedAt: string;
      runs: { tools: { name: string }[]; sources: { source: string }[]; verifySummary: string }[];
    };
    assert.equal(json.kind, "citebot-handoff");
    assert.equal(json.exportedAt, "2026-10-27T16:05:00.000Z");
    assert.equal(json.runs[0]?.verifySummary, "grounded");
    assert.equal(json.runs[0]?.tools[0]?.name, "search_handbook");
    assert.equal(json.runs[0]?.sources[0]?.source, "pto-and-leave.md");

    const markdown = handoffMarkdown(ticket);
    assert.match(markdown, /2026-10-27T16:05:00.000Z/);
    assert.match(markdown, /search_handbook/);
    assert.match(markdown, /pto-and-leave.md/);
    assert.match(markdown, /Verify: grounded/);
    assert.match(markdown, /Guardrail: passed/);

    assert.equal(parseHandoffRuns(JSON.stringify([run])).length, 1);
    assert.deepEqual(parseHandoffRuns("nope"), []);
  });
});

describe("onboard tool filter", () => {
  it("does not execute a handbook tool that is off", async () => {
    const chunks = await loadCorpusChunks({ dir: "examples/nordlicht-corpus" });
    let searches = 0;
    const prompts: string[] = [];
    const result = await runAgentLoop({
      question: "How many vacation days do full-time employees get?",
      chunks,
      generate: async (prompt) => {
        prompts.push(prompt);
        if (prompts.length === 1) {
          return JSON.stringify({
            action: "tool",
            tool: "search_handbook",
            input: { query: "vacation days" },
          });
        }
        return JSON.stringify({
          action: "answer",
          answer: "The documents do not cover that.",
        });
      },
      search: async (query, topK) => {
        searches += 1;
        return lexicalSearch(chunks, query, topK);
      },
      verify: async () => refused,
      enabledTools: ["quote_check"],
      instructions: "If the question is in German, answer in German.",
    });

    assert.equal(searches, 0);
    assert.equal(result.steps.find((step) => step.tool === "search_handbook")?.detail, "Off for this client.");
    assert.match(prompts[0] ?? "", /quote_check/);
    assert.doesNotMatch(prompts[0] ?? "", /search_handbook input/);
    assert.match(prompts[0] ?? "", /If the question is in German/);
    assert.equal(result.answer, "The documents do not cover that.");
  });

  it("keeps the default prompt when no client instructions or tool filter are set", async () => {
    const chunks = await loadCorpusChunks({ dir: "examples/nordlicht-corpus" });
    const captured: string[] = [];
    const generate = async (prompt: string) => {
      captured.push(prompt);
      return JSON.stringify({ action: "answer", answer: "Full-time employees receive 30 days." });
    };
    const shared = {
      question: "How many vacation days?",
      chunks,
      search: async (query: string, topK?: number) => lexicalSearch(chunks, query, topK),
      verify: async () => grounded,
    };
    await runAgentLoop({ ...shared, generate });
    const unmarked = captured[0] ?? "";
    captured.length = 0;
    const withAllTools = await runAgentLoop({
      ...shared,
      generate,
      enabledTools: [...TOOL_NAMES],
    });
    assert.equal(captured[0], unmarked);
    assert.match(unmarked, /"search_handbook"\|"list_topics"\|"get_section"\|"quote_check"/);
    assert.match(unmarked, /Write the answer in English/);
    assert.doesNotMatch(unmarked, /Client instructions/);
    assert.ok(withAllTools.steps.some((step) => step.tool === "search_handbook"));
  });
});

describe("onboard without a model key", () => {
  it("passes the vacation question, refuses the German gap, then passes once those pages are on", async () => {
    assert.equal(process.env.GEMINI_API_KEY, undefined);
    const english = defaultOnboardConfig();
    const pto = await answerOnboard(ONBOARD_PROMPTS[0]!.question, english);
    assert.match(pto.answer, /30 days/);
    assert.match(pto.answer, /March 31/);
    assert.equal(guardrailFrom(pto.answer, pto.verification), "passed");
    assert.ok(pto.steps.some((step) => step.tool === "search_handbook"));
    assert.match(
      pto.steps.find((step) => step.kind === "draft")?.detail ?? "",
      /local passage check/,
    );

    const gap = await answerOnboard(ONBOARD_PROMPTS[1]!.question, english);
    assert.match(gap.answer, /do not cover/i);
    assert.equal(guardrailFrom(gap.answer, gap.verification), "refused");

    const german = presetOnboardConfig("de-docs");
    assert.ok(german);
    const hit = await answerOnboard(ONBOARD_PROMPTS[1]!.question, german);
    assert.match(hit.answer, /fünf Jahre/);
    assert.equal(guardrailFrom(hit.answer, hit.verification), "passed");
    assert.ok(hit.citations.some((citation) => citation.source === "dokumentenlenkung.md"));
  });
});

describe("walkthrough script", () => {
  it("includes an English script and a German script on one page", () => {
    assert.deepEqual(
      WALKTHROUGH.map((script) => script.id),
      ["en", "de"],
    );
    const german = WALKTHROUGH.find((script) => script.id === "de");
    assert.match(german?.lead ?? "", /Englisch/);
    assert.match(WALKTHROUGH.map((script) => script.steps.map((step) => step.body).join(" ")).join(" "), /fünf Jahre|five years/);
  });
});
