import { evaluationCases } from '../evaluation/cases.ts';
import { corpus } from '../core/corpus.ts';
import { getMistralConfig, mistralEmbeddings } from '../core/mistral.ts';
import { documentText } from '../core/vector.ts';

const config = getMistralConfig();
if (!config) throw new Error('MISTRAL_API_KEY is required.');
const answerable = evaluationCases.filter((item) => item.expectedIds.length > 0);
const inputs = [...answerable.map((item) => item.query), ...corpus.map(documentText)];
const { vectors, totalTokens } = await mistralEmbeddings(inputs, config);
const queryVectors = vectors.slice(0, answerable.length);
const documentVectors = vectors.slice(answerable.length);

function cosine(left: number[], right: number[]) {
  let dot = 0;
  let a = 0;
  let b = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    a += left[index] ** 2;
    b += right[index] ** 2;
  }
  return dot / (Math.sqrt(a) * Math.sqrt(b) || 1);
}

let expected = 0;
let found = 0;
let reciprocalRank = 0;
for (let index = 0; index < answerable.length; index += 1) {
  const ranked = corpus
    .map((document, documentIndex) => ({ id: document.id, score: cosine(queryVectors[index], documentVectors[documentIndex]) }))
    .sort((left, right) => right.score - left.score);
  const expectedIds = answerable[index].expectedIds;
  expected += expectedIds.length;
  found += expectedIds.filter((id) => ranked.slice(0, 5).some((item) => item.id === id)).length;
  const firstRank = Math.min(...expectedIds.map((id) => ranked.findIndex((item) => item.id === id) + 1).filter((rank) => rank > 0));
  reciprocalRank += Number.isFinite(firstRank) ? 1 / firstRank : 0;
}
console.log(JSON.stringify({
  model: config.embeddingModel,
  dimensions: documentVectors[0]?.length ?? 0,
  cases: answerable.length,
  recallAt5: found / expected,
  mrr: reciprocalRank / answerable.length,
  totalTokens,
}, null, 2));
