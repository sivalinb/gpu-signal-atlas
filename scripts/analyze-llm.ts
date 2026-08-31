import { analyzeTelemetry } from '../core/engine.ts';
import { generateSchemaConstrainedSignalCard, llmConfigFromEnv } from '../core/llm.ts';
import { samples } from '../core/samples.ts';

const query = process.argv.slice(2).join(' ').trim() || samples[0].text;
const baseline = analyzeTelemetry(query);
const analysis = await generateSchemaConstrainedSignalCard(query, baseline, llmConfigFromEnv());

console.log(JSON.stringify(analysis, null, 2));
