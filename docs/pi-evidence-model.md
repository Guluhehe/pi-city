# Pi Evidence Model

Pi City separates what Pi **actually emitted or persisted** from what the replay engine **reconstructs for explanation**.

## Evidence levels

### Observed

Directly present in imported Pi evidence.

Examples:

- RPC `message_start` with a user message
- RPC `tool_execution_start/update/end`
- RPC `agent_settled`
- Session `message` entries with `id` / `parentId`
- Tool calls persisted inside assistant content
- Tool-result messages linked by `toolCallId`

### Derived

A semantic event reconstructed from a real Pi lifecycle signal.

The important v0.1 example is Context assembly. Pi RPC exposes `turn_start`, but it does not expose the exact compiled model context as a first-class RPC event. Pi City therefore derives:

```text
turn_start
  -> CONTEXT_COMPILE_STARTED (derived)
  -> CONTEXT_COMPILED (derived)
  -> MODEL_REQUEST_STARTED (derived)
```

The Inspector must show this distinction instead of presenting the reconstruction as raw telemetry.

### Synthetic

Added only to make a replay usable when the source format cannot contain a live lifecycle event. For example, an imported Session JSONL receives a synthetic `AGENT_SETTLED` at end-of-file so playback has a deterministic ending.

## Source-of-truth references

Validated against Pi documentation on 2026-08-09:

- RPC mode: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md
- Coding agent sessions: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md
- SDK events: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md

The adapter is intentionally tolerant of older logs and unknown fields. Raw source evidence is preserved on each semantic event for Inspector/debug use.
