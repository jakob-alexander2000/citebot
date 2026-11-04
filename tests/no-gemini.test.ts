import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { handleAnswer, handleLimits } from "../lib/core/handlers";
import { handleChat } from "../lib/core/chat-bridge";
import { resetIndexesForTests } from "../lib/core/index-docs";

const ROOTS = ["app", "lib", "components", "scripts"];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("no Gemini on any route", () => {
  it("has no Gemini client import in application source", () => {
    const hits: string[] = [];
    const packageJson = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    if (packageJson.includes("@google/generative-ai")) hits.push("package.json: @google/generative-ai");
    for (const root of ROOTS) {
      for (const file of walk(path.join(process.cwd(), root))) {
        const source = fs.readFileSync(file, "utf8");
        if (source.includes("@google/generative-ai")) hits.push(`${path.relative(process.cwd(), file)}: import`);
        if (source.includes("generativelanguage.googleapis.com")) {
          hits.push(`${path.relative(process.cwd(), file)}: host`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("does not call generativelanguage.googleapis.com from chat, answer, or limits", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    process.env.GEMINI_API_KEY = "should-not-be-used";
    resetIndexesForTests();
    const urls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      throw new Error(`unexpected fetch ${url}`);
    };
    try {
      const chat = await handleChat(
        new Request("http://127.0.0.1/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: "How many paid vacation days do full-time employees get?" }),
        }),
      );
      assert.equal(chat.status, 200);
      const chatBody = (await chat.json()) as { answer?: string; provider?: string };
      assert.match(chatBody.answer ?? "", /30/);
      assert.equal(chatBody.provider, "mock");

      const limits = await handleLimits(new Request("http://127.0.0.1/api/limits"));
      const limitsBody = (await limits.json()) as { provider: string };
      assert.equal(limitsBody.provider, "mock");

      const answer = await handleAnswer(
        new Request("http://127.0.0.1/api/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: "Which weekdays are desk days?", collection: "handbook" }),
        }),
      );
      assert.equal(answer.status, 200);
      assert.equal(
        urls.some((url) => url.includes("generativelanguage.googleapis.com")),
        false,
      );
    } finally {
      globalThis.fetch = original;
      delete process.env.GEMINI_API_KEY;
      resetIndexesForTests();
    }
  });
});
