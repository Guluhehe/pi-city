import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { buildTraceFrames } from '../src/semantic-trace/reducer';
import { mergePiTraces } from '../src/semantic-trace/merge';

const runtime = readFileSync(new URL('../fixtures/auth-bug/runtime.jsonl', import.meta.url), 'utf8');
const session = readFileSync(new URL('../fixtures/auth-bug/session.jsonl', import.meta.url), 'utf8');

test('imports a Pi runtime log into a settled semantic trace', () => {
  const result = importPiJsonl(runtime);
  assert.equal(result.kind, 'runtime');
  assert.ok(result.trace.events.some((event) => event.type === 'TOOL_CALL_CREATED'));
  assert.ok(result.trace.events.some((event) => event.type === 'TOOL_RESULT_ATTACHED'));
  assert.equal(result.trace.events.at(-1)?.type, 'AGENT_SETTLED');

  const final = buildTraceFrames(result.trace).at(-1)?.state;
  assert.equal(final?.modelCalls, 2);
  assert.equal(final?.toolCalls, 1);
  assert.equal(final?.toolResults, 1);
  assert.equal(final?.settled, true);
});

test('imports a Pi Session v3-style tree and preserves durable nodes', () => {
  const result = importPiJsonl(session);
  assert.equal(result.kind, 'session');
  const final = buildTraceFrames(result.trace).at(-1)?.state;
  assert.equal(final?.sessionEntries, 4);
  assert.equal(final?.toolCalls, 1);
  assert.equal(final?.toolResults, 1);
});

test('labels reconstructed runtime context as derived evidence', () => {
  const result = importPiJsonl(runtime);
  const context = result.trace.events.find((event) => event.type === 'CONTEXT_COMPILED');
  assert.equal(context?.evidence.level, 'derived');
  assert.match(context?.evidence.note ?? '', /exact compiled context requires deeper instrumentation/);
});

test('combines runtime lifecycle with durable Session nodes', () => {
  const runtimeTrace = importPiJsonl(runtime).trace;
  const sessionTrace = importPiJsonl(session).trace;
  const combined = mergePiTraces(runtimeTrace, sessionTrace);
  const final = buildTraceFrames(combined).at(-1)?.state;
  assert.equal(combined.source, 'pi-combined');
  assert.equal(final?.sessionEntries, 4);
  assert.equal(final?.modelCalls, 2);
  assert.equal(final?.toolCalls, 1);
  assert.equal(final?.toolResults, 1);
  assert.equal(final?.settled, true);
});
