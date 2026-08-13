# Fable v0.12 construction log and agent handoff

**Date:** 2026-08-13  
**Branch:** `codex/fable-v012`  
**Base:** `main` at `08d99c1`  
**Release version:** `0.12.0-beta.1`  
**Implementation status:** complete and locally verified; not pushed or merged

## Executive summary

This iteration completed the Fable 5 priority sequence without crossing the product boundary into Intervene or Debug:

1. Made imported cinematic narration evidence-honest.
2. Replaced authored/static Context comparison with trace-derived snapshots and diffs.
3. Made Photo Mode trace switching explicit and reversible.
4. Added a renderer failure path that preserves access to the Evidence Explorer.
5. Added the first playable **Predict the Agent's next action** lesson on top of a pure deterministic Game Session reducer.
6. Added deterministic SHA-256 identity for imported and merged traces.
7. Froze the three static prototypes under `legacy/`, leaving the root Vite app as the only maintained runtime.

Semantic Trace remains immutable evidence. Player decisions live only in `src/game/`; no gameplay action modifies or fabricates trace events.

## Construction log

### 1. Browser baseline

- Changed browser acceptance to exercise the built Vite artifact through `vite preview`.
- Kept one real WebGL startup smoke while using deterministic controls for long UI journeys.
- This avoids waiting through the authored ~65-second lesson in every behavioral test.

Commit: `635ae9c test: run browser acceptance against built app`

### 2. Narrative honesty

- Removed evidence claims from authored `LessonFrame` data.
- Imported runs now use their mapped semantic event, `explainEvent`, payload values, and actual evidence level.
- Bundled fixtures may still use authored teaching narration, but that origin is explicit.
- Context Compare now renders real previous/current Context snapshots and added/retained items.
- Imported traces are never silently replaced to enter Photo Mode. An incompatible imported run requires confirmation and is restored on exit.

Commits:

- `0128c3d fix: derive cinematic narration from imported traces`
- `c40039c fix: render cinematic context compare from trace diff`
- `2c2d809 fix: make Photo Mode trace switches explicit and reversible`
- `6e2c0a6 chore: refresh evidence-honest experience export`

### 3. Renderer resilience

- Added `SceneErrorBoundary` outside the React Three Fiber Canvas.
- Added a deterministic component injection seam for browser testing; no production query-string failure backdoor was added.
- Failure UI exposes diagnostics, Retry, and Open Evidence Explorer.
- World and cinematic scene entry points use the boundary.

Commit: `6cab30b feat: fall back to evidence map when 3D rendering fails`

### 4. Predict foundation

- Centralized READ / EDIT / BASH / ANSWER classification in `src/analysis/action-classes.ts`.
- Unknown tools remain unclassified; they are never guessed as READ.
- Added pure checkpoint derivation in `src/game/checkpoints.ts`.
- Truncated or unclassifiable decisions are omitted with testable reasons.
- Added a pure reducer in `src/game/session.ts` with explicit actions:
  - `REACH_CHECKPOINT`
  - `PREDICT_NEXT_ACTION`
  - `CONTINUE_REPLAY`
  - `COMPLETE_RUN`
- Illegal transitions return the same state reference; decision records are immutable and deterministic.

Commits:

- `283d5f6 feat: derive honest Predict checkpoints from traces`
- `fd4db4e feat: add deterministic Game Session reducer`

### 5. Predict product journey

- Added opt-in **Play & Predict** without changing ordinary Watch behavior.
- Playback pauses only at trace-aligned outstanding checkpoints.
- The player sees conservative Context evidence, chooses an action class, reveals the observed action, and continues.
- Seek and timeline controls are disabled during Predict to protect reducer/checkpoint ordering.
- Completion produces a decision-based debrief after both replay completion and checkpoint consumption.
- Ordinary Watch does not expose Predict controls.

Commit: `c94f70b feat: make Predict the first playable lesson`

### 6. Deterministic trace identity

- Added a browser-safe synchronous SHA-256 implementation in `src/adapters/pi/hash.ts`.
- `importPiJsonl` hashes the exact input bytes and derives ids such as `pi-runtime-<12 hex>`.
- Changing only source bytes, including a trailing newline, changes `sourceHash` and id while preserving equivalent parsed events.
- Merged trace identity is derived from the two input identities.
- `createdAt` and missing timestamps are event-derived; `Date.now()` no longer exists under `src/adapters/pi/` or `src/semantic-trace/`.

Commit: `3a00a92 feat: derive deterministic trace identities`

### 7. One maintained runtime

- Moved `site-beta/`, `site-visual-beta/`, and `site-live-beta/` to `legacy/` with history-preserving renames.
- Removed the obsolete `check:live` script and `scripts/check_live_beta.py`.
- Marked historical deployment documents as historical.
- Updated package version to `0.12.0-beta.1`.
- The maintained deployment artifact remains `npm run build` → `dist/`.

Commit: `7d1fac1 chore: archive legacy sites for v0.12`

## Verification evidence

Fresh release verification completed on 2026-08-13:

```text
npm run check:all
  check:core                 passed
  unit tests                 44 / 44 passed
  typecheck                  passed
  production build           passed
  canonical frame geometry   passed

npm run check:browser
  Chromium E2E               13 / 13 passed
```

The browser suite covers:

- Landing and ordinary Watch
- pause/resume
- real Context Compare
- renderer failure fallback
- canonical frame deep links with real WebGL startup
- Photo Mode clean UI and exit
- completion and Explore
- compatible/incompatible imports
- imported-trace Photo Mode consent and restoration
- full two-checkpoint Predict journey and debrief
- confirmation that ordinary Watch never shows Predict controls

The production build currently reports a non-failing large-chunk warning: the main JavaScript bundle is about 1.27 MB before gzip / 347 KB gzip. This is a performance opportunity, not a v0.12 correctness blocker.

## Important repository state

- Current branch: `codex/fable-v012`
- All v0.12 implementation changes are committed.
- The only expected untracked file is `.github/workflows/deploy-pages.yml`.
- Do **not** commit, edit, or delete that workflow without a human hosting decision. Its previous static-site assumptions are outside this implementation.
- No push, pull request, merge, or deployment has been performed.

Quick orientation:

```bash
git status --short --branch
git log --oneline main..HEAD
npm run check:all
npm run check:browser
```

## Architectural invariants to preserve

- Semantic Trace is immutable evidence.
- Player choices belong to a separate deterministic Game Session.
- Keep Observed / Derived / Synthetic visible and accurate.
- Imported traces must never receive unsupported demo narration or fixtures.
- Unknown tools are not guessed into a supported Predict action.
- Rendering consumes semantic events and shared shot specs, never Pi RPC names.
- `legacy/` is frozen history, not another product surface.
- Do not expand into Intervene, Debug, branching gameplay, scoring, accounts, backend, ECS, multiplayer, or a general Agent platform without a new approved plan.

## Recommended next work

### Priority 1 — real runtime acceptance fixture

The largest remaining evidence gap is that Predict browser acceptance uses synthetic fixtures. Obtain a real Pi **runtime** JSONL, pass it through `npm run redact:fixture`, manually inspect the redacted output for private prose/identity/secrets, then add fixture-backed routing/checkpoint/browser coverage.

This work requires human-provided or human-approved source data. Never commit an unreviewed raw trace.

### Priority 2 — release/branch decision

After human review, choose whether to push this branch, open a pull request, merge locally, or keep it parked. Do not infer publication authority from this handoff.

### Priority 3 — bundle split, if performance becomes the goal

Profile the production chunk before changing architecture. Likely candidates are lazy-loading Three.js/world code for evidence-only routes and separating product surfaces. Preserve the renderer fallback and keep any optimization measurable.

### Explicit pause point

Do not start Intervene merely because Predict now exists. First validate Predict with real runtime evidence and user playthroughs, then write a new plan based on observed comprehension problems.

## Suggested next-agent startup sequence

1. Read `AGENTS.md`.
2. Read `docs/architecture-evolution.md`.
3. Read this handoff.
4. Read `docs/plans/2026-08-12-fable-v012-implementation.md` for completed acceptance details.
5. Inspect `git status`; preserve the untracked Pages workflow.
6. Run the verification command proportionate to the next task.

The next agent should treat the v0.12 plan as implemented history, not as a queue to rerun.
