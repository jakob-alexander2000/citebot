# CiteBot

**Ask a handbook. Get answers with citation chips.**

CiteBot is a small RAG demo: upload is mocked by a committed sample corpus, retrieval is embedding search, and every answer surfaces the passages it used. Built by [Jakob Alex](https://github.com/jakob-alexander2000) (Berlin) as a week-one technical proof — product taste over framework theater.

Live: [citebot-chi.vercel.app](https://citebot-chi.vercel.app)

**White-label:** same codebase ships as a client handbook bot via env brand + corpus swap. See [WHITE_LABEL.md](./WHITE_LABEL.md) (&lt;30 min Vercel deploy).

## Verify harness

After each answer, CiteBot runs a shared verify step (`lib/verify.ts`) that checks claims against retrieved handbook chunks and shows an **Evidence** panel (pass / fail / unsupported). See [FEATURE_MAP.md](./FEATURE_MAP.md) and the public writeup at [/harness](https://citebot-chi.vercel.app/harness).

**Try:** ask about PTO days (expect passes) then “What’s our office dog’s name?” (expect refusal / unsupported — not a fake grounded answer).

## 30-second demo script

1. `npm install && cp .env.example .env.local` — paste a **Google AI Studio** API key ([get one](https://aistudio.google.com/apikey)).
2. `npm run dev` → open http://localhost:3000
3. Click **“How many PTO days do full-time employees get?”**
4. Expand a citation chip — you should see `pto-and-leave.md` and the “30 days” passage.
5. Ask something off-corpus (“What’s our office dog’s name?”) — CiteBot should refuse cleanly; the Evidence panel should not mark a dog name as pass.
6. Open [/harness](https://citebot-chi.vercel.app/harness) for the hiring-manager writeup.

First question triggers one-time ingest (embeddings cached under `.cache/`). Optional: `npm run ingest` beforehand.

## White-label (Mittelstand offer MVP)

Configure brand + corpus without forking logic:

| What | How |
|------|-----|
| Name, tagline, accent, logo | `NEXT_PUBLIC_BRAND_*` env (see `.env.example`) |
| Org / corpus label | `NEXT_PUBLIC_BRAND_ORG`, `NEXT_PUBLIC_BRAND_CORPUS_LABEL` |
| Docs | Drop `.md` into `corpus/` (or set `CORPUS_DIR`) → `rm -rf .cache && npm run ingest` |
| Client URL | New Vercel project → `{slug}.vercel.app` |

Example env: [`examples/acme-handbook.env`](./examples/acme-handbook.env). Full steps: [WHITE_LABEL.md](./WHITE_LABEL.md). PDF ingest ships in-repo (`unpdf`); German sample corpus is the next client demo.

## Cost / keys

- Uses **Gemini Flash** + `gemini-embedding-001` — cheap enough for a portfolio / pilot demo; AI Studio free tier usually covers light traffic.
- Put `GEMINI_API_KEY` only in `.env.local` or Vercel Environment Variables (server-only). **Never commit keys.** Prefer a dedicated AI Studio key with a spend alert if billing is enabled.
- Do not prefix the API key with `NEXT_PUBLIC_` — it must stay on the server (`/api/chat`). Brand vars *are* `NEXT_PUBLIC_` (not secrets).

## Architecture (short)

```
corpus/*.md  →  chunk  →  Gemini embeddings (gemini-embedding-001)
                              ↓
                     local JSON vector cache (.cache/embeddings-gemini-v2.json)
                              ↓
question → embed → cosine top-k → Gemini answer + citation chips
                              ↓
                     verifyAnswer(claims vs chunks) → evidence panel
```

- **App:** Next.js App Router, TypeScript, Tailwind
- **Brand:** `lib/brand.ts` ← env
- **Retrieval:** in-memory / on-disk JSON store (no database required for the demo)
- **Generation + verify:** single shared path; UI shows expandable source chips + Evidence panel

No multi-agent frameworks. No billing UI. No multi-tenant runtime (one Vercel project ≈ one client).

## Run locally

```bash
npm install
cp .env.example .env.local   # set GEMINI_API_KEY (+ optional brand)
npm run ingest               # optional warm cache
npm run dev
```

| Script | What it does |
|--------|----------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build (does **not** call Gemini) |
| `npm run start` | Serve the build |
| `npm run ingest` | Precompute embeddings into `.cache/` |
| `npm run lint` | ESLint |

### Env vars

| Name | Required | Notes |
|------|----------|--------|
| `GEMINI_API_KEY` | Yes (for chat) | Google AI Studio — embeddings + chat |
| `NEXT_PUBLIC_BRAND_*` | No | White-label UI (see `.env.example`) |
| `CORPUS_DIR` | No | Default `corpus` |

## Sample corpus

Under `corpus/` — a fake Berlin studio handbook (“Nordlicht Labs”). Swap the markdown files and re-run ingest (or delete `.cache/`) to point the app at client docs. Details: [`corpus/README.md`](./corpus/README.md).

## Repo layout

```
app/            # App Router pages + /api/chat
components/     # Chat, citations, evidence, handbook
lib/            # brand, corpus, embeddings, vector store, rag, verify
corpus/         # markdown docs (swap per client)
examples/       # sample client env (Acme)
scripts/ingest.ts
WHITE_LABEL.md  # <30 min client deploy
```

## License

MIT — demo content is fictional; not real HR policy.
