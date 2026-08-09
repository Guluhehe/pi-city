# Pi City v0.10 — Canonical Frames

V0.10 narrows cinematic validation to three canonical hero frames. The goal is simple: each frame should work as a still image before motion, UI, or explanation rescues it.

## Frame 01 — Arrival Harbor

**Meaning:** scale before mechanism.

- Source beat: `REQUEST_ARRIVED`
- Hero asset should occupy roughly one quarter of the horizontal frame.
- Arrival sits left-of-center so the harbor and distant city remain legible.
- Matte contribution is intentionally highest here.
- DOF stays restrained; world scale matters more than isolation.

Expected mental read: *a small request is entering a much larger living system.*

## Frame 02 — Context Works

**Meaning:** evidence becomes a visible production process.

- Source beat: second `CONTEXT_COMPILED`, after the tool result has returned.
- Camera is close enough for selection / reject / capsule machinery to read.
- The complete GLB shell must remain inside the 16:9 frame before foreground pipe-rack occlusion is added.
- Matte contribution is nearly absent.
- Stronger focus separation is allowed because this is an inspection shot.

Expected mental read: *new evidence is physically changing what the next model call can see.*

## Frame 03 — Model Core

**Meaning:** decision under changed evidence.

- Source beat: second `MODEL_REQUEST_STARTED`.
- The tall Core nearly fills the vertical frame without cropping.
- The building is slightly right-weighted behind a foreground gate frame.
- Exposure is restrained while decision lights receive stronger bloom.
- The frame must feel heavier and more compressed than Context Works.

Expected mental read: *the same model can choose differently because its evidence changed.*

## Photo Mode

The static live beta now exposes these frames directly:

- click **Frames** from the top bar or **View hero frames** on the landing page
- `1` — Arrival
- `2` — Context
- `3` — Model
- `H` — hide/show Photo Mode overlays
- `Esc` — return to the landing experience

Deep links are also supported:

```text
?frame=arrival
?frame=context
?frame=model
```

## Deterministic composition check

`scripts/check_canonical_frames.py` loads the actual GLB geometry and projects its vertices through the v0.10 cameras at 16:9.

The check is not a substitute for a real WebGL screenshot. It guards against a more basic failure: tuning a cinematic camera that accidentally crops or badly centers the actual Hero Building.

Current target projection:

```text
Arrival  · small, left-weighted, fully in frame
Context  · close, roughly 2/3 of frame width and height, fully in frame
Model    · nearly full vertical height, fully in frame
```

Runtime semantics remain unchanged. Photo Mode only exposes deterministic visual checkpoints.
