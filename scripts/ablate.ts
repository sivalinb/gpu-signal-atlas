import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildFixedWindowCorpus, evaluateRetrieval } from '../core/ablation.ts';
import { corpus } from '../core/corpus.ts';
import { evaluationCases } from '../evaluation/cases.ts';

const retrieval = [
  evaluateRetrieval('BM25 only', evaluationCases, corpus, 'bm25'),
  evaluateRetrieval('Vector only', evaluationCases, corpus, 'vector'),
  evaluateRetrieval('Hybrid RRF', evaluationCases, corpus, 'hybrid'),
  evaluateRetrieval('Hybrid + contextual rerank', evaluationCases, corpus, 'hybrid-rerank'),
];
const fixedCorpus = buildFixedWindowCorpus(corpus);
const chunking = [
  evaluateRetrieval('Fixed 90-token source windows', evaluationCases, fixedCorpus, 'hybrid-rerank'),
  evaluateRetrieval('Structure-aware identifier records', evaluationCases, corpus, 'hybrid-rerank'),
];

function table(rows: typeof retrieval): string {
  return [
    '| Variant | Corpus records | Recall@5 | MRR |',
    '|---|---:|---:|---:|',
    ...rows.map((row) => `| ${row.name} | ${row.corpusRecords} | ${(row.recallAt5 * 100).toFixed(1)}% | ${row.mrr.toFixed(3)} |`),
  ].join('\n');
}

const report = `# Retrieval and Chunking Ablation Report

Generated with \`npm run ablate -- --write\` against the checked-in ${evaluationCases.length}-case expectation set.

## Retrieval strategy comparison

${table(retrieval)}

The comparison separates exact sparse matching, feature-hash vector similarity, reciprocal-rank fusion, and the final contextual boosts. Scores measure retrieval only; refusal and generation remain covered by the main evaluation.

## Chunking strategy comparison

${table(chunking)}

The fixed baseline concatenates records by source page, splits them into 90-token windows with 15-token overlap, and therefore permits multiple identifiers to share a chunk. The selected corpus keeps one Xid or metric concept per reviewed record with attached authority, evidence, and limitations.

## Interpretation

- BM25 is the strongest exact-identifier baseline.
- The local vector stage adds symptom-language recall but is intentionally weaker than a trained semantic model.
- RRF combines complementary ranks without mixing incomparable raw scores.
- Contextual exact-ID, model, and driver boosts improve ordering for telemetry-shaped input.
- Structure-aware records preserve citation precision and answer-field boundaries even when Recall@5 is similar on this small corpus.

These are regression results for a curated demonstration corpus, not generalized GPU-diagnostic accuracy.
`;

console.log(report);
if (process.argv.includes('--write')) {
  const output = fileURLToPath(new URL('../docs/ABLATION_REPORT.md', import.meta.url));
  await writeFile(output, report, 'utf8');
  console.log(`Wrote ${output}`);
}
