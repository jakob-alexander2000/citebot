/**
 * Event schema for the demo log.
 * Question text, answers, and secrets are rejected. A chip is a filename, not a sentence.
 */
import type { BrandSkin } from "./brand";
import { CHIP_ORDER_EXPERIMENT, CHIP_ORDER_VARIANTS, type ChipOrderVariant } from "./experiment";

export const EVENT_NAMES = [
  "page_view",
  "ask_chip_click",
  "ask_submit",
  "verify_result",
  "experiment_assignment",
  "experiment_conversion",
  "locale_ignored",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const ANALYTICS_PAGES = ["home", "ask", "harness", "handbook", "growth"] as const;
export type AnalyticsPage = (typeof ANALYTICS_PAGES)[number];

const SKINS = ["product", "craft", "client"] as const;
const LOCALES = ["de", "en"] as const;
const SUMMARIES = ["grounded", "mixed", "ungrounded", "unavailable"] as const;
const GOALS = ["ask_submit", "verify"] as const;

const BLOCKED_KEYS = new Set([
  "question",
  "prompt",
  "text",
  "content",
  "answer",
  "claim",
  "evidence",
  "email",
  "name",
  "key",
  "token",
  "secret",
  "authorization",
  "apikey",
  "api_key",
]);

const SECRET =
  /AIza[0-9A-Za-z\-_]{8,}|sk-[A-Za-z0-9]{8,}|sk_live_|ghp_[A-Za-z0-9]{8,}|xox[baprs]-|api[_-]?key/i;

export type PropMap = Record<string, string | number>;

export type AnalyticsEvent = {
  name: EventName;
  ts: string;
  props: PropMap;
};

export type ParseResult = { ok: true; event: AnalyticsEvent } | { ok: false; error: string };

export type VariantTally = {
  assignment: number;
  ask_submit: number;
  verify: number;
};

export type EventSummary = {
  count: number;
  totals: Partial<Record<EventName, number>>;
  experiments: Record<string, Record<string, VariantTally>>;
  recent: Array<{ name: EventName; ts: string; props: PropMap }>;
};

type Dict = Record<string, unknown>;

/** Stable 8-hex token. Not a substitute for storing the question. */
export function fingerprint(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function parseEvent(body: unknown, now = new Date()): ParseResult {
  if (!isDict(body)) return fail("Expected an object.");
  if (Object.keys(body).some((key) => key !== "name" && key !== "props")) {
    return fail("Unexpected field.");
  }
  const name = oneOf(body.name, EVENT_NAMES);
  if (!name) return fail("Unknown event.");
  if (!isDict(body.props)) return fail("Expected props.");
  if (hasBlocked(body.props)) return fail("Props contain a blocked field.");

  const props = readProps(name, body.props);
  if (!props) return fail("Props do not match this event.");
  if (props.skin === "craft" && props.locale === "de") {
    return fail("Craft skin does not record de events.");
  }
  return { ok: true, event: { name, ts: now.toISOString(), props } };
}

export function summarizeEvents(events: readonly AnalyticsEvent[]): EventSummary {
  const totals: Partial<Record<EventName, number>> = {};
  const experiments: Record<string, Record<string, VariantTally>> = {};
  for (const event of events) {
    totals[event.name] = (totals[event.name] ?? 0) + 1;
    if (event.name !== "experiment_assignment" && event.name !== "experiment_conversion") continue;
    const experiment = event.props.experiment;
    const variant = event.props.variant;
    if (typeof experiment !== "string" || typeof variant !== "string") continue;
    const row = (experiments[experiment] ??= {})[variant] ??= {
      assignment: 0,
      ask_submit: 0,
      verify: 0,
    };
    if (event.name === "experiment_assignment") row.assignment += 1;
    else if (event.props.goal === "ask_submit") row.ask_submit += 1;
    else if (event.props.goal === "verify") row.verify += 1;
  }
  return {
    count: events.length,
    totals,
    experiments,
    recent: events.slice(-15).map(({ name, ts, props }) => ({ name, ts, props })),
  };
}

export function emptyVariantTally(): Record<ChipOrderVariant, VariantTally> {
  return {
    control: { assignment: 0, ask_submit: 0, verify: 0 },
    demo_first: { assignment: 0, ask_submit: 0, verify: 0 },
  };
}

function readProps(name: EventName, props: Dict): PropMap | null {
  switch (name) {
    case "page_view":
      return readPageView(props);
    case "ask_chip_click":
      return readChipClick(props);
    case "ask_submit":
      return readSubmit(props);
    case "verify_result":
      return readVerify(props);
    case "experiment_assignment":
      return readAssignment(props);
    case "experiment_conversion":
      return readConversion(props);
    case "locale_ignored":
      return readLocaleIgnored(props);
    default:
      return null;
  }
}

function readPageView(props: Dict): PropMap | null {
  if (!only(props, ["page", "locale", "skin"])) return null;
  const page = oneOf(props.page, ANALYTICS_PAGES);
  const locale = oneOf(props.locale, LOCALES);
  const skin = oneOf(props.skin, SKINS);
  if (!page || !locale || !skin) return null;
  return { page, locale, skin };
}

function readChipClick(props: Dict): PropMap | null {
  if (!only(props, ["index", "source", "skin", "locale", "experiment", "variant"])) return null;
  const index = integer(props.index, 20);
  const source = pathName(props.source);
  const skin = oneOf(props.skin, SKINS);
  const locale = oneOf(props.locale, LOCALES);
  if (index === null || !source || !skin || !locale) return null;
  const out: PropMap = { index, source, skin, locale };
  return withExperiment(props, out);
}

function readSubmit(props: Dict): PropMap | null {
  if (!only(props, ["via", "chars", "hash", "skin", "locale", "source", "experiment", "variant"])) {
    return null;
  }
  const via = oneOf(props.via, ["chip", "typed"] as const);
  const chars = integer(props.chars, 1000);
  const hash = hash8(props.hash);
  const skin = oneOf(props.skin, SKINS);
  const locale = oneOf(props.locale, LOCALES);
  if (!via || chars === null || !hash || !skin || !locale) return null;
  const out: PropMap = { via, chars, hash, skin, locale };
  if ("source" in props) {
    const source = pathName(props.source);
    if (!source) return null;
    out.source = source;
  }
  return withExperiment(props, out);
}

function readVerify(props: Dict): PropMap | null {
  if (
    !only(props, [
      "summary",
      "pass",
      "fail",
      "unsupported",
      "claims",
      "skin",
      "locale",
      "experiment",
      "variant",
    ])
  ) {
    return null;
  }
  const summary = oneOf(props.summary, SUMMARIES);
  const pass = integer(props.pass, 40);
  const fail = integer(props.fail, 40);
  const unsupported = integer(props.unsupported, 40);
  const claims = integer(props.claims, 40);
  const skin = oneOf(props.skin, SKINS);
  const locale = oneOf(props.locale, LOCALES);
  if (!summary || pass === null || fail === null || unsupported === null || claims === null || !skin || !locale) {
    return null;
  }
  const out: PropMap = { summary, pass, fail, unsupported, claims, skin, locale };
  return withExperiment(props, out);
}

function readAssignment(props: Dict): PropMap | null {
  if (!only(props, ["experiment", "variant"])) return null;
  if (props.experiment !== CHIP_ORDER_EXPERIMENT) return null;
  const variant = oneOf(props.variant, CHIP_ORDER_VARIANTS);
  if (!variant) return null;
  return { experiment: CHIP_ORDER_EXPERIMENT, variant };
}

function readConversion(props: Dict): PropMap | null {
  if (!only(props, ["experiment", "variant", "goal"])) return null;
  if (props.experiment !== CHIP_ORDER_EXPERIMENT) return null;
  const variant = oneOf(props.variant, CHIP_ORDER_VARIANTS);
  const goal = oneOf(props.goal, GOALS);
  if (!variant || !goal) return null;
  return { experiment: CHIP_ORDER_EXPERIMENT, variant, goal };
}

function readLocaleIgnored(props: Dict): PropMap | null {
  if (!only(props, ["requested", "skin"])) return null;
  if (props.requested !== "de" || props.skin !== "craft") return null;
  return { requested: "de", skin: "craft" satisfies BrandSkin };
}

function withExperiment(props: Dict, out: PropMap): PropMap | null {
  if (!("experiment" in props) && !("variant" in props)) return out;
  if (props.experiment !== CHIP_ORDER_EXPERIMENT) return null;
  const variant = oneOf(props.variant, CHIP_ORDER_VARIANTS);
  if (!variant) return null;
  out.experiment = CHIP_ORDER_EXPERIMENT;
  out.variant = variant;
  return out;
}

function only(props: Dict, allowed: readonly string[]): boolean {
  return Object.keys(props).every((key) => allowed.includes(key));
}

function hasBlocked(props: Dict): boolean {
  for (const [key, value] of Object.entries(props)) {
    if (BLOCKED_KEYS.has(key.toLowerCase()) || SECRET.test(key)) return true;
    if (typeof value === "string" && SECRET.test(value)) return true;
    if (typeof value === "string" && value.length > 80) return true;
  }
  return false;
}

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function integer(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

function hash8(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}$/.test(value) ? value : null;
}

function pathName(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 80) return null;
  if (!/^[a-z0-9./_-]+$/i.test(value)) return null;
  if (SECRET.test(value)) return null;
  return value;
}

function fail(error: string): ParseResult {
  return { ok: false, error };
}
