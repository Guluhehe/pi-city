# GitHub Pages deployment (optional)

Pi City's source of truth is the Vite app. GitHub is the canonical repository and CI platform. GitHub Pages is only an optional static host if you choose to enable it — the repository itself does not imply a fixed public site URL.

Canonical deployment contracts live in [`deployment.md`](deployment.md). This page documents the optional Pages adapter only.

## Optional Pages adapter contract

```text
main
  ↓
.github/workflows/deploy-pages.yml  (draft / opt-in only)
  ↓
npm ci → check:core → test → typecheck → build
  ↓
actions/upload-pages-artifact (dist/)
  ↓
GitHub Pages (if enabled)
```

Set `VITE_BASE` to match the host path (for a project Pages site under `/pi-city/`, use `VITE_BASE=/pi-city/`). The deployment-neutral CI workflow does not set a host-specific base.

## Local production preview

```bash
npm ci
npm run build
npm run preview
```

For a subpath host, build with the matching base:

```bash
VITE_BASE=/pi-city/ npm run build
```

## Legacy static prototypes

`legacy/site-live-beta/`, `legacy/site-visual-beta/`, and `legacy/site-beta/` remain as frozen historical prototypes. They are not deployment sources. See [`../legacy/README.md`](../legacy/README.md).

## Clean setup checklist

```bash
npm ci
npm run check:ci
npm run setup:visual   # once, for GLB geometry checks
npm run check:frames
npm run test:e2e
```

Supported toolchain:

- Node.js 20+
- Python 3.11+ (only required for `check:frames` / `setup:visual`)
- Playwright Chromium (only required for `test:e2e`)
