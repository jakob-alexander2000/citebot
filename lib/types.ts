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

/** One visible step in the ask loop (plan, tool, draft, or a hard stop). */
export type AgentStep = {
  kind: "plan" | "tool" | "draft" | "stop";
  /** Tool name when kind is "tool". */
  tool?: string;
  label: string;
  /** Short result safe to show in the chat transcript. */
  detail: string;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
  verification: Verification;
  /** Plan, tool calls, and draft — empty only if a caller bypasses the loop. */
  steps: AgentStep[];
  /** True when the loop hit the tool cap or a repeated call and could not draft. */
  stoppedEarly: boolean;
};
