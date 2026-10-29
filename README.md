# CiteBot

CiteBot answers a question from one sample employee handbook and shows the passage that answer came from.

[Try it](https://citebot-chi.vercel.app)

Each claim is checked against those passages and marked pass, fail, or unsupported. When the pages do not cover the question, a straight refusal counts as pass.

The recorded run on 29 October 2026 passed 8 of 8 questions. The questions run through the real agent loop with a stand-in model and an offline check, so they catch code changes, not live-model mistakes. `npm run eval` rewrites [evals/last-run.json](evals/last-run.json); the [evals page](https://citebot-chi.vercel.app/evals) shows what was measured, who wrote the cases, the date and the commit.

## Run the evaluation and the tests

```bash
npm install
npm test
npm run eval
```

`npm test` uses recorded model turns. It does not need an API key. `npm run eval` runs the agent loop on the eight questions in `evals/golden.json` and scores each draft with the same pass, fail, and unsupported marks. It does not call a live model. One case is a bad draft on purpose (25 vacation days against a page that says 30). That case passes only when verify marks the figure fail.

`npm run lint` runs ESLint. `npx tsc --noEmit` typechecks. `npm run build` builds the app.

## Ask locally

1. `cp .env.example .env.local` and set `GEMINI_API_KEY`.
2. `npm run dev` and open http://localhost:3000/ask.

Chat uses Gemini. `OPENAI_API_KEY` is an optional fallback when Gemini is overloaded. Do not commit keys.
