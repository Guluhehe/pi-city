import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  availableCityMissionQuestions,
  createCityCampaign,
  createCityMission,
  isMissionUnlocked,
  reduceCityCampaign,
  reduceCityMission,
  type ChapterMissionId,
} from '../src/game';

function begin(missionId: ChapterMissionId) {
  let state = createCityMission(missionId);
  state = reduceCityMission(state, { type: 'BEGIN' });
  return reduceCityMission(state, { type: 'COMPLETE_FIRST_LOOK' });
}

function travel<T extends ReturnType<typeof createCityMission>>(state: T, questionId: string): T {
  state = reduceCityMission(state, { type: 'SELECT_QUESTION', questionId }) as T;
  state = reduceCityMission(state, { type: 'CONFIRM_PLAN' }) as T;
  return reduceCityMission(state, { type: 'COMPLETE_EXPEDITION' }) as T;
}

function accept<T extends ReturnType<typeof createCityMission>>(state: T): T {
  return reduceCityMission(state, { type: 'ACKNOWLEDGE_RETURN' }) as T;
}

const routes: Array<[ChapterMissionId, string, string, string, string]> = [
  ['kite', 'kite-library', 'kite-overlook', 'kite-reply', 'kite-home'],
  ['keys', 'keys-try', 'keys-workshop', 'keys-reply', 'keys-open'],
  ['cinema', 'cinema-sky', 'cinema-library', 'cinema-reply', 'cinema-ready'],
  ['seed', 'seed-look', 'seed-tool', 'seed-confirm', 'seed-bloom'],
  ['card', 'card-photo', 'card-look', 'card-reply', 'card-delivered'],
  ['windmill', 'windmill-fast', 'windmill-slow', 'windmill-reply', 'windmill-steady'],
  ['orders', 'orders-market', 'orders-stage', 'orders-reply', 'orders-evening'],
  ['fogbell', 'fogbell-compass', 'fogbell-listen', 'fogbell-reply', 'fogbell-clear'],
  ['festival', 'festival-map', 'festival-light', 'festival-reply', 'festival-lit'],
];

test('Campaign unlocks all twelve authored city wishes in chapter order without touching real trace state', () => {
  let campaign = createCityCampaign();
  const ids = ['lighthouse', 'parcel', 'fountain', 'kite', 'keys', 'cinema', 'seed', 'card', 'windmill', 'orders', 'fogbell', 'festival'] as const;
  for (const [index, missionId] of ids.entries()) {
    assert.equal(campaign.source, 'tutorial');
    assert.equal(isMissionUnlocked(campaign, missionId), true);
    if (index + 1 < ids.length) assert.equal(isMissionUnlocked(campaign, ids[index + 1]), false);
    campaign = reduceCityCampaign(campaign, { type: 'COMPLETE_MISSION', missionId });
  }
  assert.equal(campaign.completedMissions.length, 12);
  assert.equal(campaign.activeMission, null);
});

for (const [missionId, first, second, reply, terminalFact] of routes) {
  test(`${missionId} follows the shared observation → return → reconsider → reply contract`, () => {
    let state = begin(missionId);
    assert.equal(state.source, 'tutorial');
    assert.ok(availableCityMissionQuestions(state).some((question) => question.id === first));
    state = accept(travel(state, first));
    assert.ok(state.facts.length >= 2);
    state = accept(travel(state, second));
    assert.ok(availableCityMissionQuestions(state).some((question) => question.id === reply));
    state = accept(travel(state, reply));
    assert.equal(state.phase, 'complete');
    assert.equal(state.completed, true);
    assert.ok(state.facts.includes(terminalFact));
  });
}

test('Second chapter optional routes keep a collectible city clue instead of a failure state', () => {
  let state = begin('kite');
  state = travel(state, 'kite-quick');
  assert.equal(state.lastReturn?.kind, 'detour');
  assert.equal(state.lastReturn?.discovery, 'kite-tail-note');
  state = accept(state);
  assert.equal(state.phase, 'choose-question');
  assert.ok(state.facts.includes('kite-wrong-door'));
});
