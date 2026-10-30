# CiteBot feature map

## Verify harness

After every answer, CiteBot runs one verify step against the same retrieved handbook passages used for the draft. The verifier splits the answer into claims:

| Verdict | Meaning |
|---------|---------|
| `pass` | Claim is supported by a retrieved passage |
| `fail` | Claim contradicts a retrieved passage |
| `unsupported` | Claim is not backed by retrieved context |

A correct “not in the handbook” refusal counts as `pass`. Results show in the Evidence panel.

| Piece | Path |
|-------|------|
| Types | `lib/types.ts` |
| Agent loop | `lib/agent.ts` (`runAgentLoop`, max 3 tool rounds) |
| Tools | `lib/tools.ts` — `search_handbook`, `list_topics`, `get_section`, `quote_check` |
| Verify | `lib/verify.ts` |
| Wired after the draft | `lib/rag.ts` |
| API | `app/api/chat/route.ts` |
| UI | `components/EvidencePanel.tsx`, `components/AgentSteps.tsx`, `components/Chat.tsx` |
| Write-up | `/harness` |

`npm test` and `npm run build` cover the loop without a live API key.

## Agent loop

Each question is plan → at most three handbook tools → draft → verify. A further tool request, or the same call twice, stops with a clear message.

## Eval harness

`npm run eval` runs the agent loop on eight English handbook questions (`evals/golden.json`) and scores each draft with verify. Supported cases must come back with summary `grounded` and no `fail` or `unsupported` claim. The gap case must refuse, and that refusal must be `pass`. The wrong-count case is a fixed “25 days” draft; it passes only when verify returns `fail`. No API key. The write-up is `/evals`.

Continuous integration (`.github/workflows/ci.yml`) runs `npm test`, `npm run eval`, and `npm run build`, plus the sibling citebot-evals fixture scorecard.

## Not in this repo

- A second product brand or a language switch
- Web search or shell tools
- Billing or multi-tenant login
