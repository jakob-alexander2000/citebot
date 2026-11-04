import { checkClaims } from "./core/claims";
import type { Locale } from "./locale";
import type {
  Citation,
  ClaimVerdict,
  EvidenceClaim,
  Verification,
  VerificationSummary,
} from "./types";

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
 * Check an answer against the passages already retrieved.
 * This path does not call a model vendor.
 */
export async function verifyAnswer(
  question: string,
  answer: string,
  citations: Citation[],
  locale: Locale = "en",
): Promise<Verification> {
  void question;
  void locale;
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

  const sentences = checkClaims(
    answer,
    citations.map((citation) => ({
      id: citation.id,
      source: citation.source,
      title: citation.title,
      text: citation.snippet,
      score: citation.score,
      headingPath: [citation.title],
    })),
  );
  const claims: EvidenceClaim[] = sentences.map((sentence) => {
    const flagged = sentence.flaggedConditions.length > 0;
    const verdict: ClaimVerdict = flagged
      ? "fail"
      : sentence.match === "supported"
        ? "pass"
        : "unsupported";
    const evidence = flagged
      ? `Dropped ${sentence.flaggedConditions.map((flag) => flag.kind).join(", ")}.`
      : sentence.passages[0]?.text.slice(0, 180) || "No matching passage.";
    return {
      claim: sentence.text,
      verdict,
      evidence,
      citationId: sentence.passages[0]?.id,
    };
  });
  return { summary: summarizeClaims(claims), claims };
}
