import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { handleAnswer, handleLimits } from "../lib/core/handlers";
import { resetIndexesForTests } from "../lib/core/index-docs";
import { isQuotaFailure, QuotaExceededError } from "../lib/core/models";
import { getModelProvider } from "../lib/core/provider";
import { resetAuditForTests } from "../lib/core/audit";
import { CloudflareWorkersAI } from "../lib/core/workers-ai";
import { WORKERS_AI_DEFAULT_FALLBACK_MODEL, WORKERS_AI_DEFAULT_MODEL } from "../lib/core/models";

const TOKEN = "super-secret-token";
const ACCOUNT = "account-id-value";

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("model provider", { concurrency: false }, () => {
  const previous = {
    account: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    gemini: process.env.GEMINI_API_KEY,
    model: process.env.WORKERS_AI_MODEL,
    fallback: process.env.WORKERS_AI_FALLBACK_MODEL,
  };

  function restoreEnv() {
    const set = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    set("CLOUDFLARE_ACCOUNT_ID", previous.account);
    set("CLOUDFLARE_API_TOKEN", previous.token);
    set("GEMINI_API_KEY", previous.gemini);
    set("WORKERS_AI_MODEL", previous.model);
    set("WORKERS_AI_FALLBACK_MODEL", previous.fallback);
  }

  it("uses the mock provider when Workers AI env vars are missing, even if GEMINI_API_KEY is set", () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    process.env.GEMINI_API_KEY = "not-a-real-key";
    try {
      const provider = getModelProvider();
      assert.equal(provider.id, "mock");
      const limits = {
        provider: provider.id,
      };
      assert.equal(limits.provider, "mock");
    } finally {
      restoreEnv();
    }
  });

  it("reports provider mock from the limits payload and hides credentials", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    process.env.GEMINI_API_KEY = "gemini-should-not-appear";
    try {
      const response = await handleLimits(
        new Request("http://localhost/api/limits", { headers: { origin: "https://preview.vercel.app" } }),
      );
      const body = (await response.json()) as { provider: string; quota: { neuronsPerDay: number } };
      assert.equal(response.status, 200);
      assert.equal(body.provider, "mock");
      assert.equal(body.quota.neuronsPerDay, 10_000);
      assert.equal(response.headers.get("access-control-allow-origin"), "https://preview.vercel.app");
      const encoded = JSON.stringify(body);
      assert.equal(encoded.includes("gemini-should-not-appear"), false);
      assert.equal(encoded.includes(TOKEN), false);
    } finally {
      restoreEnv();
    }
  });

  it("does not call generativelanguage.googleapis.com from the answer core", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    process.env.GEMINI_API_KEY = "gemini-should-not-be-used";
    resetIndexesForTests();
    resetAuditForTests();
    const urls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      throw new Error(`unexpected fetch ${url}`);
    };
    try {
      const roots = [
        ...walk(path.join(process.cwd(), "lib", "core")),
        path.join(process.cwd(), "app", "api", "answer", "route.ts"),
        path.join(process.cwd(), "app", "api", "upload", "route.ts"),
        path.join(process.cwd(), "app", "api", "limits", "route.ts"),
        path.join(process.cwd(), "components", "AnswerDesk.tsx"),
      ];
      for (const file of roots) {
        const source = fs.readFileSync(file, "utf8");
        assert.equal(source.includes("generativelanguage.googleapis.com"), false, file);
        assert.equal(source.includes("GEMINI"), false, file);
        assert.equal(source.includes("@google/generative-ai"), false, file);
      }
      const response = await handleAnswer(
        new Request("http://localhost/api/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: "How many paid vacation days do full-time employees get?",
          }),
        }),
      );
      assert.equal(response.status, 200);
      const body = (await response.json()) as { provider: string; sentences: { text: string }[] };
      assert.equal(body.provider, "mock");
      assert.ok(body.sentences.some((sentence) => sentence.text.includes("30")));
      assert.equal(
        urls.some((url) => url.includes("generativelanguage.googleapis.com")),
        false,
      );
    } finally {
      globalThis.fetch = original;
      restoreEnv();
      resetIndexesForTests();
    }
  });

  it("maps a neuron quota failure to QuotaExceeded and does not call the fallback model", async () => {
    const urls: string[] = [];
    const provider = new CloudflareWorkersAI({
      accountId: ACCOUNT,
      apiToken: TOKEN,
      model: WORKERS_AI_DEFAULT_MODEL,
      fallbackModel: WORKERS_AI_DEFAULT_FALLBACK_MODEL,
      embedModel: "@cf/baai/bge-m3",
      fetchImpl: async (url) => {
        urls.push(url);
        return new Response(
          JSON.stringify({
            success: false,
            errors: [{ message: "You have used up your daily neuron allowance of 10000." }],
          }),
          { status: 429 },
        );
      },
    });
    await assert.rejects(
      () =>
        provider.generate({
          purpose: "draft",
          locale: "en",
          question: "Hours?",
          passages: [{ id: "1", title: "Hours", text: "09:00 to 17:00." }],
        }),
      (err: unknown) => err instanceof QuotaExceededError,
    );
    assert.equal(urls.length, 1);
    assert.equal(urls[0]?.includes(WORKERS_AI_DEFAULT_FALLBACK_MODEL), false);
    assert.equal(isQuotaFailure(200, { errors: [{ message: "quota exceeded" }] }), true);
    assert.equal(isQuotaFailure(429, {}), true);
    assert.equal(isQuotaFailure(503, { errors: [{ message: "overloaded" }] }), false);
  });

  it("uses the fallback model when the main model fails for a reason other than quota", async () => {
    const urls: string[] = [];
    const provider = new CloudflareWorkersAI({
      accountId: ACCOUNT,
      apiToken: TOKEN,
      model: WORKERS_AI_DEFAULT_MODEL,
      fallbackModel: WORKERS_AI_DEFAULT_FALLBACK_MODEL,
      embedModel: "@cf/baai/bge-m3",
      fetchImpl: async (url, init) => {
        urls.push(url);
        if (url.includes(WORKERS_AI_DEFAULT_MODEL)) {
          return new Response(JSON.stringify({ success: false, errors: [{ message: "overloaded" }] }), {
            status: 503,
          });
        }
        const body = JSON.parse(String(init.body)) as { messages: { content: string }[] };
        assert.match(body.messages.map((message) => message.content).join("\n"), /German/);
        return new Response(
          JSON.stringify({ success: true, result: { response: "Telefonzeiten sind 09:00 bis 17:00." } }),
          { status: 200 },
        );
      },
    });
    const result = await provider.generate({
      purpose: "draft",
      locale: "de",
      question: "Wann ist das Telefon offen?",
      passages: [{ id: "1", title: "Zeiten", text: "Telefonzeiten sind 09:00–17:00." }],
    });
    assert.equal(result.via, "fallback");
    assert.equal(result.model, WORKERS_AI_DEFAULT_FALLBACK_MODEL);
    assert.match(result.text, /09:00/);
    assert.equal(urls[0]?.includes(WORKERS_AI_DEFAULT_MODEL), true);
    assert.equal(urls[1]?.includes(WORKERS_AI_DEFAULT_FALLBACK_MODEL), true);
    assert.equal(urls.some((url) => url.includes(TOKEN)), false);
  });

  it("strips the API token from errors", async () => {
    const provider = new CloudflareWorkersAI({
      accountId: ACCOUNT,
      apiToken: TOKEN,
      model: WORKERS_AI_DEFAULT_MODEL,
      fallbackModel: WORKERS_AI_DEFAULT_FALLBACK_MODEL,
      embedModel: "@cf/baai/bge-m3",
      fetchImpl: async () => {
        throw new Error(`network failed Authorization Bearer ${TOKEN} account ${ACCOUNT}`);
      },
    });
    await assert.rejects(
      () => provider.generate({ purpose: "context", locale: "en", title: "Hours", headingPath: ["Hours"], passage: "09:00." }),
      (err: unknown) => {
        const message = err instanceof Error ? `${err.name} ${err.message}` : String(err);
        assert.equal(message.includes(TOKEN), false);
        assert.equal(message.includes(ACCOUNT), false);
        return true;
      },
    );
  });

  it("returns quota_exceeded from the answer route and does not try the fallback", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_API_TOKEN = TOKEN;
    delete process.env.WORKERS_AI_MODEL;
    delete process.env.WORKERS_AI_FALLBACK_MODEL;
    resetIndexesForTests();
    const urls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      return new Response(
        JSON.stringify({ success: false, errors: [{ message: "daily neuron limit reached" }] }),
        { status: 429 },
      );
    };
    try {
      const response = await handleAnswer(
        new Request("http://localhost/api/answer", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "https://citebot.vercel.app" },
          body: JSON.stringify({ question: "How many paid vacation days do full-time employees get?" }),
        }),
      );
      const body = (await response.json()) as { code?: string; error?: string };
      assert.equal(response.status, 429);
      assert.equal(body.code, "quota_exceeded");
      assert.equal(JSON.stringify(body).includes(TOKEN), false);
      assert.equal(urls.length, 1);
      assert.equal(urls[0]?.includes(WORKERS_AI_DEFAULT_FALLBACK_MODEL), false);
      assert.equal(urls.some((url) => url.includes("generativelanguage.googleapis.com")), false);
    } finally {
      globalThis.fetch = original;
      restoreEnv();
      resetIndexesForTests();
    }
  });
});
