# CiteBot

CiteBot answers a question from a sample employee handbook and shows the passage that answer came from. A second HTTP API can answer the same way for another product: a web chat or a phone agent.

[Try the handbook demo](https://citebot-chi.vercel.app)

The handbook demo at `/ask` still checks each claim and marks it pass, fail, or unsupported. When the pages do not cover the question, a straight refusal counts as pass.

The recorded run on 29 October 2026 passed 8 of 8 questions. Those questions run through the real agent loop with a stand-in model and an offline check, so they catch code changes, not live-model mistakes. `npm run eval` rewrites [evals/last-run.json](evals/last-run.json). The evals page shows what was measured, who wrote the cases, the date, and the commit.

## Answer API

`POST /api/answer` returns sentences. Each sentence has the passages it was tied to, a match status (`supported`, `partial`, or `unsupported`), and any condition the passage states that the answer dropped (`only`, `unless`, `nur`, `außer`, `sofern`, `erst nach`, and a few close variants). The body also includes a trace of the retrieval steps and an audit id.

`GET /api/limits` says which provider is active and states the upload caps. With no `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN`, `provider` is `mock`. The mock writes a context sentence from the document title and heading, and it drafts by copying the best matching sentences. It does not call a model vendor. `/ask` uses this same path.

When both Cloudflare variables are set, drafting and context sentences use Workers AI. The main model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. If that call fails for a reason other than quota, the core tries `@cf/zai-org/glm-4.7-flash`. The free allowance is 10,000 Neurons per day and resets at 00:00 UTC. Over that limit, `/api/answer` and `/api/upload` return HTTP 429 with `code` `quota_exceeded`.

Search is keyword BM25 plus embeddings. The sample handbook vectors are computed once (`npm run embed:passages`) and stored in `data/passage-embeddings.json`. A request embeds only the question, or an uploaded PDF, and caches those vectors. If this process's estimated Neuron use for the UTC day passes the soft cap (default 6,000, `CITEBOT_NEURON_SOFT_CAP`), retrieval stays on BM25. `/api/limits` reports that estimate as `neuronsUsedToday`. The product-site contract is [docs/api-contract.md](docs/api-contract.md).

The phone collection (`examples/phone-kb/services.json`) has English and German facts for prices, service area, hours, and quote rules. The page at `/answer` calls the same API.

### Your own PDF

`POST /api/upload` accepts one PDF. The type is checked from the file bytes, not the name. The cap is 10 MB and 50 pages. The text stays in memory for that session, for 30 minutes, or until `DELETE /api/upload`. It is not written to disk or to the audit log. The log line has the page count, the chunk count, and timings. Uploads are limited to 10 per hour per IP.

## What was measured

On 4 November 2026, `npx tsx scripts/retrieval-quality.ts` scored 29 labeled handbook questions at top 3. Eight questions use the handbook's own wording. Thirteen are paraphrases. Eight are German questions against the English passage. A hit means a top-3 chunk is the labeled file and contains the labeled phrase. BM25 uses the passage plus its context sentence. Vector and hybrid use `@cf/baai/bge-m3`.

| Ranker | Hits | Recall@3 | MRR |
| --- | --- | --- | --- |
| BM25 | 22/29 | 0.7586 | 0.7184 |
| Vector | 29/29 | 1 | 0.9828 |
| Hybrid | 29/29 | 1 | 0.9483 |

BM25 missed one paraphrase (`demo-paraphrase`) and six of the eight German questions. Vector and hybrid missed none. Hybrid MRR is lower than vector alone because the keyword list changes some ranks. The case list is in [evals/retrieval-quality.json](evals/retrieval-quality.json).

## Run the tests

```bash
npm install
npm test
npm run eval
```

`npm test` uses recorded model turns and the mock answer provider. It does not need an API key. `npm run eval` runs the handbook agent loop on the eight questions in `evals/golden.json`. It does not call a live model.

`npm run lint` runs ESLint. `npx tsc --noEmit` typechecks. `npm run build` builds the app.

Browser tests, after a build, in Chromium and WebKit at 390×844, 744×1133, and 1280×800:

```bash
npx playwright install --with-deps chromium webkit
npm run build
npm run test:e2e
```

## Ask locally

1. `cp .env.example .env.local`.
2. Leave the Cloudflare variables empty to use the mock, or set them to use Workers AI.
3. `npm run dev` and open http://localhost:3000/ask or http://localhost:3000/answer.

Do not commit keys.

## Where data is processed

This is a description of the code, not a legal opinion.

- The app runs on whatever host you deploy (the current demo is Vercel). This repo does not pin an EU region. The host sees the request, including a question and an uploaded PDF, in memory.
- The mock path does not send the question or the PDF to a model vendor.
- Workers AI, when the Cloudflare variables are set, sends the prompt (the question and the passages, and for an upload the chunk text) and the text to embed to Cloudflare at `api.cloudflare.com`. The embedding model is `@cf/baai/bge-m3`. This repo does not choose an EU-only inference location. The free plan's neuron counter resets at 00:00 UTC.
- `/ask` and `/api/answer` use that same provider. This app does not call Google for answers or embeddings.
- Optional `DATABASE_URL` stores handbook and phone chunks in Postgres (intended for Supabase). Uploaded PDFs are rejected by that store. No Supabase project is created by this repo, so the region would be the one on that future project. An EU region is the right choice for German customers. Until then the preview does not use it.
- The audit log stores an id, the provider, counts, and the length of the question. It does not store the question, the answer text, or an uploaded PDF. A local `.cache/audit.jsonl` is written outside tests. Upload handling does not write that file.
- Browser calls are allowed only from `https://*.vercel.app` previews. Server-to-server calls do not send an Origin header and do not need CORS.

Customer documents should not be pasted into consumer chat tools. The sample handbook is fiction.
