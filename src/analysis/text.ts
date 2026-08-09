import type { SemanticEvent } from '../semantic-trace/schema';

export function messageText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const content = record.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (!block || typeof block !== 'object') return '';
      const item = block as Record<string, unknown>;
      if (item.type === 'text' && typeof item.text === 'string') return item.text;
      if (item.type === 'thinking' && typeof item.thinking === 'string') return item.thinking;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

export function eventRequestText(event: SemanticEvent): string {
  return messageText(event.payload.message);
}

export function truncate(value: string, length = 72): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}
