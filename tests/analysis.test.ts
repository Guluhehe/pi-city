import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { analyzeRun } from '../src/analysis/run';
import { buildStory } from '../src/analysis/story';
import { buildContextSnapshots, compareContextSnapshots } from '../src/analysis/context';

const runtime = readFileSync(new URL('../fixtures/auth-bug/runtime.jsonl', import.meta.url), 'utf8');
const trace = importPiJsonl(runtime).trace;

test('analyzes a run into product-level summary metrics', () => {
  const analysis = analyzeRun(trace);
  assert.equal(analysis.status, 'completed');
  assert.equal(analysis.modelCalls, 2);
  assert.equal(analysis.toolCalls, 1);
  assert.equal(analysis.tools[0]?.name, 'read');
  assert.match(analysis.title, /authentication bug/);
});

test('groups raw semantic events into a story timeline', () => {
  const story = buildStory(trace);
  assert.equal(story[0]?.kind, 'request');
  assert.ok(story.some((step) => step.kind === 'inspect' && step.tools.some((tool) => tool.name === 'read')));
  assert.ok(story.some((step) => step.kind === 'answer'));
  assert.equal(story.at(-1)?.kind, 'complete');
});

test('compares model-call contexts and surfaces newly returned evidence', () => {
  const snapshots = buildContextSnapshots(trace);
  assert.equal(snapshots.length, 2);
  const diff = compareContextSnapshots(snapshots[1], snapshots[0]);
  assert.ok(diff.added.some((item) => item.kind === 'tool-call'));
  assert.ok(diff.added.some((item) => item.kind === 'tool-result'));
  assert.ok(diff.retained.some((item) => item.kind === 'request'));
});

const multiToolRuntime = readFileSync(new URL('../fixtures/multi-tool/runtime.jsonl', import.meta.url), 'utf8');

test('multi-tool context snapshots expose each newly returned action as evidence', () => {
  const multiTrace = importPiJsonl(multiToolRuntime).trace;
  const snapshots = buildContextSnapshots(multiTrace);
  assert.equal(snapshots.length, 3);

  const second = compareContextSnapshots(snapshots[1], snapshots[0]);
  assert.deepEqual(
    second.added.map((item) => item.label),
    ['read call', 'grep call', 'read result', 'grep result'],
  );

  const third = compareContextSnapshots(snapshots[2], snapshots[1]);
  assert.deepEqual(
    third.added.map((item) => item.label),
    ['edit call', 'bash call', 'edit result', 'bash result'],
  );
});

test('keeps multi-tool work readable at the story layer', () => {
  const multiTrace = importPiJsonl(multiToolRuntime).trace;
  const analysis = analyzeRun(multiTrace);
  const story = buildStory(multiTrace);
  assert.equal(analysis.toolCalls, 4);
  assert.deepEqual(analysis.tools.map((tool) => tool.name), ['bash', 'edit', 'grep', 'read']);
  assert.ok(story.some((step) => step.kind === 'inspect' && step.tools.length === 2));
  assert.ok(story.some((step) => step.title === 'Change and verify' && step.tools.length === 2));
  assert.ok(story.some((step) => step.kind === 'answer'));
});
