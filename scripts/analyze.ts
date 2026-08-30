import { analyzeTelemetry } from '../core/engine.ts';
import { samples } from '../core/samples.ts';

const query = process.argv.slice(2).join(' ').trim() || samples[0].text;
const analysis = analyzeTelemetry(query);

console.log(JSON.stringify(analysis, null, 2));
