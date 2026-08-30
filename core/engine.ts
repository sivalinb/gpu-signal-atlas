import { corpus as defaultCorpus } from './corpus.ts';
import type {
  CorpusDocument,
  ExtractedSignals,
  RetrievalResult,
  SignalAnalysis,
} from './types.ts';

const EMBEDDING_DIMENSIONS = 256;
const RRF_K = 60;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_./+-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
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

export function cosine(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

export function extractSignals(text: string): ExtractedSignals {
  const xids = [
    ...text.matchAll(/\bxid\s*(?:\([^)]*\)\s*:\s*|[_:#-]\s*|\s+)(\d{1,3})\b/gi),
  ].map((match) => match[1]);
  const metrics = [...text.matchAll(/\bDCGM_(?:FI|EXP)_[A-Z0-9_]+\b/g)].map((match) => match[0]);
  const gpuModels = [...text.matchAll(/\b(A100|H100|H200|B100|GB200|V100|T4|L4|L40S)\b/gi)].map(
    (match) => match[1].toUpperCase(),
  );
  const driverBranches = [...text.matchAll(/\bR(\d{3})\b/gi)].map((match) => `R${match[1]}`);
  return {
    xids: [...new Set(xids)],
    metrics: [...new Set(metrics)],
    gpuModels: [...new Set(gpuModels)],
    driverBranches: [...new Set(driverBranches)],
  };
}

function documentText(document: CorpusDocument): string {
  return [document.title, document.content, ...document.identifiers, ...document.signalTypes].join(' ');
}

function bm25(queryTokens: string[], documents: CorpusDocument[]): number[] {
  const tokenized = documents.map((document) => tokenize(documentText(document)));
  const averageLength = tokenized.reduce((sum, tokens) => sum + tokens.length, 0) / Math.max(tokenized.length, 1);
  const documentFrequency = new Map<string, number>();
  for (const token of new Set(queryTokens)) {
    documentFrequency.set(token, tokenized.filter((tokens) => tokens.includes(token)).length);
  }
  const k1 = 1.5;
  const b = 0.75;
  return tokenized.map((tokens) => {
    const frequencies = new Map<string, number>();
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    return [...new Set(queryTokens)].reduce((score, token) => {
      const frequency = frequencies.get(token) ?? 0;
      if (frequency === 0) return score;
      const foundIn = documentFrequency.get(token) ?? 0;
      const idf = Math.log(1 + (documents.length - foundIn + 0.5) / (foundIn + 0.5));
      const denominator = frequency + k1 * (1 - b + b * (tokens.length / Math.max(averageLength, 1)));
      return score + idf * ((frequency * (k1 + 1)) / denominator);
    }, 0);
  });
}

function ranks(scores: number[]): number[] {
  const sorted = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score);
  const output = Array.from({ length: scores.length }, () => scores.length);
  sorted.forEach((item, rank) => {
    output[item.index] = rank + 1;
  });
  return output;
}

function exactMatches(document: CorpusDocument, signals: ExtractedSignals): string[] {
  const identifiers = new Set(document.identifiers.map((identifier) => identifier.toUpperCase()));
  const matches: string[] = [];
  for (const xid of signals.xids) {
    if (identifiers.has(`XID ${xid}`) || identifiers.has(`XID_${xid}`)) matches.push(`Xid ${xid}`);
  }
  for (const metric of signals.metrics) {
    if (identifiers.has(metric.toUpperCase())) matches.push(metric);
  }
  return matches;
}

export function retrieve(
  query: string,
  documents: CorpusDocument[] = defaultCorpus,
  limit = 5,
): RetrievalResult[] {
  const queryTokens = tokenize(query);
  const signals = extractSignals(query);
  const sparseScores = bm25(queryTokens, documents);
  const queryVector = embed(query);
  const denseScores = documents.map((document) => Math.max(0, cosine(queryVector, embed(documentText(document)))));
  const sparseRanks = ranks(sparseScores);
  const denseRanks = ranks(denseScores);

  return documents
    .map((document, index) => {
      const matches = exactMatches(document, signals);
      const rrf = 1 / (RRF_K + sparseRanks[index]) + 1 / (RRF_K + denseRanks[index]);
      const exactBoost = matches.length * 0.09;
      const modelBoost = signals.gpuModels.some((model) => document.gpuModels.includes(model)) ? 0.015 : 0;
      const driverBoost = signals.driverBranches.some((driver) => document.driverBranches.includes(driver)) ? 0.015 : 0;
      const lexical = Math.min(0.12, sparseScores[index] / 60);
      const semantic = Math.min(0.1, denseScores[index] * 0.1);
      return {
        document,
        score: Number((rrf + exactBoost + modelBoost + driverBoost + lexical + semantic).toFixed(4)),
        sparseRank: sparseRanks[index],
        denseRank: denseRanks[index],
        exactMatches: matches,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function unknownExactSignals(signals: ExtractedSignals, documents: CorpusDocument[]): string[] {
  const known = new Set(documents.flatMap((document) => document.identifiers.map((identifier) => identifier.toUpperCase())));
  return [
    ...signals.xids.filter((xid) => !known.has(`XID ${xid}`) && !known.has(`XID_${xid}`)).map((xid) => `Xid ${xid}`),
    ...signals.metrics.filter((metric) => !known.has(metric.toUpperCase())),
  ];
}

function unique(values: string[], limit: number): string[] {
  return [...new Set(values)].slice(0, limit);
}

export function analyzeTelemetry(
  query: string,
  documents: CorpusDocument[] = defaultCorpus,
): SignalAnalysis {
  const observed = extractSignals(query);
  const retrieval = retrieve(query, documents, 5);
  const unknown = unknownExactSignals(observed, documents);
  const hasExact = observed.xids.length + observed.metrics.length > 0;
  const top = retrieval[0];
  const hasDomainLanguage = /\b(gpu|nvidia|dcgm|pcie|ecc|fluent\s*bit|opentelemetry|otlp|thermal|power|kubernetes|prometheus|graphics\s+engine|page\s+fault)\b/i.test(
    query,
  );
  const refuse =
    query.trim().length < 8 ||
    unknown.length > 0 ||
    (!hasExact && (!hasDomainLanguage || !top || top.score < 0.075));

  if (refuse) {
    const reason = unknown.length
      ? `The local corpus does not contain an authoritative entry for ${unknown.join(', ')}.`
      : 'The input does not contain enough supported GPU telemetry context for a grounded answer.';
    return {
      status: 'refused',
      confidence: 0,
      observed,
      headline: 'Not enough grounded evidence',
      documentedMeaning: reason,
      possibleInterpretations: [],
      nextEvidence: [
        'Provide the complete NVRM/Xid line or an exact DCGM field name.',
        'Include GPU model, driver branch, timestamp, node, and nearby events when available.',
      ],
      limitations: ['No diagnostic interpretation was generated because retrieval did not meet the evidence boundary.'],
      compatibilityNotes: [],
      citations: [],
      retrieval,
    };
  }

  const grounded = retrieval.filter((result) => result.score >= Math.max(0.07, top.score * 0.42)).slice(0, 3);
  const compatibilityNotes: string[] = [];
  for (const result of grounded) {
    const { document } = result;
    if (
      observed.gpuModels.length > 0 &&
      document.gpuModels.length > 0 &&
      !observed.gpuModels.some((model) => document.gpuModels.includes(model))
    ) {
      compatibilityNotes.push(`${document.title} does not explicitly list ${observed.gpuModels.join(', ')} in this curated entry.`);
    }
    if (
      observed.driverBranches.length > 0 &&
      document.driverBranches.length > 0 &&
      !observed.driverBranches.some((driver) => document.driverBranches.includes(driver))
    ) {
      compatibilityNotes.push(`${document.title} is not pinned to driver ${observed.driverBranches.join(', ')} in this corpus.`);
    }
  }

  const official = grounded.find((result) => result.document.authority === 'official') ?? grounded[0];
  const secondaryMeanings = grounded
    .filter((result) => result.document.id !== official.document.id)
    .map((result) => result.document.documentedMeaning);
  const confidence = Math.min(0.99, 0.55 + top.score * 1.9 + (top.exactMatches.length > 0 ? 0.12 : 0));

  return {
    status: compatibilityNotes.length > 0 ? 'needs-investigation' : 'grounded',
    confidence: Number(confidence.toFixed(2)),
    observed,
    headline: official.document.title,
    documentedMeaning: official.document.documentedMeaning,
    possibleInterpretations: unique(secondaryMeanings, 3),
    nextEvidence: unique(grounded.flatMap((result) => result.document.nextEvidence), 5),
    limitations: unique(grounded.flatMap((result) => result.document.limitations), 4),
    compatibilityNotes: unique(compatibilityNotes, 3),
    citations: grounded.map((result) => ({
      id: result.document.id,
      title: result.document.title,
      source: result.document.source,
      url: result.document.sourceUrl,
      authority: result.document.authority,
      score: result.score,
    })),
    retrieval,
  };
}
