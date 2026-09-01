import { createTelemetryEventStream } from '@/core/telemetry';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get('after') ?? request.headers.get('Last-Event-ID') ?? '0');
  const cursor = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const stream = createTelemetryEventStream(cursor);

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
