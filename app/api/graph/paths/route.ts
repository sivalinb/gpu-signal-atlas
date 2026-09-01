import { getNeo4jConfig, Neo4jError, readGraphPaths } from '@/core/neo4j';

export async function GET(): Promise<Response> {
  const config = getNeo4jConfig();
  if (!config) return Response.json({ configured: false, paths: [] }, { status: 503 });
  try {
    const paths = await readGraphPaths(config);
    return Response.json(
      { configured: true, database: config.database, paths },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  } catch (error) {
    if (error instanceof Neo4jError) console.error('Neo4j graph query failed.');
    return Response.json({ configured: true, paths: [], error: 'Evidence graph is temporarily unavailable.' }, { status: 503 });
  }
}
