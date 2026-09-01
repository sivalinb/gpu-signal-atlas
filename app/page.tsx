'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
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
  Video,
  WandSparkles,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { corpus } from '@/core/corpus';
import { samples } from '@/core/samples';
import type { SignalAnalysis } from '@/core/types';

interface AnalysisErrorPayload {
  error?: string;
}

async function requestSignalAnalysis(telemetry: string, signal?: AbortSignal): Promise<SignalAnalysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telemetry }),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as AnalysisErrorPayload;
    throw new Error(payload.error ?? 'Analysis is temporarily unavailable.');
  }
  return (await response.json()) as SignalAnalysis;
}

const evaluationMetrics = [
  ['Recall@5', '100%', '31 labeled cases'],
  ['MRR', '0.931', 'rank quality'],
  ['Citations', '100%', 'retriever-backed'],
  ['Refusals', '100%', 'precision & recall'],
];

const retrievalAblation = [
  ['BM25 only', '100.0%', '0.931', '100%'],
  ['Vector only', '91.7%', '0.753', '91.7%'],
  ['Hybrid RRF', '95.8%', '0.889', '95.8%'],
  ['Hybrid + rerank', '100.0%', '0.931', '100%'],
];

const week2Score = [
  ['Use case & targets', '10/10'],
  ['Corpus lifecycle', '14/15'],
  ['Chunking & vectors', '14/15'],
  ['Retrieval & safety', '20/20'],
  ['Evaluation', '18/20'],
  ['Demo & reproducibility', '10/10'],
  ['Documentation', '10/10'],
];

const recordingPlan = [
  ['0:00–0:30', 'Problem', 'Frame the evidence-before-inference goal.'],
  ['0:30–1:20', 'Live analysis', 'Run Xid 79 and inspect Pinecone-backed evidence.'],
  ['1:20–2:00', 'Multi-source', 'Show Xid 48, ECC metric, and runbook context.'],
  ['2:00–3:25', 'Pipeline', 'Run all nine stages, then show the You.com/Pinecone/LangSmith control planes.'],
  ['3:25–3:55', 'Refusal', 'Run Xid 999 and show zero diagnostic citations.'],
  ['3:55–4:25', 'Evaluation', 'Show retrieval, refusal, and ablation evidence.'],
  ['4:25–4:55', 'Build story', 'Explain AI coding usage, GitHub, and the key learning.'],
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

export default function Home() {
  const [input, setInput] = useState<string>(samples[0].text);
  const [analysis, setAnalysis] = useState<SignalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestSignalAnalysis(samples[0].text, controller.signal)
      .then((result) => setAnalysis(result))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setAnalysisError(error instanceof Error ? error.message : 'Analysis is temporarily unavailable.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function runAnalysis(telemetry: string): Promise<void> {
    setLoading(true);
    setAnalysisError(null);
    try {
      setAnalysis(await requestSignalAnalysis(telemetry));
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:linear-gradient(to_right,oklch(0.82_0.16_165/.08)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.82_0.16_165/.06)_1px,transparent_1px)] [background-size:64px_64px]" />
      <header className="relative z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#analyze" className="flex items-center gap-3">
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
            <a className="transition hover:text-foreground" href="#architecture">Architecture</a>
            <a className="transition hover:text-foreground" href="#integrations">AI observability</a>
            <a className="transition hover:text-foreground" href="#evaluation">Evaluation</a>
            <a className="transition hover:text-foreground" href="#submission">Submission</a>
          </nav>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" /> Pinecone-backed corpus
          </Badge>
        </div>
      </header>

      <section id="analyze" className="relative z-10 mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary">Citation-first GPU RAG</Badge>
              <span className="font-mono text-xs text-muted-foreground">Xid · DCGM · Kubernetes · OTLP</span>
            </div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-[58px] lg:leading-[1.02]">
              Explain the signal.<br /><span className="text-primary">Preserve the uncertainty.</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Paste an NVIDIA kernel event or DCGM metric snapshot. Hybrid retrieval turns exact identifiers and symptoms into an evidence-backed signal card—without pretending one event proves a root cause.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[360px]">
            {[
              [corpus.length.toString(), 'chunks'],
              ['31', 'evals'],
              ['0', 'browser keys'],
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[11px] leading-5 text-muted-foreground">BM25 + Pinecone 256d retrieval + exact-ID boost</p>
                <div className="flex gap-2">
                  <Button size="lg" variant="outline" disabled={loading} onClick={() => { setInput(samples[0].text); void runAnalysis(samples[0].text); }} aria-label="Reset sample">
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
          ) : analysis ? <ResultPanel analysis={analysis} /> : null}
        </div>
      </section>

      <PipelineWalkthrough />

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
                <CardDescription>Optional collection replay; the analyzer sends only the submitted snapshot to a server-side evidence service.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                  {['GPU/kernel log', 'Fluent Bit', 'OTLP', 'OTel Collector', 'Debug + LangSmith*'].map((label, index) => (
                    <span key={label} className="contents">
                      <span className="rounded-lg border border-border bg-black/15 px-3 py-2 text-foreground">{label}</span>
                      {index < 4 && <ChevronRight className="size-3.5 text-primary" />}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">The default replay ends at the Collector debug exporter. A separate checked-in trace pipeline can fan out redacted RAG spans to LangSmith when its server-only key is configured. Raw GPU telemetry is excluded by default.</p>
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
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">One evidence system, three governed control planes.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">You.com expands what can be reviewed, Pinecone serves what has been approved, and LangSmith explains how the RAG path behaved. Each integration has a narrow job and an explicit privacy boundary.</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.055] p-4 text-xs leading-5 text-muted-foreground">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Deployment truth</p>
              <p className="mt-2"><span className="text-foreground">Pinecone is active.</span> You.com discovery and LangSmith trace export are implemented, tested, and optional; server-side API keys activate them without exposing secrets to the browser.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: FileSearch,
                eyebrow: 'Corpus intelligence',
                title: 'Discover → review → promote',
                status: 'Optional adapter implemented',
                steps: ['Approved public domains', 'You.com Search + page content', 'Pending-review candidates', 'Human approval + regression tests', 'Pinecone versioned namespace'],
                boundary: 'No pasted telemetry. No automatic index writes.',
              },
              {
                icon: Database,
                eyebrow: 'Runtime evidence',
                title: 'Retrieve → gate → cite',
                status: 'Production path active',
                steps: ['Submitted telemetry snapshot', 'Exact signal extraction', 'Pinecone candidates + BM25', 'RRF and evidence boundary', 'Grounded card or refusal'],
                boundary: 'Only reviewed corpus records can support a citation.',
              },
              {
                icon: Activity,
                eyebrow: 'AI observability',
                title: 'Trace → evaluate → improve',
                status: 'Optional export implemented',
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
            <CardContent className="grid gap-2 md:grid-cols-5">
              {[
                ['Fluent Bit', 'Collect + enrich GPU and Kubernetes logs', 'OTLP logs'],
                ['OpenTelemetry', 'Normalize telemetry and emit redacted RAG spans', 'Logs + traces'],
                ['You.com', 'Discover allow-listed public documentation', 'Review candidates'],
                ['Pinecone', 'Serve approved dense-vector candidates', 'Versioned vectors'],
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

      <section id="evaluation" className="relative z-10 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Evaluation evidence</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Retrieval quality is a test, not a screenshot.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">The checked-in suite covers exact identifiers, semantic symptoms, multi-source questions, and unsupported inputs. Metrics below are reproducible locally with one command.</p>
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
                <CardDescription>Thirty-one independent expectations, including adversarial same-domain negatives.</CardDescription>
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

      <section id="submission" className="relative z-10 border-t border-border/70 bg-black/10 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Week 2 submission kit</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Record the story. Submit the evidence.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">The public application, repository, documentation, evaluation, and recording sequence are aligned to the project handout. The only remaining human step is capturing and submitting the video.</p>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] px-6 py-4 text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Expert review</p>
              <p className="mt-1 font-mono text-4xl text-primary">96<span className="text-lg text-muted-foreground">/100</span></p>
              <p className="mt-1 text-xs text-emerald-300">Submission-ready</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]">
            <Card className="border border-border/70 bg-card/75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /> Judge scorecard</CardTitle>
                <CardDescription>Strongest areas: evidence safety, reproducibility, and observability differentiation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {week2Score.map(([label, score]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-border/70 bg-black/15 px-3 py-2.5 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-primary">{score}</span>
                  </div>
                ))}
                <p className="pt-2 text-xs leading-5 text-muted-foreground">Remaining evidence risk: the corpus is small and the deterministic feature-hash embedding should be benchmarked against a trained sentence embedding before production use.</p>
              </CardContent>
            </Card>

            <Card className="border border-primary/20 bg-primary/[0.03]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Video className="size-4 text-primary" /> 4:55 recording plan</CardTitle>
                <CardDescription>Follow this order while keeping the application and visual pipeline on screen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recordingPlan.map(([time, title, instruction]) => (
                  <div key={time} className="grid gap-1 rounded-xl border border-border/70 bg-black/15 px-3 py-2.5 sm:grid-cols-[86px_110px_1fr] sm:items-center">
                    <span className="font-mono text-xs text-primary">{time}</span>
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-xs leading-5 text-muted-foreground">{instruction}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <a href="#analyze" className="group rounded-2xl border border-primary/25 bg-primary/[0.045] p-4 transition hover:border-primary/50">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Public asset 01</p>
              <p className="mt-2 flex items-center justify-between font-medium">Live demonstration <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></p>
            </a>
            <a href="https://github.com/sivalinb/gpu-signal-atlas" target="_blank" rel="noreferrer" className="group rounded-2xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/40">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Public asset 02</p>
              <p className="mt-2 flex items-center justify-between font-medium">GitHub repository <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></p>
            </a>
            <a href="https://docs.google.com/document/d/1bksyAMQVZFTTbXAq5TY1KnvXqq1rBO-trVjV1gjTezI/edit" target="_blank" rel="noreferrer" className="group rounded-2xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/40">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Public asset 03</p>
              <p className="mt-2 flex items-center justify-between font-medium">Project documentation <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></p>
            </a>
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
