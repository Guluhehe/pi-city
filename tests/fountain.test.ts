import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  availableFountainQuestions,
  createFountainSession,
  reduceFountainSession,
} from '../src/game/fountain';

function start() {
  let state = createFountainSession();
  state = reduceFountainSession(state, { type: 'BEGIN' });
  return reduceFountainSession(state, { type: 'COMPLETE_FIRST_LOOK' });
}

function askAndReturn(state: ReturnType<typeof createFountainSession>, questionId: 'melody' | 'water' | 'wind' | 'full-song' | 'stable-water') {
  const selected = reduceFountainSession(state, { type: 'SELECT_QUESTION', questionId });
  const departing = reduceFountainSession(selected, { type: 'CONFIRM_PLAN' });
  return reduceFountainSession(departing, { type: 'COMPLETE_EXPEDITION' });
}

test('Fountain tutorial starts as isolated author-defined state, not a trace replay', () => {
  const state = createFountainSession();
  assert.equal(state.source, 'tutorial');
  assert.equal(state.scenarioId, 'fountain-d-greybox');
  assert.equal(state.phase, 'arrival');
  assert.deepEqual(state.facts, []);
  assert.equal(reduceFountainSession(state, { type: 'COMPLETE_EXPEDITION' }), state);
});

test('Pi must make a first observation before player can ask an unknown question', () => {
  const state = createFountainSession();
  assert.equal(reduceFountainSession(state, { type: 'SELECT_QUESTION', questionId: 'melody' }), state);
  const afterFirstLook = start();
  assert.equal(afterFirstLook.phase, 'choose-question');
  assert.deepEqual(afterFirstLook.facts, ['pressure-drop']);
  assert.deepEqual(availableFountainQuestions(afterFirstLook).map((item) => item.id), ['melody', 'water', 'wind']);
});

test('Wind is a useful refutation rather than an illegal or terminal wrong answer', () => {
  const afterWind = askAndReturn(start(), 'wind');
  assert.equal(afterWind.phase, 'return');
  assert.equal(afterWind.lastReturn?.kind, 'refuted');
  assert.equal(afterWind.lastReturn?.title, '不是风');
  const returned = reduceFountainSession(afterWind, { type: 'ACKNOWLEDGE_RETURN' });
  assert.equal(returned.phase, 'choose-question');
  assert.ok(returned.facts.includes('wind-refuted'));
  assert.deepEqual(availableFountainQuestions(returned).map((item) => item.id), ['melody', 'water']);
});

test('Two complementary findings create a new Pi plan, then completion still requires confirmation', () => {
  let state = askAndReturn(start(), 'melody');
  state = reduceFountainSession(state, { type: 'ACKNOWLEDGE_RETURN' });
  state = askAndReturn(state, 'water');
  state = reduceFountainSession(state, { type: 'ACKNOWLEDGE_RETURN' });

  assert.equal(state.phase, 'action');
  assert.ok(state.facts.includes('melody-page'));
  assert.ok(state.facts.includes('pressure-pattern'));

  state = reduceFountainSession(state, { type: 'PERFORM_SYNC_ACTION' });
  assert.equal(state.phase, 'choose-question');
  assert.ok(state.facts.includes('sync-valve'));
  assert.deepEqual(availableFountainQuestions(state).map((item) => item.id), ['full-song', 'stable-water']);

  state = askAndReturn(state, 'stable-water');
  state = reduceFountainSession(state, { type: 'ACKNOWLEDGE_RETURN' });
  assert.equal(state.phase, 'choose-question');
  assert.deepEqual(availableFountainQuestions(state).map((item) => item.id), ['full-song']);

  state = askAndReturn(state, 'full-song');
  state = reduceFountainSession(state, { type: 'ACKNOWLEDGE_RETURN' });
  assert.equal(state.phase, 'complete');
  assert.equal(state.completed, true);
  assert.ok(state.facts.includes('full-song'));
});

test('Fountain tutorial replay is deterministic and reset returns no facts or decisions', () => {
  const replay = () => {
    let state = askAndReturn(start(), 'water');
    state = reduceFountainSession(state, { type: 'ACKNOWLEDGE_RETURN' });
    state = askAndReturn(state, 'melody');
    state = reduceFountainSession(state, { type: 'ACKNOWLEDGE_RETURN' });
    state = reduceFountainSession(state, { type: 'PERFORM_SYNC_ACTION' });
    state = askAndReturn(state, 'full-song');
    return reduceFountainSession(state, { type: 'ACKNOWLEDGE_RETURN' });
  };

  const first = replay();
  assert.deepEqual(first, replay());
  const reset = reduceFountainSession(first, { type: 'RESTART' });
  assert.deepEqual(reset, createFountainSession());
});
