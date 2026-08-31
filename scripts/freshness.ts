import { corpus } from '../core/corpus.ts';
import { assessCorpusFreshness, validateCorpusSources } from '../core/ingestion.ts';
import { sourceManifest } from '../ingestion/source-manifest.ts';

const asOfArgument = process.argv.find((argument) => argument.startsWith('--as-of='));
const asOf = asOfArgument ? new Date(`${asOfArgument.split('=')[1]}T00:00:00Z`) : new Date();
const failures = validateCorpusSources(corpus, sourceManifest);
const freshness = assessCorpusFreshness(corpus, sourceManifest, asOf);

console.log(`Corpus freshness report as of ${asOf.toISOString().slice(0, 10)}`);
for (const item of freshness) {
  console.log(`${item.status.padEnd(7)} ${item.sourceId.padEnd(30)} reviewed=${item.retrievedAt ?? 'missing'} age=${item.ageDays ?? '-'}d sla=${item.refreshCadenceDays}d records=${item.documentIds.length}`);
  if (item.status !== 'fresh') failures.push(`${item.sourceId}: freshness status is ${item.status}`);
}
if (failures.length) {
  console.error('Freshness gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else console.log('Freshness gate passed. Source allow-list, fingerprints, and review SLAs are current.');
