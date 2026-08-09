# Roadmap

## v0.0.x — Technical / visual spikes

Validated:

- industrial harbor world direction
- physical logistics instead of particle flow
- guided camera
- cutaway buildings
- Session vs Context visual metaphor
- Model decision gates
- living-city visual language

## v0.1 — Replay a Real Pi Run

### Engine — implemented

- Pi session/runtime JSONL detection
- tolerant JSONL parser
- Pi Adapter
- Semantic Trace Schema v1
- observed / derived / synthetic evidence levels
- deterministic replay reducer + frames
- tool correlation via `toolCallId`
- runtime and Session fixtures

### Product shell — implemented

- local file import
- generated timeline
- replay/scrubbing
- event Inspector
- raw Pi evidence view
- compact World view driven by semantic district state

### Integrated in this iteration

- data-driven Three.js harbor connected to replay frames through World Cues
- Session Tree panel driven by imported `id` / `parentId`
- Context panel that labels reconstructed vs directly instrumented context
- combined runtime + Session replay
- imported file metadata and import diagnostics

### Remaining v0.1 validation

- validate against real exported Pi sessions/runtime logs
- tune camera/logistics against long multi-tool traces
- improve import pairing/correlation for complex sessions

## v0.2

- Branch / Session Tree exploration
- Context pressure + Compaction exhibit
- richer multi-tool scenarios
- branch-aware replay

## v0.3

- live Pi SDK/RPC event stream
- Replay My Agent
- first control/debug gameplay mechanics
