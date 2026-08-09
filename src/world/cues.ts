import type { SemanticEvent } from '../semantic-trace/schema';

export type WorldDistrict = 'arrival' | 'session' | 'context' | 'model' | 'tool' | 'system';
export type WorldArtifact =
  | 'request-vessel'
  | 'session-record'
  | 'context-material'
  | 'context-capsule'
  | 'work-order'
  | 'tool-result'
  | 'answer'
  | 'none';
export type WorldAction =
  | 'arrive'
  | 'file'
  | 'select'
  | 'seal'
  | 'deliberate'
  | 'dispatch'
  | 'execute'
  | 'return'
  | 'settle'
  | 'signal';

export interface WorldCue {
  district: WorldDistrict;
  artifact: WorldArtifact;
  action: WorldAction;
  camera: 'world' | 'follow' | 'close' | 'cutaway' | 'hold' | 'decision' | 'pullback';
  intensity: 'ambient' | 'active' | 'hero';
}

export function toWorldCue(event: SemanticEvent): WorldCue {
  switch (event.type) {
    case 'REQUEST_ARRIVED':
      return { district: 'arrival', artifact: 'request-vessel', action: 'arrive', camera: 'follow', intensity: 'hero' };
    case 'SESSION_NODE_ADDED':
      return { district: 'session', artifact: 'session-record', action: 'file', camera: 'close', intensity: 'active' };
    case 'CONTEXT_COMPILE_STARTED':
      return { district: 'context', artifact: 'context-material', action: 'select', camera: 'cutaway', intensity: 'active' };
    case 'CONTEXT_COMPILED':
      return { district: 'context', artifact: 'context-capsule', action: 'seal', camera: 'cutaway', intensity: 'hero' };
    case 'MODEL_REQUEST_STARTED':
    case 'MODEL_STREAMING':
      return { district: 'model', artifact: 'context-capsule', action: 'deliberate', camera: 'hold', intensity: 'active' };
    case 'TOOL_CALL_CREATED':
      return { district: 'model', artifact: 'work-order', action: 'dispatch', camera: 'decision', intensity: 'hero' };
    case 'TOOL_EXECUTION_STARTED':
    case 'TOOL_EXECUTION_UPDATED':
      return { district: 'tool', artifact: 'work-order', action: 'execute', camera: 'follow', intensity: 'active' };
    case 'TOOL_EXECUTION_COMPLETED':
      return { district: 'tool', artifact: 'tool-result', action: 'execute', camera: 'close', intensity: 'hero' };
    case 'TOOL_RESULT_ATTACHED':
      return { district: 'session', artifact: 'tool-result', action: 'return', camera: 'follow', intensity: 'hero' };
    case 'MODEL_RESPONSE_COMPLETED':
      return { district: 'model', artifact: 'answer', action: 'deliberate', camera: 'hold', intensity: 'active' };
    case 'AGENT_SETTLED':
      return { district: 'system', artifact: 'answer', action: 'settle', camera: 'pullback', intensity: 'hero' };
    default:
      return { district: 'system', artifact: 'none', action: 'signal', camera: 'world', intensity: 'ambient' };
  }
}
