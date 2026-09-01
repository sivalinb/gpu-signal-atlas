import { recentTelemetry } from '@/core/telemetry';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get('after') ?? '0');
  const after = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  return Response.json(
    { events: recentTelemetry(after), retentionMinutes: 15, durable: false },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
