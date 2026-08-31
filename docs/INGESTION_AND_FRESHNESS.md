# Ingestion and Freshness Workflow

GPU Signal Atlas implements the documented source-control workflow rather than treating ingestion as an architecture-only proposal.

## Safety boundary

Only URLs in `ingestion/source-manifest.ts` are eligible. A fetch creates a candidate snapshot; it never edits the curated corpus automatically. A maintainer must review semantic, applicability, and action changes before updating a record.

## Create a candidate snapshot

Fetch an allow-listed source:

```bash
npm run ingest -- --source nvidia-xid-catalog --fetch
```

Or process a previously downloaded HTML file without network access:

```bash
npm run ingest -- \
  --source nvidia-xid-catalog \
  --input ./source-page.html \
  --output ./ingestion/snapshots/xid-candidate.json
```

The workflow strips scripts, styles, navigation, forms, and repeated page chrome; decodes entities; preserves headings, table values, identifiers, and code; and records a deterministic cleaned-content fingerprint plus available ETag and Last-Modified headers.

## Review and publish a corpus change

1. Compare the candidate fingerprint and text with the last reviewed source.
2. Inspect any change to identifier meaning, GPU or driver applicability, units, evidence steps, and limitations.
3. Update the affected structured records in `core/corpus.ts`.
4. Set the reviewed retrieval date and provenance.
5. Rebuild the persistent vector index with `npm run index:build`.
6. Run `npm run freshness`, `npm test`, `npm run evaluate`, and `npm run ablate`.
7. Require human review before merging.

## Freshness gate

```bash
npm run freshness
```

Official sources use a seven-day review SLA; internal demonstration runbooks use 30 days. The gate validates source allow-list membership, curated-content fingerprints, source coverage, HTTPS URLs, and review age. CI fails when a source is missing, stale, or changed without regenerating its fingerprint.

This workflow detects documentation changes. It does not claim that a changed vendor page is safe to ingest without domain review.
