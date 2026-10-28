/**
 * Golden-question scorecard for the English CiteBot handbook.
 * Usage: npm run eval
 * No GEMINI_API_KEY. Exits 1 when any case fails.
 */
import { formatReport, runGoldenSuite } from "../lib/eval-harness";

async function main() {
  const report = await runGoldenSuite();
  console.log(formatReport(report));
  if (report.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
