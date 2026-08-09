import type { SemanticEvent } from '../../semantic-trace/schema';
import type { PiRuntimeEvent, PiSessionEntry } from './types';

export function normalizePiSession(
  entries: PiSessionEntry[],
): SemanticEvent[] {
  // TODO(v0.1): map Pi Session JSONL tree entries into durable semantic events.
  return entries.map((entry, index) => ({
    id: String(entry.id ?? `session-${index}`),
    type: 'SESSION_NODE_ADDED',
    sourceEvent: entry,
    payload: { entry },
  }));
}

export function normalizePiRuntime(
  events: PiRuntimeEvent[],
): SemanticEvent[] {
  // TODO(v0.1): normalize Pi runtime lifecycle/tool/model events.
  void events;
  return [];
}
