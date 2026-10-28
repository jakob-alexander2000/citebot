# Grounded Docs

**Ask a quality handbook. Get the source.**

Grounded Docs is a bilingual Q&A product for a Mittelstand quality handbook. Visitors ask in German or English, the answer cites the handbook in that language, and an Evidence panel checks each claim against those passages.

The beachhead corpus is a fictional QM handbook for **Hartmann Fertigung GmbH** (quality policy, document control, CAPA, suppliers). It is sample content, not a certified management system.

## Language

The header switch is **DE | EN** on Grounded Docs. A deploy branded CiteBot is English-only and hides the switch. Any other brand name is English-only until `NEXT_PUBLIC_BILINGUAL=true`.

- First visit: `Accept-Language` (the same preference as `navigator.languages`).
- After a choice: the `gd_locale` cookie, mirrored to `localStorage`, so a reload stays on that language.
- UI chrome, topic chips, the model prompt, the answer, and the Evidence narrative follow the active language.

## CiteBot onboard path

With `NEXT_PUBLIC_BRAND_NAME=CiteBot`, open `/onboard`. Set the sample pages and tools, ask, read the verify banner, and download a handoff. The English and German script is at `/onboard/walkthrough`. How to run it: [docs/onboard.md](./docs/onboard.md).

That header link is only on the CiteBot skin. The Grounded Docs DE|EN shell is unchanged, and `/ask` still uses the handbook for the deploy.

## Demo questions

Six screenshot questions (3 DE, 3 EN) are in [docs/demo-questions.md](./docs/demo-questions.md). They are also the chips on `/ask`.

## Verify harness

After each answer, a shared verify step (`lib/verify.ts`) checks claims against the handbook passages the agent tools returned and shows an **Evidence** panel (pass / fail / unsupported). The technical write-up is at [/harness](/harness). See [FEATURE_MAP.md](./FEATURE_MAP.md).

## CiteBot eval harness

The English handbook demo scores a fixed question set.

`npm run eval` runs the agent loop on `evals/golden.json` against `examples/nordlicht-corpus`, then scores each draft with the verify tokens `pass`, `fail`, and `unsupported`. No API key. CI runs that command on every pull request.

A case **passes** when every check holds: the answer states the handbook fact, the citation is the file that contains it, and the verify summary matches the case. A correct “the pages do not cover this” refusal is a pass. One case is a bad draft on purpose (25 vacation days against a page that says 30). That case passes only when verify marks the figure **fail**.

A case **fails** when any check misses. The usual shapes:

| Check | What you see |
|-------|----------------|
| `answer-includes` | The draft never states the required figure. |
| `citation-source` | The chips cite a different file. |
| `answer-excludes` | The draft repeats a false premise or an invented name. |
| `refusal` | A gap question gets a specific story instead of a refusal. |
| `verification-summary` | Verify’s summary is not the one the case allows. A grounded question came back mixed or ungrounded, or the wrong-count draft was marked pass. |
| `loop-finished` | The loop stopped before a draft, or the search never ran. |

The same write-up is the CiteBot page at `/evals`, linked beside Harness. Grounded Docs does not add that link. The workflow still runs the sibling [citebot-evals](https://github.com/jakob-alexander2000/citebot-evals) fixture scorecard, which replays saved replies rather than the agent loop.

## Events

`POST /api/events` records page views (home, ask, harness, handbook, growth), chip clicks, submits, and verify counts. The question itself is not stored: an 8-character hash and a character count. CiteBot runs one chip-order experiment on `/ask` (`cb_chip_order`). Grounded Docs does not. The write-up, including how to read the tally, is at [/growth](/growth). Optional forward: `ANALYTICS_URL`, `PLAUSIBLE_DOMAIN`, `VERCEL_ANALYTICS_URL`.

## Run locally

1. `npm install && cp .env.example .env.local` — paste a **Google AI Studio** API key ([get one](https://aistudio.google.com/apikey)). Optional: `OPENAI_API_KEY` for the chat fallback.
2. `npm run dev` → open http://localhost:3000
3. Set **DE** or **EN**, open **Ask**, and click a demo question.
4. Expand a citation chip — the passage should be from `corpus/de` or `corpus/en`.
5. Read the Evidence panel in the same language.

The first question builds the embedding index (cached under `.cache/`). Optional: `npm run ingest` beforehand.

## Client deploy

Brand and corpus can change without forking the loop. Steps: [WHITE_LABEL.md](./WHITE_LABEL.md).

| What | How |
|------|-----|
| Name, accent, logo | `NEXT_PUBLIC_BRAND_*` (see `.env.example`) |
| Copy left unset | Follows DE / EN |
| Docs | `corpus/de` and `corpus/en`, or language-neutral files in `corpus/` |
| Reindex | `rm -rf .cache && npm run ingest` |

## Keys

- Chat default is **Gemini 2.5 Flash** (`gemini-2.5-flash`). Retrieval embeddings stay on `gemini-embedding-001`.
- Put `GEMINI_API_KEY` in `.env.local` or the host’s environment. **Never commit keys.**
- Optional: `OPENAI_API_KEY` (model `OPENAI_MODEL`, default `gpt-4o-mini`). Agent and verify fall back to OpenAI when Gemini is overloaded (503/429) or the chat model is missing. Embeddings stay on Gemini. If the OpenAI key is absent, fallback is skipped.
- Override models with `GEMINI_CHAT_MODEL` and `GEMINI_EMBEDDING_MODEL`.
- Do not prefix API keys with `NEXT_PUBLIC_`.

## Agent loop

`POST /api/chat` runs one capped loop (`lib/agent.ts`), then the verifier. The request body may include `locale: "de" | "en"`.

1. **Plan** — the model returns one JSON action (a tool call, or an answer once it has passages).
2. **Tools** — at most **3** calls, handbook only, in the active language:
   - `search_handbook`
   - `list_topics`
   - `get_section`
   - `quote_check`
3. **Draft** — a short answer from those passages. If the model answers before any lookup, the loop searches the question first.
4. **Verify** — `verifyAnswer` scores claims against the passages the tools returned. Claim text and evidence notes are in the active language. Verdict tokens stay `pass`, `fail`, and `unsupported`.

No web search. No shell. No multi-agent framework. No billing and no multi-tenant login in this track.

## Architecture

```
corpus/{de,en}/*.md  →  chunk (tagged by language)  →  Gemini embeddings
                                              ↓
                              .cache/embeddings-gemini-v2.json
                                              ↓
question + locale → plan → up to 3 handbook tools → draft
                                              ↓
                              verifyAnswer (same passages)
                                              ↓
                         answer + citations + evidence + steps
```

- **App:** Next.js App Router, TypeScript, Tailwind
- **Brand:** `lib/brand.ts` ← env, with DE/EN defaults
- **Retrieval:** JSON vector cache. `retrieve` drops the other language before ranking.
- **Agent:** `lib/agent.ts` + `lib/tools.ts`, wired in `lib/rag.ts` (Gemini, then OpenAI fallback)
- **Verify:** `lib/verify.ts`

## Scripts

```bash
npm install
cp .env.example .env.local
npm run dev
```

| Script | What it does |
|--------|----------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build (does not call Gemini) |
| `npm run start` | Serve the build |
| `npm run ingest` | Precompute embeddings into `.cache/` |
| `npm run lint` | ESLint |
| `npm run eval` | Golden-question scorecard — agent loop + verify, no API key |
| `npm test` / `npm run test:ci` | Fixture tests, including the scorecard — no API key |

| Env | Required | Notes |
|-----|----------|--------|
| `GEMINI_API_KEY` | Yes, for chat | Not used by `npm test` |
| `OPENAI_API_KEY` | No | Chat/verify fallback only |
| `NEXT_PUBLIC_BRAND_*` | No | Overrides the Grounded Docs defaults |
| `CORPUS_DIR` | No | Default `corpus` |
| `ANALYTICS_URL` | No | Forwards each event as JSON. The first-party log works without it |
| `PLAUSIBLE_DOMAIN` | No | Optional Plausible custom event |
| `VERCEL_ANALYTICS_URL` | No | Optional extra JSON POST. No analytics package is bundled |

## Corpus

| Path | Role |
|------|------|
| `corpus/de`, `corpus/en` | Product handbook. Parallel chapters. |
| `corpus/*.md` at the root | Language-neutral. Included for both DE and EN. The product ships none here. |
| `examples/nordlicht-corpus` | Older English sample, used only by fixture tests. |
| `examples/de-qm-corpus` | Short earlier German sketch. The product corpus replaces it. |

Details: [`corpus/README.md`](./corpus/README.md).

## Tests

`npm test` mocks the model with recorded turns and calls the real handbook tools. Nothing in that path calls Gemini or OpenAI.

| File | What it locks |
|------|----------------|
| `tests/verify.test.ts` | Claim parsing and grounded / mixed / ungrounded |
| `tests/tools.test.ts` | Handbook tools, including `examples/nordlicht-corpus` |
| `tests/agent-loop.test.ts` | Trace, the 3-round cap, repeated calls, verify handoff |
| `tests/locale.test.ts` | Accept-Language and cookie override |
| `tests/qm.test.ts` | DE/EN corpus split, German prompt, demo-question doc |
| `tests/fixtures/qm-claims.json` | German and English verifier claims |
| `tests/llm.test.ts` | Gemini retry / OpenAI fallback classification |
| `tests/analytics.test.ts` | Event schema, chip-order assignment, JSONL log |
| `tests/onboard.test.ts` | Onboard config, tool filter, guardrail, handoff |
| `tests/eval-harness.test.ts` | Golden set, verify fail on a wrong figure, CiteBot-only eval link |

GitHub Actions (`.github/workflows/ci.yml`) runs those tests, `npm run eval`, and `npm run build`. It also runs the sibling [citebot-evals](https://github.com/jakob-alexander2000/citebot-evals) fixture scorecard.

## Layout

```
app/                 # home, /ask, /handbook, /harness, /evals, /onboard, /growth, /api/chat, /api/events
components/          # chat, language switch, evidence, handbook
lib/                 # locale, agent loop, tools, rag, verify
corpus/de corpus/en  # QM handbook
docs/demo-questions.md
evals/golden.json
tests/
WHITE_LABEL.md
```

## License

MIT. The Hartmann handbook is fictional.
