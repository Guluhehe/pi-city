import type { SemanticTrace } from '../../semantic-trace/schema';
import { asRuntimeEvents, detectPiImportKind, parseJsonl, splitSessionRecords } from './jsonl';
import { normalizePiRuntime, normalizePiSession } from './normalize';

export interface PiImportResult {
  trace: SemanticTrace;
  kind: 'runtime' | 'session';
  parseErrors: Array<{ line: number; message: string; raw: string }>;
}

export function importPiJsonl(text: string): PiImportResult {
  const parsed = parseJsonl(text);
  const kind = detectPiImportKind(parsed.records);

  if (kind === 'runtime') {
    const trace = normalizePiRuntime(asRuntimeEvents(parsed.records));
    const runtimeHeader = parsed.records.find((record) => record && typeof record === 'object' && !Array.isArray(record) && (record as Record<string, unknown>).type === 'session');
    if (runtimeHeader) trace.metadata = { ...trace.metadata, sessionHeader: runtimeHeader };
    if (parsed.errors.length) trace.warnings.push(`${parsed.errors.length} JSONL line(s) could not be parsed.`);
    return { trace, kind, parseErrors: parsed.errors };
  }

  if (kind === 'session') {
    const { header, entries } = splitSessionRecords(parsed.records);
    const trace = normalizePiSession(entries);
    trace.metadata = { ...trace.metadata, sessionHeader: header, sessionEntries: entries };
    if (parsed.errors.length) trace.warnings.push(`${parsed.errors.length} JSONL line(s) could not be parsed.`);
    return { trace, kind, parseErrors: parsed.errors };
  }

  throw new Error('This file does not look like a Pi session JSONL or Pi runtime event log.');
}
