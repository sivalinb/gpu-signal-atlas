import { corpus } from '@/core/corpus';
import { analyzeTelemetryFromRetrieval } from '@/core/engine';
import {
  getPineconeConfig,
  PineconeConfigurationError,
  PineconeRequestError,
  retrieveFromPinecone,
} from '@/core/pinecone';

interface AnalyzeRequest {
  telemetry?: unknown;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = typeof performance === 'undefined' ? Date.now() : performance.now();
  let payload: AnalyzeRequest;
  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return json({ error: 'Request body must be valid JSON.', code: 'invalid_json' }, 400);
  }

  if (!payload || typeof payload !== 'object' || typeof payload.telemetry !== 'string') {
    return json({ error: 'telemetry must be a string.', code: 'invalid_telemetry' }, 400);
  }
  const telemetry = payload.telemetry.trim();
  if (telemetry.length < 1 || telemetry.length > 10_000) {
    return json(
      { error: 'telemetry must contain between 1 and 10,000 characters.', code: 'invalid_length' },
      400,
    );
  }

  try {
    const config = getPineconeConfig();
    const { retrieval, vectorIndexVersion } = await retrieveFromPinecone(
      telemetry,
      config,
      corpus,
      5,
    );
    return json(
      analyzeTelemetryFromRetrieval(telemetry, retrieval, corpus, {
        vectorIndexVersion,
        retrievalBackend: 'pinecone',
        startedAt,
      }),
    );
  } catch (error) {
    if (error instanceof PineconeConfigurationError) {
      console.error('Pinecone configuration is incomplete.');
      return json(
        { error: 'The managed evidence index is not configured.', code: 'retrieval_not_configured' },
        503,
      );
    }
    if (error instanceof PineconeRequestError) {
      console.error(`Pinecone request failed with status ${error.status}.`);
      return json(
        { error: 'The managed evidence index is temporarily unavailable.', code: 'retrieval_unavailable' },
        503,
      );
    }
    console.error('Unexpected retrieval failure.');
    return json(
      { error: 'Analysis could not be completed safely.', code: 'analysis_unavailable' },
      503,
    );
  }
}
