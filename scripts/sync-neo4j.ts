import { getNeo4jConfig, syncNeo4jGraph } from '../core/neo4j.ts';

const config = getNeo4jConfig();
if (!config) throw new Error('NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, and NEO4J_DATABASE are required.');
const result = await syncNeo4jGraph(config);
console.log(`Neo4j graph synchronized: ${result.evidence} evidence records, ${result.signals} signals, ${result.benchmarks} benchmark runs.`);
