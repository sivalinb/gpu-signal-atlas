import { corpus } from '@/core/corpus';
import { analyzeTelemetryFromRetrieval, extractSignals } from '@/core/engine';
import { exportLangSmithTrace, type TraceStage } from '@/core/langsmith';
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
  const measure = () => (typeof performance === 'undefined' ? Date.now() : performance.now());
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
    const stages: TraceStage[] = [];
    const extractStarted = measure();
    const signals = extractSignals(telemetry);
    stages.push({
      name: 'rag.extract_signals',
      durationMs: measure() - extractStarted,
      status: 'ok',
      attributes: {
        'rag.xid.count': signals.xids.length,
        'rag.metric.count': signals.metrics.length,
      },
    });

    const config = getPineconeConfig();
    const retrievalStarted = measure();
    const { retrieval, vectorIndexVersion } = await retrieveFromPinecone(
      telemetry,
      config,
      corpus,
      5,
    );
    stages.push({
      name: 'rag.hybrid_retrieval',
      durationMs: measure() - retrievalStarted,
      status: 'ok',
      attributes: {
        'rag.candidate.count': retrieval.length,
        'rag.vector.backend': 'pinecone',
        'rag.vector.index': vectorIndexVersion,
      },
    });

    const generationStarted = measure();
    const analysis = analyzeTelemetryFromRetrieval(telemetry, retrieval, corpus, {
      vectorIndexVersion,
      retrievalBackend: 'pinecone',
      startedAt,
    });
    stages.push({
      name: 'rag.evidence_gate_and_generate',
      durationMs: measure() - generationStarted,
      status: 'ok',
      attributes: {
        'rag.result.status': analysis.status,
        'rag.citation.count': analysis.citations.length,
      },
    });

    const observabilityExport = await exportLangSmithTrace(
      analysis,
      signals,
      telemetry.length,
      stages,
    );
    return json({
      ...analysis,
      diagnostics: { ...analysis.diagnostics, observabilityExport },
    });
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
