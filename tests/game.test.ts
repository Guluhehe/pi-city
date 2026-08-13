import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { importPiJsonl } from '../src/adapters/pi/import';
import { classifyToolName } from '../src/analysis/action-classes';
import {
  checkpointAtLessonFrame,
  derivePredictCheckpointReport,
  derivePredictCheckpoints,
} from '../src/game/checkpoints';
import { mapLessonFramesToTrace } from '../src/experience/lesson-map';
import { getScenario } from '../src/experience/scenarios';
import {
  buildPredictDebrief,
  createGameSession,
  reduceGameSession,
} from '../src/game/session';
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

  const unknownThenRead: SemanticTrace = {
    ...auth,
    events: [
      ...auth.events.slice(0, 5),
      {
        ...auth.events[5],
        id: 'injected-unknown',
        payload: { ...auth.events[5].payload, toolName: 'mcp_delete_record' },
      },
      ...auth.events.slice(5),
    ],
  };
  const skipped = derivePredictCheckpointReport(unknownThenRead);
  assert.deepEqual(skipped.omissions, [
    {
      eventIndex: 3,
      modelCallNumber: 1,
      reason: 'unknown-tool',
      toolNames: ['mcp_delete_record', 'read'],
    },
  ]);
  assert.deepEqual(skipped.checkpoints.map((checkpoint) => checkpoint.actual), ['answer']);
});

test('checkpoint derivation is deterministic and never mutates its trace', () => {
  const trace = importPiJsonl(multiRuntime).trace;
  const before = structuredClone(trace);
  const first = derivePredictCheckpointReport(trace);
  const second = derivePredictCheckpointReport(trace);
  assert.deepEqual(first, second);
  assert.deepEqual(trace, before);
});

test('lesson playback pauses only when its mapped frame reaches the outstanding checkpoint', () => {
  const trace = importPiJsonl(authRuntime).trace;
  const checkpoints = derivePredictCheckpoints(trace);
  const lessonMap = mapLessonFramesToTrace(getScenario('auth'), trace);
  assert.equal(checkpointAtLessonFrame(checkpoints, lessonMap, 3, 0), checkpoints[0]);
  assert.equal(checkpointAtLessonFrame(checkpoints, lessonMap, 12, 1), checkpoints[1]);
  assert.equal(checkpointAtLessonFrame(checkpoints, lessonMap, 4, 0), null);
  assert.equal(checkpointAtLessonFrame(checkpoints, lessonMap, 3, 1), null);
});

test('Game Session replays predictions deterministically into a decision-based debrief', () => {
  const checkpoints = derivePredictCheckpoints(importPiJsonl(authRuntime).trace);
  const actions = [
    { type: 'REACH_CHECKPOINT' as const },
    { type: 'PREDICT_NEXT_ACTION' as const, choice: 'read' as const },
    { type: 'CONTINUE_REPLAY' as const },
    { type: 'REACH_CHECKPOINT' as const },
    { type: 'PREDICT_NEXT_ACTION' as const, choice: 'edit' as const },
    { type: 'CONTINUE_REPLAY' as const },
    { type: 'COMPLETE_RUN' as const },
  ];
  const replay = () => actions.reduce(
    (state, action) => reduceGameSession(state, action, checkpoints),
    createGameSession('auth', checkpoints),
  );

  const first = replay();
  assert.deepEqual(first, replay());
  assert.equal(first.phase, 'debrief');
  assert.equal(first.runComplete, true);
  assert.deepEqual(first.decisions.map(({ choice, actual, correct }) => ({ choice, actual, correct })), [
    { choice: 'read', actual: 'read', correct: true },
    { choice: 'edit', actual: 'answer', correct: false },
  ]);
  assert.deepEqual(buildPredictDebrief(first, checkpoints), {
    total: 2,
    correct: 1,
    entries: first.decisions.map((decision) => ({
      decision,
      checkpoint: checkpoints[decision.checkpointIndex],
    })),
  });
});

test('Game Session rejects illegal transitions without allocating a new state', () => {
  const checkpoints = derivePredictCheckpoints(importPiJsonl(authRuntime).trace);
  const watch = createGameSession('auth', checkpoints);
  assert.equal(
    reduceGameSession(watch, { type: 'PREDICT_NEXT_ACTION', choice: 'read' }, checkpoints),
    watch,
  );
  const predict = reduceGameSession(watch, { type: 'REACH_CHECKPOINT' }, checkpoints);
  assert.equal(reduceGameSession(predict, { type: 'CONTINUE_REPLAY' }, checkpoints), predict);
  const reveal = reduceGameSession(predict, { type: 'PREDICT_NEXT_ACTION', choice: 'read' }, checkpoints);
  assert.equal(reduceGameSession(reveal, { type: 'REACH_CHECKPOINT' }, checkpoints), reveal);
});

test('COMPLETE_RUN waits for every reached checkpoint before entering debrief', () => {
  const checkpoints = derivePredictCheckpoints(importPiJsonl(authRuntime).trace);
  const initial = createGameSession('auth', checkpoints);
  const completedEarly = reduceGameSession(initial, { type: 'COMPLETE_RUN' }, checkpoints);
  assert.equal(completedEarly.phase, 'watch');
  assert.equal(completedEarly.runComplete, true);
});
