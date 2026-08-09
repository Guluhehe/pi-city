import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { CANONICAL_FRAMES } from '../src/experience/canonical-frames';
import { mapLessonFramesToTrace } from '../src/experience/lesson-map';
import { getScenario, scenarioDurationMs } from '../src/experience/scenarios';
import { EVENT_SHOT, SHOTS, shotForEventType } from '../src/experience/shots';

const runtime = readFileSync(new URL('../fixtures/auth-bug/runtime.jsonl', import.meta.url), 'utf8');

test('auth lesson pacing remains the cinematic ~65s journey', () => {
  const auth = getScenario('auth');
  assert.equal(auth.frames.length, 15);
  assert.equal(scenarioDurationMs(auth), 64900);
});

test('canonical frames point at auth lesson indices and known shots', () => {
  const auth = getScenario('auth');
  for (const frame of Object.values(CANONICAL_FRAMES)) {
    assert.equal(frame.scenarioId, 'auth');
    assert.ok(frame.frameIndex >= 0 && frame.frameIndex < auth.frames.length);
    assert.ok(frame.shotId in SHOTS);
    assert.equal(auth.frames[frame.frameIndex].district, frame.district);
  }
});

test('event-driven and lesson shot ids share one library', () => {
  assert.equal(EVENT_SHOT.REQUEST_ARRIVED, 'arrival-wide');
  assert.equal(shotForEventType('CONTEXT_COMPILED').id, 'context-sealed');
  assert.equal(shotForEventType('TOOL_RESULT_ATTACHED').id, 'uturn');
  assert.deepEqual(SHOTS['arrival-wide'].offset, [14.2, 7.4, 13.1]);
});

test('lesson frames map onto the auth semantic trace without inventing indices', () => {
  const auth = getScenario('auth');
  const trace = importPiJsonl(runtime).trace;
  const mapped = mapLessonFramesToTrace(auth, trace);
  assert.equal(mapped.length, auth.frames.length);
  assert.ok(mapped.every((index) => index >= 0 && index < trace.events.length));
  assert.equal(trace.events[mapped[0]]?.type, 'REQUEST_ARRIVED');
  assert.equal(trace.events[mapped[8]]?.type, 'TOOL_RESULT_ATTACHED');
});
