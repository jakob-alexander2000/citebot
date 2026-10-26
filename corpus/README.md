# Corpus

Drop **markdown** (`.md`) files here. CiteBot chunks them, embeds with Gemini, and answers only from this folder.

## Swap for a client

1. Delete the sample Nordlicht files (or keep them for local demos).
2. Add the client’s handbook as `.md` files (one topic per file works well).
3. Rebuild the index:

```bash
rm -rf .cache
npm run ingest   # needs GEMINI_API_KEY
```

On Vercel, the first chat after a corpus change rebuilds the index into `/tmp` automatically — still run `ingest` locally to smoke-test.

## Optional path

Set `CORPUS_DIR=some/other/folder` if you keep docs outside `/corpus`.

## PDF (next)

PDF ingest is intentionally not in this MVP. Convert PDFs → markdown for now (Pandoc, etc.), then drop them here.
