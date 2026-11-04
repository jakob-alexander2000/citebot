<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Answer core

`/api/answer`, `/api/upload`, and `/api/limits` are the reusable core. The `/ask` chat is the existing handbook demo.

Do not send the answer core to Gemini. Model calls go through `ModelProvider` in `lib/core/provider.ts`. Missing `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN` means the mock provider. A neuron quota failure is HTTP 429 `quota_exceeded` and must not fall through to the fallback model. Other model failures may use `WORKERS_AI_FALLBACK_MODEL`.

Do not write an uploaded PDF, its text, or an API token to disk, logs, or the audit log. Upload logs are page count, chunk count, and timings. The audit entry for an answer stores counts and the question length, not the question.

`npm test` does not need a key. `npm run test:e2e` needs a production build and Playwright Chromium and WebKit. `npm run retrieval:measure` rewrites `evals/retrieval-quality.json` from the handbook. Do not invent retrieval numbers.

Read `docs/adr/001-hybrid-search-and-storage.md` before changing rank or storage.
