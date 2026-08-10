import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { redactPiRecord } from '../src/adapters/pi/redact';
import { PI_ADAPTER_VERSION } from '../src/adapters/pi/version';
import { analyzeRun } from '../src/analysis/run';
import { selectCompatibleScenario } from '../src/experience/scenario-compatibility';
import { SEMANTIC_TRACE_SCHEMA_VERSION } from '../src/semantic-trace/schema';
import { buildTraceFrames } from '../src/semantic-trace/reducer';
import { mergePiTraces } from '../src/semantic-trace/merge';

const runtime = readFileSync(new URL('../fixtures/auth-bug/runtime.jsonl', import.meta.url), 'utf8');
const session = readFileSync(new URL('../fixtures/auth-bug/session.jsonl', import.meta.url), 'utf8');
const malformed = readFileSync(new URL('../fixtures/malformed/broken-lines.jsonl', import.meta.url), 'utf8');
const realRead = readFileSync(new URL('../fixtures/real-read/runtime.jsonl', import.meta.url), 'utf8');
const realMulti = readFileSync(new URL('../fixtures/real-multi/runtime.jsonl', import.meta.url), 'utf8');

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
    type: 'message',
    id: 'm1',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'toolCall',
          id: 'call_1',
          name: 'bash',
          arguments: {
            command: 'export API_KEY=sk-live-abc123XYZ; echo Bearer super-secret-token-value; token=ghp_abcdefghijklmnopqrstuvwxyz012345',
          },
        },
      ],
    },
  };
  const { value, report } = redactPiRecord(input);
  const serialized = JSON.stringify(value);
  assert.ok(report.contents > 0 || report.secrets > 0);
  assert.equal(serialized.includes('sk-live-abc123XYZ'), false);
  assert.equal(serialized.includes('super-secret-token-value'), false);
  assert.equal(serialized.includes('ghp_abcdefghijklmnopqrstuvwxyz012345'), false);
  assert.equal((value as { type: string }).type, 'message');
});

test('redacts absolute home paths while preserving filenames', () => {
  const input = {
    type: 'session',
    id: 's1',
    cwd: '/Users/minhao/DevWorkspace/Zero/pi-city',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'toolCall',
          id: 'call_1',
          name: 'read',
          arguments: { path: '/Users/minhao/DevWorkspace/Zero/pi-city/src/auth.ts' },
        },
      ],
    },
  };
  const { value, report } = redactPiRecord(input);
  const serialized = JSON.stringify(value);
  assert.ok(report.paths > 0 || report.contents > 0);
  assert.equal(serialized.includes('/Users/minhao'), false);
  assert.match(serialized, /\[REDACTED_PATH\]/);
});

test('redacts email addresses', () => {
  const input = {
    type: 'message',
    id: 'm1',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'Contact owner@example.com for access' }],
    },
  };
  const { value, report } = redactPiRecord(input);
  assert.ok(report.contents > 0 || report.emails > 0);
  assert.equal(JSON.stringify(value).includes('owner@example.com'), false);
});

test('redacts raw tool-result file contents without content fingerprints', () => {
  const content = 'export function login() {\n  return true;\n}\n';
  const input = {
    type: 'message',
    id: 'm1',
    message: {
      role: 'toolResult',
      toolName: 'read',
      toolCallId: 'call_123',
      isError: false,
      content: [{ type: 'text', text: content }],
    },
  };
  const { value, report } = redactPiRecord(input);
  assert.ok(report.contents > 0);
  const redacted = value as {
    message: { toolName: string; toolCallId: string; isError: boolean; content: Array<{ text: string }> };
  };
  assert.equal(redacted.message.toolName, 'read');
  assert.equal(redacted.message.toolCallId, 'call_123');
  assert.equal(redacted.message.isError, false);
  assert.equal(JSON.stringify(value).includes('export function login'), false);
  assert.equal(redacted.message.content[0].text, '[REDACTED_CONTENT]');
  assert.equal(JSON.stringify(value).includes('sha256:'), false);
  assert.equal(JSON.stringify(value).includes('length:'), false);
});

test('preserves lifecycle metadata needed for replay', () => {
  const input = {
    type: 'message',
    id: 'evt_9',
    parentId: 'evt_8',
    timestamp: '2026-08-10T02:00:00.000Z',
    message: {
      role: 'toolResult',
      toolName: 'bash',
      toolCallId: 'call_456',
      isError: false,
      content: [{ type: 'text', text: 'ok' }],
    },
  };
  const { value } = redactPiRecord(input);
  const redacted = value as typeof input;
  assert.equal(redacted.type, 'message');
  assert.equal(redacted.id, 'evt_9');
  assert.equal(redacted.parentId, 'evt_8');
  assert.equal(redacted.timestamp, '2026-08-10T02:00:00.000Z');
  assert.equal(redacted.message.role, 'toolResult');
  assert.equal(redacted.message.toolName, 'bash');
  assert.equal(redacted.message.toolCallId, 'call_456');
  assert.equal(redacted.message.isError, false);
});

test('redaction is deterministic for the same input', () => {
  const input = {
    type: 'message',
    id: 'm1',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'secret file body at /home/runner/work/app/src/main.ts for dev@example.org with Bearer abcdefghijklmnop' }],
    },
  };
  const first = redactPiRecord(input);
  const second = redactPiRecord(input);
  assert.deepEqual(first, second);
});

test('allowlist-sanitizes Pi Session message.content arrays', () => {
  const input = {
    type: 'message',
    id: 'msg_1',
    parentId: 'root',
    timestamp: '2026-08-10T02:19:42.964Z',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'thinking',
          thinking: 'I should inspect the private auth module carefully.',
          thinkingSignature: 'reasoning_content_signature_abc',
        },
        {
          type: 'text',
          text: '我先读取私有文件再回答。',
        },
        {
          type: 'toolCall',
          id: 'call_private',
          name: 'bash',
          arguments: {
            command: 'cat /Users/minhao/secret/auth.ts && echo owner@example.com',
          },
        },
      ],
      api: 'openai-completions',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      usage: { input: 100, output: 20, totalTokens: 120 },
    },
  };
  const toolResult = {
    type: 'message',
    id: 'msg_2',
    parentId: 'msg_1',
    timestamp: '2026-08-10T02:19:47.000Z',
    message: {
      role: 'toolResult',
      toolCallId: 'call_private',
      toolName: 'bash',
      isError: false,
      content: [
        {
          type: 'text',
          text: 'export const SECRET = "do-not-leak";\n',
        },
      ],
    },
  };

  const assistant = redactPiRecord(input);
  const result = redactPiRecord(toolResult);
  const blob = `${JSON.stringify(assistant.value)}\n${JSON.stringify(result.value)}`;

  assert.equal(blob.includes('I should inspect the private auth module'), false);
  assert.equal(blob.includes('reasoning_content_signature_abc'), false);
  assert.equal(blob.includes('我先读取私有文件再回答'), false);
  assert.equal(blob.includes('cat /Users/minhao/secret/auth.ts'), false);
  assert.equal(blob.includes('export const SECRET'), false);
  assert.equal(blob.includes('openai-completions'), false);
  assert.equal(blob.includes('totalTokens'), false);

  const assistantMsg = (assistant.value as typeof input).message;
  assert.equal(assistantMsg.role, 'assistant');
  assert.equal(assistantMsg.content[0].type, 'thinking');
  assert.match(String((assistantMsg.content[0] as { thinking: string }).thinking), /\[REDACTED_CONTENT/);
  assert.match(String((assistantMsg.content[0] as { thinkingSignature: string }).thinkingSignature), /\[REDACTED_/);
  assert.equal(assistantMsg.content[1].type, 'text');
  assert.match(String((assistantMsg.content[1] as { text: string }).text), /\[REDACTED_CONTENT/);
  assert.equal(assistantMsg.content[2].type, 'toolCall');
  assert.equal((assistantMsg.content[2] as { name: string }).name, 'bash');
  assert.equal((assistantMsg.content[2] as { id: string }).id, 'call_private');

  const toolMsg = (result.value as typeof toolResult).message;
  assert.equal(toolMsg.toolName, 'bash');
  assert.equal(toolMsg.toolCallId, 'call_private');
  assert.match(String((toolMsg.content[0] as { text: string }).text), /\[REDACTED_CONTENT/);
});

test('public real fixtures contain no raw conversation or tool prose', () => {
  for (const [label, text] of [
    ['real-read', realRead],
    ['real-multi', realMulti],
  ] as const) {
    assert.equal(text.includes('/Users/minhao'), false, label);
    assert.equal(text.includes('Bearer '), false, label);
    assert.equal(text.includes('sha256:'), false, `${label}:fingerprint`);
    assert.equal(/length:\d+/.test(text), false, `${label}:length-fingerprint`);
    assert.match(text, /"type":"message"/, label);
    assert.equal(text.endsWith('\n\n'), false, `${label}:eof-blank`);

    for (const line of text.split(/\n/).filter(Boolean)) {
      const row = JSON.parse(line) as {
        type: string;
        message?: {
          content?: Array<Record<string, unknown>>;
          usage?: unknown;
          api?: unknown;
        };
      };
      if (row.type !== 'message' || !row.message?.content) continue;
      assert.equal(row.message.api, undefined, label);
      assert.equal(row.message.usage, undefined, label);
      for (const part of row.message.content) {
        for (const key of ['text', 'thinking', 'thinkingSignature'] as const) {
          const value = part[key];
          if (typeof value !== 'string') continue;
          assert.match(value, /^\[REDACTED_(CONTENT|SECRET|PATH|EMAIL)\]$/, `${label}:${key}`);
        }
        const args = part.arguments;
        if (args && typeof args === 'object') {
          for (const value of Object.values(args as Record<string, unknown>)) {
            if (typeof value === 'string') {
              assert.match(value, /^\[REDACTED_/, `${label}:arguments`);
              assert.equal(value.includes('sha256:'), false, `${label}:arg-fingerprint`);
            }
          }
        }
      }
    }
  }
});
