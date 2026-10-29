import type { GenerateFn } from "./agent";
import type { ToolName } from "./tools";
import type { Citation, EvidenceClaim, Verification } from "./types";
import { summarizeClaims } from "./verify";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "how",
  "many",
  "when",
  "does",
  "what",
  "full",
  "time",
  "per",
]);

const REFUSAL_PATTERNS: readonly RegExp[] = [
  /do not cover/i,
  /does not cover/i,
  /not covered/i,
  /not in the (handbook|documents|pages)/i,
];

export function answerLooksLikeRefusal(answer: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(answer));
}

function plain(text: string): string {
  return text.replace(/[*_`#]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string): string[] {
  return plain(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

function sentencesOf(text: string): string[] {
  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("[")) return false;
    if (trimmed.startsWith("id=")) return false;
    if (/^#{1,6}\s/.test(trimmed)) return false;
    return true;
  });
  return plain(lines.join(" "))
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);
}

/**
 * Extractive draft for the offline eval loop.
 * It copies overlapping sentences from the tool prompt, or refuses.
 */
export function draftFromPrompt(prompt: string, question: string): string {
  const passages = prompt.split("Passages:")[1] ?? "";
  if (!/\[\d+\]/.test(passages)) return "The documents do not cover this.";

  const blocks = passages
    .split(/\n(?=\[\d+\])/)
    .map((block) => block.trim())
    .filter((block) => /^\[\d+\]/.test(block));

  const wanted = new Set(tokens(question));
  let bestScore = 0;
  let bestIndex = 0;
  const ranked: { sentence: string; score: number; index: number }[] = [];

  blocks.forEach((block, index) => {
    for (const sentence of sentencesOf(block)) {
      const score = tokens(sentence).filter((token) => wanted.has(token)).length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
      if (score > 0) ranked.push({ sentence, score, index });
    }
  });

  const picked = ranked
    .filter((row) => row.index === bestIndex && row.score >= 2)
    .sort(
      (a, b) =>
        b.score - a.score || Number(/\d/.test(b.sentence)) - Number(/\d/.test(a.sentence)),
    )
    .slice(0, 2);
  if (picked.length === 0) return "The documents do not cover this.";
  return `${picked.map((row) => row.sentence).join(" ")} [${bestIndex + 1}]`;
}

/** Same verdict tokens as verify, scored by overlap with the retrieved passages. */
export function localPassageVerify(answer: string, citations: Citation[]): Verification {
  if (answerLooksLikeRefusal(answer)) {
    if (citations.length === 0) {
      const claims: EvidenceClaim[] = [
        {
          claim: "The documents do not cover the question.",
          verdict: "pass",
          evidence: "No passage was retrieved.",
        },
      ];
      return { summary: summarizeClaims(claims), claims };
    }
    const claims: EvidenceClaim[] = [
      {
        claim: "The answer refuses even though a passage was retrieved.",
        verdict: "unsupported",
        evidence: citations[0]?.snippet.slice(0, 180) || "A passage was retrieved.",
        citationId: citations[0]?.id,
      },
    ];
    return { summary: summarizeClaims(claims), claims };
  }

  const sentences = sentencesOf(answer.replace(/\s*\[\d+\]/g, "")).slice(0, 6);
  if (sentences.length === 0) {
    const claims: EvidenceClaim[] = [
      {
        claim: "(empty answer)",
        verdict: "unsupported",
        evidence: "No answer text to verify.",
      },
    ];
    return { summary: summarizeClaims(claims), claims };
  }

  const claims: EvidenceClaim[] = sentences.map((sentence) => {
    const wanted = tokens(sentence);
    let best: Citation | undefined;
    let bestScore = 0;
    for (const citation of citations) {
      const hay = new Set(tokens(`${citation.title} ${citation.snippet}`));
      const score = wanted.filter((token) => hay.has(token)).length;
      if (score > bestScore) {
        best = citation;
        bestScore = score;
      }
    }
    const needed = Math.min(4, Math.max(2, Math.ceil(wanted.length * 0.34)));
    if (best && bestScore >= needed) {
      return {
        claim: sentence,
        verdict: "pass",
        evidence: best.snippet.slice(0, 180),
        citationId: best.id,
      };
    }
    return {
      claim: sentence,
      verdict: "unsupported",
      evidence: "The retrieved passages do not state this.",
    };
  });
  return { summary: summarizeClaims(claims), claims };
}

/** One search, then an answer from those passages. */
export function localHandbookGenerate(
  question: string,
  enabled: readonly ToolName[],
): GenerateFn {
  let turns = 0;
  return async (prompt: string) => {
    turns += 1;
    const canSearch = enabled.includes("search_handbook");
    if (turns === 1 && canSearch && !/Passages:\s*\[1\]/.test(prompt)) {
      return JSON.stringify({
        action: "tool",
        plan: "Search the handbook.",
        tool: "search_handbook",
        input: { query: question },
      });
    }
    return JSON.stringify({
      action: "answer",
      answer: draftFromPrompt(prompt, question),
    });
  };
}
