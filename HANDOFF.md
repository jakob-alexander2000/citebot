# Handoff

Branch: `cursor/answer-core-56ce`

Implementation commit: `5e159c157e2f92303915ef36e4093123dff1e3d5`

Handoff SHA line: `82ddc5359c993c2c8961ea547f1f31af9826ee1c`

Vercel deployment for that handoff commit: `dpl_EfQ1z4HXnKPtHK9Uay8oYJ7T55G7`, state READY.

Preview URL: https://citebot-3sjjildkk-jakobalexander2000s-projects.vercel.app

Branch alias: https://citebot-git-cursor-answer-c-3026ee-jakobalexander2000s-projects.vercel.app

Inspector: https://vercel.com/jakobalexander2000s-projects/citebot/EfQ1z4HXnKPtHK9Uay8oYJ7T55G7

A later commit that only records this deployment id will not match that deployment. The built commit is `82ddc5359c993c2c8961ea547f1f31af9826ee1c`.

## Acceptance

| Row | Result | Proof |
| --- | --- | --- |
| Keyword rank (BM25, k1 1.2, b 0.75) plus reciprocal rank fusion | pass | `npx tsx --test tests/core-search.test.ts` |
| Meaning search with a free local multilingual model, embeddings precomputed at build time | fail | Not built. `evals/retrieval-quality.json` has `neuralEmbeddings: null`. The mock provider skips the vector step. Workers AI can embed with `@cf/baai/bge-m3` when credentials exist; that call was not made. |
| Contextual sentence prepended before indexing. Deterministic title and heading when no Workers AI credentials | pass | `lib/core/draft.ts` `deterministicContext`; index text is context plus passage. Retrieval file compares both. |
| Gemini context or Gemini answers in the answer core, including when `GEMINI_API_KEY` is set | pass (removed) | `npx tsx --test tests/core-provider.test.ts` — "does not call generativelanguage.googleapis.com from the answer core" |
| `ModelProvider` with Workers AI and a deterministic mock | pass (fake HTTP) | Same file: mock when Cloudflare env is missing; German prompt; token stripped from errors. Live Cloudflare was not called. |
| Fallback model `@cf/zai-org/glm-4.7-flash` when the main model fails, except quota | pass (fake HTTP) | "uses the fallback model when the main model fails for a reason other than quota" |
| Quota maps to HTTP 429 `quota_exceeded` on `/api/answer` and `/api/upload`, no fallback call | pass (fake HTTP) | "returns quota_exceeded from the answer route" and "returns quota_exceeded from upload" in `tests/core-upload.test.ts` |
| Each answer sentence tied to a passage; dropped only / unless / nur / außer / sofern / erst nach flagged | pass | `tests/core-search.test.ts`, `tests/core-answer.test.ts` |
| `POST /api/answer` returns sentences, passages, match, flags, and a retrieval trace | pass | `tests/core-answer.test.ts` and `npx playwright test` (handbook question shows 30 and `pto-and-leave.md`) |
| German and English | pass | German phone question and dropped `sofern` / `erst nach` in `tests/core-answer.test.ts`. English covered by that file and Playwright. |
| CORS for `https://*.vercel.app` | pass | `tests/core-provider.test.ts` allows `https://preview.vercel.app`. `tests/core-answer.test.ts` does not allow `https://evil.example`. |
| Request trace and one audit entry per answer, without the question text | pass | `tests/core-answer.test.ts` ("audits without the question") |
| Phone facts: prices, service area, hours, quote rules | pass | `examples/phone-kb/services.json` and the German phone test |
| `POST /api/upload`: content check, 10 MB, 50 pages, memory only, 30 minute expiry, session end, no file text in logs | pass | `npx tsx --test tests/core-upload.test.ts` |
| Rate limit by IP | pass | "rate-limits uploads by IP" in that file |
| `GET /api/limits` states the caps and `provider: "mock"` without Cloudflare env | pass | `tests/core-provider.test.ts` and Playwright text "Provider: mock", "10 MB", "50 pages" |
| pgvector migration and a store implementation; preview uses memory | pass for the code, not checked against a database | `tests/core-search.test.ts` ("refuses to store an upload" and the migration test). No `DATABASE_URL` in this session. |
| Retrieval quality before/after on the sample handbook, only measured numbers | pass for BM25 | `npx tsx scripts/retrieval-quality.ts` wrote `evals/retrieval-quality.json`. Passage only: 8/8, Recall@3 1, MRR 1. With the context sentence: 8/8, Recall@3 1, MRR 1. The context sentence did not change the score. Neural before/after: not checked. |
| Unit tests | pass | `npm test` — 76 passed, 0 failed, on 4 November 2026. |
| Playwright Chromium and WebKit at 390×844, 744×1133, and 1280×800 | pass | `npx playwright test` — 18 passed (6 projects × 3 tests). Projects: `chromium-iphone`, `chromium-ipad`, `chromium-desktop`, `webkit-iphone`, `webkit-ipad`, `webkit-desktop`. |
| GitHub Actions job for those browsers | pass in the workflow file, not checked on GitHub | `.github/workflows/ci.yml` job "Playwright Chromium and WebKit". It has not run on this branch yet. |
| Existing handbook demo | pass | `npm run eval` — Score 8/8. Playwright opens `/` and `/ask` and sees the handbook heading and the question box. |
| AGENTS.md, ADR, plain-language README, data-processing notes | pass | `AGENTS.md`, `docs/adr/001-hybrid-search-and-storage.md`, `README.md`, `docs/api.md` |
| No secrets committed | pass | `.env.example` has empty placeholders only. Tests use fake tokens and assert they are not in responses. |

## Playwright

Command: `npx playwright test` after `npm run build`, on 4 November 2026.

18 passed in 6.7s.

| Project | Viewport | Home and /ask | Limits and handbook cite | Dropped unless |
| --- | --- | --- | --- | --- |
| chromium-iphone | 390×844 | pass | pass | pass |
| chromium-ipad | 744×1133 | pass | pass | pass |
| chromium-desktop | 1280×800 | pass | pass | pass |
| webkit-iphone | 390×844 | pass | pass | pass |
| webkit-ipad | 744×1133 | pass | pass | pass |
| webkit-desktop | 1280×800 | pass | pass | pass |

`/ask` logs `Math.random()` during prerender. The form still rendered. See found, not fixed.

## Measured retrieval

From `evals/retrieval-quality.json`, produced by `npx tsx scripts/retrieval-quality.ts`:

- Before (passage text only): hits 8/8, recallAt3 1, mrr 1
- After (context sentence prepended): hits 8/8, recallAt3 1, mrr 1
- Neural embeddings: not measured

## What is stubbed

- The mock provider drafts by copying matching sentences. It does not call a model.
- Vector search does not run unless Workers AI credentials are set and `embed` succeeds.
- pgvector is code and SQL only. Nothing connected to Supabase.
- Workers AI quota and fallback were tested with a fake `fetch`, not the live API.

## Found, not fixed

- `/ask` still calls Gemini. That is the existing handbook chat, not the answer core. `app/ask/page.tsx` calls `Math.random()` for the chip-order experiment. Under `next start` with cache components, the server logs a prerender error. The page still showed the question box in Playwright.
- No transformers.js model is vendored. Meaning search is not available on a preview without Cloudflare.
- The 8 labeled handbook questions were all rank 1 already, so contextual retrieval did not move Recall@3.
- Upload reads the multipart body into memory and then rejects files over 10 MB. A much larger body is still buffered before the check.
- The audit hash of the question is not stored. Only the character count is. A short question is not in the log; the host may still keep the raw request under its own policy.
- Workers AI region is not pinned to the EU. README states that.
- The READY preview above is for `82ddc53`. A commit that only adds this deployment id is not that deployment.
- GitHub Actions for this branch had not finished when this file was written.
