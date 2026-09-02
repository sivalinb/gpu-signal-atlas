import { corpus } from '../core/corpus.ts';
import { analyzeTelemetry, analyzeTelemetryFromRetrieval } from '../core/engine.ts';
import { getPineconeConfig, retrieveFromPinecone } from '../core/pinecone.ts';

interface AgentRequest {
  caseId: string;
  query: string;
  variant: 'baseline' | 'improved' | 'holdout';
  backend?: 'local' | 'pinecone';
}

let body = '';
for await (const chunk of process.stdin) body += chunk;

const request = JSON.parse(body) as AgentRequest;
if (!request.query?.trim()) throw new Error('query is required');

const started = performance.now();
let readUnits = 0;
let analysis: ReturnType<typeof analyzeTelemetry>;
if (request.backend === 'pinecone') {
  const managed = await retrieveFromPinecone(request.query, getPineconeConfig(), corpus, 5);
  readUnits = managed.readUnits;
  analysis = analyzeTelemetryFromRetrieval(request.query, managed.retrieval, corpus, {
    vectorIndexVersion: managed.vectorIndexVersion,
    retrievalBackend: 'pinecone',
    startedAt: started,
  });
} else {
  analysis = analyzeTelemetry(request.query);
}
const latencyMs = performance.now() - started;
const retrievedIds = analysis.retrieval.map((item) => item.document.id);
const citationIds = analysis.citations.map((citation) => citation.id);
const citedDocuments = corpus.filter((document) => citationIds.includes(document.id));
const claimGrounded = analysis.status === 'refused' || (
  citedDocuments.some((document) => document.documentedMeaning === analysis.documentedMeaning) &&
  analysis.nextEvidence.every((claim) => citedDocuments.some((document) => document.nextEvidence.includes(claim))) &&
  analysis.limitations.every((claim) => citedDocuments.some((document) => document.limitations.includes(claim)))
);

process.stdout.write(JSON.stringify({
  caseId: request.caseId,
  variant: request.variant,
  status: analysis.status,
  evidenceStrength: analysis.evidenceStrength,
  observed: analysis.observed,
  retrievedIds,
  citationIds,
  citationValidity: citationIds.every((id) => retrievedIds.includes(id) && corpus.some((document) => document.id === id)),
  claimGrounded,
  headline: analysis.headline,
  documentedMeaning: analysis.documentedMeaning,
  nextEvidence: analysis.nextEvidence,
  limitations: analysis.limitations,
  compatibilityNotes: analysis.compatibilityNotes,
  decisionReasons: analysis.diagnostics.decisionReasons,
  matchedSemanticIntents: analysis.diagnostics.matchedSemanticIntents,
  retrievalBackend: analysis.diagnostics.retrievalBackend,
  generationMode: analysis.diagnostics.generationMode,
  latencyMs: Number(latencyMs.toFixed(4)),
  llmInputTokens: 0,
  llmOutputTokens: 0,
  estimatedCostUsd: 0,
  pineconeReadUnits: readUnits,
  rawTelemetryExported: false,
}));
