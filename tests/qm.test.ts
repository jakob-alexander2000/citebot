import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { runAgentLoop } from "../lib/agent";
import { loadCorpusChunks } from "../lib/corpus";
import { DEMO_QUESTIONS } from "../lib/demo-questions";
import { lexicalSearch } from "../lib/tools";
import { parseVerifierClaims, summarizeClaims } from "../lib/verify";
import type { Citation, VerificationSummary } from "../lib/types";

type QmCase = {
  name: string;
  locale: "de" | "en";
  raw: string;
  citationIds: string[];
  summary: VerificationSummary;
  claims: number;
  citationKept: boolean;
};

const cases = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "tests/fixtures/qm-claims.json"), "utf8"),
) as QmCase[];

describe("QM handbook", () => {
  it("loads German and English chapters and keeps them apart", async () => {
    const all = await loadCorpusChunks();
    assert.ok(all.some((chunk) => chunk.lang === "de" && chunk.text.includes("8 ppm")));
    assert.ok(all.some((chunk) => chunk.lang === "en" && chunk.text.includes("8 ppm")));
    assert.equal(
      all.some((chunk) => chunk.source === "pto-and-leave.md"),
      false,
    );

    const de = await loadCorpusChunks({ locale: "de" });
    const en = await loadCorpusChunks({ locale: "en" });
    assert.ok(de.length > 0 && en.length > 0);
    assert.ok(de.every((chunk) => chunk.lang === "de"));
    assert.ok(en.every((chunk) => chunk.lang === "en"));

    const deHits = lexicalSearch(de, "Kundenreklamationen ppm", 3);
    assert.equal(deHits[0]?.source, "de/qualitaetspolitik.md");
    const enHits = lexicalSearch(en, "customer complaint ppm", 3);
    assert.equal(enHits[0]?.source, "en/quality-policy.md");

    const capa = lexicalSearch(de, "Klasse Sofortmaßnahme Stunden", 3);
    assert.ok(capa.some((hit) => hit.source === "de/capa.md"));
  });

  it("keeps language-neutral files in every locale and drops the other language", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gd-corpus-"));
    fs.writeFileSync(
      path.join(dir, "shared.md"),
      "# Shared\n\nCalibration interval is 12 months for shared gauges.",
    );
    fs.mkdirSync(path.join(dir, "de"));
    fs.writeFileSync(
      path.join(dir, "de", "nur.md"),
      "# Nur Deutsch\n\nKalibrierintervall für deutsche Lehren.",
    );

    const de = await loadCorpusChunks({ dir, locale: "de" });
    assert.ok(de.some((chunk) => chunk.source === "shared.md"));
    assert.ok(de.some((chunk) => chunk.source === "de/nur.md"));

    const en = await loadCorpusChunks({ dir, locale: "en" });
    assert.ok(en.some((chunk) => chunk.source === "shared.md"));
    assert.equal(
      en.some((chunk) => chunk.source.startsWith("de/")),
      false,
    );
  });

  it("asks the model for a German answer from the German handbook", async () => {
    const chunks = await loadCorpusChunks({ locale: "de" });
    const prompts: string[] = [];
    const result = await runAgentLoop({
      question: DEMO_QUESTIONS.de[0]!.question,
      locale: "de",
      chunks,
      generate: async (prompt) => {
        prompts.push(prompt);
        if (prompts.length === 1) {
          return JSON.stringify({
            action: "tool",
            tool: "search_handbook",
            input: { query: "Kundenreklamationen ppm" },
          });
        }
        return JSON.stringify({
          action: "answer",
          answer:
            "Das Ziel für Kundenreklamationen liegt bei höchstens 8 ppm über ein rollierendes Fenster von 12 Monaten [1].",
        });
      },
      search: async (query, topK) => lexicalSearch(chunks, query, topK),
      verify: async () => ({
        summary: "grounded",
        claims: [
          {
            claim: "8 ppm",
            verdict: "pass",
            evidence: "fixture",
          },
        ],
      }),
    });

    assert.match(prompts[0] ?? "", /Antworte auf Deutsch/);
    assert.match(result.answer, /8 ppm/);
    assert.ok(result.citations.some((citation) => citation.source.startsWith("de/")));
    assert.equal(result.steps.at(-1)?.label, "Entwurf");
  });

  it("documents the six demo questions", () => {
    const doc = fs.readFileSync(path.join(process.cwd(), "docs/demo-questions.md"), "utf8");
    for (const locale of ["de", "en"] as const) {
      assert.equal(DEMO_QUESTIONS[locale].length, 3);
      for (const item of DEMO_QUESTIONS[locale]) {
        assert.ok(doc.includes(item.question), item.question);
      }
    }
  });
});

describe("QM claim fixtures", () => {
  for (const row of cases) {
    it(row.name, () => {
      const citations: Citation[] = row.citationIds.map((id) => ({
        id,
        source: `${id}.md`,
        title: row.locale === "de" ? "QM-Handbuch" : "Quality handbook",
        snippet: "fixture",
        score: 0.8,
      }));
      const claims = parseVerifierClaims(row.raw, citations);
      assert.equal(claims.length, row.claims);
      assert.equal(summarizeClaims(claims), row.summary);
      assert.equal(
        claims.some((claim) => Boolean(claim.citationId)),
        row.citationKept,
      );
      if (row.locale === "de" && claims[0]) {
        assert.match(claims[0].claim, /Kundenreklamationen|8 ppm/);
      }
    });
  }
});
