# CiteBot

**Ask a handbook. Get answers with citation chips.**

CiteBot is a small RAG demo: upload is mocked by a committed sample corpus, retrieval is embedding search, and every answer surfaces the passages it used. Built by [Jakob Alex](https://github.com/jakob-alexander2000) (Berlin).

Live: [citebot-chi.vercel.app](https://citebot-chi.vercel.app)

**White-label:** same codebase ships as a client handbook bot via env brand + corpus swap. See [WHITE_LABEL.md](./WHITE_LABEL.md) (&lt;30 min Vercel deploy).

## Verify harness

After each answer, CiteBot runs a shared verify step (`lib/verify.ts`) that checks claims against the handbook passages the agent tools returned, and shows an **Evidence** panel (pass / fail / unsupported). See [FEATURE_MAP.md](./FEATURE_MAP.md) and the public writeup at [/harness](https://citebot-chi.vercel.app/harness).

**Try:** ask about PTO days (expect passes) then “What’s our office dog’s name?” (expect refusal / unsupported — not a fake grounded answer).

## 30-second demo script

1. `npm install && cp .env.example .env.local` — paste a **Google AI Studio** API key ([get one](https://aistudio.google.com/apikey)).
2. `npm run dev` → open http://localhost:3000/ask
3. Click **“How many PTO days do full-time employees get?”**
4. Expand a citation chip — you should see `pto-and-leave.md` and the “30 days” passage.
5. Ask something off-corpus (“What’s our office dog’s name?”) — CiteBot should refuse cleanly; the Evidence panel should not mark a dog name as pass.
6. Open [/harness](https://citebot-chi.vercel.app/harness) for how verify works.

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

- Uses **Gemini Flash** (default `gemini-2.5-flash`) + `gemini-embedding-001` for retrieval — cheap enough for a pilot demo; AI Studio free tier usually covers light traffic.
- Put `GEMINI_API_KEY` in `.env.local` or Vercel Environment Variables (server-only). **Never commit keys.** Prefer a dedicated AI Studio key with a spend alert if billing is enabled.
- **Optional dual provider:** set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`) so agent + verify steps automatically fall back when Gemini returns overload errors (503/429) or the chat model is missing. Embeddings stay Gemini-only; if `OPENAI_API_KEY` is absent, fallback is skipped and the server logs a warning.
- Override chat/embed models with `GEMINI_CHAT_MODEL` / `GEMINI_EMBEDDING_MODEL` if needed.
- Do not prefix API keys with `NEXT_PUBLIC_` — they must stay on the server (`/api/chat`). Brand vars *are* `NEXT_PUBLIC_` (not secrets).

## Agent loop

`POST /api/chat` runs one capped loop (`lib/agent.ts`), then the existing verifier:

1. **Plan** — the model returns a single JSON action (a tool call, or an answer once it has passages).
2. **Tools** — at most **3** calls, handbook only:
   - `search_handbook` — embedding search over the corpus (the same retriever as before)
   - `list_topics` — document titles and section names
   - `get_section` — one section by id, file, or title
   - `quote_check` — whether a claimed quote appears in the text
3. **Draft** — a short answer from those passages. If the model answers before any lookup, the loop runs `search_handbook` on the question first.
4. **Verify** — `verifyAnswer` scores claims against the passages the tools returned.

The chat shows a quiet **Steps** list (tool name + one-line result). The Evidence panel stays the pass / fail surface. A fourth tool request, or the same call twice, does not run. If the model still will not answer, the loop stops with a clear message instead of spinning.

No web search. No shell. No multi-agent framework.

## Architecture (short)

```
corpus/*.md  →  chunk  →  Gemini embeddings (gemini-embedding-001)
                              ↓
                     local JSON vector cache (.cache/embeddings-gemini-v2.json)
                              ↓
question → plan → up to 3 handbook tools → draft
                              ↓
                     verifyAnswer(claims vs those passages)
                              ↓
                     answer + citations + evidence + steps
```

- **App:** Next.js App Router, TypeScript, Tailwind
- **Brand:** `lib/brand.ts` ← env
- **Retrieval:** in-memory / on-disk JSON store (no database required for the demo)
- **Agent:** `lib/agent.ts` + `lib/tools.ts`; production model and search are injected from `lib/rag.ts`
- **Verify:** `lib/verify.ts`; UI shows steps, source chips, and the Evidence panel

No billing UI. No multi-tenant runtime (one Vercel project ≈ one client).

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
| `npm test` / `npm run test:ci` | Fixture tests for tools, the agent loop, and verify — no API key |

### Env vars

| Name | Required | Notes |
|------|----------|--------|
| `GEMINI_API_KEY` | Yes (for chat) | Google AI Studio — embeddings + chat. Not used by `npm test` |
| `NEXT_PUBLIC_BRAND_*` | No | White-label UI (see `.env.example`) |
| `CORPUS_DIR` | No | Default `corpus` |

## Sample corpus

Under `corpus/` — a fake Berlin studio handbook (“Nordlicht Labs”). Swap the markdown files and re-run ingest (or delete `.cache/`) to point the app at client docs. Details: [`corpus/README.md`](./corpus/README.md).

## Tests and CI

`npm test` and `npm run test:ci` run the same Node test files. They mock the model with recorded turns in `tests/fixtures/` and call the real handbook tools (lexical search stand-in, plus the committed corpus). Nothing in that path calls Gemini.

| File | What it locks |
|------|----------------|
| `tests/verify.test.ts` | Claim parsing and grounded / mixed / ungrounded |
| `tests/tools.test.ts` | `search_handbook`, `list_topics`, `get_section`, `quote_check` |
| `tests/agent-loop.test.ts` | Trace, the 3-round cap, repeated calls, verify handoff |
| `tests/fixtures/` | Scripted model turns and verifier JSON |

GitHub Actions (`.github/workflows/ci.yml`) runs those tests, `npm run build`, and the companion scorecard [citebot-evals](https://github.com/jakob-alexander2000/citebot-evals). That job checks out both repos and runs `npm run eval` in citebot-evals (fixture provider, 18/18, no live model). The companion suite is still the product-level grounded-vs-refusal table; this repo’s tests cover the agent loop itself.

## Repo layout

```
app/            # App Router pages + /api/chat
components/     # Chat, steps, citations, evidence, handbook
lib/            # agent loop, tools, rag, verify, retrieval
corpus/         # markdown docs (swap per client)
tests/          # fixture tests (no Gemini)
.github/        # CI: unit fixtures, build, citebot-evals
examples/       # sample client env (Acme)
scripts/ingest.ts
WHITE_LABEL.md  # <30 min client deploy
```

## License

MIT — demo content is fictional; not real HR policy.
