import type { SemanticEvent } from './schema';

export interface EventExplanation {
  title: string;
  plain: string;
  why: string;
  district: 'arrival' | 'session' | 'context' | 'model' | 'tool' | 'system';
}

export function explainEvent(event: SemanticEvent): EventExplanation {
  const toolName = typeof event.payload.toolName === 'string' ? event.payload.toolName : 'tool';

  switch (event.type) {
    case 'REQUEST_ARRIVED':
      return { title: 'A request entered the city', plain: 'A user message became new work for the Agent.', why: 'This is the root cause of everything that follows: new user intent has entered the runtime.', district: 'arrival' };
    case 'SESSION_NODE_ADDED':
      return { title: 'Session history grew', plain: 'Pi persisted another durable entry in the session tree.', why: 'Durable history is not the same thing as the context used for the next model call.', district: 'session' };
    case 'CONTEXT_COMPILE_STARTED':
      return { title: 'Context assembly started', plain: 'Pi is preparing the current view that will be sent to the model.', why: 'The model reasons over a compiled view, not over every historical artifact indiscriminately.', district: 'context' };
    case 'CONTEXT_COMPILED':
      return { title: 'A model context is ready', plain: 'The next model call sees a selected, compiled view rather than raw session history.', why: 'Changes in this view can explain why two calls from the same Agent produce different decisions.', district: 'context' };
    case 'MODEL_REQUEST_STARTED':
      return { title: 'The model was called', plain: 'A new reasoning turn started with the current context.', why: 'A new model call means the Agent has reached another decision point with the evidence currently available.', district: 'model' };
    case 'MODEL_STREAMING':
      return { title: 'The model is streaming', plain: 'The assistant is producing text, thinking, or tool-call content.', why: 'Streaming is output-in-progress, not proof that the Agent has finished the turn.', district: 'model' };
    case 'MODEL_RESPONSE_COMPLETED':
      return { title: 'The model response completed', plain: 'The assistant message for this model call is complete.', why: 'The response may still contain tool calls, so a completed model message is not always a completed Agent run.', district: 'model' };
    case 'TOOL_CALL_CREATED':
      return { title: `The model requested ${toolName}`, plain: 'The model chose an action; the harness still has to execute it.', why: 'This separates decision from execution: the model proposes the action, while the harness performs it.', district: 'model' };
    case 'TOOL_EXECUTION_STARTED':
      return { title: `${toolName} started`, plain: 'Pi began executing the requested tool outside the model.', why: 'The Agent has crossed from reasoning into external action.', district: 'tool' };
    case 'TOOL_EXECUTION_UPDATED':
      return { title: `${toolName} is running`, plain: 'The tool emitted partial progress while execution continues.', why: 'Long-running tools can change runtime state before a final result is available.', district: 'tool' };
    case 'TOOL_EXECUTION_COMPLETED':
      return { title: `${toolName} finished`, plain: 'Tool execution completed and produced a result.', why: 'Execution is complete, but the result still has to return to the Agent before it can influence reasoning.', district: 'tool' };
    case 'TOOL_RESULT_ATTACHED':
      return { title: 'The tool result returned to the Agent', plain: 'The result becomes evidence for the next reasoning step, not the user-facing answer by itself.', why: 'This is the key Agent loop: external evidence re-enters context and can trigger another model decision.', district: 'session' };
    case 'TURN_COMPLETED':
      return { title: 'One Agent turn completed', plain: 'An assistant response and its tool work finished as one turn.', why: 'Turns are useful boundaries for grouping low-level events into a human-readable story.', district: 'system' };
    case 'AGENT_SETTLED':
      return { title: 'The Agent settled', plain: 'No automatic retry, compaction retry, or queued continuation remains.', why: 'Settled is stronger than a single model response ending: the runtime has no automatic continuation left.', district: 'system' };
    case 'COMPACTION_STARTED':
      return { title: 'Compaction started', plain: 'Pi began summarizing older context to reduce context-window pressure.', why: 'The durable history remains, while the model-visible representation is about to change.', district: 'context' };
    case 'COMPACTION_COMPLETED':
      return { title: 'Compaction completed', plain: 'Older history remains durable, while the current model context can use a summary.', why: 'This makes the History ≠ Context distinction visible under context-window pressure.', district: 'context' };
    case 'BRANCH_CREATED':
      return { title: 'A new branch appeared', plain: 'The active path diverged while previous history remained preserved.', why: 'Branching changes the active path without deleting the previous line of history.', district: 'session' };
    case 'BRANCH_SUMMARY_CREATED':
      return { title: 'A branch summary was created', plain: 'Pi summarized context from a branch transition.', why: 'A branch summary preserves useful context across a path change without flattening the whole tree.', district: 'session' };
    case 'ACTIVE_LEAF_MOVED':
      return { title: 'The active session leaf moved', plain: 'The current branch position changed without deleting old history.', why: 'The current state can move while durable history remains append-only.', district: 'session' };
    case 'MODEL_CHANGED':
      return { title: 'The active model changed', plain: 'Subsequent inference will use a different model selection.', why: 'A model switch can change downstream behavior even when the surrounding session remains the same.', district: 'model' };
    case 'THINKING_LEVEL_CHANGED':
      return { title: 'Thinking level changed', plain: 'The runtime changed the reasoning-effort setting.', why: 'Reasoning effort is part of runtime state, not a historical message shown to the model.', district: 'model' };
    case 'CONTEXT_PRESSURE_CHANGED':
      return { title: 'Context pressure changed', plain: 'The amount of available context-window capacity changed.', why: 'Context pressure can trigger compaction and alter what information survives in the next model-visible view.', district: 'context' };
    default:
      return { title: event.type, plain: 'A semantic runtime event occurred.', why: 'This event is preserved so the replay can remain faithful even when no richer explanation exists yet.', district: 'system' };
  }
}
