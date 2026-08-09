# Pi City

A playable visualization of how AI agents actually run.

Pi City turns agent runtime behavior into a living harbor city. Requests arrive as cargo, session history grows in an archive, context is assembled in a works facility, model decisions open dispatch gates, and tools operate as workshops.

## Current milestone

**v0.1 — Replay a Real Pi Run**

The next product milestone is to ingest real Pi session/runtime data, normalize it into a semantic trace, and replay that trace through the city world.

## Product principles

- Watch first, explore second, control later.
- World view should feel like a real city before it feels like a diagram.
- Artifacts move as physical objects.
- Processes are expressed through machinery.
- State lives in buildings.
- Signals are temporary and diagnostic.
- `History != State != Context`.
- Rendering should consume semantic events, not Pi-specific raw event names.

## Architecture

```text
Real Pi
  |- Runtime Event Stream
  `- Session JSONL
          |
       Pi Adapter
          |
    Semantic Trace
          |
    +-----+------+
    |            |
  World       Inspector
```

## Repository layout

```text
src/
  adapters/pi/       Pi-specific normalization
  semantic-trace/    Runtime-neutral event schema + reducer
  world/             Three.js / R3F city runtime
  timeline/          Replay controls and scrubbing
  inspector/         Human + technical explanations
fixtures/auth-bug/   Hero scenario data

docs/
  product-vision.md
  world-model.md
  semantic-trace.md
  roadmap.md
```
