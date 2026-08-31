import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFixedWindowCorpus, evaluateRetrieval } from '../core/ablation.ts';
import { corpus } from '../core/corpus.ts';
import { evaluationCases } from '../evaluation/cases.ts';

test('retrieval ablation exposes four independently scored strategies', () => {
  const strategies = ['bm25', 'vector', 'hybrid', 'hybrid-rerank'] as const;
  const results = strategies.map((strategy) => evaluateRetrieval(strategy, evaluationCases, corpus, strategy));
  assert.equal(results.length, 4);
  assert.ok(results.every((result) => result.expectedEvidence > 0));
  assert.ok(results.every((result) => result.recallAt5 >= 0 && result.recallAt5 <= 1));
});

test('chunking ablation builds multi-identifier source windows and preserves expected IDs', () => {
  const fixed = buildFixedWindowCorpus(corpus);
  assert.ok(fixed.some((document) => (document.sourceDocumentIds?.length ?? 0) > 1));
  const fixedResult = evaluateRetrieval('fixed', evaluationCases, fixed, 'hybrid-rerank');
  const structuredResult = evaluateRetrieval('structured', evaluationCases, corpus, 'hybrid-rerank');
  assert.ok(structuredResult.recallAt5 >= fixedResult.recallAt5);
  assert.ok(structuredResult.mrr >= 0.75);
});
