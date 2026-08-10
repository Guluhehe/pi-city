import type { SemanticEvent, SemanticTrace } from '../semantic-trace/schema';
import { evaluateScenarioCompatibility } from './scenario-compatibility';
import type { LessonFrame, LessonScenario } from './scenarios';

/**
 * Align lesson presentation frames to Semantic Trace events by ordered type match.
 * Throws when the trace is incompatible — silent fallback is forbidden.
 */
export function mapLessonFramesToTrace(
  scenario: LessonScenario,
  trace: SemanticTrace,
): number[] {
  const result = evaluateScenarioCompatibility(scenario, trace);
  if (!result.compatible) {
    const missing = result.missing
      .map((beat) => `${beat.type}#${beat.occurrence}`)
      .join(', ');
    throw new Error(
      `Scenario "${scenario.id}" is incompatible with this trace` +
        (missing ? `; missing: ${missing}` : ''),
    );
  }
  return result.eventIndexes;
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
