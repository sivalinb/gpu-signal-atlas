import { corpus } from '../core/corpus.ts';
import { precomputedVectorIndex } from '../core/generated/vector-index.ts';
import { corpusVectorHash, documentText, embed, EMBEDDING_DIMENSIONS } from '../core/vector.ts';

const failures: string[] = [];
if (precomputedVectorIndex.dimensions !== EMBEDDING_DIMENSIONS) failures.push('embedding dimension changed');
if (precomputedVectorIndex.corpusHash !== corpusVectorHash(corpus)) failures.push('corpus hash changed');

for (const document of corpus) {
  const stored = precomputedVectorIndex.vectors[document.id as keyof typeof precomputedVectorIndex.vectors] as
    | readonly number[]
    | undefined;
  const expected = embed(documentText(document));
  if (!stored) {
    failures.push(`${document.id}: missing vector`);
    continue;
  }
  if (stored.length !== EMBEDDING_DIMENSIONS) failures.push(`${document.id}: invalid vector length`);
  const maxDelta = expected.reduce(
    (largest, value, index) => Math.max(largest, Math.abs(value - (stored[index] ?? 0))),
    0,
  );
  if (maxDelta > 1e-9) failures.push(`${document.id}: stale vector (max delta ${maxDelta})`);
}

const unexpected = Object.keys(precomputedVectorIndex.vectors).filter(
  (id) => !corpus.some((document) => document.id === id),
);
for (const id of unexpected) failures.push(`${id}: vector has no corpus document`);

if (failures.length) {
  console.error('Precomputed vector index is stale:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Run: npm run index:build');
  process.exitCode = 1;
} else {
  console.log(
    `Vector index verified: ${corpus.length} documents, ${EMBEDDING_DIMENSIONS} dimensions, ${precomputedVectorIndex.corpusHash}`,
  );
}
