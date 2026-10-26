# CiteBot

**Ask a handbook. Get answers with citation chips.**

CiteBot is a small RAG demo: upload is mocked by a committed sample corpus, retrieval is embedding search, and every answer surfaces the passages it used. Built by [Jakob Alex](https://github.com/jakob-alexander2000) (Berlin) as a week-one technical proof — product taste over framework theater.

Live intent: prove retrieval + grounded generation in a clickable UI, not a multi-agent platform.

## 30-second demo script

1. `npm install && cp .env.example .env.local` — paste an OpenAI API key.
2. `npm run dev` → open http://localhost:3000
3. Click **“How many PTO days do full-time employees get?”**
4. Expand a citation chip — you should see `pto-and-leave.md` and the “30 days” passage.
5. Ask something off-corpus (“What’s our office dog’s name?”) — CiteBot should refuse cleanly.

First question triggers one-time ingest (embeddings cached under `.cache/`). Optional: `npm run ingest` beforehand.

## Architecture (short)

```
corpus/*.md  →  chunk  →  OpenAI embeddings (text-embedding-3-small)
                              ↓
                     local JSON vector cache (.cache/embeddings.json)
                              ↓
question → embed → cosine top-k → gpt-4o-mini answer + citation chips
```

- **App:** Next.js App Router, TypeScript, Tailwind
- **Retrieval:** in-memory / on-disk JSON store (no database required for the demo)
- **Generation:** single LLM call with numbered context; UI shows expandable source chips
- **Optional later:** Neon + pgvector for a production path (not wired in this scaffold)

No multi-agent frameworks. No billing. No multi-tenant.

## Run locally

```bash
npm install
cp .env.example .env.local   # set OPENAI_API_KEY
npm run ingest               # optional warm cache
npm run dev
```

| Script | What it does |
|--------|----------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build (does **not** call OpenAI) |
| `npm run start` | Serve the build |
| `npm run ingest` | Precompute embeddings into `.cache/` |
| `npm run lint` | ESLint |

### Env vars

| Name | Required | Notes |
|------|----------|--------|
| `OPENAI_API_KEY` | Yes (for chat) | Used for embeddings + chat completions |

## Sample corpus

Under `corpus/` — a fake Berlin studio handbook (“Nordlicht Labs”):

- Welcome & hybrid office
- PTO / sick / parental leave
- Tools & security
- Expenses
- Friday demo day

Swap the markdown files and re-run ingest (or delete `.cache/`) to point CiteBot at your own docs.

## Repo layout

```
app/            # App Router pages + /api/chat
components/     # Chat, CitationChip
lib/            # corpus loader, embeddings, vector store, rag
corpus/         # sample markdown docs
scripts/ingest.ts
```

## Production note (Neon / pgvector)

This scaffold prefers zero-infra so `npm run dev` works with only an API key. For a shared production index, store embeddings in Postgres (`pgvector` on Neon), ingest on deploy, and keep the same retrieve → answer → cite flow. The chat UI and citation shape do not need to change.

## License

MIT — demo content is fictional; not real HR policy.
