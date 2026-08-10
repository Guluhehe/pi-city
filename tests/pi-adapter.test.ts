import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { redactPiRecord } from '../src/adapters/pi/redact';
import { PI_ADAPTER_VERSION } from '../src/adapters/pi/version';
import { SEMANTIC_TRACE_SCHEMA_VERSION } from '../src/semantic-trace/schema';
import { buildTraceFrames } from '../src/semantic-trace/reducer';
import { mergePiTraces } from '../src/semantic-trace/merge';

const runtime = readFileSync(new URL('../fixtures/auth-bug/runtime.jsonl', import.meta.url), 'utf8');
const session = readFileSync(new URL('../fixtures/auth-bug/session.jsonl', import.meta.url), 'utf8');
const malformed = readFileSync(new URL('../fixtures/malformed/broken-lines.jsonl', import.meta.url), 'utf8');

test('imports a Pi runtime log into a settled semantic trace', () => {
  const result = importPiJsonl(runtime);
  assert.equal(result.kind, 'runtime');
  assert.equal(result.trace.schemaVersion, SEMANTIC_TRACE_SCHEMA_VERSION);
  assert.equal(result.trace.adapterVersion, PI_ADAPTER_VERSION);
  assert.ok(result.trace.events.some((event) => event.type === 'TOOL_CALL_CREATED'));
  assert.ok(result.trace.events.some((event) => event.type === 'TOOL_RESULT_ATTACHED'));
  assert.equal(result.trace.events.at(-1)?.type, 'AGENT_SETTLED');
  assert.equal(result.report.replayClosure, 'observed');
  assert.equal(result.report.invalidLineCount, 0);

  const final = buildTraceFrames(result.trace).at(-1)?.state;
  assert.equal(final?.modelCalls, 2);
  assert.equal(final?.toolCalls, 1);
  assert.equal(final?.toolResults, 1);
  assert.equal(final?.settled, true);
});

test('imports a Pi Session v3-style tree and preserves durable nodes', () => {
  const result = importPiJsonl(session);
  assert.equal(result.kind, 'session');
  assert.equal(result.trace.schemaVersion, SEMANTIC_TRACE_SCHEMA_VERSION);
  const final = buildTraceFrames(result.trace).at(-1)?.state;
  assert.equal(final?.sessionEntries, 4);
  assert.equal(final?.toolCalls, 1);
  assert.equal(final?.toolResults, 1);
  assert.equal(result.report.replayClosure, 'synthetic');
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
  assert.equal(combined.schemaVersion, SEMANTIC_TRACE_SCHEMA_VERSION);
  assert.equal(final?.sessionEntries, 4);
  assert.equal(final?.modelCalls, 2);
  assert.equal(final?.toolCalls, 1);
  assert.equal(final?.toolResults, 1);
  assert.equal(final?.settled, true);
});

test('tolerates malformed JSONL lines and reports import completeness', () => {
  const result = importPiJsonl(malformed);
  assert.equal(result.kind, 'runtime');
  assert.equal(result.report.invalidLineCount, 2);
  assert.ok(result.report.validRecordCount >= 10);
  assert.ok(result.trace.warnings.some((warning) => warning.code === 'jsonl-parse'));
  assert.ok(result.trace.events.some((event) => event.type === 'TOOL_CALL_CREATED'));
  assert.equal(result.trace.events.at(-1)?.type, 'AGENT_SETTLED');
});

test('redacts bearer tokens and common secret assignments', () => {
  const input = {
    type: 'tool_execution_end',
    env: 'API_KEY=sk-live-abc123XYZ',
    header: 'Authorization: Bearer super-secret-token-value',
    note: 'token=ghp_abcdefghijklmnopqrstuvwxyz012345',
  };
  const { value, report } = redactPiRecord(input);
  const serialized = JSON.stringify(value);
  assert.equal(report.secrets > 0, true);
  assert.equal(serialized.includes('sk-live-abc123XYZ'), false);
  assert.equal(serialized.includes('super-secret-token-value'), false);
  assert.equal(serialized.includes('ghp_abcdefghijklmnopqrstuvwxyz012345'), false);
  assert.match(serialized, /\[REDACTED_SECRET\]/);
  assert.equal((value as { type: string }).type, 'tool_execution_end');
});

test('redacts absolute home paths while preserving filenames', () => {
  const input = {
    type: 'tool_call',
    path: '/Users/minhao/DevWorkspace/Zero/pi-city/src/auth.ts',
    cwd: '/Users/minhao/DevWorkspace/Zero/pi-city',
  };
  const { value, report } = redactPiRecord(input);
  const serialized = JSON.stringify(value);
  assert.ok(report.paths > 0);
  assert.equal(serialized.includes('/Users/minhao'), false);
  assert.match(serialized, /\[REDACTED_PATH\]\/auth\.ts/);
  assert.match(serialized, /"cwd":"\[REDACTED_PATH\]"/);
});

test('redacts email addresses', () => {
  const input = { type: 'message', text: 'Contact owner@example.com for access' };
  const { value, report } = redactPiRecord(input);
  assert.ok(report.emails > 0);
  assert.equal(JSON.stringify(value).includes('owner@example.com'), false);
  assert.match(JSON.stringify(value), /\[REDACTED_EMAIL\]/);
});

test('redacts raw tool-result file contents with hash and length', () => {
  const content = 'export function login() {\n  return true;\n}\n';
  const input = {
    type: 'tool_execution_end',
    toolName: 'read',
    toolCallId: 'call_123',
    isError: false,
    content,
  };
  const { value, report } = redactPiRecord(input);
  assert.ok(report.contents > 0);
  const redacted = value as typeof input;
  assert.equal(redacted.toolName, 'read');
  assert.equal(redacted.toolCallId, 'call_123');
  assert.equal(redacted.isError, false);
  assert.equal(redacted.content.includes('export function login'), false);
  assert.match(redacted.content, /^\[REDACTED_CONTENT sha256:[a-f0-9]+ length:\d+\]$/);
});

test('preserves lifecycle metadata needed for replay', () => {
  const input = {
    type: 'tool_execution_start',
    timestamp: 1786276801000,
    toolName: 'bash',
    toolCallId: 'call_456',
    turnId: 'turn_1',
    id: 'evt_9',
  };
  const { value } = redactPiRecord(input);
  assert.deepEqual(value, input);
});

test('redaction is deterministic for the same input', () => {
  const input = {
    type: 'tool_result',
    path: '/home/runner/work/app/src/main.ts',
    email: 'dev@example.org',
    content: 'secret file body',
    token: 'Bearer abcdefghijklmnop',
  };
  const first = redactPiRecord(input);
  const second = redactPiRecord(input);
  assert.deepEqual(first, second);
});
