import { corpus as defaultCorpus } from './corpus.ts';
import { publicBenchmarkRuns } from './benchmark.ts';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
}

interface Neo4jQueryResponse {
  data?: { fields?: string[]; values?: unknown[][] };
  errors?: Array<{ code?: string; message?: string }>;
}

export interface GraphPathRecord {
  fromId: string;
  fromType: string;
  relationship: string;
  toId: string;
  toType: string;
  detail: string;
}

function textValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

export class Neo4jError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Neo4jError';
  }
}

export function getNeo4jConfig(
  environment: Record<string, string | undefined> = process.env,
): Neo4jConfig | undefined {
  const uri = environment.NEO4J_URI?.trim();
  const username = environment.NEO4J_USERNAME?.trim();
  const password = environment.NEO4J_PASSWORD?.trim();
  const database = environment.NEO4J_DATABASE?.trim();
  if (!uri || !username || !password || !database) return undefined;
  return { uri, username, password, database };
}

function queryEndpoint(config: Neo4jConfig): string {
  const host = config.uri.replace(/^neo4j\+s:\/\//, '').replace(/^bolt\+s:\/\//, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${host}/db/${encodeURIComponent(config.database)}/query/v2`;
}

export async function neo4jQuery(
  statement: string,
  parameters: Record<string, unknown>,
  config: Neo4jConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<Neo4jQueryResponse> {
  const credentials = btoa(`${config.username}:${config.password}`);
  const response = await fetchImpl(queryEndpoint(config), {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ statement, parameters }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Neo4jError(`Neo4j Query API returned HTTP ${response.status}.`);
  const payload = (await response.json()) as Neo4jQueryResponse;
  if (payload.errors?.length) throw new Neo4jError(payload.errors[0].message ?? 'Neo4j query failed.');
  return payload;
}

export async function syncNeo4jGraph(
  config: Neo4jConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ evidence: number; signals: number; benchmarks: number }> {
  const documents = defaultCorpus.map((document) => ({
    id: document.id,
    title: document.title,
    authority: document.authority,
    source: document.source,
    sourceUrl: document.sourceUrl,
    identifiers: document.identifiers,
  }));
  const signals = [...new Set(documents.flatMap((document) => document.identifiers))];
  await neo4jQuery(
    `UNWIND $documents AS item
     MERGE (d:Evidence {id: item.id})
     SET d.title = item.title, d.authority = item.authority, d.source = item.source, d.sourceUrl = item.sourceUrl
     FOREACH (identifier IN item.identifiers |
       MERGE (s:Signal {id: identifier})
       MERGE (s)-[:SUPPORTED_BY]->(d))
     RETURN count(d) AS evidenceCount`,
    { documents },
    config,
    fetchImpl,
  );
  await neo4jQuery(
    `UNWIND $runs AS item
     MERGE (r:BenchmarkRun {id: item.id})
     SET r.label = item.label, r.model = item.model, r.backend = item.backend,
         r.ttftP99Ms = item.ttftP99Ms, r.requestLatencyP99Ms = item.requestLatencyP99Ms,
         r.outputTokensPerSecond = item.outputTokensPerSecond, r.requestsPerSecond = item.requestsPerSecond
     MERGE (m:Model {id: item.model})
     MERGE (r)-[:BENCHMARKS]->(m)
     MERGE (b:ServingBackend {id: item.backend})
     MERGE (r)-[:USES_BACKEND]->(b)
     RETURN count(r) AS benchmarkCount`,
    { runs: publicBenchmarkRuns },
    config,
    fetchImpl,
  );
  await neo4jQuery(
    `MERGE (otel:Technology {id: 'OpenTelemetry'})
     MERGE (dcgm:Technology {id: 'DCGM'})
     MERGE (pinecone:Technology {id: 'Pinecone'})
     MERGE (neo4j:Technology {id: 'Neo4j'})
     MERGE (mistral:Technology {id: 'Mistral'})
     MERGE (deepgram:Technology {id: 'Deepgram'})
     MERGE (dcgm)-[:EXPORTS_THROUGH]->(otel)
     MERGE (pinecone)-[:RETRIEVES]->(:EvidenceStore {id: 'reviewed-corpus'})
     MERGE (neo4j)-[:CONNECTS]->(:EvidenceGraph {id: 'signal-topology'})
     MERGE (mistral)-[:GENERATES]->(:OutputContract {id: 'grounded-signal-card'})
     MERGE (deepgram)-[:TRANSCRIBES]->(:Interaction {id: 'voice-briefing'})
     RETURN 1 AS complete`,
    {},
    config,
    fetchImpl,
  );
  return { evidence: documents.length, signals: signals.length, benchmarks: publicBenchmarkRuns.length };
}

export async function readGraphPaths(
  config: Neo4jConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<GraphPathRecord[]> {
  const payload = await neo4jQuery(
    `MATCH (a)-[r]->(b)
     WHERE a:Signal OR a:BenchmarkRun OR a:Technology
     RETURN coalesce(a.id, a.name) AS fromId, labels(a)[0] AS fromType,
            type(r) AS relationship, coalesce(b.id, b.name) AS toId,
            labels(b)[0] AS toType, coalesce(a.title, a.label, a.model, '') AS detail
     ORDER BY fromType, fromId, relationship
     LIMIT 40`,
    {},
    config,
    fetchImpl,
  );
  return (payload.data?.values ?? []).map((row) => ({
    fromId: textValue(row[0]),
    fromType: textValue(row[1]),
    relationship: textValue(row[2]),
    toId: textValue(row[3]),
    toType: textValue(row[4]),
    detail: textValue(row[5]),
  }));
}
