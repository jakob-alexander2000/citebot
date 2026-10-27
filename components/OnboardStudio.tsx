"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AgentSteps } from "./AgentSteps";
import { Citations } from "./Citations";
import { EvidencePanel } from "./EvidencePanel";
import { TOOL_NAMES, type ToolName } from "@/lib/tools";
import type { AgentStep, Citation, Verification } from "@/lib/types";
import {
  ONBOARD_DOCS,
  ONBOARD_PROMPTS,
  ONBOARD_RUNS_KEY,
  ONBOARD_TOOL_BLURB,
  answerLooksLikeRefusal,
  defaultOnboardConfig,
  guardrailCopy,
  guardrailFrom,
  handoffJson,
  handoffMarkdown,
  handoffRun,
  handoffTicket,
  onboardConfigFromCookieHeader,
  onboardCookieAssignment,
  parseHandoffRuns,
  presetOnboardConfig,
  type GuardrailStatus,
  type HandoffRun,
  type OnboardConfig,
} from "@/lib/onboard";

type StepId = "config" | "ask" | "handoff";

type AskMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  verification?: Verification;
  steps?: AgentStep[];
  guardrail?: GuardrailStatus;
  error?: boolean;
};

const STEPS: { id: StepId; label: string }[] = [
  { id: "config", label: "Config" },
  { id: "ask", label: "Ask" },
  { id: "handoff", label: "Handoff" },
];

function writeConfig(config: OnboardConfig) {
  document.cookie = onboardCookieAssignment(config);
}

function download(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function printMarkdown(markdown: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  popup.document.write(
    `<!doctype html><title>Handoff</title><pre style="font:14px/1.5 ui-monospace,monospace;white-space:pre-wrap">${escaped}</pre>`,
  );
  popup.document.close();
  popup.focus();
  popup.print();
}

export function OnboardStudio({
  preset,
  org,
  footer,
}: {
  preset?: string;
  org: string;
  footer: string;
}) {
  const [step, setStep] = useState<StepId>("config");
  const [config, setConfig] = useState<OnboardConfig>(
    () => presetOnboardConfig(preset) ?? defaultOnboardConfig(),
  );
  const [runs, setRuns] = useState<HandoffRun[]>([]);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const presetConfig = presetOnboardConfig(preset);
    const next = presetConfig ?? onboardConfigFromCookieHeader(document.cookie);
    if (presetConfig) writeConfig(presetConfig);
    if (!next) return;
    const handle = window.setTimeout(() => {
      setConfig((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    }, 0);
    return () => window.clearTimeout(handle);
  }, [preset]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const saved = parseHandoffRuns(sessionStorage.getItem(ONBOARD_RUNS_KEY));
        if (saved.length) setRuns(saved);
      } catch {
        // sessionStorage can be blocked; the ticket still works for this view.
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  function updateConfig(next: OnboardConfig) {
    setConfig(next);
    writeConfig(next);
  }

  function toggleTool(name: ToolName) {
    const has = config.enabledTools.includes(name);
    const enabledTools = has
      ? config.enabledTools.filter((tool) => tool !== name)
      : [...config.enabledTools, name];
    updateConfig({ ...config, enabledTools });
  }

  function toggleDoc(id: string) {
    const has = config.documentIds.includes(id);
    const documentIds = has
      ? config.documentIds.filter((doc) => doc !== id)
      : [...config.documentIds, id];
    updateConfig({ ...config, documentIds });
  }

  function remember(run: HandoffRun) {
    setRuns((current) => {
      const next = [...current, run].slice(-20);
      try {
        sessionStorage.setItem(ONBOARD_RUNS_KEY, JSON.stringify(next));
      } catch {
        // The in-memory log still exports.
      }
      return next;
    });
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    const userMessage: AskMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          locale: "en",
          onboard: {
            clientLabel: config.clientLabel,
            systemPrompt: config.systemPrompt,
            enabledTools: config.enabledTools,
            documentIds: config.documentIds,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
        );
      }
      const answer = typeof data.answer === "string" ? data.answer : "";
      const citations = (data.citations as Citation[]) || [];
      const verification = data.verification as Verification;
      const steps = (data.steps as AgentStep[]) || [];
      const guardrail = verification ? guardrailFrom(answer, verification) : undefined;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
          citations,
          verification,
          steps,
          guardrail,
        },
      ]);
      if (verification) {
        remember(
          handoffRun({
            at: new Date().toISOString(),
            question: trimmed,
            answer,
            config,
            citations,
            steps,
            verification,
          }),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  function clearRuns() {
    setRuns([]);
    try {
      sessionStorage.removeItem(ONBOARD_RUNS_KEY);
    } catch {
      // ignore
    }
  }

  const englishDocs = ONBOARD_DOCS.filter((doc) => doc.lang === "en");
  const germanDocs = ONBOARD_DOCS.filter((doc) => doc.lang === "de");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-10 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        Onboard · {org}
      </p>
      <h1 className="mt-3 text-[2rem] font-medium leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
        Config, guardrail, handoff
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        Set the client packet, ask inside it, and export the run. The check is the same verify
        step as Ask.{" "}
        <Link
          href="/onboard/walkthrough"
          className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
        >
          Walkthrough
        </Link>
        {" · "}
        <Link
          href="/onboard/run"
          className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200"
        >
          How to run
        </Link>
      </p>

      <nav aria-label="Onboard steps" className="mt-6 flex gap-2">
        {STEPS.map((item, index) => {
          const active = step === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "step" : undefined}
              onClick={() => setStep(item.id)}
              className={
                active
                  ? "rounded-full px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              }
              style={active ? { backgroundColor: "var(--brand-accent)" } : undefined}
            >
              {index + 1} {item.label}
            </button>
          );
        })}
      </nav>

      {step === "config" ? (
        <form
          className="mt-8 space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
            setStep("ask");
          }}
        >
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Client label
            </span>
            <input
              value={config.clientLabel}
              onChange={(event) => updateConfig({ ...config, clientLabel: event.target.value })}
              maxLength={80}
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              System prompt
            </span>
            <textarea
              value={config.systemPrompt}
              onChange={(event) => updateConfig({ ...config, systemPrompt: event.target.value })}
              rows={5}
              maxLength={600}
              className="mt-2 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>

          <fieldset>
            <legend className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Documents
            </legend>
            <DocGroup
              title="English pages"
              docs={englishDocs}
              selected={config.documentIds}
              onToggle={toggleDoc}
            />
            <DocGroup
              title="German pages"
              docs={germanDocs}
              selected={config.documentIds}
              onToggle={toggleDoc}
            />
          </fieldset>

          <fieldset>
            <legend className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Handbook tools
            </legend>
            <ul className="mt-3 space-y-2">
              {TOOL_NAMES.map((name) => (
                <li key={name}>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={config.enabledTools.includes(name)}
                      onChange={() => toggleTool(name)}
                    />
                    <span>
                      <span className="font-mono text-[13px] text-zinc-900 dark:text-zinc-100">
                        {name}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-zinc-500">
                        {ONBOARD_TOOL_BLURB[name]}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              Ask with this config
            </button>
            <button
              type="button"
              onClick={() => updateConfig(defaultOnboardConfig())}
              className="text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4"
            >
              Reset config
            </button>
          </div>
        </form>
      ) : null}

      {step === "ask" ? (
        <div className="mt-8 flex flex-1 flex-col">
          <p className="text-[13px] text-zinc-500">
            {config.clientLabel} · {config.documentIds.length} pages · {config.enabledTools.length}{" "}
            tools
          </p>
          <div className="mt-4 flex flex-col items-start gap-2">
            {ONBOARD_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => void ask(prompt.question)}
                disabled={loading}
                className="rounded-full border border-zinc-200 px-3.5 py-2 text-left text-sm text-zinc-800 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
              >
                <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  {prompt.label}
                </span>
                {prompt.question}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-6">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2.5 text-[15px] leading-relaxed text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="max-w-[95%]">
                  <p
                    role={message.error ? "alert" : undefined}
                    className={
                      message.error
                        ? "rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3.5 text-[15px] text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200"
                        : "whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-100"
                    }
                  >
                    {message.content}
                  </p>
                  {message.guardrail && message.verification ? (
                    <GuardrailBanner
                      status={message.guardrail}
                      refusal={answerLooksLikeRefusal(message.content)}
                      local={message.steps?.some((step) =>
                        step.detail.includes("local passage check"),
                      )}
                    />
                  ) : null}
                  {message.steps && message.steps.length > 0 ? (
                    <AgentSteps steps={message.steps} locale="en" />
                  ) : null}
                  {message.citations && message.citations.length > 0 ? (
                    <Citations citations={message.citations} locale="en" />
                  ) : null}
                  {message.verification ? (
                    <EvidencePanel
                      verification={message.verification}
                      citations={message.citations || []}
                      locale="en"
                    />
                  ) : null}
                </div>
              ),
            )}
            {loading ? (
              <p className="text-sm text-zinc-500">Reading the client documents…</p>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="sticky bottom-0 mt-8 bg-[var(--background)] pt-4">
            <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-950">
              <label className="sr-only" htmlFor="onboard-question">
                Question
              </label>
              <input
                id="onboard-question"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask the enabled pages…"
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-35"
                style={{ backgroundColor: "var(--brand-accent)" }}
              >
                Ask
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-zinc-400">{footer}</p>
              <button
                type="button"
                onClick={() => setStep("handoff")}
                className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-300"
              >
                Open handoff{runs.length ? ` (${runs.length})` : ""}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {step === "handoff" ? (
        <HandoffPanel runs={runs} onClear={clearRuns} />
      ) : null}
    </div>
  );
}

function HandoffPanel({
  runs,
  onClear,
}: {
  runs: HandoffRun[];
  onClear: () => void;
}) {
  if (runs.length === 0) {
    return (
      <section className="mt-8">
        <p className="text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Ask a question first. The ticket is the runs from this browser tab.
        </p>
      </section>
    );
  }

  const markdown = handoffMarkdown(handoffTicket(new Date().toISOString(), runs));
  return (
    <section className="mt-8">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            download(
              "citebot-handoff.json",
              handoffJson(handoffTicket(new Date().toISOString(), runs)),
              "application/json",
            )
          }
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "var(--brand-accent)" }}
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => download("citebot-handoff.md", markdown, "text/markdown")}
          className="rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
        >
          Download Markdown
        </button>
        <button
          type="button"
          onClick={() => printMarkdown(markdown)}
          className="rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
        >
          Print
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4"
        >
          Clear runs
        </button>
      </div>
      <pre className="mt-6 overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 font-mono text-[12px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        {markdown}
      </pre>
    </section>
  );
}

function DocGroup({
  title,
  docs,
  selected,
  onToggle,
}: {
  title: string;
  docs: typeof ONBOARD_DOCS;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{title}</p>
      <ul className="mt-2 space-y-2">
        {docs.map((doc) => (
          <li key={doc.id}>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(doc.id)}
                onChange={() => onToggle(doc.id)}
              />
              <span>
                <span className="text-zinc-900 dark:text-zinc-100">{doc.title}</span>
                <span className="mt-0.5 block text-[13px] text-zinc-500">{doc.blurb}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuardrailBanner({
  status,
  refusal,
  local,
}: {
  status: GuardrailStatus;
  refusal: boolean;
  local?: boolean;
}) {
  const copy = guardrailCopy(status, refusal);
  const tone =
    status === "passed"
      ? "border-emerald-200/90 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
      : status === "refused"
        ? "border-amber-200/90 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        : "border-red-200/90 bg-red-50/80 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100";
  return (
    <div role="status" className={`mt-4 rounded-xl border px-4 py-3 ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Guardrail</p>
      <p className="mt-1 text-sm font-medium">{copy.title}</p>
      <p className="mt-1 text-[13px] leading-relaxed opacity-80">{copy.body}</p>
      {local ? (
        <p className="mt-2 text-[12px] leading-relaxed opacity-70">
          No API key is set, so this check compared the answer to the retrieved passages
          locally. With a key, the same panel is the model verify step.
        </p>
      ) : null}
    </div>
  );
}
