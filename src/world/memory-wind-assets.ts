export type MemoryWindAssetId = 'pi-hero' | 'red-door-house' | 'foreground-lantern' | 'memory-wind-set';

export type MemoryWindAssetContract = {
  id: MemoryWindAssetId;
  url: string;
  required: boolean;
  purpose: string;
  acceptance: string;
};

/**
 * Production asset hand-off contract. These paths intentionally do not ship a
 * placeholder mesh: a low-detail primitive is not a substitute for the final
 * GLB. The runtime will keep the current safe fallback until an approved asset
 * is delivered at the matching path.
 */
export const MEMORY_WIND_ASSET_CONTRACT: readonly MemoryWindAssetContract[] = [
  {
    id: 'pi-hero',
    url: '/assets/production/pi-hero.glb',
    required: true,
    purpose: "Pi's observe, take-note, and turn-and-trot performances.",
    acceptance: 'Readable lantern cap, double satchel, feet, and arm silhouette at the chapter-two hero camera.',
  },
  {
    id: 'red-door-house',
    url: '/assets/production/memory-wind-red-door-house.glb',
    required: true,
    purpose: 'The route destination and hero architecture of the Memory Wind street corner.',
    acceptance: 'A readable red door, steps, window and roof silhouette under blue-hour lighting.',
  },
  {
    id: 'foreground-lantern',
    url: '/assets/production/memory-wind-foreground-lantern.glb',
    required: false,
    purpose: 'Foreground framing and practical warm key light.',
    acceptance: 'Retains silhouette and warm-glass material when lightly defocused.',
  },
  {
    id: 'memory-wind-set',
    url: '/assets/production/memory-wind-set.glb',
    required: false,
    purpose: 'Kite frame, paper props, and route-ready central set dressing.',
    acceptance: 'Supports the unknown-to-route transformation without relying on generic light orbs.',
  },
] as const;

export const memoryWindAssetUrl = (id: MemoryWindAssetId) => MEMORY_WIND_ASSET_CONTRACT.find((asset) => asset.id === id)?.url;
