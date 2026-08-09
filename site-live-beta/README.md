# Pi City v0.10 Canonical Frames Beta

Static deployable Experience Beta. No build step is required.

V0.10 keeps the same runtime semantics and cinematic harbor, then makes the three hero compositions directly reviewable. **Photo Mode** exposes deterministic Arrival / Context / Model frames, supports `?frame=` deep links, and uses GLB projection checks to prevent accidental hero-asset cropping before real-browser art direction.

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

## Canonical Photo Mode

- Top bar → **Frames**
- Landing → **View hero frames**
- `1 / 2 / 3` switch Arrival / Context / Model
- `H` hides the review overlay for a clean frame
- `Esc` returns to the landing page
- Deep link with `?frame=arrival`, `?frame=context`, or `?frame=model`
