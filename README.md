# Pi City

**A playable visualization of how AI agents actually run.**

Pi City turns agent runtime behavior into a living harbor city. Requests arrive as cargo, session history grows in an archive, context is assembled in a works facility, model decisions open dispatch gates, and tools operate as workshops.

## Current milestone

### v0.1 — Replay a Real Pi Run

The current build can import Pi-like **runtime JSONL** or **Session JSONL**, normalize it into a runtime-neutral Semantic Trace, replay that trace on a timeline, and inspect both the human explanation and the underlying Pi evidence.

The harbor rendering spikes proved the visual language. v0.1 is now focused on the product engine underneath that rendering.

## What works now

- Detect Pi runtime logs vs Session JSONL.
- Parse JSONL without aborting the whole import when individual lines fail.
- Normalize Pi lifecycle, tool, message, compaction, model, and thinking events.
- Reconstruct Session message/tool-result history from `id` / `parentId` entries.
- Correlate tool lifecycle with `toolCallId`.
- Distinguish **Observed / Derived / Synthetic** replay evidence.
- Build deterministic replay frames with cumulative runtime state.
- Import one Pi file, or select a runtime + Session pair for a combined replay.
- Scrub a generated timeline.
- Inspect semantic payload and raw Pi evidence.
- Switch between a compact world view, timeline, and evidence view.

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
                                                   ├─> World
                                                   ├─> Timeline
                                                   └─> Inspector
```

The procedural Three.js harbor now plugs into `Replay Frames` through `WorldCue`; it does not need to understand Pi RPC event names.

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal. The app starts with the bundled auth-bug runtime fixture. Use **Import Pi JSONL** to load another Session or runtime log. You can also select a runtime JSONL and its Session JSONL together; Pi City merges live lifecycle evidence with durable Session nodes.

Useful checks:

```bash
npm run check:core
npm test
npm run build
```

## Repository layout

```text
fixtures/auth-bug/       Runtime + Session fixtures
src/
  adapters/pi/            JSONL detection + Pi normalization
  semantic-trace/         Runtime-neutral schema, reducer, explanations
  world/                  Data-driven Three.js / R3F harbor runtime
  timeline/               Replay controls
  inspector/              Evidence explanation
  App.tsx                 v0.1 import/replay shell

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

### v0.1

- [x] Pi JSONL importer
- [x] Semantic Trace Schema v1
- [x] evidence-level model
- [x] deterministic replay frames
- [x] file import + timeline + inspector shell
- [x] reconnect the Three.js harbor to real replay frames
- [x] Session tree view
- [x] Context reconstruction/detail view
- [ ] real Pi sample validation beyond fixtures
- [x] combine runtime + Session evidence into one replay

### v0.2

- Branch / Session Tree exploration
- Context pressure + Compaction
- richer tool district

### v0.3

- live Pi SDK/RPC connection
- Replay My Agent
- first control/debug gameplay mechanics
