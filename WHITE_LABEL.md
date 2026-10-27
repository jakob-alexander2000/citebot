# Client deploy

Same app, different brand and corpus. One project per client.

## 1. Clone (or fork)

```bash
git clone https://github.com/jakob-alexander2000/citebot.git acme-handbook
cd acme-handbook
npm install
```

## 2. Brand via env

Copy [`examples/acme-handbook.env`](./examples/acme-handbook.env) → `.env.local`, or set the same keys in the Vercel project.

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_BRAND_NAME` | `Acme Handbook` |
| `NEXT_PUBLIC_BRAND_ORG` | `Acme GmbH` |
| `NEXT_PUBLIC_BRAND_ACCENT` | `#1d4ed8` |
| `NEXT_PUBLIC_BRAND_INITIAL` | `A` |
| `NEXT_PUBLIC_BRAND_TAGLINE` / `_2` | Hero lines |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | `/logo.png` (file in `public/`) |
| `GEMINI_API_KEY` | Google AI Studio key |

Defaults without these = Grounded Docs and the Hartmann Fertigung QM handbook. Tagline, corpus label, footer, and description follow the DE/EN switch unless you set them here (a set value is used for both languages).

## 3. Swap corpus

```bash
# bilingual: replace corpus/de and corpus/en
# single language for both toggles: put files in corpus/ (not inside de/ or en/)
rm -rf .cache && npm run ingest
```

See [`corpus/README.md`](./corpus/README.md). Files in `de/` and `en/` are retrieved only for that language. Files in the corpus root are included for both. Markdown and PDF both work.

## 4. Deploy on Vercel

```bash
npx vercel link          # create new project, e.g. acme-handbook
npx vercel env add GEMINI_API_KEY
# add NEXT_PUBLIC_BRAND_* the same way (Production + Preview)
npx vercel --prod
```

Or: Vercel Dashboard → **Add New Project** → import this repo → set env → Deploy.  
URL: `https://{project-slug}.vercel.app`.

**Tip:** reuse one GitHub repo for many clients — each Vercel project has its own env. For different corpora per client, either (a) separate branches/folders + `CORPUS_DIR`, or (b) one repo clone per client with its own `corpus/`.

## 5. Verify

1. Open the live URL — the header shows the client name and accent.
2. Switch DE/EN. Ask a question from their docs; citation chips and the Evidence panel follow that language.
3. `/handbook` lists the documents for the active language. `/harness` explains the verify loop.

Kept: Gemini chat with OpenAI fallback, verify harness, handbook browser.

## Sample corpora

The product handbook is [`corpus/de`](./corpus/de) and [`corpus/en`](./corpus/en). A shorter German sketch remains in [`examples/de-qm-corpus/`](./examples/de-qm-corpus/) if you point `CORPUS_DIR` at a single small folder.
