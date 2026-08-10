import type { SemanticEventType, SemanticTrace } from '../semantic-trace/schema';
import { LESSON_SCENARIOS, type LessonScenario } from './scenarios';

export interface MissingScenarioBeat {
  type: SemanticEventType;
  occurrence: number;
}

export interface ScenarioCompatibility {
  compatible: boolean;
  coverage: number;
  eventIndexes: number[];
  missing: MissingScenarioBeat[];
}

/**
 * Match each lesson frame to the next chronological occurrence of its event type.
 * Missing beats are recorded and never clamped to a previous event.
 */
export function evaluateScenarioCompatibility(
  scenario: LessonScenario,
  trace: SemanticTrace,
): ScenarioCompatibility {
  const typeIndexes = new Map<SemanticEventType, number[]>();
  trace.events.forEach((event, index) => {
    const list = typeIndexes.get(event.type) ?? [];
    list.push(index);
    typeIndexes.set(event.type, list);
  });

  const counts = new Map<SemanticEventType, number>();
  const eventIndexes: number[] = [];
  const missing: MissingScenarioBeat[] = [];
  let last = -1;

  for (const frame of scenario.frames) {
    const seen = counts.get(frame.type) ?? 0;
    const occurrence = seen + 1;
    counts.set(frame.type, occurrence);
    const candidates = typeIndexes.get(frame.type) ?? [];
    const matched = candidates.find((index) => index > last);

    if (typeof matched !== 'number') {
      missing.push({ type: frame.type, occurrence });
      continue;
    }

    last = matched;
    eventIndexes.push(matched);
  }

  const required = scenario.frames.length;
  return {
    compatible: missing.length === 0 && eventIndexes.length === required,
    coverage: required === 0 ? 1 : eventIndexes.length / required,
    eventIndexes,
    missing,
  };
}

/**
 * Choose a compatible guided scenario, or null when none fit.
 * Prefers more frames; declaration order is the deterministic tie-breaker.
 */
export function selectCompatibleScenario(trace: SemanticTrace): LessonScenario | null {
  let best: LessonScenario | null = null;

  for (const scenario of Object.values(LESSON_SCENARIOS)) {
    const result = evaluateScenarioCompatibility(scenario, trace);
    if (!result.compatible) continue;
    if (!best || scenario.frames.length > best.frames.length) {
      best = scenario;
    }
  }

  return best;
}

export type ImportedTraceDestination =
  | { surface: 'city'; scenarioId: string }
  | { surface: 'explorer'; reason: 'no-compatible-scenario' };

/** Decide whether an imported trace can open a guided city lesson. */
export function routeImportedTrace(trace: SemanticTrace): ImportedTraceDestination {
  const scenario = selectCompatibleScenario(trace);
  if (!scenario) {
    return { surface: 'explorer', reason: 'no-compatible-scenario' };
  }
  return { surface: 'city', scenarioId: scenario.id };
}
