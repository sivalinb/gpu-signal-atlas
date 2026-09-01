import { corpus } from '@/core/corpus';
import { analyzeTelemetryFromRetrieval, extractSignals } from '@/core/engine';
import { exportLangSmithTrace, type TraceStage } from '@/core/langsmith';
import {
  generateSchemaConstrainedSignalCard,
  LlmContractError,
} from '@/core/llm';
import { getMistralConfig, MistralError } from '@/core/mistral';
import {
  getPineconeConfig,
  PineconeConfigurationError,
  PineconeRequestError,
  retrieveFromPinecone,
} from '@/core/pinecone';
import {
  recordAnalysisObservation,
  recordProviderObservation,
} from '@/core/provider-observability';

interface AnalyzeRequest {
  telemetry?: unknown;
  generationMode?: unknown;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const startedAt =
    typeof performance === 'undefined' ? Date.now() : performance.now();
  const measure = () =>
    typeof performance === 'undefined' ? Date.now() : performance.now();
  const stages: TraceStage[] = [];
  let pineconeStartedAt: number | undefined;
  let mistralStartedAt: number | undefined;
  let payload: AnalyzeRequest;
  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return json(
      { error: 'Request body must be valid JSON.', code: 'invalid_json' },
      400,
    );
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.telemetry !== 'string'
  ) {
    return json(
      { error: 'telemetry must be a string.', code: 'invalid_telemetry' },
      400,
    );
  }
  const telemetry = payload.telemetry.trim();
  if (telemetry.length < 1 || telemetry.length > 10_000) {
    return json(
      {
        error: 'telemetry must contain between 1 and 10,000 characters.',
        code: 'invalid_length',
      },
      400,
    );
  }

  try {
    const generationMode =
      payload.generationMode === 'mistral' ? 'mistral' : 'deterministic';
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
    pineconeStartedAt = retrievalStarted;
    const { retrieval, vectorIndexVersion, readUnits } =
      await retrieveFromPinecone(telemetry, config, corpus, 5);
    const retrievalDurationMs = measure() - retrievalStarted;
    recordProviderObservation({
      provider: 'pinecone',
      operation: 'query',
      durationMs: retrievalDurationMs,
      ok: true,
      readUnits,
      itemCount: retrieval.length,
    });
    stages.push({
      name: 'rag.hybrid_retrieval',
      durationMs: retrievalDurationMs,
      status: 'ok',
      attributes: {
        'rag.candidate.count': retrieval.length,
        'rag.vector.backend': 'pinecone',
        'rag.vector.index': vectorIndexVersion,
      },
    });

    const generationStarted = measure();
    let analysis = analyzeTelemetryFromRetrieval(telemetry, retrieval, corpus, {
      vectorIndexVersion,
      retrievalBackend: 'pinecone',
      startedAt,
    });
    if (generationMode === 'mistral' && analysis.status !== 'refused') {
      const mistral = getMistralConfig();
      if (!mistral)
        throw new MistralError('Mistral generation is not configured.');
      const boundedQuery = JSON.stringify({
        xids: signals.xids,
        metrics: signals.metrics,
        gpuModels: signals.gpuModels,
        driverBranches: signals.driverBranches,
      });
      mistralStartedAt = measure();
      analysis = await generateSchemaConstrainedSignalCard(
        boundedQuery,
        analysis,
        {
          baseUrl: mistral.baseUrl,
          apiKey: mistral.apiKey,
          model: mistral.chatModel,
        },
      );
      recordProviderObservation({
        provider: 'mistral',
        operation: 'schema_constrained_generation',
        durationMs: measure() - mistralStartedAt,
        ok: true,
        itemCount: 1,
      });
    }
    stages.push({
      name: 'rag.evidence_gate_and_generate',
      durationMs: measure() - generationStarted,
      status: 'ok',
      attributes: {
        'rag.result.status': analysis.status,
        'rag.citation.count': analysis.citations.length,
      },
    });

    const langSmithStarted = measure();
    const observabilityExport = await exportLangSmithTrace(
      analysis,
      signals,
      telemetry.length,
      stages,
    );
    if (observabilityExport !== 'disabled') {
      recordProviderObservation({
        provider: 'langsmith',
        operation: 'otlp_trace_export',
        durationMs: measure() - langSmithStarted,
        ok: observabilityExport === 'exported',
        itemCount: stages.length + 1,
      });
    }
    recordAnalysisObservation({
      outcome: analysis.status === 'refused' ? 'refused' : 'grounded',
      durationMs: measure() - startedAt,
      citations: analysis.citations.length,
      stages: stages.map((stage) => ({
        name: stage.name,
        durationMs: stage.durationMs,
      })),
    });
    return json({
      ...analysis,
      diagnostics: { ...analysis.diagnostics, observabilityExport },
    });
  } catch (error) {
    recordAnalysisObservation({
      outcome: 'failed',
      durationMs: measure() - startedAt,
      citations: 0,
      stages: stages.map((stage) => ({
        name: stage.name,
        durationMs: stage.durationMs,
      })),
    });
    if (error instanceof PineconeRequestError) {
      recordProviderObservation({
        provider: 'pinecone',
        operation: 'query',
        durationMs: pineconeStartedAt === undefined ? measure() - startedAt : measure() - pineconeStartedAt,
        ok: false,
      });
    }
    if (error instanceof MistralError || error instanceof LlmContractError) {
      recordProviderObservation({
        provider: 'mistral',
        operation: 'schema_constrained_generation',
        durationMs: mistralStartedAt === undefined ? measure() - startedAt : measure() - mistralStartedAt,
        ok: false,
      });
    }
    if (error instanceof MistralError || error instanceof LlmContractError) {
      console.error('Bounded Mistral generation failed contract validation.');
      return json(
        {
          error: 'Mistral could not produce a safely grounded signal card.',
          code: 'mistral_generation_failed',
        },
        503,
      );
    }
    if (error instanceof PineconeConfigurationError) {
      console.error('Pinecone configuration is incomplete.');
      return json(
        {
          error: 'The managed evidence index is not configured.',
          code: 'retrieval_not_configured',
        },
        503,
      );
    }
    if (error instanceof PineconeRequestError) {
      console.error(`Pinecone request failed with status ${error.status}.`);
      return json(
        {
          error: 'The managed evidence index is temporarily unavailable.',
          code: 'retrieval_unavailable',
        },
        503,
      );
    }
    console.error('Unexpected retrieval failure.');
    return json(
      {
        error: 'Analysis could not be completed safely.',
        code: 'analysis_unavailable',
      },
      503,
    );
  }
}
