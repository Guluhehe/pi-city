export interface RedactionReport {
  secrets: number;
  paths: number;
  emails: number;
  contents: number;
}

const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\b(?:api[_-]?key|token|secret|password|passwd|auth)\s*[:=]\s*['"]?([^\s'"]+)/gi,
  /\bsk-(?:live|test|proj)-[A-Za-z0-9\-]+/gi,
  /\bsk-[A-Za-z0-9]{16,}/gi,
  /\bghp_[A-Za-z0-9]{20,}/gi,
  /\bgho_[A-Za-z0-9]{20,}/gi,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/gi,
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const ABSOLUTE_PATH_PATTERN =
  /(?:\/(?:Users|home|private|var|tmp|opt|root)\/[^\s'"\\]+|[A-Za-z]:\\[^\s'"\\]+)/g;

/** Scalar / structural keys allowed in public fixtures. */
const ALLOWED_KEYS = new Set([
  'type',
  'id',
  'parentId',
  'timestamp',
  'version',
  'cwd',
  'provider',
  'modelId',
  'thinkingLevel',
  'message',
  'role',
  'content',
  'toolCallId',
  'toolName',
  'isError',
  'name',
  'arguments',
  'customType',
  'turnId',
  'artifactId',
]);

/** String fields that must become synthetic placeholders (never publish prose). */
const PLACEHOLDER_KEYS = new Set([
  'text',
  'thinking',
  'thinkingsignature',
  'content',
  'body',
  'filecontent',
  'file_content',
  'rawcontent',
  'raw_content',
  'command',
  'cwd',
  'path',
  'file',
  'filename',
]);

function emptyReport(): RedactionReport {
  return { secrets: 0, paths: 0, emails: 0, contents: 0 };
}

function addReports(target: RedactionReport, extra: RedactionReport): void {
  target.secrets += extra.secrets;
  target.paths += extra.paths;
  target.emails += extra.emails;
  target.contents += extra.contents;
}

/** Opaque placeholder — no hash/length fingerprint of the original prose. */
function contentPlaceholder(_value: string): string {
  return '[REDACTED_CONTENT]';
}

function redactAbsolutePath(match: string): string {
  const normalized = match.replace(/\\/g, '/');
  const base = normalized.split('/').filter(Boolean).at(-1) ?? '';
  if (base.includes('.') && !base.startsWith('.')) {
    return `[REDACTED_PATH]/${base}`;
  }
  return '[REDACTED_PATH]';
}

function scrubPatterns(value: string): { value: string; report: RedactionReport } {
  const report = emptyReport();
  let next = value;

  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    next = next.replace(pattern, () => {
      report.secrets += 1;
      return '[REDACTED_SECRET]';
    });
  }

  EMAIL_PATTERN.lastIndex = 0;
  next = next.replace(EMAIL_PATTERN, () => {
    report.emails += 1;
    return '[REDACTED_EMAIL]';
  });

  ABSOLUTE_PATH_PATTERN.lastIndex = 0;
  next = next.replace(ABSOLUTE_PATH_PATTERN, (match) => {
    report.paths += 1;
    return redactAbsolutePath(match);
  });

  return { value: next, report };
}

function placeholderString(value: string, key?: string): { value: string; report: RedactionReport } {
  const report = emptyReport();
  const lowered = key?.toLowerCase() ?? '';

  if (lowered === 'cwd' || lowered === 'path' || lowered === 'file' || lowered === 'filename') {
    report.paths += 1;
    return { value: redactAbsolutePath(value), report };
  }

  if (lowered === 'thinkingsignature') {
    report.secrets += 1;
    return { value: '[REDACTED_SECRET]', report };
  }

  report.contents += 1;
  return { value: contentPlaceholder(value), report };
}

function shouldPlaceholderKey(key?: string): boolean {
  if (!key) return false;
  return PLACEHOLDER_KEYS.has(key.toLowerCase());
}

/**
 * Allowlist-based public-fixture sanitizer.
 * Keeps replay-essential lifecycle fields and replaces conversation / tool prose
 * with synthetic placeholders. Unknown keys are dropped.
 */
export function redactPiRecord(value: unknown): {
  value: unknown;
  report: RedactionReport;
} {
  const report = emptyReport();

  const walk = (node: unknown, key?: string): unknown => {
    if (typeof node === 'string') {
      if (shouldPlaceholderKey(key)) {
        const redacted = placeholderString(node, key);
        addReports(report, redacted.report);
        return redacted.value;
      }
      const scrubbed = scrubPatterns(node);
      addReports(report, scrubbed.report);
      return scrubbed.value;
    }

    if (typeof node === 'number' || typeof node === 'boolean' || node == null) {
      return node;
    }

    if (Array.isArray(node)) {
      return node.map((item) => walk(item, key === 'content' ? undefined : key));
    }

    if (typeof node === 'object') {
      // Tool / content part arguments: keep keys, placeholder every string value.
      if (key === 'arguments') {
        const output: Record<string, unknown> = {};
        for (const [childKey, childValue] of Object.entries(node as Record<string, unknown>)) {
          if (typeof childValue === 'string') {
            const redacted = placeholderString(childValue, childKey);
            addReports(report, redacted.report);
            output[childKey] = redacted.value;
          } else if (
            typeof childValue === 'number' ||
            typeof childValue === 'boolean' ||
            childValue == null
          ) {
            output[childKey] = childValue;
          } else {
            output[childKey] = walk(childValue, childKey);
          }
        }
        return output;
      }

      const output: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(node as Record<string, unknown>)) {
        if (!ALLOWED_KEYS.has(childKey) && !PLACEHOLDER_KEYS.has(childKey.toLowerCase())) {
          continue;
        }
        output[childKey] = walk(childValue, childKey);
      }
      return output;
    }

    return null;
  };

  return { value: walk(value), report };
}
