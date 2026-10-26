export type Chunk = {
  id: string;
  source: string;
  title: string;
  text: string;
};

export type EmbeddedChunk = Chunk & {
  embedding: number[];
};

export type Citation = {
  id: string;
  source: string;
  title: string;
  snippet: string;
  score: number;
};

/** Outcome of checking one claim against retrieved handbook chunks. */
export type ClaimVerdict = "pass" | "fail" | "unsupported";

export type EvidenceClaim = {
  /** Atomic statement taken from the answer. */
  claim: string;
  verdict: ClaimVerdict;
  /** Short quote or reason from a retrieved chunk (or why it failed). */
  evidence: string;
  /** Matching citation id when grounded. */
  citationId?: string;
};

export type VerificationSummary = "grounded" | "mixed" | "ungrounded";

export type Verification = {
  summary: VerificationSummary;
  claims: EvidenceClaim[];
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
  verification: Verification;
};
