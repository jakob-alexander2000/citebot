import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { parseVerifierClaims, summarizeClaims } from "../lib/verify";
import type { Citation, VerificationSummary } from "../lib/types";

type VerifyCase = {
  name: string;
  raw: string;
  citationIds: string[];
  summary: VerificationSummary;
  claims: number;
  citationKept: boolean;
};

const cases = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "tests/fixtures/verify-cases.json"), "utf8"),
) as VerifyCase[];

const citations: Citation[] = [
  {
    id: "pto-and-leave-1",
    source: "pto-and-leave.md",
    title: "Time off and leave",
    snippet: "30 days of paid vacation",
    score: 0.8,
  },
];

describe("verify fixtures", () => {
  it("treats an empty claim list as ungrounded", () => {
    assert.equal(summarizeClaims([]), "ungrounded");
  });

  for (const row of cases) {
    it(row.name, () => {
      const claims = parseVerifierClaims(row.raw, citations);
      assert.equal(claims.length, row.claims);
      assert.equal(summarizeClaims(claims), row.summary);
      if (row.claims > 0) {
        assert.equal(
          claims.some((claim) => Boolean(claim.citationId)),
          row.citationKept,
        );
      }
    });
  }

  it("keeps at most 8 claims", () => {
    const claims = Array.from({ length: 10 }, (_, i) => ({
      claim: `Claim ${i}`,
      verdict: "pass",
      evidence: "ok",
    }));
    const raw = JSON.stringify({ claims });
    assert.equal(parseVerifierClaims(raw, []).length, 8);
  });
});
