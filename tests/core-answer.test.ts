import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetAuditForTests, auditEntries } from "../lib/core/audit";
import { handleAnswer } from "../lib/core/handlers";
import { resetIndexesForTests } from "../lib/core/index-docs";

describe("answer API", { concurrency: false }, () => {
  it("answers the handbook question from the mock provider and audits without the question", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    resetIndexesForTests();
    resetAuditForTests();
    const question = "How many paid vacation days do full-time employees get?";
    const response = await handleAnswer(
      new Request("http://127.0.0.1/api/answer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ question }),
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
    const body = (await response.json()) as {
      provider: string;
      generation: string;
      auditId: string;
      sentences: { text: string; match: string; passages: { source: string }[]; flaggedConditions: { kind: string }[] }[];
      trace: { step: string }[];
    };
    assert.equal(body.provider, "mock");
    assert.equal(body.generation, "mock");
    assert.ok(body.sentences.some((sentence) => sentence.text.includes("30")));
    assert.ok(body.sentences.some((sentence) => sentence.passages.some((passage) => passage.source.includes("pto-and-leave"))));
    assert.ok(body.trace.some((step) => step.step === "keyword"));
    assert.ok(body.trace.some((step) => step.step === "fuse"));
    const audit = auditEntries().find((entry) => entry.id === body.auditId);
    assert.ok(audit);
    assert.equal(JSON.stringify(audit).includes(question), false);
    assert.equal(audit?.questionChars, question.length);
  });

  it("flags a dropped unless on a caller draft", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    const response = await handleAnswer(
      new Request("http://127.0.0.1/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: JSON.stringify({
          question: "Until when can unused paid time off carry over?",
          draft: "Unused paid time off does not carry over past March 31 of the following year.",
        }),
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    const body = (await response.json()) as {
      generation: string;
      sentences: { flaggedConditions: { kind: string }[] }[];
    };
    assert.equal(body.generation, "caller-draft");
    assert.ok(body.sentences.some((sentence) => sentence.flaggedConditions.some((flag) => flag.kind === "unless")));
  });

  it("answers German phone facts and flags a dropped sofern", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    const kept = await handleAnswer(
      new Request("http://127.0.0.1/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: "Wann gibt es ein schriftliches Angebot?",
          locale: "de",
          collection: "phone",
        }),
      }),
    );
    const keptBody = (await kept.json()) as { sentences: { text: string }[] };
    assert.equal(kept.status, 200);
    assert.ok(keptBody.sentences.some((sentence) => /erst nach|sofern/i.test(sentence.text)));

    const dropped = await handleAnswer(
      new Request("http://127.0.0.1/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: "Wann gibt es ein schriftliches Angebot?",
          locale: "de",
          collection: "phone",
          draft: "Ein schriftliches Angebot gibt es nach einer Besichtigung.",
        }),
      }),
    );
    const droppedBody = (await dropped.json()) as { sentences: { flaggedConditions: { kind: string }[] }[] };
    const kinds = droppedBody.sentences.flatMap((sentence) => sentence.flaggedConditions.map((flag) => flag.kind));
    assert.ok(kinds.includes("erst nach"));
    assert.ok(kinds.includes("sofern"));
  });

  it("rejects an empty question", async () => {
    const response = await handleAnswer(
      new Request("http://127.0.0.1/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: " " }),
      }),
    );
    assert.equal(response.status, 400);
  });
});
