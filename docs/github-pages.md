# GitHub Pages deployment

Pi City deploys the **Vite application** to GitHub Pages.

## Deployment contract

```text
main
  ↓
.github/workflows/deploy-pages.yml
  ↓
npm ci → check:core → test → typecheck → build
  ↓
actions/upload-pages-artifact (dist/)
  ↓
GitHub Pages
```

The workflow sets `VITE_BASE=/pi-city/` so assets resolve under the project subpath.

Expected project-site shape for `Guluhehe/pi-city`:

```text
https://guluhehe.github.io/pi-city/
```

## Local production preview

```bash
npm ci
VITE_BASE=/pi-city/ npm run build
npm run preview
```

Then open the preview URL (Vite will serve under `/pi-city/`).

## Legacy static prototypes

`site-live-beta/`, `site-visual-beta/`, and `site-beta/` remain in the repository as historical prototypes. They are no longer the Pages deployment source. See `site-live-beta/README.md`.

## Clean setup checklist

```bash
npm ci
npm run check:core
npm test
npm run typecheck
npm run build
npm run setup:visual   # once, for GLB geometry checks
npm run check:frames
```

Supported toolchain:

- Node.js 20+
- Python 3.11+ (only required for `check:frames` / `setup:visual`)
