import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Fluent Bit replay enriches and exports GPU logs over OTLP', async () => {
  const config = await readFile(new URL('../observability/fluent-bit.conf', import.meta.url), 'utf8');
  assert.match(config, /Name\s+opentelemetry/);
  assert.match(config, /Logs_URI\s+\/v1\/logs/);
  for (const attribute of ['service.name', 'service.namespace', 'deployment.environment.name', 'event.domain', 'telemetry.source']) {
    assert.ok(config.includes(attribute), attribute);
  }
});

test('Collector replay receives OTLP logs and fans out to debug plus the safe gateway', async () => {
  const config = await readFile(new URL('../observability/otel-collector.yaml', import.meta.url), 'utf8');
  assert.match(config, /http:\s*\n\s*endpoint: 0\.0\.0\.0:4318/);
  assert.match(config, /processors: \[resource, batch\]/);
  assert.match(config, /otlphttp\/gateway/);
  assert.match(config, /logs_endpoint: http:\/\/127\.0\.0\.1:3000\/api\/telemetry\/v1\/logs/);
  assert.match(config, /x-telemetry-token: \$\{env:TELEMETRY_INGEST_TOKEN\}/);
  assert.match(config, /exporters: \[debug, otlphttp\/gateway\]/);
  assert.doesNotMatch(config, /loki|elasticsearch/i);
});

test('Optional LangSmith collector path redacts payload fields before OTLP export', async () => {
  const config = await readFile(new URL('../observability/otel-collector-langsmith.yaml', import.meta.url), 'utf8');
  assert.match(config, /transform\/redact/);
  assert.match(config, /delete_key\(attributes, "input\.value"\)/);
  assert.match(config, /otlphttp\/langsmith/);
  assert.match(config, /Langsmith-Project/);
});
