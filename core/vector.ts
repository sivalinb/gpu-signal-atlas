import type { CorpusDocument } from './types.ts';

export const EMBEDDING_DIMENSIONS = 256;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_./+-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function fnv1aHex(value: string): string {
  return fnv1a(value).toString(16).padStart(8, '0');
}

export function documentText(document: CorpusDocument): string {
  return [document.title, document.content, ...document.identifiers, ...document.signalTypes].join(' ');
}

export function embed(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const tokens = tokenize(text);
  const features = [...tokens, ...tokens.slice(0, -1).map((token, index) => `${token}::${tokens[index + 1]}`)];
  const vector = Array.from({ length: dimensions }, () => 0);
  const counts = new Map<string, number>();
  for (const feature of features) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  for (const [feature, count] of counts) {
    const hash = fnv1a(feature);
    const bucket = hash % dimensions;
    const sign = hash & 1 ? 1 : -1;
    vector[bucket] += sign * (1 + Math.log(count));
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}

export function cosine(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

export function corpusVectorHash(documents: CorpusDocument[]): string {
  const payload = documents
    .map((document) => `${document.id}\n${document.provenance.curatedContentHash}\n${documentText(document)}`)
    .join('\n---\n');
  return `fnv1a:${fnv1aHex(payload)}`;
}
