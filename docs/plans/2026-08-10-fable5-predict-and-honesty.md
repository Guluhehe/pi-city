---
title: Pi City v0.12 — Predict 机制与叙事诚实性修复实施计划
date: 2026-08-10
model: wanqing/claude-5-fable
status: superseded
based_on: docs/reviews/2026-08-10-fable5-architecture-review.md
---

# Pi City v0.12 — Predict the Agent's next action + Narrative Honesty

> **For Cursor / coding agents:** 本计划已被 [`2026-08-12-fable-v012-implementation.md`](2026-08-12-fable-v012-implementation.md) 取代，且已在 v0.12 落地。不要按本文件重跑任务。当前入口是 [`../../AGENTS.md`](../../AGENTS.md) 与 [`../handoffs/2026-08-13-fable-v012-handoff.md`](../handoffs/2026-08-13-fable-v012-handoff.md)。

## Goal

1. 落地第一个可玩机制 **Predict the Agent's next action**：replay 在 `MODEL_REQUEST_STARTED` 暂停 → 玩家四选一（READ / EDIT / BASH / ANSWER）→ 从 trace 揭示真实动作 → 用该次 model call 的 `ContextSnapshot` 解释证据 → 继续播放 → 结束时基于玩家决策生成 debrief。这兑现 Milestone B（First Playable Lesson）。
2. 在 Predict 之前（或作为其第一个切片）修掉 cinematic shell 的三处叙事污染：
   - lesson 的 evidence 标签改为从真实事件读取；
   - cinematic Context Compare 接上 `buildContextSnapshots` + `compareContextSnapshots` 的真实 diff；
   - Photo Mode 不再静默丢弃用户导入的 trace。
3. 给 3D shell 加最小 ErrorBoundary 兜底，渲染失败时引导至 Evidence Explorer。
4. 顺手完成两个低成本可靠性收尾：`sourceHash` + 确定性 trace id；legacy site-* 目录归档。

## Non-goals

严格继承评审 §7，本迭代**不做**：

- 第六个 district / 更大的世界 / 新一轮 art pass
- Lesson Compiler / 通用课程 DSL
- payload 全量 discriminated union 重写（仅允许为 Predict 所需的最小共享提取）
- 四级 quality tier 渲染降级（只做 ErrorBoundary 这一层）
- ECS / 游戏引擎 / 多人 / 账号 / 云端存储
- 新增 Explorer 分析视图（八个 tab 已够）
- 选定或增加托管适配器矩阵；部署保持 provider-neutral，不要求 Pages
- Milestone C（Context selection challenge）——本迭代只到 Predict

## Architecture decisions (locked)

以下决策来自 `docs/architecture-evolution.md` 与评审，视为已锁定：

1. **Trace 不可变**。Game Session 只读 trace，任何 player 状态都放在独立的 `GameSessionState`。测试必须断言 reducer 前后 `trace.events` 引用/内容不变。
2. **Game Session 是纯确定性 reducer**。同一 trace + 同一 `PlayerAction[]` 序列在 Node 测试环境重放必须得到完全相同的结果（无 `Date.now()`、无 `Math.random()`、无 DOM 依赖）。文件放在新目录 `src/game/`。
3. **Predict checkpoint 从 trace 派生，不从 lesson 剧本硬编码**。checkpoint = trace 中每个 `MODEL_REQUEST_STARTED` 事件；"真实动作"= 该 checkpoint 到下一个 `MODEL_REQUEST_STARTED`（或 trace 结尾）之间的第一个 `TOOL_CALL_CREATED`（按 toolName 分类为 READ/EDIT/BASH），若无 tool call 且存在 `MODEL_RESPONSE_COMPLETED` 则为 ANSWER。`LessonFrame.gate` 保留为剧本节奏元数据，但**揭示/判定只信 trace**。
4. **工具分类只有一份**。`src/analysis/story.ts` 中的 `inspectTools` / `changeTools` / `executeTools` 集合提取为共享模块，story 与 game 共用，消除评审指出的 toolName 提取三处重复中的一处。
5. **原有不间断 Watch 模式保持默认可用**（Milestone B 验收条件）。Predict 是显式入口（landing 上新增按钮），不改变现有 e2e 断言的默认路径。
6. **证据文案分级展示**。UI 区分两类内容：(a) *evidence-driven*——evidence level 徽章、Context diff、模型/工具计数，必须从 `trace.events[i].evidence` / `analyzeRun` / `buildContextSnapshots` 计算；(b) *demo-only lesson copy*——`LessonFrame.what/why/why2` 这类导演旁白，允许保留，但当当前 trace 不是内置 demo 时必须带可见的 `DEMO NARRATION` 标记，且含具体文件名的措辞不得冒充导入 run 的事实。
7. **不静默替换 trace**。`ensureAuthPhotoDemo()` 的静默 `setTrace(loadDemo())` 路径删除，改为显式提示 + 用户确认（或禁用 Photo Mode 并解释）。
8. 部署保持 provider-neutral：CI 仅 `check:ci`；不新增任何托管 workflow；`deploy-pages.yml` 的去留是人类决策（见 Open questions）。

## Workstreams (ordered)

### Workstream A — Narrative honesty fixes (before Predict)

评审 §4 的三处污染 + ErrorBoundary。这些必须先于（或作为 Predict 的第一个 commit 切片）完成，因为 Predict 的"揭示 + 证据解释"UI 会直接复用修复后的真实-证据渲染路径；在污染的地基上盖 Predict 等于把新机制也污染了。

- Task 1：lesson evidence 标签从真实事件读取 + demo copy 标记
- Task 2：cinematic Context Compare 接真实 diff
- Task 3：Photo Mode 不静默替换 trace
- Task 4：3D shell 最小 ErrorBoundary

### Workstream B — Predict the Agent's next action

最小垂直切片：先纯逻辑（checkpoints + reducer + 测试，完全无 UI），再接 UI，再补 e2e。

- Task 5：共享工具分类模块
- Task 6：`src/game/checkpoints.ts` — 从 trace 派生 Predict checkpoint
- Task 7：`src/game/session.ts` — 纯 Game Session reducer + debrief
- Task 8：CinematicCity 接入 Predict 模式（暂停 / 四选一 / 揭示 / 证据解释 / debrief）
- Task 9：Predict e2e 冒烟

### Workstream C — Reliability follow-ups

- Task 10：`sourceHash` + 确定性 trace id（在真实 run 库出现前做，成本最低）
- Task 11：legacy site-* 目录归档 + 移除 `check:live`

---

## Detailed task breakdown

### Task 1 — lesson evidence 标签从真实事件读取

**Files to modify:**
- `src/experience/scenarios.ts`
- `src/product/CinematicCity.tsx`
- `src/styles.css`（新增 `.demo-narration-chip` 样式）
- `tests/experience.test.ts`

**Implementation notes:**

1. 当前 `CinematicCity.tsx` 的 inspector 渲染 `<code>{lessonFrame.evidence}</code>`——写死的字符串（如 `"observed · toolCall read"`）。改为从映射到的真实事件计算：

   ```tsx
   const mappedEvent = trace.events[traceIndex];
   // <code>{mappedEvent.evidence.level} · {mappedEvent.type}</code>
   // 若 mappedEvent.evidence.note 存在，可作 title/tooltip
   ```

   `traceIndex` 已由 `lessonMap[...]` 得到，无需新管道。
2. `LessonFrame.evidence` 字段整体删除（scenarios.ts 中所有 frame 的 `evidence:` 键一并删掉），防止未来又被谁渲染出来。若 TypeScript 报出其他消费点，逐一改为真实事件来源。
3. `LessonFrame` 新增 `narration?: 'demo'` 可选标记。`AUTH_BUG_FRAMES` / `MULTI_TOOL_FRAMES` 中 `what/why/why2` 含具体文件名或具体决策措辞的帧（如 "Decision: inspect src/auth.ts"、"The harness executes read(src/auth.ts)"）标记 `narration: 'demo'`。
4. `CinematicCity` 增加 trace 来源状态：`const [traceOrigin, setTraceOrigin] = useState<'bundled-demo' | 'imported'>('bundled-demo')`，在 `onFiles` 成功路径设为 `'imported'`，加载 demo 时设回 `'bundled-demo'`。当 `traceOrigin === 'imported' && lessonFrame.narration === 'demo'` 时，inspector 顶部渲染一个小 chip：`DEMO NARRATION · describes the bundled lesson, not your run`。这是"具体文件名在非 demo trace 上降级"的最小诚实实现——不伪造插值，而是明示这是剧本旁白。

**Acceptance tests（`tests/experience.test.ts` 新增）：**
- `LessonFrame` 类型不再有 `evidence` 字段（编译期保证；测试断言 `AUTH_BUG_FRAMES.every(f => !('evidence' in f))` 可选）。
- 对 auth fixture：`mapLessonFramesToTrace` 得到的每个 traceIndex 上，`trace.events[i].evidence.level` 与该帧此前硬编码宣称的等级一致性由**事件本身**决定——具体断言：帧 0（REQUEST_ARRIVED）为 `observed`，帧 3（MODEL_REQUEST_STARTED）为 `derived`（normalize.ts 从 turn_start 派生并带 note）。
- 断言含 "src/auth.ts" 或 "Decision:" 字样的帧均有 `narration: 'demo'`。

**Done when:** cinematic inspector 的 evidence 行 100% 来自 `event.evidence`；`npm test`、`npm run typecheck` 通过；手动导入 `fixtures/multi-tool/runtime.jsonl` 后 demo 旁白帧出现 DEMO NARRATION chip。

---

### Task 2 — cinematic Context Compare 接真实 diff

**Files to modify:**
- `src/product/CinematicCity.tsx`
- `src/experience/scenarios.ts`（删除 `LessonScenario.before` / `after`）
- `src/styles.css`（compare 面板项目样式复用 explorer 的 added/retained 语义）
- `tests/experience.test.ts` 或 `tests/analysis.test.ts`

**Implementation notes:**

1. `CinematicCity` 增加：

   ```tsx
   import { activeContextSnapshot, buildContextSnapshots, compareContextSnapshots } from '../analysis/context';
   const contextSnapshots = useMemo(() => buildContextSnapshots(trace), [trace]);
   ```

2. `showCompare` 分支重写：用 `activeContextSnapshot(contextSnapshots, traceIndex)` 取当前 snapshot，`current.number > 1` 时取 `contextSnapshots[current.number - 2]` 为 previous，`compareContextSnapshots(current, previous)` 得 diff。左列渲染 `previous.items`，右列渲染 `current.items` 并用 `diff.added` 的 key 集合打 `new` 样式（与 `App.tsx` 的 `ContextCompareView` 同一语义，可参考其实现，但不必强行抽公共组件——两处 UI 形态不同，允许各自渲染同一数据）。
3. 面板标题 "Context changed before Model #2" 改为动态：`Context changed before Model #${current.number}`。
4. `LessonScenario.before` / `after` 字段与两个 scenario 里的静态数组**彻底删除**（评审建议"兜底或删除"，选删除：既然兼容 trace 一定有 ≥2 个 `MODEL_REQUEST_STARTED`——auth/multi 剧本都要求多次 model call——真实 diff 总是可算的，不需要贴纸兜底）。
5. `mode === 'complete'` 里的 "Compare Context" 按钮跳转后同样走真实 diff（它设置 `index` 到 `CANONICAL_FRAMES.context.frameIndex`，`traceIndex` 会随之解析，无需特殊处理）。

**Acceptance tests:**
- 对 auth fixture：`buildContextSnapshots(trace)` 返回 2 个 snapshot；`compareContextSnapshots(s2, s1).added` 包含 kind 为 `tool-call` 与 `tool-result` 的项（read 调用与 auth 文件结果）——锁死"cinematic compare 有真实数据可用"。
- 对 multi fixture：3 个 snapshot；Model #2 相对 #1 的 added 非空。
- e2e（并入 Task 9 或独立小 spec）：demo watch 播到 `aha === 'context'` 帧后 `.cinematic-compare` 出现，且面板内出现 `NEW` / added 样式的真实条目文本（如 `read` 相关 label），不再出现已删除的 `"+ Edit result"` 字面量。

**Done when:** 仓库内 grep 不到 `scenario.before` / `scenario.after`；cinematic 与 explorer 对同一问题给出同一真实性等级的答案。

---

### Task 3 — Photo Mode 不静默替换 trace

**Files to modify:**
- `src/product/CinematicCity.tsx`
- `src/styles.css`
- `tests/e2e/cinematic.spec.ts`

**Implementation notes:**

1. 删除 `ensureAuthPhotoDemo()` 的静默路径。新行为：
   - 当前 trace 为 auth 兼容（`authCompatible`）→ 行为不变，直接进 Photo Mode。
   - 当前 trace 不兼容 auth（即用户导入了 multi 或其他兼容 run）→ `enterPhoto` 不再自动换 trace，而是弹出一个内联确认层（非 `window.alert`）：文案说明 "Photo Mode frames are staged on the bundled auth demo. Switching will replace your imported run in this view."，提供两个按钮：`Switch to demo frames`（此时才 `setScenario(getScenario('auth')); setTrace(loadDemo()); setTraceOrigin('bundled-demo')` 并继续进入）与 `Stay with my run`（取消）。
2. 全局键盘 `1/2/3` 与顶栏 / landing 的 Photo Mode 按钮共用同一确认逻辑（把确认状态提为 `const [photoConfirm, setPhotoConfirm] = useState<CanonicalFrameKey | null>(null)`，确认后才真正 `enterPhoto`）。
3. 退出 Photo Mode（`exitPhoto`）不需要恢复原 trace——因为进入前已经过用户显式同意；但若实现"切换后退出自动还原导入 trace"更友好，可选做，需保存 `previousTrace` 引用（trace 不可变，保引用安全）。默认按不还原实现，保持切片最小。

**Acceptance tests（e2e）：**
- 导入 `fixtures/multi-tool/runtime.jsonl` 进入 watch 后按 `1`：断言出现确认层文案（含 "replace your imported run"），且 `.cinematic-title h1` 仍是 multi 标题（trace 未被换）。
- 点击 `Stay with my run`：确认层消失，模式不变。
- 点击 `Switch to demo frames`：进入 photo 模式且 URL 带 `?frame=arrival`。
- 原有 demo 路径 e2e（`?frame=` 深链、H/Escape）保持通过——demo trace 下无确认层。

**Done when:** 仓库内不存在任何"未经确认的 `setTrace(loadDemo())`"路径；上述 e2e 全绿。

---

### Task 4 — 3D shell 最小 ErrorBoundary

**Files to create:**
- `src/product/SceneFallback.tsx`（class ErrorBoundary + fallback UI）

**Files to modify:**
- `src/product/CinematicCity.tsx`（包住 `<PiCityScene …/>`）
- `src/App.tsx`（Explorer 的 `world` tab 与 `IntegratedJourney` 内两处 `<PiCityScene …/>` 同样包住）
- `src/styles.css`
- `tests/e2e/cinematic.spec.ts`（可选强注错误冒烟，见下）

**Implementation notes:**

1. 实现一个标准 React class ErrorBoundary（函数组件无法 catch 渲染错误）：

   ```tsx
   export class SceneErrorBoundary extends React.Component<
     { onOpenExplorer?: () => void; children: React.ReactNode },
     { error: Error | null }
   >
   ```

   `componentDidCatch` 记录 `console.error`；fallback 渲染一个占满 scene 区域的静态面板：标题 "3D rendering failed"，一句诊断（`error.message` 截断），一个 `Open Evidence Explorer` 按钮（有 `onOpenExplorer` 时显示）和一个 `Retry` 按钮（重置 `error: null` 触发重挂载）。
2. 不做 WebGL 预检测、不做 quality tier——评审明确只要求砍掉"白屏 = 教学死亡"的尾部风险。`useLoader` 抛出的 GLB 加载错误会沿 R3F 冒泡到最近的 boundary，此 boundary 必须放在 `<PiCityScene>`（即 `<Canvas>`）之外。
3. Explorer 侧 fallback 不需要按钮（本来就在 explorer），只渲染诊断文案。

**Acceptance tests:**
- 单元层面 ErrorBoundary 难以在 node:test 无 DOM 下测；用最小 e2e 冒烟替代：新增一个隐藏 query 开关 `?forceSceneError=1`，`PiCityScene` 顶部读取后 `throw new Error('forced scene failure for testing')`（三行代码，生产无副作用），e2e 断言 fallback 面板与 `Open Evidence Explorer` 按钮可见、点击后进入 explorer、`pageerror` 过滤后为空。
- 若不接受测试钩子进产品代码，可降级为手动验收并在 commit message 注明；**优先选 query 开关方案**，因为"渲染失败仍可教学"是文档承诺的验收标准（architecture success criteria #5）。

**Done when:** 任一 `<PiCityScene>` 渲染抛错时用户看到可操作的 fallback 而非白屏。

---

### Task 5 — 共享工具分类模块

**Files to create:**
- `src/analysis/action-classes.ts`

**Files to modify:**
- `src/analysis/story.ts`（改为 import）
- `tests/analysis.test.ts`

**Implementation notes:**

```ts
// src/analysis/action-classes.ts
export type AgentActionClass = 'read' | 'edit' | 'bash' | 'answer';

export const INSPECT_TOOLS = new Set(['read', 'grep', 'find', 'ls', 'search', 'glob']);
export const CHANGE_TOOLS = new Set(['edit', 'write', 'patch', 'apply_patch']);
export const EXECUTE_TOOLS = new Set(['bash', 'shell', 'terminal', 'exec']);

export function classifyToolName(toolName: string): Exclude<AgentActionClass, 'answer'> {
  const name = toolName.toLowerCase();
  if (CHANGE_TOOLS.has(name)) return 'edit';
  if (EXECUTE_TOOLS.has(name)) return 'bash';
  return 'read'; // inspect 集合 + 未知工具都归 read（保守：未知工具本质是"获取更多证据"）
}

export function eventToolName(event: SemanticEvent): string | undefined {
  return typeof event.payload.toolName === 'string' ? event.payload.toolName : undefined;
}
```

`story.ts` 删除本地三个 Set，改 import（保持 `classifyTools` 行为逐字节不变——现有 story 测试是回归保护）。`eventToolName` 顺带消除 `run.ts` / `context.ts` / `story.ts` 三处重复的防御性取值中至少 story 一处；`run.ts` / `context.ts` 的替换可选做，不阻塞。

**Acceptance tests:** `classifyToolName` 的表驱动用例（read/grep→read，edit/write→edit，bash/shell→bash，未知 `mcp_foo`→read）；现有 story 测试全部保持通过。

**Done when:** 分类逻辑单点定义；`npm test` 全绿。

---

### Task 6 — `src/game/checkpoints.ts`：从 trace 派生 Predict checkpoint

**Files to create:**
- `src/game/checkpoints.ts`
- `tests/game.test.ts`

**Implementation notes:**

```ts
import type { SemanticTrace } from '../semantic-trace/schema';
import type { AgentActionClass } from '../analysis/action-classes';

export interface PredictCheckpoint {
  /** MODEL_REQUEST_STARTED 在 trace.events 中的下标 */
  eventIndex: number;
  /** 第几次 model call（1-based，与 ContextSnapshot.number 对齐） */
  modelCallNumber: number;
  turnId?: string;
  /** trace 中观察到的真实下一动作 */
  actual: AgentActionClass;
  /** actual 为 read/edit/bash 时，对应 TOOL_CALL_CREATED 的下标与 toolName */
  actualToolEventIndex?: number;
  actualToolName?: string;
  /** actual 为 answer 时，对应 MODEL_RESPONSE_COMPLETED 的下标 */
  actualAnswerEventIndex?: number;
}

export function derivePredictCheckpoints(trace: SemanticTrace): PredictCheckpoint[];
```

派生规则（纯函数，单次遍历即可）：
- 每个 `MODEL_REQUEST_STARTED` 产生一个 checkpoint；
- 在该事件与下一个 `MODEL_REQUEST_STARTED`（或 trace 末尾）之间：第一个 `TOOL_CALL_CREATED` 决定 `actual = classifyToolName(toolName)`；若无 tool call 但有 `MODEL_RESPONSE_COMPLETED` 则 `actual = 'answer'`；两者皆无（截断的 run）则**不产生该 checkpoint**（不可判定就不出题——诚实原则延伸）。
- `modelCallNumber` 与 `buildContextSnapshots` 的 `number` 语义一致（都按 `MODEL_REQUEST_STARTED` 递增计数），这样揭示阶段可以直接 `contextSnapshots[checkpoint.modelCallNumber - 1]` 取证据。

**Acceptance tests（基于真实 fixture，已用当前代码验证过的事实）：**
- auth fixture（`fixtures/auth-bug/runtime.jsonl`）：2 个 checkpoint；`[0]` 为 `eventIndex: 3, actual: 'read', actualToolName: 'read'`；`[1]` 为 `eventIndex: 13, actual: 'answer'`。
- multi fixture：3 个 checkpoint，actual 依次 `'read'`、`'edit'`、`'answer'`（eventIndex 3 / 16 / 29）。
- 截断 trace（内联构造：只有 `MODEL_REQUEST_STARTED` 无后续）：返回 0 个 checkpoint。
- 确定性：对同一 trace 连续调用两次，`deepEqual`。
- checkpoint 的 `modelCallNumber` 与 `buildContextSnapshots(trace)[k].number` 一一对应（交叉断言）。

**Done when:** 上述测试全绿；函数无副作用、不触碰 `trace.events` 之外的任何全局状态。

---

### Task 7 — `src/game/session.ts`：纯 Game Session reducer + debrief

**Files to create:**
- `src/game/session.ts`
- `src/game/index.ts`（导出面）

**Files to modify:**
- `tests/game.test.ts`

**Implementation notes:**

类型对齐 `docs/architecture-evolution.md` 的 Game Session 设计（本迭代只实现 `PREDICT_NEXT_ACTION`，其余 action 类型留给 Milestone C，**不要预先实现**）：

```ts
import type { AgentActionClass } from '../analysis/action-classes';
import type { PredictCheckpoint } from './checkpoints';

export type GamePhase = 'watch' | 'predict' | 'reveal' | 'debrief';

export type PlayerAction = { type: 'PREDICT_NEXT_ACTION'; choice: AgentActionClass };

export interface PlayerDecision {
  checkpointIndex: number;
  choice: AgentActionClass;
  actual: AgentActionClass;
  correct: boolean;
}

export interface GameSessionState {
  lessonId: string;
  phase: GamePhase;
  /** 下一个待预测的 checkpoint 下标；=== checkpoints.length 时全部完成 */
  checkpoint: number;
  decisions: PlayerDecision[];
}

export function createGameSession(lessonId: string, checkpoints: PredictCheckpoint[]): GameSessionState;

export function reduceGameSession(
  state: GameSessionState,
  action: PlayerAction | { type: 'REACH_CHECKPOINT' } | { type: 'CONTINUE_REPLAY' },
  checkpoints: PredictCheckpoint[],
): GameSessionState;

export interface PredictDebrief {
  total: number;
  correct: number;
  /** 逐决策解释素材：checkpoint + decision，供 UI 结合 ContextSnapshot 渲染 */
  entries: Array<{ decision: PlayerDecision; checkpoint: PredictCheckpoint }>;
}

export function buildPredictDebrief(state: GameSessionState, checkpoints: PredictCheckpoint[]): PredictDebrief;
```

状态机（严格、可测）：
- `watch` --`REACH_CHECKPOINT`（且 `checkpoint < checkpoints.length`）--> `predict`
- `predict` --`PREDICT_NEXT_ACTION`--> `reveal`（记录 `PlayerDecision`，`correct = choice === checkpoints[i].actual`）
- `reveal` --`CONTINUE_REPLAY`--> `checkpoint + 1 === checkpoints.length ? 'debrief'（若 replay 也已播完）: 'watch'`；实现上 `CONTINUE_REPLAY` 一律回 `watch` 并 `checkpoint += 1`，`debrief` 由 UI 在 replay 完成时置入（reducer 提供 `{ type: 'COMPLETE_RUN' }` 亦可，二选一，保持 reducer 内闭合优先：加 `COMPLETE_RUN` action）。
- 非法转移（如 `watch` 状态收到 `PREDICT_NEXT_ACTION`）返回原 state（引用相等），便于测试断言。

debrief 内容基于决策而非泛泛评分（Milestone B 要求"short debrief based on decisions, not generic points"）：`entries` 携带每个 checkpoint 的 actual 与玩家选择，UI 层再补充该 checkpoint 的 ContextSnapshot 摘要（"Model #2 could see the read result you didn't have at Model #1" 这类解释由 UI 从 diff 生成，reducer 不做文案）。

**Acceptance tests:**
- 确定性重放：对 auth checkpoints 依次施加 `REACH_CHECKPOINT → PREDICT(read) → CONTINUE → REACH → PREDICT(answer) → CONTINUE → COMPLETE_RUN`，两次独立运行结果 `deepEqual`；最终 `decisions` 为 `[correct: true, correct: true]`，phase 为 `debrief`。
- 错误预测：`PREDICT(edit)` 在 actual 为 read 的 checkpoint 上产生 `correct: false`，但状态机照常前进（预测错误不是失败态，是教学素材）。
- 非法转移返回原引用。
- **不可变性**：reducer 全程不 touch trace——测试用 `Object.freeze` 深冻结 checkpoints 与（构造 checkpoints 用的）trace，任何 mutation 会直接抛错。
- `buildPredictDebrief` 的 `correct/total` 与 decisions 一致。

**Done when:** `src/game/` 不 import 任何 React / DOM / three.js；`npm test` 全绿。

---

### Task 8 — CinematicCity 接入 Predict 模式

**Files to modify:**
- `src/product/CinematicCity.tsx`
- `src/experience/explore.ts`（复用 `MODEL_GATES` 或直接用 `AgentActionClass` 的四个大写标签，二选一，避免第二份 READ/EDIT/BASH/ANSWER 列表）
- `src/styles.css`（`.predict-overlay`、`.predict-choice`、`.predict-reveal`、`.predict-debrief`）
- `tests/experience.test.ts`（新增可纯测的接线 helper）

**Implementation notes:**

1. **入口**：landing card 的 `landing-actions` 增加按钮 `Play & Predict`。点击后 `enterCity()` 的同时初始化 `gameSession`（`createGameSession(scenario.id, checkpoints)`）；原 `Enter the city →` 行为完全不变（不间断 Watch 保持默认）。状态：

   ```tsx
   const checkpoints = useMemo(() => derivePredictCheckpoints(trace), [trace]);
   const [game, setGame] = useState<GameSessionState | null>(null); // null = 纯 Watch
   ```

2. **暂停触发**：现有 rAF 播放 effect 中，帧推进（`setIndex(value + 1)`）之前判断：若 `game` 非空、`game.phase === 'watch'`，且**下一帧**的 `lessonMap[next]` 命中某个尚未消费的 checkpoint 的 `eventIndex`（比对 `checkpoints[game.checkpoint]?.eventIndex === lessonMap[next]`），则 `setIndex(next)`、`setPlaying(false)`、`setGame(reduceGameSession(game, { type: 'REACH_CHECKPOINT' }, checkpoints))`。用 `eventIndex` 对齐而非 `lessonFrame.type === 'MODEL_REQUEST_STARTED'`，因为判定必须锚定 trace（决策 3）。
   - 注意：lessonMap 是 lesson 帧 → trace 下标的映射，auth 剧本的两个 `MODEL_REQUEST_STARTED` 帧恰好映射到 checkpoint 的 eventIndex 3 / 13（已验证），multi 同理三个。若未来某剧本的 lesson 帧未覆盖某个 checkpoint，该 checkpoint 自然被跳过——可接受，出题范围 ⊆ 剧本呈现范围。
3. **预测 overlay**（`game.phase === 'predict'`）：全屏半透明层，标题 "What will the Agent do next?"，副标题给玩家真实证据入口——渲染该 checkpoint 的 `ContextSnapshot`（`contextSnapshots[checkpoint.modelCallNumber - 1]`，Task 2 已把 snapshots 引入本组件）items 摘要（最多 6 条，按 kind 分组），并注明 evidence level（snapshot.evidence 为 derived 时照实展示 `DERIVED` 徽章——这正是把证据诚实性带进游戏层）。四个按钮 READ / EDIT / BASH / ANSWER，点击 dispatch `PREDICT_NEXT_ACTION`。
4. **揭示层**（`game.phase === 'reveal'`）：显示玩家选择 vs `checkpoint.actual`（含 `actualToolName`，如 "The Agent called read"）；正误标记；解释区：
   - checkpoint 为第 1 次 model call：解释基于当前 snapshot items（"它只有 user request，还没有外部证据，所以先取证"这类由 items 组成的模板句，**从数据拼装，不写死文件名**）。
   - 第 ≥2 次：用 `compareContextSnapshots` 的 `added` 列表解释（"自上次决策后新增了 N 条证据：…"）。
   - `Continue` 按钮 dispatch `CONTINUE_REPLAY` 并 `setPlaying(true)`。
5. **debrief**（replay 播完且 `game` 非空）：`mode === 'complete'` 分支在有 game 时先 dispatch `COMPLETE_RUN`，渲染 `buildPredictDebrief` 结果：`correct/total` + 逐 checkpoint 一行（你的选择 / 真实动作 / 一句证据解释）。保留原 complete 面板的按钮组；新增 `Predict again`（重置 game + index）。
6. **纯测接线 helper**：把"下一帧是否命中 checkpoint"提取为纯函数放进 `src/game/checkpoints.ts`：

   ```ts
   export function checkpointAtLessonFrame(
     checkpoints: PredictCheckpoint[],
     lessonMap: number[],
     lessonIndex: number,
     nextCheckpoint: number,
   ): PredictCheckpoint | null;
   ```

   这让暂停逻辑可以在 node:test 覆盖，UI effect 只剩 dispatch。
7. Predict 模式下禁用 scrub/rail 跳转（或跳转即退出 game 回纯 Watch 并提示）——选后者，最小实现：任何手动 seek 将 `setGame(null)`，并渲染一次性 toast "Prediction ended — you took manual control."，避免 checkpoint 计数与时间轴脱节的状态债。

**Acceptance tests:**
- 纯逻辑：`checkpointAtLessonFrame` 对 auth 的 lessonMap 在 lessonIndex 3 与 12（两个 `MODEL_REQUEST_STARTED` 帧）分别命中 checkpoint 0 / 1，其余帧为 null。
- 既有全部 experience 测试不回归（不间断 Watch 契约、65s 时长断言等保持不动）。

**Done when:** demo trace 上 `Play & Predict` 完整走通两个 checkpoint 到 debrief；`Enter the city` 纯 Watch 行为与 v0.11 逐帧一致；`npm run typecheck` / `npm test` 通过。

---

### Task 9 — Predict e2e 冒烟

**Files to create/modify:**
- `tests/e2e/predict.spec.ts`（新建）

**Implementation notes:** 参照现有 `cinematic.spec.ts` 风格（不做像素断言，断言模式/标签/控件/无 pageerror）。为避免等待真实 65s 时长，第一个 checkpoint 在剧本 ~14s 处（帧 0–2 共 13.7s），可接受直接等待；第二个 checkpoint 前的等待较长，允许用 2× speed（transport select 已存在）压缩。

**Acceptance tests:**
1. landing → `Play & Predict` → 等待 predict overlay 出现（`What will the Agent do next?`），断言四个选项按钮可见、overlay 中出现 context 证据条目。
2. 点击 `READ` → 揭示层显示 correct 标记与 "read"；点 Continue → 播放恢复（`FOLLOWING RUN`）。
3. （可选，若时长可控）走完第二个 checkpoint 选 `ANSWER` → complete 后 debrief 显示 `2/2`。
4. 对照组：`Enter the city` 路径全程不出现 predict overlay。
5. 全程 `pageerror` 过滤 deprecated 后为空。

**Done when:** `npm run check:browser` 本地通过（e2e 不进 CI，维持现状）。

---

### Task 10 — `sourceHash` + 确定性 trace id

**Files to modify:**
- `src/adapters/pi/redact.ts`（把内部 `sha256Hex` 导出，或移到 `src/adapters/pi/hash.ts` 供复用）
- `src/adapters/pi/import.ts`（`importPiJsonl` 对原始 `text` 计算 sha256 写入 `trace.sourceHash`；`trace.id` 改为 `pi-${kind}-${hash.slice(0, 12)}`）
- `src/adapters/pi/normalize.ts`（`normalizePiRuntime` / `normalizePiSession` 的 id/createdAt 生成改为可由调用方覆写，或由 import.ts 统一在 normalize 后赋值——选后者，改动面最小）
- `src/semantic-trace/merge.ts`（`id: \`pi-combined-${runtime 短 hash}-${session 短 hash}\``；`createdAt` 改为 `Math.max(runtime.createdAt, session.createdAt)`；同时把"无 timestamp 事件排到 `MAX_SAFE_INTEGER`"写成命名常量 + 注释，从隐式行为变成显式规则）
- `tests/pi-adapter.test.ts`

**Implementation notes:** `createdAt` 在单文件导入场景改为事件最大 timestamp（存在时）否则 0——彻底移除 `Date.now()`；`normalize.ts` 中 `lastTimestamp = Date.now()` 兜底改为 `0`（仅在事件完全无 timestamp 时生效，替换后导入结果可复现）。UI 无处消费 createdAt 的墙钟语义（已确认 explorer 只显示事件 timestamp），风险低；若 typecheck 发现消费点，在任务内逐一评估。

**Acceptance tests:**
- 同一 fixture 文本导入两次：`trace.id`、`trace.sourceHash`、`trace.createdAt` 完全相等；整个 `trace` 除 `sourceEvent` 引用外 `deepEqual`。
- 不同文本 → 不同 `sourceHash`。
- `mergePiTraces` 同输入两次调用结果 `deepEqual`（修复评审"合并不可复现"）。
- 现有全部 adapter/redaction 测试不回归。

**Done when:** 全仓库 grep `Date.now()` 在 `src/adapters/` 与 `src/semantic-trace/` 下为 0 命中。

---

### Task 11 — legacy site-* 归档 + 移除 `check:live`

**Files to modify/move:**
- `git mv site-beta site-visual-beta site-live-beta legacy/`（三个目录整体移动）
- 新建 `legacy/README.md`：一段话说明"历史原型，已冻结，不是产品运行时，不接受修改"，指向 `docs/architecture-evolution.md` 的 One Core 决策
- `package.json`：删除 `check:live` 脚本；`scripts/check_live_beta.py` 一并移入 `legacy/` 或删除（优先删除，若 README/docs 引用则同步清理）
- 全仓库 grep `site-live-beta` / `check:live` 修正残留引用（README、docs/*）

**明确不做：** 不 touch `.github/workflows/deploy-pages.yml`（未提交草稿，其 paths 含 `site-live-beta/**` 的问题记入 Open questions，由人类决定该文件的去留后一并修）。

**Acceptance tests:** `npm run check:ci` 通过（build 不依赖 legacy 目录）；`git grep -l "check:live"` 无产品侧命中。

**Done when:** 根目录不再有 site-* 原型；文档引用一致。

---

## Suggested commit slices

按依赖顺序，每片独立可验证（`npm run check:ci` 绿）：

1. `fix: derive cinematic evidence labels from real trace events`（Task 1）
2. `fix: use real context diff in cinematic compare panel`（Task 2）
3. `fix: require explicit consent before Photo Mode swaps traces`（Task 3）
4. `feat: add minimal 3D scene error boundary with explorer fallback`（Task 4）
5. `refactor: extract shared agent action classification`（Task 5）
6. `feat: derive predict checkpoints from semantic trace`（Task 6）
7. `feat: add pure deterministic game session reducer`（Task 7）
8. `feat: wire Predict mode into cinematic shell`（Task 8）
9. `test: add Predict browser smoke coverage`（Task 9）
10. `feat: make trace ids and merges deterministic via sourceHash`（Task 10）
11. `chore: archive legacy static site prototypes`（Task 11）

Workstream A（1–4）必须先合入；5–9 严格顺序；10、11 与 B 无依赖，可穿插但建议排在 B 之后，避免同时改 adapter 与 game 引入排查噪声。全部完成后（人类确认）`npm version 0.12.0-beta.1 --no-git-tag-version` + 文档收尾（README / roadmap / architecture-evolution 的 Milestone B 状态更新）作为最后一个 `docs:` commit。

## Open questions for human

1. **`deploy-pages.yml` 的去留**：该未提交草稿的触发 paths 含 `site-live-beta/**`（已宣布退役的原型会触发生产部署）。选项 A：删除，维持 provider-neutral；选项 B：修正 paths 后提交，作为"已显式选择的 Pages adapter"。本计划不替你决定，Task 11 也刻意绕开了它。
2. **真实 runtime fixture**：评审指出两个 real fixture（`fixtures/real-read`、`fixtures/real-multi`）经 `detectPiImportKind` 均判为 **session** 类，永远路由到 Explorer——guided lesson 与新的 Predict 机制至今没有被任何真实数据走通过。需要你提供一份真实 **runtime** JSONL 经 `npm run redact:fixture` 处理，并在隐私 checkpoint 上逐行确认后入库（流程同 v0.11 Task 4）。在此之前，Predict 的验收只覆盖两个合成 fixture——这个局限应写进 release notes。
3. **Predict 是否计分**：本计划按 Milestone B 口径只做"逐决策 debrief，不做泛化积分"。若你想要连击/分数等游戏化元素，属于范围外，需另立计划。
4. **手动 seek 退出 Predict** 的交互（Task 8 第 7 点）是否可接受？备选是 seek 时禁用而非退出。
5. **Photo Mode 换 trace 后退出是否自动还原导入 trace**（Task 3 第 3 点）——默认不还原，如需还原请在执行时说明。

## Explicitly out of scope

- Milestone C（Context selection challenge）及其容量约束交互
- Milestone D（branch / compaction / time machine）
- payload discriminated union 的 schema v2 迁移（`TOOL_CALL_CREATED` / `TOOL_RESULT_ATTACHED` 的逐事件迁移留给 Predict 验证后的下个迭代）
- `PI_ADAPTER_VERSION` bump 流程演练（本迭代 adapter 行为变更仅限 id/createdAt/sourceHash，属 envelope 元数据；若执行中发现事件语义变化，停下来询问）
- e2e 进 CI（`check:browser` 维持本地）
- 任何托管 workflow 的新增或提交
- Watch 播放节奏改为真实 timestamp 驱动（评审认为导演节奏教学上合理；仅在 UI 补一句"pacing is directed"说明可作为 Task 8 的顺手项，非必须）
