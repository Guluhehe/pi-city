import type {
  EvidenceLevel,
  SemanticEvent,
  SemanticEventType,
  SemanticTrace,
  TraceWarning,
} from '../../semantic-trace/schema';
import { SEMANTIC_TRACE_SCHEMA_VERSION } from '../../semantic-trace/schema';
import type { PiContentBlock, PiMessage, PiRuntimeEvent, PiSessionEntry } from './types';
import { PI_ADAPTER_VERSION } from './version';

function warn(code: string, message: string): TraceWarning {
  return { code, message };
}

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}

function timestampOf(value: unknown, fallback?: number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function semanticEvent(
  type: SemanticEventType,
  source: 'pi-runtime' | 'pi-session',
  level: EvidenceLevel,
  payload: Record<string, unknown>,
  options: Partial<SemanticEvent> = {},
): SemanticEvent {
  return {
    id: options.id ?? nextId(type.toLowerCase()),
    type,
    timestamp: options.timestamp,
    turnId: options.turnId,
    artifactId: options.artifactId,
    toolCallId: options.toolCallId,
    parentId: options.parentId,
    evidence: {
      source,
      level,
      note: options.evidence?.note,
    },
    sourceEvent: options.sourceEvent,
    payload,
  };
}

function contentBlocks(message?: PiMessage): PiContentBlock[] {
  return Array.isArray(message?.content) ? message.content : [];
}

function toolCalls(message?: PiMessage) {
  return contentBlocks(message).filter(
    (block): block is Extract<PiContentBlock, { type: 'toolCall' }> =>
      block?.type === 'toolCall' &&
      typeof (block as Record<string, unknown>).id === 'string' &&
      typeof (block as Record<string, unknown>).name === 'string',
  );
}

function toolCallFromStreaming(event: PiRuntimeEvent): Record<string, unknown> | undefined {
  const assistantEvent = event.assistantMessageEvent;
  if (!assistantEvent || assistantEvent.type !== 'toolcall_end') return undefined;
  const toolCall = assistantEvent.toolCall;
  return toolCall && typeof toolCall === 'object'
    ? (toolCall as Record<string, unknown>)
    : undefined;
}

function turnId(event: PiRuntimeEvent, currentTurn: number): string {
  const explicit = typeof event.turnIndex === 'number' ? event.turnIndex : currentTurn;
  return `turn-${explicit}`;
}

export function normalizePiRuntime(events: PiRuntimeEvent[]): SemanticTrace {
  sequence = 0;
  const semantic: SemanticEvent[] = [];
  const warnings: TraceWarning[] = [];
  let currentTurn = -1;
  let lastTimestamp = 0;

  events.forEach((event, index) => {
    const ts = timestampOf(event.timestamp) ?? timestampOf(event.message?.timestamp) ?? lastTimestamp + index;
    lastTimestamp = ts;
    const sourceEvent = event;
    const push = (
      type: SemanticEventType,
      payload: Record<string, unknown>,
      level: EvidenceLevel = 'observed',
      extra: Partial<SemanticEvent> = {},
    ) =>
      semantic.push(
        semanticEvent(type, 'pi-runtime', level, payload, {
          timestamp: ts,
          turnId: currentTurn >= 0 ? turnId(event, currentTurn) : undefined,
          sourceEvent,
          ...extra,
        }),
      );

    switch (event.type) {
      case 'agent_start':
        // agent_start does not itself prove the user message contents, so no REQUEST event here.
        break;
      case 'turn_start':
        currentTurn = typeof event.turnIndex === 'number' ? event.turnIndex : currentTurn + 1;
        // Pi's RPC stream exposes turn start, but not context compilation as a first-class RPC event.
        // These two events are explicitly marked derived so the UI can explain that distinction.
        push('CONTEXT_COMPILE_STARTED', { reason: 'turn_start' }, 'derived', {
          evidence: {
            source: 'pi-runtime',
            level: 'derived',
            note: 'Derived from Pi turn_start; RPC does not expose context compilation directly.',
          },
        });
        push('CONTEXT_COMPILED', { reason: 'turn_start' }, 'derived', {
          evidence: {
            source: 'pi-runtime',
            level: 'derived',
            note: 'Derived from Pi turn_start; exact compiled context requires deeper instrumentation.',
          },
        });
        push('MODEL_REQUEST_STARTED', { turnIndex: currentTurn }, 'derived', {
          evidence: {
            source: 'pi-runtime',
            level: 'derived',
            note: 'Derived from Pi turn_start; RPC exposes turn lifecycle rather than a provider-request event.',
          },
        });
        break;
      case 'message_start':
        if (event.message?.role === 'user') {
          push('REQUEST_ARRIVED', { message: event.message });
        }
        break;
      case 'message_update': {
        const updateType = event.assistantMessageEvent?.type;
        if (updateType === 'text_delta' || updateType === 'thinking_delta') {
          push('MODEL_STREAMING', {
            streamType: updateType,
            delta: event.assistantMessageEvent?.delta,
            contentIndex: event.assistantMessageEvent?.contentIndex,
          });
        }
        const toolCall = toolCallFromStreaming(event);
        if (toolCall) {
          push(
            'TOOL_CALL_CREATED',
            {
              toolName: toolCall.name,
              args: toolCall.arguments,
              toolCall,
            },
            'observed',
            { toolCallId: String(toolCall.id ?? '') || undefined },
          );
        }
        break;
      }
      case 'message_end':
        if (event.message?.role === 'assistant') {
          // message_end is authoritative for the finalized assistant message.
          for (const call of toolCalls(event.message)) {
            const exists = semantic.some(
              (item) => item.type === 'TOOL_CALL_CREATED' && item.toolCallId === call.id,
            );
            if (!exists) {
              push(
                'TOOL_CALL_CREATED',
                { toolName: call.name, args: call.arguments, toolCall: call },
                'observed',
                { toolCallId: call.id },
              );
            }
          }
          push('MODEL_RESPONSE_COMPLETED', { message: event.message });
        } else if (event.message?.role === 'toolResult') {
          push(
            'TOOL_RESULT_ATTACHED',
            {
              toolName: event.message.toolName,
              result: event.message.content,
              isError: event.message.isError,
              message: event.message,
            },
            'observed',
            { toolCallId: event.message.toolCallId },
          );
        }
        break;
      case 'tool_execution_start':
        push(
          'TOOL_EXECUTION_STARTED',
          { toolName: event.toolName, args: event.args },
          'observed',
          { toolCallId: event.toolCallId },
        );
        break;
      case 'tool_execution_update':
        push(
          'TOOL_EXECUTION_UPDATED',
          { toolName: event.toolName, args: event.args, partialResult: event.partialResult },
          'observed',
          { toolCallId: event.toolCallId },
        );
        break;
      case 'tool_execution_end':
        push(
          'TOOL_EXECUTION_COMPLETED',
          {
            toolName: event.toolName,
            result: event.result,
            isError: event.isError,
          },
          'observed',
          { toolCallId: event.toolCallId },
        );
        break;
      case 'turn_end':
        push('TURN_COMPLETED', {
          message: event.message,
          toolResults: event.toolResults,
        });
        break;
      case 'agent_settled':
        push('AGENT_SETTLED', {});
        break;
      case 'agent_end':
        break;
      case 'compaction_start':
        push('COMPACTION_STARTED', { reason: event.reason });
        break;
      case 'compaction_end':
        push('COMPACTION_COMPLETED', {
          reason: event.reason,
          result: event.result,
          aborted: event.aborted,
          willRetry: event.willRetry,
        });
        break;
      case 'model_select':
        push('MODEL_CHANGED', { model: event.model, previousModel: event.previousModel });
        break;
      case 'thinking_level_select':
        push('THINKING_LEVEL_CHANGED', {
          level: event.level,
          previousLevel: event.previousLevel,
        });
        break;
      default:
        break;
    }
  });

  if (!semantic.some((item) => item.type === 'AGENT_SETTLED')) {
    const lastAgentEnd = [...events].reverse().find((item) => item.type === 'agent_end');
    if (lastAgentEnd) {
      semantic.push(
        semanticEvent(
          'AGENT_SETTLED',
          'pi-runtime',
          'derived',
          { messages: lastAgentEnd.messages, fallbackFrom: 'agent_end' },
          {
            timestamp: (semantic.at(-1)?.timestamp ?? 0) + 1,
            sourceEvent: lastAgentEnd,
            evidence: {
              source: 'pi-runtime',
              level: 'derived',
              note: 'Older Pi logs may lack agent_settled; replay closure is derived from the final agent_end.',
            },
          },
        ),
      );
    }
  }

  if (!semantic.length) warnings.push(warn('empty-runtime', 'No supported Pi runtime events were found.'));

  return {
    schemaVersion: SEMANTIC_TRACE_SCHEMA_VERSION,
    adapterVersion: PI_ADAPTER_VERSION,
    id: 'pi-runtime-normalized',
    source: 'pi-runtime',
    createdAt: Math.max(0, ...semantic.map((event) => event.timestamp ?? 0)),
    events: semantic,
    warnings,
    metadata: { rawEventCount: events.length },
  };
}

export function normalizePiSession(entries: PiSessionEntry[]): SemanticTrace {
  sequence = 0;
  const semantic: SemanticEvent[] = [];
  const warnings: TraceWarning[] = [];
  let previousParent: string | null | undefined;

  entries.forEach((entry, index) => {
    const ts = timestampOf(entry.timestamp, index);
    const entryId = String(entry.id ?? `session-${index}`);
    const parentId = entry.parentId ?? null;

    if (index > 0 && previousParent !== undefined && parentId !== entries[index - 1]?.id) {
      semantic.push(
        semanticEvent(
          'BRANCH_CREATED',
          'pi-session',
          'derived',
          { entryId, parentId, previousEntryId: entries[index - 1]?.id },
          {
            timestamp: ts,
            parentId,
            sourceEvent: entry,
            evidence: {
              source: 'pi-session',
              level: 'derived',
              note: 'Derived from append order diverging from the previous entry id.',
            },
          },
        ),
      );
    }
    previousParent = parentId;

    if (entry.type === 'message' && entry.message) {
      const role = entry.message.role;
      if (role === 'user') {
        semantic.push(
          semanticEvent(
            'REQUEST_ARRIVED',
            'pi-session',
            'derived',
            { message: entry.message },
            {
              timestamp: ts,
              artifactId: entryId,
              sourceEvent: entry,
              evidence: {
                source: 'pi-session',
                level: 'derived',
                note: 'The session proves the user message existed; arrival timing is reconstructed.',
              },
            },
          ),
        );
      }

      if (role === 'assistant') {
        for (const call of toolCalls(entry.message)) {
          semantic.push(
            semanticEvent(
              'TOOL_CALL_CREATED',
              'pi-session',
              'observed',
              { toolName: call.name, args: call.arguments, toolCall: call },
              {
                timestamp: ts,
                toolCallId: call.id,
                artifactId: entryId,
                sourceEvent: entry,
              },
            ),
          );
        }
        semantic.push(
          semanticEvent(
            'MODEL_RESPONSE_COMPLETED',
            'pi-session',
            'derived',
            { message: entry.message },
            {
              timestamp: ts,
              artifactId: entryId,
              sourceEvent: entry,
              evidence: {
                source: 'pi-session',
                level: 'derived',
                note: 'Session persistence records the final assistant message, not the live model request lifecycle.',
              },
            },
          ),
        );
      }

      if (role === 'toolResult') {
        semantic.push(
          semanticEvent(
            'TOOL_RESULT_ATTACHED',
            'pi-session',
            'observed',
            {
              toolName: entry.message.toolName,
              result: entry.message.content,
              isError: entry.message.isError,
              message: entry.message,
            },
            {
              timestamp: ts,
              toolCallId: entry.message.toolCallId,
              artifactId: entryId,
              sourceEvent: entry,
            },
          ),
        );
      }

      semantic.push(
        semanticEvent(
          'SESSION_NODE_ADDED',
          'pi-session',
          'observed',
          { entryType: entry.type, role, message: entry.message },
          {
            id: `session-node-${entryId}`,
            timestamp: ts,
            artifactId: entryId,
            parentId,
            sourceEvent: entry,
          },
        ),
      );
      return;
    }

    if (entry.type === 'compaction' || entry.message?.role === 'compactionSummary') {
      semantic.push(
        semanticEvent(
          'COMPACTION_COMPLETED',
          'pi-session',
          'observed',
          {
            summary: entry.summary ?? entry.message?.summary,
            tokensBefore: entry.tokensBefore ?? entry.message?.tokensBefore,
            firstKeptEntryId: entry.firstKeptEntryId,
          },
          { timestamp: ts, artifactId: entryId, parentId, sourceEvent: entry },
        ),
      );
    } else if (entry.type === 'branch_summary' || entry.message?.role === 'branchSummary') {
      semantic.push(
        semanticEvent(
          'BRANCH_SUMMARY_CREATED',
          'pi-session',
          'observed',
          { summary: entry.summary ?? entry.message?.summary, fromId: entry.fromId ?? entry.message?.fromId },
          { timestamp: ts, artifactId: entryId, parentId, sourceEvent: entry },
        ),
      );
    } else if (entry.type === 'model_change') {
      semantic.push(
        semanticEvent(
          'MODEL_CHANGED',
          'pi-session',
          'observed',
          { model: entry.model, provider: entry.provider },
          { timestamp: ts, artifactId: entryId, parentId, sourceEvent: entry },
        ),
      );
    } else if (entry.type === 'thinking_level_change') {
      semantic.push(
        semanticEvent(
          'THINKING_LEVEL_CHANGED',
          'pi-session',
          'observed',
          { level: entry.level },
          { timestamp: ts, artifactId: entryId, parentId, sourceEvent: entry },
        ),
      );
    }
  });

  if (!semantic.some((event) => event.type === 'AGENT_SETTLED') && semantic.length) {
    semantic.push(
      semanticEvent(
        'AGENT_SETTLED',
        'pi-session',
        'synthetic',
        { reason: 'end-of-import' },
        {
          timestamp: (semantic.at(-1)?.timestamp ?? 0) + 1,
          evidence: {
            source: 'pi-session',
            level: 'synthetic',
            note: 'Session files do not record live settled lifecycle; added to close replay.',
          },
        },
      ),
    );
  }

  if (!semantic.length) warnings.push(warn('empty-session', 'No supported Pi session entries were found.'));

  return {
    schemaVersion: SEMANTIC_TRACE_SCHEMA_VERSION,
    adapterVersion: PI_ADAPTER_VERSION,
    id: 'pi-session-normalized',
    source: 'pi-session',
    createdAt: Math.max(0, ...semantic.map((event) => event.timestamp ?? 0)),
    events: semantic,
    warnings,
    metadata: { rawEntryCount: entries.length },
  };
}
