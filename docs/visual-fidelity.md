# Pi City v0.5 — Visual Fidelity

v0.5 is a fidelity pass, not a runtime-feature release.

## Visual target

The target is a dense miniature industrial harbor at warm dusk: layered docks, rail, cranes, factories, practical lights, cool water, atmospheric haze and enough tiny human/vehicle scale to make the city feel inhabited.

The world is built with selective fidelity rather than brute-force realtime geometry:

- **L0 Matte World** — a distant harbor concept matte supplies skyline density and miniature-city atmosphere in wide shots.
- **L1 Ambient City** — warehouses, tanks, pipe racks, rail, boats, smoke, dock lights and workers establish continuous urban fabric.
- **L2 Runtime Infrastructure** — transport routes, canals, bridges and runtime artifacts remain dynamic.
- **L3 Hero Buildings** — Arrival Harbor, Context Works and Model Core use independent GLB assets with much denser architectural structure.
- **L4 Runtime Internals** — context sorting, selected/rejected cargo, compression press, decision wheel and gates stay procedural so Semantic Trace can drive them.

The matte must never replace the interactive runtime. It fades in wide establishing shots and recedes when the camera enters a Hero Building.

## Hero-building pass

### Arrival Harbor

- 147 independent modeled parts
- gabled customs/archive hall
- arched facade and roof monitor
- lighthouse + beacon
- primary truss crane + secondary service crane
- elevated walkways, stairs, railings, dock lamps and worker scale

### Context Works

- 147 independent modeled parts
- glass-framed factory hall
- multiple roof bays and clerestory monitor
- intake and reject annexes
- sorters, conveyor, press, buffer tanks, pipes and service catwalks
- visible runtime cargo split into selected vs rejected streams

### Model Core

- 129 independent modeled parts
- circular hall and dome
- gate tunnels and monumental lintels
- decision wheel
- radial buttresses, cooling annexes and maintenance ring
- crown lantern and practical lights

## Cinematic environment

v0.5 adds:

- PBR roughness/metalness materials for masonry, timber, weathered metals, glass and practical lights
- emissive dusk windows in the three Hero Buildings

- shader-based warm dusk sky
- animated water with wave displacement and warm shimmer
- practical hero lights instead of network-neon lines
- event-specific camera framing and FOV
- foreground crane/ship silhouettes for depth
- worker silhouettes for scale
- concept-matte fade between world overview and close inspection

## Runtime rule

Visual richness cannot weaken technical truth.

The physical city still reacts to Semantic Trace. Story/Inspector text remains secondary to the world. The core v0.2 aha moments stay intact:

1. Agent execution is a loop, not a single model call.
2. Tool Result is evidence that returns to the Agent, not the final answer.
3. Session history and model-visible Context are different things.

## Preview discipline

The geometry preview converts the Y-up glTF world into matplotlib's Z-up display coordinates before drawing. It is only an asset-debug view; browser lighting, matte depth, fog, water and runtime motion are deliberately not judged from that image.
