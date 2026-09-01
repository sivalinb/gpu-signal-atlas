export type ProviderKey =
  | 'pinecone'
  | 'langsmith'
  | 'opentelemetry'
  | 'neo4j'
  | 'mistral'
  | 'deepgram';

export interface ProviderObservation {
  timestamp: string;
  provider: ProviderKey;
  operation: string;
  durationMs: number;
  ok: boolean;
  readUnits?: number;
  itemCount?: number;
}

export interface AnalysisObservation {
  timestamp: string;
  outcome: 'grounded' | 'refused' | 'failed';
  durationMs: number;
  citations: number;
  stages: Array<{ name: string; durationMs: number }>;
}

interface ObservabilityState {
  providers: ProviderObservation[];
  analyses: AnalysisObservation[];
}

export interface PineconeIndexSnapshot {
  configured: boolean;
  reachable: boolean;
  dimension: number;
  namespaceVectorCount: number;
  totalVectorCount: number;
  expectedRecords: number;
  checkedAt: string;
}

export interface ProviderObservabilitySummary {
  generatedAt: string;
  window: {
    label: 'Current server runtime';
    durable: false;
    maxSamples: number;
  };
  pinecone: PineconeIndexSnapshot & {
    queryCount: number;
    errors: number;
    readUnits: number;
    p50Ms: number;
    p95Ms: number;
    series: Array<{ timestamp: string; latencyMs: number; readUnits: number }>;
  };
  rag: {
    analysisCount: number;
    grounded: number;
    refused: number;
    failed: number;
    p50Ms: number;
    p95Ms: number;
    latestStages: Array<{ name: string; durationMs: number }>;
  };
  providers: Array<{
    key: ProviderKey;
    label: string;
    configured: boolean;
    requests: number;
    errors: number;
    p50Ms: number;
    p95Ms: number;
    lastSeen?: string;
  }>;
  telemetry: {
    bufferedEvents: number;
    redactions: number;
    retentionMinutes: 15;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __gpuSignalProviderObservability: ObservabilityState | undefined;
}

export const OBSERVABILITY_SAMPLE_LIMIT = 120;

const state =
  globalThis.__gpuSignalProviderObservability ??
  (globalThis.__gpuSignalProviderObservability = {
    providers: [],
    analyses: [],
  });

const labels: Record<ProviderKey, string> = {
  pinecone: 'Pinecone',
  langsmith: 'LangSmith',
  opentelemetry: 'OpenTelemetry',
  neo4j: 'Neo4j',
  mistral: 'Mistral',
  deepgram: 'Deepgram',
};

const providerKeys = Object.keys(labels) as ProviderKey[];

function finite(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = values.map(finite).sort((a, b) => a - b);
  return (
    Math.round(
      sorted[
        Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
      ] * 10,
    ) / 10
  );
}

export function recordProviderObservation(
  observation: Omit<ProviderObservation, 'timestamp'> & { timestamp?: string },
): void {
  state.providers.push({
    ...observation,
    operation: observation.operation.slice(0, 80),
    durationMs: finite(observation.durationMs),
    readUnits:
      observation.readUnits === undefined
        ? undefined
        : finite(observation.readUnits),
    itemCount:
      observation.itemCount === undefined
        ? undefined
        : finite(observation.itemCount),
    timestamp: observation.timestamp ?? new Date().toISOString(),
  });
  state.providers = state.providers.slice(-OBSERVABILITY_SAMPLE_LIMIT);
}

export function recordAnalysisObservation(
  observation: Omit<AnalysisObservation, 'timestamp'> & { timestamp?: string },
): void {
  state.analyses.push({
    ...observation,
    durationMs: finite(observation.durationMs),
    citations: finite(observation.citations),
    stages: observation.stages.slice(0, 12).map((stage) => ({
      name: stage.name.slice(0, 80),
      durationMs: finite(stage.durationMs),
    })),
    timestamp: observation.timestamp ?? new Date().toISOString(),
  });
  state.analyses = state.analyses.slice(-OBSERVABILITY_SAMPLE_LIMIT);
}

export function buildProviderObservabilitySummary(input: {
  pinecone: PineconeIndexSnapshot;
  configured: Partial<Record<ProviderKey, boolean>>;
  telemetry: { bufferedEvents: number; redactions: number };
}): ProviderObservabilitySummary {
  const pineconeQueries = state.providers.filter(
    (observation) =>
      observation.provider === 'pinecone' && observation.operation === 'query',
  );
  const latestAnalysis = state.analyses.at(-1);
  return {
    generatedAt: new Date().toISOString(),
    window: {
      label: 'Current server runtime',
      durable: false,
      maxSamples: OBSERVABILITY_SAMPLE_LIMIT,
    },
    pinecone: {
      ...input.pinecone,
      queryCount: pineconeQueries.length,
      errors: pineconeQueries.filter((observation) => !observation.ok).length,
      readUnits: pineconeQueries.reduce(
        (sum, observation) => sum + finite(observation.readUnits),
        0,
      ),
      p50Ms: percentile(
        pineconeQueries.map((observation) => observation.durationMs),
        0.5,
      ),
      p95Ms: percentile(
        pineconeQueries.map((observation) => observation.durationMs),
        0.95,
      ),
      series: pineconeQueries.slice(-24).map((observation) => ({
        timestamp: observation.timestamp,
        latencyMs: observation.durationMs,
        readUnits: finite(observation.readUnits),
      })),
    },
    rag: {
      analysisCount: state.analyses.length,
      grounded: state.analyses.filter(
        (observation) => observation.outcome === 'grounded',
      ).length,
      refused: state.analyses.filter(
        (observation) => observation.outcome === 'refused',
      ).length,
      failed: state.analyses.filter(
        (observation) => observation.outcome === 'failed',
      ).length,
      p50Ms: percentile(
        state.analyses.map((observation) => observation.durationMs),
        0.5,
      ),
      p95Ms: percentile(
        state.analyses.map((observation) => observation.durationMs),
        0.95,
      ),
      latestStages: latestAnalysis?.stages ?? [],
    },
    providers: providerKeys.map((key) => {
      const observations = state.providers.filter(
        (observation) => observation.provider === key,
      );
      return {
        key,
        label: labels[key],
        configured: Boolean(input.configured[key]),
        requests: observations.length,
        errors: observations.filter((observation) => !observation.ok).length,
        p50Ms: percentile(
          observations.map((observation) => observation.durationMs),
          0.5,
        ),
        p95Ms: percentile(
          observations.map((observation) => observation.durationMs),
          0.95,
        ),
        lastSeen: observations.at(-1)?.timestamp,
      };
    }),
    telemetry: {
      bufferedEvents: finite(input.telemetry.bufferedEvents),
      redactions: finite(input.telemetry.redactions),
      retentionMinutes: 15,
    },
  };
}

export function resetProviderObservabilityForTests(): void {
  state.providers = [];
  state.analyses = [];
}
