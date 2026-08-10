# Deployment contract

Pi City treats GitHub as the source-control and CI home. It is **not** a required host for the public product.

## Canonical production build

```bash
npm ci
npm run build
```

The only deployment artifact is `dist/`. Hosts should serve that directory as static files.

## Base path

| Hosting shape | Build-time base |
| --- | --- |
| Root domain or root path (`/`) | Default — no `VITE_BASE` needed |
| Subpath (for example `/pi-city/`) | `VITE_BASE=/desired/subpath/` |

Example subpath build:

```bash
VITE_BASE=/pi-city/ npm run build
```

## Optional host adapters

Any static host can serve `dist/`:

- GitHub Pages
- Vercel
- Netlify
- Object storage + CDN
- Any other static file host

No provider-specific workflow is enabled until that provider is deliberately chosen. The repository may contain optional adapter drafts, but they stay inactive until selected.

For the optional Pages adapter notes, see [`github-pages.md`](github-pages.md).

## CI vs deploy

Pull requests and pushes to `main` run deployment-neutral verification via `.github/workflows/ci.yml` (`npm run check:ci`). That workflow does not deploy and does not set a host-specific `VITE_BASE`.
