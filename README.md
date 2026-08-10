# Pi City

**Current milestone: v0.10 Canonical Frames Beta — three deterministic Photo Mode checkpoints for Arrival Harbor, Context Works, and Model Core, backed by actual GLB camera-projection checks.**

**A playable visualization of how AI agents actually run.**

Pi City turns agent runtime behavior into a living harbor city. Requests arrive as cargo, session history grows in an archive, context is assembled in a works facility, model decisions open dispatch gates, and tools operate as workshops.

## Current milestone

### v0.10 Beta — Canonical Frames

V0.10 turns the three most important visual beats into explicit review surfaces. The deployable beta now has a Photo Mode for **Arrival / Context / Model**, direct `?frame=` deep links, keyboard switching (`1/2/3`), and a clean-frame toggle (`H`). The camera presets were retuned against the actual GLB vertex bounds at 16:9 so the hero assets are intentionally framed before foreground occlusion, DOF, and motion are added.

See [`docs/canonical-frames-v010.md`](docs/canonical-frames-v010.md).

### v0.9 Beta — Cinematic Pass

V0.9 does not add Agent semantics. It turns cinematography into a first-class system: every hero beat can control composition shift, FOV, exposure, bloom, matte contribution, and depth-of-field. Arrival Harbor is staged as a wide scale-establishing shot, Context Works is framed through a realtime pipe rack so the user peers into the production line, and Model Core is compressed behind a gate-like foreground frame. Watch mode uses stronger cinematic focus separation; Explore mode remains easier to inspect.

See [`docs/cinematography-v09.md`](docs/cinematography-v09.md).

### v0.8 Beta — Art Pass

V0.8 is deliberately not a runtime-feature release. It narrows the remaining visual gap to the original industrial-harbor concept by improving how realtime geometry sits inside the world: GLB materials receive UV-free procedural weathering in the browser, glass is thinner and more transparent, the concept matte uses a feathered/hazed shader instead of a visible rectangular plane, distant practical lights and atmospheric curtains add depth, and low-rise district fabric fills the empty gaps between Hero Buildings.

The visual stack is now explicit:

```text
Concept Matte / skyline density
        +
Atmospheric depth / practical lights
        +
Realtime district fabric
        +
Weathered GLB Hero Buildings
        +
Semantic-Trace-driven machinery
```

The goal is still technical truth first: no visual layer is allowed to invent runtime behavior.

### v0.7 Beta — Experience Polish

V0.7 keeps the same runtime semantics and GLB harbor world but changes how the product feels to use. Entering the city now defaults to **Cinematic Mode**, which pulls most analysis chrome out of the way while the run is moving. Chapter boundaries get short cinematic title cards instead of relying only on the bottom timeline. After the run settles, **Explore Mode** reveals projected hotspots over the five real 3D districts, adds a gentle district observation camera, and exposes semantic metadata only when the user chooses to inspect a place.

The intended progression is now explicit:

```text
Enter the city → Watch the loop → notice the U-turn → notice Context change → Run settles → Explore the machinery
```

### v0.6 Beta — Live Visual Beta

The project now has two connected surfaces: the full React/Three.js Runtime Explorer and a deployable `site-live-beta/` experience. The live beta uses the v0.5 GLB Hero Buildings, the industrial-harbor concept matte, realtime water/port ecology, distinct information artifacts, duration-driven cinematic camera beats, Aha moments, Context Compare, runtime JSONL import, and a post-run Explore mode.

The bundled auth-bug journey is intentionally paced at about **65 seconds** at 1× so the Agent loop can be understood by watching rather than by reading a trace.

## What works now

- Detect Pi runtime logs vs Session JSONL.
- Parse JSONL without aborting the whole import when individual lines fail.
- Normalize Pi lifecycle, tool, message, compaction, model, and thinking events.
- Reconstruct Session message/tool-result history from `id` / `parentId` entries.
- Correlate tool lifecycle with `toolCallId`.
- Distinguish **Observed / Derived / Synthetic** replay evidence.
- Build deterministic replay frames with cumulative runtime state.
- Import a local file in the browser.
- Scrub a generated timeline.
- Inspect semantic payload and raw Pi evidence.
- Switch between synchronized World, Story, Session, Context, Compare, and Events views.
- Generate a Run Overview with duration, turns, tool distribution, and evidence quality.
- Collapse low-level events into a human-readable Story Timeline.
- Reconstruct model-call Context snapshots and compare newly added evidence.
- Explain both **what happened** and **why it matters** in the Inspector.
- Handle multi-tool turns without exposing every runtime event as a top-level story step.

## Product principles

- Watch first, explore second, control later.
- World view should feel like a real city before it feels like a diagram.
- Artifacts move as physical objects.
- Processes are expressed through machinery.
- State lives in buildings.
- Signals are temporary and diagnostic.
- `History != State != Context`.
- Rendering consumes semantic events, never Pi-specific raw event names.
- The Inspector must distinguish raw evidence from reconstruction.

## Architecture

The path from the current replay demo to a maintainable game-based learning system is documented in [`docs/architecture-evolution.md`](docs/architecture-evolution.md). **Milestone A — One Core** is in progress: Vite is the maintained product runtime and Pages deploy target; declarative shot/scenario data lives in `src/experience/`.

```text
Pi Runtime JSONL ---------┐
                          ├─> Pi Adapter ─> Semantic Trace ─> Replay Frames
Pi Session JSONL ---------┘                         │
                                                   ├─> Run Analyzer
                                                   ├─> Story Builder
                                                   ├─> Context Snapshots / Diff
                                                   ├─> Experience (shots / lessons)
                                                   ├─> World
                                                   └─> Inspector
```

The Three.js harbor consumes Semantic events + shared ShotSpecs; it does not need to understand Pi RPC event names.

## Run locally

```bash
npm ci
npm run dev
```

Then open the Vite URL shown in the terminal. The app starts with the bundled auth-bug runtime fixture. Use **Import Pi JSONL** to load another Session or runtime log.

Useful checks:

```bash
npm run check:core
npm test
npm run typecheck
npm run build
npm run setup:visual   # once
npm run check:frames
```

Requires Node.js 20+. Visual geometry checks also need Python 3 + `npm run setup:visual`.

## Repository layout

```text
fixtures/auth-bug/       Minimal tool-loop Runtime + Session fixture
fixtures/multi-tool/      Multi-tool inspect/change/verify fixture
fixtures/malformed/       Damaged JSONL for import reliability tests
src/
  adapters/pi/            JSONL detection + Pi normalization
  semantic-trace/         Runtime-neutral schema, reducer, explanations
  analysis/               Run summary, Story Timeline, Context snapshots/diff
  experience/             Shared shots, scenarios, canonical frames
  world/                  Three.js / R3F harbor runtime
  App.tsx                 Real Run Explorer shell
public/experience/        Exported library.json for visual checks

docs/
  architecture-evolution.md
  product-vision.md
  world-model.md
  semantic-trace.md
  pi-evidence-model.md
  roadmap.md
```

## Pi evidence model

Pi City uses three evidence levels:

- **Observed** — directly emitted or persisted by Pi.
- **Derived** — reconstructed from real Pi lifecycle evidence for explanation.
- **Synthetic** — added only where the source format cannot contain a live event, such as closing an imported Session replay.

See [`docs/pi-evidence-model.md`](docs/pi-evidence-model.md).


## Capturing a real Pi run

For a one-shot replay file, Pi's JSON event-stream mode can be redirected directly to disk:

```bash
pi --mode json "Your prompt" > pi-run.jsonl
```

Then import `pi-run.jsonl` into Pi City. Pi Session files can also be imported directly from Pi's session storage. Runtime JSONL gives the richer execution lifecycle; Session JSONL gives the durable history tree.

## Publishing this local repository to GitHub

This project already contains its local `.git` history. The simplest GUI path is GitHub Desktop:

1. Extract the downloaded `pi-city` folder.
2. GitHub Desktop → **File → Add Local Repository**.
3. Select the `pi-city` folder.
4. Click **Publish repository**.
5. Choose the repository name and visibility, then publish.

With GitHub CLI:

```bash
cd pi-city
gh auth login
gh repo create Guluhehe/pi-city --private --source=. --remote=origin --push
```

Do not upload only the files through the GitHub website if you want to keep the existing local commit history.

## Roadmap

### v0.1 — Replay engine

- [x] Pi JSONL importer
- [x] Semantic Trace Schema v1
- [x] evidence-level model
- [x] deterministic replay frames
- [x] runtime + Session merge
- [x] Three.js harbor driven by semantic replay

### v0.2 — Real Run Explorer

- [x] Run Analyzer
- [x] Story Timeline
- [x] model-call Context snapshots
- [x] Context Compare
- [x] what happened / why it matters Inspector
- [x] multi-tool story support

### v0.3 — Online Beta

- [x] world-first static deployment shell
- [x] Story Rail / Aha / Context Compare
- [x] build-free replay experience

### v0.4 — Asset-based Visual Prototype

- [x] independent GLB Hero Buildings
- [x] runtime/procedural internals separated from building shells
- [x] cinematic harbor lighting and continuous industrial fabric

### v0.5 — Visual Fidelity

- [x] denser Arrival Harbor / Context Works / Model Core assets
- [x] animated shader water and dusk sky
- [x] foreground depth and human-scale references
- [x] Context selected/rejected cargo machinery
- [x] event-specific camera framing
- [x] hybrid L0 matte + realtime 3D world
- [ ] browser experience review on a normal WebGL machine
- [ ] tune visual composition from real user playthroughs

### v0.6 — Live Visual Beta

- [x] ~65 second duration-driven auth journey
- [x] distinct request / context / work-order / result / answer artifacts
- [x] real Tool Result U-turn
- [x] Context cutaway + selected/rejected runtime machinery
- [x] first-run cinematic landing
- [x] post-run Explore mode
- [x] runtime JSONL import in the static visual build
- [x] GitHub Pages deployment workflow
- [ ] publish to a real URL and tune on a normal WebGL browser
- [ ] capture 2–3 real Pi runs and tune story/camera timing
- [ ] only then add Branch / Compaction exhibits

## Integrated Alpha

See `docs/integrated-alpha.md` for the world-first journey contract and the three required aha moments.

## Deployable builds

The maintained app is the Vite build (`npm run build` → `dist/`). GitHub stores source and runs CI; hosting stays provider-neutral — see [`docs/deployment.md`](docs/deployment.md). GitHub Pages remains an optional adapter — see [`docs/github-pages.md`](docs/github-pages.md).

Legacy static prototypes remain archived in-repo:

- `site-beta/` — zero-dependency v0.3 fallback
- `site-visual-beta/` — v0.5 asset-based visual build
- `site-live-beta/` — v0.10 cinematic Canonical Frames prototype (no longer the Pages source)

Preview the archived live beta:

```bash
python3 -m http.server 8080 -d site-live-beta
```

The next product gap to close is bringing Photo Mode / duration-driven Watch / spatial Explore from that prototype into the Vite shell while keeping the Semantic Trace pipeline as the only normalizer.
