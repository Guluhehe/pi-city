import type { SemanticEvent } from './schema';

export interface RuntimeState {
  activeEventId?: string;
  sessionEntries: number;
  modelCalls: number;
  toolCalls: number;
  settled: boolean;
}

export const initialRuntimeState: RuntimeState = {
  sessionEntries: 0,
  modelCalls: 0,
  toolCalls: 0,
  settled: false,
};

export function reduceRuntimeState(
  state: RuntimeState,
  event: SemanticEvent,
): RuntimeState {
  const next = { ...state, activeEventId: event.id };

  if (event.type === 'SESSION_NODE_ADDED') next.sessionEntries += 1;
  if (event.type === 'MODEL_REQUEST_STARTED') next.modelCalls += 1;
  if (event.type === 'TOOL_CALL_CREATED') next.toolCalls += 1;
  if (event.type === 'AGENT_SETTLED') next.settled = true;

  return next;
}
