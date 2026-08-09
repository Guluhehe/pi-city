import type { SemanticTrace } from '../semantic-trace/schema';
import { eventRequestText, truncate } from './text';

export interface ToolSummary {
  name: string;
  count: number;
  errors: number;
}

export interface RunAnalysis {
  title: string;
  status: 'completed' | 'in-progress';
  durationMs?: number;
  turns: number;
  modelCalls: number;
  toolCalls: number;
  toolResults: number;
  sessionEntries: number;
  contextBuilds: number;
  tools: ToolSummary[];
  evidence: {
    observed: number;
    derived: number;
    synthetic: number;
  };
}

function timestampRange(trace: SemanticTrace): [number, number] | undefined {
  const values = trace.events
    .map((event) => event.timestamp)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (values.length < 2) return undefined;
  return [Math.min(...values), Math.max(...values)];
}

export function analyzeRun(trace: SemanticTrace): RunAnalysis {
  const firstRequest = trace.events.find((event) => event.type === 'REQUEST_ARRIVED');
  const requestText = firstRequest ? eventRequestText(firstRequest) : '';
  const toolMap = new Map<string, ToolSummary>();
  const evidence = { observed: 0, derived: 0, synthetic: 0 };
  const turns = new Set<string>();

  let modelCalls = 0;
  let toolCalls = 0;
  let toolResults = 0;
  let sessionEntries = 0;
  let contextBuilds = 0;
  let settled = false;

  for (const event of trace.events) {
    evidence[event.evidence.level] += 1;
    if (event.turnId) turns.add(event.turnId);
    if (event.type === 'MODEL_REQUEST_STARTED') modelCalls += 1;
    if (event.type === 'TOOL_CALL_CREATED') {
      toolCalls += 1;
      const name = typeof event.payload.toolName === 'string' ? event.payload.toolName : 'tool';
      const existing = toolMap.get(name) ?? { name, count: 0, errors: 0 };
      existing.count += 1;
      toolMap.set(name, existing);
    }
    if (event.type === 'TOOL_RESULT_ATTACHED') {
      toolResults += 1;
      const name = typeof event.payload.toolName === 'string' ? event.payload.toolName : 'tool';
      const existing = toolMap.get(name) ?? { name, count: 0, errors: 0 };
      if (event.payload.isError === true) existing.errors += 1;
      toolMap.set(name, existing);
    }
    if (event.type === 'SESSION_NODE_ADDED') sessionEntries += 1;
    if (event.type === 'CONTEXT_COMPILED') contextBuilds += 1;
    if (event.type === 'AGENT_SETTLED') settled = true;
  }

  const range = timestampRange(trace);
  const durationMs = range ? Math.max(0, range[1] - range[0]) : undefined;

  return {
    title: requestText ? truncate(requestText, 82) : 'Imported Pi run',
    status: settled ? 'completed' : 'in-progress',
    durationMs,
    turns: turns.size || modelCalls,
    modelCalls,
    toolCalls,
    toolResults,
    sessionEntries,
    contextBuilds,
    tools: [...toolMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    evidence,
  };
}

export function formatDuration(durationMs?: number): string {
  if (durationMs == null) return '—';
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  const totalSeconds = Math.round(durationMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}
