export type FlaggedCondition = { kind: string; phrase: string };

/**
 * Condition phrases. A flag means the source passage contains the phrase
 * and the answer does not contain that same marker.
 */
const PATTERNS: readonly { kind: string; pattern: RegExp }[] = [
  { kind: "only if", pattern: /\bonly if\b[^.]*/gi },
  { kind: "only when", pattern: /\bonly when\b[^.]*/gi },
  { kind: "only", pattern: /\bonly\b[^.]{0,80}/gi },
  { kind: "unless", pattern: /\bunless\b[^.]*/gi },
  { kind: "except", pattern: /\bexcept\b[^.]*/gi },
  { kind: "provided that", pattern: /\bprovided that\b[^.]*/gi },
  { kind: "subject to", pattern: /\bsubject to\b[^.]*/gi },
  { kind: "nur wenn", pattern: /\bnur wenn\b[^.]*/gi },
  { kind: "nur", pattern: /\bnur\b[^.]*/gi },
  { kind: "außer", pattern: /\baußer\b[^.]*/gi },
  { kind: "ausser", pattern: /\bausser\b[^.]*/gi },
  { kind: "sofern", pattern: /\bsofern\b[^.]*/gi },
  { kind: "erst nach", pattern: /\berst nach\b[^.]*/gi },
  { kind: "es sei denn", pattern: /\bes sei denn\b[^.]*/gi },
];

function fresh(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

export function flagDroppedConditions(source: string, answer: string): FlaggedCondition[] {
  const lowered = answer.toLowerCase();
  const flags: FlaggedCondition[] = [];
  const seen = new Set<string>();
  for (const { kind, pattern } of PATTERNS) {
    const matches = [...source.matchAll(fresh(pattern))];
    if (matches.length === 0) continue;
    if (lowered.includes(kind.toLowerCase())) continue;
    if (seen.has(kind)) continue;
    seen.add(kind);
    const phrase = (matches[0]?.[0] ?? kind).replace(/\s+/g, " ").trim().slice(0, 180);
    flags.push({ kind, phrase });
  }
  return flags;
}
