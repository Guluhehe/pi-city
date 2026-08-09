# Roadmap

## v0.0.x — Technical / visual spikes

Validated the industrial harbor, physical logistics, guided camera, cutaway buildings, Session-vs-Context metaphor, Model decision gates, and living-city visual language.

## v0.1 — Replay a Real Pi Run

Implemented the Pi runtime/session importer, tolerant JSONL parsing, Semantic Trace Schema, evidence levels, deterministic replay frames, tool correlation, runtime + Session merge, Session Tree, Context reconstruction, Inspector, and a Three.js harbor driven by semantic World Cues.

## v0.2 — Real Run Explorer — current

### Implemented in alpha

- Run Analyzer: title, status, duration, turns, model/tool counts, tool distribution, evidence quality
- Story Builder: compresses low-level events into request / inspect / change / execute / answer / completion steps
- Context Snapshots: reconstructs evidence available at each Model Call
- Context Compare: highlights added, retained, and removed evidence between model decisions
- Inspector explanations: separate **what happened** from **why it matters**
- Multi-tool fixture that covers read + grep + edit + bash
- synchronized navigation between Story/Context/Compare and the raw replay index

### Next validation

- import several real Pi runtime logs of materially different shapes
- improve segmentation of long turns and multiple user follow-ups
- extract usage/token metadata when present
- distinguish validation commands from generic bash execution
- make Story steps drive higher-level camera sequences in the harbor

## v0.3 — Agent Time Machine

- branch-aware replay
- active leaf movement
- Context pressure
- Compaction before/after
- "why did the Agent forget?" explanations

## v0.4 — Take Control

- predict next action
- replay reality
- intervene in context/tool decisions
- debug challenges rather than XP/badge gamification
