# Handoff

Branch: `cursor/answer-core-56ce`

Code that was built and called: `f8b0ce3b821ca3bed0ae056dcdedf915fc2fcc91`

Vercel deployment of that commit: `dpl_y2SMcE9SYmtbHh5LPTMYeKgXUyyc` (READY)

Preview: https://citebot-66x9h1up8-jakobalexander2000s-projects.vercel.app

Inspector: https://vercel.com/jakobalexander2000s-projects/citebot/y2SMcE9SYmtbHh5LPTMYeKgXUyyc

A documentation commit may sit on top of `f8b0ce3`. The preview above is the one that was called.

## Preview calls

`GET /api/limits` on that deployment returned HTTP 200 in 0.130s. `provider` was `workers-ai`. Models were `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and `@cf/zai-org/glm-4.7-flash`.

`POST /api/answer` with a German handbook question (`Wie viele bezahlte Urlaubstage bekommen Vollzeitkräfte im Jahr?`, `locale: de`) returned HTTP 429 in 1.197s:

```json
{ "error": "Workers AI daily neuron allowance is used up. It resets at 00:00 UTC.", "code": "quota_exceeded" }
```

That is the real Workers AI quota path. No sentence was generated. The same Cloudflare account had just embedded the handbook for the retrieval measurement, which spends the free 10,000 Neurons per day. The allowance resets at 00:00 UTC.

## Public contract

`docs/api-contract.md` is the contract for citebot-site. CORS is HTTPS `*.vercel.app` only. Quota is HTTP 429 with `code` `quota_exceeded`.

## Retrieval (measured)

`npx tsx scripts/retrieval-quality.ts` on 29 labels written before the run (8 direct, 13 paraphrases, 8 German questions against English passages). Embeddings are Workers AI `@cf/baai/bge-m3`. Top 3.

| Ranker | Hits | Recall@3 | MRR |
| --- | --- | --- | --- |
| BM25 | 22/29 | 0.7586 | 0.7184 |
| Vector | 29/29 | 1 | 0.9828 |
| Hybrid | 29/29 | 1 | 0.9483 |

BM25 missed `demo-paraphrase` and six German questions (`de-pto`, `de-carry`, `de-receipt`, `de-demo`, `de-sick`, `de-secret`). It hit the other two German questions and 12 of 13 paraphrases. Vector and hybrid missed none. Hybrid MRR is lower than vector alone.

## GitHub Actions

Run: https://github.com/jakob-alexander2000/citebot/actions/runs/41909372227

Commit: `f8b0ce3b821ca3bed0ae056dcdedf915fc2fcc91`

| Check | Result |
| --- | --- |
| Fixtures and build | pass (1m23s) |
| citebot-evals fixtures | pass (7s) |
| Playwright Chromium and WebKit | pass (2m23s) |
| Vercel | pass |

Playwright job log: 18 tests across the six projects. One was flaky. `webkit-iphone` "a draft that drops unless is flagged" hit the 30s test timeout once, then passed on retry in 435ms. The job reports `1 flaky` and `17 passed (38.9s)`. Every project and viewport below passed at least once, and the job is green.

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
| `/ask` uses the same ModelProvider as `/api/answer`, not Gemini | pass | `app/api/chat/route.ts` calls `handleChat`. `npx tsx --test tests/no-gemini.test.ts` |
| No request to generativelanguage.googleapis.com from chat, answer, or limits | pass | Same test. A repo grep of `app`, `lib`, `components`, and `scripts` finds no `@google/generative-ai` import. The npm dependency is removed. |
| No `Math.random()` during render | pass | `app/ask/page.tsx` uses cookie or the fixed order `control` |
| Workers AI `@cf/baai/bge-m3` embeddings; mock when env is missing | pass | `lib/core/workers-ai.ts` and `getModelProvider`. Preview `/api/limits` returned `workers-ai`. Local tests without the env use `mock`. |
| Harder retrieval set, measured BM25, vector, and hybrid | pass | Numbers above. `evals/retrieval-quality.json` |
| Reject uploads over 10 MB from Content-Length, and cancel the stream | pass | `npx tsx --test tests/core-upload.test.ts` ("Content-Length" and "stops reading a stream") |
| Preview `/api/limits` is `workers-ai` | pass | Fetched on `dpl_y2SMcE9SYmtbHh5LPTMYeKgXUyyc` |
| One real German answer | pass as a call, no generated sentence | HTTP 429 `quota_exceeded` in 1.197s |
| GitHub Actions Chromium and WebKit at the three sizes | pass, one flake | Run 41909372227 |
| CORS only for `https://*.vercel.app` | pass | `lib/core/cors.ts`. Localhost is not allowed. `tests/core-provider.test.ts` |
| Public contract for citebot-site | pass | `docs/api-contract.md` |
| Unit tests | pass | `npm test` — 77 passed |

## Found, not fixed

- The live German answer did not return a sentence. The Workers AI daily neuron allowance was already used. It resets at 00:00 UTC.
- `webkit-iphone` dropped-unless was flaky once in GitHub Actions (30s timeout, passed on retry).
- pgvector SQL is still not executed against a database.
- Hybrid MRR (0.9483) is lower than vector alone (0.9828) on this set.
