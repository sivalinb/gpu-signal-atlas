export type Authority = 'official' | 'internal';
export type SignalType = 'xid' | 'metric' | 'pipeline' | 'runbook';
export type EvidenceStrength = 'strong' | 'moderate' | 'insufficient';

export interface SourceProvenance {
  sourceVersion: string;
  retrievedAt: string;
  sourceSection: string;
  curatedContentHash: string;
  reviewStatus: 'curated-demo-review';
}

export interface CorpusDocument {
  id: string;
  parentDocumentId?: string;
  sourceDocumentIds?: string[];
  title: string;
  source: string;
  sourceUrl: string;
  authority: Authority;
  signalTypes: SignalType[];
  identifiers: string[];
  gpuModels: string[];
  driverBranches: string[];
  updated: string;
  provenance: SourceProvenance;
  content: string;
  documentedMeaning: string;
  nextEvidence: string[];
  limitations: string[];
}

export interface ExtractedSignals {
  xids: string[];
  metrics: string[];
  gpuModels: string[];
  driverBranches: string[];
}

export interface RetrievalResult {
  document: CorpusDocument;
  score: number;
  sparseRank: number;
  denseRank: number;
  exactMatches: string[];
}

export interface Citation {
  id: string;
  title: string;
  source: string;
  url: string;
  authority: Authority;
  score: number;
  provenance: SourceProvenance;
}

export interface SignalAnalysis {
  status: 'grounded' | 'needs-investigation' | 'refused';
  evidenceStrength: EvidenceStrength;
  observed: ExtractedSignals;
  headline: string;
  documentedMeaning: string;
  possibleInterpretations: string[];
  nextEvidence: string[];
  limitations: string[];
  compatibilityNotes: string[];
  citations: Citation[];
  retrieval: RetrievalResult[];
  diagnostics: {
    traceId: string;
    durationMs: number;
    evidenceMargin: number;
    matchedSemanticIntents: string[];
    decisionReasons: string[];
    corpusVersion: string;
    vectorIndexVersion: string;
    retrievalBackend: 'local-vector-index' | 'pinecone';
    generationMode: 'deterministic-template' | 'schema-constrained-llm';
    observabilityExport?: 'disabled' | 'exported' | 'failed';
  };
}
