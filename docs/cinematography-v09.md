# Pi City v0.9 — Cinematic Pass

V0.9 treats camera work as a first-class product system rather than a list of offsets.

## Shot contract

Each runtime beat can now control:

- camera offset from the active district
- asymmetric look target / composition shift
- field of view
- exposure
- bloom strength
- depth-of-field aperture and maximum blur
- concept-matte contribution
- foreground framing geometry

The runtime semantic event remains the source of truth. Cinematography can emphasize an event, but it cannot invent one.

## Hero scene language

### Arrival Harbor — scale before mechanism

- wider 40° FOV
- building pushed off center to preserve harbor negative space
- high matte contribution to restore city scale
- foreground crane / dock silhouette for parallax
- low DOF so the city remains readable
- larger camera breathing motion

Desired feeling: a small information object entering a much larger living system.

### Context Works — look through the machinery

- 27–28° FOV
- camera lowered and brought closer to the factory
- foreground pipe rack forms a partial frame
- stronger DOF isolates sorting / capsule machinery
- warm exposure lift emphasizes material transformation
- concept matte fades almost completely

Desired feeling: the viewer has crossed from watching the city into inspecting an internal production process.

### Model Core — compressed, heavy, consequential

- 27–29° FOV
- gate/portal foreground creates visual pressure
- lowest matte contribution
- restrained exposure and stronger bloom on decision lights
- shallowest focus among the hero scenes
- minimal camera breathing

Desired feeling: this is a decision chamber, not another logistics station.

### Tool Result U-turn — re-establish geography

- wider 35° frame
- moderate matte return
- more vertical elevation so Tool Works and Session direction remain legible
- DOF relaxes to keep the return path understandable

Desired feeling: the important idea is spatial — the result goes back into the Agent rather than toward the user.

## Watch vs Explore

Watch mode is allowed stronger DOF and composed foreground occlusion because it is a guided cinematic experience.

Explore mode relaxes DOF and framing so users can inspect districts without fighting the camera.

## Validation boundary

The current container still cannot initialize a usable EGL/WebGL renderer, so the cinematic parameters are syntax- and structure-validated but still require a normal desktop WebGL browser for final visual tuning.
