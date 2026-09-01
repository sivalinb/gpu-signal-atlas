import { corpus } from '@/core/corpus';
import { getIntegrationStatus } from '@/core/integrations';
import { describePineconeStats, getPineconeConfig } from '@/core/pinecone';
import {
  buildProviderObservabilitySummary,
  recordProviderObservation,
  type PineconeIndexSnapshot,
} from '@/core/provider-observability';
import { recentTelemetry } from '@/core/telemetry';

export async function GET(): Promise<Response> {
  const integrations = getIntegrationStatus();
  const checkedAt = new Date().toISOString();
  let pinecone: PineconeIndexSnapshot = {
    configured: integrations.pineconeConfigured,
    reachable: false,
    dimension: 0,
    namespaceVectorCount: 0,
    totalVectorCount: 0,
    expectedRecords: corpus.length,
    checkedAt,
  };

  if (integrations.pineconeConfigured) {
    const startedAt = performance.now();
    try {
      const stats = await describePineconeStats(getPineconeConfig());
      pinecone = { ...pinecone, ...stats, reachable: true };
      recordProviderObservation({
        provider: 'pinecone',
        operation: 'describe_index_stats',
        durationMs: performance.now() - startedAt,
        ok: true,
        itemCount: stats.namespaceVectorCount,
      });
    } catch {
      recordProviderObservation({
        provider: 'pinecone',
        operation: 'describe_index_stats',
        durationMs: performance.now() - startedAt,
        ok: false,
      });
    }
  }

  const telemetry = recentTelemetry();
  const summary = buildProviderObservabilitySummary({
    pinecone,
    configured: {
      pinecone: integrations.pineconeConfigured,
      langsmith: integrations.langsmithConfigured,
      opentelemetry: true,
      neo4j: integrations.neo4jConfigured,
      mistral: integrations.mistralConfigured,
      deepgram: integrations.deepgramConfigured,
    },
    telemetry: {
      bufferedEvents: telemetry.length,
      redactions: telemetry.reduce(
        (sum, event) => sum + event.redactionCount,
        0,
      ),
    },
  });

  return Response.json(summary, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
