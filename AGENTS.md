# Agent operating guide — Pi City

This file tells coding agents how to work in this repository without inventing a parallel product direction.

## Binding documents (read in this order)

1. [`docs/architecture-evolution.md`](docs/architecture-evolution.md) — target architecture, milestones, non-goals
2. [`docs/reviews/2026-08-10-fable5-architecture-review.md`](docs/reviews/2026-08-10-fable5-architecture-review.md) — Fable 5 review; priority list and honesty risks
3. **Implemented plan:** [`docs/plans/2026-08-12-fable-v012-implementation.md`](docs/plans/2026-08-12-fable-v012-implementation.md) — v0.12 Predict + narrative honesty + reliability
4. **Current handoff:** [`docs/handoffs/2026-08-13-fable-v012-handoff.md`](docs/handoffs/2026-08-13-fable-v012-handoff.md) — completed work, verification, repository state, and next steps

Index pages: [`docs/reviews/`](docs/reviews/), [`docs/plans/`](docs/plans/), [`docs/handoffs/`](docs/handoffs/).

If a plan and the review disagree on tactics, prefer the **newest active plan**. If either disagrees with the architecture evolution doc on boundaries (immutable Semantic Trace, evidence levels, non-goals), prefer **architecture-evolution**.

## Product ladder

```text
Watch -> Understand -> Predict -> Intervene -> Debug
```

Do not skip ahead to Intervene / Debug / open-world features before Predict is real.

## Hard rules

- Semantic Trace is immutable evidence. Gameplay must be a separate deterministic state machine.
- Always distinguish **Observed / Derived / Synthetic**.
- Do not silently replace an imported user trace with demo narration or demo fixtures.
- Guided cinematic copy may only claim details that the active trace actually supports.
- Rendering consumes semantic events / shared shot specs — never Pi RPC event names.
- Prefer one maintained Vite app. Treat `legacy/site-beta/`, `legacy/site-visual-beta/`, and `legacy/site-live-beta/` as frozen prototypes.
- Do not introduce: multiplayer, accounts, cloud saves, ECS, custom backend, plugin marketplace, or a general Agent platform.

## Preferred next work

The first three Fable 5 priorities and deterministic trace identity are complete in v0.12. Unless the human says otherwise, continue with:

1. A privacy-reviewed real **runtime** fixture for cinematic and Predict acceptance
2. User validation of the first playable Predict lesson
3. Measured bundle splitting if performance is the selected goal

Do not start Intervene / Debug simply because Predict now exists. Require a new plan grounded in real-runtime and playthrough evidence.

## Verification

```bash
npm run check:all
```

Browser acceptance notes live in `docs/browser-acceptance-v011.md` when relevant.

## Privacy

Never commit raw private Pi traces, tokens, secrets, or personal identity metadata. Use the redaction boundary before adding real fixtures.
