# German sample corpus (Arbeitsschutz / QM)

Drop-in handbook for a second white-label demo (e.g. Vercel project `citebot-qm-demo`).

## Use

```bash
# from citebot root
rm -rf .cache
CORPUS_DIR=examples/de-qm-corpus npm run ingest
# or copy these .md files into corpus/ for a client deploy
```

Brand hint (Vercel env): see `../acme-handbook.env` — set
`NEXT_PUBLIC_BRAND_NAME=QM-Assistent`, `NEXT_PUBLIC_BRAND_ORG=Muster GmbH`,
`NEXT_PUBLIC_BRAND_CORPUS_LABEL=Arbeitsschutz-Handbuch`, accent `#0f766e`.

Second deploy: new Vercel project on the same repo, different env + either
`CORPUS_DIR=examples/de-qm-corpus` (if you keep this folder in the build) or
replace `corpus/` in a client branch/clone.
