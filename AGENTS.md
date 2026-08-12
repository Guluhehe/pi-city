# Agent operating guide — Pi City

This file tells coding agents how to work in this repository without inventing a parallel product direction.

## Binding documents (read in this order)

1. [`docs/architecture-evolution.md`](docs/architecture-evolution.md) — target architecture, milestones, non-goals
2. [`docs/reviews/2026-08-10-fable5-architecture-review.md`](docs/reviews/2026-08-10-fable5-architecture-review.md) — Fable 5 review; priority list and honesty risks
3. **Active plan:** [`docs/plans/2026-08-10-fable5-predict-and-honesty.md`](docs/plans/2026-08-10-fable5-predict-and-honesty.md) — Predict + narrative honesty (execute task-by-task)

Index pages: [`docs/reviews/`](docs/reviews/), [`docs/plans/`](docs/plans/).

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
- Prefer one maintained Vite app. Treat `site-beta/`, `site-visual-beta/`, `site-live-beta/` as legacy prototypes.
- Do not introduce: multiplayer, accounts, cloud saves, ECS, custom backend, plugin marketplace, or a general Agent platform.

## Preferred next work

Unless the human says otherwise, follow the Fable 5 review priority order:

1. Narrative honesty fixes in the cinematic shell (real Compare, event-derived evidence labels, no silent Photo Mode demo swap)
2. First playable lesson: **Predict the Agent's next action**
3. Minimal 3D/renderer failure fallback (ErrorBoundary → Evidence Explorer)
4. Real runtime fixtures + `sourceHash` / deterministic trace ids

## Verification

```bash
npm run check:all
```

Browser acceptance notes live in `docs/browser-acceptance-v011.md` when relevant.

## Privacy

Never commit raw private Pi traces, tokens, secrets, or personal identity metadata. Use the redaction boundary before adding real fixtures.
