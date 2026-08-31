import type { CorpusDocument } from './types.ts';
import { fnv1aHex } from './vector.ts';
import type { CorpusSource } from '../ingestion/source-manifest.ts';

export interface SourceSnapshot {
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;
  contentHash: string;
  cleanedText: string;
  headers: Record<string, string>;
}

export interface FreshnessResult {
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string | null;
  ageDays: number | null;
  refreshCadenceDays: number;
  status: 'fresh' | 'due' | 'missing';
  documentIds: string[];
}

const entities: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? match;
  });
}

export function cleanHtml(html: string): string {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|svg|nav|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/h[1-6]|\/li|\/tr)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutNoise)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function curatedContentHash(document: Pick<CorpusDocument, 'id' | 'content' | 'documentedMeaning'>): string {
  return `fnv1a:${fnv1aHex(`${document.id}\n${document.content}\n${document.documentedMeaning}`)}`;
}

export function createSourceSnapshot(source: CorpusSource, html: string, fetchedAt: string, headers: Record<string, string> = {}): SourceSnapshot {
  const cleanedText = cleanHtml(html);
  if (cleanedText.length < 80) throw new Error(`Cleaned source ${source.id} is unexpectedly short`);
  return { sourceId: source.id, sourceUrl: source.url, fetchedAt, contentHash: `fnv1a:${fnv1aHex(cleanedText)}`, cleanedText, headers };
}

function daysBetween(earlier: string, later: Date): number {
  const start = new Date(`${earlier}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor((later.getTime() - start) / 86_400_000));
}

export function assessCorpusFreshness(documents: CorpusDocument[], sources: CorpusSource[], asOf = new Date()): FreshnessResult[] {
  return sources.map((source) => {
    const linked = documents.filter((document) => document.sourceUrl === source.url);
    const retrievedDates = linked.map((document) => document.provenance.retrievedAt).sort();
    const retrievedAt = retrievedDates.at(-1) ?? null;
    const ageDays = retrievedAt ? daysBetween(retrievedAt, asOf) : null;
    return {
      sourceId: source.id,
      sourceUrl: source.url,
      retrievedAt,
      ageDays,
      refreshCadenceDays: source.refreshCadenceDays,
      status: ageDays === null ? 'missing' : ageDays > source.refreshCadenceDays ? 'due' : 'fresh',
      documentIds: linked.map((document) => document.id),
    };
  });
}

export function validateCorpusSources(documents: CorpusDocument[], sources: CorpusSource[]): string[] {
  const failures: string[] = [];
  const manifestUrls = new Set(sources.map((source) => source.url));
  for (const document of documents) {
    if (!manifestUrls.has(document.sourceUrl)) failures.push(`${document.id}: source URL is not allow-listed`);
    if (curatedContentHash(document) !== document.provenance.curatedContentHash) failures.push(`${document.id}: curated content fingerprint is stale`);
  }
  for (const source of sources) {
    if (!source.url.startsWith('https://')) failures.push(`${source.id}: source URL must use HTTPS`);
    if (!documents.some((document) => document.sourceUrl === source.url)) failures.push(`${source.id}: manifest source has no reviewed corpus record`);
  }
  return failures;
}
