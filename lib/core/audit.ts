import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type AuditEntry = {
  id: string;
  at: string;
  requestId: string;
  kind: "answer";
  provider: "mock" | "workers-ai";
  generation: string;
  locale: string;
  collection: string;
  questionChars: number;
  sentenceCount: number;
  supportedCount: number;
  flaggedCount: number;
  ms: number;
};

const RING_MAX = 200;
const ring: AuditEntry[] = [];

export function resetAuditForTests(): void {
  ring.length = 0;
}

export function auditEntries(): readonly AuditEntry[] {
  return ring;
}

export function recordAnswerAudit(entry: Omit<AuditEntry, "id" | "at">): AuditEntry {
  const stored: AuditEntry = {
    ...entry,
    id: randomUUID(),
    at: new Date().toISOString(),
  };
  ring.push(stored);
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
  console.info(
    JSON.stringify({
      citebot_audit: true,
      id: stored.id,
      requestId: stored.requestId,
      kind: stored.kind,
      provider: stored.provider,
      sentenceCount: stored.sentenceCount,
      flaggedCount: stored.flaggedCount,
    }),
  );
  if (!process.env.NODE_TEST_CONTEXT) {
    try {
      const file = path.join(process.cwd(), ".cache", "audit.jsonl");
      mkdirSync(path.dirname(file), { recursive: true });
      appendFileSync(file, `${JSON.stringify(stored)}\n`, "utf8");
    } catch {
      /* The ring and stdout still hold the entry. */
    }
  }
  return stored;
}
