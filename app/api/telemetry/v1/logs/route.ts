import {
  ingestTelemetry,
  normalizeTelemetryPayload,
  TELEMETRY_MAX_BODY_BYTES,
} from '@/core/telemetry';

function otlpJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const expectedToken = process.env.TELEMETRY_INGEST_TOKEN?.trim();
  if (!expectedToken) {
    return otlpJson(
      { error: 'External telemetry ingestion is disabled until TELEMETRY_INGEST_TOKEN is configured.' },
      503,
    );
  }
  if (request.headers.get('x-telemetry-token') !== expectedToken) {
    return otlpJson({ error: 'Telemetry ingestion token is invalid.' }, 401);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > TELEMETRY_MAX_BODY_BYTES) {
    return otlpJson({ error: 'Telemetry body exceeds the 64 KiB limit.' }, 413);
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return otlpJson({ error: 'Telemetry body could not be read.' }, 400);
  }
  if (new TextEncoder().encode(text).byteLength > TELEMETRY_MAX_BODY_BYTES) {
    return otlpJson({ error: 'Telemetry body exceeds the 64 KiB limit.' }, 413);
  }

  try {
    const events = ingestTelemetry(normalizeTelemetryPayload(JSON.parse(text)));
    return otlpJson({ partialSuccess: {}, accepted: events.length });
  } catch (error) {
    return otlpJson(
      { error: error instanceof Error ? error.message : 'Telemetry body is invalid.' },
      400,
    );
  }
}
