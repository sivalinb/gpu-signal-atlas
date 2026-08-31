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

test('Collector replay receives OTLP logs and ends at the debug exporter', async () => {
  const config = await readFile(new URL('../observability/otel-collector.yaml', import.meta.url), 'utf8');
  assert.match(config, /http:\s*\n\s*endpoint: 0\.0\.0\.0:4318/);
  assert.match(config, /processors: \[resource, batch\]/);
  assert.match(config, /exporters: \[debug\]/);
  assert.doesNotMatch(config, /loki|elasticsearch|otlphttp\/backend/i);
});
