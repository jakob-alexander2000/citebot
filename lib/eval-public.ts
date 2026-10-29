export type EvalFailMode = {
  id: string;
  title: string;
  check: string;
  body: string;
};

export const EVAL_FAIL_MODES: readonly EvalFailMode[] = [
  {
    id: "missed-fact",
    title: "Missed fact",
    check: "answer-includes",
    body: "The draft never states the handbook figure the case requires — no “30”, no “March 31”, no “14 days”.",
  },
  {
    id: "wrong-page",
    title: "Wrong page",
    check: "citation-source",
    body: "The citation chips point at a different file than the page that states the fact.",
  },
  {
    id: "invented-detail",
    title: "Invented detail",
    check: "answer-excludes",
    body: "The draft repeats a false premise (unlimited leave, a made-up name) or a number the retrieved passage does not contain. Verify marks that claim fail.",
  },
  {
    id: "gap-filled",
    title: "Gap filled in",
    check: "refusal",
    body: "A question the handbook does not answer still gets a specific story, instead of saying the pages do not cover it.",
  },
  {
    id: "verify-disagreed",
    title: "Verify disagreed",
    check: "verification-summary",
    body: "A supported case came back mixed, unsupported, or with a fail or unsupported claim. The wrong-count case is the mirror: it fails the suite when verify lets “25 days” through as pass.",
  },
  {
    id: "stopped",
    title: "Empty or stopped",
    check: "loop-finished",
    body: "The loop stopped before a draft, or the draft was empty. The tool trace did not include a handbook search.",
  },
];

export const EVAL_SCORECARD = {
  kicker: "Evals",
  title: "A fixed set of handbook questions.",
  lead: "Eight questions from the sample employee handbook. Each one runs the same agent loop as Ask — a handbook search, a draft, then verify — and the case passes or fails on that result.",
  passTitle: "What pass means",
  pass: "Every check on every case held. A supported question stated the handbook fact, cited the page that contains it, and verify marked each claim pass. A gap question refused, and that refusal was pass because the passages do not answer it. The wrong-count case is a bad draft on purpose: it passes only when verify marks 25 days as fail against the page that says 30.",
  failTitle: "How a fail looks",
  failLead:
    "A case fails when any one check misses. The command prints the case id and the check name. The suite exits with a failure, so CI goes red.",
  runTitle: "How to run",
  command: "npm run eval",
  offline:
    "No API key. The loop reads the committed handbook under examples/nordlicht-corpus. Claims use the same pass, fail, and unsupported tokens as the live verify step. A figure in a claim that is missing from the retrieved passage is fail. A correct “not in the handbook” refusal is pass.",
  sibling:
    "CI also runs the sibling citebot-evals fixture scorecard. That job replays saved replies. This command runs the agent loop.",
  ask: "Ask the handbook",
  harness: "How the check works",
} as const;
