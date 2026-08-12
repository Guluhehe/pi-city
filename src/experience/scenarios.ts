import type { ExperienceDistrict } from './districts';
import type { ShotId } from './shots';
import type { SemanticEventType } from '../semantic-trace/schema';

export type LessonAha = 'uturn' | 'context';

export interface LessonFrame {
  type: SemanticEventType;
  district: ExperienceDistrict;
  chapter: string;
  what: string;
  why: string;
  why2: string;
  artifact: string;
  cam: ShotId;
  durationMs: number;
  gate?: number;
  tool?: number;
  aha?: LessonAha;
}

export interface LessonScenario {
  id: string;
  title: string;
  narration: 'demo';
  story: Array<[string, ExperienceDistrict | string]>;
  frames: LessonFrame[];
  before: string[];
  after: string[];
  /** Teaching metadata for the bundled lesson — UI totals must come from analyzeRun(trace). */
  modelTotal: number;
  /** Teaching metadata for the bundled lesson — UI totals must come from analyzeRun(trace). */
  toolTotal: number;
}

export const AUTH_BUG_FRAMES: LessonFrame[] = [
  { type: "REQUEST_ARRIVED", district: "arrival", chapter: "Understand the request", what: "A request vessel approaches Arrival Harbor.", why: "The user message is the first information object in this run.", why2: "The city begins with evidence, not with a model call.", artifact: "request-vessel", cam: "arrival-wide", durationMs: 4800 },
  { type: "CONTEXT_COMPILE_STARTED", district: "context", chapter: "Build the first Context", what: "Context Works receives candidate history.", why: "The runtime prepares the model-visible view for this turn.", why2: "Not every piece of history must enter every model call.", artifact: "session-entry", cam: "context-cut", durationMs: 5000 },
  { type: "CONTEXT_COMPILED", district: "context", chapter: "Build the first Context", what: "Selected evidence is sealed into Context #1.", why: "This is the information the next model decision can use.", why2: "The capsule is a view, not the full archive.", artifact: "context-capsule", cam: "context-sealed", durationMs: 3900 },
  { type: "MODEL_REQUEST_STARTED", district: "model", chapter: "Inspect evidence", what: "Context #1 enters Model Core.", why: "The model reasons over its current evidence and chooses a next action.", why2: "The model can decide; the harness will execute.", artifact: "context-capsule", cam: "model-decision", durationMs: 5200, gate: 0 },
  { type: "MODEL_STREAMING", district: "model", chapter: "Inspect evidence", what: "Model Core streams its first decision.", why: "The live response shows the Agent committing to an inspect path.", why2: "Streaming is still part of the same model call.", artifact: "work-order", cam: "model-decision", durationMs: 3400, gate: 0 },
  { type: "TOOL_CALL_CREATED", district: "model", chapter: "Inspect evidence", what: "The READ gate opens.", why: "The model requests more evidence instead of answering immediately.", why2: "Decision: inspect src/auth.ts.", artifact: "work-order", cam: "model-gate", durationMs: 3000, gate: 0 },
  { type: "MODEL_RESPONSE_COMPLETED", district: "model", chapter: "Inspect evidence", what: "The first model call finishes with a tool request.", why: "Pi closes the model response before the harness runs the tool.", why2: "Decision and execution are separate beats.", artifact: "work-order", cam: "model-gate", durationMs: 3000, gate: 0 },
  { type: "TOOL_EXECUTION_STARTED", district: "tool", chapter: "Inspect evidence", what: "A work-order cart reaches Tool Works.", why: "The harness executes read(src/auth.ts).", why2: "The tool changes what evidence the Agent has access to.", artifact: "work-order", cam: "tool-follow", durationMs: 4300, tool: 0 },
  { type: "TOOL_EXECUTION_COMPLETED", district: "tool", chapter: "Inspect evidence", what: "Tool Works produces the auth.ts result.", why: "Execution completed, but the Agent has not answered yet.", why2: "A result must still return into the runtime.", artifact: "tool-result", cam: "tool-close", durationMs: 3400, tool: 0 },
  { type: "TOOL_RESULT_ATTACHED", district: "session", chapter: "Inspect evidence", what: "The result cart turns around and returns to Session.", why: "Tool Result is new evidence, not the final answer.", why2: "This U-turn is the most important loop in Pi City.", artifact: "tool-result", cam: "uturn", durationMs: 5600, aha: "uturn" },
  { type: "CONTEXT_COMPILE_STARTED", district: "context", chapter: "Rebuild with new evidence", what: "Context Works starts a second assembly pass.", why: "The runtime now has both the earlier history and auth.ts evidence.", why2: "Same Agent, richer evidence.", artifact: "tool-result", cam: "context-cut", durationMs: 4500 },
  { type: "CONTEXT_COMPILED", district: "context", chapter: "Rebuild with new evidence", what: "Context #2 is sealed with the tool result inside.", why: "The next model call sees something the first call could not see.", why2: "The difference is inspectable rather than magical.", artifact: "context-capsule", cam: "context-sealed", durationMs: 5200, aha: "context" },
  { type: "MODEL_REQUEST_STARTED", district: "model", chapter: "Answer the user", what: "Context #2 enters Model Core.", why: "The same model can now choose differently because its evidence changed.", why2: "Decision: ANSWER.", artifact: "context-capsule", cam: "model-decision", durationMs: 5200, gate: 3 },
  { type: "MODEL_RESPONSE_COMPLETED", district: "model", chapter: "Answer the user", what: "Model Core produces the grounded response.", why: "The answer is based on the returned file evidence.", why2: "The loop can now settle without another tool call.", artifact: "answer", cam: "model-answer", durationMs: 3600, gate: 3 },
  { type: "AGENT_SETTLED", district: "model", chapter: "Answer the user", what: "The Agent settles and the harbor returns to ambient motion.", why: "No additional tool work is requested.", why2: "One runtime loop has completed.", artifact: "answer", cam: "pullback", durationMs: 4800, gate: 3 },
];

export const MULTI_TOOL_FRAMES: LessonFrame[] = [
  { type: "REQUEST_ARRIVED", district: "arrival", chapter: "Understand the request", what: "A coding task arrives at the harbor.", why: "The goal establishes the run.", why2: "A larger run will involve several workshops.", artifact: "request-vessel", cam: "arrival-wide", durationMs: 4200 },
  { type: "CONTEXT_COMPILED", district: "context", chapter: "Build the first Context", what: "Context #1 is assembled.", why: "The first model call sees the task and current instructions.", why2: "No code evidence has returned yet.", artifact: "context-capsule", cam: "context-sealed", durationMs: 3800 },
  { type: "MODEL_REQUEST_STARTED", district: "model", chapter: "Inspect evidence", what: "Model Core chooses to inspect.", why: "The Agent needs external code evidence.", why2: "Decision: READ / GREP.", artifact: "work-order", cam: "model-decision", durationMs: 4400, gate: 0 },
  { type: "TOOL_EXECUTION_STARTED", district: "tool", chapter: "Inspect evidence", what: "Read and grep activate the inspection workshop.", why: "Several raw tool calls belong to one semantic phase.", why2: "The city groups mechanism into an understandable story.", artifact: "work-order", cam: "tool-follow", durationMs: 4400, tool: 0 },
  { type: "TOOL_RESULT_ATTACHED", district: "session", chapter: "Inspect evidence", what: "Inspection evidence returns to Session.", why: "Those tool results can enter a later Context.", why2: "Result ≠ answer.", artifact: "tool-result", cam: "uturn", durationMs: 4800, aha: "uturn" },
  { type: "CONTEXT_COMPILED", district: "context", chapter: "Rebuild with new evidence", what: "A richer Context is assembled from read and grep results.", why: "The next model call now has enough evidence to propose a change.", why2: "The evidence changed before the behavior changed.", artifact: "context-capsule", cam: "context-sealed", durationMs: 4400, aha: "context" },
  { type: "MODEL_REQUEST_STARTED", district: "model", chapter: "Rebuild with new evidence", what: "Model Core chooses EDIT.", why: "The model moves from inspection to intervention.", why2: "Decision: EDIT.", artifact: "work-order", cam: "model-gate", durationMs: 4000, gate: 1 },
  { type: "TOOL_EXECUTION_STARTED", district: "tool", chapter: "Rebuild with new evidence", what: "The edit workshop changes the code.", why: "The harness performs the model-requested change.", why2: "Changing code is not verification.", artifact: "work-order", cam: "tool-follow", durationMs: 4200, tool: 1 },
  { type: "TOOL_EXECUTION_STARTED", district: "tool", chapter: "Rebuild with new evidence", what: "The bash workshop runs verification.", why: "Tests produce another piece of evidence.", why2: "Decision quality depends on what returns.", artifact: "work-order", cam: "tool-follow", durationMs: 4400, tool: 2 },
  { type: "TOOL_RESULT_ATTACHED", district: "session", chapter: "Rebuild with new evidence", what: "Edit and verification results return to history.", why: "The final model call can reason over both change and evidence.", why2: "Again, the result turns back into the loop.", artifact: "tool-result", cam: "uturn", durationMs: 4200 },
  { type: "CONTEXT_COMPILED", district: "context", chapter: "Answer the user", what: "Context #3 contains inspection, change, and verification.", why: "This is a substantially different model-visible world.", why2: "Same model, different evidence.", artifact: "context-capsule", cam: "context-sealed", durationMs: 4600, aha: "context" },
  { type: "MODEL_REQUEST_STARTED", district: "model", chapter: "Answer the user", what: "The ANSWER gate opens.", why: "The Agent now has evidence that the change worked.", why2: "Decision: ANSWER.", artifact: "answer", cam: "model-answer", durationMs: 4300, gate: 3 },
  { type: "AGENT_SETTLED", district: "model", chapter: "Answer the user", what: "The run settles.", why: "Inspection, change, and verification have all been incorporated.", why2: "The tool chain becomes one readable story.", artifact: "answer", cam: "pullback", durationMs: 4300, gate: 3 },
];

export const LESSON_SCENARIOS: Record<string, LessonScenario> = {
  auth: {
    id: 'auth',
    title: 'Fix the authentication bug in src/auth.ts',
    narration: 'demo',
    story: [
      ['Understand the request', 'arrival'],
      ['Build the first Context', 'context'],
      ['Inspect evidence', 'tool'],
      ['Rebuild with new evidence', 'context'],
      ['Answer the user', 'model'],
    ],
    frames: AUTH_BUG_FRAMES,
    before: ['User request', 'Current instructions'],
    after: ['User request', 'Current instructions', '+ Tool call: read(src/auth.ts)', '+ Tool result: auth.ts content'],
    modelTotal: 2,
    toolTotal: 1,
  },
  multi: {
    id: 'multi',
    title: 'Diagnose, edit, and verify the auth flow',
    narration: 'demo',
    story: [
      ['Understand the request', 'arrival'],
      ['Build the first Context', 'context'],
      ['Inspect evidence', 'read · grep'],
      ['Change and verify', 'edit · bash'],
      ['Answer the user', 'model'],
    ],
    frames: MULTI_TOOL_FRAMES,
    before: ['User request', 'Read result', 'Grep result'],
    after: ['User request', 'Read result', 'Grep result', '+ Edit result', '+ Bash verification'],
    modelTotal: 3,
    toolTotal: 4,
  },
};

export function scenarioDurationMs(scenario: LessonScenario): number {
  return scenario.frames.reduce((sum, frame) => sum + frame.durationMs, 0);
}

export function getScenario(id: string = 'auth'): LessonScenario {
  return LESSON_SCENARIOS[id] ?? LESSON_SCENARIOS.auth;
}
