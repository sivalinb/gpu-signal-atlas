import assert from 'node:assert/strict';
import test from 'node:test';

import { corpus } from '../core/corpus.ts';
import { assessCorpusFreshness, cleanHtml, createSourceSnapshot, validateCorpusSources } from '../core/ingestion.ts';
import { sourceManifest } from '../ingestion/source-manifest.ts';

test('HTML cleaning removes page chrome and preserves headings, table values, and code', () => {
  const cleaned = cleanHtml(`<html><nav>Navigation</nav><main><h1>Xid 79</h1><p>GPU &amp; PCIe</p><table><tr><th>Field</th><td>DCGM_FI_DEV_GPU_TEMP</td></tr></table><pre>nvidia-smi -q</pre></main><script>secret()</script></html>`);
  assert.doesNotMatch(cleaned, /Navigation|secret/);
  assert.match(cleaned, /Xid 79/);
  assert.match(cleaned, /GPU & PCIe/);
  assert.match(cleaned, /DCGM_FI_DEV_GPU_TEMP/);
  assert.match(cleaned, /nvidia-smi -q/);
});

test('snapshot generation records an allow-listed source and stable content hash', () => {
  const source = sourceManifest[0];
  const snapshot = createSourceSnapshot(source, `<h1>${source.name}</h1><p>${'Reviewed documentation content '.repeat(5)}</p>`, '2026-08-31');
  assert.equal(snapshot.sourceUrl, source.url);
  assert.match(snapshot.contentHash, /^fnv1a:[a-f0-9]{8}$/);
});

test('current corpus sources, fingerprints, and freshness SLAs validate', () => {
  assert.deepEqual(validateCorpusSources(corpus, sourceManifest), []);
  const results = assessCorpusFreshness(corpus, sourceManifest, new Date('2026-08-31T00:00:00Z'));
  assert.ok(results.every((result) => result.status === 'fresh'));
  assert.ok(results.every((result) => result.documentIds.length > 0));
});
