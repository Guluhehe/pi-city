import type { SemanticEvent } from '../semantic-trace/schema';

export type AgentActionClass = 'read' | 'edit' | 'bash' | 'answer';
export type ToolActionClass = Exclude<AgentActionClass, 'answer'>;

export const INSPECT_TOOLS = new Set(['read', 'grep', 'find', 'ls', 'search', 'glob']);
export const CHANGE_TOOLS = new Set(['edit', 'write', 'patch', 'apply_patch']);
export const EXECUTE_TOOLS = new Set(['bash', 'shell', 'terminal', 'exec']);

export function classifyToolName(toolName: string): ToolActionClass | undefined {
  const name = toolName.toLowerCase();
  if (INSPECT_TOOLS.has(name)) return 'read';
  if (CHANGE_TOOLS.has(name)) return 'edit';
  if (EXECUTE_TOOLS.has(name)) return 'bash';
  return undefined;
}

export function eventToolName(event: SemanticEvent): string | undefined {
  return typeof event.payload.toolName === 'string' ? event.payload.toolName : undefined;
}
