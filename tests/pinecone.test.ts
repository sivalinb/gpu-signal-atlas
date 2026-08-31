import assert from 'node:assert/strict';
import test from 'node:test';

import { corpus } from '../core/corpus.ts';
import { analyzeTelemetryFromRetrieval } from '../core/engine.ts';
import {
  getPineconeConfig,
  PineconeConfigurationError,
  retrieveFromPinecone,
  upsertCorpusToPinecone,
} from '../core/pinecone.ts';

const config = {
  apiKey: 'test-secret',
  host: 'https://gpu-signal-atlas.example.pinecone.io',
  indexName: 'gpu-signal-atlas-docs',
  namespace: 'corpus-test',
};

test('Pinecone configuration requires server-only values and normalizes the host', () => {
  const parsed = getPineconeConfig({
    PINECONE_API_KEY: 'secret',
    PINECONE_INDEX_HOST: 'gpu-signal-atlas.example.pinecone.io/',
    PINECONE_INDEX_NAME: 'gpu-signal-atlas-docs',
    PINECONE_NAMESPACE: 'corpus-test',
  });
  assert.equal(parsed.host, 'https://gpu-signal-atlas.example.pinecone.io');
  assert.throws(() => getPineconeConfig({}), PineconeConfigurationError);
});

test('Pinecone dense candidates feed the existing hybrid reranker and evidence gate', async () => {
  let requestBody: Record<string, unknown> | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    assert.equal(String(input), `${config.host}/query`);
    assert.equal(new Headers(init?.headers).get('Api-Key'), config.apiKey);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      matches: corpus.map((document, index) => ({
        id: document.id,
        score: document.id === 'nvidia-xid-79' ? 0.98 : Math.max(0.01, 0.7 - index * 0.02),
      })),
    });
  };

  const { retrieval, vectorIndexVersion } = await retrieveFromPinecone(
    'NVRM Xid 79 GPU has fallen off the bus',
    config,
    corpus,
    5,
    fetchImpl,
  );
  assert.equal((requestBody?.vector as number[]).length, 256);
  assert.equal(requestBody?.namespace, config.namespace);
  assert.equal(retrieval[0].document.id, 'nvidia-xid-79');

  const analysis = analyzeTelemetryFromRetrieval(
    'NVRM Xid 79 GPU has fallen off the bus',
    retrieval,
    corpus,
    { vectorIndexVersion, retrievalBackend: 'pinecone' },
  );
  assert.notEqual(analysis.status, 'refused');
  assert.equal(analysis.diagnostics.retrievalBackend, 'pinecone');
  assert.ok(analysis.citations.every((citation) => retrieval.some((item) => item.document.id === citation.id)));
});

test('Pinecone corpus sync preserves stable IDs, vectors, metadata, and namespace', async () => {
  let requestBody: { namespace?: string; vectors?: Array<Record<string, unknown>> } | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    assert.equal(String(input), `${config.host}/vectors/upsert`);
    requestBody = JSON.parse(String(init?.body)) as typeof requestBody;
    return Response.json({ upsertedCount: corpus.length });
  };

  assert.equal(await upsertCorpusToPinecone(config, corpus, fetchImpl), corpus.length);
  assert.equal(requestBody?.namespace, config.namespace);
  assert.equal(requestBody?.vectors?.length, corpus.length);
  assert.equal((requestBody?.vectors?.[0]?.values as number[]).length, 256);
  assert.equal(requestBody?.vectors?.[0]?.id, corpus[0].id);
  assert.equal(
    (requestBody?.vectors?.[0]?.metadata as Record<string, unknown>).curatedContentHash,
    corpus[0].provenance.curatedContentHash,
  );
});
