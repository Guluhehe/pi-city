export type MemoryWindIntegrationPhase =
  | 'arrival'
  | 'first-look'
  | 'choose-question'
  | 'plan'
  | 'expedition'
  | 'return'
  | 'complete';

export type MemoryWindAssetId =
  | 'pi-hero'
  | 'red-door-house'
  | 'wet-stone-kit'
  | 'foreground-lantern'
  | 'memory-wind-set'
  | 'archive-door-keys'
  | 'rain-cinema-set'
  | 'librarian'
  | 'projectionist';

export type MemoryWindAnchorId =
  | 'pi-start'
  | 'pi-return'
  | 'memory-wind'
  | 'red-door'
  | 'red-door-steps'
  | 'foreground-lantern'
  | 'wet-stone-foreground'
  | 'archive-door'
  | 'cinema-screen'
  | 'cinema-canopy'
  | 'route-start'
  | 'route-end';

export type MemoryWindVec3 = readonly [number, number, number];

export interface MemoryWindAssetAnchor {
  id: MemoryWindAnchorId;
  position: MemoryWindVec3;
  rotation: MemoryWindVec3;
  scale: number;
  role: 'foreground' | 'midground' | 'destination' | 'route' | 'task-set';
  asset?: MemoryWindAssetId;
  notes: string;
}

export interface MemoryWindShot {
  id: 'arrival' | 'notice' | 'choice' | 'departure' | 'return' | 'complete';
  camera: MemoryWindVec3;
  lookAt: MemoryWindVec3;
  focus: MemoryWindAnchorId[];
  intention: string;
}

export interface MemoryWindAssetState {
  phase: MemoryWindIntegrationPhase;
  piAnimation: 'idle-observe' | 'take-note' | 'turn-and-trot';
  memoryWindMode: 'off' | 'observe' | 'route';
  redDoorLight: 'off' | 'low' | 'warm';
  archiveDoor: 'closed' | 'clue' | 'open';
  cinemaCanopy: 'folded' | 'prepped' | 'open';
  visibleAssets: MemoryWindAssetId[];
}

/**
 * Scene contract for the second chapter. Coordinates are aligned with the
 * current harbor world so production GLBs can replace only their designated
 * anchors instead of forcing a rewrite of city-mission state or camera logic.
 */
export const MEMORY_WIND_ASSET_ANCHORS: readonly MemoryWindAssetAnchor[] = [
  {
    id: 'pi-start', position: [-1.7, 0.18, 1.18], rotation: [0, 0.22, 0], scale: 1,
    role: 'foreground', asset: 'pi-hero', notes: 'Arrival/choice mark. Pi faces the player before turning toward the anomaly.',
  },
  {
    id: 'pi-return', position: [-1.12, 0.18, 1.68], rotation: [0, 0.56, 0], scale: 1,
    role: 'foreground', asset: 'pi-hero', notes: 'Return mark. Keeps Pi separated from fountain spray and leaves red-door sightline clear.',
  },
  {
    id: 'foreground-lantern', position: [-4.95, 0.62, 2.85], rotation: [0, 0.56, 0], scale: 1,
    role: 'foreground', asset: 'foreground-lantern', notes: 'Warm practical light at the left edge; establishes scale without covering Pi.',
  },
  {
    id: 'wet-stone-foreground', position: [-2.86, 0.03, 1.92], rotation: [0, 0.08, 0], scale: 1,
    role: 'foreground', asset: 'wet-stone-kit', notes: 'Foreground wet-stone, post and mooring-ring set. Connects Pi to the harbor rather than a circular plaza.',
  },
  {
    id: 'memory-wind', position: [-1.72, 2.12, 1.18], rotation: [0, 0.22, -0.78], scale: 1,
    role: 'midground', asset: 'memory-wind-set', notes: 'Kite, paper and rope stateful cluster. Observe is loose; route points toward red door after return.',
  },
  {
    id: 'red-door', position: [4.92, 0.18, -3.98], rotation: [0, -0.58, 0], scale: 1,
    role: 'destination', asset: 'red-door-house', notes: 'Far goal for kite mission. Door, steps and warm window must remain inside the hero shot.',
  },
  {
    id: 'red-door-steps', position: [4.35, 0.12, -3.45], rotation: [0, -0.58, 0], scale: 1,
    role: 'route', asset: 'wet-stone-kit', notes: 'Walkable transition from route dots to red door; never blocks Pi path.',
  },
  {
    id: 'route-start', position: [-0.88, 1.34, 1.25], rotation: [0, 0.3, 0], scale: 1,
    role: 'route', notes: 'First reframe dot after Pi returns with the rooftop-wind note.',
  },
  {
    id: 'route-end', position: [3.88, 1.76, -2.9], rotation: [0, -0.48, 0], scale: 1,
    role: 'route', notes: 'Final reframe dot placed above the red-door approach, not on the door surface.',
  },
  {
    id: 'archive-door', position: [-1.25, 0.2, -8.35], rotation: [0, 0.18, 0], scale: 1,
    role: 'task-set', asset: 'archive-door-keys', notes: 'Keys mission focus. The door must support closed, clue and open presentation states.',
  },
  {
    id: 'cinema-screen', position: [2.55, 0.32, 3.9], rotation: [0, -0.22, 0], scale: 1,
    role: 'task-set', asset: 'rain-cinema-set', notes: 'Cinema screen focus. It remains visually quiet until the return carries both useful findings.',
  },
  {
    id: 'cinema-canopy', position: [2.55, 1.5, 3.92], rotation: [0, -0.22, 0], scale: 1,
    role: 'task-set', asset: 'rain-cinema-set', notes: 'Canopy animation/state expands only after weather photo and weather booklet are both carried.',
  },
] as const;

export const MEMORY_WIND_SHOTS: readonly MemoryWindShot[] = [
  {
    id: 'arrival', camera: [7.15, 4.35, 9.2], lookAt: [-1.35, 1.25, 0.5],
    focus: ['foreground-lantern', 'pi-start', 'red-door'],
    intention: 'Introduce a trusted assistant, a harbor-scale foreground and a distant promise before showing the anomaly.',
  },
  {
    id: 'notice', camera: [5.25, 2.65, 7.2], lookAt: [-1.35, 1.82, 0.5],
    focus: ['pi-start', 'memory-wind', 'red-door'],
    intention: 'Pi notices the memory wind; the viewer can still see where the unresolved memory may lead.',
  },
  {
    id: 'choice', camera: [5.05, 2.82, 7.45], lookAt: [-1.05, 1.55, 0.45],
    focus: ['pi-start', 'memory-wind', 'red-door'],
    intention: 'Hold the three-layer question space without covering it with a full-screen UI.',
  },
  {
    id: 'departure', camera: [2.95, 3.35, 6.15], lookAt: [0.65, 0.82, -0.7],
    focus: ['pi-start', 'route-start', 'red-door-steps'],
    intention: 'Show Pi committing to a path; do not cut to an abstract loading state.',
  },
  {
    id: 'return', camera: [3.13, 3.05, 6.83], lookAt: [-1.12, 0.86, 1.68],
    focus: ['pi-return', 'memory-wind', 'route-end'],
    intention: 'Pi returns with a new note and the memory wind visibly reorders into a route.',
  },
  {
    id: 'complete', camera: [5.45, 3.15, 6.88], lookAt: [1.35, 1.22, -1.65],
    focus: ['pi-return', 'red-door', 'red-door-steps'],
    intention: 'Reward the player with a usable red-door route and a warmer, permanently changed destination.',
  },
] as const;

const baseState: Omit<MemoryWindAssetState, 'phase'> = {
  piAnimation: 'idle-observe', memoryWindMode: 'off', redDoorLight: 'low', archiveDoor: 'closed', cinemaCanopy: 'folded',
  visibleAssets: ['pi-hero', 'red-door-house', 'wet-stone-kit', 'foreground-lantern'],
};

export function memoryWindAssetState(
  phase: MemoryWindIntegrationPhase,
  mission: 'kite' | 'keys' | 'cinema',
  facts: readonly string[],
): MemoryWindAssetState {
  const has = (id: string) => facts.includes(id);
  if (mission === 'kite') {
    const returned = phase === 'return' || phase === 'complete';
    return {
      phase,
      piAnimation: phase === 'expedition' ? 'turn-and-trot' : returned ? 'take-note' : 'idle-observe',
      memoryWindMode: phase === 'first-look' || phase === 'choose-question' || phase === 'plan' || phase === 'expedition' ? 'observe' : returned ? 'route' : 'off',
      redDoorLight: phase === 'complete' || has('kite-home') ? 'warm' : 'low',
      archiveDoor: 'closed', cinemaCanopy: 'folded',
      visibleAssets: ['pi-hero', 'red-door-house', 'wet-stone-kit', 'foreground-lantern', 'memory-wind-set'],
    };
  }
  if (mission === 'keys') return {
    phase,
    piAnimation: phase === 'expedition' ? 'turn-and-trot' : phase === 'return' || phase === 'complete' ? 'take-note' : 'idle-observe',
    memoryWindMode: has('kite-home') ? 'route' : 'off', redDoorLight: has('kite-home') ? 'warm' : 'low',
    archiveDoor: phase === 'complete' || has('keys-open') ? 'open' : phase === 'return' || has('keys-rubbing') ? 'clue' : 'closed',
    cinemaCanopy: 'folded',
    visibleAssets: [...baseState.visibleAssets, 'archive-door-keys', ...(has('kite-home') ? ['memory-wind-set' as const] : [])],
  };
  return {
    phase,
    piAnimation: phase === 'expedition' ? 'turn-and-trot' : phase === 'return' || phase === 'complete' ? 'take-note' : 'idle-observe',
    memoryWindMode: has('kite-home') ? 'route' : 'off', redDoorLight: has('kite-home') ? 'warm' : 'low',
    archiveDoor: has('keys-open') ? 'open' : 'closed',
    cinemaCanopy: phase === 'complete' || has('cinema-ready') ? 'open' : phase === 'return' ? 'prepped' : 'folded',
    visibleAssets: [...baseState.visibleAssets, 'rain-cinema-set', ...(has('kite-home') ? ['memory-wind-set' as const] : []), ...(has('keys-open') ? ['archive-door-keys' as const] : [])],
  };
}
