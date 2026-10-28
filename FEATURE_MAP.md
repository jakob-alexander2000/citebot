# Grounded Docs feature map

## Verify harness (shared path)

**What it does**  
After every answer, Grounded Docs runs one verify step against the *same* retrieved handbook chunks used for generation. The verifier splits the answer into atomic claims and labels each:

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

1. Open `/ask` and set DE or EN.
2. Ask a question from [docs/demo-questions.md](./docs/demo-questions.md).
3. Expand a source pill — the passage is from `corpus/de` or `corpus/en`.
4. Read the Evidence panel in that language.

**How to verify**

1. Grounded: the customer-complaint question → expect `pass` on 8 ppm and the 12-month window.
2. Gap: ask for the quality representative’s first name → a refusal should pass; an invented name must not.
3. `npm test` and `npm run build` must succeed.

## Agent loop

**What it does**  
Each question is plan → at most three corpus tools → draft → the verify harness above. The chat shows tool names and a one-line result. A further tool request stops with a clear message.

**How to verify**

1. `npm test` — fixture model, no `GEMINI_API_KEY`. Includes the 3-round cap, a repeated-call stop, and the DE/EN corpus split.
2. With a key: ask a demo question and confirm **Steps** lists `search_handbook` (or a sibling tool) and the Evidence panel shows pass / fail in the active language.
3. CI: `.github/workflows/ci.yml` runs `npm test`, `npm run eval`, and `npm run build`. A sibling citebot-evals job still replays saved replies.

## CiteBot eval harness

**What it does**  
`npm run eval` runs the agent loop on eight English handbook questions (`evals/golden.json`) and scores each draft with verify. Grounded cases must come back `grounded` with no `fail` or `unsupported` claim. The gap case must refuse, and that refusal must be `pass`. The wrong-count case is a fixed “25 days” draft; it passes the suite only when verify returns `fail`. No API key. The public write-up is `/evals`, linked from the CiteBot header beside Harness. Grounded Docs does not show that link.

**How to verify**

1. `npm run eval` prints `Score: 8/8 (100%)`.
2. `NEXT_PUBLIC_BRAND_NAME=CiteBot npm run dev` — the header has Evals next to Harness, and `/evals` lists the questions and the failure modes.
3. Without that name, the header has no Evals link. `/evals` is a one-line boundary, not the scorecard.

## CiteBot onboard path

**What it does**  
On the CiteBot skin, `/onboard` is a short client setup: which sample pages and handbook tools are on, a system prompt, then the same ask loop and verify step. A banner shows a passed check, a refusal, or a failed check. The handoff download lists sources, tool calls, verify, and the time. `/onboard/walkthrough` is an English page with an English script and a German script. How to run it: [docs/onboard.md](./docs/onboard.md).

**How to verify**

1. `NEXT_PUBLIC_BRAND_NAME=CiteBot npm run dev` and open `/onboard`. The header has Onboard and no DE|EN switch.
2. Without that name, the header does not link to Onboard, and `/ask` is unchanged.
3. `npm test` covers the cookie, the tool filter, the guardrail label, and the handoff file.

## Intentionally not built

- Multi-agent “judge swarm”
- Web search or shell tools
- Billing, multi-tenant auth, or a desktop app

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

1. `examples/nordlicht-corpus/remote-work-policy.pdf` is present (or `node scripts/make-sample-pdf.mjs`).
2. Point `CORPUS_DIR` at that folder, then `rm -rf .cache && npm run ingest`.
3. `npm run build` must succeed. The product handbook itself is markdown under `corpus/de` and `corpus/en`.
