import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeTelemetry, extractSignals } from '../core/engine.ts';
import { getIntegrationStatus } from '../core/integrations.ts';
import {
  buildLangSmithOtelPayload,
  exportLangSmithTrace,
  getOptionalLangSmithConfig,
  redactedTraceInput,
} from '../core/langsmith.ts';
import {
  discoverYouSources,
  getOptionalYouConfig,
  isAllowedDiscoveryUrl,
} from '../core/you.ts';

test('You.com discovery is optional and restricted to approved public sources', () => {
  assert.equal(getOptionalYouConfig({}), undefined);
  assert.equal(getOptionalYouConfig({ YOU_API_KEY: 'server-secret' })?.apiKey, 'server-secret');
  assert.equal(isAllowedDiscoveryUrl('https://docs.nvidia.com/deploy/xid-errors/'), true);
  assert.equal(isAllowedDiscoveryUrl('https://github.com/sivalinb/gpu-signal-atlas/blob/main/README.md'), true);
  assert.equal(isAllowedDiscoveryUrl('https://github.com/another/private-repo'), false);
  assert.equal(isAllowedDiscoveryUrl('https://example.com/gpu-advice'), false);
});

test('You.com results become review candidates and are never auto-promoted', async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.you.com/v1/search');
    assert.equal(new Headers(init?.headers).get('X-API-Key'), 'you-secret');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.deepEqual(body.include_domains, ['docs.nvidia.com', 'docs.fluentbit.io', 'opentelemetry.io', 'github.com']);
    assert.deepEqual(body.extraction, {
      extraction_mode: 'full_page',
      full_page: { extraction_formats: ['markdown'] },
    });
    return Response.json({
      results: {
        web: [
          { title: 'NVIDIA Xid Errors', url: 'https://docs.nvidia.com/deploy/xid-errors/', contents: { markdown: '# Xid 79' } },
          { title: 'Unapproved', url: 'https://example.com/advice', contents: { markdown: 'ignore this' } },
        ],
      },
    });
  };
  const candidates = await discoverYouSources(
    'NVIDIA Xid documentation',
    { apiKey: 'you-secret', endpoint: 'https://api.you.com/v1/search' },
    fetchImpl,
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].provider, 'you-search');
  assert.equal(candidates[0].reviewStatus, 'pending-review');
  assert.ok(candidates[0].contentHash.length > 0);
});

test('public integration status reports configuration without returning secrets', () => {
  const status = getIntegrationStatus({
    PINECONE_API_KEY: 'pinecone-secret',
    PINECONE_INDEX_HOST: 'index.example.pinecone.io',
    PINECONE_INDEX_NAME: 'gpu-signal-atlas-docs',
    PINECONE_NAMESPACE: 'corpus-test',
    YOU_API_KEY: 'you-secret',
    LANGSMITH_API_KEY: 'langsmith-secret',
    MISTRAL_API_KEY: 'mistral-secret',
    NEO4J_URI: 'neo4j+s://graph.example',
    NEO4J_USERNAME: 'neo4j',
    NEO4J_PASSWORD: 'neo4j-secret',
    NEO4J_DATABASE: 'neo4j',
    DEEPGRAM_API_KEY: 'deepgram-secret',
  });
  assert.deepEqual(status, {
    pineconeConfigured: true,
    youConfigured: true,
    langsmithConfigured: true,
    mistralConfigured: true,
    neo4jConfigured: true,
    deepgramConfigured: true,
    secretsExposedToBrowser: false,
  });
  assert.doesNotMatch(JSON.stringify(status), /pinecone-secret|you-secret|langsmith-secret|mistral-secret|neo4j-secret|deepgram-secret/);
});

test('LangSmith trace payload contains retrieval outcomes but no raw telemetry', () => {
  assert.equal(getOptionalLangSmithConfig({}), undefined);
  const telemetry = 'NVRM: Xid (PCI:0000:04:00): 79, GPU has fallen off the bus';
  const signals = extractSignals(telemetry);
  const analysis = analyzeTelemetry(telemetry);
  const redacted = redactedTraceInput(signals, telemetry.length);
  assert.equal(redacted.rawTelemetryIncluded, false);
  assert.equal(JSON.stringify(redacted).includes('fallen off the bus'), false);

  const payload = buildLangSmithOtelPayload(analysis, signals, telemetry.length, [
    { name: 'rag.hybrid_retrieval', durationMs: 12.5, status: 'ok', attributes: { 'rag.candidate.count': 5 } },
  ]);
  const serialized = JSON.stringify(payload);
  assert.match(serialized, /rag\.hybrid_retrieval/);
  assert.match(serialized, /rag\.raw_telemetry_exported/);
  assert.doesNotMatch(serialized, /fallen off the bus/);
});

test('LangSmith exporter uses OTLP headers and degrades safely', async () => {
  const telemetry = 'NVRM Xid 79 on H100';
  const signals = extractSignals(telemetry);
  const analysis = analyzeTelemetry(telemetry);
  let capturedBody = '';
  const fetchImpl: typeof fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.smith.langchain.com/otel/v1/traces');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('x-api-key'), 'langsmith-secret');
    assert.equal(headers.get('Langsmith-Project'), 'gpu-signal-atlas');
    capturedBody = String(init?.body);
    return new Response(null, { status: 202 });
  };
  assert.equal(
    await exportLangSmithTrace(
      analysis,
      signals,
      telemetry.length,
      [{ name: 'rag.extract_signals', durationMs: 1, status: 'ok' }],
      {
        apiKey: 'langsmith-secret',
        project: 'gpu-signal-atlas',
        otelEndpoint: 'https://api.smith.langchain.com/otel/v1/traces',
      },
      fetchImpl,
    ),
    'exported',
  );
  assert.ok(capturedBody.length > 0);
  assert.equal(await exportLangSmithTrace(analysis, signals, telemetry.length, [], undefined, fetchImpl), 'disabled');
});
