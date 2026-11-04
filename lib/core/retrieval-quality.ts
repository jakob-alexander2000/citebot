import { bm25Rank } from "./bm25";
import { deterministicContext } from "./draft";
import { loadHandbookRaw } from "./documents";

export type RetrievalLabel = {
  id: string;
  question: string;
  source: string;
  phrase: string;
};

/** Questions whose answer passage is in the sample handbook. */
export const HANDBOOK_LABELS: RetrievalLabel[] = [
  {
    id: "pto-days",
    question: "How many paid vacation days do full-time employees get?",
    source: "pto-and-leave.md",
    phrase: "30 days",
  },
  {
    id: "carryover",
    question: "Until when can unused paid time off carry over?",
    source: "pto-and-leave.md",
    phrase: "March 31",
  },
  {
    id: "meal",
    question: "What is the client meal reimbursement limit per person?",
    source: "expense-policy.md",
    phrase: "45",
  },
  {
    id: "receipt",
    question: "Within how many days must expense receipts be uploaded?",
    source: "expense-policy.md",
    phrase: "14 days",
  },
  {
    id: "demo",
    question: "How many minutes is each demo slot before the hard stop?",
    source: "demo-day.md",
    phrase: "Five minutes",
  },
  {
    id: "desk",
    question: "Which weekdays are desk days?",
    source: "welcome.md",
    phrase: "Tuesday",
  },
  {
    id: "sick-note",
    question: "When is a doctor's note required?",
    source: "pto-and-leave.md",
    phrase: "doctor",
  },
  {
    id: "secret",
    question: "What should I do if I accidentally commit a secret?",
    source: "tools-and-security.md",
    phrase: "rotate",
  },
];

export type RetrievalScore = {
  k: number;
  total: number;
  hits: number;
  recallAt3: number;
  mrr: number;
  cases: { id: string; rank: number | null; hit: boolean }[];
};

type ScoredChunk = { source: string; text: string; indexText: string };

function scoreField(chunks: ScoredChunk[], field: "text" | "indexText", k: number): RetrievalScore {
  const cases = HANDBOOK_LABELS.map((label) => {
    const ranked = bm25Rank(label.question, chunks.map((chunk) => chunk[field]), k);
    const position = ranked.findIndex((hit) => {
      const chunk = chunks[hit.index];
      if (!chunk) return false;
      return (
        chunk.source === label.source &&
        chunk.text.toLowerCase().includes(label.phrase.toLowerCase())
      );
    });
    const hit = position >= 0;
    return { id: label.id, rank: hit ? position + 1 : null, hit };
  });
  const hits = cases.filter((row) => row.hit).length;
  const mrr =
    cases.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0) / cases.length;
  return {
    k,
    total: cases.length,
    hits,
    recallAt3: hits / cases.length,
    mrr: Number(mrr.toFixed(4)),
    cases,
  };
}

export async function measureHandbookRetrieval(k = 3) {
  const raw = await loadHandbookRaw();
  const chunks: ScoredChunk[] = raw.map((chunk) => {
    const context = deterministicContext({
      title: chunk.title,
      headingPath: chunk.headingPath,
      locale: chunk.lang ?? "en",
    });
    return {
      source: chunk.source,
      text: chunk.text,
      indexText: `${context}\n\n${chunk.text}`,
    };
  });
  return {
    method:
      "BM25 k1=1.2 b=0.75, top 3, the keyword ranker from retrieval-autopsy. A hit means a top-3 chunk has the labeled source file and its own text contains the labeled phrase. before ranks the passage text. after ranks the same passage with a deterministic context sentence prepended. Neural embeddings were not run.",
    k,
    labeled: HANDBOOK_LABELS.length,
    neuralEmbeddings: null,
    before: scoreField(chunks, "text", k),
    after: scoreField(chunks, "indexText", k),
  };
}
