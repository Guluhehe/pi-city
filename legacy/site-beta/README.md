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
python3 -m http.server 8080 -d legacy/site-beta
```

Then open `http://localhost:8080`.

## Deploy

### GitHub Pages
Historical only: this prototype is frozen and should not be used as the current deployment source.

### Vercel / Netlify
Use the root Vite build (`npm run build` → `dist/`) for current deployments.

### ChatGPT Sites
Use this folder as the deployment source when Sites is available in Work/Codex. The beta is self-contained and has no external runtime dependencies.

## Boundary

This beta intentionally uses an SVG/isometric harbor instead of the full React Three Fiber scene. It is meant to make the complete product loop deployable and testable online now. The production path remains higher-fidelity GLB/Three.js hero assets driven by the same Semantic Trace model.
