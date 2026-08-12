import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { CANONICAL_FRAMES } from '../src/experience/canonical-frames';
import { mapLessonFramesToTrace } from '../src/experience/lesson-map';
import {
  evaluateScenarioCompatibility,
  routeImportedTrace,
  selectCompatibleScenario,
} from '../src/experience/scenario-compatibility';
import { getScenario, scenarioDurationMs } from '../src/experience/scenarios';
import { EVENT_SHOT, SHOTS, shotForEventType } from '../src/experience/shots';
import { SEMANTIC_TRACE_SCHEMA_VERSION, type SemanticTrace } from '../src/semantic-trace/schema';

const runtime = readFileSync(new URL('../fixtures/auth-bug/runtime.jsonl', import.meta.url), 'utf8');
const authRuntime = runtime;
const multiRuntime = readFileSync(new URL('../fixtures/multi-tool/runtime.jsonl', import.meta.url), 'utf8');
const sessionOnlyFixture = readFileSync(new URL('../fixtures/auth-bug/session.jsonl', import.meta.url), 'utf8');

const incompleteTrace: SemanticTrace = {
  schemaVersion: SEMANTIC_TRACE_SCHEMA_VERSION,
  adapterVersion: 'test',
  id: 'incomplete',
  source: 'demo',
  createdAt: 0,
  events: [
    {
      id: 'e1',
      type: 'REQUEST_ARRIVED',
      evidence: { level: 'observed', source: 'demo' },
      payload: {},
    },
  ],
  warnings: [],
  metadata: {},
};

test('auth lesson pacing remains the cinematic ~65s journey', () => {
  const auth = getScenario('auth');
  assert.equal(auth.frames.length, 15);
  assert.equal(scenarioDurationMs(auth), 64900);
});

test('lesson metadata cannot make evidence claims and identifies authored narration', () => {
  for (const scenario of [getScenario('auth'), getScenario('multi')]) {
    assert.equal(
      (scenario as unknown as Record<string, unknown>).narration,
      'demo',
      `${scenario.id} must identify its authored narration`,
    );
    assert.ok(
      scenario.frames.every((frame) => !('evidence' in frame)),
      `${scenario.id} frames must derive evidence from mapped trace events`,
    );
  }
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
  assert.equal(trace.events[mapped[9]]?.type, 'TOOL_RESULT_ATTACHED');
  for (let i = 1; i < mapped.length; i += 1) {
    assert.ok(mapped[i] > mapped[i - 1], 'mapped indexes must advance chronologically');
  }
});

test('selects auth only when every required auth beat exists', () => {
  const trace = importPiJsonl(authRuntime).trace;
  assert.equal(selectCompatibleScenario(trace)?.id, 'auth');
});

test('selects multi for the multi-tool fixture', () => {
  const trace = importPiJsonl(multiRuntime).trace;
  assert.equal(selectCompatibleScenario(trace)?.id, 'multi');
});

test('does not silently map an incompatible trace to auth', () => {
  const trace = importPiJsonl(sessionOnlyFixture).trace;
  assert.equal(selectCompatibleScenario(trace), null);
});

test('reports missing ordered event occurrences', () => {
  const result = evaluateScenarioCompatibility(getScenario('auth'), incompleteTrace);
  assert.equal(result.compatible, false);
  assert.ok(result.missing.length > 0);
});

test('mapLessonFramesToTrace throws for incompatible traces', () => {
  assert.throws(
    () => mapLessonFramesToTrace(getScenario('auth'), incompleteTrace),
    /incompatible/i,
  );
});

test('routes auth fixture to guided city/auth', () => {
  const trace = importPiJsonl(authRuntime).trace;
  assert.deepEqual(routeImportedTrace(trace), { surface: 'city', scenarioId: 'auth' });
});

test('routes multi-tool fixture to guided city/multi', () => {
  const trace = importPiJsonl(multiRuntime).trace;
  assert.deepEqual(routeImportedTrace(trace), { surface: 'city', scenarioId: 'multi' });
});

test('routes session-only and incomplete traces to explorer', () => {
  assert.deepEqual(routeImportedTrace(importPiJsonl(sessionOnlyFixture).trace), {
    surface: 'explorer',
    reason: 'no-compatible-scenario',
  });
  assert.deepEqual(routeImportedTrace(incompleteTrace), {
    surface: 'explorer',
    reason: 'no-compatible-scenario',
  });
});

test('routing never defaults an unknown trace to auth', () => {
  const destination = routeImportedTrace(incompleteTrace);
  assert.notEqual(
    destination.surface === 'city' ? destination.scenarioId : null,
    'auth',
  );
  assert.equal(destination.surface, 'explorer');
});
