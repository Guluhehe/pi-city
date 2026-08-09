# Pi City v0.2 Integrated Alpha

The Integrated Alpha is the first world-first product slice. It combines the Living Harbor prototype with the Real Run Explorer instead of presenting them as separate demos.

## Experience contract

1. The harbor is the primary canvas during a run.
2. Story is a chapter rail, not the main UI.
3. Inspector is a lightweight explanation layer over the world.
4. Context Compare interrupts the run only at a meaningful context change.
5. Session, Context, Story, and raw Events become exploration modes after or outside the guided journey.
6. A tool result returning to Session must be visually legible before the explanatory copy appears.

## Journey

`RUN ARRIVES → SESSION → CONTEXT → MODEL → TOOL → RESULT RETURNS → CONTEXT CHANGES → MODEL → COMPLETE`

Three required aha moments:

- History is not Context.
- Tool Result is evidence, not the answer.
- A later model call can change because its visible evidence changed.

## Architecture

`Pi evidence → Pi Adapter → Semantic Trace → Analysis Layer → WorldCue + explanation overlays`

The Three.js world never consumes raw Pi event names directly.

## Current visual strategy

The world remains procedural/low-poly for iteration speed. Hero buildings can later move to GLB assets while internal runtime machinery stays data-driven.
