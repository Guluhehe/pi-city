import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  availableCityMissionQuestions,
  createCityCampaign,
  createCityMission,
  isMissionUnlocked,
  reduceCityCampaign,
  reduceCityMission,
} from '../src/game';

function beginMission(missionId: 'lighthouse' | 'parcel') {
  let state = createCityMission(missionId);
  state = reduceCityMission(state, { type: 'BEGIN' });
  return reduceCityMission(state, { type: 'COMPLETE_FIRST_LOOK' });
}

function visit<T extends ReturnType<typeof createCityMission>>(state: T, questionId: string): T {
  const planned = reduceCityMission(state, { type: 'SELECT_QUESTION', questionId });
  const departing = reduceCityMission(planned, { type: 'CONFIRM_PLAN' });
  return reduceCityMission(departing, { type: 'COMPLETE_EXPEDITION' }) as T;
}

function acknowledge<T extends ReturnType<typeof createCityMission>>(state: T): T {
  return reduceCityMission(state, { type: 'ACKNOWLEDGE_RETURN' }) as T;
}

test('City campaign exposes the first chapter as a progressive, tutorial-only city memory', () => {
  let campaign = createCityCampaign();
  assert.equal(campaign.source, 'tutorial');
  assert.equal(isMissionUnlocked(campaign, 'lighthouse'), true);
  assert.equal(isMissionUnlocked(campaign, 'parcel'), false);
  assert.equal(isMissionUnlocked(campaign, 'fountain'), false);

  campaign = reduceCityCampaign(campaign, { type: 'COMPLETE_MISSION', missionId: 'lighthouse' });
  assert.equal(isMissionUnlocked(campaign, 'parcel'), true);
  campaign = reduceCityCampaign(campaign, { type: 'COMPLETE_MISSION', missionId: 'parcel' });
  assert.equal(isMissionUnlocked(campaign, 'fountain'), true);
});

test('Lighthouse makes an early reply a useful confirmation detour, not a hard failure', () => {
  let state = beginMission('lighthouse');
  assert.deepEqual(availableCityMissionQuestions(state).map((item) => item.id), ['overlook', 'library', 'reply']);

  state = visit(state, 'reply');
  assert.equal(state.lastReturn?.kind, 'detour');
  assert.equal(state.lastReturn?.discovery, 'lighthouse-unconfirmed-seal');
  state = acknowledge(state);
  assert.equal(state.phase, 'choose-question');
  assert.ok(state.facts.includes('needs-confirmation'));

  state = visit(state, 'overlook');
  state = acknowledge(state);
  state = visit(state, 'workshop');
  state = acknowledge(state);
  state = visit(state, 'garden');
  state = acknowledge(state);
  state = visit(state, 'reply');
  state = acknowledge(state);

  assert.equal(state.phase, 'complete');
  assert.equal(state.completed, true);
  assert.ok(state.facts.includes('light-confirmed'));
  assert.ok(state.facts.includes('reply-sent'));
});

test('Parcel requires old and current place evidence together, while an early post visit leaves a collectible clue', () => {
  let state = beginMission('parcel');
  state = visit(state, 'post');
  assert.equal(state.lastReturn?.kind, 'detour');
  assert.equal(state.lastReturn?.discovery, 'postal-half-receipt');
  state = acknowledge(state);

  state = visit(state, 'library');
  state = acknowledge(state);
  state = visit(state, 'overlook');
  state = acknowledge(state);
  assert.deepEqual(availableCityMissionQuestions(state).map((item) => item.id), ['post']);

  state = visit(state, 'post');
  state = acknowledge(state);
  assert.equal(state.phase, 'complete');
  assert.ok(state.facts.includes('old-address'));
  assert.ok(state.facts.includes('new-street'));
  assert.ok(state.facts.includes('delivered'));
});
