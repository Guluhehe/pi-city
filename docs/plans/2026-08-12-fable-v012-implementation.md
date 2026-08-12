# Fable v0.12 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Make Pi City's cinematic shell evidence-honest, add the first deterministic Predict lesson, and close the renderer/trace reliability gaps without changing the immutable Semantic Trace boundary.

**Architecture:** Semantic Trace remains immutable evidence. Imported runs use event-derived explanations and evidence labels; bundled demos may additionally use explicitly marked authored narration. Predict reads checkpoints derived from trace events and stores player choices in a pure reducer that has no React, DOM, clock, or renderer dependency.

**Tech stack:** React 19, TypeScript, Vite, React Three Fiber, Node test runner, Playwright.

**Supersedes tactics in:** `docs/plans/2026-08-10-fable5-predict-and-honesty.md` where this document explicitly differs.

---

## Binding implementation corrections

1. Imported traces must not merely receive a `DEMO NARRATION` chip while continuing to show false filenames, titles, gates, or decisions. For imported traces, the shell uses `explainEvent(mappedEvent)` plus values derived from the mapped event. Auth/multi lesson copy remains available only for bundled fixtures.
2. Unknown tool names are not classified as `read`. They are unclassified, and checkpoints whose actual next action is not one of `read | edit | bash | answer` are omitted with an explicit derivation reason available to tests.
3. `COMPLETE_RUN` is a first-class reducer action. React dispatches it from the playback transition into completion, never during render. Debrief requires both completed replay and consumed checkpoints.
4. Browser tests must not wait through the authored 65-second timeline. UI journey tests use a deterministic playback control; real WebGL startup remains a separate smoke test.
5. Photo Mode preserves the imported trace and restores it on exit after an explicit, user-approved switch to bundled demo frames.
6. `.github/workflows/deploy-pages.yml` remains outside this implementation until hosting is explicitly selected.

## Task 0 — Stabilize the browser baseline

**Files:**
- Modify: `tests/e2e/cinematic.spec.ts`
- Modify only if evidence requires it: `playwright.config.ts`, `src/world/PiCityScene.tsx`

1. Reproduce the existing Chromium/session-close failure with the smallest cinematic test and retain the trace.
2. Inspect process, console, GPU/WebGL, and timing evidence; state one root-cause hypothesis.
3. Add or tighten a failing regression test that isolates that cause.
4. Apply one minimal fix and rerun the isolated test until green.
5. Run the full pre-existing browser suite before changing product behavior.

## Task 1 — Event-derived cinematic presentation

**Files:**
- Modify: `src/experience/scenarios.ts`
- Modify: `src/product/CinematicCity.tsx`
- Modify: `src/styles.css`
- Test: `tests/experience.test.ts`
- Test: `tests/e2e/import.spec.ts`

1. Add failing unit tests proving lesson frames no longer own evidence claims and demo-specific frames/titles are identifiable.
2. Add a failing import e2e proving a structurally compatible imported run does not present bundled filenames or authored MODEL DECISION claims.
3. Remove `LessonFrame.evidence`; derive the visible evidence line from the mapped semantic event.
4. Track `bundled-demo | imported` origin. Use authored copy only for bundled fixtures; imported traces use `explainEvent`, event payload, and run analysis.
5. Verify unit, type, and isolated import browser tests.

## Task 2 — Real Context Compare

**Files:**
- Modify: `src/product/CinematicCity.tsx`
- Modify: `src/experience/scenarios.ts`
- Modify: `src/styles.css`
- Test: `tests/analysis.test.ts`
- Test: `tests/e2e/cinematic.spec.ts`

1. Add failing tests requiring auth and multi Context diffs to contain real tool-call/result items.
2. Add a failing browser assertion that cinematic Compare renders event-derived item labels and no static `scenario.before/after` copy.
3. Remove `LessonScenario.before/after`; render previous/current snapshots and added/retained semantics.
4. Verify isolated tests and the unchanged Watch path.

## Task 3 — Explicit, reversible Photo Mode switch

**Files:**
- Modify: `src/product/CinematicCity.tsx`
- Modify: `src/styles.css`
- Test: `tests/e2e/import.spec.ts`

1. Add a failing e2e: import multi, request Photo Mode, decline, and verify the trace/title remains.
2. Add a failing e2e: approve switch, enter bundled photo frames, exit, and verify the imported run is restored.
3. Implement one shared confirmation path for buttons and keyboard shortcuts; remove all unconfirmed demo replacement paths.
4. Verify canonical deep links remain direct for the initial bundled demo.

## Task 4 — Scene failure fallback

**Files:**
- Create: `src/product/SceneErrorBoundary.tsx`
- Modify: `src/product/CinematicCity.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `tests/e2e/cinematic.spec.ts`

1. Add a failing deterministic browser test for a scene error supplied through an explicit scene component seam, not a production URL backdoor.
2. Implement a class ErrorBoundary outside each `PiCityScene` Canvas with Retry and, in cinematic mode, Open Evidence Explorer.
3. Verify the fallback remains usable and the non-error WebGL smoke still renders.

## Task 5 — Shared action classification and checkpoints

**Files:**
- Create: `src/analysis/action-classes.ts`
- Create: `src/game/checkpoints.ts`
- Modify: `src/analysis/story.ts`
- Test: `tests/game.test.ts`
- Test: `tests/analysis.test.ts`

1. Write table-driven failing tests for known read/edit/bash tools and `undefined` for unknown tools.
2. Implement the classifier and refactor Story to use the same sets without changing Story output.
3. Write failing fixture-backed checkpoint tests for auth and multi, truncation, unknown tools, event-index alignment, and determinism.
4. Implement a pure trace scan that chooses the first classifiable tool action before the next model request, or answer only when no tool call exists.
5. Verify no mutation and all analysis/game tests.

## Task 6 — Pure Game Session reducer

**Files:**
- Create: `src/game/session.ts`
- Create: `src/game/index.ts`
- Test: `tests/game.test.ts`

1. Write failing transition-table tests for `REACH_CHECKPOINT`, `PREDICT_NEXT_ACTION`, `CONTINUE_REPLAY`, and `COMPLETE_RUN`.
2. Test illegal transitions return the same state reference, decisions are immutable, wrong answers still progress, and completion ordering is deterministic.
3. Implement the smallest closed reducer and debrief projection.
4. Verify `src/game/` imports no React, DOM, Three, clock, or random APIs.

## Task 7 — Predict UI and deterministic browser journey

**Files:**
- Modify: `src/product/CinematicCity.tsx`
- Modify: `src/styles.css`
- Create: `tests/e2e/predict.spec.ts`
- Test: `tests/game.test.ts`

1. Add failing pure tests for mapping lesson frames to outstanding checkpoints.
2. Add a failing browser journey using deterministic playback advancement: enter Predict, see evidence, choose, reveal, continue, finish, and inspect decision-based debrief.
3. Wire opt-in Predict without changing default Watch. Disable manual seek/rail while Predict is active and explain why.
4. Render evidence from Context snapshots/diffs; never synthesize filenames or provider-exact Context.
5. Verify default Watch never shows Predict overlays.

## Task 8 — Deterministic trace identity

**Files:**
- Create: `src/adapters/pi/hash.ts`
- Modify: `src/adapters/pi/import.ts`
- Modify: `src/adapters/pi/normalize.ts`
- Modify: `src/adapters/pi/redact.ts`
- Modify: `src/semantic-trace/merge.ts`
- Test: `tests/pi-adapter.test.ts`

1. Add failing tests for stable `sourceHash`, id, createdAt, full repeated imports, and repeated merges.
2. Implement SHA-256 at the import boundary and derive ids from source hashes.
3. Replace adapter/merge wall-clock fallbacks with deterministic event-derived values; make missing-timestamp ordering an explicit constant.
4. Verify no `Date.now()` remains under adapters or semantic-trace.

## Task 9 — Legacy archive and release verification

**Files:**
- Move: `site-beta/`, `site-visual-beta/`, `site-live-beta/` to `legacy/`
- Create: `legacy/README.md`
- Modify: `package.json`
- Modify: relevant README/docs references

1. Archive the three static prototypes and remove `check:live` plus its obsolete checker.
2. Keep historical docs clearly labeled rather than rewriting history.
3. Run `npm run check:all` and `npm run check:browser` from a clean build.
4. Review `git diff --check`, search for narrative/static-compare/clock regressions, and update v0.12 status docs.

## Explicitly not in scope

- Hosting selection or committing the Pages workflow
- Context selection challenge, Intervene, Debug, branching gameplay, or scoring
- General Agent/runtime abstraction, ECS, backend, accounts, multiplayer, or cloud storage
- Schema v2 discriminated-payload migration
- A new visual art pass or district
