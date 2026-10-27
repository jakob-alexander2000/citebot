import { generateWithFallback, ProviderUnavailableError } from "./llm";
import type {
  Citation,
  ClaimVerdict,
  EvidenceClaim,
  Verification,
  VerificationSummary,
} from "./types";
import { getBrand } from "./brand";

const VERDICTS = new Set<ClaimVerdict>(["pass", "fail", "unsupported"]);

export function summarizeClaims(claims: EvidenceClaim[]): VerificationSummary {
  if (claims.length === 0) return "ungrounded";
  const passes = claims.filter((c) => c.verdict === "pass").length;
  const fails = claims.filter((c) => c.verdict === "fail").length;
  if (passes === claims.length) return "grounded";
  if (fails === claims.length || passes === 0) return "ungrounded";
  return "mixed";
}

/** Parse verifier JSON (or a blob that contains it) into claims. No network. */
export function parseVerifierClaims(
  raw: string,
  citations: Citation[],
): EvidenceClaim[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }

  const claimsRaw =
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { claims?: unknown }).claims)
      ? (parsed as { claims: unknown[] }).claims
      : [];

  const citationIds = new Set(citations.map((c) => c.id));

  return claimsRaw
    .map((item): EvidenceClaim | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const claim = typeof row.claim === "string" ? row.claim.trim() : "";
      const verdictRaw =
        typeof row.verdict === "string" ? row.verdict.toLowerCase() : "";
      const evidence =
        typeof row.evidence === "string" ? row.evidence.trim() : "";
      const citationId =
        typeof row.citationId === "string" ? row.citationId.trim() : undefined;
      if (!claim || !VERDICTS.has(verdictRaw as ClaimVerdict)) return null;
      return {
        claim,
        verdict: verdictRaw as ClaimVerdict,
        evidence: evidence || "No evidence note returned.",
        citationId:
          citationId && citationIds.has(citationId) ? citationId : undefined,
      };
    })
    .filter((c): c is EvidenceClaim => c !== null)
    .slice(0, 8);
}

/**
 * Shared verify path: check the model's answer against the same retrieved
 * handbook chunks that grounded generation. Returns per-claim pass / fail /
 * unsupported — not a cosmetic confidence score.
 */
export async function verifyAnswer(
  question: string,
  answer: string,
  citations: Citation[],
): Promise<Verification> {
  if (!answer.trim()) {
    return {
      summary: "ungrounded",
      claims: [
        {
          claim: "(empty answer)",
          verdict: "unsupported",
          evidence: "No answer text to verify.",
        },
      ],
    };
  }

  const context = citations
    .map(
      (c, i) =>
        `[${i + 1}] id=${c.id} source=${c.source} title=${c.title}\n${c.snippet}`,
    )
    .join("\n\n");

  const brand = getBrand();
  const prompt = `You are the verify step for ${brand.name} (handbook RAG).
Split the ASSISTANT ANSWER into atomic factual claims (1–6). For each claim, check ONLY the RETRIEVED CONTEXT below.

Verdict rules:
- "pass": the claim is directly supported by a passage in the context (quote a short phrase in evidence; set citationId to that chunk's id).
- "fail": the claim contradicts the context (say how; cite the conflicting chunk id when possible).
- "unsupported": the claim is not backed by the context (including invented facts). If the answer correctly says the handbook does not cover the question, that refusal claim is "pass" with evidence explaining the gap.

Do not use outside knowledge. Do not invent chunk ids.

Return JSON only:
{"claims":[{"claim":"...","verdict":"pass"|"fail"|"unsupported","evidence":"...","citationId":"optional-id"}]}

QUESTION: ${question}

ASSISTANT ANSWER:
${answer}

RETRIEVED CONTEXT:
${context || "(no retrieved passages)"}`;

  try {
    const result = await generateWithFallback({
      prompt,
      json: true,
      temperature: 0,
    });
    const text = result.text.trim();
    const claims = parseVerifierClaims(text, citations);
    if (claims.length === 0) {
      return {
        summary: "ungrounded",
        claims: [
          {
            claim: "Verification could not parse claim list.",
            verdict: "unsupported",
            evidence: "Verifier returned empty or invalid JSON.",
          },
        ],
      };
    }
    return { summary: summarizeClaims(claims), claims };
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      return {
        summary: "unavailable",
        claims: [
          {
            claim: "Verification could not run.",
            verdict: "unsupported",
            evidence:
              "The AI provider is temporarily unavailable. Please try again in a moment.",
          },
        ],
      };
    }
    const message = err instanceof Error ? err.message : "verify failed";
    return {
      summary: "unavailable",
      claims: [
        {
          claim: "Verification could not run.",
          verdict: "unsupported",
          evidence: message,
        },
      ],
    };
  }
}
