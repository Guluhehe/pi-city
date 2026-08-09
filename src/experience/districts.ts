export type ExperienceDistrict = 'arrival' | 'session' | 'context' | 'model' | 'tool';

/** World-space anchors for the five hero districts (shared by renderer + visual checks). */
export const DISTRICT_POSITIONS: Record<ExperienceDistrict, readonly [number, number, number]> = {
  arrival: [-11.5, 0.35, 4.8],
  session: [-5.2, 0.35, 0.7],
  context: [1.0, 0.35, -4.6],
  model: [7.1, 0.35, -0.15],
  tool: [13.0, 0.35, 4.3],
};

export const DISTRICT_MODELS: Record<ExperienceDistrict, string> = {
  arrival: 'arrival-harbor.glb',
  session: 'session-archive.glb',
  context: 'context-works.glb',
  model: 'model-core.glb',
  tool: 'tool-works.glb',
};
