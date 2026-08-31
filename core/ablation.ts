import { retrieveWithStrategy, type RetrievalStrategy } from './engine.ts';
import type { CorpusDocument } from './types.ts';
import { curatedContentHash } from './ingestion.ts';

export interface RetrievalExpectation {
  id: string;
  query: string;
  expectedIds: string[];
  shouldRefuse: boolean;
}

export interface AblationResult {
  name: string;
  recallAt5: number;
  mrr: number;
  expectedEvidence: number;
  corpusRecords: number;
}

interface TokenWithOrigin {
  token: string;
  documentId: string;
}

export function buildFixedWindowCorpus(
  documents: CorpusDocument[],
  windowTokens = 90,
  overlapTokens = 15,
): CorpusDocument[] {
  const bySource = new Map<string, CorpusDocument[]>();
  for (const document of documents) {
    const group = bySource.get(document.sourceUrl) ?? [];
    group.push(document);
    bySource.set(document.sourceUrl, group);
  }
  const chunks: CorpusDocument[] = [];
  for (const [sourceUrl, group] of bySource) {
    const stream: TokenWithOrigin[] = group.flatMap((document) =>
      `${document.title} ${document.content} ${document.documentedMeaning} ${document.nextEvidence.join(' ')} ${document.limitations.join(' ')}`
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => ({ token, documentId: document.id })),
    );
    const stride = Math.max(1, windowTokens - overlapTokens);
    for (let start = 0, index = 0; start < stream.length; start += stride, index += 1) {
      const window = stream.slice(start, start + windowTokens);
      if (!window.length) continue;
      const sourceDocumentIds = [...new Set(window.map((item) => item.documentId))];
      const represented = group.filter((document) => sourceDocumentIds.includes(document.id));
      const content = window.map((item) => item.token).join(' ');
      const base = represented[0];
      const draft: CorpusDocument = {
        id: `fixed-${base.source.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${index}`,
        sourceDocumentIds,
        title: `${base.source} fixed window ${index + 1}`,
        source: base.source,
        sourceUrl,
        authority: represented.some((document) => document.authority === 'official') ? 'official' : 'internal',
        signalTypes: [...new Set(represented.flatMap((document) => document.signalTypes))],
        identifiers: [...new Set(represented.flatMap((document) => document.identifiers).filter((identifier) => content.toUpperCase().includes(identifier.replace('_', ' ').toUpperCase()) || content.toUpperCase().includes(identifier.toUpperCase())))],
        gpuModels: [...new Set(represented.flatMap((document) => document.gpuModels))],
        driverBranches: [...new Set(represented.flatMap((document) => document.driverBranches))],
        updated: base.updated,
        provenance: { ...base.provenance, sourceSection: `fixed window ${index + 1}`, curatedContentHash: 'pending' },
        content,
        documentedMeaning: content,
        nextEvidence: [],
        limitations: [],
      };
      draft.provenance.curatedContentHash = curatedContentHash(draft);
      chunks.push(draft);
      if (start + windowTokens >= stream.length) break;
    }
  }
  return chunks;
}

function represents(document: CorpusDocument, expectedId: string): boolean {
  return document.id === expectedId || document.parentDocumentId === expectedId || Boolean(document.sourceDocumentIds?.includes(expectedId));
}

export function evaluateRetrieval(
  name: string,
  cases: RetrievalExpectation[],
  documents: CorpusDocument[],
  strategy: RetrievalStrategy,
): AblationResult {
  let hits = 0;
  let reciprocalRank = 0;
  let expectedEvidence = 0;
  for (const testCase of cases.filter((item) => !item.shouldRefuse && item.expectedIds.length > 0)) {
    const results = retrieveWithStrategy(testCase.query, documents, 5, strategy);
    for (const expectedId of testCase.expectedIds) {
      expectedEvidence += 1;
      const rank = results.findIndex((result) => represents(result.document, expectedId));
      if (rank >= 0) {
        hits += 1;
        reciprocalRank += 1 / (rank + 1);
      }
    }
  }
  return {
    name,
    recallAt5: expectedEvidence ? hits / expectedEvidence : 1,
    mrr: expectedEvidence ? reciprocalRank / expectedEvidence : 1,
    expectedEvidence,
    corpusRecords: documents.length,
  };
}
