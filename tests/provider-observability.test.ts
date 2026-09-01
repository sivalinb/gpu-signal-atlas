import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProviderObservabilitySummary,
  recordAnalysisObservation,
  recordProviderObservation,
  resetProviderObservabilityForTests,
} from '../core/provider-observability.ts';

function snapshot() {
  return {
    configured: true,
    reachable: true,
    dimension: 256,
    namespaceVectorCount: 17,
    totalVectorCount: 17,
    expectedRecords: 17,
    checkedAt: '2026-09-01T00:00:00.000Z',
  };
}

test('provider observability aggregates Pinecone usage and RAG outcomes without payload content', () => {
  resetProviderObservabilityForTests();
  recordProviderObservation({
    provider: 'pinecone',
    operation: 'query',
    durationMs: 20,
    ok: true,
    readUnits: 4,
    itemCount: 5,
  });
  recordProviderObservation({
    provider: 'pinecone',
    operation: 'query',
    durationMs: 40,
    ok: false,
    readUnits: 2,
  });
  recordProviderObservation({
    provider: 'langsmith',
    operation: 'otlp_trace_export',
    durationMs: 10,
    ok: true,
  });
  recordAnalysisObservation({
    outcome: 'grounded',
    durationMs: 75,
    citations: 3,
    stages: [{ name: 'rag.hybrid_retrieval', durationMs: 20 }],
  });
  recordAnalysisObservation({
    outcome: 'refused',
    durationMs: 45,
    citations: 0,
    stages: [],
  });

  const summary = buildProviderObservabilitySummary({
    pinecone: snapshot(),
    configured: { pinecone: true, langsmith: true, opentelemetry: true },
    telemetry: { bufferedEvents: 2, redactions: 5 },
  });

  assert.equal(summary.pinecone.queryCount, 2);
  assert.equal(summary.pinecone.errors, 1);
  assert.equal(summary.pinecone.readUnits, 6);
  assert.equal(summary.pinecone.p50Ms, 20);
  assert.equal(summary.pinecone.p95Ms, 40);
  assert.equal(summary.rag.grounded, 1);
  assert.equal(summary.rag.refused, 1);
  assert.deepEqual(summary.rag.latestStages, []);
  assert.equal(summary.telemetry.redactions, 5);
  assert.equal(JSON.stringify(summary).includes('payload'), false);
});
