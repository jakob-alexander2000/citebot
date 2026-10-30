import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("recorded eval run", () => {
  it("matches the committed question file and was written by the eval script", () => {
    const golden = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "evals", "golden.json"), "utf8"),
    ) as { cases: unknown[] };
    const parsed = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "evals", "last-run.json"), "utf8"),
    ) as {
      measured: string;
      questionCount: number;
      passed: number;
      failed: number;
      score: string;
      ranAt: string;
      commit: string;
      casesAuthor: string;
      casesReason: string;
    };
    assert.equal(parsed.questionCount, golden.cases.length);
    assert.equal(parsed.passed + parsed.failed, parsed.questionCount);
    assert.match(parsed.score, new RegExp(`^${parsed.passed}/${parsed.questionCount}`));
    assert.match(parsed.ranAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(parsed.commit, /^[0-9a-f]{7,40}$/);
    assert.ok(parsed.measured.length > 20);
    assert.ok(parsed.casesAuthor.length > 0);
    assert.equal(parsed.casesReason, "");
    const page = fs.readFileSync(path.join(process.cwd(), "app", "evals", "page.tsx"), "utf8");
    assert.match(page, /last-run\.json/);
    assert.doesNotMatch(page, /8 of 8/);
  });
});
