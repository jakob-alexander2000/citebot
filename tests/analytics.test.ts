import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { fingerprint, parseEvent, summarizeEvents } from "../lib/analytics";
import { eventSummary, forwardEvent, recordEvent, resetEventLogForTests } from "../lib/event-log";
import {
  assignChipOrder,
  chipExperimentForSkin,
  orderChips,
} from "../lib/experiment";
import { NORDLICHT_QUESTIONS, DEMO_QUESTIONS } from "../lib/demo-questions";

const fixed = new Date("2026-10-27T12:00:00.000Z");

describe("event schema", () => {
  it("hashes a question without keeping the text", () => {
    const question = "How many paid vacation days do full-time employees get?";
    const hash = fingerprint(question);
    assert.match(hash, /^[0-9a-f]{8}$/);
    assert.notEqual(hash, question);
    assert.equal(fingerprint(question), hash);
    assert.notEqual(fingerprint("other"), hash);
  });

  it("accepts a page view and a verify result", () => {
    const page = parseEvent(
      { name: "page_view", props: { page: "ask", locale: "en", skin: "craft" } },
      fixed,
    );
    assert.equal(page.ok, true);
    if (page.ok) assert.equal(page.event.ts, fixed.toISOString());

    const verify = parseEvent({
      name: "verify_result",
      props: {
        summary: "grounded",
        pass: 2,
        fail: 0,
        unsupported: 1,
        claims: 3,
        skin: "product",
        locale: "de",
      },
    });
    assert.equal(verify.ok, true);
  });

  it("rejects question text, secrets, and German craft events", () => {
    const question = parseEvent({
      name: "ask_submit",
      props: {
        via: "typed",
        chars: 12,
        hash: "abcdef01",
        skin: "craft",
        locale: "en",
        question: "What is the PTO rule?",
      },
    });
    assert.equal(question.ok, false);

    const secret = parseEvent({
      name: "page_view",
      props: { page: "home", locale: "en", skin: "craft", token: "sk-live-secret-value" },
    });
    assert.equal(secret.ok, false);

    const keyInValue = parseEvent({
      name: "ask_submit",
      props: {
        via: "typed",
        chars: 4,
        hash: "AIzaSyFakeKeyValue",
        skin: "craft",
        locale: "en",
      },
    });
    assert.equal(keyInValue.ok, false);

    const germanCraft = parseEvent({
      name: "page_view",
      props: { page: "home", locale: "de", skin: "craft" },
    });
    assert.equal(germanCraft.ok, false);

    const germanProduct = parseEvent({
      name: "page_view",
      props: { page: "home", locale: "de", skin: "product" },
    });
    assert.equal(germanProduct.ok, true);

    const ignored = parseEvent({
      name: "locale_ignored",
      props: { requested: "de", skin: "craft" },
    });
    assert.equal(ignored.ok, true);

    const ignoredProduct = parseEvent({
      name: "locale_ignored",
      props: { requested: "de", skin: "product" },
    });
    assert.equal(ignoredProduct.ok, false);
  });

  it("summarizes assignment and first-submit conversions by variant", () => {
    const events = [
      event("experiment_assignment", { experiment: "ask_chip_order", variant: "control" }),
      event("experiment_assignment", { experiment: "ask_chip_order", variant: "demo_first" }),
      event("experiment_conversion", {
        experiment: "ask_chip_order",
        variant: "demo_first",
        goal: "ask_submit",
      }),
      event("experiment_conversion", {
        experiment: "ask_chip_order",
        variant: "demo_first",
        goal: "verify",
      }),
      event("ask_submit", {
        via: "chip",
        chars: 40,
        hash: "abcdef01",
        skin: "craft",
        locale: "en",
      }),
    ];
    const summary = summarizeEvents(events);
    assert.equal(summary.totals.experiment_assignment, 2);
    assert.equal(summary.totals.ask_submit, 1);
    const demo = summary.experiments.ask_chip_order?.demo_first;
    assert.deepEqual(demo, { assignment: 1, ask_submit: 1, verify: 1 });
    assert.equal(summary.experiments.ask_chip_order?.control?.assignment, 1);
    assert.equal(summary.experiments.ask_chip_order?.control?.verify, 0);
  });
});

describe("chip order experiment", () => {
  it("keeps a stored variant and assigns from the random draw", () => {
    assert.deepEqual(assignChipOrder("demo_first", 0.1), { variant: "demo_first", fresh: false });
    assert.deepEqual(assignChipOrder("control", 0.9), { variant: "control", fresh: false });
    assert.deepEqual(assignChipOrder(undefined, 0), { variant: "control", fresh: true });
    assert.deepEqual(assignChipOrder("nope", 0.5), { variant: "demo_first", fresh: true });
    assert.deepEqual(assignChipOrder(null, 0.49), { variant: "control", fresh: true });
  });

  it("does not assign outside the craft skin", () => {
    assert.deepEqual(chipExperimentForSkin("product", "demo_first", 0.9), {
      variant: null,
      fresh: false,
    });
    assert.deepEqual(chipExperimentForSkin("client", undefined, 0.1), {
      variant: null,
      fresh: false,
    });
    assert.deepEqual(chipExperimentForSkin("craft", "control", 0.9), {
      variant: "control",
      fresh: false,
    });
  });

  it("moves the Friday demo chip first and leaves the quality handbook alone", () => {
    const control = orderChips(NORDLICHT_QUESTIONS, "control").map((item) => item.source);
    const lead = orderChips(NORDLICHT_QUESTIONS, "demo_first").map((item) => item.source);
    assert.deepEqual(control, ["pto-and-leave.md", "expense-policy.md", "demo-day.md"]);
    assert.deepEqual(lead, ["demo-day.md", "pto-and-leave.md", "expense-policy.md"]);
    assert.deepEqual(
      orderChips(DEMO_QUESTIONS.en, "demo_first").map((item) => item.source),
      DEMO_QUESTIONS.en.map((item) => item.source),
    );
    assert.deepEqual(
      orderChips(DEMO_QUESTIONS.de, null).map((item) => item.question),
      DEMO_QUESTIONS.de.map((item) => item.question),
    );
  });
});

describe("event log", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "citebot-events-"));
  const filePath = path.join(dir, "events.jsonl");
  const previousFetch = globalThis.fetch;
  const previousAnalytics = process.env.ANALYTICS_URL;
  const previousPlausible = process.env.PLAUSIBLE_DOMAIN;

  afterEach(() => {
    resetEventLogForTests(null);
    globalThis.fetch = previousFetch;
    if (previousAnalytics === undefined) delete process.env.ANALYTICS_URL;
    else process.env.ANALYTICS_URL = previousAnalytics;
    if (previousPlausible === undefined) delete process.env.PLAUSIBLE_DOMAIN;
    else process.env.PLAUSIBLE_DOMAIN = previousPlausible;
  });

  it("appends a JSON line and summarizes the ring", () => {
    resetEventLogForTests(filePath);
    const parsed = parseEvent(
      { name: "page_view", props: { page: "harness", locale: "en", skin: "craft" } },
      fixed,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    recordEvent(parsed.event);
    const lines = readFileSync(filePath, "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]!).name, "page_view");
    assert.equal(eventSummary().totals.page_view, 1);
    assert.equal(JSON.stringify(eventSummary()).includes("How many paid"), false);
  });

  it("forwards only when a collector URL is set", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response("ok");
    }) as typeof fetch;

    const parsed = parseEvent(
      { name: "page_view", props: { page: "home", locale: "en", skin: "product" } },
      fixed,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    delete process.env.ANALYTICS_URL;
    delete process.env.PLAUSIBLE_DOMAIN;
    delete process.env.VERCEL_ANALYTICS_URL;
    await forwardEvent(parsed.event);
    assert.equal(calls.length, 0);

    process.env.ANALYTICS_URL = "https://collector.test/events";
    process.env.PLAUSIBLE_DOMAIN = "citebot.test";
    await forwardEvent(parsed.event);
    assert.deepEqual(calls, [
      "https://collector.test/events",
      "https://plausible.io/api/event",
    ]);
  });
});

function event(name: string, props: Record<string, string | number>) {
  const parsed = parseEvent({ name, props }, fixed);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.event;
}
