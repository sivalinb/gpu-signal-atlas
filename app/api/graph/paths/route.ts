import { getNeo4jConfig, Neo4jError, readGraphPaths } from '@/core/neo4j';
import { recordProviderObservation } from '@/core/provider-observability';

export async function GET(): Promise<Response> {
  const config = getNeo4jConfig();
  if (!config)
    return Response.json({ configured: false, paths: [] }, { status: 503 });
  const startedAt = performance.now();
  try {
    const paths = await readGraphPaths(config);
    recordProviderObservation({
      provider: 'neo4j',
      operation: 'graph_paths',
      durationMs: performance.now() - startedAt,
      ok: true,
      itemCount: paths.length,
    });
    return Response.json(
      { configured: true, database: config.database, paths },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  } catch (error) {
    recordProviderObservation({
      provider: 'neo4j',
      operation: 'graph_paths',
      durationMs: performance.now() - startedAt,
      ok: false,
    });
    if (error instanceof Neo4jError) console.error('Neo4j graph query failed.');
    return Response.json(
      {
        configured: true,
        paths: [],
        error: 'Evidence graph is temporarily unavailable.',
      },
      { status: 503 },
    );
  }
}
