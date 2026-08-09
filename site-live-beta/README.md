# Pi City v0.6 Live Visual Beta

Static GitHub Pages deployment target. No build step is required.

## Run locally

Serve this directory over HTTP because GLB assets and ES modules do not work reliably from `file://`:

```bash
python3 -m http.server 8080 --directory site-live-beta
```

Then open `http://localhost:8080`.

## Publish with GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`.

After the repository is pushed to GitHub:

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions** if GitHub has not already selected it.
3. Push to `main`, or run the **Deploy Pi City Live Beta to Pages** workflow manually.
4. The workflow publishes the contents of `site-live-beta/` as the Pages site.

For a repository named `pi-city` under user `Guluhehe`, the default project-site URL is expected to be under:

```text
https://guluhehe.github.io/pi-city/
```

The site uses relative local asset URLs so it works correctly from the `/pi-city/` project subpath.

## Deployment contents

- `index.html` — complete interactive beta
- `assets/models/*.glb` — Hero Building assets
- `assets/mattes/industrial-harbor-concept.jpg` — L0 matte world
- `assets/noise.png` — film-grain overlay
- `.nojekyll` — disables Jekyll processing

Three.js ES modules are loaded from jsDelivr at runtime. All Pi City models and matte assets are served from GitHub Pages itself.
