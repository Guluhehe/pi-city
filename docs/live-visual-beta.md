# Pi City v0.6 — Live Visual Beta

> Historical document. The static build is frozen at `legacy/site-live-beta/`; the root Vite app and its `dist/` artifact are the only maintained product runtime.

v0.6 is the first build designed around one question: **can someone open a URL and experience Pi City as a world, not as a trace viewer?**

## Experience contract

The bundled auth-bug journey runs for about 65 seconds at 1× speed and deliberately slows down the three core comprehension moments:

1. **History is written before Context is built.**
2. **Tool Result turns around and returns to the Agent.**
3. **Model #2 receives a different Context than Model #1.**

The run uses five distinct diegetic information objects rather than one generic moving token:

- request vessel
- session entry
- context capsule
- work-order cart
- tool-result crate
- final answer artifact

## Visual stack

```text
L0 Concept Matte      distant harbor density / skyline / atmosphere
L1 Realtime Fabric    water / rails / warehouses / cranes / ships / smoke
L2 Hero GLB Assets    Arrival / Session / Context / Model / Tool districts
L3 Runtime Machinery Context sorting / Session growth / Model gates / Tool lights
L4 Product UI         Story rail / Inspector / Aha / Context Compare
```

The concept matte is strongest in wide establishing shots and fades during close inspection so it never replaces the real runtime geometry.

## Journey timing

The bundled auth scenario has 15 semantic beats and runs for roughly 65 seconds at 1×. The multi-tool scenario runs for roughly 56 seconds.

The replay is duration-driven rather than using one fixed interval per event. Model decisions and Context assembly receive more screen time than bookkeeping events.

## Explore mode

After the Agent settles, the replay changes from **Watch** to **Explore**. The five live districts can be selected directly. Context Works exposes the clearest runtime machinery because the building shell fades into a cutaway while selected and rejected evidence moves through separate physical routes.

## Real Pi import

The static beta includes a small runtime JSONL normalizer so a Pi JSON event stream can drive the same world without a build step. Imported data is deliberately conservative: lifecycle evidence is observed; Context compilation remains marked as derived when the raw log does not expose exact model-visible contents.

## Deployment

`legacy/site-live-beta/` preserves the original static directory for inspection only.

The original workflow targeted this static prototype. Current deployment contracts build the root Vite app and publish `dist/`; host selection remains explicit.

## Primary deployment: GitHub Pages

V0.6 was Pages-first and deployed the static prototype directly. See `docs/github-pages.md` for the current optional adapter contract.
