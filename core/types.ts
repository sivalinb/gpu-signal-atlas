export type Authority = 'official' | 'internal';
export type SignalType = 'xid' | 'metric' | 'pipeline' | 'runbook';

export interface CorpusDocument {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  authority: Authority;
  signalTypes: SignalType[];
  identifiers: string[];
  gpuModels: string[];
  driverBranches: string[];
  updated: string;
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
}

export interface SignalAnalysis {
  status: 'grounded' | 'needs-investigation' | 'refused';
  confidence: number;
  observed: ExtractedSignals;
  headline: string;
  documentedMeaning: string;
  possibleInterpretations: string[];
  nextEvidence: string[];
  limitations: string[];
  compatibilityNotes: string[];
  citations: Citation[];
  retrieval: RetrievalResult[];
}
