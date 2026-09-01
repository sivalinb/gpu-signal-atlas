import { buildDecisionReport, defaultSlo } from '@/core/benchmark';

interface CompareRequest {
  baselineId?: unknown;
  candidateId?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  let payload: CompareRequest;
  try {
    payload = (await request.json()) as CompareRequest;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (typeof payload.baselineId !== 'string' || typeof payload.candidateId !== 'string') {
    return Response.json({ error: 'baselineId and candidateId are required.' }, { status: 400 });
  }
  try {
    return Response.json(buildDecisionReport(payload.baselineId, payload.candidateId, defaultSlo), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'One or more benchmark run IDs are unknown.' }, { status: 404 });
  }
}
