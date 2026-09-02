import assert from 'node:assert/strict';
import test from 'node:test';

import {
  benchmarkProvenance,
  benchmarkCampaignContract,
  buildDecisionReport,
  compareRuns,
  defaultSlo,
  evaluateSlo,
  planCapacity,
  publicBenchmarkRuns,
} from '../core/benchmark.ts';

test('public benchmark records retain complete provenance and positive metrics', () => {
  assert.match(benchmarkProvenance.sourceUrl, /^https:\/\//);
  assert.match(benchmarkProvenance.licenseUrl, /^https:\/\//);
  assert.equal(benchmarkProvenance.evidenceClass, 'public-measurement');
  assert.equal(publicBenchmarkRuns.length, 3);
  assert.ok(publicBenchmarkRuns.every((run) => run.ttftP99Ms > 0 && run.requestsPerSecond > 0));
});

test('benchmark campaign contract exposes missing reproducibility evidence', () => {
  assert.equal(benchmarkCampaignContract.status, 'public-reference-incomplete');
  assert.ok(benchmarkCampaignContract.requiredBeforePromotion.some((item) => item.includes('GPU SKU')));
  assert.ok(benchmarkCampaignContract.requiredBeforePromotion.some((item) => item.includes('confidence interval')));
  assert.match(benchmarkCampaignContract.exactCommandTemplate, /genai-perf profile/);
});

test('SLO evaluation is deterministic and exposes every decision', () => {
  const result = evaluateSlo(publicBenchmarkRuns[2], defaultSlo);
  assert.equal(result.pass, true);
  assert.equal(result.checks.length, 4);
  assert.ok(result.checks.every((check) => typeof check.pass === 'boolean'));
});

test('comparison computes lower latency and higher output throughput as expected', () => {
  const comparison = compareRuns('gpt2-config-100', 'gpt2-config-200');
  assert.ok(comparison.deltas.ttftPct < 0);
  assert.ok(comparison.deltas.requestLatencyPct < 0);
  assert.ok(comparison.deltas.throughputPct > 0);
});

test('capacity planner applies headroom before rounding GPU count', () => {
  const plan = planCapacity({
    runId: 'gpt2-config-200',
    targetRequestsPerSecond: 10,
    headroomPct: 30,
    gpuHourlyCostUsd: 4,
  });
  assert.equal(plan.gpuCount, 11);
  assert.equal(plan.monthlyCostUsd, 32120);
  assert.match(plan.note, /Derived planning scenario/);
});

test('decision report carries provenance and a bounded recommendation', () => {
  const report = buildDecisionReport('gpt2-config-100', 'gpt2-config-200');
  assert.equal(report.provenance.publisher, benchmarkProvenance.publisher);
  assert.match(report.safetyBoundary, /does not prove root cause/);
  assert.match(report.recommendation, /Validate with repeated runs/);
});
