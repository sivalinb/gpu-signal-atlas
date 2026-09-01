export interface BenchmarkRun {
  id: string;
  label: string;
  model: string;
  backend: string;
  concurrency: number;
  inputTokens: number;
  datasetEntries: number;
  ttftP99Ms: number;
  interTokenLatencyP99Ms: number;
  requestLatencyP99Ms: number;
  outputTokensPerSecond: number;
  requestsPerSecond: number;
  gpuPowerP99W: number;
  gpuEnergyP99Mj: number;
  gpuUtilizationP99Pct: number;
  gpuMemoryP99Gb: number;
}

export interface BenchmarkProvenance {
  title: string;
  publisher: string;
  sourceUrl: string;
  licenseUrl: string;
  retrievedAt: string;
  evidenceClass: 'public-measurement';
  caveat: string;
}

export interface SloTarget {
  ttftP99Ms: number;
  interTokenLatencyP99Ms: number;
  requestLatencyP99Ms: number;
  minimumRequestsPerSecond: number;
}

export interface CapacityInput {
  runId: string;
  targetRequestsPerSecond: number;
  headroomPct: number;
  gpuHourlyCostUsd: number;
}

export const benchmarkProvenance: BenchmarkProvenance = {
  title: 'NVIDIA GenAI-Perf Analyze example summary report',
  publisher: 'NVIDIA Triton Inference Server / Perf Analyzer',
  sourceUrl:
    'https://github.com/triton-inference-server/perf_analyzer/blob/main/genai-perf/docs/analyze.md#summary-report-csv',
  licenseUrl:
    'https://github.com/triton-inference-server/perf_analyzer/blob/main/LICENSE',
  retrievedAt: '2026-09-01',
  evidenceClass: 'public-measurement',
  caveat:
    'These three values reproduce the public documentation example. The GPU model, server configuration, confidence interval, and repetition count are not reported, so they are demonstration data—not a hardware purchasing claim.',
};

export const publicBenchmarkRuns: BenchmarkRun[] = [
  {
    id: 'gpt2-config-100',
    label: 'Run A · 100 entries',
    model: 'GPT-2',
    backend: 'Triton + vLLM',
    concurrency: 1,
    inputTokens: 201,
    datasetEntries: 100,
    ttftP99Ms: 82.02,
    interTokenLatencyP99Ms: 7.53,
    requestLatencyP99Ms: 879.2,
    outputTokensPerSecond: 145.93,
    requestsPerSecond: 1.3,
    gpuPowerP99W: 63.09,
    gpuEnergyP99Mj: 1.72,
    gpuUtilizationP99Pct: 20,
    gpuMemoryP99Gb: 22.63,
  },
  {
    id: 'gpt2-config-150',
    label: 'Run B · 150 entries',
    model: 'GPT-2',
    backend: 'Triton + vLLM',
    concurrency: 1,
    inputTokens: 201,
    datasetEntries: 150,
    ttftP99Ms: 33.13,
    interTokenLatencyP99Ms: 7.29,
    requestLatencyP99Ms: 778.62,
    outputTokensPerSecond: 147.93,
    requestsPerSecond: 1.32,
    gpuPowerP99W: 64.49,
    gpuEnergyP99Mj: 1.73,
    gpuUtilizationP99Pct: 20,
    gpuMemoryP99Gb: 22.63,
  },
  {
    id: 'gpt2-config-200',
    label: 'Run C · 200 entries',
    model: 'GPT-2',
    backend: 'Triton + vLLM',
    concurrency: 1,
    inputTokens: 201,
    datasetEntries: 200,
    ttftP99Ms: 33.54,
    interTokenLatencyP99Ms: 7.16,
    requestLatencyP99Ms: 779.75,
    outputTokensPerSecond: 149.63,
    requestsPerSecond: 1.32,
    gpuPowerP99W: 64.46,
    gpuEnergyP99Mj: 1.73,
    gpuUtilizationP99Pct: 20,
    gpuMemoryP99Gb: 22.63,
  },
];

export const defaultSlo: SloTarget = {
  ttftP99Ms: 50,
  interTokenLatencyP99Ms: 8,
  requestLatencyP99Ms: 800,
  minimumRequestsPerSecond: 1.3,
};

function findRun(runId: string): BenchmarkRun {
  const run = publicBenchmarkRuns.find((candidate) => candidate.id === runId);
  if (!run) throw new Error(`Unknown benchmark run: ${runId}`);
  return run;
}

export function percentageChange(baseline: number, candidate: number): number {
  if (baseline === 0) return 0;
  return ((candidate - baseline) / baseline) * 100;
}

export function evaluateSlo(run: BenchmarkRun, slo: SloTarget) {
  const checks = [
    { metric: 'TTFT p99', value: run.ttftP99Ms, target: slo.ttftP99Ms, unit: 'ms', pass: run.ttftP99Ms <= slo.ttftP99Ms },
    { metric: 'ITL p99', value: run.interTokenLatencyP99Ms, target: slo.interTokenLatencyP99Ms, unit: 'ms', pass: run.interTokenLatencyP99Ms <= slo.interTokenLatencyP99Ms },
    { metric: 'Request latency p99', value: run.requestLatencyP99Ms, target: slo.requestLatencyP99Ms, unit: 'ms', pass: run.requestLatencyP99Ms <= slo.requestLatencyP99Ms },
    { metric: 'Request throughput', value: run.requestsPerSecond, target: slo.minimumRequestsPerSecond, unit: 'req/s', pass: run.requestsPerSecond >= slo.minimumRequestsPerSecond },
  ];
  return { pass: checks.every((check) => check.pass), checks };
}

export function compareRuns(baselineId: string, candidateId: string, slo = defaultSlo) {
  const baseline = findRun(baselineId);
  const candidate = findRun(candidateId);
  const sloResult = evaluateSlo(candidate, slo);
  return {
    baseline,
    candidate,
    slo: sloResult,
    deltas: {
      ttftPct: percentageChange(baseline.ttftP99Ms, candidate.ttftP99Ms),
      itlPct: percentageChange(baseline.interTokenLatencyP99Ms, candidate.interTokenLatencyP99Ms),
      requestLatencyPct: percentageChange(
        baseline.requestLatencyP99Ms,
        candidate.requestLatencyP99Ms,
      ),
      throughputPct: percentageChange(
        baseline.outputTokensPerSecond,
        candidate.outputTokensPerSecond,
      ),
      powerPct: percentageChange(baseline.gpuPowerP99W, candidate.gpuPowerP99W),
    },
  };
}

export function planCapacity(input: CapacityInput) {
  const run = findRun(input.runId);
  const safeCapacityPerGpu = run.requestsPerSecond * (1 - input.headroomPct / 100);
  const gpuCount = Math.max(1, Math.ceil(input.targetRequestsPerSecond / safeCapacityPerGpu));
  const monthlyCostUsd = gpuCount * input.gpuHourlyCostUsd * 730;
  return {
    run,
    safeCapacityPerGpu,
    gpuCount,
    monthlyCostUsd,
    note: 'Derived planning scenario. Replace the hourly cost and public reference run with measurements from the intended hardware, model, workload, and serving stack before making a procurement decision.',
  };
}

export function buildDecisionReport(baselineId: string, candidateId: string, slo = defaultSlo) {
  const comparison = compareRuns(baselineId, candidateId, slo);
  return {
    generatedAt: new Date().toISOString(),
    reportType: 'GPU Signal Atlas benchmark evidence report',
    evidenceClass: benchmarkProvenance.evidenceClass,
    provenance: benchmarkProvenance,
    comparison,
    recommendation: comparison.slo.pass
      ? 'Candidate satisfies the configured demonstration SLO. Validate with repeated runs on the target stack before promotion.'
      : 'Candidate misses at least one configured SLO. Keep it out of promotion and inspect queueing, batching, saturation, and topology evidence.',
    safetyBoundary:
      'This report ranks evidence and SLO checks. It does not prove root cause, predict production traffic, or authorize active GPU diagnostics.',
  };
}
