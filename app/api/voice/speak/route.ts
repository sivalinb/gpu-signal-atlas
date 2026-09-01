import { DeepgramError, getDeepgramConfig, synthesizeSpeech } from '@/core/deepgram';

interface SpeakRequest {
  text?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as SpeakRequest;
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text || text.length > 3_000) return Response.json({ error: 'Briefing text must contain 1–3,000 characters.' }, { status: 400 });
    const config = getDeepgramConfig();
    if (!config) return Response.json({ error: 'Spoken briefing is not configured.' }, { status: 503 });
    const upstream = await synthesizeSpeech(text, config);
    return new Response(upstream.body, {
      headers: { 'Cache-Control': 'no-store', 'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg' },
    });
  } catch (error) {
    if (error instanceof DeepgramError) return Response.json({ error: 'Spoken briefing failed safely.' }, { status: 503 });
    return Response.json({ error: 'Spoken briefing is unavailable.' }, { status: 503 });
  }
}
