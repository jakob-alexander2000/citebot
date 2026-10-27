# CiteBot onboard path

How to run the config, guardrail, and handoff demo. The CiteBot skin stays English. This path does not add a language switch.

## Run

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` when you want the model to draft and verify. Without that key, `/ask` stays unavailable, and `/onboard` still runs the same loop over the enabled pages with a local passage check so the script can finish. `npm test` does not call a model.
3. Start the dev server with `NEXT_PUBLIC_BRAND_NAME=CiteBot npm run dev`.
4. Open `http://localhost:3000/onboard`.

The header shows CiteBot and no DE|EN control. Onboard is in the header only on this skin.

## What you click through

1. **Config.** Set a client label, a system prompt, which sample pages are on, and which handbook tools are on. The browser stores that in the session cookie `cb_onboard`. A preset in the query string replaces the cookie: `?preset=en`, `?preset=de-gap`, or `?preset=de-docs`.
2. **Ask.** The page posts to `/api/chat` with that config. The same agent loop runs, then the same verify step. Search stays inside the pages you enabled. A tool that is off is recorded and not executed.
3. **Guardrail.** The Evidence panel is the verify result. A banner says the check passed, the answer refused because the pages do not cover it, or do not hand the answer off.
4. **Handoff.** Download JSON or Markdown, or print the Markdown. The file lists sources, tool calls, verify pass/fail, and the time. Runs from the tab sit in `sessionStorage` until you clear them.

The script, in English and German, is at `/onboard/walkthrough`.

## Sample pages

English pages come from `examples/nordlicht-corpus`. German pages come from `examples/de-qm-corpus`. They are toggles for this demo. They do not replace the handbook used by `/ask`.

- `preset=en` and `preset=de-gap` enable the English pages. Use the second when you want the German retention question to be refused.
- `preset=de-docs` enables only the German pages. The retention question should then cite five years.

## What stays put

Without `NEXT_PUBLIC_BRAND_NAME=CiteBot`, the header does not link here. Opening `/onboard` on that deploy shows a short note and does not retarget `/ask`. A request that includes an onboard payload is ignored unless the skin is CiteBot. Verify, the three-tool cap, and the DE|EN product shell are unchanged.

## Checks

`npx tsc --noEmit` and `npm test`.
