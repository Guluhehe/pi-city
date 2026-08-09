# Real Run Explorer v0.2

## Product question

Given one arbitrary Pi run, can a user understand **why the Agent behaved the way it did** without reading raw runtime events first?

## Progressive disclosure

1. **Run Overview** — What kind of run was this? How large was it? Which tools mattered?
2. **Story Timeline** — What were the meaningful phases of work?
3. **World / Session / Context** — How did that phase manifest in the runtime?
4. **Context Compare** — What changed between two model decisions?
5. **Semantic Events / Raw Evidence** — What exactly did Pi emit or persist?

## Critical invariant

Pi City must never present reconstructed teaching semantics as raw telemetry. Every event and context explanation retains its evidence level: Observed, Derived, or Synthetic.

## Context Compare

The initial implementation reconstructs a conservative context evidence set from:

- user requests
- tool calls
- tool results

A snapshot is taken at each `MODEL_REQUEST_STARTED`. Differences between snapshots explain why the same Agent can make a different decision on a later model call. This is not a byte-for-byte provider prompt.

## Story segmentation

The first segmentation heuristic groups runtime events by turn, then classifies tool use:

- read / grep / find / ls / search / glob → Inspect evidence
- edit / write / patch → Modify the project
- bash / shell / exec → Run commands
- change + execution in the same turn → Change and verify
- no tools on the final turn → Answer the user

The heuristic is intentionally adapter-neutral and should evolve from real-run validation rather than from hard-coded demo stories.
