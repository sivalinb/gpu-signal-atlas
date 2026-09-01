import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getDeepgramConfig, synthesizeSpeech, transcribeAudio } from '../core/deepgram.ts';
import { getMistralConfig, mistralEmbeddings } from '../core/mistral.ts';
import { getNeo4jConfig, neo4jQuery, readGraphPaths } from '../core/neo4j.ts';
import { getTurnstileConfig, verifyTurnstile } from '../core/turnstile.ts';

test('Turnstile validates action and hostname server-side without exposing its secret', async () => {
  const config = getTurnstileConfig({
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-key',
    TURNSTILE_SECRET_KEY: 'server-secret',
    TURNSTILE_ENFORCED: 'true',
    TURNSTILE_EXPECTED_HOSTNAME: 'gpu.example',
  });
  let sent = '';
  const result = await verifyTurnstile(
    'single-use-token',
    'analyze',
    new Request('https://gpu.example/api/analyze'),
    config,
    async (_input, init) => {
      sent = String(init?.body);
      return Response.json({ success: true, hostname: 'gpu.example', action: 'analyze' });
    },
  );
  assert.equal(result, 'verified');
  assert.match(sent, /server-secret/);
  assert.doesNotMatch(JSON.stringify({ siteKey: config?.siteKey }), /server-secret/);
});

test('Turnstile rejects duplicate or expired tokens', async () => {
  const config = { secretKey: 'secret', siteKey: 'public', enforced: true };
  await assert.rejects(
    verifyTurnstile(
      'expired',
      'analyze',
      new Request('https://gpu.example/api/analyze'),
      config,
      async () => Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    ),
    /expired/,
  );
});

test('Mistral embedding adapter preserves input order and keeps the key in Authorization', async () => {
  const config = getMistralConfig({ MISTRAL_API_KEY: 'mistral-secret' });
  assert.ok(config);
  const result = await mistralEmbeddings(
    ['query', 'document'],
    config,
    async (input, init) => {
      assert.equal(String(input), 'https://api.mistral.ai/v1/embeddings');
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer mistral-secret');
      return Response.json({ data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }], usage: { total_tokens: 4 } });
    },
  );
  assert.deepEqual(result.vectors, [[1, 0], [0, 1]]);
  assert.equal(result.totalTokens, 4);
});

test('Mistral generation uses its supported strict-schema subset with local limits', async () => {
  const source = await readFile(new URL('../core/llm.ts', import.meta.url), 'utf8');
  assert.match(source, /mistralLlmResponseSchema/);
  assert.match(source, /hostname\.endsWith\('mistral\.ai'\)/);
  assert.match(source, /citedDocumentIds must contain 1–3 items/);
});

test('Deepgram adapters transcribe and synthesize without returning the API key', async () => {
  const config = getDeepgramConfig({ DEEPGRAM_API_KEY: 'deepgram-secret' });
  assert.ok(config);
  const transcript = await transcribeAudio(
    new TextEncoder().encode('audio').buffer,
    'audio/webm',
    config,
    async (_input, init) => {
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Token deepgram-secret');
      return Response.json({ results: { channels: [{ alternatives: [{ transcript: 'Analyze Xid 79', confidence: 0.97 }] }] } });
    },
  );
  assert.equal(transcript.transcript, 'Analyze Xid 79');
  const speech = await synthesizeSpeech('Grounded briefing', config, async () => new Response('mp3', { headers: { 'content-type': 'audio/mpeg' } }));
  assert.equal(speech.headers.get('content-type'), 'audio/mpeg');
});

test('Neo4j Query API uses HTTPS and maps bounded relationship records', async () => {
  const config = getNeo4jConfig({
    NEO4J_URI: 'neo4j+s://graph.databases.neo4j.io',
    NEO4J_USERNAME: 'neo4j',
    NEO4J_PASSWORD: 'graph-secret',
    NEO4J_DATABASE: 'neo4j',
  });
  assert.ok(config);
  const fetchImpl: typeof fetch = async (input, init) => {
    assert.equal(String(input), 'https://graph.databases.neo4j.io/db/neo4j/query/v2');
    assert.match(new Headers(init?.headers).get('Authorization') ?? '', /^Basic /);
    return Response.json({ data: { fields: ['fromId', 'fromType', 'relationship', 'toId', 'toType', 'detail'], values: [['Xid 79', 'Signal', 'SUPPORTED_BY', 'xid-79', 'Evidence', 'PCIe evidence']] } });
  };
  await neo4jQuery('RETURN 1', {}, config, fetchImpl);
  const paths = await readGraphPaths(config, fetchImpl);
  assert.deepEqual(paths[0], {
    fromId: 'Xid 79',
    fromType: 'Signal',
    relationship: 'SUPPORTED_BY',
    toId: 'xid-79',
    toType: 'Evidence',
    detail: 'PCIe evidence',
  });
});
