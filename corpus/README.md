# Corpus

Drop **markdown** (`.md`) and **PDF** (`.pdf`) files here. CiteBot chunks them, embeds with Gemini, and answers only from this folder.

## Swap for a client

1. Delete the sample Nordlicht files (or keep them for local demos).
2. Add the client’s handbook as `.md` and/or `.pdf` (one topic per file works well).
3. Rebuild the index:

```bash
rm -rf .cache
npm run ingest   # needs GEMINI_API_KEY
```

On Vercel, the first chat after a corpus change rebuilds the index into `/tmp` automatically — still run `ingest` locally to smoke-test.

## PDF

PDFs are extracted with [`unpdf`](https://github.com/unjs/unpdf) (PDF.js serverless build) at ingest/runtime, then chunked like markdown. Scanned/image-only PDFs will yield little or no text — convert those to markdown first.

Sample: `remote-work-policy.pdf` (regenerate with `node scripts/make-sample-pdf.mjs`).

## Optional path

Set `CORPUS_DIR=some/other/folder` if you keep docs outside `/corpus`.
