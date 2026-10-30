export type DemoQuestion = {
  question: string;
  /** Fact an answer should surface, for the question chips. */
  expects: string;
  source: string;
};

/** Question chips. Facts from examples/nordlicht-corpus. */
export const DEMO_QUESTIONS: readonly DemoQuestion[] = [
  {
    question:
      "How many paid vacation days do full-time employees get, and when does unused paid time off expire?",
    expects: "30 days; unused paid time off does not carry over past March 31",
    source: "pto-and-leave.md",
  },
  {
    question: "What is the limit for a client meal, and how soon must receipts be uploaded?",
    expects: "€45 per person; within 14 days",
    source: "expense-policy.md",
  },
  {
    question: "When is Friday demo, and how long is each slot?",
    expects: "15:00 Europe/Berlin; five minutes, hard stop",
    source: "demo-day.md",
  },
];

export function activeDemoQuestions(): readonly DemoQuestion[] {
  return DEMO_QUESTIONS;
}
