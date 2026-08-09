import type { SemanticEvent, SemanticTrace } from './schema';

export interface RuntimeState {
  activeEventId?: string;
  activeTurnId?: string;
  activeToolCallIds: string[];
  sessionEntries: number;
  contextBuilds: number;
  modelCalls: number;
  toolCalls: number;
  toolResults: number;
  compactions: number;
  branches: number;
  settled: boolean;
  model?: string;
  thinkingLevel?: string;
}

export const initialRuntimeState: RuntimeState = {
  activeToolCallIds: [],
  sessionEntries: 0,
  contextBuilds: 0,
  modelCalls: 0,
  toolCalls: 0,
  toolResults: 0,
  compactions: 0,
  branches: 0,
  settled: false,
};

export function reduceRuntimeState(
  state: RuntimeState,
  event: SemanticEvent,
): RuntimeState {
  const next: RuntimeState = {
    ...state,
    activeToolCallIds: [...state.activeToolCallIds],
    activeEventId: event.id,
    activeTurnId: event.turnId ?? state.activeTurnId,
  };

  switch (event.type) {
    case 'SESSION_NODE_ADDED':
      next.sessionEntries += 1;
      break;
    case 'CONTEXT_COMPILED':
      next.contextBuilds += 1;
      break;
    case 'MODEL_REQUEST_STARTED':
      next.modelCalls += 1;
      break;
    case 'TOOL_CALL_CREATED':
      next.toolCalls += 1;
      break;
    case 'TOOL_EXECUTION_STARTED':
      if (event.toolCallId && !next.activeToolCallIds.includes(event.toolCallId)) {
        next.activeToolCallIds.push(event.toolCallId);
      }
      break;
    case 'TOOL_EXECUTION_COMPLETED':
      if (event.toolCallId) {
        next.activeToolCallIds = next.activeToolCallIds.filter(
          (id) => id !== event.toolCallId,
        );
      }
      break;
    case 'TOOL_RESULT_ATTACHED':
      next.toolResults += 1;
      break;
    case 'COMPACTION_COMPLETED':
      next.compactions += 1;
      break;
    case 'BRANCH_CREATED':
      next.branches += 1;
      break;
    case 'MODEL_CHANGED':
      if (typeof event.payload.model === 'string') next.model = event.payload.model;
      break;
    case 'THINKING_LEVEL_CHANGED':
      if (typeof event.payload.level === 'string') {
        next.thinkingLevel = event.payload.level;
      }
      break;
    case 'AGENT_SETTLED':
      next.settled = true;
      next.activeToolCallIds = [];
      break;
    default:
      break;
  }

  return next;
}

export interface TraceFrame {
  index: number;
  event: SemanticEvent;
  state: RuntimeState;
}

export function buildTraceFrames(trace: SemanticTrace): TraceFrame[] {
  let state = initialRuntimeState;
  return trace.events.map((event, index) => {
    state = reduceRuntimeState(state, event);
    return { index, event, state };
  });
}
