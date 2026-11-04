# Hybrid search and storage

The answer core ranks passages in two ways and merges the lists.

Keyword rank uses BM25 (k1 = 1.2, b = 0.75), the same constants as the retrieval-autopsy keyword ranker, over the passage plus a short context sentence. That sentence is prepended before indexing. It names the document title and the heading path. With no Workers AI credentials the sentence is filled in from the title and headings. With credentials, Workers AI writes it. The claim check still reads the original passage, not the added sentence.

Meaning rank is cosine similarity on embeddings from Workers AI `@cf/baai/bge-m3` (`WORKERS_AI_EMBED_MODEL` can override the model id). The mock provider has no embedder, so a process without Cloudflare credentials reports the vector step as skipped and ranks by keyword only. When the credentials are set, document vectors are cached in memory for that process and each question is embedded with the same model.

The two lists are merged with reciprocal rank fusion (k = 60). If there is no vector list, the fused list is the keyword list.

Storage sits behind a small interface.

- The preview uses memory. A JSON file under `.cache` can hold the handbook and phone index. Tests do not write it. Uploaded PDFs are refused by that writer.
- Postgres uses full-text search (`plainto_tsquery` / `ts_rank`) for the keyword leg and pgvector (`vector(1024)`) for the embedding leg. The SQL migration is `supabase/migrations/20261104120000_citebot_chunks.sql`. The table check allows `handbook` and `phone` only. No Supabase project is attached, so this path has not been run against a database.

Model calls go through `ModelProvider`. `CloudflareWorkersAI` posts to `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/<model>` with `CLOUDFLARE_API_TOKEN`. The default chat model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (`WORKERS_AI_MODEL`). If that call fails for any reason other than quota, the provider tries `@cf/zai-org/glm-4.7-flash` (`WORKERS_AI_FALLBACK_MODEL`). A daily neuron-quota failure, including HTTP 429, becomes `QuotaExceededError`. `/api/answer` and `/api/upload` return HTTP 429 and `code: "quota_exceeded"`. They do not try the fallback model in that case. The free allowance is 10,000 Neurons per day and resets at 00:00 UTC.

If `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN` is missing, the provider is the deterministic mock. `/api/limits` then reports `provider: "mock"`. `/ask` and `/api/answer` both use this provider. The app does not call Google.
