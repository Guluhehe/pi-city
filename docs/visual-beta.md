# Pi City v0.4 — Visual Prototype

v0.4 changes the visual production architecture rather than adding new runtime features.

## Production rule

**GLB assets provide the physical city. Runtime-driven Three.js geometry provides the living internals.**

The previous prototype assembled hero buildings directly from JSX primitives. v0.4 generates and loads independent GLB assets for:

- Arrival Harbor
- Session Archive
- Context Works
- Model Core
- Tool Works

The runtime overlays remain procedural so Session growth, Context assembly, decision gates, tool activity and artifact logistics can continue to respond to Semantic Trace events.

## Visual direction

The target is an industrial harbor at warm dusk rather than a cyberpunk dashboard:

- warm low sun against cool water
- stone, weathered timber, dark iron, bronze and glass
- cranes, warehouses, storage tanks, pipe racks, rail and dock lights
- atmospheric fog, smoke and distant skyline
- active runtime districts light up through practical lighting rather than neon network lines

## Asset pipeline

`scripts/build_hero_models.py` produces the GLB files under `public/assets/models/`.

The generated assets are intentionally deterministic so they can be rebuilt and versioned while the visual language is still changing. They are a bridge to later Blender-authored hero assets, not the final art ceiling.

## Deployable visual shell

Historical note: `site-visual-beta/` is now frozen at `legacy/site-visual-beta/`. It was a build-free deployment shell that loaded the same local GLBs and a pinned Three.js build from a CDN; it is no longer a supported deployment source.
