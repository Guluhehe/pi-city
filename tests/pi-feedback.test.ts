import assert from 'node:assert/strict';
import test from 'node:test';
import { playPiFeedback, unlockPiFeedbackAudio, type PiFeedbackEvent } from '../src/product/pi-feedback';

class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeGain {
  gain = new FakeParam();
  connect() { return this; }
}

class FakeOscillator {
  frequency = new FakeParam();
  type: OscillatorType = 'sine';
  connect() { return this; }
  start() {}
  stop() {}
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = 'suspended';
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  oscillators: FakeOscillator[] = [];
  constructor() { FakeAudioContext.instances.push(this); }
  async resume() { this.state = 'running'; }
  createGain() { return new FakeGain() as unknown as GainNode; }
  createOscillator() { const oscillator = new FakeOscillator(); this.oscillators.push(oscillator); return oscillator as unknown as OscillatorNode; }
}

test('Pi feedback unlocks once after user gesture and synthesizes every semantic feedback cue', async () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: FakeAudioContext } });
  await unlockPiFeedbackAudio();
  const context = FakeAudioContext.instances[0];
  assert.equal(context.state, 'running');
  const events: PiFeedbackEvent[] = ['landmark-selected', 'journey-committed', 'fact-returned', 'facts-reframed', 'route-chosen'];
  for (const event of events) playPiFeedback(event);
  assert.equal(context.oscillators.length, 11);
});
