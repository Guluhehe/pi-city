# GitHub Pages deployment

Pi City v0.6 uses GitHub Pages as the primary online-beta deployment path.

## Why Pages

The live beta is already a static site. It does not need a server process, database, framework build, Vercel, or Netlify. Keeping deployment in GitHub means the same repository owns source, assets, history, and the test URL.

## Deployment contract

```text
main
  ↓
.github/workflows/deploy-pages.yml
  ↓
actions/upload-pages-artifact
  ↓
site-live-beta/
  ↓
GitHub Pages
```

The workflow deploys the directory exactly as-is. There is no build step and therefore no npm-registry dependency in the deployment path.

## First publish

After importing the local Git repository to GitHub:

1. Open **Settings → Pages** in the repository.
2. Choose **GitHub Actions** as the publishing source if needed.
3. Open **Actions → Deploy Pi City Live Beta to Pages** and run it, or push a change under `site-live-beta/` to `main`.
4. Open the deployment URL shown by the workflow environment.

Expected project-site shape for `Guluhehe/pi-city`:

```text
https://guluhehe.github.io/pi-city/
```

## Subpath compatibility

GitHub project Pages are commonly served below a repository subpath. Pi City therefore uses relative URLs such as:

```text
./assets/models/context-works.glb
./assets/mattes/industrial-harbor-concept.jpg
```

Do not replace these with `/assets/...` absolute-root paths.

## What to validate online

The first online pass is primarily a visual/interaction review:

- landing composition and concept-matte blend
- WebGL model load and material response
- dusk/fog/water balance
- camera motion and 60–90 second pacing
- Tool Result U-turn readability
- Context Compare timing
- post-run Explore mode
- desktop viewport performance

Only after this pass should visual assets or camera timing be tuned further.
