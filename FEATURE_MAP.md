# CiteBot feature map

## Verify harness (shared path)

**What it does**  
After every answer, CiteBot runs one verify step against the *same* retrieved handbook chunks used for generation. The verifier splits the answer into atomic claims and labels each:

| Verdict | Meaning |
|---------|---------|
| `pass` | Claim is supported by a retrieved passage |
| `fail` | Claim contradicts a retrieved passage |
| `unsupported` | Claim is not backed by retrieved context |

A correct “not in the handbook” refusal counts as `pass` (the gap is real). Results surface in the **Evidence** panel under the citation pills — not a cosmetic score.

**Where it lives**

| Piece | Path |
|-------|------|
| Types | `lib/types.ts` (`EvidenceClaim`, `Verification`, `AgentStep`) |
| Agent loop | `lib/agent.ts` → `runAgentLoop()` (max 3 tool rounds) |
| Tools | `lib/tools.ts` — `search_handbook`, `list_topics`, `get_section`, `quote_check` |
| Verify logic | `lib/verify.ts` → `verifyAnswer()` |
| Wired after the draft | `lib/rag.ts` → `answerWithCitations()` |
| API | `app/api/chat/route.ts` (same route; response adds `steps`, `stoppedEarly`) |
| UI | `components/AgentSteps.tsx`, `components/EvidencePanel.tsx`, `Chat.tsx` |
| Fixture tests | `tests/` · `npm test` (no Gemini) |
| Writeup | `/harness` |

**How to drive**

1. Ask a handbook question on `/ask` (e.g. vacation days).
2. Expand a source pill — handbook passage still works.
3. Read the Evidence panel: claims + pass/fail/unsupported.

**How to verify**

1. Grounded: *“How many vacation days do full-time employees get?”* → expect `pass` on ~30 days with PTO evidence.
2. Trick: *“What’s our office dog’s name?”* → refuse / unsupported invented facts; no fake dog name marked `pass`.
3. `npm run build` must succeed.
4. Live: https://citebot-chi.vercel.app

## Agent loop

**What it does**  
Each question is plan → at most three corpus tools → draft → the verify harness above. The chat shows tool names and a one-line result. A further tool request stops with a clear message.

**How to verify**

1. `npm test` — fixture model, no `GEMINI_API_KEY`. Includes the 3-round cap and a repeated-call stop.
2. With a key: ask a PTO question and confirm **Steps** lists `search_handbook` (or a sibling tool) and the Evidence panel still shows pass / fail.
3. CI: `.github/workflows/ci.yml` plus [citebot-evals](https://github.com/jakob-alexander2000/citebot-evals) (`npm run eval`, 18/18).

## Intentionally not built

- Multi-agent “judge swarm”
- Web search or shell tools
- New product name / Electron desktop

## White-label (env brand + corpus)

**What it does**  
One codebase, many client deploys. `lib/brand.ts` reads `NEXT_PUBLIC_BRAND_*`; `CORPUS_DIR` / `corpus/*.md` swap the handbook. Gemini + verify harness + handbook UI stay.

**How to verify**

1. `NEXT_PUBLIC_BRAND_NAME=Acme Handbook NEXT_PUBLIC_BRAND_ACCENT=#1d4ed8 npm run build && npm run start` — header/hero show Acme + blue accent.
2. Replace `corpus/*.md`, `rm -rf .cache`, ask a question from the new docs.
3. See [WHITE_LABEL.md](./WHITE_LABEL.md).

## PDF ingest

**What it does**  
`corpus/*.pdf` is extracted via `unpdf` → plain text → same chunk/embed path as markdown (`lib/corpus.ts`, `lib/pdf.ts`). Handbook browser shows a PDF badge + extracted text.

**How to verify**

1. `corpus/remote-work-policy.pdf` is present (or `node scripts/make-sample-pdf.mjs`).
2. `rm -rf .cache && npm run ingest` — logs chunks including `remote-work-policy-*`.
3. Ask: *“How many remote days per week?”* → cite the PDF; `/handbook` lists it.
4. `npm run build` must succeed.
