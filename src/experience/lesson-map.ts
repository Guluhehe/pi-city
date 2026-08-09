import type { SemanticEvent, SemanticTrace } from '../semantic-trace/schema';
import type { LessonFrame, LessonScenario } from './scenarios';

/**
 * Align lesson presentation frames to Semantic Trace events by ordered type match.
 * Falls back to clamping when a teaching beat has no exact counterpart.
 */
export function mapLessonFramesToTrace(
  scenario: LessonScenario,
  trace: SemanticTrace,
): number[] {
  const counts = new Map<string, number>();
  const typeIndexes = new Map<string, number[]>();

  trace.events.forEach((event, index) => {
    const list = typeIndexes.get(event.type) ?? [];
    list.push(index);
    typeIndexes.set(event.type, list);
  });

  let last = 0;
  return scenario.frames.map((frame) => {
    const seen = counts.get(frame.type) ?? 0;
    counts.set(frame.type, seen + 1);
    const candidates = typeIndexes.get(frame.type) ?? [];
    const matched = candidates[seen];
    if (typeof matched === 'number') {
      last = matched;
      return matched;
    }
    return Math.min(last, Math.max(trace.events.length - 1, 0));
  });
}

export function lessonEvent(
  scenario: LessonScenario,
  trace: SemanticTrace,
  lessonIndex: number,
): { event?: SemanticEvent; traceIndex: number } {
  const map = mapLessonFramesToTrace(scenario, trace);
  const traceIndex = map[Math.min(lessonIndex, map.length - 1)] ?? 0;
  return { event: trace.events[traceIndex], traceIndex };
}

export function beforeDurationMs(frames: LessonFrame[], index: number): number {
  return frames.slice(0, Math.max(0, index)).reduce((sum, frame) => sum + frame.durationMs, 0);
}
