import { classifyToolName, eventToolName, type AgentActionClass } from '../analysis/action-classes';
import type { SemanticTrace } from '../semantic-trace/schema';

export interface PredictCheckpoint {
  eventIndex: number;
  modelCallNumber: number;
  turnId?: string;
  actual: AgentActionClass;
  actualToolEventIndex?: number;
  actualToolName?: string;
  actualAnswerEventIndex?: number;
}

export interface PredictCheckpointOmission {
  eventIndex: number;
  modelCallNumber: number;
  reason: 'truncated' | 'unknown-tool';
  toolNames?: string[];
}

export interface PredictCheckpointReport {
  checkpoints: PredictCheckpoint[];
  omissions: PredictCheckpointOmission[];
}

export function derivePredictCheckpointReport(trace: SemanticTrace): PredictCheckpointReport {
  const checkpoints: PredictCheckpoint[] = [];
  const omissions: PredictCheckpointOmission[] = [];
  const modelEventIndices = trace.events
    .map((event, eventIndex) => ({ event, eventIndex }))
    .filter(({ event }) => event.type === 'MODEL_REQUEST_STARTED')
    .map(({ eventIndex }) => eventIndex);

  modelEventIndices.forEach((eventIndex, position) => {
    const modelCallNumber = position + 1;
    const endIndex = modelEventIndices[position + 1] ?? trace.events.length;
    const segment = trace.events.slice(eventIndex + 1, endIndex);
    const toolEvents = segment
      .map((event, offset) => ({ event, eventIndex: eventIndex + 1 + offset }))
      .filter(({ event }) => event.type === 'TOOL_CALL_CREATED');
    const nextTool = toolEvents[0];
    if (nextTool) {
      const toolName = eventToolName(nextTool.event);
      const actual = toolName ? classifyToolName(toolName) : undefined;
      if (actual) {
        checkpoints.push({
          eventIndex,
          modelCallNumber,
          turnId: trace.events[eventIndex]?.turnId,
          actual,
          actualToolEventIndex: nextTool.eventIndex,
          actualToolName: toolName,
        });
        return;
      }
      omissions.push({
        eventIndex,
        modelCallNumber,
        reason: 'unknown-tool',
        toolNames: toolEvents.map(({ event }) => eventToolName(event)).filter((name): name is string => Boolean(name)),
      });
      return;
    }

    const answerOffset = segment.findIndex((event) => event.type === 'MODEL_RESPONSE_COMPLETED');
    if (answerOffset >= 0) {
      checkpoints.push({
        eventIndex,
        modelCallNumber,
        turnId: trace.events[eventIndex]?.turnId,
        actual: 'answer',
        actualAnswerEventIndex: eventIndex + 1 + answerOffset,
      });
      return;
    }

    omissions.push({ eventIndex, modelCallNumber, reason: 'truncated' });
  });

  return { checkpoints, omissions };
}

export function derivePredictCheckpoints(trace: SemanticTrace): PredictCheckpoint[] {
  return derivePredictCheckpointReport(trace).checkpoints;
}

export function checkpointAtLessonFrame(
  checkpoints: readonly PredictCheckpoint[],
  lessonMap: readonly number[],
  lessonIndex: number,
  nextCheckpoint: number,
): PredictCheckpoint | null {
  const checkpoint = checkpoints[nextCheckpoint];
  return checkpoint && lessonMap[lessonIndex] === checkpoint.eventIndex ? checkpoint : null;
}
