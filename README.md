# Pi City

**Current milestone: v0.2 Integrated Alpha — a world-first guided replay that combines the Living Harbor with Real Run Explorer.**

**A playable visualization of how AI agents actually run.**

Pi City turns agent runtime behavior into a living harbor city. Requests arrive as cargo, session history grows in an archive, context is assembled in a works facility, model decisions open dispatch gates, and tools operate as workshops.

## Current milestone

### v0.2 Alpha — Real Run Explorer

The current build can import Pi-like **runtime JSONL** or **Session JSONL**, normalize it into a runtime-neutral Semantic Trace, and then explain the run at three levels: **Run Overview → Story Timeline → Semantic Events / Raw Evidence**. It also reconstructs per-model-call Context snapshots so users can compare what changed between decisions.

The harbor is now one synchronized view of the same replay engine rather than a separate scripted demo.

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

```text
Pi Runtime JSONL ---------┐
                          ├─> Pi Adapter ─> Semantic Trace ─> Replay Frames
Pi Session JSONL ---------┘                         │
                                                   ├─> Run Analyzer
                                                   ├─> Story Builder
                                                   ├─> Context Snapshots / Diff
                                                   ├─> World
                                                   └─> Inspector
```

The future Three.js harbor plugs into `Replay Frames`; it should not need to understand Pi RPC event names.

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal. The app starts with the bundled auth-bug runtime fixture. Use **Import Pi JSONL** to load another Session or runtime log.

Useful checks:

```bash
npm run check:core
npm test
npm run build
```

## Repository layout

```text
fixtures/auth-bug/       Minimal tool-loop Runtime + Session fixture
fixtures/multi-tool/      Multi-tool inspect/change/verify fixture
src/
  adapters/pi/            JSONL detection + Pi normalization
  semantic-trace/         Runtime-neutral schema, reducer, explanations
  analysis/               Run summary, Story Timeline, Context snapshots/diff
  world/                  Three.js / R3F harbor runtime (next integration)
  timeline/               Replay controls
  inspector/              Evidence explanation
  App.tsx                 v0.2 Real Run Explorer shell

docs/
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

### Next — Live Visual Beta

- publish `site-visual-beta/` to a real URL
- validate several real Pi runs in the high-fidelity world
- polish loading, first-run onboarding and Explore transition
- only then add Branch / Compaction exhibits

## Integrated Alpha

See `docs/integrated-alpha.md` for the world-first journey contract and the three required aha moments.

## Deployable builds

`site-beta/` is the zero-dependency v0.3 fallback.

`site-visual-beta/` is the current asset-based visual build. It loads the GLB Hero Buildings, the v0.5 concept matte, runtime overlays and the guided replay directly in the browser.

Preview on any machine with normal web access:

```bash
python3 -m http.server 8080 -d site-visual-beta
```

Then open `http://localhost:8080`.

See `docs/visual-beta.md` and `docs/visual-fidelity.md`.
