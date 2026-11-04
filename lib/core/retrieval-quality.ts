import { bm25Rank } from "./bm25";
import { deterministicContext } from "./draft";
import { loadHandbookRaw } from "./documents";
import { reciprocalRankFusion } from "./fuse";

export type RetrievalLabel = {
  id: string;
  question: string;
  source: string;
  phrase: string;
  kind: "direct" | "paraphrase" | "cross-language";
};

/**
 * Labels were written from the handbook text before any ranking run.
 * `phrase` is an English span that must appear in the gold chunk.
 * Cross-language questions are German; the passage is still English.
 */
export const HANDBOOK_LABELS: RetrievalLabel[] = [
  {
    id: "pto-days",
    kind: "direct",
    question: "How many paid vacation days do full-time employees get?",
    source: "pto-and-leave.md",
    phrase: "30 days",
  },
  {
    id: "carryover",
    kind: "direct",
    question: "Until when can unused paid time off carry over?",
    source: "pto-and-leave.md",
    phrase: "March 31",
  },
  {
    id: "meal",
    kind: "direct",
    question: "What is the client meal reimbursement limit per person?",
    source: "expense-policy.md",
    phrase: "45",
  },
  {
    id: "receipt",
    kind: "direct",
    question: "Within how many days must expense receipts be uploaded?",
    source: "expense-policy.md",
    phrase: "14 days",
  },
  {
    id: "demo",
    kind: "direct",
    question: "How many minutes is each demo slot before the hard stop?",
    source: "demo-day.md",
    phrase: "Five minutes",
  },
  {
    id: "desk",
    kind: "direct",
    question: "Which weekdays are desk days?",
    source: "welcome.md",
    phrase: "Tuesday",
  },
  {
    id: "sick-note",
    kind: "direct",
    question: "When is a doctor's note required?",
    source: "pto-and-leave.md",
    phrase: "doctor",
  },
  {
    id: "secret",
    kind: "direct",
    question: "What should I do if I accidentally commit a secret?",
    source: "tools-and-security.md",
    phrase: "rotate",
  },
  {
    id: "pto-paraphrase",
    kind: "paraphrase",
    question: "What's the yearly holiday allowance for a person on a full contract?",
    source: "pto-and-leave.md",
    phrase: "30 days",
  },
  {
    id: "carry-paraphrase",
    kind: "paraphrase",
    question: "If vacation days are left over, what's the cutoff for using them the next year?",
    source: "pto-and-leave.md",
    phrase: "March 31",
  },
  {
    id: "meal-paraphrase",
    kind: "paraphrase",
    question: "What's the spending cap for a meal with a client, per person?",
    source: "expense-policy.md",
    phrase: "45",
  },
  {
    id: "receipt-paraphrase",
    kind: "paraphrase",
    question: "How soon do receipts have to be filed after a cost?",
    source: "expense-policy.md",
    phrase: "14 days",
  },
  {
    id: "demo-paraphrase",
    kind: "paraphrase",
    question: "How long can someone talk on Friday before the clock stops them?",
    source: "demo-day.md",
    phrase: "Five minutes",
  },
  {
    id: "desk-paraphrase",
    kind: "paraphrase",
    question: "Which days is the Kreuzberg studio the place to sit?",
    source: "welcome.md",
    phrase: "Tuesday",
  },
  {
    id: "sick-paraphrase",
    kind: "paraphrase",
    question: "After a few days of illness, when is a medical note required?",
    source: "pto-and-leave.md",
    phrase: "doctor",
  },
  {
    id: "secret-paraphrase",
    kind: "paraphrase",
    question: "A credential landed in a git commit. What should happen right away?",
    source: "tools-and-security.md",
    phrase: "rotate",
  },
  {
    id: "equipment-paraphrase",
    kind: "paraphrase",
    question: "Is there a yearly cap on a chair or monitor bought for home?",
    source: "expense-policy.md",
    phrase: "400",
  },
  {
    id: "long-leave-paraphrase",
    kind: "paraphrase",
    question: "How much warning is needed when time off runs longer than five days in a row?",
    source: "pto-and-leave.md",
    phrase: "20 working",
  },
  {
    id: "guests-paraphrase",
    kind: "paraphrase",
    question: "May someone from outside the company watch Friday's demo?",
    source: "demo-day.md",
    phrase: "External guests",
  },
  {
    id: "devices-paraphrase",
    kind: "paraphrase",
    question: "Can a private laptop hold a clone of a company repository?",
    source: "tools-and-security.md",
    phrase: "unmanaged",
  },
  {
    id: "remote-paraphrase",
    kind: "paraphrase",
    question: "How many days a week can a full-timer work away from the studio?",
    source: "remote-work-policy.pdf",
    phrase: "three days",
  },
  {
    id: "de-pto",
    kind: "cross-language",
    question: "Wie viele bezahlte Urlaubstage gibt es für Vollzeit im Jahr?",
    source: "pto-and-leave.md",
    phrase: "30 days",
  },
  {
    id: "de-carry",
    kind: "cross-language",
    question: "Bis zu welchem Datum darf nicht genutzter Urlaub ins Folgejahr rutschen?",
    source: "pto-and-leave.md",
    phrase: "March 31",
  },
  {
    id: "de-meal",
    kind: "cross-language",
    question: "Wie hoch ist die Erstattung für ein Kundengespräch beim Essen pro Person?",
    source: "expense-policy.md",
    phrase: "45",
  },
  {
    id: "de-receipt",
    kind: "cross-language",
    question: "Innerhalb welcher Frist müssen Ausgabenbelege eingereicht werden?",
    source: "expense-policy.md",
    phrase: "14 days",
  },
  {
    id: "de-demo",
    kind: "cross-language",
    question: "Wie viele Minuten hat ein Vortrag am Freitag, bevor Schluss ist?",
    source: "demo-day.md",
    phrase: "Five minutes",
  },
  {
    id: "de-desk",
    kind: "cross-language",
    question: "An welchen Tagen findet die Arbeit im Studio in Kreuzberg statt?",
    source: "welcome.md",
    phrase: "Tuesday",
  },
  {
    id: "de-sick",
    kind: "cross-language",
    question: "Ab wann ist bei Krankheit ein ärztliches Attest nötig?",
    source: "pto-and-leave.md",
    phrase: "doctor",
  },
  {
    id: "de-secret",
    kind: "cross-language",
    question: "Was ist zu tun, wenn ein Zugangsgeheimnis versehentlich committet wurde?",
    source: "tools-and-security.md",
    phrase: "rotate",
  },
];

/**
 * Held out from the 29-label table. Written before they were scored.
 * German paraphrases that do not reuse the wording of the earlier German questions.
 */
export const HELD_OUT_GERMAN: RetrievalLabel[] = [
  {
    id: "de-hold-holiday",
    kind: "cross-language",
    question: "Wie viel Jahresurlaub steht einer Vollzeitkraft zu?",
    source: "pto-and-leave.md",
    phrase: "30 days",
  },
  {
    id: "de-hold-rest",
    kind: "cross-language",
    question: "Wann verfällt der übrig gebliebene Urlaub im nächsten Jahr?",
    source: "pto-and-leave.md",
    phrase: "March 31",
  },
  {
    id: "de-hold-meal",
    kind: "cross-language",
    question: "Was darf ein Geschäftsessen pro Gast höchstens kosten?",
    source: "expense-policy.md",
    phrase: "45",
  },
  {
    id: "de-hold-receipt",
    kind: "cross-language",
    question: "Bis wann sind Quittungen für Ausgaben abzugeben?",
    source: "expense-policy.md",
    phrase: "14 days",
  },
  {
    id: "de-hold-office",
    kind: "cross-language",
    question: "Wann muss man im Kreuzberger Studio am Schreibtisch sein?",
    source: "welcome.md",
    phrase: "Tuesday",
  },
  {
    id: "de-hold-note",
    kind: "cross-language",
    question: "Nach wie vielen Krankheitstagen braucht man eine Bescheinigung vom Arzt?",
    source: "pto-and-leave.md",
    phrase: "doctor",
  },
];

export type RetrievalScore = {
  k: number;
  total: number;
  hits: number;
  recallAt3: number;
  mrr: number;
  cases: { id: string; kind: RetrievalLabel["kind"]; rank: number | null; hit: boolean }[];
};

type ScoredChunk = { id: string; source: string; text: string; indexText: string };

function summarize(cases: RetrievalScore["cases"], k: number): RetrievalScore {
  const hits = cases.filter((row) => row.hit).length;
  const mrr = cases.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0) / cases.length;
  return {
    k,
    total: cases.length,
    hits,
    recallAt3: Number((hits / cases.length).toFixed(4)),
    mrr: Number(mrr.toFixed(4)),
    cases,
  };
}

function hitAt(rankedIds: string[], chunks: ScoredChunk[], label: RetrievalLabel, k: number) {
  const top = rankedIds.slice(0, k);
  const position = top.findIndex((id) => {
    const chunk = chunks.find((item) => item.id === id);
    if (!chunk) return false;
    return (
      chunk.source === label.source &&
      chunk.text.toLowerCase().includes(label.phrase.toLowerCase())
    );
  });
  const hit = position >= 0;
  return { id: label.id, kind: label.kind, rank: hit ? position + 1 : null, hit };
}

function cosine(a: number[], b: number[]): number {
  const width = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < width; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function loadScoredChunks(): Promise<ScoredChunk[]> {
  const raw = await loadHandbookRaw();
  return raw.map((chunk) => {
    const context = deterministicContext({
      title: chunk.title,
      headingPath: chunk.headingPath,
      locale: chunk.lang ?? "en",
    });
    return {
      id: chunk.id,
      source: chunk.source,
      text: chunk.text,
      indexText: `${context}\n\n${chunk.text}`,
    };
  });
}

export function scoreBm25(chunks: ScoredChunk[], k = 3, labels = HANDBOOK_LABELS): RetrievalScore {
  const docs = chunks.map((chunk) => chunk.indexText);
  const cases = labels.map((label) => {
    const ranked = bm25Rank(label.question, docs, chunks.length).map(
      (hit) => chunks[hit.index]!.id,
    );
    return hitAt(ranked, chunks, label, k);
  });
  return summarize(cases, k);
}

export function scoreVector(
  chunks: ScoredChunk[],
  matrix: number[][],
  queries: number[][],
  k = 3,
  labels = HANDBOOK_LABELS,
): RetrievalScore {
  const cases = labels.map((label, labelIndex) => {
    const query = queries[labelIndex] ?? [];
    const ranked = chunks
      .map((chunk, index) => ({ id: chunk.id, score: cosine(query, matrix[index] ?? []) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .map((row) => row.id);
    return hitAt(ranked, chunks, label, k);
  });
  return summarize(cases, k);
}

export function scoreHybrid(
  chunks: ScoredChunk[],
  matrix: number[][],
  queries: number[][],
  k = 3,
  labels = HANDBOOK_LABELS,
): RetrievalScore {
  const docs = chunks.map((chunk) => chunk.indexText);
  const cases = labels.map((label, labelIndex) => {
    const keyword = bm25Rank(label.question, docs, chunks.length).map((hit) => ({
      id: chunks[hit.index]!.id,
      score: hit.score,
    }));
    const query = queries[labelIndex] ?? [];
    const vector = chunks
      .map((chunk, index) => ({ id: chunk.id, score: cosine(query, matrix[index] ?? []) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const fused = reciprocalRankFusion([keyword, vector]).map((row) => row.id);
    return hitAt(fused, chunks, label, k);
  });
  return summarize(cases, k);
}

export async function measureHandbookRetrieval(
  k = 3,
  embed?: (texts: string[]) => Promise<number[][] | null>,
) {
  const chunks = await loadScoredChunks();
  const bm25 = scoreBm25(chunks, k);
  let vector: RetrievalScore | null = null;
  let hybrid: RetrievalScore | null = null;
  let embedder: string | null = null;
  if (embed) {
    const matrix = await embed(chunks.map((chunk) => chunk.indexText));
    const queries = await embed(HANDBOOK_LABELS.map((label) => label.question));
    if (!matrix || !queries || matrix.length !== chunks.length || queries.length !== HANDBOOK_LABELS.length) {
      throw new Error("Embedding call did not return one vector per text.");
    }
    vector = scoreVector(chunks, matrix, queries, k);
    hybrid = scoreHybrid(chunks, matrix, queries, k);
    embedder = "@cf/baai/bge-m3";
  }
  return {
    method:
      "Top 3. A hit means the chunk source file matches and the chunk's own text contains the labeled phrase. BM25 uses k1=1.2 and b=0.75 on the passage plus its context sentence. Vector is cosine over Workers AI @cf/baai/bge-m3 embeddings of that same text. Hybrid is reciprocal rank fusion (k=60) of the two full lists. Labels were written before this run.",
    k,
    labeled: HANDBOOK_LABELS.length,
    embedder,
    bm25,
    vector,
    hybrid,
  };
}
