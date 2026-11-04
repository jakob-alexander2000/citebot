import fs from "node:fs";
import path from "node:path";
import { measureHandbookRetrieval } from "../lib/core/retrieval-quality";

const report = await measureHandbookRetrieval(3);
const file = path.join(process.cwd(), "evals", "retrieval-quality.json");
fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      file,
      before: { hits: report.before.hits, total: report.before.total, recallAt3: report.before.recallAt3, mrr: report.before.mrr },
      after: { hits: report.after.hits, total: report.after.total, recallAt3: report.after.recallAt3, mrr: report.after.mrr },
      neuralEmbeddings: report.neuralEmbeddings,
    },
    null,
    2,
  ),
);
