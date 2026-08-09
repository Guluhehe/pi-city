# Pi City Online Beta

Zero-dependency deployment prototype for Pi City.

## Why this exists

The main application remains the React + React Three Fiber implementation. This folder is a deployment-safe beta shell that can be hosted anywhere without an npm build step. It preserves the product shape needed for user testing:

- harbor-first guided replay
- runtime districts and artifact movement
- story rail
- inspector
- Aha moments
- context compare
- basic Pi runtime JSONL import

## Preview locally

```bash
python3 -m http.server 8080 -d site-beta
```

Then open `http://localhost:8080`.

## Deploy

### GitHub Pages
Publish the `site-beta` directory as a static site (or copy it to a `gh-pages` branch root).

### Vercel / Netlify
Set the project root/output to `site-beta`; no build command is required.

### ChatGPT Sites
Use this folder as the deployment source when Sites is available in Work/Codex. The beta is self-contained and has no external runtime dependencies.

## Boundary

This beta intentionally uses an SVG/isometric harbor instead of the full React Three Fiber scene. It is meant to make the complete product loop deployable and testable online now. The production path remains higher-fidelity GLB/Three.js hero assets driven by the same Semantic Trace model.
