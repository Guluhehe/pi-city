# Semantic Trace

The city must not bind directly to Pi's raw event names.

Pi Adapter converts Pi-specific runtime/session evidence into a runtime-neutral semantic trace.

## v1 event set

```ts
export type SemanticEventType =
  | 'REQUEST_ARRIVED'
  | 'SESSION_NODE_ADDED'
  | 'CONTEXT_COMPILE_STARTED'
  | 'CONTEXT_COMPILED'
  | 'MODEL_REQUEST_STARTED'
  | 'MODEL_STREAMING'
  | 'MODEL_RESPONSE_COMPLETED'
  | 'TOOL_CALL_CREATED'
  | 'TOOL_EXECUTION_STARTED'
  | 'TOOL_EXECUTION_UPDATED'
  | 'TOOL_EXECUTION_COMPLETED'
  | 'TOOL_RESULT_ATTACHED'
  | 'TURN_COMPLETED'
  | 'AGENT_SETTLED'
  | 'CONTEXT_PRESSURE_CHANGED'
  | 'COMPACTION_STARTED'
  | 'COMPACTION_COMPLETED'
  | 'ACTIVE_LEAF_MOVED'
  | 'BRANCH_CREATED'
  | 'BRANCH_SUMMARY_CREATED'
  | 'MODEL_CHANGED'
  | 'THINKING_LEVEL_CHANGED';
```

## Design rule

World animation responds to semantic state transitions. It must never contain timer-authored business logic such as "after 3 seconds activate Tool Works".
