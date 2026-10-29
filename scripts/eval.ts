/**
 * Golden-question scorecard for the English CiteBot handbook.
 * Usage: npm run eval
 * No GEMINI_API_KEY. Writes evals/last-run.json from this run. Exits 1 when any case fails.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { formatReport, runGoldenSuite } from "../lib/eval-harness";

const RESULT_PATH = path.join(process.cwd(), "evals", "last-run.json");

function git(command: string): string {
  try {
    return execSync(command, { cwd: process.cwd(), encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function main() {
  const report = await runGoldenSuite();
  console.log(formatReport(report));

  const introduced = git("git log --follow --reverse --format=%an%x09%h -- evals/golden.json").split("\n")[0] ?? "";
  const [casesAuthor, casesCommit] = introduced.split("\t");
  const record = {
    measured: report.total
      ? "Each committed handbook question runs the agent loop, then verify marks every claim pass, fail, or unsupported."
      : "No questions were loaded.",
    questionCount: report.total,
    passed: report.passed,
    failed: report.failed,
    score: report.score,
    ranAt: new Date().toISOString(),
    commit: git("git rev-parse HEAD"),
    casesAuthor: casesAuthor || "",
    casesCommit: casesCommit || "",
    casesReason: "",
  };
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(record, null, 2)}\n`);

  if (report.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
