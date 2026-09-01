import type { ExtractedSignals, SignalAnalysis } from './types.ts';

export interface LangSmithConfig {
  apiKey: string;
  project: string;
  otelEndpoint: string;
}

export interface TraceStage {
  name: string;
  durationMs: number;
  status: 'ok' | 'error';
  attributes?: Record<string, string | number | boolean>;
}

type OtlpValue = { stringValue: string } | { intValue: string } | { boolValue: boolean } | { doubleValue: number };

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function otlpValue(value: string | number | boolean): OtlpValue {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  return { stringValue: value };
}

function attributes(values: Record<string, string | number | boolean>): Array<{ key: string; value: OtlpValue }> {
  return Object.entries(values).map(([key, value]) => ({ key, value: otlpValue(value) }));
}

function nanosFrom(startMs: number, offsetMs = 0): string {
  return String(BigInt(Math.round((startMs + offsetMs) * 1_000_000)));
}

export function getOptionalLangSmithConfig(
  environment: Record<string, string | undefined> = process.env,
): LangSmithConfig | undefined {
  const apiKey = environment.LANGSMITH_API_KEY?.trim();
  if (!apiKey) return undefined;
  const base = (environment.LANGSMITH_ENDPOINT?.trim() || 'https://api.smith.langchain.com').replace(/\/+$/, '');
  return {
    apiKey,
    project: environment.LANGSMITH_PROJECT?.trim() || 'gpu-signal-atlas',
    otelEndpoint: environment.LANGSMITH_OTEL_ENDPOINT?.trim() || `${base}/otel/v1/traces`,
  };
}

export function redactedTraceInput(signals: ExtractedSignals, telemetryLength: number): Record<string, unknown> {
  return {
    identifiers: [...signals.xids.map((xid) => `Xid ${xid}`), ...signals.metrics],
    gpuModels: signals.gpuModels,
    driverBranches: signals.driverBranches,
    telemetryLength,
    rawTelemetryIncluded: false,
  };
}

export function buildLangSmithOtelPayload(
  analysis: SignalAnalysis,
  signals: ExtractedSignals,
  telemetryLength: number,
  stages: TraceStage[],
  startedAtEpochMs = Date.now(),
): Record<string, unknown> {
  const traceId = /^[a-f0-9]{32}$/i.test(analysis.diagnostics.traceId) ? analysis.diagnostics.traceId : randomHex(16);
  const rootSpanId = randomHex(8);
  const totalMs = Math.max(analysis.diagnostics.durationMs, stages.reduce((sum, stage) => sum + stage.durationMs, 0));
  let offsetMs = 0;
  const childSpans = stages.map((stage) => {
    const span = {
      traceId,
      spanId: randomHex(8),
      parentSpanId: rootSpanId,
      name: stage.name,
      kind: 1,
      startTimeUnixNano: nanosFrom(startedAtEpochMs, offsetMs),
      endTimeUnixNano: nanosFrom(startedAtEpochMs, offsetMs + stage.durationMs),
      attributes: attributes(stage.attributes ?? {}),
      status: { code: stage.status === 'ok' ? 1 : 2 },
    };
    offsetMs += stage.durationMs;
    return span;
  });

  return {
    resourceSpans: [{
      resource: {
        attributes: attributes({
          'service.name': 'gpu-signal-atlas',
          'service.namespace': 'observability-rag',
          'deployment.environment.name': 'production',
        }),
      },
      scopeSpans: [{
        scope: { name: 'gpu-signal-atlas.rag', version: '1.0.0' },
        spans: [{
          traceId,
          spanId: rootSpanId,
          name: 'gpu-signal-atlas.analyze',
          kind: 2,
          startTimeUnixNano: nanosFrom(startedAtEpochMs),
          endTimeUnixNano: nanosFrom(startedAtEpochMs, totalMs),
          attributes: attributes({
            'gen_ai.operation.name': 'retrieve_and_generate',
            'rag.input.redacted': JSON.stringify(redactedTraceInput(signals, telemetryLength)),
            'rag.result.status': analysis.status,
            'rag.evidence.strength': analysis.evidenceStrength,
            'rag.citation.count': analysis.citations.length,
            'rag.retrieval.backend': analysis.diagnostics.retrievalBackend,
            'rag.vector.index.version': analysis.diagnostics.vectorIndexVersion,
            'rag.corpus.version': analysis.diagnostics.corpusVersion,
            'rag.generation.mode': analysis.diagnostics.generationMode,
            'rag.raw_telemetry_exported': false,
          }),
          status: { code: 1 },
        }, ...childSpans],
      }],
    }],
  };
}

export async function exportLangSmithTrace(
  analysis: SignalAnalysis,
  signals: ExtractedSignals,
  telemetryLength: number,
  stages: TraceStage[],
  config: LangSmithConfig | undefined = getOptionalLangSmithConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<'disabled' | 'exported' | 'failed'> {
  if (!config) return 'disabled';
  try {
    const response = await fetchImpl(config.otelEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'Langsmith-Project': config.project,
      },
      body: JSON.stringify(buildLangSmithOtelPayload(analysis, signals, telemetryLength, stages)),
      signal: AbortSignal.timeout(2_500),
    });
    return response.ok ? 'exported' : 'failed';
  } catch {
    return 'failed';
  }
}
