/**
 * Demo event log: a ring in this process, a JSONL file when the disk is writable,
 * and an optional HTTP forward. Nothing here is required for the ask loop.
 */
import { appendFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { summarizeEvents, type AnalyticsEvent, type EventSummary } from "./analytics";

const RING_MAX = 400;
const FILE_MAX_BYTES = 1_000_000;

type State = {
  events: AnalyticsEvent[];
  filePath: string | null;
  silent: boolean;
};

const state: State = {
  events: [],
  filePath: path.join(process.cwd(), ".cache", "events.jsonl"),
  silent: false,
};

export function resetEventLogForTests(filePath: string | null = null): void {
  state.events = [];
  state.filePath = filePath;
  state.silent = true;
}

export function recordEvent(event: AnalyticsEvent): void {
  state.events.push(event);
  if (state.events.length > RING_MAX) {
    state.events.splice(0, state.events.length - RING_MAX);
  }
  if (!state.silent) {
    console.info(
      JSON.stringify({ citebot_event: event.name, ts: event.ts, props: event.props }),
    );
  }
  if (state.filePath) appendLine(state.filePath, event);
}

export function eventSummary(): EventSummary {
  return summarizeEvents(state.events);
}

export async function forwardEvent(event: AnalyticsEvent): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  const analyticsUrl = cleanUrl(process.env.ANALYTICS_URL);
  if (analyticsUrl) tasks.push(postJson(analyticsUrl, event));
  const vercelUrl = cleanUrl(process.env.VERCEL_ANALYTICS_URL);
  if (vercelUrl) tasks.push(postJson(vercelUrl, event));

  const domain = process.env.PLAUSIBLE_DOMAIN?.trim() || process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  if (domain) {
    const host = (process.env.PLAUSIBLE_API_HOST?.trim() || "https://plausible.io").replace(/\/$/, "");
    const page = typeof event.props.page === "string" ? event.props.page : "";
    const url = page && page !== "home" ? `https://${domain}/${page}` : `https://${domain}/`;
    tasks.push(
      postJson(`${host}/api/event`, {
        name: event.name,
        url,
        domain,
        props: event.props,
      }),
    );
  }

  if (tasks.length === 0) return;
  await Promise.allSettled(tasks);
}

function appendLine(filePath: string, event: AnalyticsEvent): void {
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    try {
      if (statSync(filePath).size > FILE_MAX_BYTES) return;
    } catch {
      /* New file. */
    }
    appendFileSync(filePath, `${JSON.stringify(event)}\n`, "utf8");
  } catch {
    /* Serverless disks are often read-only. The ring and stdout still hold the line. */
  }
}

function cleanUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function postJson(url: string, body: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "CiteBot/events",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2000),
  });
}
