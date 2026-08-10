import type { ExperienceDistrict } from './districts';
import type { ShotId } from './shots';

export type CanonicalFrameKey = 'arrival' | 'context' | 'model';

export interface CanonicalFrame {
  key: CanonicalFrameKey;
  /** Index into the auth lesson frames (Photo Mode deep link target). */
  scenarioId: string;
  frameIndex: number;
  district: ExperienceDistrict;
  shotId: ShotId;
  eyebrow: string;
  title: string;
  body: string;
}

/**
 * Deterministic Photo Mode checkpoints for Arrival / Context / Model.
 * Indices match the auth lesson frames used by the live beta.
 */
export const CANONICAL_FRAMES: Record<CanonicalFrameKey, CanonicalFrame> = {
  arrival: {
    key: 'arrival',
    scenarioId: 'auth',
    frameIndex: 0,
    district: 'arrival',
    shotId: 'arrival-wide',
    eyebrow: 'FRAME 01 · ARRIVAL HARBOR',
    title: 'Scale before mechanism',
    body: 'A small request approaches a much larger living system.',
  },
  context: {
    key: 'context',
    scenarioId: 'auth',
    frameIndex: 11,
    district: 'context',
    shotId: 'context-sealed',
    eyebrow: 'FRAME 02 · CONTEXT WORKS',
    title: 'Evidence becomes a visible production process',
    body: 'Returned tool evidence is selected, sorted, and sealed into a new model-visible Context.',
  },
  model: {
    key: 'model',
    scenarioId: 'auth',
    frameIndex: 12,
    district: 'model',
    shotId: 'model-decision',
    eyebrow: 'FRAME 03 · MODEL CORE',
    title: 'Decision under changed evidence',
    body: 'The same model receives a different Context and can now choose a different next action.',
  },
};

export const CANONICAL_FRAME_ORDER: CanonicalFrameKey[] = ['arrival', 'context', 'model'];

export function canonicalFrame(key: string): CanonicalFrame | undefined {
  return CANONICAL_FRAMES[key as CanonicalFrameKey];
}
