# Handoff

Branch: `cursor/answer-core-56ce`

Code that was built and deployed: `1f0803f6975aeb40354ba61062bc6aef1635434c`

Head commit that first recorded this deployment: `3997c7ad212c7061c8d81d2dda734db94c48e40e`

Vercel deployment of the code commit: `dpl_U8FDoMoRgSQSn3WmwSFmDWr5qGwg` (READY)

Preview: https://citebot-mo2hetxyx-jakobalexander2000s-projects.vercel.app

Inspector: https://vercel.com/jakobalexander2000s-projects/citebot/U8FDoMoRgSQSn3WmwSFmDWr5qGwg

A documentation commit may sit on top of `1f0803f`. The preview above is that commit. It was not called. The live German check waits for the 00:00 UTC reset.

## Build-time embeddings

The sample handbook is embedded once. `data/passage-embeddings.json` holds 25 passages, model `@cf/baai/bge-m3`, dimension 1024, content hash `57ae2dc000c7ae7e5bb93d5e81d9791da671b8c3a786ecebf2b454aabfe524ed`. The runtime loads that file. A request embeds only the question, and an uploaded PDF. Query vectors are cached in memory (200 entries). Upload vectors stay on the session and go away with it. The phone facts are not in the file, so that collection stays on BM25.

Context sentences are filled from the title and headings. A model does not write them, so the hash stays valid.

## Budget

Each Workers AI call logs `citebot_neurons` with an estimate. Tokens are `ceil(chars / 4)`. Rates are the 20 Oct 2026 Workers AI prices: bge-m3 is 1,075 Neurons per million input tokens. The soft cap defaults to 6,000 (`CITEBOT_NEURON_SOFT_CAP`). Past that cap, retrieval stays on BM25 and the request still answers. Generation that hits the real daily quota still returns HTTP 429 `quota_exceeded`. `/api/limits` includes `neuronsUsedToday`. That number is this process's estimate since 00:00 UTC, not Cloudflare's meter.

## Retrieval (measured)

`npx tsx scripts/retrieval-quality.ts` on 29 labels written before that run (8 direct, 13 paraphrases, 8 German questions against English passages). Embeddings are Workers AI `@cf/baai/bge-m3`. Top 3. Hybrid stays the default ranker.

| Ranker | Hits | Recall@3 | MRR |
| --- | --- | --- | --- |
| BM25 | 22/29 | 0.7586 | 0.7184 |
| Vector | 29/29 | 1 | 0.9828 |
| Hybrid | 29/29 | 1 | 0.9483 |

BM25 missed `demo-paraphrase` and six German questions (`de-pto`, `de-carry`, `de-receipt`, `de-demo`, `de-sick`, `de-secret`). It hit the other two German questions and 12 of 13 paraphrases. Vector and hybrid missed none. Hybrid MRR is lower than vector alone.

### Held-out German paraphrases

Six more German questions were written in `HELD_OUT_GERMAN` before they were scored. They are not in the 29. `CITEBOT_HELD_OUT=/tmp/held-out-queries.json npx tsx scripts/held-out-german.ts` on 4 Nov 2026. The six query vectors are `@cf/baai/bge-m3`. Document vectors are the committed file. Top 3. Full rows are in `evals/held-out-german.json`.

| Ranker | Hits | Recall@3 | MRR |
| --- | --- | --- | --- |
| BM25 | 1/6 | 0.1667 | 0.0833 |
| Vector | 6/6 | 1 | 1 |
| Hybrid | 6/6 | 1 | 0.9167 |

BM25 hit only `de-hold-office` (rank 2). It missed `de-hold-holiday`, `de-hold-rest`, `de-hold-meal`, `de-hold-receipt`, and `de-hold-note`. Vector ranked every one first. Hybrid ranked `de-hold-meal` second and the other five first. These six were not used to change the ranker.

## Live check

This work finished before 00:00 UTC on 5 Nov 2026. The allowance had not reset. This row is **not checked**.

| Call | Result |
| --- | --- |
| `GET /api/limits` on `dpl_U8FDoMoRgSQSn3WmwSFmDWr5qGwg` | not checked |
| One real German answer, with citations and the claim check, after the reset | not checked |

The earlier preview call stays on the record. On `dpl_y2SMcE9SYmtbHh5LPTMYeKgXUyyc` (`f8b0ce3`), `GET /api/limits` returned `provider: workers-ai` in 0.130s, and the German `POST /api/answer` returned HTTP 429 `quota_exceeded` in 1.197s. That deployment does not have the committed embeddings.

## GitHub Actions

Run on `1f0803f`: https://github.com/jakob-alexander2000/citebot/actions/runs/41911561701

| Check | Result |
| --- | --- |
| Fixtures and build | pass (52s) |
| citebot-evals fixtures | pass (10s) |
| Playwright Chromium and WebKit | pass (1m36s) |
| Vercel | pass (`dpl_U8FDoMoRgSQSn3WmwSFmDWr5qGwg`) |

Playwright job log: 18 tests across the six projects. One was flaky. `webkit-iphone` "a draft that drops unless is flagged" hit the 30s test timeout once, then passed on retry in 469ms. The job reports `1 flaky` and `17 passed (37.6s)`.

| Project | Viewport | Home and /ask | Limits and handbook cite | Dropped unless |
| --- | --- | --- | --- | --- |
| chromium-iphone | 390×844 | pass | pass | pass |
| chromium-ipad | 744×1133 | pass | pass | pass |
| chromium-desktop | 1280×800 | pass | pass | pass |
| webkit-iphone | 390×844 | pass | pass | pass on retry (first try timed out at 30s) |
| webkit-ipad | 744×1133 | pass | pass | pass |
| webkit-desktop | 1280×800 | pass | pass | pass |

## Acceptance

| Row | Result | Proof |
| --- | --- | --- |
| Handbook passages embedded once and committed, with model id and content hash | pass | `data/passage-embeddings.json`. `npx tsx --test tests/passage-embeddings.test.ts` |
| Runtime embeds only the query and an uploaded PDF; both are cached | pass | `lib/core/answer.ts` (`cachedQueryEmbedding`), `lib/core/embed-runtime.ts` (skips chunks that already have a vector; vectors live on the session) |
| Soft cap defaults to 6,000, then BM25; generation quota is still 429 | pass | `npx tsx --test tests/neuron-budget.test.ts`. `CITEBOT_NEURON_SOFT_CAP`. `/api/limits` field `neuronsUsedToday` |
| CI and evals do not call Workers AI; a test fails on a fetch to api.cloudflare.com | pass | `npx tsx --test tests/no-live-workers.test.ts`. Workflow env `CITEBOT_ALLOW_LIVE_MODEL: "0"`. CI does not run `embed:passages` or `retrieval:measure` |
| Hybrid stays the default; original 29-label table kept | pass | Table above. `evals/retrieval-quality.json`. `hybridRank` in `lib/core/answer.ts` |
| Six held-out German paraphrases written before the run | pass | Table above. `evals/held-out-german.json` |
| Live `/api/limits` and one German answer after 00:00 UTC | not checked | Finished before the 5 Nov 2026 00:00 UTC reset |
| `/ask` uses the same ModelProvider as `/api/answer`, not Gemini | pass | `npx tsx --test tests/no-gemini.test.ts` |
| No request to generativelanguage.googleapis.com | pass | Same test |
| Reject uploads over 10 MB from Content-Length, and cancel the stream | pass | `npx tsx --test tests/core-upload.test.ts` |
| CORS only for `https://*.vercel.app` | pass | `lib/core/cors.ts` |
| Public contract for citebot-site | pass | `docs/api-contract.md` |
| Unit tests | pass | `npm test` — 83 passed, 0 failed |
| GitHub Actions Chromium and WebKit at the three sizes | pass, one flake | Run 41911561701 on `1f0803f` |

## Found, not fixed

- The live German answer after the 00:00 UTC reset was not run. This work finished before that reset on 4 Nov 2026.
- `neuronsUsedToday` is this process's estimate. It resets when the process starts, and it is not Cloudflare's account meter. CiteBot, the product site, and the phone agent share the real 10,000.
- The phone knowledge base is not in `data/passage-embeddings.json`. Phone search stays on BM25.
- pgvector SQL is still not executed against a database.
- Hybrid MRR is lower than vector alone on both sets (0.9483 vs 0.9828 on the 29; 0.9167 vs 1 on the six).
- `webkit-iphone` dropped-unless was flaky again on `1f0803f` (30s timeout, passed on retry in 469ms).
