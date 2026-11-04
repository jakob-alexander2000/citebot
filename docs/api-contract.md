# Public route contract

This is the contract for a product site that calls CiteBot server to server, or from a `https://*.vercel.app` preview. Same-origin browser calls from this app do not send a cross-origin `Origin` and are unaffected.

Base URL is the CiteBot deployment. Send `Content-Type: application/json` for JSON bodies. No API key is required.

## CORS

A browser call is allowed only when the `Origin` header is `https://` and the host ends with `.vercel.app`. The response then sets `Access-Control-Allow-Origin` to that exact origin.

Any other origin, including localhost and `http://` hosts, gets no `Access-Control-Allow-Origin` header. The request is still answered. Server-to-server calls omit `Origin` and do not need CORS.

`OPTIONS` on these routes returns 204 with the same CORS headers. Allowed methods are `GET`, `POST`, and `DELETE`. Allowed request headers are `Content-Type` and `x-citebot-session`.

## GET /api/limits

No body.

```json
{
  "provider": "workers-ai",
  "upload": {
    "maxBytes": 10485760,
    "maxPages": 50,
    "sessionTtlMinutes": 30,
    "rateLimit": { "limit": 10, "windowMinutes": 60 }
  },
  "models": {
    "main": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "fallback": "@cf/zai-org/glm-4.7-flash"
  },
  "quota": {
    "neuronsPerDay": 10000,
    "softCap": 6000,
    "neuronsUsedToday": 0,
    "resets": "00:00 UTC",
    "note": "neuronsUsedToday is this process's estimate since 00:00 UTC, not Cloudflare's meter. The free allowance is 10,000 Neurons per day. Past the soft cap, retrieval stays on keyword search. A real generation quota error is still HTTP 429."
  }
}
```

`provider` is `"workers-ai"` when both `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set, and `"mock"` otherwise. Model names follow `WORKERS_AI_MODEL` and `WORKERS_AI_FALLBACK_MODEL` when those are set.

## POST /api/upload

`multipart/form-data` with one field, `file`. The type is taken from the bytes (`%PDF-` in the first 1024 bytes), not from the file name.

Limits, also returned by `/api/limits`:

- File at most 10 MB (`10485760` bytes). A `Content-Length` above that plus 64 KB of multipart overhead is rejected before the body is read. A body that grows past that cap is cancelled mid-stream.
- At most 50 pages.
- 10 uploads per hour per IP.

Success `200`:

```json
{
  "sessionId": "uuid",
  "pageCount": 1,
  "chunkCount": 2,
  "timings": { "readMs": 1, "parseMs": 2, "indexMs": 3 },
  "provider": "mock",
  "expiresInMinutes": 30
}
```

The response also sets an `HttpOnly` cookie `citebot_session`. The body does not include the PDF text. The text stays in memory until `DELETE /api/upload` or 30 minutes after the upload.

`DELETE /api/upload` with header `x-citebot-session` or the cookie ends the session. Response: `{ "ended": true }`.

Other upload responses:

| Status | `code` | When |
| --- | --- | --- |
| 400 | `bad_request` | No `file` field, or the body is not multipart |
| 413 | `too_large` | Over 10 MB |
| 415 | `not_pdf` | Bytes are not a PDF, or the PDF cannot be read |
| 422 | `too_many_pages` | More than 50 pages |
| 422 | `empty_pdf` | No extractable text |
| 429 | `rate_limited` | Too many uploads from this IP |
| 429 | `quota_exceeded` | Workers AI neuron allowance is used up. The session is not stored |

## POST /api/answer

```json
{
  "question": "Wie viele Urlaubstage gibt es?",
  "locale": "de",
  "collection": "handbook",
  "sessionId": "optional",
  "draft": "optional text to check instead of drafting",
  "topK": 4
}
```

`question` is required, 1 to 1000 characters. `locale` is `en` or `de` (default `en`). `collection` is `handbook` or `phone` (default `handbook`). `topK` is 1 to 8 (default 4). `sessionId` searches that upload instead of the collection. The same id may be sent as `x-citebot-session`.

Success `200`:

```json
{
  "requestId": "uuid",
  "provider": "workers-ai",
  "generation": "primary",
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "locale": "de",
  "collection": "handbook",
  "sentences": [
    {
      "text": "Full-time employees receive 30 days of paid vacation per calendar year.",
      "match": "supported",
      "passages": [
        {
          "id": "handbook:pto-and-leave-1",
          "source": "pto-and-leave.md",
          "title": "Time off and leave",
          "text": "Full-time employees receive 30 days of paid vacation per calendar year.",
          "score": 0.03,
          "headingPath": ["Time off and leave", "Paid time off"]
        }
      ],
      "flaggedConditions": [
        { "kind": "unless", "phrase": "unless a manager approves an exception in writing" }
      ]
    }
  ],
  "trace": [
    { "step": "provider", "ms": 0, "detail": "workers-ai" },
    { "step": "keyword", "ms": 2, "detail": "4 hits", "hits": [{ "id": "handbook:pto-and-leave-1", "score": 1.2 }] },
    { "step": "vector", "ms": 0, "detail": "embedded the question", "hits": [] },
    { "step": "fuse", "ms": 0, "detail": "reciprocal rank fusion k=60", "hits": [] },
    { "step": "draft", "ms": 400, "detail": "primary" },
    { "step": "claims", "ms": 1, "detail": "1 supported, 1 flagged" }
  ],
  "auditId": "uuid"
}
```

`provider` is `workers-ai` or `mock`. `generation` is `mock`, `primary`, `fallback`, `deterministic`, or `caller-draft`. `match` is `supported`, `partial`, or `unsupported`. `flaggedConditions` lists markers in the tied passage that the answer does not keep (`only`, `unless`, `nur`, `außer`, `sofern`, `erst nach`, and the close variants in the checker).

`POST /api/chat` accepts `{ "question", "locale"? }` and answers from the handbook through this same provider. Its JSON is the chat page shape (`answer`, `citations`, `verification`, `steps`) plus `provider` and `requestId`. New callers should use `/api/answer`.

## Quota error

When Workers AI rejects the call because the daily neuron allowance is used up, `/api/answer`, `/api/chat`, and `/api/upload` return HTTP 429:

```json
{
  "error": "Workers AI daily neuron allowance is used up. It resets at 00:00 UTC.",
  "code": "quota_exceeded"
}
```

Branch on `code`. The allowance is 10,000 Neurons per day and resets at 00:00 UTC. A quota failure does not try the fallback model.

An upload rate limit is also HTTP 429, with `code` `rate_limited` and a different `error` string. Do not treat every 429 as quota.

## Other answer errors

| Status | `code` | When |
| --- | --- | --- |
| 400 | `bad_request` | Missing or empty question, or the body is not JSON |
| 404 | `session_expired` | The upload session is missing or older than 30 minutes |
| 500 | `answer_failed` | The answer could not be produced |
