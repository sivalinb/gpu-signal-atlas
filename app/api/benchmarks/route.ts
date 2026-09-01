import {
  benchmarkProvenance,
  defaultSlo,
  publicBenchmarkRuns,
} from '@/core/benchmark';

export async function GET(): Promise<Response> {
  return Response.json(
    { runs: publicBenchmarkRuns, provenance: benchmarkProvenance, defaultSlo },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
