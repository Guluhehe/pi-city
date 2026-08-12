import type { AgentActionClass } from '../analysis/action-classes';
import type { PredictCheckpoint } from './checkpoints';

export type GamePhase = 'watch' | 'predict' | 'reveal' | 'debrief';

export type GameSessionAction =
  | { type: 'REACH_CHECKPOINT' }
  | { type: 'PREDICT_NEXT_ACTION'; choice: AgentActionClass }
  | { type: 'CONTINUE_REPLAY' }
  | { type: 'COMPLETE_RUN' };

export interface PlayerDecision {
  checkpointIndex: number;
  choice: AgentActionClass;
  actual: AgentActionClass;
  correct: boolean;
}

export interface GameSessionState {
  lessonId: string;
  phase: GamePhase;
  checkpoint: number;
  decisions: PlayerDecision[];
  runComplete: boolean;
}

export interface PredictDebrief {
  total: number;
  correct: number;
  entries: Array<{ decision: PlayerDecision; checkpoint: PredictCheckpoint }>;
}

export function createGameSession(
  lessonId: string,
  _checkpoints: readonly PredictCheckpoint[],
): GameSessionState {
  return { lessonId, phase: 'watch', checkpoint: 0, decisions: [], runComplete: false };
}

export function reduceGameSession(
  state: GameSessionState,
  action: GameSessionAction,
  checkpoints: readonly PredictCheckpoint[],
): GameSessionState {
  if (action.type === 'REACH_CHECKPOINT') {
    if (state.phase !== 'watch' || state.checkpoint >= checkpoints.length) return state;
    return { ...state, phase: 'predict' };
  }

  if (action.type === 'PREDICT_NEXT_ACTION') {
    if (state.phase !== 'predict') return state;
    const checkpoint = checkpoints[state.checkpoint];
    if (!checkpoint) return state;
    const decision: PlayerDecision = {
      checkpointIndex: state.checkpoint,
      choice: action.choice,
      actual: checkpoint.actual,
      correct: action.choice === checkpoint.actual,
    };
    return { ...state, phase: 'reveal', decisions: [...state.decisions, decision] };
  }

  if (action.type === 'CONTINUE_REPLAY') {
    if (state.phase !== 'reveal') return state;
    const checkpoint = state.checkpoint + 1;
    return {
      ...state,
      checkpoint,
      phase: state.runComplete && checkpoint >= checkpoints.length ? 'debrief' : 'watch',
    };
  }

  if (action.type === 'COMPLETE_RUN') {
    if (state.phase === 'debrief' || state.runComplete) return state;
    return {
      ...state,
      runComplete: true,
      phase: state.phase === 'watch' && state.checkpoint >= checkpoints.length ? 'debrief' : state.phase,
    };
  }

  return state;
}

export function buildPredictDebrief(
  state: GameSessionState,
  checkpoints: readonly PredictCheckpoint[],
): PredictDebrief {
  const entries = state.decisions.flatMap((decision) => {
    const checkpoint = checkpoints[decision.checkpointIndex];
    return checkpoint ? [{ decision, checkpoint }] : [];
  });
  return {
    total: entries.length,
    correct: entries.filter(({ decision }) => decision.correct).length,
    entries,
  };
}
