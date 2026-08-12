# Pi City v0.11 Trustworthy Public Beta Implementation Plan

> **For Cursor Agent:** Execute this plan task-by-task in the existing `pi-city` repository. Preserve all pre-existing working-tree changes, do not commit `.github/workflows/deploy-pages.yml`, and stop at every explicit user checkpoint.

**Goal:** Make imported Pi runs technically trustworthy, add deployment-neutral GitHub CI, validate the product in a real browser, and close Milestone A without binding the project to GitHub Pages.

**Architecture:** GitHub is the source-control and CI home, while `npm run build` produces a host-neutral `dist/` artifact. Guided cinematic playback is only enabled when a trace is compatible with a declared lesson scenario; unmatched traces open in the Evidence Explorer instead of silently receiving auth-specific narration. Real trace fixtures must pass through an explicit redaction boundary before entering the repository.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Three.js / React Three Fiber, Node test runner through `tsx`, GitHub Actions, optional Playwright browser smoke tests.

---

## Working-tree safety and constraints

Before making changes, run:

```bash
git status --short --branch
git diff -- README.md docs/github-pages.md site-live-beta/README.md
find .github -maxdepth 3 -type f -print
```

Expected current state:

```text
## main...origin/main
 M README.md
 M docs/github-pages.md
 M site-live-beta/README.md
?? .github/
?? docs/plans/
```

Rules for this iteration:

- Preserve the user's existing documentation edits.
- Treat `.github/workflows/deploy-pages.yml` as an uncommitted Pages-specific draft.
- Do not delete, overwrite, stage, or commit that Pages workflow unless the user separately chooses GitHub Pages.
- Do not send real traces, raw prompts, paths, tokens, environment variables, or file contents to GitHub.
- Use small commits. Before every commit, inspect `git diff --cached` and ensure unrelated files are absent.

## Definition of done

- Pull requests and pushes to `main` run deployment-neutral CI.
- `npm run build` produces a working root-relative `dist/` without assuming `/pi-city/`.
- Auth and multi-tool traces select the correct guided scenario.
- Unsupported or incompatible traces never receive fabricated auth narration.
- At least two approved, redacted real Pi traces pass import and analysis tests.
- Landing, Watch, Photo Mode, Explore, import fallback, and production build receive browser acceptance coverage.
- README, roadmap, architecture, and deployment documentation describe the same current state.
- `npm run check:all` and the browser smoke suite pass.

---

### Task 1: Add deployment-neutral GitHub CI

**Files:**

- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Create: `docs/deployment.md`
- Modify: `README.md`
- Do not modify: `.github/workflows/deploy-pages.yml`

**Step 1: Add the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - name: Install
        run: npm ci
      - name: Verify core, tests, types, and production build
        run: npm run check:ci
```

Do not include `pages: write`, `id-token: write`, a deployment environment, or a host-specific `VITE_BASE`.

**Step 2: Add a CI script**

Add this script to `package.json`:

```json
"check:ci": "npm run check:core && npm test && npm run typecheck && npm run build"
```

Keep `check:all` as the superset that also runs local GLB/Python frame validation.

**Step 3: Document the deployment contract**

Create `docs/deployment.md` with these contracts:

- GitHub stores source and runs CI; it is not the required host.
- `npm ci && npm run build` is the canonical production build.
- `dist/` is the only deployment artifact.
- Root hosting uses the default `/` base.
- Subpath hosting sets `VITE_BASE=/desired/subpath/` at build time.
- Pages, Vercel, Netlify, object storage/CDN, and any static host are optional adapters.
- No provider-specific workflow is enabled until that provider is chosen.

Update README's deploy section to link to this document. Keep the existing Pages document clearly labeled as optional.

**Step 4: Verify locally**

Run:

```bash
npm run check:ci
git diff --check
```

Expected: all 13 existing tests pass and Vite builds `dist/` with no host-specific base.

**Step 5: Commit only the neutral CI work**

```bash
git add .github/workflows/ci.yml package.json docs/deployment.md README.md
git diff --cached --name-only
git commit -m "ci: add deployment-neutral verification"
```

Expected staged list must not contain `.github/workflows/deploy-pages.yml`.

---

### Task 2: Make lesson selection explicit and trustworthy

**Files:**

- Create: `src/experience/scenario-compatibility.ts`
- Modify: `src/experience/index.ts`
- Modify: `src/experience/lesson-map.ts`
- Test: `tests/experience.test.ts`

**Step 1: Write failing compatibility tests**

Add tests covering:

```ts
test('selects auth only when every required auth beat exists', () => {
  const trace = importPiJsonl(authRuntime).trace;
  assert.equal(selectCompatibleScenario(trace)?.id, 'auth');
});

test('selects multi for the multi-tool fixture', () => {
  const trace = importPiJsonl(multiRuntime).trace;
  assert.equal(selectCompatibleScenario(trace)?.id, 'multi');
});

test('does not silently map an incompatible trace to auth', () => {
  const trace = importPiJsonl(sessionOnlyFixture).trace;
  assert.equal(selectCompatibleScenario(trace), null);
});

test('reports missing ordered event occurrences', () => {
  const result = evaluateScenarioCompatibility(getScenario('auth'), incompleteTrace);
  assert.equal(result.compatible, false);
  assert.ok(result.missing.length > 0);
});
```

Use existing fixture paths and add the smallest inline incomplete trace needed for the last assertion.

**Step 2: Run the tests and confirm failure**

```bash
npm test -- --test-name-pattern="scenario|compatible|incompatible"
```

Expected: FAIL because the compatibility functions do not exist.

**Step 3: Implement pure compatibility evaluation**

Create these public types and functions:

```ts
export interface MissingScenarioBeat {
  type: SemanticEventType;
  occurrence: number;
}

export interface ScenarioCompatibility {
  compatible: boolean;
  coverage: number;
  eventIndexes: number[];
  missing: MissingScenarioBeat[];
}

export function evaluateScenarioCompatibility(
  scenario: LessonScenario,
  trace: SemanticTrace,
): ScenarioCompatibility;

export function selectCompatibleScenario(
  trace: SemanticTrace,
): LessonScenario | null;
```

Evaluation rules:

- Match each lesson frame to the Nth occurrence of its event type.
- Preserve chronological order; an index may not move backward.
- Missing beats are recorded, never clamped to the previous event.
- A scenario is compatible only when every required beat is present.
- If multiple scenarios are compatible, choose the one with the most frames; use scenario declaration order as the deterministic tie-breaker.

Update `mapLessonFramesToTrace` so it is only called after compatibility succeeds. It must throw a descriptive error if asked to map an incompatible trace; silent fallback is forbidden.

**Step 4: Run focused and full tests**

```bash
npm test -- --test-name-pattern="scenario|compatible|incompatible|lesson frames"
npm test
npm run typecheck
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/experience/scenario-compatibility.ts src/experience/index.ts src/experience/lesson-map.ts tests/experience.test.ts
git commit -m "fix: reject incompatible cinematic scenarios"
```

---

### Task 3: Route imported traces without inventing narration

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/product/CinematicCity.tsx`
- Modify: `src/experience/scenarios.ts`
- Modify: `src/styles.css`
- Test: `tests/experience.test.ts`

**Step 1: Add failing pure-behavior tests**

Test a helper that returns one of:

```ts
type ImportedTraceDestination =
  | { surface: 'city'; scenarioId: string }
  | { surface: 'explorer'; reason: 'no-compatible-scenario' };
```

Assertions:

- Auth fixture routes to city/auth.
- Multi-tool fixture routes to city/multi.
- Session-only and incomplete runtime traces route to explorer.
- Routing never defaults an unknown trace to auth.

**Step 2: Lift imported-trace ownership into `App`**

Change the surface transition contract so `App` can pass a selected trace into the Evidence Explorer:

```ts
const [explorerTrace, setExplorerTrace] = useState<SemanticTrace | null>(null);

function openExplorer(trace?: SemanticTrace) {
  setExplorerTrace(trace ?? null);
  setSurface('explorer');
}
```

Make `EvidenceExplorer` accept an optional initial trace. Preserve the current demo behavior when no trace is supplied.

**Step 3: Select the guided scenario from the trace**

Replace fixed `getScenario('auth')` state in `CinematicCity` with a selected compatible scenario. On import:

1. Parse the file.
2. Select a compatible scenario.
3. If compatible, set trace + scenario and start Watch.
4. If incompatible, call `onOpenExplorer(result.trace)`.

Display a non-blocking message in the explorer explaining:

```text
This run has no compatible guided lesson yet, so Pi City opened the evidence-preserving explorer instead of applying demo narration.
```

Do not use `window.alert` for a successfully parsed but unsupported trace.

**Step 4: Derive visible totals from the actual trace**

Use `analyzeRun(trace)` for model-call and tool-call counts. Scenario metadata may control pacing and teaching copy, but it must not override factual run totals.

Photo Mode remains auth-demo-specific. If the active trace is not auth-compatible, Photo Mode should explicitly switch to the bundled auth demo before showing canonical frames, or be disabled with explanatory copy. Do not project auth frame indices into an unrelated trace.

**Step 5: Verify**

```bash
npm test
npm run typecheck
npm run build
```

Manually import:

- `fixtures/auth-bug/runtime.jsonl` — guided auth lesson.
- `fixtures/multi-tool/runtime.jsonl` — guided multi lesson with actual totals.
- `fixtures/auth-bug/session.jsonl` — Evidence Explorer fallback.
- `fixtures/malformed/broken-lines.jsonl` — import warnings remain visible.

**Step 6: Commit**

```bash
git add src/App.tsx src/product/CinematicCity.tsx src/experience/scenarios.ts src/styles.css tests/experience.test.ts
git commit -m "fix: preserve truth when importing Pi traces"
```

---

### Task 4: Add a safe real-trace fixture boundary

**Files:**

- Create: `src/adapters/pi/redact.ts`
- Create: `scripts/redact_pi_fixture.ts`
- Modify: `package.json`
- Test: `tests/pi-adapter.test.ts`
- Create after user approval: `fixtures/real-read/runtime.jsonl`
- Create after user approval: `fixtures/real-multi/runtime.jsonl`
- Create after user approval: `fixtures/real-read/README.md`
- Create after user approval: `fixtures/real-multi/README.md`

**Step 1: Write redaction tests first**

Cover at least:

- bearer/API tokens and common secret assignments;
- absolute home/workspace paths;
- email addresses;
- raw file contents in tool results;
- preservation of event type, timestamps, lifecycle order, tool names, correlation IDs, and evidence needed for replay;
- deterministic output for the same input.

Expected placeholders:

```text
[REDACTED_SECRET]
[REDACTED_PATH]/file.ts
[REDACTED_EMAIL]
[REDACTED_CONTENT sha256:<short-hash> length:<n>]
```

**Step 2: Implement redaction as a pure recursive transform**

Export:

```ts
export interface RedactionReport {
  secrets: number;
  paths: number;
  emails: number;
  contents: number;
}

export function redactPiRecord(value: unknown): {
  value: unknown;
  report: RedactionReport;
};
```

The CLI script must read an input path and write only to an explicitly provided output path inside `fixtures/`. It must never overwrite the source file.

Add:

```json
"redact:fixture": "tsx scripts/redact_pi_fixture.ts"
```

**Step 3: Verify the redactor**

```bash
npm test -- --test-name-pattern="redact"
npm test
```

Expected: no original secret/path/content string appears in serialized output.

**Step 4: User checkpoint — required**

Stop and show the user:

- proposed source session paths;
- redaction report counts;
- a diff/sample of the redacted output;
- exact destination fixture paths.

Do not add any real trace fixture until the user explicitly approves the sanitized outputs.

**Step 5: Add only approved fixtures and tests**

After approval, add one inspect/read run and one multi-tool change/verify run. Each fixture README must state:

- capture source: real Pi runtime;
- redaction performed;
- scenario shape;
- what regression it covers;
- confirmation that it contains no reusable credentials or private file content.

Add import/analysis assertions for both fixtures.

**Step 6: Commit in two parts**

```bash
git add src/adapters/pi/redact.ts scripts/redact_pi_fixture.ts package.json tests/pi-adapter.test.ts
git commit -m "feat: add safe Pi trace redaction boundary"
```

After explicit fixture approval:

```bash
git add fixtures/real-read fixtures/real-multi tests
git commit -m "test: add redacted real Pi replay fixtures"
```

---

### Task 5: Add browser acceptance coverage

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/cinematic.spec.ts`
- Create: `tests/e2e/import.spec.ts`
- Create: `docs/browser-acceptance-v011.md`
- Modify: `.gitignore`

**Step 1: Add pinned Playwright test tooling**

Install a pinned current version of `@playwright/test` and add:

```json
"test:e2e": "playwright test",
"check:browser": "npm run build && npm run test:e2e"
```

Configure Playwright to start `npm run dev -- --host 127.0.0.1`, use Chromium, retain traces/screenshots on failure, and test a 1440×900 desktop viewport. Do not commit browser binaries, `test-results/`, or `playwright-report/`.

**Step 2: Write failing smoke tests**

Cover:

- landing renders and enters Watch;
- Watch can pause and resume;
- `?frame=arrival`, `?frame=context`, and `?frame=model` open the expected canonical frame;
- `H` toggles clean Photo Mode and `Escape` exits;
- completion exposes Explore and Evidence Explorer;
- importing the multi-tool fixture shows its actual scenario/totals;
- importing an incompatible Session fixture opens Evidence Explorer with the truth-preserving fallback message.

Avoid pixel-perfect assertions for animated WebGL. Assert product modes, labels, controls, URLs, and absence of page errors. Capture the three canonical frames as review artifacts, not brittle golden tests.

**Step 3: Run browser tests**

```bash
npm run test:e2e
```

Expected: all smoke tests pass in Chromium with no uncaught page errors.

**Step 4: Perform visual acceptance**

Record in `docs/browser-acceptance-v011.md`:

- OS/browser/GPU;
- tested production commit;
- Arrival/Context/Model screenshot locations;
- matte, weathering, DOF, cropping, and readability observations;
- any intentionally deferred tuning.

Run both root and subpath builds:

```bash
npm run build
VITE_BASE=/pi-city/ npm run build
```

Expected: assets load correctly in both configurations.

**Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/e2e docs/browser-acceptance-v011.md .gitignore
git commit -m "test: add browser acceptance coverage"
```

---

### Task 6: Close documentation drift and release the beta

**Files:**

- Modify: `README.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/architecture-evolution.md`
- Modify: `docs/github-pages.md`
- Modify: `docs/deployment.md`
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Update milestone truth**

Document:

- Vite already contains Landing, Watch, Photo, Explore, and Evidence Explorer.
- GitHub is the canonical repository and CI platform.
- Hosting is deliberately provider-neutral.
- GitHub Pages is an optional adapter, not the product's assumed public URL.
- Guided scenarios require trace compatibility.
- Unmatched traces use Evidence Explorer without fabricated narration.
- Real fixture and browser acceptance status reflects what actually passed.

Remove the stale README sentence claiming Watch/Photo/Explore still need to be moved into Vite.

**Step 2: Bump the beta version**

After every acceptance criterion passes, set package version to:

```text
0.11.0-beta.1
```

Use `npm version 0.11.0-beta.1 --no-git-tag-version` so `package.json` and `package-lock.json` stay synchronized. Do not create a Git tag in this task.

**Step 3: Run the complete verification suite**

```bash
npm run check:all
npm run test:e2e
git diff --check
git status --short --branch
```

Expected:

- core/type/build checks pass;
- all unit tests pass;
- canonical frames pass;
- browser smoke tests pass;
- only intentional changes remain;
- `.github/workflows/deploy-pages.yml` is still absent from staged commits unless separately approved.

**Step 4: Final commit**

```bash
git add README.md docs/roadmap.md docs/architecture-evolution.md docs/github-pages.md docs/deployment.md package.json package-lock.json
git diff --cached
git commit -m "docs: release v0.11 trustworthy public beta"
```

**Step 5: Handoff before pushing**

Report:

- commit list;
- test evidence;
- real-fixture approval evidence;
- browser acceptance results;
- remaining untracked/modified files;
- whether the Pages draft remains uncommitted.

Do not push, enable Pages, publish a deployment, create a release, or tag a version without explicit user authorization.

---

## Cursor Agent kickoff prompt

Paste the following into the Cursor Agent pane:

```text
Implement the plan in docs/plans/2026-08-10-v011-trustworthy-public-beta.md task by task.

Start by reading the entire plan, then inspect git status and the existing diffs. Preserve all pre-existing user changes. In particular, .github/workflows/deploy-pages.yml is an untracked Pages-specific draft: do not delete, overwrite, stage, or commit it. GitHub is for source control and CI; deployment must remain provider-neutral.

Use test-first development for behavior changes. Make small commits only after the relevant checks pass. Stop for the explicit real-trace privacy checkpoint and before any push, deployment, tag, or release. Begin with Task 1 and report the exact files you intend to touch before editing.
```
