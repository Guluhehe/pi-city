import type {
  ParsedJsonl,
  PiImportKind,
  PiRuntimeEvent,
  PiSessionEntry,
  PiSessionHeader,
} from './types';

export function parseJsonl<T = unknown>(text: string): ParsedJsonl<T> {
  const records: T[] = [];
  const errors: ParsedJsonl<T>['errors'] = [];

  text.split(/\n/).forEach((rawLine, index) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line.trim()) return;
    try {
      records.push(JSON.parse(line) as T);
    } catch (error) {
      errors.push({
        line: index + 1,
        raw: line,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return { records, errors };
}

export function detectPiImportKind(records: unknown[]): PiImportKind {
  const objects = records.filter(
    (record): record is Record<string, unknown> =>
      Boolean(record) && typeof record === 'object' && !Array.isArray(record),
  );
  if (!objects.length) return 'unknown';

  const runtimeTypes = new Set([
    'agent_start',
    'agent_end',
    'agent_settled',
    'turn_start',
    'turn_end',
    'message_start',
    'message_update',
    'message_end',
    'tool_execution_start',
    'tool_execution_update',
    'tool_execution_end',
    'compaction_start',
    'compaction_end',
    'model_select',
    'thinking_level_select',
  ]);

  if (objects.some((record) => runtimeTypes.has(String(record.type)))) {
    return 'runtime';
  }

  const looksLikeSession = objects.some(
    (record) =>
      'parentId' in record ||
      record.type === 'session' ||
      (record.type === 'message' && 'message' in record),
  );
  return looksLikeSession ? 'session' : 'unknown';
}

export function splitSessionRecords(records: unknown[]): {
  header?: PiSessionHeader;
  entries: PiSessionEntry[];
} {
  let header: PiSessionHeader | undefined;
  const entries: PiSessionEntry[] = [];

  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue;
    const value = record as Record<string, unknown>;
    if (!header && value.type === 'session' && !('parentId' in value)) {
      header = value as PiSessionHeader;
      continue;
    }
    entries.push(value as PiSessionEntry);
  }

  return { header, entries };
}

export function asRuntimeEvents(records: unknown[]): PiRuntimeEvent[] {
  return records.filter(
    (record): record is PiRuntimeEvent =>
      Boolean(record) && typeof record === 'object' && !Array.isArray(record),
  );
}
