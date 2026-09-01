import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ingestTelemetry,
  createTelemetryEventStream,
  normalizeTelemetryPayload,
  recentTelemetry,
  resetTelemetryGatewayForTests,
  sanitizeTelemetry,
  TELEMETRY_BUFFER_LIMIT,
} from '../core/telemetry.ts';

test.beforeEach(() => resetTelemetryGatewayForTests());

test('gateway keeps approved observability metadata and removes private fields', () => {
  const event = sanitizeTelemetry({
    message: 'NVRM Xid 79 NODE=gpu-worker-07 token=top-secret',
    source: 'fluent-bit',
    attributes: {
      'service.name': 'gpu-signal-replay',
      'event.domain': 'gpu',
      'gpu.xid': 79,
      'k8s.pod.name': 'private-workload',
      authorization: 'Bearer should-not-leak',
    },
  });

  assert.equal(event.attributes['service.name'], 'gpu-signal-replay');
  assert.equal(event.attributes['gpu.xid'], 79);
  assert.equal(event.attributes['k8s.pod.name'], undefined);
  assert.equal(event.attributes.authorization, undefined);
  assert.doesNotMatch(event.message, /gpu-worker-07|top-secret/);
  assert.match(event.message, /\[REDACTED\]/);
  assert.ok(event.redactionCount >= 4);
  assert.equal(event.sanitized, true);
});

test('gateway normalizes simple JSON events', () => {
  const inputs = normalizeTelemetryPayload({
    message: 'DCGM_FI_DEV_GPU_TEMP=91',
    timestamp: '2026-09-01T12:00:00Z',
    attributes: { 'service.name': 'dcgm-exporter', 'signal.type': 'dcgm-metric' },
  });
  assert.equal(inputs.length, 1);
  const [event] = ingestTelemetry(inputs);
  assert.equal(event.serviceName, 'dcgm-exporter');
  assert.equal(event.occurredAt, '2026-09-01T12:00:00.000Z');
  assert.equal(recentTelemetry().length, 1);
});

test('gateway normalizes OTLP JSON batches from the Collector', () => {
  const inputs = normalizeTelemetryPayload({
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'gpu-signal-replay' } },
            { key: 'telemetry.source', value: { stringValue: 'fluent-bit' } },
          ],
        },
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: '1788278400000000000',
                body: { stringValue: 'NVRM: Xid 48' },
                attributes: [{ key: 'event.domain', value: { stringValue: 'gpu' } }],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(inputs.length, 1);
  const [event] = ingestTelemetry(inputs);
  assert.equal(event.source, 'fluent-bit');
  assert.equal(event.message, 'NVRM: Xid 48');
  assert.equal(event.attributes['event.domain'], 'gpu');
});

test('ephemeral gateway remains bounded and supports sequence cursors', () => {
  const events = ingestTelemetry(
    Array.from({ length: TELEMETRY_BUFFER_LIMIT + 5 }, (_, index) => ({
      message: `NVRM Xid ${index}`,
      source: 'guided-replay' as const,
    })),
  );
  const recent = recentTelemetry();
  assert.equal(recent.length, TELEMETRY_BUFFER_LIMIT);
  assert.equal(recent[0].sequence, events[5].sequence);
  assert.deepEqual(
    recentTelemetry(events.at(-2)?.sequence ?? 0).map((event) => event.sequence),
    [events.at(-1)?.sequence],
  );
});

test('gateway rejects empty and oversized messages', () => {
  assert.throws(() => sanitizeTelemetry({ message: '   ' }), /non-empty message/);
  assert.throws(() => sanitizeTelemetry({ message: 'x'.repeat(10_001) }), /exceeds 10000/);
});

test('SSE stream flushes its ready event without waiting for the event pump', async () => {
  const stream = createTelemetryEventStream(0, { durationMs: 25, pollIntervalMs: 5 });
  const reader = stream.getReader();
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('SSE ready event was buffered')), 100),
  );
  const first = await Promise.race([reader.read(), timeout]);
  assert.equal(first.done, false);
  assert.match(new TextDecoder().decode(first.value), /event: ready/);
  await reader.cancel();
});
