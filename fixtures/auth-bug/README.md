# Auth bug fixture

A compact Pi-like fixture used to validate Pi City replay semantics.

- `runtime.jsonl` models the RPC event stream, including `agent_settled` and tool correlation via `toolCallId`.
- `session.jsonl` models the persisted Session v3 tree with `id` / `parentId` entries.

The code/content is synthetic, but the record shapes follow the Pi documentation used by the adapter.
