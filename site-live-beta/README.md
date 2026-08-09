# Pi City v0.9 Cinematic Beta

Static deployable Experience Beta. No build step is required.

V0.9 keeps the v0.8 weathered GLB harbor and runtime semantics, then moves the visual work into **cinematography**: every hero beat now carries explicit composition, FOV, exposure, bloom, matte blend, and depth-of-field parameters. Arrival, Context Works, and Model Core also receive world-space foreground framing so the camera reads through a port, pipe rack, or gate instead of hovering in empty space.

## Run locally

Serve this directory over HTTP because GLB assets and ES modules do not work reliably from `file://`:

```bash
python3 -m http.server 8080 --directory site-live-beta
```

Then open `http://localhost:8080`.

## Publish with GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`. The site uses relative asset URLs and works under a project subpath such as `/pi-city/`.

## Deployment contents

- `index.html` — complete interactive beta
- `assets/models/*.glb` — Hero Building assets
- `assets/mattes/industrial-harbor-concept.jpg` — L0 matte world
- `assets/noise.png` — film-grain overlay
- `.nojekyll` — disables Jekyll processing

Three.js ES modules are loaded from jsDelivr at runtime.

## Cinematic pass

- explicit shot grammar per runtime beat
- asymmetric hero composition instead of centered building shots
- Bokeh depth of field with focus following the active district
- event-specific exposure / bloom / matte blend
- foreground crane framing for Arrival Harbor
- foreground pipe-rack framing for Context Works
- gate/portal framing for Model Core
- slower camera breathing on close reasoning shots; wider parallax on harbor shots
- ~65 second auth journey and ~56 second multi-tool journey unchanged
- no new Agent semantics
