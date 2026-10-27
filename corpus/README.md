# Quality handbook

Grounded Docs answers from this folder.

| Folder | Language |
|--------|----------|
| `de/` | German chapters |
| `en/` | English chapters, parallel to `de/` |

A file in `de/` is retrieved only when the active language is German. A file in `en/` only when it is English. A markdown or PDF file placed directly in `corpus/` is language-neutral and is included for both.

`README.md` is not ingested.

## Reindex

```bash
rm -rf .cache
npm run ingest   # needs GEMINI_API_KEY
```

On a serverless host, the first chat after a corpus change rebuilds the index into `/tmp`.

## PDF

PDFs are extracted with `unpdf` at ingest and at runtime, then chunked like markdown. Image-only scans yield little text.

## Another corpus

Set `CORPUS_DIR` to a folder relative to the project root. See [WHITE_LABEL.md](../WHITE_LABEL.md).

The previous English sample lives in `examples/nordlicht-corpus` and is not part of the product index.
