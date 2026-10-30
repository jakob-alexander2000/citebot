import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { loadCorpusChunks } from "../lib/corpus";
import {
  executeTool,
  lexicalSearch,
  type ToolRuntime,
} from "../lib/tools";
import type { Chunk } from "../lib/types";

const sample: Chunk[] = [
  {
    id: "pto-and-leave-1",
    source: "pto-and-leave.md",
    title: "Time off and leave",
    text: "Full-time employees receive **30 days** of paid vacation per calendar year.",
  },
  {
    id: "expense-policy-1",
    source: "expense-policy.md",
    title: "Expense policy",
    text: "Client meals up to **€45 per person**. Home-office equipment up to **€400 per year**.",
  },
];

function runtime(chunks: Chunk[] = sample): ToolRuntime {
  return {
    chunks,
    search: async (query, topK = 4) => lexicalSearch(chunks, query, topK),
  };
}

describe("handbook tools", () => {
  it("ranks vacation text above expenses for a PTO query", async () => {
    const hits = lexicalSearch(sample, "full-time vacation days", 2);
    assert.equal(hits[0]?.source, "pto-and-leave.md");
  });

  it("rejects a search with no query before calling retrieval", async () => {
    let called = false;
    const result = await executeTool("search_handbook", {}, {
      chunks: sample,
      search: async () => {
        called = true;
        return [];
      },
    });
    assert.equal(called, false);
    assert.equal(result.ok, false);
    assert.match(result.summary, /Missing query/);
  });

  it("caps search results at 4", async () => {
    const chunks = Array.from({ length: 6 }, (_, i) => ({
      id: `doc-${i}`,
      source: `doc-${i}.md`,
      title: "Policy",
      text: "vacation days policy text for the handbook",
    }));
    const result = await executeTool(
      "search_handbook",
      { query: "vacation days policy", topK: 20 },
      runtime(chunks),
    );
    assert.equal(result.citations.length, 4);
  });

  it("lists topics, opens a section, and checks quotes", async () => {
    const topics = await executeTool("list_topics", {}, runtime());
    assert.match(topics.body, /Time off and leave \(pto-and-leave.md\)/);

    const section = await executeTool(
      "get_section",
      { id: "pto-and-leave-1" },
      runtime(),
    );
    assert.match(section.body, /30 days/);
    assert.equal(section.citations[0]?.id, "pto-and-leave-1");

    const byFile = await executeTool(
      "get_section",
      { source: "expense-policy.md" },
      runtime(),
    );
    assert.match(byFile.body, /€400/);

    const matched = await executeTool(
      "quote_check",
      { quote: "30 days of paid vacation" },
      runtime(),
    );
    assert.match(matched.summary, /Matched in pto-and-leave.md/);

    const missing = await executeTool(
      "quote_check",
      { quote: "office dog named Bruno" },
      runtime(),
    );
    assert.match(missing.summary, /No match/);
  });

  it("finds the committed PTO passage without embeddings", async () => {
    const chunks = await loadCorpusChunks({
      dir: path.join(process.cwd(), "examples/nordlicht-corpus"),
    });
    const hits = lexicalSearch(chunks, "full-time vacation days", 4);
    assert.ok(hits.some((hit) => hit.source === "pto-and-leave.md"));

    const quote = await executeTool(
      "quote_check",
      { quote: "30 days of paid vacation" },
      { chunks, search: async () => lexicalSearch(chunks, "vacation", 4) },
    );
    assert.match(quote.summary, /pto-and-leave.md/);
  });

  it("keeps language-neutral files and drops the other language folder", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "citebot-corpus-"));
    fs.writeFileSync(path.join(dir, "shared.md"), "# Shared\n\nDesk days are Tuesday and Thursday.");
    fs.mkdirSync(path.join(dir, "de"));
    fs.writeFileSync(path.join(dir, "de", "nur.md"), "# Nur\n\nDieser Text bleibt in seinem Ordner.");
    fs.mkdirSync(path.join(dir, "en"));
    fs.writeFileSync(path.join(dir, "en", "only.md"), "# Only\n\nEnglish folder text.");

    const en = await loadCorpusChunks({ dir, locale: "en" });
    assert.ok(en.some((chunk) => chunk.source === "shared.md"));
    assert.ok(en.some((chunk) => chunk.source === "en/only.md"));
    assert.equal(en.some((chunk) => chunk.source.startsWith("de/")), false);

    const de = await loadCorpusChunks({ dir, locale: "de" });
    assert.ok(de.some((chunk) => chunk.source === "shared.md"));
    assert.ok(de.some((chunk) => chunk.source === "de/nur.md"));
    assert.equal(de.some((chunk) => chunk.source.startsWith("en/")), false);
  });
});
