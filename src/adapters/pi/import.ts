import type { EvidenceLevel, SemanticTrace, TraceWarning } from '../../semantic-trace/schema';
import { asRuntimeEvents, detectPiImportKind, parseJsonl, splitSessionRecords } from './jsonl';
import { sha256Hex } from './hash';
import { normalizePiRuntime, normalizePiSession } from './normalize';
import { PI_ADAPTER_VERSION } from './version';

export interface PiImportReport {
  adapterVersion: string;
  sourceKind: 'runtime' | 'session' | 'unknown';
  validRecordCount: number;
  invalidLineCount: number;
  unsupportedEventCount: number;
  replayClosure: EvidenceLevel | 'none';
  warnings: TraceWarning[];
}

export interface PiImportResult {
  trace: SemanticTrace;
  kind: 'runtime' | 'session';
  parseErrors: Array<{ line: number; message: string; raw: string }>;
  report: PiImportReport;
}

function closureLevel(trace: SemanticTrace): EvidenceLevel | 'none' {
  const settled = [...trace.events].reverse().find((event) => event.type === 'AGENT_SETTLED');
  return settled?.evidence.level ?? 'none';
}

function buildReport(
  kind: 'runtime' | 'session',
  validRecordCount: number,
  parseErrors: PiImportResult['parseErrors'],
  trace: SemanticTrace,
): PiImportReport {
  const unsupported = trace.warnings.filter((warning) => warning.code.startsWith('unsupported')).length;
  return {
    adapterVersion: PI_ADAPTER_VERSION,
    sourceKind: kind,
    validRecordCount,
    invalidLineCount: parseErrors.length,
    unsupportedEventCount: unsupported,
    replayClosure: closureLevel(trace),
    warnings: trace.warnings,
  };
}

export function importPiJsonl(text: string): PiImportResult {
  const parsed = parseJsonl(text);
  const kind = detectPiImportKind(parsed.records);
  const sourceHash = sha256Hex(text);

  if (kind === 'runtime') {
    const trace = normalizePiRuntime(asRuntimeEvents(parsed.records));
    trace.sourceHash = sourceHash;
    trace.id = `pi-runtime-${sourceHash.slice(0, 12)}`;
    const runtimeHeader = parsed.records.find((record) => record && typeof record === 'object' && !Array.isArray(record) && (record as Record<string, unknown>).type === 'session');
    if (runtimeHeader) trace.metadata = { ...trace.metadata, sessionHeader: runtimeHeader };
    if (parsed.errors.length) {
      trace.warnings.push({
        code: 'jsonl-parse',
        message: `${parsed.errors.length} JSONL line(s) could not be parsed.`,
      });
    }
    return {
      trace,
      kind,
      parseErrors: parsed.errors,
      report: buildReport(kind, parsed.records.length, parsed.errors, trace),
    };
  }

  if (kind === 'session') {
    const { header, entries } = splitSessionRecords(parsed.records);
    const trace = normalizePiSession(entries);
    trace.sourceHash = sourceHash;
    trace.id = `pi-session-${sourceHash.slice(0, 12)}`;
    trace.metadata = { ...trace.metadata, sessionHeader: header, sessionEntries: entries };
    if (parsed.errors.length) {
      trace.warnings.push({
        code: 'jsonl-parse',
        message: `${parsed.errors.length} JSONL line(s) could not be parsed.`,
      });
    }
    return {
      trace,
      kind,
      parseErrors: parsed.errors,
      report: buildReport(kind, parsed.records.length, parsed.errors, trace),
    };
  }

  throw new Error('This file does not look like a Pi session JSONL or Pi runtime event log.');
}
