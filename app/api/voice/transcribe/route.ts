import { DeepgramError, getDeepgramConfig, transcribeAudio } from '@/core/deepgram';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    const config = getDeepgramConfig();
    if (!config) return Response.json({ error: 'Voice transcription is not configured.' }, { status: 503 });
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (declared > MAX_AUDIO_BYTES) return Response.json({ error: 'Audio exceeds the 5 MiB limit.' }, { status: 413 });
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.startsWith('audio/')) return Response.json({ error: 'An audio content type is required.' }, { status: 415 });
    const audio = await request.arrayBuffer();
    if (!audio.byteLength || audio.byteLength > MAX_AUDIO_BYTES) {
      return Response.json({ error: 'Audio must contain 1 byte to 5 MiB.' }, { status: 400 });
    }
    return Response.json(await transcribeAudio(audio, contentType, config), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof DeepgramError) return Response.json({ error: 'Voice transcription failed safely.' }, { status: 503 });
    return Response.json({ error: 'Voice transcription is unavailable.' }, { status: 503 });
  }
}
