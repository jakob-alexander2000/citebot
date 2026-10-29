import type { ClaimVerdict, VerificationSummary } from "./types";

export type HarnessClaim = {
  claim: string;
  verdict: ClaimVerdict;
  evidence: string;
  sourceTitle?: string;
};

export type HarnessExample = {
  id: string;
  label: string;
  question: string;
  answer: string;
  note: string;
  summary: VerificationSummary;
  claims: HarnessClaim[];
};

export type HarnessCopy = {
  metaDescription: string;
  kicker: string;
  title: string;
  lead: (name: string, org: string) => string;
  problemTitle: string;
  problem: string;
  architectureTitle: string;
  architectureBefore: string;
  architectureAfter: string;
  steps: { step: string; title: string; body: string }[];
  loopTitle: string;
  loop: string;
  tools: { name: string; body: string }[];
  testsNote: string;
  examplesTitle: string;
  examplesLead: string;
  examples: HarnessExample[];
  tryTitle: string;
  tryItems: { label: string; body: string }[];
  openAsk: (name: string) => string;
  source: string;
  footer: string;
};

export const HARNESS: HarnessCopy = {
  metaDescription: "How CiteBot checks answers against the handbook passages it retrieved.",
  kicker: "Verify harness",
  title: "An answer checked against the handbook.",
  lead: (name, org) =>
    `${name} answers from the ${org} employee handbook. After the draft, one verify step scores each claim against the same retrieved passages — pass, fail, or unsupported — and shows the evidence under the citation chips.`,
  problemTitle: "Why the second pass exists",
  problem:
    "Citation chips can look authoritative while the prose quietly drifts. The verify step scores each claim against the retrieved passages and shows that result in the Evidence panel. It is not a confidence slider and not a second corpus.",
  architectureTitle: "Architecture",
  architectureBefore: "One path for every answer:",
  architectureAfter: "The draft and the verifier share the passages those tools returned.",
  steps: [
    { step: "1", title: "Plan", body: "Choose a handbook tool — search, a section, topics, or a quote check." },
    { step: "2", title: "Tools", body: "Run at most three corpus-only calls. No web, no shell." },
    { step: "3", title: "Draft", body: "Write a short answer from the passages those tools returned." },
    { step: "4", title: "Verify", body: "Split claims and mark each pass, fail, or unsupported." },
  ],
  loopTitle: "Agent loop",
  loop: "Each question runs a short loop before the draft: a plan, then at most three handbook tools. A fourth tool call, or the same call twice, stops the loop with a clear message. The transcript shows the tool names. The Evidence panel stays the pass / fail surface.",
  tools: [
    { name: "search_handbook", body: "Passages for a query." },
    { name: "list_topics", body: "Document titles and section names." },
    { name: "get_section", body: "One section by id, file, or title." },
    { name: "quote_check", body: "Whether a claimed quote appears in the text." },
  ],
  testsNote: "Fixture tests for the loop and the verifier run without a live API key.",
  examplesTitle: "Evidence examples",
  examplesLead: "Three panels from the sample employee handbook. Same chrome as the live Evidence panel.",
  examples: [
    {
      id: "pass",
      label: "01 · Pass",
      question: "How many paid vacation days do full-time employees get?",
      answer: "Full-time employees receive 30 days of paid vacation per calendar year.",
      note: "The day count lands on the time-off page: pass, the quote, and the source title.",
      summary: "grounded",
      claims: [
        {
          claim: "Full-time employees receive 30 days of paid vacation per calendar year.",
          verdict: "pass",
          evidence: "Supported: “30 days of paid vacation per calendar year”",
          sourceTitle: "Time off and leave",
        },
      ],
    },
    {
      id: "mixed",
      label: "02 · Partial support",
      question: "How many paid vacation days do full-time employees get, and can unused days carry past June?",
      answer:
        "Full-time employees receive 30 days of paid vacation. Unused days can carry past June.",
      note: "Thirty days is on the page. Carryover stops on March 31, so a June carryover fails and the summary is mixed.",
      summary: "mixed",
      claims: [
        {
          claim: "Full-time employees receive 30 days of paid vacation.",
          verdict: "pass",
          evidence: "Supported: “30 days of paid vacation per calendar year”",
          sourceTitle: "Time off and leave",
        },
        {
          claim: "Unused days can carry past June.",
          verdict: "fail",
          evidence: "The page says unused paid time off does not carry over past March 31.",
          sourceTitle: "Time off and leave",
        },
      ],
    },
    {
      id: "gap",
      label: "03 · Gap / refusal",
      question: "What is the office dog's name?",
      answer: "The handbook does not name an office dog.",
      note: "A correct gap is a pass on the refusal. An invented name would be unsupported or fail.",
      summary: "grounded",
      claims: [
        {
          claim: "The handbook does not name an office dog.",
          verdict: "pass",
          evidence: "Retrieved pages do not name an office dog. The refusal matches that gap.",
        },
      ],
    },
  ],
  tryTitle: "How to try it",
  tryItems: [
    {
      label: "Time off",
      body: "ask how many vacation days full-time employees get, and when unused paid time off expires.",
    },
    {
      label: "Expenses",
      body: "ask the client-meal limit and how soon receipts must be uploaded.",
    },
    {
      label: "Desk days",
      body: "ask which weekdays are desk days. A question the pages do not answer should be refused.",
    },
  ],
  openAsk: (name) => `Ask ${name}`,
  source: "Source",
  footer: "The same verify step runs on every answer. Fixture tests cover the loop without a live model.",
};
