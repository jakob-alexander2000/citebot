import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { showCitebotEvals, EVAL_BOUNDARY, EVAL_FAIL_MODES, EVAL_SCORECARD } from "../lib/eval-public";
import {
  casePassed,
  evalVerify,
  loadGolden,
  questionCovered,
  runGoldenSuite,
  scoreCase,
} from "../lib/eval-harness";
import type { Citation } from "../lib/types";

const pto: Citation = {
  id: "pto-and-leave-1",
  source: "pto-and-leave.md",
  title: "Time off and leave",
  snippet:
    "Full-time employees receive 30 days of paid vacation per calendar year. Unused PTO does not carry over past March 31.",
  score: 0.9,
};

describe("golden suite", () => {
  it("loads eight English handbook cases with verify criteria", () => {
    const golden = loadGolden();
    assert.equal(golden.suite, "citebot-handbook-golden");
    assert.equal(golden.corpus, "examples/nordlicht-corpus");
    assert.equal(golden.cases.length, 8);
    assert.deepEqual(
      golden.cases.map((row) => row.kind),
      ["grounded", "grounded", "grounded", "grounded", "grounded", "grounded", "gap", "contradiction"],
    );
    const blob = JSON.stringify(golden);
    assert.doesNotMatch(blob, /Kundenreklamation|QM-Handbuch|qualitaetspolitik/);
  });

  it("passes the agent loop on every golden case", async () => {
    const report = await runGoldenSuite();
    const failed = report.results.filter((result) => !result.pass);
    assert.deepEqual(
      failed.map((result) => ({
        id: result.id,
        checks: result.checks.filter((check) => !check.ok),
        answer: result.answerPreview,
      })),
      [],
    );
    assert.equal(report.score, "8/8 (100%)");
    const caught = report.results.find((result) => result.id === "pto-wrong-count");
    assert.ok(caught);
    assert.equal(caught.summary, "ungrounded");
    assert.ok(caught.verdicts.includes("fail"));
    const gap = report.results.find((result) => result.id === "gap-office-dog");
    assert.equal(gap?.summary, "grounded");
    assert.deepEqual(gap?.verdicts, ["pass"]);
  });
});

describe("eval verify", () => {
  it("marks a contradicted vacation figure fail", () => {
    const verification = evalVerify(
      "How many paid vacation days do full-time employees get?",
      "Full-time employees receive 25 days of paid vacation per calendar year.",
      [pto],
    );
    assert.equal(verification.summary, "ungrounded");
    assert.equal(verification.claims[0]?.verdict, "fail");
    assert.match(verification.claims[0]?.evidence ?? "", /25/);
  });

  it("passes a refusal when the passages do not answer", () => {
    const citations: Citation[] = [
      {
        id: "welcome-3",
        source: "welcome.md",
        title: "Welcome to Nordlicht Labs",
        snippet: "Desk days are Tuesday and Thursday at the studio.",
        score: 0.2,
      },
    ];
    assert.equal(questionCovered("What is the office dog's name?", citations), false);
    const verification = evalVerify(
      "What is the office dog's name?",
      "The documents do not cover this.",
      citations,
    );
    assert.equal(verification.summary, "grounded");
    assert.equal(verification.claims[0]?.verdict, "pass");
  });

  it("does not treat a covered question as a gap", () => {
    const verification = evalVerify(
      "How many paid vacation days do full-time employees get?",
      "The documents do not cover this.",
      [pto],
    );
    assert.equal(verification.claims[0]?.verdict, "unsupported");
    assert.notEqual(verification.summary, "grounded");
  });
});

describe("scorecard checks", () => {
  it("fails a grounded reply that omits the required figure", () => {
    const golden = loadGolden();
    const expect = golden.cases.find((row) => row.id === "pto-days")!.expect;
    const checks = scoreCase(expect, {
      answer: "Full-time employees receive paid vacation.",
      citations: [{ source: "pto-and-leave.md" }],
      verification: {
        summary: "grounded",
        claims: [{ claim: "Employees receive paid vacation.", verdict: "pass", evidence: "pto" }],
      },
      stoppedEarly: false,
      tools: ["search_handbook"],
    });
    assert.equal(casePassed(checks), false);
    assert.ok(checks.some((check) => check.name === "answer-includes-all" && !check.ok));
  });
});

describe("public eval surface", () => {
  it("links the scorecard on the CiteBot skin only", () => {
    assert.equal(showCitebotEvals("craft"), true);
    assert.equal(showCitebotEvals("product"), false);
    assert.equal(showCitebotEvals("client"), false);
  });

  it("keeps the English write-up on craft and engineering, without a person or hire frame", () => {
    const blob = [EVAL_SCORECARD.lead, EVAL_SCORECARD.pass, EVAL_SCORECARD.offline, ...EVAL_FAIL_MODES.map((mode) => mode.body)].join(
      " ",
    );
    assert.match(blob, /pass \/ fail \/ unsupported|pass, fail, and unsupported/);
    assert.match(EVAL_SCORECARD.command, /npm run eval/);
    assert.equal(EVAL_FAIL_MODES.length, 6);
    assert.doesNotMatch(blob, /hire|idol|jakob/i);
    assert.doesNotMatch(EVAL_BOUNDARY.en.body, /npm run eval|30 days/);
    assert.match(EVAL_BOUNDARY.de.body, /QM-Handbuch/);
  });
});
