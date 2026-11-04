# Answer API

Other products call this app over HTTP. The handbook chat at `/ask` is separate and still uses its own route.

## POST /api/answer

```json
{
  "question": "How many paid vacation days do full-time employees get?",
  "locale": "en",
  "collection": "handbook",
  "sessionId": "optional-upload-session",
  "draft": "optional text to check instead of drafting",
  "topK": 4
}
```

`locale` is `en` or `de`. `collection` is `handbook` or `phone`. `phone` is the small facts file for prices, service area, hours, and quote rules. If `sessionId` is set, the search uses that uploaded PDF and ignores `collection`.

The response has `provider` (`mock` or `workers-ai`), `generation`, `model`, `sentences`, `trace`, and `auditId`. Each sentence has `text`, `match` (`supported`, `partial`, or `unsupported`), `passages`, and `flaggedConditions`. A flagged condition is a marker such as only, unless, nur, außer, sofern, or erst nach that is in the tied passage and missing from the answer. `trace` lists retrieval steps with ids and scores, not a copy of an uploaded file in the log line.

Quota failure: HTTP 429, body `{ "code": "quota_exceeded" }`. An ended or expired upload session: HTTP 404, `{ "code": "session_expired" }`.

## POST /api/upload

Multipart field `file`. The type is decided from the bytes (`%PDF-` in the first 1024 bytes), not from the file name. At most 10 MB and 50 pages. The text is chunked and kept in memory for that session. The session ends on `DELETE /api/upload` (send `x-citebot-session` or the session cookie) or 30 minutes after the upload. The response has `sessionId`, `pageCount`, `chunkCount`, `timings`, and `provider`. It does not echo the file text.

Rate limit: 10 uploads per hour per IP, HTTP 429 `{ "code": "rate_limited" }`. A neuron-quota failure is HTTP 429 `{ "code": "quota_exceeded" }` and the session is not stored.

## GET /api/limits

Returns the upload caps, the 10,000 Neurons per day note, the model names, and `provider`. Without Cloudflare credentials, `provider` is `mock`.

## CORS

The public contract for the product site is [docs/api-contract.md](api-contract.md). Browser calls are allowed only from `https://*.vercel.app`.
