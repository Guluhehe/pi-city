import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { classifyToolName } from '../src/analysis/action-classes';
import {
  derivePredictCheckpointReport,
  derivePredictCheckpoints,
} from '../src/game/checkpoints';
import type { SemanticTrace } from '../src/semantic-trace/schema';

const authRuntime = readFileSync(new URL('../fixtures/auth-bug/runtime.jsonl', import.meta.url), 'utf8');
const multiRuntime = readFileSync(new URL('../fixtures/multi-tool/runtime.jsonl', import.meta.url), 'utf8');

test('classifies only known agent action tools', () => {
  assert.equal(classifyToolName('read'), 'read');
  assert.equal(classifyToolName('GREP'), 'read');
  assert.equal(classifyToolName('apply_patch'), 'edit');
  assert.equal(classifyToolName('shell'), 'bash');
  assert.equal(classifyToolName('mcp_delete_record'), undefined);
});

test('derives auth Predict checkpoints from observed next actions', () => {
  const trace = importPiJsonl(authRuntime).trace;
  assert.deepEqual(
    derivePredictCheckpoints(trace).map(({ eventIndex, modelCallNumber, actual, actualToolName }) => ({
      eventIndex,
      modelCallNumber,
      actual,
      actualToolName,
    })),
    [
      { eventIndex: 3, modelCallNumber: 1, actual: 'read', actualToolName: 'read' },
      { eventIndex: 13, modelCallNumber: 2, actual: 'answer', actualToolName: undefined },
    ],
  );
});

test('derives multi-tool Predict checkpoints in model-call order', () => {
  const trace = importPiJsonl(multiRuntime).trace;
  assert.deepEqual(
    derivePredictCheckpoints(trace).map(({ eventIndex, actual }) => ({ eventIndex, actual })),
    [
      { eventIndex: 3, actual: 'read' },
      { eventIndex: 16, actual: 'edit' },
      { eventIndex: 29, actual: 'answer' },
    ],
  );
});

test('omits truncated and unknown-tool decisions with explicit reasons', () => {
  const auth = importPiJsonl(authRuntime).trace;
  const truncated: SemanticTrace = { ...auth, events: auth.events.slice(0, 4) };
  assert.deepEqual(derivePredictCheckpointReport(truncated), {
    checkpoints: [],
    omissions: [{ eventIndex: 3, modelCallNumber: 1, reason: 'truncated' }],
  });

  const unknown: SemanticTrace = {
    ...auth,
    events: auth.events.map((event, index) => index === 5
      ? { ...event, payload: { ...event.payload, toolName: 'mcp_delete_record' } }
      : event),
  };
  const report = derivePredictCheckpointReport(unknown);
  assert.deepEqual(report.omissions, [
    { eventIndex: 3, modelCallNumber: 1, reason: 'unknown-tool', toolNames: ['mcp_delete_record'] },
  ]);
  assert.deepEqual(report.checkpoints.map((checkpoint) => checkpoint.actual), ['answer']);
});

test('checkpoint derivation is deterministic and never mutates its trace', () => {
  const trace = importPiJsonl(multiRuntime).trace;
  const before = structuredClone(trace);
  const first = derivePredictCheckpointReport(trace);
  const second = derivePredictCheckpointReport(trace);
  assert.deepEqual(first, second);
  assert.deepEqual(trace, before);
});
