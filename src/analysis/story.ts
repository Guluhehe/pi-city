import type { SemanticEvent, SemanticTrace } from '../semantic-trace/schema';
import { classifyToolName, eventToolName } from './action-classes';
import { eventRequestText, truncate } from './text';

export type StoryStepKind = 'request' | 'inspect' | 'change' | 'execute' | 'reason' | 'answer' | 'complete';

export interface StoryTool {
  name: string;
  callId?: string;
  args?: unknown;
}

export interface StoryStep {
  id: string;
  kind: StoryStepKind;
  title: string;
  summary: string;
  startIndex: number;
  endIndex: number;
  eventIndices: number[];
  turnId?: string;
  tools: StoryTool[];
}

function classifyTools(tools: StoryTool[], hasResponse: boolean, isLastTurn: boolean): Pick<StoryStep, 'kind' | 'title' | 'summary'> {
  if (!tools.length) {
    if (hasResponse && isLastTurn) return { kind: 'answer', title: 'Answer the user', summary: 'The model returned a user-facing response after the available evidence was incorporated.' };
    return { kind: 'reason', title: 'Reason about the evidence', summary: 'The model processed the current context without dispatching a tool.' };
  }

  const names = tools.map((tool) => tool.name.toLowerCase());
  const actionClasses = names.map(classifyToolName);
  const hasInspect = actionClasses.includes('read');
  const hasChange = actionClasses.includes('edit');
  const hasExecute = actionClasses.includes('bash');
  const unique = [...new Set(names)];

  if (hasChange && hasExecute) {
    return { kind: 'change', title: 'Change and verify', summary: `The Agent modified the project and then ran ${unique.join(', ')} to check the result.` };
  }
  if (hasChange) {
    return { kind: 'change', title: 'Modify the project', summary: `The Agent dispatched ${tools.length} change ${tools.length === 1 ? 'operation' : 'operations'}: ${unique.join(', ')}.` };
  }
  if (hasInspect && !hasExecute) {
    return { kind: 'inspect', title: 'Inspect evidence', summary: `The Agent gathered evidence with ${unique.join(', ')} before deciding what to do next.` };
  }
  if (hasExecute && !hasInspect) {
    return { kind: 'execute', title: 'Run commands', summary: `The Agent used ${unique.join(', ')} to execute or validate work outside the model.` };
  }
  return { kind: 'execute', title: 'Use external tools', summary: `The Agent dispatched ${tools.length} tool ${tools.length === 1 ? 'call' : 'calls'} across ${unique.join(', ')}.` };
}

export function buildStory(trace: SemanticTrace): StoryStep[] {
  const steps: StoryStep[] = [];
  const requestIndices = trace.events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.type === 'REQUEST_ARRIVED');

  requestIndices.forEach(({ event, index }, requestNumber) => {
    const text = eventRequestText(event);
    steps.push({
      id: `request-${requestNumber + 1}`,
      kind: 'request',
      title: requestNumber === 0 ? 'Understand the request' : 'Receive a follow-up request',
      summary: text ? truncate(text, 120) : 'A user message entered the Agent runtime.',
      startIndex: index,
      endIndex: index,
      eventIndices: [index],
      turnId: event.turnId,
      tools: [],
    });
  });

  const byTurn = new Map<string, Array<{ event: SemanticEvent; index: number }>>();
  trace.events.forEach((event, index) => {
    if (!event.turnId || event.type === 'REQUEST_ARRIVED' || event.type === 'SESSION_NODE_ADDED' || event.type === 'AGENT_SETTLED') return;
    const list = byTurn.get(event.turnId) ?? [];
    list.push({ event, index });
    byTurn.set(event.turnId, list);
  });

  const turnGroups = [...byTurn.entries()].sort((a, b) => a[1][0].index - b[1][0].index);
  turnGroups.forEach(([turnId, group], turnPosition) => {
    const toolCalls = group
      .filter(({ event }) => event.type === 'TOOL_CALL_CREATED')
      .map(({ event }) => ({
        name: eventToolName(event) ?? 'tool',
        callId: event.toolCallId,
        args: event.payload.args,
      }));
    const hasResponse = group.some(({ event }) => event.type === 'MODEL_RESPONSE_COMPLETED');
    const story = classifyTools(toolCalls, hasResponse, turnPosition === turnGroups.length - 1);
    steps.push({
      id: `turn-${turnId}`,
      ...story,
      startIndex: group[0].index,
      endIndex: group.at(-1)?.index ?? group[0].index,
      eventIndices: group.map(({ index }) => index),
      turnId,
      tools: toolCalls,
    });
  });

  const settledIndex = trace.events.findIndex((event) => event.type === 'AGENT_SETTLED');
  if (settledIndex >= 0) {
    steps.push({
      id: 'settled',
      kind: 'complete',
      title: 'Run completed',
      summary: 'No queued continuation or automatic retry remains. The Agent is settled.',
      startIndex: settledIndex,
      endIndex: settledIndex,
      eventIndices: [settledIndex],
      tools: [],
    });
  }

  return steps.sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}
