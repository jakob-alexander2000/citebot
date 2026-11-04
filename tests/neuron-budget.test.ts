import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleAnswer } from "../lib/core/handlers";
import { resetIndexesForTests } from "../lib/core/index-docs";
import {
  canSpendNeurons,
  estimateNeurons,
  neuronsUsedToday,
  recordNeurons,
  resetNeuronBudgetForTests,
} from "../lib/core/neuron-budget";
import { resetQueryCacheForTests } from "../lib/core/query-cache";
import { CloudflareWorkersAI } from "../lib/core/workers-ai";

describe("neuron budget", () => {
  it("estimates bge-m3 and llama from the published per-million rates", () => {
    const embed = estimateNeurons("@cf/baai/bge-m3", 4000);
    assert.equal(embed, Number(((1000 * 1075) / 1_000_000).toFixed(4)));
    const draft = estimateNeurons("@cf/meta/llama-3.3-70b-instruct-fp8-fast", 400, 40);
    assert.ok(draft > embed);
  });

  it("stops query embeddings after the soft cap and still answers", async () => {
    resetNeuronBudgetForTests();
    resetIndexesForTests();
    resetQueryCacheForTests();
    process.env.CITEBOT_NEURON_SOFT_CAP = "0.0001";
    process.env.CITEBOT_ALLOW_LIVE_MODEL = "1";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    recordNeurons({ kind: "embed", model: "@cf/baai/bge-m3", estimated: 0.0001 });
    assert.equal(canSpendNeurons(0.0001), false);
    let embedCalls = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("bge-m3")) embedCalls += 1;
      return new Response(JSON.stringify({ success: true, result: { response: "30 days." } }), {
        status: 200,
      });
    };
    try {
      const response = await handleAnswer(
        new Request("http://127.0.0.1/api/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: "How many paid vacation days do full-time employees get?" }),
        }),
      );
      const body = (await response.json()) as {
        provider: string;
        sentences: { text: string }[];
        trace: { step: string; detail: string }[];
      };
      assert.equal(response.status, 200);
      assert.equal(embedCalls, 0);
      assert.ok(body.sentences.some((sentence) => sentence.text.includes("30")));
      assert.ok(body.trace.some((step) => step.detail.includes("soft cap")));
    } finally {
      globalThis.fetch = original;
      delete process.env.CITEBOT_NEURON_SOFT_CAP;
      delete process.env.CITEBOT_ALLOW_LIVE_MODEL;
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.CLOUDFLARE_API_TOKEN;
      resetNeuronBudgetForTests();
      resetQueryCacheForTests();
      resetIndexesForTests();
    }
  });

  it("logs an estimate when a generate call succeeds", async () => {
    resetNeuronBudgetForTests();
    const lines: string[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    const provider = new CloudflareWorkersAI({
      accountId: "acct",
      apiToken: "tok",
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      fallbackModel: "@cf/zai-org/glm-4.7-flash",
      embedModel: "@cf/baai/bge-m3",
      fetchImpl: async () =>
        new Response(JSON.stringify({ success: true, result: { response: "30 days." } }), { status: 200 }),
    });
    try {
      await provider.generate({
        purpose: "draft",
        locale: "en",
        question: "Days?",
        passages: [{ id: "1", title: "Leave", text: "30 days." }],
      });
      assert.ok(neuronsUsedToday() > 0);
      assert.ok(lines.some((line) => line.includes("citebot_neurons") && line.includes("generate")));
    } finally {
      console.info = original;
      resetNeuronBudgetForTests();
    }
  });
});
