'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Cpu,
  Database,
  Download,
  Gauge,
  Network,
  Printer,
  ServerCog,
  ShieldAlert,
  Sparkles,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  benchmarkCampaignContract,
  benchmarkProvenance,
  buildDecisionReport,
  compareRuns,
  defaultSlo,
  planCapacity,
  publicBenchmarkRuns,
} from '@/core/benchmark';

type View = 'compare' | 'correlate' | 'fleet' | 'capacity' | 'report';

const tabs: Array<{ id: View; label: string }> = [
  { id: 'compare', label: 'Benchmark studio' },
  { id: 'correlate', label: 'Signal correlation' },
  { id: 'fleet', label: 'Fleet & MIG' },
  { id: 'capacity', label: 'Capacity planner' },
  { id: 'report', label: 'Decision report' },
];

const correlation = [
  { second: 0, queue: 12, utilization: 18, power: 47, ttft: 31 },
  { second: 5, queue: 18, utilization: 20, power: 53, ttft: 33 },
  { second: 10, queue: 44, utilization: 48, power: 59, ttft: 36 },
  { second: 15, queue: 82, utilization: 76, power: 64, ttft: 48 },
  { second: 20, queue: 95, utilization: 88, power: 65, ttft: 67 },
  { second: 25, queue: 72, utilization: 74, power: 61, ttft: 54 },
  { second: 30, queue: 28, utilization: 35, power: 55, ttft: 37 },
] as const;

function pathFor(values: number[], max: number) {
  return values
    .map((value, index) => {
      const x = 12 + (index / (values.length - 1)) * 276;
      const y = 90 - (value / max) * 68;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function Delta({ value, betterWhenLower = false }: { value: number; betterWhenLower?: boolean }) {
  const good = betterWhenLower ? value <= 0 : value >= 0;
  const Icon = value <= 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={`flex items-center gap-1 font-mono text-xs ${good ? 'text-emerald-300' : 'text-amber-300'}`}>
      <Icon className="size-3" /> {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function MetricCard({ label, value, unit, delta, lower }: { label: string; value: string; unit: string; delta: number; lower?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-black/15 p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-mono text-2xl text-foreground">{value}<span className="ml-1 text-xs text-muted-foreground">{unit}</span></p>
        <Delta value={delta} betterWhenLower={lower} />
      </div>
    </div>
  );
}

export function PerformanceWorkbench() {
  const [view, setView] = useState<View>('compare');
  const [baselineId, setBaselineId] = useState('gpt2-config-100');
  const [candidateId, setCandidateId] = useState('gpt2-config-200');
  const [targetRps, setTargetRps] = useState(10);
  const [headroom, setHeadroom] = useState(30);
  const [hourlyCost, setHourlyCost] = useState(4);
  const comparison = useMemo(() => compareRuns(baselineId, candidateId), [baselineId, candidateId]);
  const capacity = useMemo(
    () => planCapacity({ runId: candidateId, targetRequestsPerSecond: targetRps, headroomPct: headroom, gpuHourlyCostUsd: hourlyCost }),
    [candidateId, targetRps, headroom, hourlyCost],
  );

  function downloadReport() {
    const report = buildDecisionReport(baselineId, candidateId, defaultSlo);
    const blob = new Blob([JSON.stringify({ ...report, capacity }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'gpu-signal-atlas-evidence-report.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="performance-lab" className="relative z-10 border-y border-border/70 bg-[radial-gradient(circle_at_12%_8%,oklch(0.82_0.16_165/.09),transparent_32%),linear-gradient(180deg,oklch(0.17_0.018_245),oklch(0.14_0.014_250))] py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary">GPU performance intelligence</Badge>
              <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Public benchmark evidence · SLO decisions · capacity</span>
            </div>
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Turn benchmark output into an architecture decision.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Compare runs, inspect latency–throughput tradeoffs, correlate benchmark pressure with observability signals, plan headroom, and export a reviewable evidence package.</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4 text-xs leading-5 text-muted-foreground">
            <p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Evidence contract</p>
            <p className="mt-2"><span className="text-foreground">Public measurement:</span> NVIDIA’s GenAI-Perf documentation example. <span className="text-foreground">Derived:</span> correlation and capacity scenarios, labeled on every view.</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Performance workbench views">
          {tabs.map((tab) => (
            <Button key={tab.id} size="sm" variant={view === tab.id ? 'secondary' : 'outline'} role="tab" aria-selected={view === tab.id} onClick={() => setView(tab.id)}>{tab.label}</Button>
          ))}
        </div>

        {view === 'compare' && (
          <Card className="overflow-hidden border border-primary/20 bg-card/80">
            <CardHeader className="border-b border-border/60">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                <div><CardTitle className="flex items-center gap-2"><Gauge className="size-4 text-primary" /> Baseline vs candidate</CardTitle><CardDescription className="mt-1">Lower latency and power are favorable; higher throughput is favorable.</CardDescription></div>
                <label className="text-xs text-muted-foreground">Baseline<select value={baselineId} onChange={(event) => setBaselineId(event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">{publicBenchmarkRuns.map((run) => <option key={run.id} value={run.id}>{run.label}</option>)}</select></label>
                <label className="text-xs text-muted-foreground">Candidate<select value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">{publicBenchmarkRuns.map((run) => <option key={run.id} value={run.id}>{run.label}</option>)}</select></label>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="mb-5 grid gap-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-4 lg:grid-cols-[.85fr_1.15fr]">
                <div>
                  <div className="flex items-center gap-2"><ShieldAlert className="size-4 text-amber-300" /><p className="text-sm font-medium text-amber-100">Reproducibility gate · public reference incomplete</p></div>
                  <div className="mt-3 space-y-2">
                    {Object.entries(benchmarkCampaignContract.known).map(([key, value]) => <p key={key} className="text-xs leading-5 text-muted-foreground"><span className="text-slate-200">{key}:</span> {value}</p>)}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[.16em] text-amber-200">Required before an NVIDIA stack decision</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {benchmarkCampaignContract.requiredBeforePromotion.map((item) => <p key={item} className="flex gap-2 text-[11px] leading-5 text-muted-foreground"><CircleAlert className="mt-1 size-3 shrink-0 text-amber-300" />{item}</p>)}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricCard label="TTFT p99" value={comparison.candidate.ttftP99Ms.toFixed(2)} unit="ms" delta={comparison.deltas.ttftPct} lower />
                <MetricCard label="ITL p99" value={comparison.candidate.interTokenLatencyP99Ms.toFixed(2)} unit="ms" delta={comparison.deltas.itlPct} lower />
                <MetricCard label="Request p99" value={comparison.candidate.requestLatencyP99Ms.toFixed(1)} unit="ms" delta={comparison.deltas.requestLatencyPct} lower />
                <MetricCard label="Output throughput" value={comparison.candidate.outputTokensPerSecond.toFixed(1)} unit="tok/s" delta={comparison.deltas.throughputPct} />
                <MetricCard label="GPU power p99" value={comparison.candidate.gpuPowerP99W.toFixed(1)} unit="W" delta={comparison.deltas.powerPct} lower />
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
                <div className="rounded-xl border border-border/70 bg-black/15 p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">SLO advisor</p>
                  <div className="mt-3 space-y-2">{comparison.slo.checks.map((check) => <div key={check.metric} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-xs"><span className="flex items-center gap-2">{check.pass ? <Check className="size-3 text-emerald-300" /> : <CircleAlert className="size-3 text-amber-300" />}{check.metric}</span><span className="font-mono text-muted-foreground">{check.value} / {check.target} {check.unit}</span></div>)}</div>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Architecture recommendation</p><Badge variant="outline" className={comparison.slo.pass ? 'border-emerald-400/25 text-emerald-300' : 'border-amber-300/25 text-amber-200'}>{comparison.slo.pass ? 'SLO pass' : 'SLO miss'}</Badge></div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{comparison.slo.pass ? 'Promote the candidate to a repeated benchmark on the target stack. Preserve request shape, endpoint, model revision, GPU topology, and observability configuration so the comparison remains causal.' : 'Do not promote. First separate queue delay, compute saturation, memory pressure, and transport latency; then rerun the same workload.'}</p>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground"><ShieldAlert className="mr-2 inline size-3 text-amber-300" />A passing sample is a gate to deeper validation, not proof of production capacity.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'correlate' && (
          <Card className="border border-primary/20 bg-card/80">
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4 text-primary" /> Benchmark-to-telemetry correlation</CardTitle><CardDescription>Illustrative time alignment shows how AIPerf/GenAI-Perf, Triton, DCGM, and OpenTelemetry would meet on one trace timeline.</CardDescription></CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
              <div className="rounded-xl border border-border/70 bg-black/15 p-4">
                <svg viewBox="0 0 300 110" aria-labelledby="correlation-chart-title" className="w-full">
                  <title id="correlation-chart-title">Derived queue, GPU utilization, and TTFT correlation timeline</title>
                  {[22, 56, 90].map((y) => <line key={y} x1="12" x2="288" y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth="0.7" />)}
                  <path d={pathFor(correlation.map((point) => point.queue), 100)} fill="none" stroke="#a3e635" strokeWidth="2.5" />
                  <path d={pathFor(correlation.map((point) => point.utilization), 100)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                  <path d={pathFor(correlation.map((point) => point.ttft), 100)} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                </svg>
                <div className="mt-2 flex flex-wrap gap-4 font-mono text-[9px]"><span className="text-lime-300">— Triton queue</span><span className="text-sky-300">— DCGM GPU util</span><span className="text-amber-300">— TTFT p99</span></div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Derived demonstration series—no claim that these samples were captured together.</p>
              </div>
              <div className="space-y-2">{[
                ['AIPerf / GenAI-Perf', 'Request IDs, TTFT, ITL, throughput'],
                ['Triton metrics', 'Queue, compute, request success'],
                ['DCGM Exporter', 'SM, memory, power, PCIe/NVLink'],
                ['OpenTelemetry', 'Common resource identity + trace timeline'],
                ['LangSmith', 'RAG latency and evidence decision spans'],
              ].map(([name, detail]) => <div key={name} className="rounded-xl border border-border/70 bg-black/15 p-3"><p className="text-sm font-medium text-primary">{name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>)}</div>
            </CardContent>
          </Card>
        )}

        {view === 'fleet' && (
          <Card className="border border-primary/20 bg-card/80">
            <CardHeader><CardTitle className="flex items-center gap-2"><Network className="size-4 text-primary" /> Fleet, topology, and MIG readiness</CardTitle><CardDescription>A decision topology—not a live cluster inventory. Connect Kubernetes, GPU Operator labels, and DCGM to replace these example nodes.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">{[
                { node: 'gpu-node-01', role: 'Benchmark control', profile: 'Full GPU', state: 'eligible', signals: 'DCGM + OTel healthy' },
                { node: 'gpu-node-02', role: 'Candidate serving', profile: '2 × MIG slices', state: 'review', signals: 'Topology change planned' },
                { node: 'gpu-node-03', role: 'Reliability canary', profile: 'Full GPU', state: 'eligible', signals: 'Passive health watch' },
              ].map((node) => <div key={node.node} className="rounded-xl border border-border/70 bg-black/15 p-4"><div className="flex items-center justify-between"><Cpu className="size-5 text-primary" /><Badge variant="outline" className={node.state === 'eligible' ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-300/20 text-amber-200'}>{node.state}</Badge></div><p className="mt-4 font-mono text-sm">{node.node}</p><p className="mt-2 text-xs text-slate-300">{node.role}</p><p className="mt-1 text-xs text-muted-foreground">{node.profile} · {node.signals}</p></div>)}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">{[
                ['1. Passive health', 'DCGM health watches observe PCIe, memory, thermal, power, NVLink, and driver state without starting a workload.'],
                ['2. Change gate', 'Drain workloads and confirm GPU Operator/MIG compatibility before changing partition geometry.'],
                ['3. Active diagnostics', 'Run invasive DCGM diagnostics only in an approved maintenance window; never from an AI recommendation alone.'],
              ].map(([title, text]) => <div key={title} className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4"><p className="text-sm font-medium text-primary">{title}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p></div>)}</div>
            </CardContent>
          </Card>
        )}

        {view === 'capacity' && (
          <Card className="border border-primary/20 bg-card/80">
            <CardHeader><CardTitle className="flex items-center gap-2"><ServerCog className="size-4 text-primary" /> Capacity and cost scenario</CardTitle><CardDescription>Interactive derived estimate using the selected public reference run. Replace every assumption before procurement.</CardDescription></CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
              <div className="space-y-4">{[
                ['Target request rate', targetRps, setTargetRps, 'req/s'],
                ['Reliability headroom', headroom, setHeadroom, '%'],
                ['GPU hourly cost', hourlyCost, setHourlyCost, 'USD'],
              ].map(([label, value, setter, unit]) => <label key={label as string} className="block text-xs text-muted-foreground">{label as string}<div className="mt-1 flex items-center rounded-lg border border-border bg-background"><input type="number" min="0" value={value as number} onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none" /><span className="pr-3 font-mono text-[10px]">{unit as string}</span></div></label>)}</div>
              <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4"><p className="font-mono text-[9px] uppercase text-muted-foreground">Required GPUs</p><p className="mt-3 font-mono text-4xl text-primary">{capacity.gpuCount}</p></div><div className="rounded-xl border border-border/70 bg-black/15 p-4"><p className="font-mono text-[9px] uppercase text-muted-foreground">Safe capacity / GPU</p><p className="mt-3 font-mono text-2xl">{capacity.safeCapacityPerGpu.toFixed(2)} <span className="text-xs text-muted-foreground">req/s</span></p></div><div className="rounded-xl border border-border/70 bg-black/15 p-4"><p className="font-mono text-[9px] uppercase text-muted-foreground">Monthly estimate</p><p className="mt-3 font-mono text-2xl">${capacity.monthlyCostUsd.toLocaleString()}</p></div><p className="sm:col-span-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-3 text-xs leading-5 text-amber-100/65"><ShieldAlert className="mr-2 inline size-3 text-amber-300" />{capacity.note}</p></div>
            </CardContent>
          </Card>
        )}

        {view === 'report' && (
          <Card className="border border-primary/20 bg-card/80">
            <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Workflow className="size-4 text-primary" /> Evidence decision package</CardTitle><CardDescription className="mt-1">A portable artifact for architecture review, change approval, or an interview walkthrough.</CardDescription></div><div className="flex gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print / PDF</Button><Button onClick={downloadReport} className="bg-primary text-primary-foreground hover:bg-primary/90"><Download className="size-4" /> Download JSON</Button></div></div></CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
              <div className="rounded-xl border border-border/70 bg-black/15 p-4"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Executive decision</p><p className="mt-3 text-lg font-medium">{comparison.slo.pass ? 'Candidate passes the configured demonstration SLO.' : 'Candidate does not pass the configured demonstration SLO.'}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Next: run repeated AIPerf sweeps on the target NVIDIA stack, export Triton and DCGM signals through OpenTelemetry, compare confidence intervals, and promote only when the evidence package is reproducible.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{['Workload fingerprint', 'Software + model revision', 'GPU topology + health'].map((item) => <p key={item} className="rounded-lg border border-border/60 px-3 py-2 text-xs"><Check className="mr-2 inline size-3 text-primary" />{item}</p>)}</div></div>
              <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-4"><div className="flex items-center gap-2"><Database className="size-4 text-primary" /><p className="text-sm font-medium">Public data provenance</p></div><p className="mt-3 text-sm text-slate-300">{benchmarkProvenance.title}</p><p className="mt-1 text-xs text-muted-foreground">{benchmarkProvenance.publisher} · retrieved {benchmarkProvenance.retrievedAt}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{benchmarkProvenance.caveat}</p><a className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={benchmarkProvenance.sourceUrl} target="_blank" rel="noreferrer">Inspect source <ArrowUpRight className="size-3" /></a></div>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-4">{[
          [Sparkles, 'Benchmark', 'AIPerf / GenAI-Perf'],
          [Activity, 'Observe', 'Triton + DCGM + OTel'],
          [Gauge, 'Decide', 'SLO + Pareto + headroom'],
          [ShieldAlert, 'Protect', 'Evidence gates + approval'],
        ].map(([Icon, stage, technology]) => <div key={stage as string} className="flex items-center gap-3 rounded-xl border border-border/70 bg-black/15 p-3"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><span><span className="block text-xs font-medium">{stage as string}</span><span className="font-mono text-[9px] text-muted-foreground">{technology as string}</span></span></div>)}</div>
      </div>
    </section>
  );
}
