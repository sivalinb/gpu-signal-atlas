'use client';

import { useRef, useState } from 'react';
import { LoaderCircle, Mic, Square, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { SignalAnalysis } from '@/core/types';

interface VoiceCaptureProps {
  configured: boolean;
  securityReady: boolean;
  turnstileToken: string | null;
  onConsumed: () => void;
  onTranscript: (transcript: string) => void;
}

export function VoiceCapture({ configured, securityReady, turnstileToken, onConsumed, onTranscript }: VoiceCaptureProps) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [message, setMessage] = useState('Speak an Xid, metric, or benchmark question.');

  async function startRecording() {
    if (!configured) return setMessage('Deepgram is not configured.');
    if (!securityReady) return setMessage('Complete the security check first.');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const next = new MediaRecorder(stream.current);
      recorder.current = next;
      next.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      next.onstop = () => void transcribe(next.mimeType || 'audio/webm');
      next.start();
      setState('recording');
      setMessage('Recording locally. Click Stop when finished.');
    } catch {
      setMessage('Microphone permission was not granted.');
    }
  }

  async function transcribe(contentType: string) {
    setState('transcribing');
    stream.current?.getTracks().forEach((track) => track.stop());
    const body = new Blob(chunks.current, { type: contentType });
    try {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'x-turnstile-token': turnstileToken ?? '' },
        body,
      });
      const payload = (await response.json()) as { transcript?: string; confidence?: number; error?: string };
      if (!response.ok || !payload.transcript) throw new Error(payload.error ?? 'Transcription failed.');
      onTranscript(payload.transcript);
      setMessage(`Transcript ready · ${Math.round((payload.confidence ?? 0) * 100)}% provider confidence`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transcription failed safely.');
    } finally {
      onConsumed();
      setState('idle');
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-black/15 p-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-medium"><Mic className="size-3.5 text-primary" /> Voice telemetry input</p>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{message} Audio is sent only after you stop.</p>
      </div>
      {state === 'recording' ? (
        <Button size="sm" variant="outline" onClick={() => recorder.current?.stop()}><Square className="size-3.5 fill-current text-red-300" /> Stop</Button>
      ) : (
        <Button size="sm" variant="outline" disabled={state === 'transcribing' || !configured} onClick={() => void startRecording()}>
          {state === 'transcribing' ? <LoaderCircle className="size-3.5 animate-spin" /> : <Mic className="size-3.5" />} {state === 'transcribing' ? 'Transcribing' : 'Record question'}
        </Button>
      )}
    </div>
  );
}

export function SpokenBriefing({ analysis, configured, securityReady, turnstileToken, onConsumed }: { analysis: SignalAnalysis; configured: boolean; securityReady: boolean; turnstileToken: string | null; onConsumed: () => void }) {
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function play() {
    if (!securityReady) return setMessage('Complete the security check before generating audio.');
    setSpeaking(true);
    setMessage(null);
    const text = `${analysis.headline}. ${analysis.documentedMeaning}. Evidence strength is ${analysis.evidenceStrength}. Next evidence: ${analysis.nextEvidence.slice(0, 2).join('. ')}`;
    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, turnstileToken }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Spoken briefing failed.');
      }
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      setMessage('Playing a Deepgram-generated briefing.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Spoken briefing failed safely.');
    } finally {
      onConsumed();
      setSpeaking(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-3">
      <p className="text-[10px] leading-4 text-muted-foreground">{message ?? 'Hear the grounded result as a concise executive briefing.'}</p>
      <Button size="sm" variant="outline" disabled={!configured || speaking} onClick={() => void play()}>{speaking ? <LoaderCircle className="size-3.5 animate-spin" /> : <Volume2 className="size-3.5" />} {speaking ? 'Generating audio' : 'Listen to briefing'}</Button>
    </div>
  );
}
