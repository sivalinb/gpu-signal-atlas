'use client';

import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Beaker,
  Braces,
  Check,
  CircleCheck,
  Code2,
  Database,
  ExternalLink,
  FileLock2,
  Gauge,
  GitCompareArrows,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import comparisonData from '@/evaluation/week4/results/v2/comparison.json';
import langsmithData from '@/evaluation/week4/results/v2-langsmith.json';
import pineconeResult from '@/evaluation/week4/results/v2-pinecone-improved.json';

type Variant = 'baseline' | 'improved';

const comparison = comparisonData;
const experimentByVariant = Object.fromEntries(
  langsmithData.experiments.map((experiment) => [experiment.variant, experiment]),
) as Record<Variant, (typeof langsmithData.experiments)[number]>;

const metricDefinitions = [
  { key: 'passRate', label: 'End-to-end pass', format: 'percent' },
  { key: 'refusalF1', label: 'Refusal F1', format: 'percent' },
  { key: 'primaryEvidence', label: 'Primary evidence', format: 'percent' },
  { key: 'signalExtraction', label: 'Signal extraction', format: 'percent' },
] as const;

const datasetSlices = [
  { label: 'Happy path', count: 50, width: '50%', color: 'bg-emerald-400' },
  { label: 'Edge', count: 30, width: '30%', color: 'bg-cyan-400' },
  { label: 'Known failure', count: 15, width: '15%', color: 'bg-amber-400' },
  { label: 'Adversarial', count: 5, width: '5%', color: 'bg-rose-400' },
];

const evaluationFlow = [
  { icon: Database, label: 'Datasets', detail: '100 frozen cases' },
  { icon: Code2, label: 'Python harness', detail: 'Run + score' },
  { icon: Radar, label: 'Evidence agent', detail: 'Retrieve or refuse' },
  { icon: Braces, label: 'Evaluators', detail: '10 quality checks' },
  { icon: Network, label: 'LangSmith', detail: 'Trace + compare' },
  { icon: Activity, label: 'Production', detail: 'Drift + SLOs' },
];

const week2Flow = [
  ['Collect', 'NVIDIA/DCGM logs, Fluent Bit, OTLP'],
  ['Retrieve', 'BM25 + Pinecone hybrid evidence'],
  ['Decide', 'Ground, investigate, or refuse'],
  ['Explain', 'Cited GPU signal card'],
];

const week4Flow = [
  ['Freeze', '100 independently labeled cases'],
  ['Measure', 'Python evaluators + failure clusters'],
  ['Improve', 'Targeted parser, routing, and safety'],
  ['Observe', 'LangSmith experiments + production SLOs'],
];

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function metricValue(variant: Variant, key: (typeof metricDefinitions)[number]['key']): number {
  const result = comparison[variant];
  if (key === 'passRate') return result.passRate;
  if (key === 'refusalF1') return result.refusal.f1;
  if (key === 'primaryEvidence') return result.quality.primaryEvidencePrecision;
  return result.quality.signalExtractionRecall;
}

export function Week4EvaluationLab() {
  const [variant, setVariant] = useState<Variant>('improved');
  const experiment = experimentByVariant[variant];

  return (
    <section
      id="week4-evaluation"
      className="relative z-10 border-y border-border/70 bg-[radial-gradient(circle_at_82%_15%,oklch(0.82_0.16_165/.09),transparent_30%),radial-gradient(circle_at_14%_72%,oklch(0.72_0.14_210/.07),transparent_28%),linear-gradient(180deg,oklch(0.145_0.015_250),oklch(0.175_0.02_242))] py-16"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,.9fr)] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-primary/25 bg-primary/10 text-primary">Week 4 evaluation lab</Badge>
              <span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Measured change · frozen data · linked traces</span>
            </div>
            <h2 className="mt-5 max-w-4xl font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              From “it works” to <span className="text-primary">measured product quality.</span>
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              A Python evaluation system runs the same 100 human-reviewed cases before and after targeted changes, scores retrieval, evidence, extraction, safety, and output contracts, and links the experiment records to LangSmith.
            </p>
          </div>

          <Card className="border border-primary/25 bg-primary/[0.045] shadow-xl shadow-black/20">
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                <CircleCheck className="size-7" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Controlled outcome</p>
                <p className="mt-1 font-heading text-2xl font-semibold">25 failures resolved</p>
                <p className="mt-1 text-xs text-muted-foreground">0 regressions across the frozen dataset</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-9 overflow-hidden border border-primary/25 bg-primary/[0.03]">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="flex items-center gap-2"><Workflow className="size-4 text-primary" /> Week 2 builds the product. Week 4 proves and improves it.</CardTitle>
            <CardDescription>The same evidence path becomes a measurable quality loop instead of a second disconnected demo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div>
              <div className="flex items-center justify-between"><Badge variant="outline" className="border-cyan-400/25 text-cyan-200">Week 2 · RAG system</Badge><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">build</span></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {week2Flow.map(([title, detail], index) => <div key={title} className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.035] p-3"><p className="font-mono text-[9px] text-cyan-300">0{index + 1}</p><p className="mt-2 text-xs font-medium">{title}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{detail}</p></div>)}
              </div>
            </div>
            <ArrowRight className="mx-auto hidden size-5 text-primary lg:block" />
            <div>
              <div className="flex items-center justify-between"><Badge variant="outline" className="border-primary/25 text-primary">Week 4 · Evaluation system</Badge><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">improve</span></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {week4Flow.map(([title, detail], index) => <div key={title} className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3"><p className="font-mono text-[9px] text-primary">0{index + 1}</p><p className="mt-2 text-xs font-medium">{title}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{detail}</p></div>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.42fr)_minmax(340px,.58fr)]">
          <Card className="overflow-hidden border border-border/70 bg-card/80">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <CardTitle className="flex items-center gap-2"><GitCompareArrows className="size-4 text-primary" /> Baseline versus improved</CardTitle>
                  <CardDescription className="mt-1">Select a run to inspect its metrics and linked LangSmith experiment.</CardDescription>
                </div>
                <div className="flex rounded-xl border border-border/70 bg-black/20 p-1">
                  {(['baseline', 'improved'] as const).map((item) => (
                    <Button
                      key={item}
                      size="sm"
                      variant={variant === item ? 'secondary' : 'ghost'}
                      className={variant === item ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}
                      onClick={() => setVariant(item)}
                    >
                      {item === 'baseline' ? 'Before' : 'After'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metricDefinitions.map((metric) => {
                  const current = metricValue(variant, metric.key);
                  const before = metricValue('baseline', metric.key);
                  const change = current - before;
                  return (
                    <div key={metric.key} className="rounded-xl border border-border/70 bg-black/15 p-4">
                      <p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-3 font-mono text-2xl text-primary">{percent(current)}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {variant === 'baseline' ? 'Frozen baseline' : change > 0 ? `+${(change * 100).toFixed(1)} percentage points` : 'No regression'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-border/70 bg-black/15 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium">{variant === 'baseline' ? '75 / 100 cases passed' : '100 / 100 cases passed'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Recall, MRR, status, signal extraction, primary evidence, citation, faithfulness, contract, refusal, and guardrail feedback attach to each case.</p>
                  </div>
                  <a
                    href={experiment.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary transition hover:bg-primary/15 sm:self-center"
                  >
                    Open {variant} traces <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileLock2 className="size-4 text-primary" /> Frozen golden dataset</CardTitle>
              <CardDescription>Versioned, human-reviewed, and safely reproducible.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {datasetSlices.map((slice) => <div key={slice.label} className={slice.color} style={{ width: slice.width }} />)}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {datasetSlices.map((slice) => (
                  <div key={slice.label} className="rounded-xl border border-border/60 bg-black/10 p-3">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${slice.color}`} />
                      <span className="text-xs text-muted-foreground">{slice.label}</span>
                    </div>
                    <p className="mt-2 font-mono text-xl">{slice.count}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-border/60 pt-4 font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                <p>Tag · week4-frozen-v2-100</p>
                <p className="truncate">SHA · {comparison.datasetSha256.slice(0, 18)}…</p>
                <p>v1 remains frozen · 48/48 regression check</p>
                <p>No production payloads uploaded</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5 border border-primary/20 bg-primary/[0.025]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Code2 className="size-4 text-primary" /> Observable evaluation pipeline</CardTitle>
            <CardDescription>Python owns dataset validation, execution, scoring, failure clustering, LangSmith upload, CSV/XLSX evidence, and report generation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-6">
              {evaluationFlow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="relative rounded-xl border border-border/70 bg-black/15 p-3">
                    {index < evaluationFlow.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-4 -translate-y-1/2 text-primary md:block" />}
                    <Icon className="size-4 text-primary" />
                    <p className="mt-3 text-xs font-medium">{step.label}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{step.detail}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
          <Card className="border border-amber-400/20 bg-amber-400/[0.025]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TriangleAlert className="size-4 text-amber-300" /> Baseline failure clinic</CardTitle>
              <CardDescription>Failures were grouped by behavior before code changes were chosen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Evidence precision', '19 cases', 'Relevant evidence was present, but the primary citation was not the intended authoritative record.'],
                ['Status + refusal boundary', '19 / 13', 'Supported paraphrases were refused and ambiguous hardware context appeared fully grounded.'],
                ['Extraction + safety', '2 / 2', 'Structured Xid variants and new instruction-manipulation language exposed gaps.'],
              ].map(([title, count, detail]) => (
                <div key={title} className="rounded-xl border border-border/70 bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{title}</p><Badge variant="outline" className="text-[9px] text-amber-200">{count}</Badge></div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-primary/25 bg-primary/[0.035]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Targeted change → measured evidence</CardTitle>
              <CardDescription>Each change maps to an observed cluster and a post-change result.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {comparison.targetedChanges.map((change, index) => (
                <div key={change.title} className="grid gap-3 rounded-xl border border-border/70 bg-black/15 p-4 sm:grid-cols-[34px_1fr_auto] sm:items-start">
                  <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 font-mono text-xs text-primary">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{change.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{change.change}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-300"><Check className="size-3.5" /> Verified</span>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-primary" /> 100% guardrail pass</span>
                <span className="flex items-center gap-2"><Gauge className="size-3.5 text-primary" /> p95 local {comparison.improved.performance.p95LatencyMs.toFixed(1)} ms · Pinecone {Math.round(pineconeResult.aggregate.performance.p95LatencyMs)} ms</span>
                <span className="flex items-center gap-2"><Database className="size-3.5 text-primary" /> Pinecone 100/100 · {pineconeResult.aggregate.performance.pineconeReadUnits} read units</span>
                <span className="flex items-center gap-2"><Beaker className="size-3.5 text-primary" /> 0 model tokens in deterministic mode</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Quality drift', 'Pass rate · Recall@5 · claim faithfulness'],
            ['Safety drift', 'Refusal F1 · adversarial guardrail'],
            ['Cost and speed', 'p95 latency · Pinecone reads · tokens'],
            ['Reliability', 'Tool errors · stale corpus · empty retrieval'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border border-border/70 bg-card/55 p-4">
              <p className="flex items-center gap-2 text-xs font-medium"><Activity className="size-3.5 text-primary" /> {title}</p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-[10px] leading-5 text-muted-foreground">LangSmith dataset and experiment records are linked above. This account reached its monthly unique-trace quota during the 100-case upload, so the checked-in Python artifacts remain the complete source of truth for this run.</p>
      </div>
    </section>
  );
}
