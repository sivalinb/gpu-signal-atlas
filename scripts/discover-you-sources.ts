import { discoverYouSources, getOptionalYouConfig } from '../core/you.ts';

const config = getOptionalYouConfig();
if (!config) {
  console.error('YOU_API_KEY is required. Copy .env.example to .env.local and add the server-only key.');
  process.exitCode = 1;
} else {
  const query = process.argv.slice(2).join(' ').trim() || 'NVIDIA GPU Xid DCGM Fluent Bit OpenTelemetry troubleshooting documentation';
  const candidates = await discoverYouSources(query, config);
  console.log(JSON.stringify({ query, autoPromoted: false, candidates }, null, 2));
}
