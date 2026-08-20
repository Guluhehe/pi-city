export type PiFeedbackEvent = 'landmark-selected' | 'journey-committed' | 'fact-returned' | 'facts-reframed' | 'route-chosen';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

export async function unlockPiFeedbackAudio(): Promise<void> {
  const context = getAudioContext();
  if (context?.state === 'suspended') await context.resume();
}

function chirp(context: AudioContext, at: number, frequency: number, duration: number, gain: number, destination: AudioNode, kind: OscillatorType = 'sine', glideTo?: number) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = kind;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, at + duration);
  envelope.gain.setValueAtTime(.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + .018);
  envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(envelope).connect(destination);
  oscillator.start(at);
  oscillator.stop(at + duration + .03);
}

/**
 * Plays only concise, functional confirmation sounds. If sound has not yet been
 * unlocked by a player gesture, the visual feedback remains the full signal.
 */
export function playPiFeedback(event: PiFeedbackEvent): void {
  const context = getAudioContext();
  if (!context || context.state !== 'running') return;
  const master = context.createGain();
  master.gain.value = .13;
  master.connect(context.destination);
  const now = context.currentTime + .012;
  if (event === 'landmark-selected') {
    chirp(context, now, 660, .11, .62, master, 'sine', 820);
    chirp(context, now + .12, 990, .16, .34, master, 'triangle', 1180);
  } else if (event === 'journey-committed') {
    chirp(context, now, 294, .18, .45, master, 'sine', 370);
    chirp(context, now + .13, 440, .23, .32, master, 'triangle', 554);
  } else if (event === 'fact-returned') {
    chirp(context, now, 523, .17, .44, master, 'triangle', 620);
    chirp(context, now + .09, 784, .23, .25, master, 'sine', 880);
  } else if (event === 'facts-reframed') {
    chirp(context, now, 440, .16, .4, master, 'triangle', 522);
    chirp(context, now + .14, 659, .19, .34, master, 'sine', 784);
    chirp(context, now + .29, 988, .34, .26, master, 'sine', 1046);
  } else {
    chirp(context, now, 392, .12, .38, master, 'triangle', 466);
    chirp(context, now + .1, 659, .22, .28, master, 'sine', 784);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
