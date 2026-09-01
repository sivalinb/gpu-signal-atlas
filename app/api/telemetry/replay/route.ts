import { samples } from '@/core/samples';
import { ingestTelemetry } from '@/core/telemetry';

interface ReplayRequest {
  sampleId?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  let payload: ReplayRequest;
  try {
    payload = (await request.json()) as ReplayRequest;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const sample = samples.find((candidate) => candidate.id === payload.sampleId) ?? samples[0];
  const [event] = ingestTelemetry([
    {
      message: sample.text,
      source: 'guided-replay',
      attributes: {
        'service.name': 'gpu-signal-replay',
        'service.namespace': 'gpu-observability',
        'deployment.environment.name': 'public-demo',
        'event.domain': 'gpu',
        'telemetry.source': 'fluent-bit',
        'signal.type': sample.id.startsWith('xid') ? 'nvidia-xid' : 'dcgm-metric',
        'internal.demo.session': 'must-not-reach-browser',
      },
    },
  ]);

  return Response.json(
    { accepted: true, event },
    { status: 202, headers: { 'Cache-Control': 'no-store' } },
  );
}
