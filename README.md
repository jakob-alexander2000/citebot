# CiteBot

CiteBot answers questions from a sample employee handbook. It searches the pages, cites the passage, and checks each claim against that passage.

The handbook is `examples/nordlicht-corpus`. Answers stay inside those files. There is no web search.

## Run the eval

```bash
npm install
npm run eval
```

`npm run eval` runs the agent loop on the eight questions in `evals/golden.json`, then scores each draft with verify. No API key. A case passes when the answer states the handbook fact, cites the file that contains it, and the verify summary matches the case. One case is a bad draft on purpose (25 vacation days against a page that says 30). That case passes only when verify marks the figure fail.

## Run the tests

```bash
npm test
```

The tests use recorded model turns and the committed handbook. They do not call Gemini or OpenAI.

`npm run lint` runs ESLint. `npx tsc --noEmit` typechecks. `npm run build` builds the app.

## Ask the handbook locally

1. `cp .env.example .env.local` and set `GEMINI_API_KEY`.
2. `npm run dev` and open http://localhost:3000/ask.

Chat uses Gemini. `OPENAI_API_KEY` is an optional fallback when Gemini is overloaded. Embeddings stay on Gemini. Do not commit keys.

## What is in the app

- `/ask` — question, citations, and the Evidence panel
- `/handbook` — the pages CiteBot can cite
- `/harness` — how verify works
- `/evals` — the eight golden questions and how a failed check looks

`POST /api/chat` runs one loop: plan, at most three handbook tools, a draft, then verify. Verdicts are `pass`, `fail`, and `unsupported`.
