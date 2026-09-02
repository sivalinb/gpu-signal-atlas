'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ChartNoAxesCombined,
  CircleAlert,
  Database,
  Gauge,
  RefreshCw,
  ServerCog,
  ShieldCheck,
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
import type { ProviderObservabilitySummary } from '@/core/provider-observability';
import releaseEvaluation from '@/evaluation/week4/results/v2-pinecone-improved.json';

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function formatNumber(value: number): string {
  return formatter.format(value);
}

function formatLatency(value: number): string {
  return value > 0 ? `${formatNumber(value)} ms` : 'No samples';
}

function formatTime(value?: string): string {
  if (!value) return 'Awaiting activity';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function Sparkline({
  points,
}: {
  points: Array<{ timestamp: string; latencyMs: number }>;
}) {
  const width = 640;
  const height = 170;
  const inset = 14;
  const maximum = Math.max(...points.map((point) => point.latencyMs), 1);
  const coordinates = points.map((point, index) => ({
    x:
      points.length === 1
        ? width / 2
        : inset + (index / (points.length - 1)) * (width - inset * 2),
    y: height - inset - (point.latencyMs / maximum) * (height - inset * 2),
  }));
  const path = coordinates.map((point) => `${point.x},${point.y}`).join(' ');

  if (points.length === 0) {
    return (
      <div className="grid h-[170px] place-items-center rounded-xl border border-dashed border-border/80 bg-black/10 px-6 text-center">
        <div>
          <Activity className="mx-auto size-5 text-primary/60" />
          <p className="mt-2 text-xs text-muted-foreground">
            Run an analysis to create the first query sample.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-black/15">
      <svg
        aria-label="Pinecone query latency chart"
        className="h-[170px] w-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient
            id="provider-observability-area"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="oklch(0.82 0.16 165)"
              stopOpacity="0.32"
            />
            <stop
              offset="100%"
              stopColor="oklch(0.82 0.16 165)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((position) => (
          <line
            key={position}
            x1="0"
            x2={width}
            y1={height * position}
            y2={height * position}
            stroke="currentColor"
            className="text-border/50"
            strokeDasharray="4 7"
          />
        ))}
        {coordinates.length > 1 && (
          <polygon
            points={`${inset},${height - inset} ${path} ${width - inset},${height - inset}`}
            fill="url(#provider-observability-area)"
          />
        )}
        {coordinates.length > 1 && (
          <polyline
            points={path}
            fill="none"
            stroke="oklch(0.82 0.16 165)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {coordinates.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={index === coordinates.length - 1 ? 5 : 3}
            fill="oklch(0.82 0.16 165)"
          />
        ))}
      </svg>
      <span className="absolute left-3 top-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        max {formatLatency(maximum)}
      </span>
      <span className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        latest {formatLatency(points.at(-1)?.latencyMs ?? 0)}
      </span>
    </div>
  );
}

function StageBars({
  stages,
}: {
  stages: Array<{ name: string; durationMs: number }>;
}) {
  const maximum = Math.max(...stages.map((stage) => stage.durationMs), 1);
  if (stages.length === 0) {
    return (
      <div className="grid min-h-[170px] place-items-center rounded-xl border border-dashed border-border/80 bg-black/10 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          The latest extract, retrieval, and generation timings appear after an
          analysis.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4 py-2">
      {stages.map((stage) => (
        <div key={stage.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 font-mono text-[10px]">
            <span className="truncate uppercase tracking-wider text-slate-300">
              {stage.name.replace('rag.', '').replaceAll('_', ' ')}
            </span>
            <span className="shrink-0 text-primary">
              {formatLatency(stage.durationMs)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/55 to-primary"
              style={{
                width: `${Math.max(4, (stage.durationMs / maximum) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProviderObservability() {
  const [summary, setSummary] = useState<ProviderObservabilitySummary>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/observability/summary', {
        cache: 'no-store',
        signal,
      });
      if (!response.ok)
        throw new Error('Provider metrics are temporarily unavailable.');
      setSummary((await response.json()) as ProviderObservabilitySummary);
      setError(undefined);
    } catch (refreshError) {
      if (
        !(
          refreshError instanceof DOMException &&
          refreshError.name === 'AbortError'
        )
      ) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : 'Provider metrics are temporarily unavailable.',
        );
      }
    } finally {
      if (!signal?.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void refresh(controller.signal));
    const interval = window.setInterval(
      () => void refresh(controller.signal),
      15_000,
    );
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refresh]);

  const indexedCoverage = summary?.pinecone.expectedRecords
    ? Math.min(
        100,
        (summary.pinecone.namespaceVectorCount /
          summary.pinecone.expectedRecords) *
          100,
      )
    : 0;
  const releaseLatencies = releaseEvaluation.cases.map((item) => item.latencyMs).sort((a, b) => a - b);
  const releaseP99 = releaseLatencies[Math.max(0, Math.ceil(releaseLatencies.length * 0.99) - 1)] ?? 0;

  return (
    <section
      id="provider-observability"
      className="relative z-10 border-b border-border/70 bg-[radial-gradient(circle_at_15%_10%,oklch(0.82_0.16_165/.08),transparent_28%),linear-gradient(180deg,oklch(0.15_0.016_248),oklch(0.135_0.014_250))] py-16"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary">
                Live provider metrics
              </Badge>
              <Badge
                variant="outline"
                className="border-border bg-black/15 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
              >
                Current server runtime · non-durable
              </Badge>
            </div>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              See the evidence system observe itself.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A sanitized operational view of Pinecone index health and query
              cost, RAG latency, provider request health, and OpenTelemetry
              ingestion. No API keys, prompts, raw logs, or trace payloads are
              returned to the browser.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Updated {formatTime(summary?.generatedAt)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw
                className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />{' '}
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs text-amber-100/80">
            <CircleAlert className="size-4 shrink-0 text-amber-300" /> {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Database,
              label: 'Pinecone vectors',
              value: summary
                ? `${summary.pinecone.namespaceVectorCount} / ${summary.pinecone.expectedRecords}`
                : '—',
              note: `${formatNumber(indexedCoverage)}% approved-corpus coverage`,
            },
            {
              icon: ServerCog,
              label: 'Vector dimension',
              value: summary?.pinecone.dimension
                ? String(summary.pinecone.dimension)
                : '—',
              note: summary?.pinecone.reachable
                ? 'Index reachable now'
                : 'Awaiting index check',
            },
            {
              icon: Gauge,
              label: 'Query p95',
              value: formatLatency(summary?.pinecone.p95Ms ?? 0),
              note: `${summary?.pinecone.queryCount ?? 0} runtime query samples`,
            },
            {
              icon: ChartNoAxesCombined,
              label: 'Pinecone read units',
              value: formatNumber(summary?.pinecone.readUnits ?? 0),
              note: 'Operation-level query usage',
            },
          ].map((metric) => (
            <Card
              key={metric.label}
              className="border border-border/70 bg-card/80"
            >
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <metric.icon className="size-4 text-primary/70" />
                </div>
                <p className="mt-3 font-mono text-2xl text-primary">
                  {metric.value}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {metric.note}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card className="border border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-primary" /> Pinecone query
                latency
              </CardTitle>
              <CardDescription>
                Each point is a real application query observed in this server
                runtime; read units come from Pinecone&apos;s query response.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Sparkline points={summary?.pinecone.series ?? []} />
            </CardContent>
          </Card>
          <Card className="border border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4 text-primary" /> Latest RAG stage
                timing
              </CardTitle>
              <CardDescription>
                Signal extraction, hybrid retrieval, and evidence-gated
                generation from the latest completed request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StageBars stages={summary?.rag.latestStages ?? []} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="border border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ServerCog className="size-4 text-primary" /> Provider activity
              </CardTitle>
              <CardDescription>
                Server-side request observations only. “Configured” means
                credentials are present; it does not imply a request was made.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(summary?.providers ?? []).map((provider) => (
                <div
                  key={provider.key}
                  className="rounded-xl border border-border/70 bg-black/15 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-sm font-semibold">
                      {provider.label}
                    </p>
                    <span
                      className={`size-2 rounded-full ${provider.configured ? (provider.errors ? 'bg-amber-300' : 'bg-emerald-300') : 'bg-slate-600'}`}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[10px]">
                    <div>
                      <p className="text-muted-foreground">Requests</p>
                      <p className="mt-1 text-base text-primary">
                        {provider.requests}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Errors</p>
                      <p className="mt-1 text-base text-foreground">
                        {provider.errors}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">p50</p>
                      <p className="mt-1 text-foreground">
                        {formatLatency(provider.p50Ms)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last seen</p>
                      <p className="mt-1 text-foreground">
                        {formatTime(provider.lastSeen)}
                      </p>
                    </div>
                  </div>
                  <p className={`mt-3 border-t border-border/60 pt-3 text-[10px] leading-4 ${provider.errors ? 'text-amber-200' : 'text-muted-foreground'}`}>
                    {!provider.configured ? 'Not configured' : provider.errors ? (provider.key === 'langsmith' ? 'Trace export unavailable; local analysis remains complete' : 'Provider request errors observed') : provider.requests ? 'Requests successful in this runtime' : 'Configured; awaiting a request'}
                  </p>
                </div>
              ))}
              {!summary && (
                <p className="text-xs text-muted-foreground">
                  Loading provider activity…
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="border border-primary/20 bg-primary/[0.035]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" /> RAG outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Grounded', summary?.rag.grounded ?? 0],
                    ['Refused', summary?.rag.refused ?? 0],
                    ['Failed', summary?.rag.failed ?? 0],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border/70 bg-black/15 px-2 py-3"
                    >
                      <p className="font-mono text-xl text-primary">{value}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  End-to-end p95:{' '}
                  <span className="font-mono text-foreground">
                    {formatLatency(summary?.rag.p95Ms ?? 0)}
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">
                  OpenTelemetry safety buffer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Buffered sanitized events</span>
                  <span className="font-mono text-foreground">
                    {summary?.telemetry.bufferedEvents ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Redactions applied</span>
                  <span className="font-mono text-foreground">
                    {summary?.telemetry.redactions ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Retention</span>
                  <span className="font-mono text-foreground">15 minutes</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-5 border border-primary/20 bg-primary/[0.025]">
          <CardHeader><CardTitle className="flex items-center gap-2"><ChartNoAxesCombined className="size-4 text-primary" /> Measurement windows and durability</CardTitle><CardDescription>Live runtime observations and frozen release evidence are deliberately separated.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-black/15 p-4"><p className="font-mono text-[9px] uppercase tracking-wider text-primary">Current runtime</p><p className="mt-2 text-sm">p50 {formatLatency(summary?.rag.p50Ms ?? 0)} · p95 {formatLatency(summary?.rag.p95Ms ?? 0)}</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Up to 120 in-memory samples. Restarts reset the window.</p></div>
            <div className="rounded-xl border border-border/70 bg-black/15 p-4"><p className="font-mono text-[9px] uppercase tracking-wider text-primary">Frozen release gate</p><p className="mt-2 text-sm">Pinecone p50 {Math.round(releaseEvaluation.aggregate.performance.p50LatencyMs)} ms · p95 {Math.round(releaseEvaluation.aggregate.performance.p95LatencyMs)} ms · p99 {Math.round(releaseP99)} ms</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">100 versioned cases · {releaseEvaluation.aggregate.performance.pineconeReadUnits} read units · corpus/index version recorded per case.</p></div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.025] p-4"><p className="font-mono text-[9px] uppercase tracking-wider text-amber-200">Production history</p><p className="mt-2 text-sm">5m / 1h / 24h · not connected</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Requires a durable Prometheus/ClickHouse backend for cold/warm, cache-hit, cost, timeout, and drift trends. This page does not fabricate those series.</p></div>
          </CardContent>
        </Card>

        <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
          Scope: these charts are application-observed operational signals
          retained in a bounded in-memory window. Pinecone organization billing,
          historical Prometheus metrics, and vendor-console data remain in their
          provider control planes and are intentionally not represented as live
          values here.
        </p>
      </div>
    </section>
  );
}
