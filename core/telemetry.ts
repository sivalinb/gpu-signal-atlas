export const TELEMETRY_MAX_BODY_BYTES = 64 * 1024;
export const TELEMETRY_MAX_MESSAGE_CHARS = 10_000;
export const TELEMETRY_MAX_BATCH_EVENTS = 20;
export const TELEMETRY_BUFFER_LIMIT = 50;
export const TELEMETRY_RETENTION_MS = 15 * 60 * 1000;

export interface TelemetryEvent {
  id: string;
  sequence: number;
  receivedAt: string;
  occurredAt: string;
  source: 'fluent-bit' | 'guided-replay' | 'otlp';
  serviceName: string;
  namespace: string;
  environment: string;
  message: string;
  attributes: Record<string, string | number | boolean>;
  redactionCount: number;
  sanitized: true;
}

export interface TelemetryIngestInput {
  message: string;
  timestamp?: string;
  source?: TelemetryEvent['source'];
  attributes?: Record<string, unknown>;
  resource?: Record<string, unknown>;
}

interface TelemetryGatewayState {
  sequence: number;
  events: TelemetryEvent[];
}

declare global {
  // eslint-disable-next-line no-var
  var __gpuSignalTelemetryGateway: TelemetryGatewayState | undefined;
}

const SAFE_ATTRIBUTES = new Set([
  'service.name',
  'service.namespace',
  'deployment.environment.name',
  'event.domain',
  'telemetry.source',
  'signal.type',
  'gpu.model',
  'gpu.driver.branch',
  'gpu.metric.name',
  'gpu.xid',
]);

const state =
  globalThis.__gpuSignalTelemetryGateway ??
  (globalThis.__gpuSignalTelemetryGateway = { sequence: 0, events: [] });

function scalar(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function decodeOtlpValue(value: unknown): string | number | boolean | undefined {
  if (!value || typeof value !== 'object') return scalar(value);
  const record = value as Record<string, unknown>;
  return (
    scalar(record.stringValue) ??
    scalar(record.intValue) ??
    scalar(record.doubleValue) ??
    scalar(record.boolValue)
  );
}

function decodeOtlpAttributes(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(
    value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const attribute = item as Record<string, unknown>;
      if (typeof attribute.key !== 'string') return [];
      const decoded = decodeOtlpValue(attribute.value);
      return decoded === undefined ? [] : [[attribute.key, decoded]];
    }),
  );
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'string') {
    if (/^\d{13,20}$/.test(value)) {
      const milliseconds = Number(value.slice(0, 13));
      const parsed = new Date(milliseconds);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function sanitizeMessage(value: string): { message: string; redactionCount: number } {
  let redactionCount = 0;
  const replacements: RegExp[] = [
    /\b(?:api[_-]?key|token|password|passwd|authorization|cookie|secret)\s*[:=]\s*[^\s,;]+/gi,
    /\b(?:tenant|account|user|email|pod|workload|container(?:_id)?|node)\s*[:=]\s*[^\s,;]+/gi,
    /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  ];
  let message = value;
  for (const pattern of replacements) {
    message = message.replace(pattern, (match) => {
      redactionCount += 1;
      const separator = match.includes('=') ? '=' : match.includes(':') ? ':' : ' ';
      return `${match.split(separator)[0]}${separator}[REDACTED]`;
    });
  }
  return { message: message.slice(0, TELEMETRY_MAX_MESSAGE_CHARS), redactionCount };
}

function sanitizeAttributes(
  values: Record<string, unknown>,
): { attributes: TelemetryEvent['attributes']; redactionCount: number } {
  const attributes: TelemetryEvent['attributes'] = {};
  let redactionCount = 0;
  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = key.toLowerCase();
    const decoded = scalar(value);
    if (SAFE_ATTRIBUTES.has(normalizedKey) && decoded !== undefined) {
      attributes[normalizedKey] = typeof decoded === 'string' ? decoded.slice(0, 256) : decoded;
    } else {
      redactionCount += 1;
    }
  }
  return { attributes, redactionCount };
}

function prune(now = Date.now()): void {
  state.events = state.events
    .filter((event) => now - Date.parse(event.receivedAt) <= TELEMETRY_RETENTION_MS)
    .slice(-TELEMETRY_BUFFER_LIMIT);
}

export function sanitizeTelemetry(input: TelemetryIngestInput): TelemetryEvent {
  if (typeof input.message !== 'string' || input.message.trim().length === 0) {
    throw new Error('Telemetry event must contain a non-empty message.');
  }
  if (input.message.length > TELEMETRY_MAX_MESSAGE_CHARS) {
    throw new Error(`Telemetry message exceeds ${TELEMETRY_MAX_MESSAGE_CHARS} characters.`);
  }

  const resource = input.resource ?? {};
  const provided = input.attributes ?? {};
  const sanitizedAttributes = sanitizeAttributes({ ...resource, ...provided });
  const sanitizedMessage = sanitizeMessage(input.message.trim());
  const sequence = (state.sequence += 1);
  const now = new Date().toISOString();
  const sourceAttribute = sanitizedAttributes.attributes['telemetry.source'];
  const source =
    input.source ??
    (sourceAttribute === 'fluent-bit' ? 'fluent-bit' : 'otlp');

  return {
    id: `telemetry-${Date.now()}-${sequence}`,
    sequence,
    receivedAt: now,
    occurredAt: normalizeTimestamp(input.timestamp),
    source,
    serviceName: String(sanitizedAttributes.attributes['service.name'] ?? 'gpu-signal-replay'),
    namespace: String(
      sanitizedAttributes.attributes['service.namespace'] ?? 'gpu-observability',
    ),
    environment: String(
      sanitizedAttributes.attributes['deployment.environment.name'] ?? 'demo',
    ),
    message: sanitizedMessage.message,
    attributes: sanitizedAttributes.attributes,
    redactionCount: sanitizedMessage.redactionCount + sanitizedAttributes.redactionCount,
    sanitized: true,
  };
}

export function normalizeTelemetryPayload(payload: unknown): TelemetryIngestInput[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Telemetry body must be a JSON object.');
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.message === 'string') {
    return [
      {
        message: record.message,
        timestamp: typeof record.timestamp === 'string' ? record.timestamp : undefined,
        source:
          record.source === 'fluent-bit' || record.source === 'guided-replay'
            ? record.source
            : 'otlp',
        attributes:
          record.attributes && typeof record.attributes === 'object'
            ? (record.attributes as Record<string, unknown>)
            : {},
        resource:
          record.resource && typeof record.resource === 'object'
            ? (record.resource as Record<string, unknown>)
            : {},
      },
    ];
  }

  if (!Array.isArray(record.resourceLogs)) {
    throw new Error('Expected a simple telemetry event or OTLP JSON resourceLogs.');
  }

  const normalized: TelemetryIngestInput[] = [];
  for (const resourceLog of record.resourceLogs) {
    if (!resourceLog || typeof resourceLog !== 'object') continue;
    const resourceLogRecord = resourceLog as Record<string, unknown>;
    const resourceRecord =
      resourceLogRecord.resource && typeof resourceLogRecord.resource === 'object'
        ? (resourceLogRecord.resource as Record<string, unknown>)
        : {};
    const resource = decodeOtlpAttributes(resourceRecord.attributes);
    const scopeLogs = Array.isArray(resourceLogRecord.scopeLogs) ? resourceLogRecord.scopeLogs : [];
    for (const scopeLog of scopeLogs) {
      if (!scopeLog || typeof scopeLog !== 'object') continue;
      const records = Array.isArray((scopeLog as Record<string, unknown>).logRecords)
        ? ((scopeLog as Record<string, unknown>).logRecords as unknown[])
        : [];
      for (const logRecord of records) {
        if (!logRecord || typeof logRecord !== 'object') continue;
        const log = logRecord as Record<string, unknown>;
        const body = decodeOtlpValue(log.body);
        if (body === undefined) continue;
        normalized.push({
          message: String(body),
          timestamp:
            typeof log.timeUnixNano === 'string'
              ? log.timeUnixNano
              : typeof log.observedTimeUnixNano === 'string'
                ? log.observedTimeUnixNano
                : undefined,
          source: resource['telemetry.source'] === 'fluent-bit' ? 'fluent-bit' : 'otlp',
          attributes: decodeOtlpAttributes(log.attributes),
          resource,
        });
      }
    }
  }
  if (normalized.length === 0) throw new Error('OTLP payload contained no log records.');
  if (normalized.length > TELEMETRY_MAX_BATCH_EVENTS) {
    throw new Error(`OTLP batch exceeds ${TELEMETRY_MAX_BATCH_EVENTS} events.`);
  }
  return normalized;
}

export function ingestTelemetry(inputs: TelemetryIngestInput[]): TelemetryEvent[] {
  const events = inputs.map(sanitizeTelemetry);
  state.events.push(...events);
  prune();
  return events;
}

export function recentTelemetry(afterSequence = 0): TelemetryEvent[] {
  prune();
  return state.events.filter((event) => event.sequence > afterSequence);
}

export function createTelemetryEventStream(
  afterSequence = 0,
  options: { durationMs?: number; pollIntervalMs?: number } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const durationMs = options.durationMs ?? 20_000;
  const pollIntervalMs = options.pollIntervalMs ?? 750;
  let cursor = afterSequence;
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Keep start synchronous so edge runtimes can flush response headers and
      // the ready event immediately instead of buffering until the pump exits.
      controller.enqueue(encoder.encode('retry: 1500\nevent: ready\ndata: {"connected":true}\n\n'));

      const pump = async () => {
        const deadline = Date.now() + durationMs;
        while (!cancelled && Date.now() < deadline) {
          const events = recentTelemetry(cursor);
          for (const event of events) {
            cursor = Math.max(cursor, event.sequence);
            controller.enqueue(
              encoder.encode(`id: ${event.sequence}\nevent: telemetry\ndata: ${JSON.stringify(event)}\n\n`),
            );
          }
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
        if (!cancelled) controller.close();
      };

      void pump().catch((error: unknown) => {
        if (!cancelled) controller.error(error);
      });
    },
    cancel() {
      cancelled = true;
    },
  });
}

export function resetTelemetryGatewayForTests(): void {
  state.sequence = 0;
  state.events = [];
}
