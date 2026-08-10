# Browser acceptance — v0.11

Visual and product-mode smoke review for the trustworthy public beta.

## Environment

| Field | Value |
| --- | --- |
| OS | macOS 27.0.0 (darwin 27.0.0), arm64 |
| GPU | Apple M3 · Metal 4 |
| Display | Built-in Liquid Retina 2560×1664 + external 2560×1440 |
| Browser | Playwright Chromium 151.0.7922.34 (`@playwright/test@1.62.1`) |
| Viewport | 1440×900 |
| Tested production commit | Task 5 tip `5d7c827` / release commit that includes this document |

## Smoke coverage

`npm run test:e2e` covers:

- Landing → Watch
- Watch pause / resume
- `?frame=arrival|context|model` Photo Mode deep links
- `H` clean Photo Mode + `Escape` exit
- Completion → Explore + Evidence Explorer affordances
- Multi-tool import uses actual scenario totals (`MODEL …/3`, `TOOLS …/4`)
- Incompatible Session import opens Evidence Explorer with the truth-preserving fallback notice

## Canonical frame review artifacts

| Frame | Path |
| --- | --- |
| Arrival | [`browser-acceptance-artifacts/canonical-arrival.webp`](browser-acceptance-artifacts/canonical-arrival.webp) |
| Context | [`browser-acceptance-artifacts/canonical-context.webp`](browser-acceptance-artifacts/canonical-context.webp) |
| Model | [`browser-acceptance-artifacts/canonical-model.webp`](browser-acceptance-artifacts/canonical-model.webp) |

### Observations

- Matte / harbor backdrop remains readable behind the Photo Mode chrome at 16:9.
- Weathering on Hero Buildings is visible without inventing runtime state.
- DOF and cinematic compaction are present in Watch; Photo Mode keeps the three review frames inspectable.
- Cropping: Arrival keeps the request vessel in the wider harbor; Context frames the works; Model keeps the gate/decision read.
- Typography on frame captions remains legible over the darkened matte edge.

### Intentionally deferred

- Pixel-perfect golden screenshots (too brittle for animated WebGL).
- GPU-driver-specific bloom/DOF tuning across non-Apple GPUs.
- First-run WebGL warm-up flakiness is absorbed with one Playwright retry.

## Production build bases

```bash
npm run build
VITE_BASE=/pi-city/ npm run build
```

Verified:

- Root build emits `/assets/...` script and stylesheet hrefs.
- Subpath build emits `/pi-city/assets/...` hrefs.
