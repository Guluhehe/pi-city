import type { ExperienceDistrict } from './districts';

export interface DistrictCopy {
  title: string;
  body: string;
  tags: string[];
}

export const DISTRICT_COPY: Record<ExperienceDistrict, DistrictCopy> = {
  arrival: {
    title: 'Arrival Harbor',
    body: 'The request threshold. User messages enter the city here before becoming durable history.',
    tags: ['PLACE', 'Observed entry'],
  },
  session: {
    title: 'Session Archive',
    body: 'Durable history. It grows with user messages, assistant messages, and returned tool results.',
    tags: ['HISTORY', 'Append-only'],
  },
  context: {
    title: 'Context Works',
    body: 'The model-visible view is assembled here. Watch selected evidence move toward the capsule while rejected cargo leaves the line.',
    tags: ['DERIVED VIEW', 'Selection + assembly'],
  },
  model: {
    title: 'Model Core',
    body: 'The decision center. It chooses READ, EDIT, BASH, or ANSWER — but does not execute those actions itself.',
    tags: ['DECISION', 'Model call'],
  },
  tool: {
    title: 'Tool Works',
    body: 'The execution district. Model requests become real actions here, then return as evidence.',
    tags: ['EXECUTION', 'External evidence'],
  },
};

/** Hotspot label height above each district anchor. */
export const HOTSPOT_Y: Record<ExperienceDistrict, number> = {
  arrival: 2.8,
  session: 3.2,
  context: 3.1,
  model: 3.4,
  tool: 2.8,
};

/** Explore camera offsets relative to district anchors. */
export const EXPLORE_CAMERA_OFFSET: Record<ExperienceDistrict, readonly [number, number, number]> = {
  arrival: [7, 5.2, 7.5],
  session: [6.5, 4.6, 6.5],
  context: [5.0, 3.8, 5.6],
  model: [5.2, 3.8, 5.2],
  tool: [6.5, 4.6, 6.5],
};

export const EXPLORE_DISTRICTS: ExperienceDistrict[] = [
  'arrival',
  'session',
  'context',
  'model',
  'tool',
];

export const MODEL_GATES = ['READ', 'EDIT', 'BASH', 'ANSWER'] as const;
