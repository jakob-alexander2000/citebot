# White-label CiteBot — client deploy (<30 min)

Same app, different brand + corpus. One Vercel project per client (`{slug}.vercel.app`).

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

Defaults without these = the CiteBot / Nordlicht demo.

## 3. Swap corpus

```bash
rm corpus/*.md corpus/*.pdf
# drop client .md / .pdf into corpus/
rm -rf .cache && npm run ingest
```

See [`corpus/README.md`](./corpus/README.md). Markdown and PDF both work; drop files into `corpus/` and re-ingest.

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

1. Open the live URL — header shows the client name + accent, not “CiteBot”.
2. Ask a question from their docs; citation chips + Evidence panel still work.
3. `/handbook` lists their markdown; `/harness` explains the verify loop.

Kept from the base product: Gemini RAG, verify harness, handbook browser.

## German QM sample

Short Arbeitsschutz/QM markdown lives in [`examples/de-qm-corpus/`](./examples/de-qm-corpus/). Use it for a second Vercel project (different `NEXT_PUBLIC_BRAND_*`, `CORPUS_DIR=examples/de-qm-corpus` or copy into `corpus/`).
