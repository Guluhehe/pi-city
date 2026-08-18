# Story → Trace 最小翻面契约

## 目标：让玩家看见同一个因果，而不是打开另一个产品

城市故事不能在结尾简单放一个“查看后台”按钮；那只会把 Pi City 拆成一个 cozy game 和一个 Trace 工具。正确的翻面体验应让玩家在故事里先形成一个因果直觉，然后在真实或脱敏 Pi 运行里认出同一种因果。

> **故事不是 Trace 的改写，Trace 也不是故事的证据。** 两者通过一个明确的 `ConceptPattern` 相连：故事让玩家体验模式，Trace 让好奇玩家看见模式在真实运行中如何被证据支持。

MVP-0 只做一张翻面卡和一个最小匹配接口；不需要把完整 Trace Explorer 嵌入故事任务。

## 三层必须分开

| 层 | 它是什么 | 可否修改 | 玩家看到的标签 | 不可做的事 |
|---|---|---|---|---|
| 城市故事（Tutorial Scenario） | 作者定义的教学关卡、居民、地点、发现物与分支。 | 可以重玩、选择不同路线。 | `Pi 的城市故事`。 | 不得暗示为真实 Pi 运行。 |
| 概念模式（Concept Pattern） | 对 Pi 行为因果的稳定描述，如“工具结果改变下一次判断”。 | 可跨故事和 Trace 复用。 | `Pi 小知识`。 | 不得伪称观察到的原始事件。 |
| 真实 Trace（Evidence Run） | 导入或内置的脱敏 Pi JSONL，经 Semantic Trace 处理。 | 不可修改。 | `真实运行示例` + Observed / Derived / Synthetic。 | 不得被故事分支、教程结果或虚构工具输出污染。 |

## MVP-0 唯一要求的概念模式

首个翻面只支持一个模式：

```text
TOOL_RESULT_RESHAPES_NEXT_DECISION
```

它的玩家语言是：

> “Pi 做完一件事以后，把新发现带回来再想了一下，所以接下来没有照原来的办法做。”

它的 Pi 语言是：

> “一次工具结果在下一次模型调用前进入可见 Context；该新增信息与此前状态共同导致了下一次不同的模型动作。”

这不是声称因果可由单一事件绝对证明。Trace UI 必须保留审慎措辞，例如“这段工具结果**成为**下一次可见 Context 的新增证据；随后模型作出下一动作”，而不能说“结果**强制**模型这样做”。

## 翻面卡：最小 UI 规格

翻面卡只在玩家完成喷泉的“新节拍回到思考塔，路线从普通工具坊变为同步阀工作台”这一时刻出现。默认折叠，不打断城市完成感。

| 卡片面 | 内容 | 目的 | 不显示什么 |
|---|---|---|---|
| 故事面 | “Pi 把第七拍的新节拍带回塔里。和刚才的水压线索放在一起后，Pi 换了一个办法。” | 固化玩家刚刚看到的因果。 | 术语、日志、事件 ID。 |
| Pi 小知识面 | “在 Pi 里，工具带回的结果会成为下一次思考时看得见的新信息。新的信息可能让下一步行动改变。” | 给体验命名，但不要求背诵。 | token、RPC、schema、上下文窗口。 |
| 真实示例面 | “想看一个真实 Pi 运行里类似的时刻吗？”并说明“这是**另一个脱敏示例**，不是刚才的城市故事”。 | 邀请好奇玩家跨入 Trace。 | 声称该故事直接来源于某段真实代码。 |

若没有兼容 Trace，第三面显示“Pi 的后台档案馆会在有合适真实示例时开放”，而不是把不匹配的 Trace 强行贴上去。

## Trace 匹配契约

一个真实 Trace 只有同时满足以下条件，才可作为 `TOOL_RESULT_RESHAPES_NEXT_DECISION` 的可比示例。

| 条件 | 需要的现有能力 | 为什么必要 |
|---|---|---|
| 能定位成功工具调用与工具结果。 | Pi Adapter 对 tool lifecycle / `toolCallId` 的关联。 | 知道故事中的“带回新发现”可对应哪段真实事实。 |
| 能展示结果前后的模型可见 Context 差异。 | Context Snapshots 与 Compare / Diff。 | 证明工具结果确实成为下一次可见信息，而非只出现在时间线上。 |
| 结果后存在一次新的模型决策。 | Semantic Trace + Story Builder。 | 让玩家看见“再想后下一步”，而非只有一个工具结束。 |
| 新决策与之前原计划存在可读对比。 | Derived explanation；不得伪造因果。 | 说明这是“方向变化”而不只是时间推进。 |
| 证据等级完整显示。 | Observed / Derived / Synthetic 模型。 | 防止教学类比污染真实性。 |

这里的“方向变化”可以是下一次工具调用、修改策略、验证步骤或最终回答，但必须由现有 Trace 支持。若 trace 只包含 `READ → ANSWER`，它可以适合别的概念，却不适合此翻面卡。

## 结构化配置草案

MVP-0 可用作者定义配置，而不是把故事逻辑硬编码进 World。字段名称仅为产品草案，不是实现承诺。

```ts
ConceptPattern {
  id: "tool-result-reshapes-next-decision"
  playerSummary: "新发现带回来后，Pi 换了一个办法。"
  piSummary: "工具结果进入下一次可见信息后，模型作出新的动作。"
  storyMomentId: "fountain.sync-valve-rethink"
  requiredTraceCapabilities: [
    "tool-result-linked",
    "context-diff-available",
    "subsequent-decision-available"
  ]
}

TutorialStoryMoment {
  id: "fountain.sync-valve-rethink"
  source: "tutorial"
  conceptPatternId: "tool-result-reshapes-next-decision"
  visibleArtifacts: ["pressure-observation-card", "missing-beat-sheet"]
  storyOutcome: "sync-valve-workbench-unlocked"
}

TracePatternMatch {
  traceId: "sha256:..."
  conceptPatternId: "tool-result-reshapes-next-decision"
  evidence: {
    observedToolResultEventIds: ["..."]
    derivedContextDiffId: "..."
    observedOrDerivedNextDecisionId: "..."
  }
  confidence: "supported-example"
}
```

`confidence` 不得使用 `proved-cause` 或 `same-event`。故事与 Trace 是相似模式，不是同一事实。

## 从故事进入真实示例的四步体验

| 步骤 | 玩家看见什么 | 系统在做什么 | 真实性防护 |
|---:|---|---|---|
| 1 | 喷泉中两张发现物回到思考塔，路线改变。 | 完成教学故事状态转换。 | 所有事件带 `tutorial` 来源。 |
| 2 | 折叠的翻面卡一句话总结。 | 绑定 `ConceptPattern`。 | 不出现 Trace ID 或“真实记录”暗示。 |
| 3 | 玩家主动点“看一个真实 Pi 例子”。 | 查找匹配的兼容 Trace。 | 先出现“另一个脱敏示例”说明。 |
| 4 | Explorer 从工具结果前后的 Context Diff 开始，而非从日志首行开始。 | 深链到支持模式的 3–5 个事件窗口。 | Observed / Derived / Synthetic 标签持续可见。 |

Explorer 的首次视野应答复故事中已经产生的问题：

> “刚才 Pi 为什么改了下一步？在这个真实示例中，看看新工具结果进入 Context 后，下一次行动前发生了什么。”

若玩家想继续，再自行展开原始事件、完整 Story、Session 与 Compare。这样 Trace 是故事体验的放大镜，而不是新开一台复杂机器。

## MVP-0 的验收问题

| 问题 | 通过的自然回答 | 失败回答 | 需要修正的层 |
|---|---|---|---|
| “刚才城市故事是真实 Pi 日志吗？” | “不是，是拿来说明 Pi 怎么工作的故事。” | “是喷泉那段真实代码。” | 教学故事标记与过渡文案。 |
| “真实示例和故事有什么关系？” | “它们都在说工具结果回来后会影响下一步。” | “它们是同一件事。” | Concept Pattern 与翻面卡。 |
| “真实 Pi 会不会每次都去六个地方？” | “不会，看这次有什么信息和结果。” | “会，先记忆再观察再工具。” | 城市任务的动态状态与 Explorer 首屏。 |
| “为什么要点进档案馆？” | “想看看 Pi 在真实运行里怎么再想一次。” | “因为这是教程的下一步。” | 可选性与入口承诺。 |

## 当前明确不做

- 不从教学故事自动生成真实 Trace。
- 不把教程分支写进 Semantic Trace、Context Snapshot 或导入 JSONL。
- 不声称具体故事事件由真实模型事件引起。
- 不在 MVP-0 做完整 Trace 浏览、上传、本地文件管理或多模式切换。
- 不在没有可比证据时展示一个仅因题材相近的 Trace。

这个契约的价值在于先建立“故事与真实 Pi 必须互相照亮”的方向约束。完整整合可以在 MVP-0 核心循环通过后再做；但若没有这条约束，二者很容易从一开始就长成两个彼此无关的产品。

## References

[1]: https://github.com/Guluhehe/pi-city/blob/main/README.md "Pi City README: evidence model, Context Compare, Story, World, and Experience"
