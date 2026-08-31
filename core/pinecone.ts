import { corpus as defaultCorpus } from './corpus.ts';
import { retrieveWithExternalDenseScores } from './engine.ts';
import type { CorpusDocument, RetrievalResult } from './types.ts';
import { documentText, embed, EMBEDDING_DIMENSIONS } from './vector.ts';

const PINECONE_API_VERSION = '2026-04';

export interface PineconeConfig {
  apiKey: string;
  host: string;
  indexName: string;
  namespace: string;
}

interface PineconeMatch {
  id?: string;
  score?: number;
}

interface PineconeQueryResponse {
  matches?: PineconeMatch[];
}

interface PineconeStatsResponse {
  dimension?: number;
  totalVectorCount?: number;
  namespaces?: Record<string, { vectorCount?: number }>;
}

export class PineconeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PineconeConfigurationError';
  }
}

export class PineconeRequestError extends Error {
  readonly status: number;

  constructor(operation: string, status: number) {
    super(`Pinecone ${operation} failed with status ${status}`);
    this.name = 'PineconeRequestError';
    this.status = status;
  }
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new PineconeConfigurationError(`${name} is required`);
  return normalized;
}

function normalizeHost(host: string): string {
  return `${/^https:\/\//i.test(host) ? '' : 'https://'}${host}`.replace(/\/+$/, '');
}

export function getPineconeConfig(
  environment: Record<string, string | undefined> = process.env,
): PineconeConfig {
  return {
    apiKey: required(environment.PINECONE_API_KEY, 'PINECONE_API_KEY'),
    host: normalizeHost(required(environment.PINECONE_INDEX_HOST, 'PINECONE_INDEX_HOST')),
    indexName: required(environment.PINECONE_INDEX_NAME, 'PINECONE_INDEX_NAME'),
    namespace: required(environment.PINECONE_NAMESPACE, 'PINECONE_NAMESPACE'),
  };
}

function headers(config: PineconeConfig): HeadersInit {
  return {
    'Api-Key': config.apiKey,
    'Content-Type': 'application/json',
    'X-Pinecone-Api-Version': PINECONE_API_VERSION,
  };
}

async function pineconeFetch(
  config: PineconeConfig,
  path: string,
  operation: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const response = await fetchImpl(`${config.host}${path}`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new PineconeRequestError(operation, response.status);
  return response;
}

export async function retrieveFromPinecone(
  query: string,
  config: PineconeConfig = getPineconeConfig(),
  documents: CorpusDocument[] = defaultCorpus,
  limit = 5,
  fetchImpl: typeof fetch = fetch,
): Promise<{ retrieval: RetrievalResult[]; vectorIndexVersion: string }> {
  const vector = embed(query);
  const response = await pineconeFetch(
    config,
    '/query',
    'query',
    {
      vector,
      topK: Math.min(100, Math.max(documents.length, limit * 4)),
      namespace: config.namespace,
      includeValues: false,
      includeMetadata: false,
    },
    fetchImpl,
  );
  const payload = (await response.json()) as PineconeQueryResponse;
  const denseScores = new Map<string, number>();
  for (const match of payload.matches ?? []) {
    if (match.id && Number.isFinite(match.score)) denseScores.set(match.id, match.score ?? 0);
  }
  if (denseScores.size === 0) throw new PineconeRequestError('query returned no matches', 503);
  return {
    retrieval: retrieveWithExternalDenseScores(query, denseScores, documents, limit),
    vectorIndexVersion: `pinecone:${config.indexName}:${config.namespace}`,
  };
}

export async function upsertCorpusToPinecone(
  config: PineconeConfig = getPineconeConfig(),
  documents: CorpusDocument[] = defaultCorpus,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const vectors = documents.map((document) => ({
    id: document.id,
    values: embed(documentText(document)),
    metadata: {
      title: document.title,
      source: document.source,
      sourceUrl: document.sourceUrl,
      authority: document.authority,
      signalTypes: document.signalTypes,
      identifiers: document.identifiers,
      gpuModels: document.gpuModels,
      driverBranches: document.driverBranches,
      sourceVersion: document.provenance.sourceVersion,
      retrievedAt: document.provenance.retrievedAt,
      sourceSection: document.provenance.sourceSection,
      curatedContentHash: document.provenance.curatedContentHash,
      reviewStatus: document.provenance.reviewStatus,
    },
  }));
  await pineconeFetch(
    config,
    '/vectors/upsert',
    'upsert',
    { vectors, namespace: config.namespace },
    fetchImpl,
  );
  return vectors.length;
}

export async function describePineconeStats(
  config: PineconeConfig = getPineconeConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<{ dimension: number; namespaceVectorCount: number; totalVectorCount: number }> {
  const response = await pineconeFetch(
    config,
    '/describe_index_stats',
    'describe index stats',
    {},
    fetchImpl,
  );
  const payload = (await response.json()) as PineconeStatsResponse;
  return {
    dimension: payload.dimension ?? 0,
    namespaceVectorCount: payload.namespaces?.[config.namespace]?.vectorCount ?? 0,
    totalVectorCount: payload.totalVectorCount ?? 0,
  };
}

export function assertPineconeDimension(dimension: number): void {
  if (dimension !== EMBEDDING_DIMENSIONS) {
    throw new PineconeConfigurationError(
      `Pinecone dimension ${dimension} does not match embedding dimension ${EMBEDDING_DIMENSIONS}`,
    );
  }
}
