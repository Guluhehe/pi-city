import type { SemanticEventType } from '../semantic-trace/schema';

export type ShotId =
  | 'world'
  | 'arrival-wide'
  | 'session-close'
  | 'context-cut'
  | 'context-sealed'
  | 'model-decision'
  | 'model-gate'
  | 'tool-follow'
  | 'tool-close'
  | 'uturn'
  | 'model-answer'
  | 'pullback';

export interface ShotSpec {
  id: ShotId;
  offset: readonly [number, number, number];
  lookShift: readonly [number, number, number];
  fov: number;
  exposure: number;
  bloom: number;
  aperture: number;
  maxBlur: number;
  matte: number;
}

const BASE: Omit<ShotSpec, 'id'> = {
  offset: [9.0, 6.3, 10.4],
  lookShift: [0, 1.25, 0],
  fov: 34,
  exposure: 1.06,
  bloom: 0.22,
  aperture: 0.000022,
  maxBlur: 0.0032,
  matte: 0.12,
};

/** Declarative shot library — single source for Watch, Photo Mode, and visual checks. */
export const SHOTS: Record<ShotId, ShotSpec> = {
  world: {
    id: 'world',
    offset: [19, 14, 24],
    lookShift: [0, 1.0, 0],
    fov: 37,
    exposure: 1.06,
    bloom: 0.22,
    aperture: 0.000022,
    maxBlur: 0.0032,
    matte: 0.4,
  },
  'arrival-wide': {
    id: 'arrival-wide',
    ...BASE,
    offset: [14.2, 7.4, 13.1],
    lookShift: [3.0, 1.12, -0.45],
    fov: 40,
    exposure: 1.11,
    bloom: 0.19,
    aperture: 0.000013,
    maxBlur: 0.0021,
    matte: 0.56,
  },
  'session-close': {
    id: 'session-close',
    ...BASE,
    offset: [7.0, 4.7, 6.9],
    lookShift: [-0.35, 1.25, -0.35],
    fov: 32,
    exposure: 1.03,
    bloom: 0.2,
    aperture: 0.00003,
    maxBlur: 0.0038,
    matte: 0.12,
  },
  'context-cut': {
    id: 'context-cut',
    ...BASE,
    offset: [6.6, 3.9, 5.2],
    lookShift: [-0.45, -0.2, -0.72],
    fov: 30,
    exposure: 1.13,
    bloom: 0.25,
    aperture: 0.000037,
    maxBlur: 0.0045,
    matte: 0.045,
  },
  'context-sealed': {
    id: 'context-sealed',
    ...BASE,
    offset: [6.4, 3.7, 5.0],
    lookShift: [-0.2, -0.5, -0.9],
    fov: 30,
    exposure: 1.16,
    bloom: 0.31,
    aperture: 0.000043,
    maxBlur: 0.005,
    matte: 0.045,
  },
  'model-decision': {
    id: 'model-decision',
    ...BASE,
    offset: [8.5, 5.0, 6.8],
    lookShift: [-1.2, 0.3, -0.35],
    fov: 32,
    exposure: 0.98,
    bloom: 0.4,
    aperture: 0.000041,
    maxBlur: 0.0048,
    matte: 0.045,
  },
  'model-gate': {
    id: 'model-gate',
    ...BASE,
    offset: [4.85, 3.0, 4.15],
    lookShift: [0.72, 1.2, 0.05],
    fov: 27,
    exposure: 1.0,
    bloom: 0.38,
    aperture: 0.000048,
    maxBlur: 0.0058,
    matte: 0.05,
  },
  'tool-follow': {
    id: 'tool-follow',
    ...BASE,
    offset: [6.7, 4.0, 6.0],
    lookShift: [-0.45, 1.05, 0.35],
    fov: 31,
    exposure: 1.05,
    bloom: 0.26,
    aperture: 0.00003,
    maxBlur: 0.004,
    matte: 0.08,
  },
  'tool-close': {
    id: 'tool-close',
    ...BASE,
    offset: [5.2, 3.3, 4.8],
    lookShift: [0.2, 1.0, 0.15],
    fov: 28,
    exposure: 1.06,
    bloom: 0.3,
    aperture: 0.000042,
    maxBlur: 0.0052,
    matte: 0.07,
  },
  uturn: {
    id: 'uturn',
    ...BASE,
    offset: [9.6, 6.3, 8.7],
    lookShift: [0.5, 0.82, -0.7],
    fov: 35,
    exposure: 1.05,
    bloom: 0.25,
    aperture: 0.000025,
    maxBlur: 0.0036,
    matte: 0.22,
  },
  'model-answer': {
    id: 'model-answer',
    ...BASE,
    offset: [5.25, 3.35, 4.25],
    lookShift: [0.05, 1.52, -0.3],
    fov: 28,
    exposure: 1.03,
    bloom: 0.37,
    aperture: 0.000043,
    maxBlur: 0.0054,
    matte: 0.06,
  },
  pullback: {
    id: 'pullback',
    ...BASE,
    offset: [21, 14.8, 25.5],
    lookShift: [1.0, 0.9, -0.2],
    fov: 39,
    exposure: 1.08,
    bloom: 0.18,
    aperture: 0.000012,
    maxBlur: 0.002,
    matte: 0.48,
  },
};

/** Default camera id when a semantic event drives Watch mode without an explicit lesson cam. */
export const EVENT_SHOT: Partial<Record<SemanticEventType, ShotId>> = {
  REQUEST_ARRIVED: 'arrival-wide',
  SESSION_NODE_ADDED: 'session-close',
  CONTEXT_COMPILE_STARTED: 'context-cut',
  CONTEXT_COMPILED: 'context-sealed',
  MODEL_REQUEST_STARTED: 'model-decision',
  MODEL_STREAMING: 'model-decision',
  TOOL_CALL_CREATED: 'model-gate',
  TOOL_EXECUTION_STARTED: 'tool-follow',
  TOOL_EXECUTION_UPDATED: 'tool-follow',
  TOOL_EXECUTION_COMPLETED: 'tool-close',
  TOOL_RESULT_ATTACHED: 'uturn',
  MODEL_RESPONSE_COMPLETED: 'model-answer',
  AGENT_SETTLED: 'pullback',
};

export function shotById(id?: ShotId | string): ShotSpec {
  if (id && id in SHOTS) return SHOTS[id as ShotId];
  return SHOTS.world;
}

export function shotForEventType(type?: SemanticEventType): ShotSpec {
  if (!type) return SHOTS.world;
  return shotById(EVENT_SHOT[type] ?? 'world');
}

/** Compact export for Python visual checks and static prototypes. */
export function exportShotLibrary() {
  return {
    schemaVersion: 1,
    shots: SHOTS,
    eventShot: EVENT_SHOT,
  };
}
