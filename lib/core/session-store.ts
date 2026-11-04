import { randomUUID } from "node:crypto";
import { SESSION_TTL_MS } from "./models";
import type { IndexedChunk } from "./types";

export type UploadSession = {
  id: string;
  createdAt: number;
  expiresAt: number;
  pageCount: number;
  chunks: IndexedChunk[];
};

const sessions = new Map<string, UploadSession>();
let clock: () => number = () => Date.now();
let ttlMs = SESSION_TTL_MS;

export function resetSessionsForTests(): void {
  sessions.clear();
  clock = () => Date.now();
  ttlMs = SESSION_TTL_MS;
}

export function setClockForTests(fn: () => number): void {
  clock = fn;
}

export function setSessionTtlForTests(ms: number): void {
  ttlMs = ms;
}

export function nowMs(): number {
  return clock();
}

export function sessionTtlMs(): number {
  return ttlMs;
}

function sweep(now: number): void {
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
}

export function putSession(input: {
  pageCount: number;
  chunks: IndexedChunk[];
  id?: string;
}): UploadSession {
  const now = clock();
  sweep(now);
  const session: UploadSession = {
    id: input.id ?? randomUUID(),
    createdAt: now,
    expiresAt: now + ttlMs,
    pageCount: input.pageCount,
    chunks: input.chunks,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): UploadSession | null {
  const now = clock();
  sweep(now);
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= now) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function endSession(id: string): boolean {
  return sessions.delete(id);
}
