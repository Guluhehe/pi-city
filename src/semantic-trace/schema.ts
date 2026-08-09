export type SemanticEventType =
  | 'REQUEST_ARRIVED'
  | 'SESSION_NODE_ADDED'
  | 'CONTEXT_COMPILE_STARTED'
  | 'CONTEXT_COMPILED'
  | 'MODEL_REQUEST_STARTED'
  | 'MODEL_STREAMING'
  | 'MODEL_RESPONSE_COMPLETED'
  | 'TOOL_CALL_CREATED'
  | 'TOOL_EXECUTION_STARTED'
  | 'TOOL_EXECUTION_UPDATED'
  | 'TOOL_EXECUTION_COMPLETED'
  | 'TOOL_RESULT_ATTACHED'
  | 'TURN_COMPLETED'
  | 'AGENT_SETTLED'
  | 'CONTEXT_PRESSURE_CHANGED'
  | 'COMPACTION_STARTED'
  | 'COMPACTION_COMPLETED'
  | 'ACTIVE_LEAF_MOVED'
  | 'BRANCH_CREATED'
  | 'BRANCH_SUMMARY_CREATED'
  | 'MODEL_CHANGED'
  | 'THINKING_LEVEL_CHANGED';

export type EvidenceLevel = 'observed' | 'derived' | 'synthetic';
export type EvidenceSource = 'pi-runtime' | 'pi-session' | 'pi-combined' | 'demo';

/** Current Semantic Trace envelope version. Bump when fields/invariants change. */
export const SEMANTIC_TRACE_SCHEMA_VERSION = 1 as const;

export interface SemanticEvidence {
  level: EvidenceLevel;
  source: EvidenceSource;
  note?: string;
}

export interface SemanticEvent<T = Record<string, unknown>> {
  id: string;
  type: SemanticEventType;
  timestamp?: number;
  turnId?: string;
  artifactId?: string;
  toolCallId?: string;
  parentId?: string | null;
  evidence: SemanticEvidence;
  sourceEvent?: unknown;
  payload: T;
}

export interface TraceWarning {
  code: string;
  message: string;
  line?: number;
}

export interface TraceMetadata {
  [key: string]: unknown;
  rawEventCount?: number;
  rawEntryCount?: number;
  fileName?: string;
  importKind?: string;
  sessionHeader?: unknown;
  sessionEntries?: unknown;
  runtime?: TraceMetadata;
  session?: TraceMetadata;
  combinedSources?: EvidenceSource[];
}

export interface SemanticTrace {
  schemaVersion: typeof SEMANTIC_TRACE_SCHEMA_VERSION;
  adapterVersion: string;
  id: string;
  source: EvidenceSource;
  sourceHash?: string;
  createdAt: number;
  events: SemanticEvent[];
  warnings: TraceWarning[];
  metadata: TraceMetadata;
}

/** Normalize legacy string warnings produced before structured TraceWarning. */
export function asTraceWarnings(warnings: Array<string | TraceWarning>): TraceWarning[] {
  return warnings.map((warning) =>
    typeof warning === 'string'
      ? { code: 'legacy', message: warning }
      : warning,
  );
}
