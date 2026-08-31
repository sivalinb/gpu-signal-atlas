import { performance } from 'node:perf_hooks';

import { corpus } from '../core/corpus.ts';
import { analyzeTelemetryFromRetrieval } from '../core/engine.ts';
import { getPineconeConfig, retrieveFromPinecone } from '../core/pinecone.ts';
import { evaluationCases } from '../evaluation/cases.ts';

const config = getPineconeConfig();
let retrievalHits = 0;
let reciprocalRankTotal = 0;
let expectedRetrievals = 0;
let trueRefusals = 0;
let predictedRefusals = 0;
let expectedRefusals = 0;
let validCitations = 0;
let citationCount = 0;
const latencies: number[] = [];
const failures: string[] = [];
const knownIds = new Set(corpus.map((document) => document.id));

for (const testCase of evaluationCases) {
  const started = performance.now();
  const { retrieval, vectorIndexVersion } = await retrieveFromPinecone(
    testCase.query,
    config,
    corpus,
    5,
  );
  const analysis = analyzeTelemetryFromRetrieval(testCase.query, retrieval, corpus, {
    vectorIndexVersion,
    retrievalBackend: 'pinecone',
    startedAt: started,
  });
  latencies.push(performance.now() - started);
  const retrievedIds = analysis.retrieval.map((result) => result.document.id);
  const refused = analysis.status === 'refused';

  if (testCase.shouldRefuse) {
    expectedRefusals += 1;
    if (refused) trueRefusals += 1;
  }
  if (refused) predictedRefusals += 1;

  for (const citation of analysis.citations) {
    citationCount += 1;
    if (knownIds.has(citation.id) && retrievedIds.includes(citation.id)) validCitations += 1;
  }

  for (const expectedId of testCase.expectedIds) {
    expectedRetrievals += 1;
    const rank = retrievedIds.indexOf(expectedId);
    if (rank >= 0) {
      retrievalHits += 1;
      reciprocalRankTotal += 1 / (rank + 1);
    } else {
      failures.push(`${testCase.id}: missing ${expectedId}; received ${retrievedIds.join(', ')}`);
    }
  }
  if (refused !== testCase.shouldRefuse) {
    failures.push(`${testCase.id}: refusal expected=${testCase.shouldRefuse} actual=${refused}`);
  }
}

const sortedLatency = [...latencies].sort((left, right) => left - right);
const percentile = (fraction: number) =>
  sortedLatency[Math.min(sortedLatency.length - 1, Math.floor(sortedLatency.length * fraction))];
const recallAt5 = expectedRetrievals ? retrievalHits / expectedRetrievals : 1;
const mrr = expectedRetrievals ? reciprocalRankTotal / expectedRetrievals : 1;
const refusalPrecision = predictedRefusals ? trueRefusals / predictedRefusals : 1;
const refusalRecall = expectedRefusals ? trueRefusals / expectedRefusals : 1;
const citationValidity = citationCount ? validCitations / citationCount : 1;

console.log('GPU Signal Atlas Pinecone evaluation');
console.log(`Index: ${config.indexName}/${config.namespace}`);
console.log(`Cases: ${evaluationCases.length}`);
console.log(`Recall@5: ${(recallAt5 * 100).toFixed(1)}%`);
console.log(`MRR: ${mrr.toFixed(3)}`);
console.log(`Citation validity: ${(citationValidity * 100).toFixed(1)}%`);
console.log(`Refusal precision: ${(refusalPrecision * 100).toFixed(1)}%`);
console.log(`Refusal recall: ${(refusalRecall * 100).toFixed(1)}%`);
console.log(`Latency p50: ${percentile(0.5).toFixed(2)} ms`);
console.log(`Latency p95: ${percentile(0.95).toFixed(2)} ms`);
console.log(`Failures: ${failures.length}`);
for (const failure of failures) console.log(`- ${failure}`);

if (failures.length > 0) process.exitCode = 1;
