# Pi City Visual Beta

Static deployment shell for the v0.4 asset-based harbor.

It loads five local GLB hero assets and Three.js from jsDelivr. No build step is required.

Deploy this directory as a static site. Keep `assets/models/*` beside `index.html`.

For local testing, serve over HTTP (GLB assets will not reliably load from `file://`):

```bash
python3 -m http.server 4173 --directory site-visual-beta
```

Then open `http://localhost:4173` in a browser with internet access so the pinned Three.js CDN imports can load.
