# Roadmap

## v0.0.x — Technical / visual spikes

Validated the industrial harbor, physical logistics, guided camera, cutaway buildings, Session-vs-Context metaphor, Model decision gates, and living-city visual language.

## v0.1 — Replay a Real Pi Run

Implemented the Pi runtime/session importer, tolerant JSONL parsing, Semantic Trace Schema, evidence levels, deterministic replay frames, tool correlation, runtime + Session merge, Session Tree, Context reconstruction, Inspector, and a Three.js harbor driven by semantic World Cues.

## v0.2 — Real Run Explorer

### Implemented in alpha

- Run Analyzer: title, status, duration, turns, model/tool counts, tool distribution, evidence quality
- Story Builder: compresses low-level events into request / inspect / change / execute / answer / completion steps
- Context Snapshots: reconstructs evidence available at each Model Call
- Context Compare: highlights added, retained, and removed evidence between model decisions
- Inspector explanations: separate **what happened** from **why it matters**
- Multi-tool fixture that covers read + grep + edit + bash
- synchronized navigation between Story/Context/Compare and the raw replay index

### Next validation

- import several real Pi runtime logs of materially different shapes
- improve segmentation of long turns and multiple user follow-ups
- extract usage/token metadata when present
- distinguish validation commands from generic bash execution
- make Story steps drive higher-level camera sequences in the harbor

## v0.3 — Agent Time Machine

- branch-aware replay
- active leaf movement
- Context pressure
- Compaction before/after
- "why did the Agent forget?" explanations

## v0.4 — Take Control

- predict next action
- replay reality
- intervene in context/tool decisions
- debug challenges rather than XP/badge gamification


## v0.5 — Visual Fidelity

- hybrid concept matte + realtime GLB world
- denser Arrival / Context / Model hero assets
- shader water and dusk lighting
- visible Context selection / rejection machinery

## v0.6 — Live Visual Beta

- 15-beat auth journey (~65 seconds at 1×)
- duration-driven camera grammar rather than fixed event intervals
- distinct request vessel / session entry / context capsule / work-order / tool-result / answer artifacts
- explicit Tool Result U-turn
- automatic Context Compare at the second Context
- post-run district Explore mode
- procedural WebAudio ambience and event cues
- runtime JSONL import in the deployable static build

## v0.7 — Experience Beta

- low-chrome cinematic Watch mode
- chapter bumpers
- spatial Explore hotspots projected over real 3D districts
- gentle district observation camera

## v0.8 — Art Pass

- UV-free shader weathering for GLB masonry / timber / metal
- thinner transparent industrial glass
- feathered + horizon-hazed concept matte
- distant warm practical-light field
- atmospheric depth curtains
- low-rise district infill between Hero Buildings
- animated Arrival Harbor lighthouse sweep
- no new Agent semantics

## v0.9 — Cinematic Pass — current

- [x] shot specification layer for composition / FOV / exposure / bloom / matte / DOF
- [x] Bokeh depth of field in full and static visual builds
- [x] foreground framing for Arrival / Context / Model hero scenes
- [x] different camera-breathing amplitude for wide vs close shots
- [x] preserve the existing ~60 second runtime journey and semantics
- [ ] tune focus / aperture from a normal desktop WebGL render
- [ ] capture canonical screenshots for Arrival / Context / Model

### Validation gate before v0.10

- obtain a real public URL or normal desktop WebGL preview
- tune matte/realtime blend from actual rendered screenshots
- tune material-weathering strength per browser/GPU
- test at least two real Pi runtime logs before adding Branch / Compaction
