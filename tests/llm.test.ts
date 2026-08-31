import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeTelemetry } from '../core/engine.ts';
import {
  generateSchemaConstrainedSignalCard,
  LlmContractError,
  type LlmTransport,
} from '../core/llm.ts';

function response(content: unknown): unknown {
  return { choices: [{ message: { content: JSON.stringify(content) } }] };
}

function config(transport: LlmTransport) {
  return { baseUrl: 'https://provider.example/v1', apiKey: 'test-secret', model: 'test-model', transport };
}

test('optional LLM mode requests strict JSON schema and preserves grounded fields', async () => {
  const baseline = analyzeTelemetry('Xid 79 on H100 R565');
  const lead = baseline.retrieval[0].document;
  let sentBody: Record<string, unknown> | undefined;
  const result = await generateSchemaConstrainedSignalCard(
    'Xid 79 on H100 R565',
    baseline,
    config(async ({ init }) => {
      sentBody = JSON.parse(String(init.body)) as Record<string, unknown>;
      return response({
        headline: lead.title,
        documentedMeaning: lead.documentedMeaning,
        possibleInterpretations: [],
        nextEvidence: lead.nextEvidence.slice(0, 2),
        limitations: lead.limitations.slice(0, 1),
        citedDocumentIds: [lead.id],
      });
    }),
  );
  assert.equal(result.diagnostics.generationMode, 'schema-constrained-llm');
  assert.deepEqual(result.citations.map((citation) => citation.id), [lead.id]);
  const format = sentBody?.response_format as Record<string, unknown>;
  assert.equal(format.type, 'json_schema');
  assert.match(JSON.stringify(sentBody), /additionalProperties/);
});

test('optional LLM mode rejects unknown citations', async () => {
  const baseline = analyzeTelemetry('NVRM Xid 79');
  const lead = baseline.retrieval[0].document;
  await assert.rejects(
    generateSchemaConstrainedSignalCard(
      'NVRM Xid 79',
      baseline,
      config(async () =>
        response({
          headline: lead.title,
          documentedMeaning: lead.documentedMeaning,
          possibleInterpretations: [],
          nextEvidence: lead.nextEvidence.slice(0, 1),
          limitations: lead.limitations.slice(0, 1),
          citedDocumentIds: ['not-retrieved'],
        }),
      ),
    ),
    LlmContractError,
  );
});

test('optional LLM mode rejects uncited paraphrases even with a valid ID', async () => {
  const baseline = analyzeTelemetry('NVRM Xid 79');
  const lead = baseline.retrieval[0].document;
  await assert.rejects(
    generateSchemaConstrainedSignalCard(
      'NVRM Xid 79',
      baseline,
      config(async () =>
        response({
          headline: lead.title,
          documentedMeaning: 'The GPU is definitely broken.',
          possibleInterpretations: [],
          nextEvidence: lead.nextEvidence.slice(0, 1),
          limitations: lead.limitations.slice(0, 1),
          citedDocumentIds: [lead.id],
        }),
      ),
    ),
    /not reproduced/,
  );
});

test('refused inputs never call the optional model', async () => {
  const baseline = analyzeTelemetry('Xid 999');
  let called = false;
  const result = await generateSchemaConstrainedSignalCard(
    'Xid 999',
    baseline,
    config(async () => {
      called = true;
      return response({});
    }),
  );
  assert.equal(result.status, 'refused');
  assert.equal(called, false);
});
