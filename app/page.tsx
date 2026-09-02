'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  Cpu,
  Database,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Gauge,
  GitBranch,
  Layers3,
  LoaderCircle,
  Network,
  Pause,
  Play,
  Radar,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  WandSparkles,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PerformanceWorkbench } from '@/components/performance-workbench';
import { IntelligenceFabric } from '@/components/intelligence-fabric';
import { ProviderObservability } from '@/components/provider-observability';
import { Week4EvaluationLab } from '@/components/week4-evaluation-lab';
import { SpokenBriefing, VoiceCapture } from '@/components/voice-controls';
import { corpus } from '@/core/corpus';
import { samples } from '@/core/samples';
import type { IntegrationStatus } from '@/core/integrations';
import type { TelemetryEvent } from '@/core/telemetry';
import type { SignalAnalysis } from '@/core/types';

interface AnalysisErrorPayload {
  error?: string;
}

async function requestSignalAnalysis(
  telemetry: string,
  options: { generationMode?: 'deterministic' | 'mistral'; signal?: AbortSignal } = {},
): Promise<SignalAnalysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telemetry, generationMode: options.generationMode }),
    cache: 'no-store',
    signal: options.signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as AnalysisErrorPayload;
    throw new Error(payload.error ?? 'Analysis is temporarily unavailable.');
  }
  return (await response.json()) as SignalAnalysis;
}

async function requestIntegrationStatus(signal?: AbortSignal): Promise<IntegrationStatus> {
  const response = await fetch('/api/integrations', { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Integration status is unavailable.');
  return (await response.json()) as IntegrationStatus;
}

const evaluationMetrics = [
  ['Recall@5', '100%', '100 labeled cases'],
  ['MRR', '0.951', '31-case rank quality'],
  ['Citations', '100%', 'retriever-backed'],
  ['Refusals', '100%', 'precision & recall'],
];

const retrievalAblation = [
  ['BM25 only', '100.0%', '0.931', '100%'],
  ['Vector only', '91.7%', '0.753', '91.7%'],
  ['Hybrid RRF', '95.8%', '0.889', '95.8%'],
  ['Hybrid + rerank', '100.0%', '0.951', '100%'],
];

const flow = [
  {
    icon: Activity,
    number: '01',
    title: 'Extract',
    text: 'Parse Xids, DCGM fields, GPU models, and driver branches from raw telemetry.',
  },
  {
    icon: Braces,
    number: '02',
    title: 'Embed',
    text: 'Encode the query into the same deterministic 256-dimensional space used by Pinecone.',
  },
  {
    icon: Search,
    number: '03',
    title: 'Retrieve',
    text: 'Fuse vector similarity and BM25 ranks, then boost exact telemetry identifiers.',
  },
  {
    icon: Layers3,
    number: '04',
    title: 'Rerank',
    text: 'Prioritize identifier coverage, hardware context, authority, and query relevance.',
  },
  {
    icon: ShieldAlert,
    number: '05',
    title: 'Ground or refuse',
    text: 'Generate a signal card from retrieved passages—or stop when the corpus cannot support an answer.',
  },
];

const walkthroughSteps = [
  {
    icon: FileCheck2,
    number: '01',
    short: 'Ingest',
    title: 'Allow-listed sources enter a review queue',
    technology: 'Source manifest · optional You.com Search · FNV-1a fingerprint',
    explanation: 'You.com can discover current vendor pages from an explicit domain allow-list. Every result enters a pending-review queue with provenance and a content hash; discovery never changes Pinecone or operational guidance automatically.',
    input: 'NVIDIA Xid catalog + DCGM field reference',
    output: 'Candidate snapshot · ETag · content hash',
  },
  {
    icon: ShieldAlert,
    number: '02',
    short: 'Clean',
    title: 'Cleaning and freshness gates protect the corpus',
    technology: 'HTML cleaner · 7-day SLA · human review',
    explanation: 'Navigation and page chrome are removed while headings, tables, identifiers, and code survive. Changed meaning or applicability must pass human review and regression tests.',
    input: 'Rolling documentation page',
    output: 'Reviewed text · freshness status: fresh',
  },
  {
    icon: Layers3,
    number: '03',
    short: 'Chunk',
    title: 'Structure-aware records preserve signal meaning',
    technology: 'Identifier-centered chunks · authority metadata',
    explanation: 'Each Xid or DCGM concept becomes one bounded record with meaning, evidence, limitations, compatibility, source authority, and a citation URL.',
    input: 'Page containing Xids 13, 31, 43, 48, 79, 154',
    output: 'One reviewed record per identifier',
  },
  {
    icon: Database,
    number: '04',
    short: 'Index',
    title: 'Reviewed vectors are promoted to Pinecone',
    technology: '256d feature hash · Pinecone serverless · versioned namespace',
    explanation: 'The sync workflow upserts one normalized vector per reviewed corpus record. Stable IDs, review metadata, and a versioned namespace keep promotion and rollback auditable.',
    input: '17 reviewed records',
    output: '17 vectors in corpus-2026-08-31',
  },
  {
    icon: Activity,
    number: '05',
    short: 'Extract',
    title: 'Raw telemetry becomes exact searchable signals',
    technology: 'Xid/DCGM parser · GPU and driver context',
    explanation: 'The analyzer extracts Xid 79, the PCIe replay metric, H100, and R565 before retrieval. Unknown exact identifiers are remembered for the refusal gate.',
    input: 'NVRM Xid 79 · PCIE_REPLAY_COUNTER=184 · H100 · R565',
    output: 'Xid 79 · DCGM field · H100 · R565',
  },
  {
    icon: Search,
    number: '06',
    short: 'Retrieve',
    title: 'Sparse and vector retrieval run side by side',
    technology: 'BM25 · Pinecone cosine search · top-k',
    explanation: 'BM25 protects exact machine identifiers while Pinecone supplies managed semantic candidates. Both preserve their independent rank for inspection.',
    input: 'Parsed query + Pinecone corpus namespace',
    output: 'Sparse rank S1 · vector rank V1',
  },
  {
    icon: GitBranch,
    number: '07',
    short: 'Rerank',
    title: 'RRF and bounded context boosts reorder evidence',
    technology: 'Reciprocal-rank fusion · exact-ID/model/driver boosts',
    explanation: 'Rank fusion combines incomparable score spaces. Small bounded boosts reward exact telemetry coverage and compatible hardware context without turning scores into probabilities.',
    input: 'BM25 ranks + vector ranks + extracted context',
    output: 'Top 5 evidence trace with decision reasons',
  },
  {
    icon: ShieldAlert,
    number: '08',
    short: 'Gate',
    title: 'The evidence boundary decides answer or refusal',
    technology: 'Known-ID check · supported-intent routing',
    explanation: 'Known identifiers and supported semantic intent can proceed. Xid 999, unrelated questions, and unsupported same-domain telemetry stop with zero citations.',
    input: 'Top evidence + unknown-signal list',
    output: 'Grounded · needs investigation · or refused',
  },
  {
    icon: WandSparkles,
    number: '09',
    short: 'Generate',
    title: 'A schema-constrained signal card closes the loop',
    technology: 'Deterministic template · optional strict LLM JSON schema',
    explanation: 'The default template copies reviewed fields. Optional model mode can compose the same contract, but post-validation rejects unknown citations and any claim not reproduced from cited evidence.',
    input: 'Only retrieved, reviewed evidence fields',
    output: 'Signal card · citations · redacted LangSmith trace',
  },
];

function PipelineWalkthrough() {
  const [activeStep, setActiveStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (activeStep >= walkthroughSteps.length - 1) setRunning(false);
      else setActiveStep((current) => current + 1);
    }, 1150);
    return () => window.clearTimeout(timer);
  }, [activeStep, running]);

  const step = walkthroughSteps[activeStep];
  return (
    <section id="walkthrough" className="relative z-10 border-y border-border/70 bg-[radial-gradient(circle_at_18%_15%,oklch(0.82_0.16_165/.08),transparent_34%),linear-gradient(180deg,oklch(0.18_0.02_240),oklch(0.145_0.015_250))] py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Interactive visual demo</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Watch one signal travel through the complete RAG system.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">One button advances from reviewed source ingestion to a grounded, cited signal card. Select any stage to inspect its technology, input, and output.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setRunning(false); setActiveStep(0); }}>
              <RefreshCw className="size-4" /> Reset
            </Button>
            <Button
              className="min-w-48 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                if (activeStep === walkthroughSteps.length - 1) setActiveStep(0);
                setRunning((current) => !current);
              }}
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? 'Pause pipeline' : activeStep === 0 ? 'Run full pipeline' : 'Continue pipeline'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto pb-3">
          <ol className="grid min-w-[980px] grid-cols-9 gap-2" aria-label="RAG pipeline stages">
            {walkthroughSteps.map((item, index) => {
              const complete = index < activeStep;
              const active = index === activeStep;
              return (
                <li key={item.number}>
                  <button
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => { setRunning(false); setActiveStep(index); }}
                    className={`group relative h-full w-full rounded-xl border px-3 py-3 text-left transition ${active ? 'border-primary/60 bg-primary/12 shadow-lg shadow-primary/5' : complete ? 'border-primary/20 bg-primary/[0.045]' : 'border-border/70 bg-black/15 hover:border-primary/25'}`}
                  >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`grid size-7 place-items-center rounded-lg ${active || complete ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {complete ? <Check className="size-3.5" /> : <item.icon className="size-3.5" />}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">{item.number}</span>
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{item.short}</span>
                  {index < walkthroughSteps.length - 1 && <ChevronRight className="absolute -right-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/45" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-[1.2fr_.8fr]" aria-live="polite">
          <Card className="overflow-hidden border border-primary/20 bg-card/85">
            <CardContent className="p-0">
              <div className="grid gap-0 sm:grid-cols-[110px_1fr]">
                <div className="grid min-h-44 place-items-center border-b border-primary/15 bg-primary/[0.055] p-5 sm:border-b-0 sm:border-r">
                  <div className="text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary"><step.icon className="size-6" /></span>
                    <p className="mt-3 font-mono text-xs text-primary">STEP {step.number}</p>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <Badge variant="outline" className="border-primary/25 bg-primary/5 font-mono text-[10px] text-primary">{step.technology}</Badge>
                  <h3 className="mt-4 font-heading text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.explanation}</p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((activeStep + 1) / walkthroughSteps.length) * 100}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/70 bg-black/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Workflow className="size-4 text-primary" /> Live stage artifact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Input</p>
                <p className="mt-2 leading-5 text-slate-300">{step.input}</p>
              </div>
              <div className="flex justify-center"><ChevronRight className="size-4 rotate-90 text-primary" /></div>
              <div className="rounded-xl border border-primary/20 bg-primary/[0.055] p-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-primary">Output</p>
                <p className="mt-2 leading-5 text-slate-200">{step.output}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const telemetryFlowSteps = [
  {
    icon: Cpu,
    short: 'GPU source',
    technology: 'NVIDIA kernel · DCGM',
    artifact: 'Synthetic Xid/DCGM event',
    explanation: 'A GPU node emits a kernel event or metric snapshot. The public demo uses labeled synthetic data; the local path can tail your own allow-listed file.',
  },
  {
    icon: Activity,
    short: 'Fluent Bit',
    technology: 'Tail input · record modifier',
    artifact: 'Enriched log record',
    explanation: 'Fluent Bit tails the event, adds service, environment, domain, and source metadata, then exports it as OTLP logs.',
  },
  {
    icon: Network,
    short: 'OTel Collector',
    technology: 'OTLP/HTTP · resource · batch',
    artifact: 'Normalized OTLP JSON batch',
    explanation: 'The Collector receives OTLP, normalizes resource identity, batches records, keeps its debug exporter, and fans out to the local gateway.',
  },
  {
    icon: ShieldAlert,
    short: 'Safe gateway',
    technology: 'Token auth · 64 KiB cap · allow-list',
    artifact: 'Sanitized telemetry envelope',
    explanation: 'The gateway rejects unauthenticated external writes, bounds batches, removes unapproved attributes, and redacts inline secrets and workload identifiers.',
  },
  {
    icon: Workflow,
    short: 'SSE stream',
    technology: 'SSE + HTTPS fallback · 15 min buffer',
    artifact: 'Browser-safe event',
    explanation: 'Only sanitized envelopes enter an ephemeral ring buffer. A reconnecting SSE channel carries events to the browser; a clearly labeled HTTPS poll preserves the same contract when an edge proxy buffers streams.',
  },
  {
    icon: TerminalSquare,
    short: 'Telemetry inbox',
    technology: 'React · explicit user action',
    artifact: 'Selected snapshot',
    explanation: 'The browser shows what arrived and what was redacted. Collection never triggers an AI diagnosis automatically; the user must select Analyze.',
  },
  {
    icon: Braces,
    short: 'Evidence API',
    technology: 'Signal parser · server-only adapters',
    artifact: 'Xids, metrics, model, driver',
    explanation: 'The analyzer sends only the selected sanitized snapshot to a server route, extracts exact observability signals, and keeps credentials off the client.',
  },
  {
    icon: Database,
    short: 'Hybrid retrieval',
    technology: 'Pinecone · BM25 · RRF',
    artifact: 'Reranked evidence trace',
    explanation: 'Pinecone dense candidates and exact-token BM25 results are fused and reranked against the versioned, reviewed corpus.',
  },
  {
    icon: ShieldAlert,
    short: 'Evidence gate',
    technology: 'Known-ID check · claim grounding',
    artifact: 'Cited card or refusal',
    explanation: 'Unsupported identifiers stop with zero diagnostic citations. Supported signals become a bounded card using only reviewed evidence.',
  },
  {
    icon: Radar,
    short: 'AI observability',
    technology: 'OpenTelemetry spans · LangSmith',
    artifact: 'Redacted RAG trace',
    explanation: 'Extraction, retrieval, gate, timing, and outcome metadata can fan out to LangSmith. The original GPU message is excluded from the trace export.',
  },
] as const;

const waitFor = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function TelemetryFlowDemo({
  onAnalyze,
}: {
  onAnalyze: (message: string) => Promise<SignalAnalysis | undefined>;
}) {
  const [mode, setMode] = useState<'guided' | 'live'>('guided');
  const [activeStage, setActiveStage] = useState(-1);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);
  const [running, setRunning] = useState(false);
  const [streamState, setStreamState] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'polling'>('idle');
  const [outcome, setOutcome] = useState<string>('Waiting for a replay.');

  useEffect(() => {
    if (mode !== 'live') return;
    let cancelled = false;
    let cursor = 0;
    let pollTimer: number | undefined;

    const receive = (event: TelemetryEvent, transport: 'SSE' | 'HTTPS poll') => {
      cursor = Math.max(cursor, event.sequence);
      setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, 6));
      setSelectedEvent((current) => current ?? event);
      setActiveStage(5);
      setOutcome(`Sanitized event arrived through the ${transport} telemetry inbox.`);
    };

    const poll = async () => {
      try {
        const response = await fetch(`/api/telemetry/recent?after=${cursor}`, { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as { events: TelemetryEvent[] };
        for (const event of payload.events) receive(event, 'HTTPS poll');
      } catch {
        // EventSource continues reconnecting; the next bounded poll retries.
      }
    };

    const startPollingFallback = () => {
      if (cancelled || pollTimer !== undefined) return;
      setStreamState('polling');
      void poll();
      pollTimer = window.setInterval(() => void poll(), 1_500);
    };

    const stream = new EventSource('/api/telemetry/stream');
    stream.addEventListener('ready', () => {
      setStreamState('connected');
      window.clearTimeout(fallbackTimer);
      if (pollTimer !== undefined) window.clearInterval(pollTimer);
      pollTimer = undefined;
    });
    stream.addEventListener('telemetry', (message) => {
      const event = JSON.parse((message as MessageEvent<string>).data) as TelemetryEvent;
      receive(event, 'SSE');
    });
    stream.onerror = () => {
      setStreamState((current) => (current === 'polling' ? current : 'reconnecting'));
      startPollingFallback();
    };
    const fallbackTimer = window.setTimeout(startPollingFallback, 2_500);
    return () => {
      cancelled = true;
      stream.close();
      window.clearTimeout(fallbackTimer);
      if (pollTimer !== undefined) window.clearInterval(pollTimer);
    };
  }, [mode]);

  async function emitSyntheticEvent(sampleId: string = samples[0].id): Promise<TelemetryEvent> {
    const response = await fetch('/api/telemetry/replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('The safe replay gateway did not accept the event.');
    const payload = (await response.json()) as { event: TelemetryEvent };
    setEvents((current) => [payload.event, ...current.filter((item) => item.id !== payload.event.id)].slice(0, 6));
    setSelectedEvent(payload.event);
    return payload.event;
  }

  async function runGuidedReplay(): Promise<void> {
    if (running) return;
    setRunning(true);
    setOutcome('Synthetic GPU event emitted.');
    setActiveStage(0);
    try {
      for (let stage = 1; stage <= 2; stage += 1) {
        await waitFor(520);
        setActiveStage(stage);
      }
      await waitFor(520);
      const event = await emitSyntheticEvent();
      setActiveStage(3);
      setOutcome(`Gateway accepted the event and removed ${event.redactionCount} unapproved field${event.redactionCount === 1 ? '' : 's'}.`);
      for (let stage = 4; stage <= 5; stage += 1) {
        await waitFor(620);
        setActiveStage(stage);
      }
      setOutcome('User-approved analysis is now running on the sanitized snapshot.');
      setActiveStage(6);
      const resultPromise = onAnalyze(event.message);
      await waitFor(650);
      setActiveStage(7);
      const result = await resultPromise;
      setActiveStage(8);
      setOutcome(
        result
          ? `${result.status === 'refused' ? 'Evidence boundary refused unsupported telemetry' : 'Grounded signal card generated'} with ${result.citations.length} citation${result.citations.length === 1 ? '' : 's'}.`
          : 'Analysis stopped safely because evidence retrieval was unavailable.',
      );
      await waitFor(700);
      setActiveStage(9);
    } catch (error) {
      setOutcome(error instanceof Error ? error.message : 'The guided replay could not complete.');
    } finally {
      setRunning(false);
    }
  }

  async function emitLiveReplay(): Promise<void> {
    if (running) return;
    setRunning(true);
    setActiveStage(0);
    setOutcome('Sending one labeled synthetic event through the safe gateway.');
    try {
      await waitFor(300);
      setActiveStage(1);
      await waitFor(300);
      setActiveStage(2);
      const event = await emitSyntheticEvent(samples[events.length % samples.length].id);
      setActiveStage(5);
      setOutcome(`Gateway accepted event ${event.id}; ${event.redactionCount} field${event.redactionCount === 1 ? '' : 's'} removed before browser delivery.`);
    } catch (error) {
      setOutcome(error instanceof Error ? error.message : 'The live replay could not be emitted.');
    } finally {
      setRunning(false);
    }
  }

  async function analyzeSelected(): Promise<void> {
    if (!selectedEvent || running) return;
    setRunning(true);
    setActiveStage(6);
    setOutcome('Analyzing only the selected sanitized snapshot.');
    const resultPromise = onAnalyze(selectedEvent.message);
    await waitFor(500);
    setActiveStage(7);
    const result = await resultPromise;
    setActiveStage(8);
    setOutcome(
      result
        ? `${result.status === 'refused' ? 'Safely refused' : 'Signal card ready'} · ${result.citations.length} citations · ${result.diagnostics.retrievalBackend}`
        : 'Analysis stopped safely because the evidence service was unavailable.',
    );
    await waitFor(500);
    setActiveStage(9);
    setRunning(false);
  }

  const inspectedStage = telemetryFlowSteps[Math.max(activeStage, 0)];
  return (
    <section id="telemetry-flow" className="relative z-10 border-b border-border/70 bg-[radial-gradient(circle_at_80%_10%,oklch(0.82_0.16_165/.08),transparent_30%),linear-gradient(180deg,oklch(0.145_0.015_250),oklch(0.175_0.02_242))] py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Live telemetry integration</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">See collection, sanitization, retrieval, and AI observability move as one system.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Guided replay demonstrates every component automatically. Live mode opens the real SSE inbox used by the local Fluent Bit → OpenTelemetry Collector → gateway workflow, with a labeled HTTPS fallback when an edge host buffers streams.</p>
          </div>
          <fieldset className="flex rounded-xl border border-border/70 bg-black/20 p-1">
            <legend className="sr-only">Telemetry demo mode</legend>
            <Button size="sm" variant={mode === 'guided' ? 'secondary' : 'ghost'} onClick={() => { setStreamState('idle'); setMode('guided'); }}>Guided replay</Button>
            <Button size="sm" variant={mode === 'live' ? 'secondary' : 'ghost'} onClick={() => { setStreamState('connecting'); setMode('live'); }}>Live telemetry</Button>
          </fieldset>
        </div>

        <Card className="overflow-hidden border border-primary/20 bg-card/80">
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><Network className="size-4 text-primary" /> Component flow</CardTitle>
                <CardDescription className="mt-1">Green means completed; the bright node is the component currently handling the signal.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {mode === 'live' && (
                  <Badge variant="outline" className={streamState === 'connected' || streamState === 'polling' ? 'border-emerald-400/25 bg-emerald-400/8 text-emerald-300' : 'border-amber-300/20 bg-amber-300/5 text-amber-200'}>
                    <span className={`size-1.5 rounded-full ${streamState === 'connected' || streamState === 'polling' ? 'bg-emerald-300' : 'bg-amber-300'}`} /> {streamState === 'polling' ? 'Live HTTPS fallback' : `SSE ${streamState}`}
                  </Badge>
                )}
                <Button disabled={running} onClick={() => void (mode === 'guided' ? runGuidedReplay() : emitLiveReplay())} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {running ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                  {mode === 'guided' ? 'Run end-to-end flow' : 'Emit safe replay'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="overflow-x-auto pb-3">
              <ol className="grid min-w-[1180px] grid-cols-10 gap-2" aria-label="Telemetry to RAG component flow">
                {telemetryFlowSteps.map((step, index) => {
                  const complete = index < activeStage;
                  const active = index === activeStage;
                  return (
                    <li key={step.short}>
                      <button type="button" onClick={() => setActiveStage(index)} className={`group relative h-full min-h-28 w-full rounded-xl border p-3 text-left transition ${active ? 'border-primary/60 bg-primary/12 shadow-lg shadow-primary/8' : complete ? 'border-emerald-400/20 bg-emerald-400/[0.045]' : 'border-border/70 bg-black/15 hover:border-primary/30'}`}>
                        <span className={`grid size-8 place-items-center rounded-lg ${active ? 'bg-primary/18 text-primary' : complete ? 'bg-emerald-400/10 text-emerald-300' : 'bg-muted text-muted-foreground'}`}>{complete ? <Check className="size-4" /> : <step.icon className="size-4" />}</span>
                        <p className={`mt-4 text-xs font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{step.short}</p>
                        <p className="mt-1 font-mono text-[8px] leading-4 text-muted-foreground">{step.technology}</p>
                        {index < telemetryFlowSteps.length - 1 && <ChevronRight className="absolute -right-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/45" />}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-2 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.045] p-4" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Component inspector</p>
                  <span className="font-mono text-[9px] text-muted-foreground">{activeStage >= 0 ? `${activeStage + 1}/10` : 'ready'}</span>
                </div>
                <h3 className="mt-3 font-heading text-lg font-semibold">{activeStage >= 0 ? inspectedStage.short : 'Start the flow'}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeStage >= 0 ? inspectedStage.explanation : 'Run the guided replay to animate the full system, or switch to Live telemetry to watch sanitized events arrive over SSE.'}</p>
                <div className="mt-4 rounded-lg border border-border/70 bg-black/20 px-3 py-2 font-mono text-[10px] text-slate-300">{activeStage >= 0 ? inspectedStage.artifact : 'No artifact yet'}</div>
                <p className="mt-3 text-xs leading-5 text-emerald-200/80">{outcome}</p>
              </div>

              <div className="rounded-xl border border-border/70 bg-black/15 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Sanitized telemetry inbox</p>
                    <p className="mt-1 text-xs text-muted-foreground">Ephemeral · last 15 minutes · no raw secret attributes</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={!selectedEvent || running} onClick={() => void analyzeSelected()}><Search className="size-3.5" /> Analyze selected</Button>
                </div>
                {events.length === 0 ? (
                  <div className="mt-4 grid min-h-28 place-items-center rounded-xl border border-dashed border-border/70 text-center text-xs leading-5 text-muted-foreground">No events in this browser session.<br />Run a replay or send OTLP JSON locally.</div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {events.slice(0, 4).map((event) => (
                      <button key={event.id} type="button" onClick={() => setSelectedEvent(event)} className={`rounded-xl border p-3 text-left transition ${selectedEvent?.id === event.id ? 'border-primary/45 bg-primary/[0.07]' : 'border-border/70 bg-card/60 hover:border-primary/25'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="border-primary/20 font-mono text-[8px] text-primary">{event.source}</Badge>
                          <span className="font-mono text-[8px] text-muted-foreground">{event.redactionCount} removed</span>
                        </div>
                        <p className="mt-2 line-clamp-2 font-mono text-[10px] leading-4 text-slate-300">{event.message}</p>
                        <p className="mt-2 truncate font-mono text-[8px] text-muted-foreground">{event.serviceName} · {event.environment}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] px-3 py-2.5 text-emerald-100/70"><Check className="mr-2 inline size-3 text-emerald-300" />Public button emits known synthetic samples only.</p>
              <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] px-3 py-2.5 text-amber-100/70"><ShieldAlert className="mr-2 inline size-3 text-amber-300" />External OTLP writes require a server-only token.</p>
              <p className="rounded-xl border border-primary/15 bg-primary/[0.035] px-3 py-2.5 text-slate-300"><Database className="mr-2 inline size-3 text-primary" />Buffer is intentionally ephemeral, not a log archive.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SignalTokens({ analysis }: { analysis: SignalAnalysis }) {
  const tokens = [
    ...analysis.observed.xids.map((xid) => `Xid ${xid}`),
    ...analysis.observed.metrics,
    ...analysis.observed.gpuModels,
    ...analysis.observed.driverBranches,
  ];
  if (!tokens.length) return <span className="font-mono text-xs text-muted-foreground">No exact identifier extracted</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {tokens.map((token) => (
        <Badge key={token} variant="outline" className="max-w-full border-primary/25 bg-primary/7 font-mono text-primary">
          <span className="truncate">{token}</span>
        </Badge>
      ))}
    </div>
  );
}

function ResultPanel({ analysis }: { analysis: SignalAnalysis }) {
  if (analysis.status === 'refused') {
    return (
      <Card className="border border-amber-300/20 bg-amber-300/[0.035] shadow-2xl shadow-black/20">
        <CardHeader className="border-b border-amber-300/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-100">
                <ShieldAlert className="size-4 text-amber-300" /> Evidence boundary activated
              </CardTitle>
              <CardDescription className="mt-1 text-amber-100/55">No unsupported diagnosis was generated.</CardDescription>
            </div>
            <Badge className="bg-amber-300/12 text-amber-200">Refused safely</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <SignalTokens analysis={analysis} />
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/70">Why</p>
            <p className="text-sm leading-6 text-amber-50/80">{analysis.documentedMeaning}</p>
          </div>
          <div className="rounded-xl border border-amber-300/12 bg-black/15 p-4">
            <p className="text-sm font-medium text-amber-100">Add this evidence</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50/60">
              {analysis.nextEvidence.map((item) => (
                <li key={item} className="flex gap-2"><ChevronRight className="mt-1.5 size-3 shrink-0 text-amber-300" />{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-primary/20 bg-[linear-gradient(145deg,oklch(0.22_0.025_220),oklch(0.16_0.018_250))] shadow-2xl shadow-primary/5">
      <CardHeader className="border-b border-white/8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-white">{analysis.headline}</CardTitle>
            <CardDescription className="mt-1 text-slate-400">
              {analysis.citations.length} evidence passages · {analysis.evidenceStrength} evidence strength
            </CardDescription>
          </div>
          <Badge className={analysis.status === 'grounded' ? 'bg-emerald-300/12 text-emerald-200' : 'bg-amber-300/12 text-amber-200'}>
            {analysis.status === 'grounded' ? 'Grounded' : 'Check compatibility'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5 text-slate-200">
        <SignalTokens analysis={analysis} />

        <div className="grid gap-2 rounded-xl border border-primary/15 bg-primary/[0.035] p-3 font-mono text-[10px] text-slate-400 sm:grid-cols-2 lg:grid-cols-6">
          <span>trace {analysis.diagnostics.traceId.slice(0, 12)}…</span>
          <span suppressHydrationWarning>{analysis.diagnostics.durationMs.toFixed(2)} ms analysis</span>
          <span className="truncate" title={analysis.diagnostics.vectorIndexVersion}>index {analysis.diagnostics.vectorIndexVersion}</span>
          <span>{analysis.diagnostics.retrievalBackend}</span>
          <span>{analysis.diagnostics.generationMode}</span>
          <span>LangSmith {analysis.diagnostics.observabilityExport ?? 'disabled'}</span>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            <Cpu className="size-3.5" /> Documented meaning
          </p>
          <p className="text-sm leading-6 text-slate-300">{analysis.documentedMeaning}</p>
        </div>

        {analysis.compatibilityNotes.length > 0 && (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-100">
              <CircleAlert className="size-4 text-amber-300" /> Compatibility notes
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-50/60">
              {analysis.compatibilityNotes.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <FileSearch className="size-4 text-primary" /> Evidence to collect next
            </p>
            <ul className="space-y-2 text-sm leading-5 text-slate-400">
              {analysis.nextEvidence.slice(0, 4).map((item) => (
                <li key={item} className="flex gap-2"><ChevronRight className="mt-1 size-3 shrink-0 text-primary" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/15 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <ShieldAlert className="size-4 text-amber-300" /> Evidence boundary
            </p>
            <ul className="space-y-2 text-sm leading-5 text-slate-400">
              {analysis.limitations.slice(0, 3).map((item) => (
                <li key={item} className="flex gap-2"><ChevronRight className="mt-1 size-3 shrink-0 text-amber-300" />{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <BookOpen className="size-3.5" /> Citations
          </p>
          <div className="space-y-2">
            {analysis.citations.map((citation, index) => (
              <a
                key={citation.id}
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <span className="min-w-0">
                  <span className="mr-2 font-mono text-xs text-primary">[{index + 1}]</span>
                  <span className="text-sm text-slate-200">{citation.title}</span>
                  <span className="ml-2 hidden text-xs text-slate-500 sm:inline">{citation.source}</span>
                  <span className="mt-1 block truncate pl-6 font-mono text-[9px] text-slate-600">reviewed {citation.provenance.retrievedAt} · {citation.provenance.curatedContentHash}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-slate-500 transition group-hover:text-primary" />
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const productJourney = [
  { icon: Activity, label: 'Observe', detail: 'Xid · DCGM · kernel · OTLP' },
  { icon: Database, label: 'Retrieve', detail: 'Pinecone + BM25' },
  { icon: FileSearch, label: 'Explain', detail: 'Cited evidence card' },
  { icon: Gauge, label: 'Decide', detail: 'Next evidence, not guesses' },
];

function ProductHomepage() {
  return (
    <section id="home" className="relative z-10 border-b border-border/70 bg-[radial-gradient(circle_at_14%_18%,oklch(0.82_0.16_165/.13),transparent_31%),radial-gradient(circle_at_83%_15%,oklch(0.7_0.14_210/.11),transparent_29%),linear-gradient(180deg,oklch(0.16_0.018_245),oklch(0.145_0.015_250))]">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,.88fr)_minmax(520px,1.12fr)] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-primary/25 bg-primary/10 text-primary">GPU incident intelligence</Badge>
              <span className="font-mono text-[10px] uppercase tracking-[.19em] text-muted-foreground">Evidence before inference</span>
            </div>
            <h1 className="mt-6 max-w-3xl font-heading text-5xl font-semibold tracking-[-0.052em] sm:text-6xl lg:text-[70px] lg:leading-[.98]">
              Turn opaque GPU telemetry into <span className="text-primary">cited next steps.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              GPU Signal Atlas helps platform engineers move from a cryptic NVIDIA Xid event or DCGM metric to reviewed evidence, an explainable signal card, and the next data to collect—without presenting retrieval as a root-cause verdict.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#analyze" className={buttonVariants({ size: 'lg', className: 'bg-primary text-primary-foreground hover:bg-primary/90' })}><Sparkles className="size-4" /> Try a live signal</a>
              <a href="#walkthrough" className={buttonVariants({ size: 'lg', variant: 'outline' })}><Play className="size-4" /> Watch the system flow</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {['Exact identifier preservation', 'Retriever-backed citations', 'Tested refusal path'].map((item) => (
                <span key={item} className="flex items-center gap-2"><Check className="size-3.5 text-primary" /> {item}</span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.25rem] bg-primary/5 blur-3xl" />
            <figure className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card/85 shadow-2xl shadow-black/40">
              <Image
                src="/gpu-signal-atlas-journey-siva-viewing.webp"
                alt="Siva actively studying a GPU telemetry dashboard as signals move through processing, vector evidence, and cited decision-support layers"
                width={1440}
                height={898}
                priority
                sizes="(min-width: 1024px) 56vw, 100vw"
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_58%,oklch(0.11_0.012_245/.94))]" />
              <figcaption className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[.2em] text-primary">From signal to cited decision support</p>
                    <p className="mt-1 text-xs text-slate-300">Telemetry stays observable while evidence and uncertainty remain visible.</p>
                  </div>
                  <Badge variant="outline" className="hidden border-emerald-400/30 bg-black/50 text-emerald-200 sm:flex">Human-reviewed boundary</Badge>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {productJourney.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label} className="rounded-lg border border-white/10 bg-black/45 p-2 backdrop-blur-sm">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-white"><Icon className="size-3 text-primary" /><span className="hidden sm:inline">0{index + 1}</span> {step.label}</div>
                        <p className="mt-1 hidden text-[8px] leading-3 text-slate-400 sm:block">{step.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="mt-10 grid gap-3 border-t border-border/60 pt-6 sm:grid-cols-3">
          {[
            ['01', 'Paste or replay', 'Start with one NVIDIA kernel event, DCGM snapshot, or sanitized telemetry envelope.'],
            ['02', 'Follow the evidence', 'Inspect extraction, hybrid retrieval, reranking, citations, and the refusal boundary.'],
            ['03', 'Make a safer decision', 'Use documented meaning and next-evidence guidance while preserving operational uncertainty.'],
          ].map(([number, title, detail]) => (
            <div key={number} className="flex gap-3 rounded-xl border border-transparent p-3 transition hover:border-border/70 hover:bg-card/40">
              <span className="font-mono text-xs text-primary">{number}</span>
              <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [input, setInput] = useState<string>(samples[0].text);
  const [analysis, setAnalysis] = useState<SignalAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [generationMode, setGenerationMode] = useState<'deterministic' | 'mistral'>('deterministic');

  useEffect(() => {
    const controller = new AbortController();
    requestIntegrationStatus(controller.signal)
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
    return () => controller.abort();
  }, []);

  async function runAnalysis(telemetry: string): Promise<SignalAnalysis | undefined> {
    setLoading(true);
    setAnalysisError(null);
    try {
      const result = await requestSignalAnalysis(telemetry, { generationMode });
      setAnalysis(result);
      return result;
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis is temporarily unavailable.');
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:linear-gradient(to_right,oklch(0.82_0.16_165/.08)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.82_0.16_165/.06)_1px,transparent_1px)] [background-size:64px_64px]" />
      <header className="relative z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Radar className="size-5" />
            </span>
            <div>
              <p className="hidden font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground sm:block">Observability knowledge system</p>
              <p className="font-heading text-lg font-semibold tracking-tight">GPU Signal Atlas</p>
            </div>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
            <a className="transition hover:text-foreground" href="#analyze">Analyze</a>
            <a className="transition hover:text-foreground" href="#walkthrough">Visual demo</a>
            <a className="transition hover:text-foreground" href="#telemetry-flow">Telemetry</a>
            <a className="transition hover:text-foreground" href="#performance-lab">Performance</a>
            <a className="transition hover:text-foreground" href="#intelligence-fabric">Graph & voice</a>
            <a className="transition hover:text-foreground" href="#architecture">Architecture</a>
            <a className="transition hover:text-foreground" href="#integrations">AI observability</a>
            <a className="transition hover:text-foreground" href="#provider-observability">Metrics</a>
            <a className="transition hover:text-foreground" href="#week4-evaluation">Eval lab</a>
          </nav>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" /> Pinecone-backed corpus
          </Badge>
        </div>
      </header>

      <ProductHomepage />

      <section id="analyze" className="relative z-10 mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary">Citation-first GPU RAG</Badge>
              <span className="font-mono text-xs text-muted-foreground">Xid · DCGM · Kubernetes · OTLP</span>
            </div>
            <h2 className="font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-[58px] lg:leading-[1.02]">
              Inspect one signal.<br /><span className="text-primary">See every evidence decision.</span>
            </h2>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Paste an NVIDIA kernel event or DCGM metric snapshot. Hybrid retrieval turns exact identifiers and symptoms into an evidence-backed signal card—without pretending one event proves a root cause.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[360px]">
            {[
              [corpus.length.toString(), 'chunks'],
              ['48', 'evals'],
              ['0', 'browser secrets'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-border/70 bg-card/70 px-3 py-4 text-center backdrop-blur">
                <p className="font-mono text-xl text-primary">{value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]">
          <Card className="h-fit border border-border/70 bg-card/80 shadow-2xl shadow-black/20 backdrop-blur">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2"><Activity className="size-4 text-primary" /> Inspect telemetry</CardTitle>
              <CardDescription>Use a replay or paste your own event. Retrieval runs through a server-only Pinecone connection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex flex-wrap gap-2" aria-label="Sample telemetry">
                {samples.map((sample) => (
                  <Button
                    key={sample.id}
                    size="sm"
                    variant={input === sample.text ? 'secondary' : 'outline'}
                    onClick={() => setInput(sample.text)}
                  >
                    {sample.label}
                  </Button>
                ))}
              </div>
              <Textarea
                aria-label="GPU telemetry input"
                className="min-h-64 resize-y border-border/80 bg-black/20 font-mono text-[13px] leading-6"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                spellCheck={false}
              />
              <VoiceCapture
                configured={Boolean(integrationStatus?.deepgramConfigured)}
                onTranscript={(transcript) => setInput(transcript)}
              />
              <div className="grid gap-3 rounded-xl border border-border/70 bg-black/15 p-3 sm:grid-cols-[1fr_220px] sm:items-center">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[.16em] text-primary">Generation mode</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Deterministic is the default. Mistral receives extracted identifiers plus retrieved evidence—not the original raw message.</p>
                </div>
                <select aria-label="Signal card generation mode" value={generationMode} onChange={(event) => setGenerationMode(event.target.value as 'deterministic' | 'mistral')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <option value="deterministic">Deterministic template</option>
                  <option value="mistral" disabled={!integrationStatus?.mistralConfigured}>Mistral structured output</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[11px] leading-5 text-muted-foreground">BM25 + Pinecone 256d retrieval + exact-ID boost</p>
                <div className="flex gap-2">
                  <Button size="lg" variant="outline" disabled={loading} onClick={() => { setInput(samples[0].text); setAnalysis(null); setAnalysisError(null); }} aria-label="Reset sample">
                    <RefreshCw className="size-4" /> Reset
                  </Button>
                  <Button size="lg" disabled={loading} className="bg-primary px-5 text-primary-foreground hover:bg-primary/90" onClick={() => void runAnalysis(input)}>
                    {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {loading ? 'Retrieving evidence' : 'Analyze signal'}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Retrieval trace</p>
                <div className="space-y-3">
                  {loading && [0, 1, 2].map((item) => <div key={item} className="h-8 animate-pulse rounded-lg bg-muted/60" />)}
                  {!loading && analysisError && <p className="text-sm leading-6 text-amber-200">{analysisError}</p>}
                  {!loading && analysis?.retrieval.slice(0, 3).map((result, index) => (
                    <div key={result.document.id}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-muted-foreground"><span className="mr-2 font-mono text-primary">0{index + 1}</span>{result.document.title}</span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">S{result.sparseRank} · V{result.denseRank}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary/75" style={{ width: `${Math.min(100, result.score * 320)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card className="grid min-h-96 place-items-center border border-primary/15 bg-card/70">
              <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                <LoaderCircle className="size-7 animate-spin text-primary" />
                <p className="font-heading text-lg">Retrieving reviewed evidence</p>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">The server is combining Pinecone vector candidates with exact-identifier BM25 ranking.</p>
              </CardContent>
            </Card>
          ) : analysisError ? (
            <Card className="grid min-h-96 place-items-center border border-amber-300/20 bg-amber-300/[0.035]">
              <CardContent className="max-w-md pt-6 text-center">
                <ShieldAlert className="mx-auto size-7 text-amber-300" />
                <p className="mt-3 font-heading text-lg text-amber-100">Evidence retrieval unavailable</p>
                <p className="mt-2 text-sm leading-6 text-amber-50/60">{analysisError} No diagnostic response was generated.</p>
              </CardContent>
            </Card>
          ) : analysis ? (
            <div>
              <ResultPanel analysis={analysis} />
              <SpokenBriefing
                analysis={analysis}
                configured={Boolean(integrationStatus?.deepgramConfigured)}
              />
            </div>
          ) : (
            <Card className="grid min-h-96 place-items-center border border-primary/15 bg-card/70">
              <CardContent className="max-w-md pt-6 text-center">
                <ShieldAlert className="mx-auto size-7 text-primary" />
                <p className="mt-3 font-heading text-lg">Ready for an evidence request</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose deterministic or Mistral generation, then analyze a sample, pasted event, or voice transcript.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <PipelineWalkthrough />

      <TelemetryFlowDemo
        onAnalyze={async (message) => {
          setInput(message);
          return runAnalysis(message);
        }}
      />

      <PerformanceWorkbench />

      <IntelligenceFabric status={integrationStatus} />

      <section id="architecture" className="relative z-10 border-y border-border/70 bg-black/10 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">System flow</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">A transparent RAG path, not an agent maze.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">Every transformation is inspectable. Production dense retrieval uses a versioned Pinecone namespace; BM25, reranking, evidence gating, and deterministic generation remain explicit application controls.</p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-5">
            {flow.map((step) => (
              <article key={step.number} className="relative bg-card p-5">
                <div className="mb-8 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl border border-primary/20 bg-primary/7 text-primary"><step.icon className="size-4" /></span>
                  <span className="font-mono text-[10px] text-muted-foreground">{step.number}</span>
                </div>
                <h3 className="font-heading text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <Card className="border border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="size-4 text-primary" /> Telemetry integration</CardTitle>
                <CardDescription>Implemented collection replay with a sanitized browser inbox and an explicit analysis boundary.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                  {['GPU/kernel log', 'Fluent Bit', 'OTel Collector', 'Safe gateway', 'SSE inbox', 'Evidence API'].map((label, index) => (
                    <span key={label} className="contents">
                      <span className="rounded-lg border border-border bg-black/15 px-3 py-2 text-foreground">{label}</span>
                      {index < 5 && <ChevronRight className="size-3.5 text-primary" />}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">The Collector keeps detailed debug output and also posts OTLP JSON to a token-gated local gateway. The gateway bounds, allow-lists, redacts, and buffers events before SSE delivery. Analysis remains an explicit user action; only the selected sanitized snapshot reaches the evidence API, and only redacted RAG spans can fan out to LangSmith.</p>
              </CardContent>
            </Card>
            <Card className="border border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitBranch className="size-4 text-primary" /> Safety contract</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {['No production writes', 'No hidden evaluator labels', 'No uncited diagnosis', 'No browser-exposed secrets'].map((item) => (
                  <p key={item} className="flex items-center gap-2"><Check className="size-3.5 text-primary" />{item}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="integrations" className="relative z-10 border-b border-border/70 bg-[radial-gradient(circle_at_82%_12%,oklch(0.82_0.16_165/.07),transparent_32%),linear-gradient(180deg,oklch(0.145_0.015_250),oklch(0.17_0.018_245))] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 grid gap-5 lg:grid-cols-[1fr_.75fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Technology and data mapping</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">One evidence system, deliberately separated control planes.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">You.com discovers review candidates, Pinecone serves approved evidence, Neo4j exposes relationships, Mistral offers grounded generation, Deepgram adds opt-in voice, and LangSmith explains RAG behavior. Each provider has one bounded job.</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.055] p-4 text-xs leading-5 text-muted-foreground">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Deployment truth</p>
              <p className="mt-2">
                <span className="text-foreground">{integrationStatus?.pineconeConfigured ? 'Pinecone is active.' : 'Pinecone configuration is unavailable.'}</span>{' '}
                You.com is <span className="text-foreground">{integrationStatus?.youConfigured ? 'configured' : 'optional'}</span>, LangSmith is <span className="text-foreground">{integrationStatus?.langsmithConfigured ? 'configured' : 'optional'}</span>, and the multimodal provider state is shown in the live fabric below. No provider key is returned to the browser.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: FileSearch,
                eyebrow: 'Corpus intelligence',
                title: 'Discover → review → promote',
                status: integrationStatus?.youConfigured ? 'Configured · discovery ready' : 'Optional adapter implemented',
                steps: ['Approved public domains', 'You.com Search + page content', 'Pending-review candidates', 'Human approval + regression tests', 'Pinecone versioned namespace'],
                boundary: 'No pasted telemetry. No automatic index writes.',
              },
              {
                icon: Database,
                eyebrow: 'Runtime evidence',
                title: 'Retrieve → gate → cite',
                status: integrationStatus?.pineconeConfigured ? 'Production path active' : 'Configuration required',
                steps: ['Submitted telemetry snapshot', 'Exact signal extraction', 'Pinecone candidates + BM25', 'RRF and evidence boundary', 'Grounded card or refusal'],
                boundary: 'Only reviewed corpus records can support a citation.',
              },
              {
                icon: Activity,
                eyebrow: 'AI observability',
                title: 'Trace → evaluate → improve',
                status: integrationStatus?.langsmithConfigured ? 'Configured · trace export enabled' : 'Optional export implemented',
                steps: ['Redacted OpenTelemetry spans', 'Extraction/retrieval/gate timing', 'LangSmith project traces', 'Datasets and evaluators', 'Regression and drift review'],
                boundary: 'Identifiers, ranks, timing, outcomes—never raw telemetry.',
              },
            ].map((lane) => (
              <Card key={lane.eyebrow} className="overflow-hidden border border-border/70 bg-card/80">
                <CardHeader className="border-b border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><lane.icon className="size-4" /></span>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 font-mono text-[9px] text-primary">{lane.status}</Badge>
                  </div>
                  <CardDescription className="pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">{lane.eyebrow}</CardDescription>
                  <CardTitle className="text-lg">{lane.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <ol className="space-y-2">
                    {lane.steps.map((item, index) => (
                      <li key={item} className="flex items-center gap-3 rounded-xl border border-border/60 bg-black/15 px-3 py-2.5 text-xs">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/12 font-mono text-[9px] text-primary">{index + 1}</span>
                        <span className="text-slate-300">{item}</span>
                        {index < lane.steps.length - 1 && <ChevronRight className="ml-auto size-3 shrink-0 text-primary/40" />}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 rounded-xl border border-amber-300/12 bg-amber-300/[0.035] px-3 py-2 text-[11px] leading-5 text-amber-100/65"><ShieldAlert className="mr-2 inline size-3 text-amber-300" />{lane.boundary}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-5 border border-primary/20 bg-primary/[0.025]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Workflow className="size-4 text-primary" /> Technology responsibility matrix</CardTitle>
              <CardDescription>Collection, evidence, and AI quality are separate concerns connected by inspectable contracts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
              {[
                ['Fluent Bit', 'Collect + enrich GPU and Kubernetes logs', 'OTLP logs'],
                ['OpenTelemetry', 'Normalize telemetry and emit redacted RAG spans', 'Logs + traces'],
                ['Safe gateway', 'Authenticate, bound, redact, and stream selected telemetry', 'Sanitized SSE'],
                ['You.com', 'Discover allow-listed public documentation', 'Review candidates'],
                ['Pinecone', 'Serve approved dense-vector candidates', 'Versioned vectors'],
                ['Neo4j', 'Connect signals, evidence, benchmark runs, and technologies', 'Bounded graph paths'],
                ['Mistral', 'Generate grounded schema output and compare embeddings', 'JSON + ablation'],
                ['Deepgram', 'Transcribe opt-in audio and synthesize a briefing', 'Text + MP3'],
                ['LangSmith', 'Inspect RAG traces and run evaluation datasets', 'Quality signals'],
              ].map(([technology, responsibility, artifact]) => (
                <div key={technology} className="rounded-xl border border-border/70 bg-black/15 p-4">
                  <p className="font-heading text-sm font-semibold text-primary">{technology}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{responsibility}</p>
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{artifact}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <ProviderObservability />

      <Week4EvaluationLab />

      <section id="evaluation" className="relative z-10 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Evaluation evidence</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Retrieval quality is a test, not a screenshot.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">The frozen suite covers exact identifiers, semantic symptoms, multi-source questions, unsupported inputs, known regressions, and adversarial prompts. Metrics below are reproducible locally from the Python evaluation harness.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {evaluationMetrics.map(([label, value, note]) => (
              <Card key={label} className="border border-border/70 bg-card/80">
                <CardContent className="pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                  <p className="mt-3 font-mono text-3xl text-primary">{value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{note}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-5 border border-primary/20 bg-primary/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GitBranch className="size-4 text-primary" /> Retrieval and chunking ablations</CardTitle>
              <CardDescription>Same expectations, isolated strategy changes. Recall@5 and MRR are generated by <span className="font-mono">npm run ablate</span>.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_58px_50px] gap-3 px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  <span>Retrieval strategy</span><span>Recall</span><span>MRR</span>
                </div>
                {retrievalAblation.map(([label, recall, mrr, width]) => (
                  <div key={label} className="grid grid-cols-[1fr_58px_50px] items-center gap-3 rounded-xl border border-border/70 bg-black/15 px-3 py-2.5 text-xs">
                    <div>
                      <div className="mb-2 flex justify-between gap-2"><span>{label}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/75" style={{ width }} /></div>
                    </div>
                    <span className="font-mono text-primary">{recall}</span>
                    <span className="font-mono text-muted-foreground">{mrr}</span>
                  </div>
                ))}
              </div>
              <div className="grid content-start gap-3">
                <p className="px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Chunk topology comparison</p>
                <div className="rounded-xl border border-border/70 bg-black/15 p-4">
                  <div className="flex items-end justify-between gap-3"><span className="text-sm">Fixed 90-token windows</span><span className="font-mono text-sm text-muted-foreground">91.7% · .896</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[91.7%] rounded-full bg-slate-500" /></div>
                </div>
                <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                  <div className="flex items-end justify-between gap-3"><span className="text-sm text-primary">Structure-aware records</span><span className="font-mono text-sm text-primary">100% · .931</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-full rounded-full bg-primary" /></div>
                </div>
                <p className="px-2 text-xs leading-5 text-muted-foreground">Format: Recall@5 · MRR. The selected structure preserves identifier and citation boundaries while improving retrieval.</p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="border border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gauge className="size-4 text-primary" /> Query mix</CardTitle>
                <CardDescription>The original 31-case retrieval slice remains visible for continuity; the Week 4 lab above expands the controlled product evaluation to 48 cases.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ['Exact identifiers', 11, '35%'],
                  ['Semantic symptoms', 10, '32%'],
                  ['Multi-source', 1, '3%'],
                  ['Unanswerable', 3, '10%'],
                  ['Hard negatives', 6, '19%'],
                ].map(([label, count, width]) => (
                  <div key={label as string} className="grid grid-cols-[120px_1fr_28px] items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: width as string }} /></div>
                    <span className="text-right font-mono text-foreground">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border border-primary/20 bg-primary/[0.035]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TerminalSquare className="size-4 text-primary" /> Reproduce it</CardTitle>
                <CardDescription>Clone, install, test, and evaluate without a GPU.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-xl border border-border/70 bg-black/25 p-4 font-mono text-xs leading-6 text-slate-300"><code>{`npm install\nnpm test\nnpm run evaluate\nnpm run dev`}</code></pre>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">The repository also includes Fluent Bit and OpenTelemetry Collector replay configurations, architecture diagrams, a CI workflow, and a detailed verification guide.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/70 bg-black/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center lg:px-8">
          <div className="flex items-center gap-2"><Radar className="size-4 text-primary" /><span>GPU Signal Atlas</span><span className="text-border">/</span><span>Evidence before inference</span></div>
          <a href="https://github.com/sivalinb/gpu-signal-atlas" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-foreground transition hover:text-primary">View project source <ArrowUpRight className="size-4" /></a>
        </div>
      </footer>
    </main>
  );
}
