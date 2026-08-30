'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  Cpu,
  ExternalLink,
  FileSearch,
  Gauge,
  GitBranch,
  Layers3,
  Network,
  Radar,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
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
import { analyzeTelemetry } from '@/core/engine';
import { samples } from '@/core/samples';
import type { SignalAnalysis } from '@/core/types';

const evaluationMetrics = [
  ['Recall@5', '100%', '25 labeled cases'],
  ['MRR', '0.931', 'rank quality'],
  ['Citations', '100%', 'retriever-backed'],
  ['Refusals', '100%', 'precision & recall'],
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
    text: 'Create deterministic 256-dimensional feature-hash embeddings for local, credential-free replay.',
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
              {analysis.citations.length} evidence passages · {Math.round(analysis.confidence * 100)}% retrieval confidence
            </CardDescription>
          </div>
          <Badge className={analysis.status === 'grounded' ? 'bg-emerald-300/12 text-emerald-200' : 'bg-amber-300/12 text-amber-200'}>
            {analysis.status === 'grounded' ? 'Grounded' : 'Check compatibility'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5 text-slate-200">
        <SignalTokens analysis={analysis} />

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
  const [submitted, setSubmitted] = useState<string>(samples[0].text);
  const analysis = useMemo(() => analyzeTelemetry(submitted), [submitted]);

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
            <a className="transition hover:text-foreground" href="#architecture">Architecture</a>
            <a className="transition hover:text-foreground" href="#evaluation">Evaluation</a>
          </nav>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" /> Offline corpus
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
              ['25', 'evals'],
              ['0', 'API keys'],
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
              <CardDescription>Use a replay or paste your own event. Analysis stays in this browser.</CardDescription>
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
                <p className="font-mono text-[11px] leading-5 text-muted-foreground">BM25 + 256d local embedding + exact-ID boost</p>
                <div className="flex gap-2">
                  <Button size="lg" variant="outline" onClick={() => { setInput(samples[0].text); setSubmitted(samples[0].text); }} aria-label="Reset sample">
                    <RefreshCw className="size-4" /> Reset
                  </Button>
                  <Button size="lg" className="bg-primary px-5 text-primary-foreground hover:bg-primary/90" onClick={() => setSubmitted(input)}>
                    <Sparkles className="size-4" /> Analyze signal
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Retrieval trace</p>
                <div className="space-y-3">
                  {analysis.retrieval.slice(0, 3).map((result, index) => (
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

          <ResultPanel analysis={analysis} />
        </div>
      </section>

      <section id="architecture" className="relative z-10 border-y border-border/70 bg-black/10 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">System flow</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">A transparent RAG path, not an agent maze.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">Every transformation is deterministic and inspectable. Provider-backed embeddings or generation can replace the local stages without changing the retrieval contract.</p>
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
                <CardDescription>Optional replay path for Fluent Bit and OpenTelemetry.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                  {['GPU/kernel log', 'Fluent Bit', 'OTLP', 'OTel Collector', 'Signal Atlas'].map((label, index) => (
                    <span key={label} className="contents">
                      <span className="rounded-lg border border-border bg-black/15 px-3 py-2 text-foreground">{label}</span>
                      {index < 4 && <ChevronRight className="size-3.5 text-primary" />}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitBranch className="size-4 text-primary" /> Safety contract</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {['No production writes', 'No hidden evaluator labels', 'No uncited diagnosis', 'No credentials required'].map((item) => (
                  <p key={item} className="flex items-center gap-2"><Check className="size-3.5 text-primary" />{item}</p>
                ))}
              </CardContent>
            </Card>
          </div>
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

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="border border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gauge className="size-4 text-primary" /> Query mix</CardTitle>
                <CardDescription>Twenty-five independent expectations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ['Exact identifiers', 11, '44%'],
                  ['Semantic symptoms', 10, '40%'],
                  ['Multi-source', 1, '4%'],
                  ['Unanswerable', 3, '12%'],
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
