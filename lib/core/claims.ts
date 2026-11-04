import type { FlaggedCondition } from "./conditions";
import { flagDroppedConditions } from "./conditions";
import { coverage, PARTIAL_MIN, splitSentences, SUPPORT_MIN } from "./text";

export type MatchStatus = "supported" | "partial" | "unsupported";

export type PassageRef = {
  id: string;
  source: string;
  title: string;
  text: string;
  score: number;
  headingPath: string[];
};

export type SentenceCheck = {
  text: string;
  match: MatchStatus;
  passages: PassageRef[];
  flaggedConditions: FlaggedCondition[];
};

function statusFor(score: number): MatchStatus {
  if (score >= SUPPORT_MIN) return "supported";
  if (score >= PARTIAL_MIN) return "partial";
  return "unsupported";
}

/** Tie each answer sentence to the best retrieved passage and flag dropped conditions. */
export function checkClaims(answer: string, passages: PassageRef[]): SentenceCheck[] {
  const sentences = splitSentences(answer);
  const parts = sentences.length > 0 ? sentences : [answer.trim()].filter(Boolean);
  if (parts.length === 0) {
    return [
      {
        text: "",
        match: "unsupported",
        passages: [],
        flaggedConditions: [],
      },
    ];
  }
  const flaggedFor = new Set<string>();
  return parts.map((sentence) => {
    let best: { passage: PassageRef; score: number } | null = null;
    for (const passage of passages) {
      const score = coverage(sentence, passage.text);
      if (!best || score > best.score) best = { passage, score };
    }
    const score = best?.score ?? 0;
    const tied = best && score > 0 ? [best.passage] : [];
    let flagged: FlaggedCondition[] = [];
    if (best && score > 0 && !flaggedFor.has(best.passage.id)) {
      flagged = flagDroppedConditions(best.passage.text, answer);
      if (flagged.length > 0) flaggedFor.add(best.passage.id);
    }
    return {
      text: sentence,
      match: statusFor(score),
      passages: tied,
      flaggedConditions: flagged,
    };
  });
}
