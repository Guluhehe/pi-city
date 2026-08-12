import type { SemanticEvent, SemanticTrace } from './schema';
import { SEMANTIC_TRACE_SCHEMA_VERSION } from './schema';
import { PI_ADAPTER_VERSION } from '../adapters/pi/version';
import { sha256Hex } from '../adapters/pi/hash';

const MISSING_TIMESTAMP_SORT = Number.MAX_SAFE_INTEGER;

function runtimeToolKey(event: SemanticEvent): string | undefined {
  if (!event.toolCallId) return undefined;
  if (
    event.type === 'TOOL_CALL_CREATED' ||
    event.type === 'TOOL_RESULT_ATTACHED' ||
    event.type === 'TOOL_EXECUTION_STARTED' ||
    event.type === 'TOOL_EXECUTION_UPDATED' ||
    event.type === 'TOOL_EXECUTION_COMPLETED'
  ) {
    return `${event.type}:${event.toolCallId}`;
  }
  return undefined;
}

export function mergePiTraces(runtime: SemanticTrace, session: SemanticTrace): SemanticTrace {
  const runtimeTypes = new Set(runtime.events.map((event) => event.type));
  const runtimeToolKeys = new Set(runtime.events.map(runtimeToolKey).filter(Boolean));

  const sessionEvents = session.events.filter((event) => {
    if (event.type === 'SESSION_NODE_ADDED') return true;
    if (event.type === 'BRANCH_CREATED' || event.type === 'BRANCH_SUMMARY_CREATED' || event.type === 'ACTIVE_LEAF_MOVED') return true;
    if (event.type === 'MODEL_CHANGED' || event.type === 'THINKING_LEVEL_CHANGED') return !runtimeTypes.has(event.type);
    if (event.type === 'REQUEST_ARRIVED') return !runtimeTypes.has('REQUEST_ARRIVED');
    if (event.type === 'MODEL_RESPONSE_COMPLETED') return !runtimeTypes.has('MODEL_RESPONSE_COMPLETED');
    if (event.type === 'AGENT_SETTLED') return !runtimeTypes.has('AGENT_SETTLED');

    const key = runtimeToolKey(event);
    if (key && runtimeToolKeys.has(key)) return false;
    return true;
  });

  const ordered = [...runtime.events, ...sessionEvents]
    .map((event, order) => ({ event, order }))
    .sort((a, b) => {
      const at = a.event.timestamp ?? MISSING_TIMESTAMP_SORT;
      const bt = b.event.timestamp ?? MISSING_TIMESTAMP_SORT;
      return at === bt ? a.order - b.order : at - bt;
    })
    .map(({ event }, index) => ({ ...event, id: `combined-${String(index + 1).padStart(4, '0')}-${event.id}` }));

  const sourceHash = sha256Hex(`${runtime.sourceHash ?? runtime.id}\n${session.sourceHash ?? session.id}`);

  return {
    schemaVersion: SEMANTIC_TRACE_SCHEMA_VERSION,
    adapterVersion: PI_ADAPTER_VERSION,
    id: `pi-combined-${sourceHash.slice(0, 12)}`,
    source: 'pi-combined',
    sourceHash,
    createdAt: Math.max(runtime.createdAt, session.createdAt),
    events: ordered,
    warnings: [...runtime.warnings, ...session.warnings],
    metadata: {
      runtime: runtime.metadata,
      session: session.metadata,
      sessionEntries: session.metadata.sessionEntries,
      combinedSources: ['pi-runtime', 'pi-session'],
    },
  };
}
