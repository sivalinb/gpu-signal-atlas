import { corpus } from '../core/corpus.ts';
import {
  assertPineconeDimension,
  describePineconeStats,
  getPineconeConfig,
  upsertCorpusToPinecone,
} from '../core/pinecone.ts';

const config = getPineconeConfig();
const before = await describePineconeStats(config);
assertPineconeDimension(before.dimension);

const upserted = await upsertCorpusToPinecone(config, corpus);
const deadline = Date.now() + 30_000;
let after = await describePineconeStats(config);
while (after.namespaceVectorCount < corpus.length && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  after = await describePineconeStats(config);
}

if (after.namespaceVectorCount !== corpus.length) {
  throw new Error(
    `Expected ${corpus.length} vectors in namespace ${config.namespace}; observed ${after.namespaceVectorCount}`,
  );
}

console.log(
  `Pinecone sync complete: ${upserted} reviewed records in ${config.indexName}/${config.namespace}`,
);
