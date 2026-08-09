# World runtime

The harbor should consume **World Cues**, not Pi event names.

```text
Pi event -> SemanticEvent -> WorldCue -> Three.js state / animation
```

`cues.ts` is the bridge between the data engine and the visual world. It maps runtime meaning onto diegetic city behavior:

- request -> request vessel / Arrival Harbor
- Session node -> archive record / filing machinery
- context compilation -> selection floor / Context Capsule
- model call -> deliberation machinery
- tool call -> work order / dispatch gate
- tool execution -> Tool District workshop
- tool result -> result cargo returning to Session
- settled -> pullback / city-level completion

This keeps the future Three.js implementation replaceable and lets other harness adapters reuse the same harbor language.
