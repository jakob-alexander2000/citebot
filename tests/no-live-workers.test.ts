import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { handleAnswer } from "../lib/core/handlers";
import { handleChat } from "../lib/core/chat-bridge";
import { resetIndexesForTests } from "../lib/core/index-docs";
import { runGoldenSuite } from "../lib/eval-harness";

describe("no live Workers AI in tests or eval", () => {
  it("eval and the answer routes do not fetch api.cloudflare.com", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    process.env.CITEBOT_ALLOW_LIVE_MODEL = "0";
    resetIndexesForTests();
    const urls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("api.cloudflare.com")) {
        throw new Error(`live Workers AI fetch: ${url}`);
      }
      throw new Error(`unexpected fetch ${url}`);
    };
    try {
      const report = await runGoldenSuite();
      assert.equal(report.failed, 0);
      const chat = await handleChat(
        new Request("http://127.0.0.1/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: "Which weekdays are desk days?" }),
        }),
      );
      assert.equal(chat.status, 200);
      const answer = await handleAnswer(
        new Request("http://127.0.0.1/api/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: "Which weekdays are desk days?" }),
        }),
      );
      assert.equal(answer.status, 200);
      assert.equal(urls.some((url) => url.includes("api.cloudflare.com")), false);
    } finally {
      globalThis.fetch = original;
      delete process.env.CITEBOT_ALLOW_LIVE_MODEL;
      resetIndexesForTests();
    }
  });

  it("CI does not run the live embed script", () => {
    const ci = fs.readFileSync(path.join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8");
    assert.equal(ci.includes("embed:passages"), false);
    assert.equal(ci.includes("retrieval:measure"), false);
    assert.match(ci, /CITEBOT_ALLOW_LIVE_MODEL:\s*"0"/);
    const evalSource = fs.readFileSync(path.join(process.cwd(), "scripts", "eval.ts"), "utf8");
    assert.equal(evalSource.includes("api.cloudflare.com"), false);
    assert.equal(evalSource.includes("getModelProvider"), false);
  });
});
