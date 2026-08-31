import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createSourceSnapshot } from '../core/ingestion.ts';
import { sourceManifest } from '../ingestion/source-manifest.ts';

function option(name: string): string | undefined {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const sourceId = option('source');
if (!sourceId) throw new Error('Usage: npm run ingest -- --source <manifest-id> (--input <page.html> | --fetch)');
const source = sourceManifest.find((candidate) => candidate.id === sourceId);
if (!source) throw new Error(`Unknown source '${sourceId}'. Only allow-listed manifest IDs can be ingested.`);
const input = option('input');
const fetchRequested = process.argv.includes('--fetch');
if (Boolean(input) === fetchRequested) throw new Error('Choose exactly one of --input <file> or --fetch');

let html: string;
let headers: Record<string, string> = {};
if (input) html = await readFile(resolve(input), 'utf8');
else {
  const response = await fetch(source.url, { headers: { 'User-Agent': 'GPU-Signal-Atlas-Ingestion/1.0' } });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  html = await response.text();
  headers = Object.fromEntries(['etag', 'last-modified', 'content-type'].map((name) => [name, response.headers.get(name)]).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

const fetchedAt = new Date().toISOString().slice(0, 10);
const snapshot = createSourceSnapshot(source, html, fetchedAt, headers);
const output = resolve(option('output') ?? `ingestion/snapshots/${source.id}-${fetchedAt}.json`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote reviewed-source candidate snapshot to ${output}`);
console.log('Next: compare the snapshot, update curated records manually, rebuild the vector index, then run evaluation.');
