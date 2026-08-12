# Pi City v0.5 Visual Beta

Static deployable shell for the asset-based Pi City experience.

It contains local GLB Hero Buildings and the local concept matte. Three.js / GLTFLoader are loaded by the import map from the pinned CDN version in `index.html`.

Serve the directory over HTTP:

```bash
python3 -m http.server 8080 -d legacy/site-visual-beta
```

This build keeps the world-first replay, Story Rail, Inspector, Tool Result U-turn, Context Compare, runtime building activation and cinematic camera framing.
