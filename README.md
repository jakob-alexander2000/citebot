# CiteBot

Selected work. English only.

CiteBot answers a question from one sample employee handbook and shows the passage that answer came from.

[Try it](https://citebot-chi.vercel.app)

Each claim is checked against those passages and marked pass, fail, or unsupported. When the pages do not cover the question, a straight refusal counts as pass.

The latest recorded run passed 8 of 8 questions on 2026-10-29 (commit `6bfa598`). `npm run eval` rewrites [evals/last-run.json](evals/last-run.json), and the evals page reads that file: what was measured, how many questions, who added the cases, the date, the pass count, and the commit.

## What was built, and what Jakob decided

From the git history, without guessing at motives:

- Jakob Alexander authored the first CiteBot app (`57b3d37`). TODO(Jakob): why this was the right first version.
- Jakob Alexander added the verify step that checks each claim against the retrieved passages (`73f59b8`). TODO(Jakob): why that check runs on every answer.
- Jakob Alexander added the tool-using agent loop and wired the question scorecard into continuous integration (`d832f42`). TODO(Jakob): why the loop is capped, and why the scorecard runs on every pull request.
- Jakob Alexander added the eight handbook questions (`3a7539d`). The message names the harness. TODO(Jakob): why these questions were the set.
- An automated edit removed the earlier bilingual handbook product from this public repository (`6bfa598`). TODO(Jakob): why that product should not stay here.

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
