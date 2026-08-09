# Pi City v0.3 — Online Beta

## Goal

Make Pi City testable as a URL before the final high-fidelity asset pipeline is complete. The user should experience the complete product loop, not a dashboard approximation.

## Experience contract

1. A run arrives in the harbor.
2. The user follows the artifact through Arrival, Session, Context, Model and Tool Works.
3. Story is secondary navigation, not the main canvas.
4. Tool results visibly turn back toward Agent history.
5. Context changes trigger an optional compare drawer.
6. The user can scrub, replay, switch scenarios, or import Pi runtime JSONL.

## Deployment architecture

`site-beta/` is a self-contained static application with no CDN or npm dependency. This is intentional: it can be deployed to any static host and can serve as the source for a Sites deployment.

The full product remains:

```text
Pi Raw Evidence
  -> Pi Adapter
  -> Semantic Trace
  -> Analysis Layer
  -> World Cue
  -> React / Three.js world
```

The online beta uses a simplified browser-side normalizer and an isometric SVG world to make the same product loop deployable immediately. It is not the final rendering stack.

## Beta acceptance criteria

- URL opens with no installation.
- First meaningful action is `Follow this run`.
- World remains the dominant visual surface.
- Session / Context / Model / Tool responsibilities are visible spatially.
- Tool Result U-turn is perceptible without reading raw events.
- Context Compare is accessible at the second model-decision boundary.
- Pi runtime JSONL can be imported for a basic replay.

## Next visual step

Replace the SVG hero districts in this order:

1. Context Works
2. Model Core
3. Arrival Harbor
4. Session Archive
5. Tool District

with Blender/GLB shells while keeping dynamic internals driven by Semantic Trace.
