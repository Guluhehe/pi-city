export interface PiTextContent {
  type: 'text';
  text: string;
}

export interface PiThinkingContent {
  type: 'thinking';
  thinking: string;
}

export interface PiToolCallContent {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type PiContentBlock =
  | PiTextContent
  | PiThinkingContent
  | PiToolCallContent
  | Record<string, unknown>;

export interface PiMessage {
  role?: string;
  content?: string | PiContentBlock[];
  timestamp?: number;
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
  model?: string;
  provider?: string;
  stopReason?: string;
  usage?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PiSessionHeader {
  type?: 'session';
  version?: number;
  id?: string;
  timestamp?: string | number;
  cwd?: string;
  [key: string]: unknown;
}

export interface PiSessionEntry {
  id?: string;
  parentId?: string | null;
  type?: string;
  timestamp?: string | number;
  message?: PiMessage;
  model?: string;
  provider?: string;
  level?: string;
  summary?: string;
  fromId?: string;
  firstKeptEntryId?: string;
  tokensBefore?: number;
  [key: string]: unknown;
}

export interface PiRuntimeEvent {
  type?: string;
  timestamp?: number | string;
  turnIndex?: number;
  message?: PiMessage;
  assistantMessageEvent?: Record<string, unknown>;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  partialResult?: unknown;
  result?: unknown;
  isError?: boolean;
  reason?: string;
  willRetry?: boolean;
  previousModel?: unknown;
  model?: unknown;
  level?: string;
  previousLevel?: string;
  [key: string]: unknown;
}

export interface ParsedJsonl<T = unknown> {
  records: T[];
  errors: Array<{ line: number; message: string; raw: string }>;
}

export type PiImportKind = 'session' | 'runtime' | 'unknown';
