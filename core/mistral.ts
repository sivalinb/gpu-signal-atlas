import { corpus as defaultCorpus } from './corpus.ts';
import { documentText, embed as localEmbed } from './vector.ts';
import type { CorpusDocument } from './types.ts';

export interface MistralConfig {
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
}

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[]; index?: number }>;
  usage?: { total_tokens?: number };
}

export class MistralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MistralError';
  }
}

export function getMistralConfig(
  environment: Record<string, string | undefined> = process.env,
): MistralConfig | undefined {
  const apiKey = environment.MISTRAL_API_KEY?.trim();
  if (!apiKey) return undefined;
  return {
    apiKey,
    baseUrl: (environment.MISTRAL_BASE_URL?.trim() || 'https://api.mistral.ai/v1').replace(/\/$/, ''),
    chatModel: environment.MISTRAL_CHAT_MODEL?.trim() || 'mistral-small-latest',
    embeddingModel: environment.MISTRAL_EMBEDDING_MODEL?.trim() || 'mistral-embed',
  };
}

export async function mistralEmbeddings(
  inputs: string[],
  config: MistralConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ vectors: number[][]; totalTokens: number }> {
  if (!inputs.length || inputs.length > 128) throw new MistralError('Embedding batch must contain 1–128 inputs.');
  const response = await fetchImpl(`${config.baseUrl}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.embeddingModel, input: inputs, encoding_format: 'float' }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new MistralError(`Mistral embeddings returned HTTP ${response.status}.`);
  const payload = (await response.json()) as EmbeddingResponse;
  const vectors = [...(payload.data ?? [])]
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
    .map((item) => item.embedding ?? []);
  if (vectors.length !== inputs.length || vectors.some((vector) => vector.length === 0)) {
    throw new MistralError('Mistral embeddings response was incomplete.');
  }
  return { vectors, totalTokens: payload.usage?.total_tokens ?? 0 };
}

function cosine(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm) || 1);
}

export async function compareEmbeddingRanks(
  query: string,
  config: MistralConfig,
  documents: CorpusDocument[] = defaultCorpus,
  fetchImpl: typeof fetch = fetch,
) {
  const texts = documents.map(documentText);
  const { vectors, totalTokens } = await mistralEmbeddings([query, ...texts], config, fetchImpl);
  const [queryVector, ...documentVectors] = vectors;
  const mistral = documents
    .map((document, index) => ({ id: document.id, title: document.title, score: cosine(queryVector, documentVectors[index]) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  const localQuery = localEmbed(query);
  const local = documents
    .map((document) => ({ id: document.id, title: document.title, score: cosine(localQuery, localEmbed(documentText(document))) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  return { query, mistral, local, totalTokens, model: config.embeddingModel };
}
