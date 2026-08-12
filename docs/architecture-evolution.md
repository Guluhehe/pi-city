# Pi City Architecture Evolution

**Status:** Milestone A (One Core) accepted for the product shell — v0.11 trustworthy public beta
**Scope:** Evolve the current playable visualization into a maintainable, game-based explanation of how Pi Agents work.
**Primary constraint:** Preserve technical truth while adding player agency.

### Milestone A progress (current)

Done:

- Semantic Trace envelope now carries `schemaVersion` + `adapterVersion`
- Declarative experience modules live in `src/experience/` (shots, scenarios, compatibility, canonical frames, districts)
- Vite app is the maintained product runtime with Landing, Watch, Photo Mode, Explore, and Evidence Explorer
- Dependencies are pinned; `package-lock.json` is committed
- Malformed JSONL fixtures + import completeness reporting
- Deployment-neutral GitHub CI verifies core, tests, types, and `dist/` build
- Hosting stays provider-neutral; GitHub Pages is an optional adapter only
- Guided scenarios require explicit compatibility; unmatched traces keep Evidence Explorer truth
- Redacted real Session fixtures (`fixtures/real-read`, `fixtures/real-multi`)
- Browser acceptance smoke coverage documented in `docs/browser-acceptance-v011.md`

Still open after A:

- Optional public host adapter selection (Pages / Vercel / Netlify / CDN)
- Additional real **runtime** JSONL fixtures for guided cinematic lessons
- Optional: projected Explore hotspots over the canvas (district bar + copy already ship)

### External architecture review (binding guidance)

Fable 5 reviewed the v0.11 state and ranked the next work. Agents should treat this as active guidance:

- Review: [`docs/reviews/2026-08-10-fable5-architecture-review.md`](reviews/2026-08-10-fable5-architecture-review.md)
- Operating entrypoint for agents: [`AGENTS.md`](../AGENTS.md)
- Executable follow-up plan: [`docs/plans/2026-08-10-fable5-predict-and-honesty.md`](plans/2026-08-10-fable5-predict-and-honesty.md)

Core review conclusion to preserve: keep the evidence core strict; fix cinematic narrative pollution; implement **Predict the Agent's next action** before another art pass or larger world.

## Product thesis

Pi City is not primarily an observability dashboard. It is a game world in which a player can watch, understand, predict, and eventually intervene in a real Agent loop.

The experience should progress through this ladder:

```text
Watch -> Understand -> Predict -> Intervene -> Debug
```

The first demo already establishes the visual and conceptual language. Requests arrive as vessels, Session history grows in an archive, Context is assembled in a factory, Model calls happen in a decision center, and Tool work is executed in an external district.

The next architectural step is not a larger world. It is a single trustworthy runtime core plus a game layer that can add player decisions without rewriting or contaminating the underlying evidence.

## What already works

The following are foundational assets and should be preserved:

- `src/adapters/pi/` tolerantly parses Pi Runtime and Session JSONL.
- `src/semantic-trace/` separates Pi-specific evidence from runtime-neutral semantics.
- Evidence is explicitly labeled **Observed**, **Derived**, or **Synthetic**.
- `src/analysis/` projects traces into run summaries, Story steps, and Context snapshots.
- `src/world/cues.ts` separates semantic meaning from 3D presentation.
- The five districts provide a durable spatial model for Agent concepts.
- GLB shells and procedural runtime machinery are already separated.
- Canonical frames provide deterministic visual review surfaces.

The most important asset is the Semantic Trace. It is the stable bridge between real Pi behavior, teaching explanations, game mechanics, and any future renderer.

## Current architectural risks

### 1. Two product runtimes

The React/Vite application uses the complete pipeline:

```text
importPiJsonl
  -> SemanticTrace
  -> Analysis
  -> WorldCue
  -> React / Three.js
```

The deployed `site-live-beta/index.html` independently implements runtime normalization, story construction, Context comparison, playback, camera shots, and canonical frames.

This creates semantic and visual drift. The same Pi log can eventually tell a different story in development and production.

**Decision:** The Vite application is the only maintained product runtime. `npm run build` produces a host-neutral `dist/` artifact. GitHub stores source and runs CI; any static host may optionally serve `dist/`. Existing static sites remain historical prototypes, not parallel sources of truth.

### 2. Evidence and gameplay are not separate domains

Today a Semantic Event directly drives explanation, timing, camera, UI, and animation. This is sufficient for a guided replay, but it cannot safely represent player decisions.

Pi facts, reconstructed teaching semantics, player choices, and game feedback must remain distinguishable.

**Decision:** Semantic Trace stays immutable. Gameplay is a separate deterministic state machine that reads the trace but never edits it.

### 3. The trace schema is not versioned

`SemanticEvent.payload` is currently a general record and `SemanticTrace` has no schema version. As real log formats evolve, old fixtures and replays will become ambiguous.

**Decision:** Add explicit trace and adapter versions before building a library of real runs.

### 4. The visual build can fail without a useful fallback

The current experience assumes WebGL, GLB loading, post-processing, and CDN module loading succeed. A rendering or asset failure can leave the teaching experience unusable.

**Decision:** Treat the Story/Inspector projection as a functional fallback, not merely analysis chrome.

## Target architecture

```text
Pi Runtime JSONL -----+
                      |
Pi Session JSONL -----+--> Pi Adapter
                              |
                              v
                    +--------------------+
                    | Semantic Trace vN  |
                    | immutable evidence |
                    +---------+----------+
                              |
               +--------------+----------------+
               |              |                |
               v              v                v
         Run Analyzer    Story/Context     Lesson Compiler
                                                |
Player Action ----------------------------------+
                                                v
                                      +-------------------+
                                      | Game Session      |
                                      | pure reducer      |
                                      +---------+---------+
                                                |
                         +----------------------+----------------+
                         |                                       |
                         v                                       v
                Experience Director                       Evidence Explorer
             shots / cues / pacing / Aha             raw / derived / compare
                         |
                         v
                  React + Three.js
```

## Layer responsibilities

### 1. Evidence adapters

Responsibilities:

- Detect supported input formats.
- Parse partial or malformed JSONL without silently hiding damage.
- Normalize Pi-specific events.
- Preserve raw evidence and correlation identifiers.
- Report completeness and parsing warnings.

Must not:

- Create camera instructions.
- Invent game objectives.
- Classify player success.
- Present derived Context as provider-exact input.

### 2. Semantic Trace Core

The trace is an append-only description of what was observed or conservatively reconstructed.

Recommended envelope:

```ts
interface SemanticTrace {
  schemaVersion: 1;
  adapterVersion: string;
  id: string;
  source: EvidenceSource;
  sourceHash?: string;
  createdAt: number;
  events: SemanticEvent[];
  warnings: TraceWarning[];
  metadata: TraceMetadata;
}
```

Important events should gradually receive discriminated payload types instead of relying on `Record<string, unknown>` everywhere.

### 3. Interpretation layer

This layer answers questions about a trace without changing it:

- What happened during the run?
- What evidence was available before a model decision?
- Which events belong to one human-readable Story step?
- Why does an event matter?

Interpretations must retain their evidence level and reconstruction limitations.

### 4. Game Session

The Game Session represents the player's relationship with the replay.

```ts
type GamePhase = 'watch' | 'predict' | 'intervene' | 'debrief';

type PlayerAction =
  | { type: 'PREDICT_NEXT_ACTION'; choice: 'read' | 'edit' | 'bash' | 'answer' }
  | { type: 'SELECT_CONTEXT_ITEM'; itemId: string }
  | { type: 'ROUTE_TOOL_RESULT'; destination: 'session' | 'context' | 'user' };

interface GameSessionState {
  lessonId: string;
  phase: GamePhase;
  checkpoint: number;
  decisions: PlayerDecision[];
  feedback: GameFeedback[];
}
```

The reducer should be pure and deterministic. Replaying the same trace and player actions must always produce the same result.

Do not introduce an ECS or general-purpose game engine at this stage. Pi City's current essential complexity is teaching Agent behavior, not simulating thousands of independent entities.

### 5. Experience Director

The Experience Director converts trace state plus game state into presentation instructions:

- active district
- artifact and route
- camera shot
- pacing and duration
- chapter transition
- Aha/debrief content
- inspector visibility

Shot specifications and lesson definitions should be declarative data rather than duplicated switch statements in multiple renderers.

### 6. Renderer

Three.js renders the world but does not decide Agent meaning or player correctness.

Rendering should support quality tiers:

```text
High      GLB + shadows + bloom + depth of field
Medium    GLB + shadows + bloom
Low       GLB + basic lighting
Fallback  Story timeline + world map
```

## First playable mechanic

The recommended first game mechanic is **Predict the Agent's next action**.

```text
Replay reaches MODEL_REQUEST_STARTED
             |
             v
        Pause the run
             |
             v
Player chooses READ / EDIT / BASH / ANSWER
             |
             v
Reveal the observed Tool Call or Answer
             |
             v
Explain the evidence that made it likely
             |
             v
       Continue replay
```

This is the smallest mechanic that turns watching into playing while directly testing the intended mental model. It reuses the current replay, Story, Context, camera, and Inspector systems.

The second mechanic should be a **Context selection challenge**: the player chooses evidence under a capacity limit, then compares their Context with the run's reconstructed model-visible view.

## Delivery architecture

### One maintained application

- Build the Vite application for production.
- Configure relative asset paths suitable for GitHub Pages.
- Deploy the generated directory through GitHub Actions.
- Stop adding product logic to `site-live-beta/index.html`.
- Preserve `site-beta/`, `site-visual-beta/`, and `site-live-beta/` as versioned prototypes or archive them under a clearly named legacy directory.

### Reproducible dependencies

- Replace `latest` dependency ranges with explicit compatible versions.
- Commit a lockfile.
- Document the supported Node and Python versions.
- Make visual validation dependencies installable through a documented command.

## Reliability and privacy boundaries

### Import reliability

Every import should report:

- valid record count
- invalid line count
- detected source kind
- unsupported event count
- whether replay closure is Observed, Derived, or Synthetic

Malformed input must not silently produce a confident teaching narrative.

### Sensitive evidence

Real traces may contain file content, commands, paths, tokens, environment values, or private user text.

Before adding upload, sharing, analytics, or hosted storage:

- keep imports local by default
- add a redaction/export boundary
- clearly state when data leaves the browser
- never send raw `sourceEvent` data implicitly
- separate shareable replay data from full Inspector evidence

### Asset and renderer failure

GLB, texture, CDN, WebGL, and post-processing failures should produce a visible fallback with a useful diagnostic. The player should still be able to follow the Story and inspect the evidence.

## Test architecture

```text
JSONL Corpus
  |-- malformed and partial logs
  |-- Runtime-only logs
  |-- Session-only logs
  |-- merged Runtime + Session
  |-- multi-tool turns
  |-- compaction
  `-- branching
          |
          v
Adapter golden tests
          |
          v
Semantic Trace invariants
          |
          v
Story / Context projections
          |
          v
Game reducer tests
          |
          v
Browser journey tests
          |
          v
Canonical visual tests
```

Required invariants include:

- Tool lifecycle correlation remains stable by `toolCallId`.
- Derived events always retain their evidence note.
- Session import never claims provider-exact Context.
- The Game Session never mutates the source trace.
- The same trace and player actions produce the same game outcome.
- Production and development consume the same normalized trace.

Visual validation should cover the three canonical shots, loading/fallback states, Context cutaway, Tool Result U-turn, and at least one low-quality rendering mode.

## Evolution milestones

### Milestone A — One Core

Goal: eliminate product-runtime drift before adding new mechanics.

- Make the Vite application the deployed application.
- Move shot, timing, scenario, and lesson data into shared modules.
- Add `schemaVersion` and `adapterVersion`.
- Pin dependencies and commit a lockfile.
- Add malformed and real-run fixtures.

Acceptance criteria:

- One normalizer powers development and production.
- One shot definition powers Watch and Photo modes.
- `npm test`, typecheck, build, live checks, and canonical checks run from a documented clean setup.

### Milestone B — First Playable Lesson

Goal: prove that player decisions improve understanding.

- Add the Game Session reducer.
- Pause before selected model decisions.
- Let the player predict the next action.
- Reveal and explain the observed action.
- Add a short debrief based on decisions, not generic points.

Acceptance criteria:

- The original uninterrupted Watch mode remains available.
- The lesson is deterministic and unit tested.
- A first-time player can explain Model decision versus Tool execution after completing it.

### Milestone C — Context Challenge

Goal: teach `History != Context` through interaction.

- Add a Context capacity constraint.
- Let the player select and reject evidence.
- Compare player Context with reconstructed Context.
- Explain how newly returned evidence can change the next decision.

### Milestone D — Agent Time Machine

Goal: make branching and forgetting debuggable as world mechanics.

- Branch and Active Leaf movement.
- Context pressure and Compaction.
- Before/after Context comparison.
- "Why did the Agent forget?" challenges.

## Explicit non-goals

The following should not be introduced before the first playable lesson is validated:

- multiplayer
- user accounts or cloud saves
- a general Agent platform
- plugin marketplace
- open-world simulation
- a custom backend
- a complex ECS
- premature abstraction over every Agent runtime

These may become valid later, but none is required to prove that game-based interaction can teach Pi Agent principles.

## Architecture success criteria

The architecture is succeeding when:

1. A new Pi event format is handled in the adapter without editing the renderer.
2. A new lesson can be created without changing trace normalization.
3. Development and production tell the same story for the same trace.
4. Player choices are replayable and testable without a browser.
5. A failed 3D renderer still leaves a usable teaching experience.
6. The Inspector can always explain which claims are observed and which are reconstructed.

## Immediate recommendation

Do not add the next district or advanced mechanic first.

Start with **Milestone A — One Core**, then implement one narrow **Predict the Agent's next action** lesson. This preserves the strongest existing asset—the Semantic Trace—while turning Pi City from a guided visualization into a real game-based learning system.
