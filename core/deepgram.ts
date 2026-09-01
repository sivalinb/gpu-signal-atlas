export interface DeepgramConfig {
  apiKey: string;
  baseUrl: string;
  transcriptionModel: string;
  speechModel: string;
}

export class DeepgramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeepgramError';
  }
}

export function getDeepgramConfig(
  environment: Record<string, string | undefined> = process.env,
): DeepgramConfig | undefined {
  const apiKey = environment.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) return undefined;
  return {
    apiKey,
    baseUrl: (environment.DEEPGRAM_BASE_URL?.trim() || 'https://api.deepgram.com').replace(/\/$/, ''),
    transcriptionModel: environment.DEEPGRAM_STT_MODEL?.trim() || 'nova-3',
    speechModel: environment.DEEPGRAM_TTS_MODEL?.trim() || 'aura-2-thalia-en',
  };
}

export async function transcribeAudio(
  audio: ArrayBuffer,
  contentType: string,
  config: DeepgramConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ transcript: string; confidence: number }> {
  const url = new URL('/v1/listen', config.baseUrl);
  url.searchParams.set('model', config.transcriptionModel);
  url.searchParams.set('smart_format', 'true');
  url.searchParams.set('language', 'en');
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Token ${config.apiKey}`, 'Content-Type': contentType },
    body: audio,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new DeepgramError(`Deepgram transcription returned HTTP ${response.status}.`);
  const payload = (await response.json()) as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }> }> };
  };
  const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
  const transcript = alternative?.transcript?.trim() ?? '';
  if (!transcript) throw new DeepgramError('Deepgram returned an empty transcript.');
  return { transcript, confidence: alternative?.confidence ?? 0 };
}

export async function synthesizeSpeech(
  text: string,
  config: DeepgramConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL('/v1/speak', config.baseUrl);
  url.searchParams.set('model', config.speechModel);
  url.searchParams.set('encoding', 'mp3');
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Token ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new DeepgramError(`Deepgram speech returned HTTP ${response.status}.`);
  return response;
}
