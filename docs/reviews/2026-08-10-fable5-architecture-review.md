---
title: Fable 5 Architecture Review
date: 2026-08-10
model: wanqing/claude-5-fable
status: active-guidance
audience: humans + coding agents
---

# Pi City — Fable 5 Architecture Review

> **For coding agents:** Treat this document as binding product/architecture guidance alongside [`docs/architecture-evolution.md`](../architecture-evolution.md). Prefer its priority list when choosing the next implementation work. Do not contradict its evidence-honesty rules (Observed / Derived / Synthetic must stay distinguishable; never silently replace user traces with demo narration).

**Source:** External review by Claude Fable 5 via myflicker, based on the repository state around the v0.11 trustworthy public beta. Identity / hosting / personal metadata were redacted before check-in.

评审范围：`docs/architecture-evolution.md`、`src/semantic-trace/`、`src/adapters/pi/`、`src/experience/`、`src/product/CinematicCity.tsx`、`src/world/PiCityScene.tsx`、`src/App.tsx`、`tests/`、fixtures、CI/部署配置。所有身份类信息按约定以 `<redacted>` 处理。

---

## 1. 一句话判断

**最强**：证据层纪律——`SemanticTrace`（schemaVersion + adapterVersion + Observed/Derived/Synthetic 三级证据 + import completeness report）是一个真正被代码和测试共同执行的契约，不是文档口号。
**最弱**：教学阶梯卡在 Watch→Understand，`GamePhase`/`PlayerAction`/pure reducer 在 `docs/architecture-evolution.md` 里设计得很完整，但 `src/` 中一行都不存在；同时 cinematic shell 的叙事文案（scenario `what/why/evidence` 与 `before/after`）是硬编码的 lesson copy，正在悄悄侵蚀这条证据纪律。

---

## 2. 架构评审

### 2.1 Semantic Trace 核心：干净，且被测试锁住

- `src/semantic-trace/schema.ts` 的 envelope（`SEMANTIC_TRACE_SCHEMA_VERSION`、`adapterVersion`、`TraceWarning`、`asTraceWarnings` 的 legacy 迁移路径）实现与 `docs/architecture-evolution.md` 的目标结构一致。`tests/pi-adapter.test.ts` 明确断言 `trace.schemaVersion === SEMANTIC_TRACE_SCHEMA_VERSION`，版本契约有回归保护。
- `src/semantic-trace/reducer.ts` 的 `reduceRuntimeState` 是纯函数，`buildTraceFrames` 确定性重放，符合"trace immutable、状态派生"的设计。
- **漂移点 1**：`schema.ts:74` 的 `sourceHash?` 全仓库无任何写入方（grep 仅命中类型声明本身）。文档承诺"库化真实 run 前先有可追溯哈希"，这个字段目前是装饰品。
- **漂移点 2**：`src/semantic-trace/merge.ts` 中 `id: \`pi-combined-${Date.now()}\``、`createdAt: Date.now()`，以及 `normalize.ts` 里 `timestampOf` 兜底 `Date.now()`——合并/导入结果不可复现。对一个宣称 deterministic replay 的系统，trace 身份本身是非确定的。merge 里无 timestamp 事件排序到 `MAX_SAFE_INTEGER`（`merge.ts:40`）也值得写成显式规则而非隐式行为。
- **漂移点 3**：`SemanticEvent.payload` 仍是 `Record<string, unknown>`，文档说"重要事件应逐步获得 discriminated payload"。目前下游到处是 `typeof event.payload.toolName === 'string'` 式的防御性取值（`analysis/run.ts:56`、`analysis/context.ts:55`、`analysis/story.ts:90`），同一个 toolName 提取逻辑重复了至少 3 次。

### 2.2 Pi adapter：容错和证据标注做得好

- `src/adapters/pi/import.ts` 的 `PiImportReport`（validRecordCount / invalidLineCount / unsupportedEventCount / replayClosure）完全落实了文档的 import reliability 承诺，且有 `fixtures/malformed/` 回归测试。
- `normalize.ts` 对 `turn_start → CONTEXT_COMPILE_STARTED/CONTEXT_COMPILED/MODEL_REQUEST_STARTED` 的 derived 标注带 note（"RPC does not expose context compilation directly"），旧日志缺 `agent_settled` 时从 `agent_end` 派生 closure 并降级为 derived——这是全项目最诚实的一段代码。
- `redact.ts` 的 allowlist 策略（保留 lifecycle 元数据、按 `[REDACTED_CONTENT sha256:… length:…]` 替换正文）配套的测试（`tests/pi-adapter.test.ts` 约 200 行专测 redaction，含确定性断言和对公开 fixture 的逐行扫描）是同类项目里少见的严格。
- **小问题**：`normalize.ts:16` 的模块级 `let sequence = 0` 靠每次 normalize 入口重置。当前无并发场景所以安全，但这是一个隐藏的全局状态，未来 worker 化或并行导入会踩坑。

### 2.3 Experience 层：声明式做到了，但兼容性判定偏结构、不看内容

- `src/experience/shots.ts` 单一 shot library 同时服务 Watch / Photo Mode / Python 视觉校验（`exportShotLibrary`），消灭了文档警告的"多渲染器 switch 重复"，方向正确。
- `scenario-compatibility.ts` 的 `evaluateScenarioCompatibility` 按**事件类型的有序出现**匹配，missing beat 不 clamp、`mapLessonFramesToTrace` 对不兼容 trace 直接 throw（"silent fallback is forbidden"）——路由纪律很好，测试覆盖充分（`tests/experience.test.ts` 有 12 个用例专门锁死"不会把未知 trace 默认成 auth"）。
- **风险**：兼容性只校验事件类型序列，不校验内容。任何一个恰好满足 15 个 auth beat 顺序的真实 run，都会被套上 auth 剧本的硬编码文案——"Decision: inspect src/auth.ts"、"The harness executes read(src/auth.ts)"（`scenarios.ts` AUTH_BUG_FRAMES）。用户导入自己的 run，看到的却是别人的文件名和别人的决策解释。这是当前架构里**最大的叙事污染入口**（详见 §4）。

### 2.4 Cinematic shell：功能完整，但混入了两处"剧本压过证据"

- `src/product/CinematicCity.tsx` 468 行做完了 landing/watch/photo/explore/complete 五态，`run = analyzeRun(trace)` 驱动可见总数，符合 v0.11 承诺。
- **问题 1**：Context Compare 面板（`CinematicCity.tsx` `showCompare` 分支）渲染的是 `scenario.before` / `scenario.after` 的**静态字符串数组**（"Read result"、"+ Edit result"），而不是 `buildContextSnapshots` + `compareContextSnapshots` 的真实 diff。Evidence Explorer 里算的是真数据，cinematic shell 里给的是剧本贴纸——同一个产品的两个面对同一问题给出不同真实性等级的答案。
- **问题 2**：`ensureAuthPhotoDemo()` 在进入 Photo Mode 时，如果当前 trace 与 auth 不兼容，会**静默丢弃用户导入的 trace 并换回 demo**（`setTrace(loadDemo())`），无任何提示。全局键盘 `1/2/3` 也会触发这条路径。对一个把"不静默替换真相"写进 README 的项目，这是行为与原则的直接冲突。
- Watch 播放时序由 `lessonFrame.durationMs`（作者编排）驱动，而非事件真实 timestamp——教学上合理，但 UI 没有任何地方说明"节奏是导演的，不是运行时的"。

### 2.5 Dual-runtime legacy：决策已下，尸体未埋

- `docs/architecture-evolution.md` 明确"Vite 是唯一维护的产品运行时，static sites 是历史原型"。但 `site-beta/`、`site-visual-beta/`、`site-live-beta/`（74KB 的独立 index.html，含自己的 normalization/story/camera 实现）仍在仓库根目录，没有移入 legacy 目录也没有 README 级别的"已冻结"标记之外的隔离。
- **更实际的漂移**：未提交的 `.github/workflows/deploy-pages.yml`（git status 中为 `??`）的触发 paths 里包含 `site-live-beta/**`——一个宣布退役的原型仍会触发生产部署。这正是文档警告的"同一份 Pi log 在 dev 和 prod 讲不同故事"的物理载体。
- `package.json` 里 `check:live` 脚本仍指向 `scripts/check_live_beta.py`，继续给 legacy 面留活口。

---

## 3. 产品体验评审

### 阶梯现状：Watch ✅ / Understand ✅（约 80%）/ Predict ❌ / Intervene ❌

- **Watch** 成立：65 秒 auth 旅程（`tests/experience.test.ts` 锁死 `scenarioDurationMs === 64900`）、chapter bumper、Aha 卡片（uturn / context）、`EVENT_SHOT` 镜头映射，节奏和空间语言完整。
- **Understand** 大体成立：Evidence Explorer 的 Story / Session / Context / Compare / Events 六视图 + Inspector 的 what/why + evidence level 徽章，是真正的理解层。`analysis/story.ts` 的 `classifyTools`（inspect/change/execute 分类、"Change and verify" 合并）让 multi-tool run 保持可读，有测试。
- **Predict / Intervene 为零**：架构文档把 first playable mechanic（"Predict the Agent's next action"，在 `MODEL_REQUEST_STARTED` 暂停 → 玩家选 READ/EDIT/BASH/ANSWER → 揭示 → 解释）设计到了伪代码级别，`GameSessionState` 类型都写好了，但 `src/` 中不存在任何 game session / player action / prediction 代码。这个机制被文档自己评为"最小的、复用全部现有系统的"一步——它已经拖了至少两个版本（v0.9 视觉、v0.10 相框、v0.11 诚实性都排在它前面）。

### 教学心智模型：三条核心结论中两条有强载体，一条偏弱

1. "Agent 是循环不是单次调用" → U-turn Aha + `uturn` 镜头，**载体最强**。
2. "Session ≠ Context" → Context Works 的 selected/rejected cargo + Compare 视图，成立；但 cinematic shell 的 Compare 用静态文案（§2.4），削弱了"diff 是可检查的而非魔法"这句自己的台词。
3. "Tool Result 是证据不是答案" → 依赖 U-turn 动画 + 文案，无交互验证。这恰恰是 Predict 机制要测的心智模型——再次指向同一个缺口。

### 体验断点

- 导入不兼容 run → Evidence Explorer + 显式 notice（`IMPORT_FALLBACK_NOTICE`），路由诚实。但对用户来说这是**降级体验**（从电影院跌进仪表盘），notice 只解释了"为什么"，没有给"你的 run 里发生了什么"的最小引导（比如自动进入 Journey 视图而非 Overview）。
- 兼容 run 进电影院后，看到的是剧本文案而非自己 run 的内容（§2.3），Watch 的可信度对真实导入用户反而低于 Explorer。

---

## 4. 证据诚实性

**底层：优秀。** Observed/Derived/Synthetic 贯穿 schema → adapter（每个 derived 事件带 note）→ analysis（`RunAnalysis.evidence` 计数）→ Explorer Inspector（level 徽章 + "Why this evidence level?"）→ import report（`replayClosure`）。测试直接断言 derived note 文本。

**上层：三处污染，按严重度排序。**

1. **剧本文案冒充 run 叙述**（`scenarios.ts` + `CinematicCity.tsx`）：lesson frame 的 `what/why/evidence` 字符串（含具体文件名 `src/auth.ts`、具体决策"Decision: EDIT"）会应用到任何结构兼容的导入 trace 上。`evidence: "observed · toolCall read"` 这类标签是**写死的**，不是从 `event.evidence.level` 读的——如果未来某个兼容 trace 的对应事件实际是 derived，UI 会照样宣称 observed。v0.11 修掉了"不兼容 run 被套 auth 叙事"，但没修"兼容 run 被套 auth 细节"。
2. **静态 Context Compare**（§2.4 问题 1）：cinematic shell 的 before/after 是 lesson 元数据，真实 diff 引擎（`compareContextSnapshots`）只在 Explorer 使用。
3. **Photo Mode 静默换 trace**（§2.4 问题 2）：用户证据被无告知地替换为 demo。

另外一处轻微问题：Watch HUD 的 "MODEL 1/2 · TOOLS 0/1" 分母来自 `analyzeRun`（真实），分子来自映射后的 `frame.state`（真实）——这部分是干净的，说明修复模式已经存在，只是没有推广到文案层。

---

## 5. 工程卫生

| 项 | 状态 | 备注 |
| --- | --- | --- |
| 依赖锁定 | ✅ | `package.json` 全部精确版本，`package-lock.json` 已提交，`engines.node >=20` |
| Schema 版本 | ✅/⚠️ | envelope 版本化 + 测试锁定；但 `sourceHash` 未实现，payload 无 discriminated types，`PI_ADAPTER_VERSION='1.0.0'` 尚无 bump 流程验证 |
| 单元测试 | ✅ | node:test，508 行覆盖 adapter/redaction/analysis/experience；redaction 测试尤其扎实（确定性、逐行扫描公开 fixture） |
| e2e | ✅ | Playwright 覆盖 landing→watch、pause/resume、canonical frame deep link、import 双路由（兼容→city、不兼容→explorer notice），并断言 pageerror 为空 |
| fixture 覆盖 | ⚠️ | auth-bug / multi-tool / malformed / 两个 redacted 真实 Session。**缺口**：① 无真实 runtime JSONL fixture（两个 real fixture 都是 session 类，永远路由到 Explorer，等于 guided lesson 从未被真实数据 e2e 过）；② compaction / branch / model_change 事件有 normalize 代码但无 fixture 驱动的回归；③ `mergePiTraces` 只有一个 happy-path 测试 |
| CI | ✅ | `ci.yml` deployment-neutral（check:core + test + typecheck + build），有 concurrency 组和最小 permissions |
| 部署契约 | ⚠️ | `docs/deployment.md` 写得清楚（dist/ 唯一 artifact、VITE_BASE 子路径规则）；但未提交的 `deploy-pages.yml` 与"provider-neutral、adapter 需显式选择"的文档表述有张力，且其 paths 含 `site-live-beta/**`（legacy 泄漏）；e2e 不在任何 CI 工作流里（`check:browser` 仅本地） |
| 渲染失败兜底 | ❌ | 文档承诺"Story/Inspector 是 functional fallback"，但 `PiCityScene.tsx` / `CinematicCity.tsx` 无 ErrorBoundary、无 WebGL 检测、无 GLB 加载失败处理（`useLoader` 抛错会白屏整个 shell）。四级 quality tier 只存在于文档 |
| 遗留目录 | ⚠️ | 三个 site-* 原型仍在根目录，`check:live` 脚本存活 |

---

## 6. 优先改进清单（按 impact/effort）

1. **实现 Predict 机制（impact 最高，effort 中）**
   在 `MODEL_REQUEST_STARTED` 帧暂停 → 四选一 → 从 trace 揭示真实 `TOOL_CALL_CREATED`/`MODEL_RESPONSE_COMPLETED` → 展示该次 model call 的 `ContextSnapshot` 作为"证据解释"。文档已给出类型设计，全部依赖系统（replay、shots、snapshots、Inspector）已就位。这是产品论题（"playable"）兑现与否的分水岭，也是三条心智模型中最弱一条的交互验证器。

2. **把 cinematic Compare 接到真实 diff（impact 高，effort 低）**
   `CinematicCity.tsx` 的 `showCompare` 面板改用 `buildContextSnapshots(trace)` + `compareContextSnapshots`，`scenario.before/after` 仅作 demo trace 的兜底或彻底删除。修复成本一个下午，消除 §4 第 2 号污染。

3. **lesson 文案的 evidence 标签改为从事件读取（impact 高，effort 低）**
   `LessonFrame.evidence` 字符串改为渲染时取 `trace.events[traceIndex].evidence.level + source`；`what/why` 中的具体文件名/决策要么从 payload 插值，要么在非 demo trace 上降级为通用表述。消除 §4 第 1 号污染的机制部分。

4. **给 3D shell 加最小失败兜底（impact 高，effort 低-中）**
   一个 React ErrorBoundary 包住 `PiCityScene`，捕获后渲染"打开 Evidence Explorer"的引导。不需要四级 quality tier，先把"白屏 = 教学死亡"这条尾部风险砍掉，兑现文档已承诺的 fallback 决策。

5. **补一个 redacted 真实 runtime JSONL fixture 并让它走 guided 路径（impact 中，effort 中）**
   当前 guided lesson 从未被真实数据验证（两个 real fixture 都是 session 类）。用 `redact:fixture` 管道产出一个能通过 `evaluateScenarioCompatibility` 的真实 runtime run，加进 e2e。这也是 Milestone A 自己列的 open item。

6. **归档 legacy sites + 修正 deploy workflow（impact 中，effort 低）**
   三个 site-* 目录移入 `legacy/`，删除 `check:live`，从 `deploy-pages.yml` paths 里去掉 `site-live-beta/**`，并决定该 workflow 是提交（作为"已选择的 Pages adapter"）还是删除（维持 neutral）。当前"未提交但存在"的状态是最差的中间态。

7. **实现 `sourceHash` 并让 trace id 确定化（impact 低-中，effort 低）**
   导入时对原始文本做 sha256 写入 `sourceHash`，trace `id` 从 hash 派生而非 `Date.now()`。在建真实 run 库之前做，成本最低；之后做，要迁移。

---

## 7. 明确非建议（现在不该做的）

- **不要做第六个 district / 更大的世界**。文档自己说"next step is not a larger world"，v0.8–v0.10 已连续三个版本投入视觉。当前视觉资产足以支撑 Predict 机制。
- **不要做 Lesson Compiler / 通用课程 DSL**。只有两个 scenario 时抽象 compiler 是过早泛化；等 Predict 落地、第三个真实课程出现再说。
- **不要做 payload 全量 discriminated union 重写**。逐事件迁移（先 TOOL_CALL_CREATED / TOOL_RESULT_ATTACHED 这两个被 analysis 消费最多的），不要一次性 schema v2。
- **不要现在选定/增加托管适配器矩阵**（Vercel/Netlify/CDN 的 workflow）。deployment.md 的 neutral 契约已足够，多适配器是维护负担不是能力。
- **不要给 Explorer 加更多分析视图**。八个 tab 已接近理解层上限，缺的是交互不是视图。
- **不要引入 ECS / 游戏引擎 / 多人 / 账号 / 云端存储**（与任务约束一致，也与文档"essential complexity is teaching"判断一致）。
- **不要在 Predict 落地前继续做下一轮 art pass**。视觉边际收益已明显递减，而产品论题的核心承诺（playable）仍未兑现。

---

### 总评

这是一个证据层纪律罕见地严格、且用测试而非文档执行纪律的教育项目。v0.11 的"不兼容就降级、不伪造叙事"路由修复方向完全正确。但它当前处在一个微妙的失衡点：**底层越诚实，上层剧本文案的越权就越刺眼**；**架构文档越完整，Predict 机制的缺席就越像拖延**。下一个版本的正确形状不是 v0.12 视觉或 v0.12 诚实性补丁，而是把文档里已经设计好的第一个游戏机制变成代码。
