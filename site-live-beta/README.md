# site-live-beta (legacy prototype)

This directory is a **historical deployable prototype** for the v0.6–v0.10 cinematic harbor experience.

As of Milestone A (One Core), the maintained product runtime is the Vite application in `src/`. GitHub Pages now builds and deploys `dist/` from that app.

Do not add new product logic here. Shot / scenario / canonical-frame data now lives in:

- `src/experience/shots.ts`
- `src/experience/scenarios.ts`
- `src/experience/canonical-frames.ts`
- `public/experience/library.json` (exported)

Preview this archived build locally:

```bash
python3 -m http.server 8080 -d site-live-beta
```
