import type { SemanticEvent } from './schema';

export interface EventExplanation {
  title: string;
  plain: string;
  district: 'arrival' | 'session' | 'context' | 'model' | 'tool' | 'system';
}

export function explainEvent(event: SemanticEvent): EventExplanation {
  const toolName = typeof event.payload.toolName === 'string' ? event.payload.toolName : 'tool';

  switch (event.type) {
    case 'REQUEST_ARRIVED':
      return { title: 'A request entered the city', plain: 'A user message became new work for the Agent.', district: 'arrival' };
    case 'SESSION_NODE_ADDED':
      return { title: 'Session history grew', plain: 'Pi persisted another durable entry in the session tree.', district: 'session' };
    case 'CONTEXT_COMPILE_STARTED':
      return { title: 'Context assembly started', plain: 'Pi is preparing the current view that will be sent to the model.', district: 'context' };
    case 'CONTEXT_COMPILED':
      return { title: 'A model context is ready', plain: 'The next model call sees a selected, compiled view rather than raw session history.', district: 'context' };
    case 'MODEL_REQUEST_STARTED':
      return { title: 'The model was called', plain: 'A new reasoning turn started with the current context.', district: 'model' };
    case 'MODEL_STREAMING':
      return { title: 'The model is streaming', plain: 'The assistant is producing text, thinking, or tool-call content.', district: 'model' };
    case 'MODEL_RESPONSE_COMPLETED':
      return { title: 'The model response completed', plain: 'The assistant message for this model call is complete.', district: 'model' };
    case 'TOOL_CALL_CREATED':
      return { title: `The model requested ${toolName}`, plain: 'The model chose an action; the harness still has to execute it.', district: 'model' };
    case 'TOOL_EXECUTION_STARTED':
      return { title: `${toolName} started`, plain: 'Pi began executing the requested tool outside the model.', district: 'tool' };
    case 'TOOL_EXECUTION_UPDATED':
      return { title: `${toolName} is running`, plain: 'The tool emitted partial progress while execution continues.', district: 'tool' };
    case 'TOOL_EXECUTION_COMPLETED':
      return { title: `${toolName} finished`, plain: 'Tool execution completed and produced a result.', district: 'tool' };
    case 'TOOL_RESULT_ATTACHED':
      return { title: 'The tool result returned to the Agent', plain: 'The result becomes evidence for the next reasoning step, not the user-facing answer by itself.', district: 'session' };
    case 'TURN_COMPLETED':
      return { title: 'One Agent turn completed', plain: 'An assistant response and its tool work finished as one turn.', district: 'system' };
    case 'AGENT_SETTLED':
      return { title: 'The Agent settled', plain: 'No automatic retry, compaction retry, or queued continuation remains.', district: 'system' };
    case 'COMPACTION_STARTED':
      return { title: 'Compaction started', plain: 'Pi began summarizing older context to reduce context-window pressure.', district: 'context' };
    case 'COMPACTION_COMPLETED':
      return { title: 'Compaction completed', plain: 'Older history remains durable, while the current model context can use a summary.', district: 'context' };
    case 'BRANCH_CREATED':
      return { title: 'A new branch appeared', plain: 'The active path diverged while previous history remained preserved.', district: 'session' };
    case 'BRANCH_SUMMARY_CREATED':
      return { title: 'A branch summary was created', plain: 'Pi summarized context from a branch transition.', district: 'session' };
    case 'ACTIVE_LEAF_MOVED':
      return { title: 'The active session leaf moved', plain: 'The current branch position changed without deleting old history.', district: 'session' };
    case 'MODEL_CHANGED':
      return { title: 'The active model changed', plain: 'Subsequent inference will use a different model selection.', district: 'model' };
    case 'THINKING_LEVEL_CHANGED':
      return { title: 'Thinking level changed', plain: 'The runtime changed the reasoning-effort setting.', district: 'model' };
    case 'CONTEXT_PRESSURE_CHANGED':
      return { title: 'Context pressure changed', plain: 'The amount of available context-window capacity changed.', district: 'context' };
    default:
      return { title: event.type, plain: 'A semantic runtime event occurred.', district: 'system' };
  }
}
