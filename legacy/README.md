# Legacy static prototypes

These directories preserve Pi City's pre-Vite product experiments:

- `site-beta/` — zero-dependency v0.3 SVG prototype
- `site-visual-beta/` — v0.5 asset-based visual prototype
- `site-live-beta/` — v0.10 cinematic prototype

They are frozen historical artifacts, not maintained product runtimes or deployment sources. The supported application is the root Vite app; build it with `npm run build` and serve `dist/`.

To inspect a prototype locally, serve its directory explicitly, for example:

```bash
python3 -m http.server 8080 -d legacy/site-live-beta
```
