import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  AGENT_DRAFT_STOP_MESSAGE,
  AGENT_LOOP_STOP_MESSAGE,
  MAX_TOOL_ROUNDS,
  parseModelTurn,
  runAgentLoop,
  type GenerateFn,
} from "../lib/agent";
import { loadCorpusChunks } from "../lib/corpus";
import { lexicalSearch } from "../lib/tools";
import type { Chunk, Citation, Verification } from "../lib/types";

type TurnFile = {
  ptoHappyPath: unknown[];
  quoteThenAnswer: unknown[];
  keepsCallingTools: unknown[];
  repeatsSameCall: unknown[];
};

const turns = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "tests/fixtures/agent-turns.json"), "utf8"),
) as TurnFile;

function scripted(rows: unknown[]) {
  const prompts: string[] = [];
  let calls = 0;
  const generate: GenerateFn = async (prompt: string) => {
    prompts.push(prompt);
    const row = rows[Math.min(calls, rows.length - 1)];
    calls += 1;
    return typeof row === "string" ? row : JSON.stringify(row);
  };
  return {
    generate,
    prompts,
    calls: () => calls,
  };
}

const grounded: Verification = {
  summary: "grounded",
  claims: [
    {
      claim: "Checked in the fixture.",
      verdict: "pass",
      evidence: "fixture",
    },
  ],
};

describe("agent loop", () => {
  it("parses a tool call with a top-level query", () => {
    const turn = parseModelTurn('{"tool":"search_handbook","query":"pto days"}');
    assert.equal(turn?.action, "tool");
    if (turn?.action === "tool") {
      assert.equal(turn.tool, "search_handbook");
      assert.equal(turn.input.query, "pto days");
    }
  });

  it("caps tool rounds at 3", () => {
    assert.equal(MAX_TOOL_ROUNDS, 3);
  });

  it("searches, drafts, and verifies a PTO question from fixtures", async () => {
    const chunks = await loadCorpusChunks();
    const model = scripted(turns.ptoHappyPath);
    let verified = "";
    const result = await runAgentLoop({
      question: "How many vacation days do full-time employees get?",
      chunks,
      generate: model.generate,
      search: async (query, topK) => lexicalSearch(chunks, query, topK),
      verify: async (_question, answer) => {
        verified = answer;
        return grounded;
      },
    });

    assert.equal(result.stoppedEarly, false);
    assert.match(result.answer, /30 days/);
    assert.equal(verified, result.answer);
    assert.ok(result.citations.some((c) => c.source === "pto-and-leave.md"));
    assert.ok(result.steps.some((step) => step.tool === "search_handbook"));
    assert.equal(result.steps.at(-1)?.kind, "draft");
    assert.equal(model.calls(), 2);
    assert.match(model.prompts[1] ?? "", /30 days/);
    assert.equal(result.verification.summary, "grounded");
  });

  it("records quote_check on the trace", async () => {
    const chunks = await loadCorpusChunks();
    const model = scripted(turns.quoteThenAnswer);
    const result = await runAgentLoop({
      question: "Does the handbook say 30 days of paid vacation?",
      chunks,
      generate: model.generate,
      search: async () => {
        throw new Error("search should not run");
      },
      verify: async () => grounded,
    });

    const quote = result.steps.find((step) => step.tool === "quote_check");
    assert.ok(quote);
    assert.match(quote.detail, /Matched in pto-and-leave.md/);
    assert.equal(result.stoppedEarly, false);
    assert.ok(result.citations.some((c) => c.source === "pto-and-leave.md"));
  });

  it("stops when the model asks for a fourth tool", async () => {
    const chunks: Chunk[] = [
      {
        id: "pto-and-leave-1",
        source: "pto-and-leave.md",
        title: "Time off and leave",
        text: "Full-time employees receive 30 days of paid vacation.",
      },
    ];
    let searches = 0;
    const model = scripted(turns.keepsCallingTools);
    const result = await runAgentLoop({
      question: "How many vacation days?",
      chunks,
      generate: model.generate,
      search: async (query, topK) => {
        searches += 1;
        return lexicalSearch(chunks, query, topK);
      },
      verify: async () => grounded,
    });

    assert.equal(searches, MAX_TOOL_ROUNDS);
    assert.equal(model.calls(), MAX_TOOL_ROUNDS + 1);
    assert.match(model.prompts.at(-1) ?? "", /Tools are closed/);
    assert.equal(result.stoppedEarly, true);
    assert.equal(result.answer, AGENT_LOOP_STOP_MESSAGE);
    assert.equal(result.steps.at(-1)?.kind, "stop");
    assert.equal(
      result.steps.filter((step) => step.tool === "search_handbook").length,
      MAX_TOOL_ROUNDS,
    );
  });

  it("does not rerun a repeated tool call, then drafts", async () => {
    const chunks: Chunk[] = [
      {
        id: "pto-and-leave-1",
        source: "pto-and-leave.md",
        title: "Time off and leave",
        text: "Full-time employees receive 30 days of paid vacation.",
      },
    ];
    let searches = 0;
    const model = scripted(turns.repeatsSameCall);
    const result = await runAgentLoop({
      question: "How many vacation days?",
      chunks,
      generate: model.generate,
      search: async (query, topK) => {
        searches += 1;
        return lexicalSearch(chunks, query, topK);
      },
      verify: async () => grounded,
    });

    assert.equal(searches, 1);
    assert.equal(model.calls(), 3);
    assert.equal(result.stoppedEarly, false);
    assert.match(result.answer, /30 days/);
    assert.ok(
      result.steps.some((step) => step.detail.includes("already ran")),
    );
  });

  it("verifies against the chunk text while chips stay short", async () => {
    const marker = "unique-marker-vacation-rule";
    const text = `${"Paid vacation policy. ".repeat(40)}${marker}`;
    const chunks: Chunk[] = [
      {
        id: "pto-and-leave-1",
        source: "pto-and-leave.md",
        title: "Time off and leave",
        text,
      },
    ];
    let verifiedSnippet = "";
    const result = await runAgentLoop({
      question: "How many vacation days?",
      chunks,
      generate: scripted([
        {
          action: "tool",
          tool: "search_handbook",
          input: { query: "vacation" },
        },
        { action: "answer", answer: "See the handbook passage [1]." },
      ]).generate,
      search: async () => [
        {
          id: "pto-and-leave-1",
          source: "pto-and-leave.md",
          title: "Time off and leave",
          snippet: text.slice(0, 280),
          score: 0.8,
        },
      ],
      verify: async (_question, _answer, cites) => {
        verifiedSnippet = cites[0]?.snippet ?? "";
        return grounded;
      },
    });

    assert.match(verifiedSnippet, new RegExp(marker));
    assert.equal(result.citations[0]?.snippet.includes(marker), false);
  });

  it("retrieves once when the model answers before any tool", async () => {
    const question = "How many vacation days do full-time employees get?";
    const chunks: Chunk[] = [
      {
        id: "pto-and-leave-1",
        source: "pto-and-leave.md",
        title: "Time off and leave",
        text: "Full-time employees receive 30 days of paid vacation per calendar year.",
      },
    ];
    const queries: string[] = [];
    const model = scripted([
      { action: "answer", answer: "I am guessing 12 days." },
      {
        action: "answer",
        answer: "Full-time employees receive 30 days of paid vacation per calendar year.",
      },
    ]);
    const result = await runAgentLoop({
      question,
      chunks,
      generate: model.generate,
      search: async (query) => {
        queries.push(query);
        const hit: Citation = {
          id: "pto-and-leave-1",
          source: "pto-and-leave.md",
          title: "Time off and leave",
          snippet: "30 days of paid vacation",
          score: 0.9,
        };
        return [hit];
      },
      verify: async (_question, answer) => {
        assert.match(answer, /30 days/);
        assert.doesNotMatch(answer, /12 days/);
        return grounded;
      },
    });

    assert.deepEqual(queries, [question]);
    assert.equal(model.calls(), 2);
    assert.match(model.prompts[1] ?? "", /30 days/);
    assert.equal(result.stoppedEarly, false);
  });

  it("keeps going after a tool error, and stops on an unusable draft", async () => {
    const chunks: Chunk[] = [];
    const recovered = scripted([
      { action: "tool", tool: "search_handbook", input: { query: "vacation" } },
      {
        action: "answer",
        answer: "The handbook search failed, so I cannot confirm that.",
      },
    ]);
    const recoveredResult = await runAgentLoop({
      question: "vacation?",
      chunks,
      generate: recovered.generate,
      search: async () => {
        throw new Error("embed timeout");
      },
      verify: async () => grounded,
    });
    assert.match(
      recoveredResult.steps.find((step) => step.tool === "search_handbook")?.detail ?? "",
      /embed timeout/,
    );
    assert.match(recoveredResult.answer, /cannot confirm/);

    const stalled = scripted(["nope", "still nope", "also nope"]);
    const stalledResult = await runAgentLoop({
      question: "vacation?",
      chunks,
      generate: stalled.generate,
      search: async () => [],
      verify: async (_question, answer) => {
        assert.equal(answer, AGENT_DRAFT_STOP_MESSAGE);
        return grounded;
      },
    });
    assert.equal(stalledResult.stoppedEarly, true);
    assert.equal(stalledResult.answer, AGENT_DRAFT_STOP_MESSAGE);
    assert.ok(stalled.calls() <= MAX_TOOL_ROUNDS + 1);
  });

  it("rethrows a missing corpus instead of drafting over it", async () => {
    await assert.rejects(
      () =>
        runAgentLoop({
          question: "vacation?",
          chunks: [],
          generate: async () =>
            JSON.stringify({
              action: "tool",
              tool: "search_handbook",
              input: { query: "vacation" },
            }),
          search: async () => {
            throw new Error("No corpus documents found under corpus.");
          },
          verify: async () => {
            throw new Error("verify should not run");
          },
        }),
      /No corpus documents/,
    );
  });
});
