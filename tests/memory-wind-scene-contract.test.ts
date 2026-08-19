import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MEMORY_WIND_ASSET_ANCHORS,
  MEMORY_WIND_SHOTS,
  memoryWindAssetState,
} from '../src/world/memory-wind-scene-contract';

test('memory wind hero shot keeps Pi, anomaly and red-door anchors distinct', () => {
  const pi = MEMORY_WIND_ASSET_ANCHORS.find((anchor) => anchor.id === 'pi-start');
  const anomaly = MEMORY_WIND_ASSET_ANCHORS.find((anchor) => anchor.id === 'memory-wind');
  const redDoor = MEMORY_WIND_ASSET_ANCHORS.find((anchor) => anchor.id === 'red-door');
  const notice = MEMORY_WIND_SHOTS.find((shot) => shot.id === 'notice');

  assert.equal(pi?.role, 'foreground');
  assert.equal(anomaly?.role, 'midground');
  assert.equal(redDoor?.role, 'destination');
  assert.deepEqual(notice?.focus, ['pi-start', 'memory-wind', 'red-door']);
});

test('kite return becomes a visible route instead of a generic reward glow', () => {
  const state = memoryWindAssetState('return', 'kite', ['kite-red-door', 'kite-old-wind']);

  assert.equal(state.piAnimation, 'take-note');
  assert.equal(state.memoryWindMode, 'route');
  assert.equal(state.redDoorLight, 'low');
  assert.ok(state.visibleAssets.includes('memory-wind-set'));
});

test('kite completion persists the red-door route and its warm destination', () => {
  const state = memoryWindAssetState('complete', 'kite', ['kite-home']);

  assert.equal(state.memoryWindMode, 'route');
  assert.equal(state.redDoorLight, 'warm');
});

test('keys open the archive only after new evidence resolves the initial guess', () => {
  assert.equal(memoryWindAssetState('return', 'keys', ['keys-rubbing']).archiveDoor, 'clue');
  assert.equal(memoryWindAssetState('complete', 'keys', ['keys-open']).archiveDoor, 'open');
});

test('cinema opens the canopy only after Pi carries the decision-making result', () => {
  assert.equal(memoryWindAssetState('arrival', 'cinema', []).cinemaCanopy, 'folded');
  assert.equal(memoryWindAssetState('return', 'cinema', ['cinema-rain-photo', 'cinema-weather-book']).cinemaCanopy, 'prepped');
  assert.equal(memoryWindAssetState('complete', 'cinema', ['cinema-ready']).cinemaCanopy, 'open');
});
