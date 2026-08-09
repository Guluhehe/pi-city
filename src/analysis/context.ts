import type { EvidenceLevel, SemanticEvent, SemanticTrace } from '../semantic-trace/schema';
import { eventRequestText, truncate } from './text';

export type ContextItemKind = 'request' | 'tool-call' | 'tool-result';

export interface ContextItem {
  key: string;
  kind: ContextItemKind;
  label: string;
  detail: string;
  eventId: string;
  evidence: EvidenceLevel;
}

export interface ContextSnapshot {
  number: number;
  eventIndex: number;
  eventId: string;
  turnId?: string;
  items: ContextItem[];
  evidence: EvidenceLevel;
}

export interface ContextDiff {
  previous?: ContextSnapshot;
  current: ContextSnapshot;
  added: ContextItem[];
  removed: ContextItem[];
  retained: ContextItem[];
}

function argsSummary(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const object = value as Record<string, unknown>;
  const preferred = ['path', 'query', 'command', 'file', 'pattern'];
  for (const key of preferred) {
    if (typeof object[key] === 'string') return String(object[key]);
  }
  const json = JSON.stringify(value);
  return json === '{}' ? '' : truncate(json, 80);
}

function contextItem(event: SemanticEvent): ContextItem | undefined {
  if (event.type === 'REQUEST_ARRIVED') {
    return {
      key: `request:${event.artifactId ?? event.id}`,
      kind: 'request',
      label: 'User request',
      detail: truncate(eventRequestText(event) || 'User message', 100),
      eventId: event.id,
      evidence: event.evidence.level,
    };
  }
  if (event.type === 'TOOL_CALL_CREATED') {
    const toolName = typeof event.payload.toolName === 'string' ? event.payload.toolName : 'tool';
    const args = argsSummary(event.payload.args);
    return {
      key: `tool-call:${event.toolCallId ?? event.id}`,
      kind: 'tool-call',
      label: `${toolName} call`,
      detail: args || 'Tool arguments',
      eventId: event.id,
      evidence: event.evidence.level,
    };
  }
  if (event.type === 'TOOL_RESULT_ATTACHED') {
    const toolName = typeof event.payload.toolName === 'string' ? event.payload.toolName : 'tool';
    return {
      key: `tool-result:${event.toolCallId ?? event.id}`,
      kind: 'tool-result',
      label: `${toolName} result`,
      detail: event.payload.isError === true ? 'Tool returned an error' : 'New evidence returned by the tool',
      eventId: event.id,
      evidence: event.evidence.level,
    };
  }
  return undefined;
}

export function buildContextSnapshots(trace: SemanticTrace): ContextSnapshot[] {
  const snapshots: ContextSnapshot[] = [];
  const accumulated = new Map<string, ContextItem>();

  trace.events.forEach((event, index) => {
    const item = contextItem(event);
    if (item) accumulated.set(item.key, item);

    if (event.type === 'MODEL_REQUEST_STARTED') {
      snapshots.push({
        number: snapshots.length + 1,
        eventIndex: index,
        eventId: event.id,
        turnId: event.turnId,
        items: [...accumulated.values()],
        evidence: event.evidence.level,
      });
    }
  });

  return snapshots;
}

export function compareContextSnapshots(current: ContextSnapshot, previous?: ContextSnapshot): ContextDiff {
  const previousMap = new Map((previous?.items ?? []).map((item) => [item.key, item]));
  const currentMap = new Map(current.items.map((item) => [item.key, item]));
  return {
    previous,
    current,
    added: current.items.filter((item) => !previousMap.has(item.key)),
    removed: (previous?.items ?? []).filter((item) => !currentMap.has(item.key)),
    retained: current.items.filter((item) => previousMap.has(item.key)),
  };
}

export function activeContextSnapshot(snapshots: ContextSnapshot[], activeIndex: number): ContextSnapshot | undefined {
  return [...snapshots].reverse().find((snapshot) => snapshot.eventIndex <= activeIndex);
}
