import assert from 'node:assert/strict';
import test from 'node:test';

import { corpus } from '../core/corpus.ts';
import { analyzeTelemetry, cosine, embed, extractSignals, retrieve, tokenize } from '../core/engine.ts';
import { evaluationCases } from '../evaluation/cases.ts';

test('tokenizer preserves exact telemetry identifiers', () => {
  assert.ok(tokenize('DCGM_FI_DEV_GPU_TEMP Xid 79').includes('dcgm_fi_dev_gpu_temp'));
});

test('feature-hash embeddings are deterministic and normalized', () => {
  const first = embed('GPU has fallen off the bus');
  const second = embed('GPU has fallen off the bus');
  assert.deepEqual(first, second);
  assert.ok(Math.abs(cosine(first, first) - 1) < 1e-9);
});

test('signal extraction deduplicates Xids, metrics, model, and driver', () => {
  assert.deepEqual(
    extractSignals('Xid 79 xid_79 DCGM_FI_DEV_GPU_TEMP H100 R565 H100'),
    { xids: ['79'], metrics: ['DCGM_FI_DEV_GPU_TEMP'], gpuModels: ['H100'], driverBranches: ['R565'] },
  );
});

test('hybrid retrieval ranks an exact Xid first', () => {
  assert.equal(retrieve('NVRM Xid 79 GPU has fallen off the bus')[0].document.id, 'nvidia-xid-79');
});

test('hybrid retrieval ranks an exact DCGM field first', () => {
  assert.equal(retrieve('DCGM_FI_DEV_GPU_TEMP=91')[0].document.id, 'dcgm-gpu-temp');
});

test('grounded analysis includes only retriever-backed citations', () => {
  const analysis = analyzeTelemetry('Xid 48 with DCGM_FI_DEV_ECC_DBE_VOL_TOTAL=2 on A100');
  const retrieved = new Set(analysis.retrieval.map((result) => result.document.id));
  assert.notEqual(analysis.status, 'refused');
  assert.ok(analysis.citations.length >= 1);
  assert.ok(analysis.citations.every((citation) => retrieved.has(citation.id)));
});

test('unknown Xid follows the refusal path with zero citations', () => {
  const analysis = analyzeTelemetry('NVRM Xid 999 on H100 R565');
  assert.equal(analysis.status, 'refused');
  assert.equal(analysis.citations.length, 0);
});

test('unknown DCGM metric follows the refusal path', () => {
  assert.equal(analyzeTelemetry('DCGM_FI_DEV_TELEPORTATION_ERRORS=12').status, 'refused');
});

test('irrelevant question follows the refusal path', () => {
  assert.equal(analyzeTelemetry('What is the weather forecast for tomorrow?').status, 'refused');
});

test('unsupported model and driver produce compatibility notes', () => {
  const analysis = analyzeTelemetry('Xid 154 on V100 with driver R470');
  assert.equal(analysis.status, 'needs-investigation');
  assert.ok(analysis.compatibilityNotes.length >= 1);
});

test('corpus IDs and URLs are valid and unique', () => {
  assert.equal(new Set(corpus.map((document) => document.id)).size, corpus.length);
  assert.ok(corpus.every((document) => document.sourceUrl.startsWith('https://')));
});

test('retrieval result is bounded to five documents', () => {
  assert.equal(retrieve('GPU temperature power PCIe ECC', corpus, 5).length, 5);
});

test('evaluation set meets the project target for retrieval and refusal', () => {
  let expected = 0;
  let hits = 0;
  let refusalCorrect = 0;
  for (const testCase of evaluationCases) {
    const analysis = analyzeTelemetry(testCase.query);
    const ids = analysis.retrieval.map((result) => result.document.id);
    for (const id of testCase.expectedIds) {
      expected += 1;
      if (ids.includes(id)) hits += 1;
    }
    if ((analysis.status === 'refused') === testCase.shouldRefuse) refusalCorrect += 1;
  }
  assert.ok(hits / expected >= 0.85);
  assert.equal(refusalCorrect, evaluationCases.length);
});
