# Pi City MVP-0 二次评审包

> **状态：** 核心玩法假设与灰盒实施补丁；未实现，且允许被评审推翻。  
> **评审目的：** 判断 Pi City 是否应该进入三任务 Greybox，而不是继续扩写内容或投入正式美术。

本包是对上一轮游戏化学习设计与 GPT 外部评审的收缩回应。它不要求评审者同意“陪 Pi 在城市里办事”的方向；相反，它要求评审者挑战该方向最脆弱的前提：非技术玩家是否真的会享受并理解“新结果回来后，Pi 重新判断”的动态循环。

## 一句话产品假设

> 玩家帮助 Pi 处理一个居民委托；当 Pi 带回新的观察或工具结果时，玩家看见 Pi 改变下一步，并由此直觉理解 Pi 不是按固定脚本办事，而是根据当前可见信息循环判断。

## 本包回答的四个问题

| 问题 | 对应文件 | 评审者应挑战什么 |
|---|---|---|
| 什么证据会推翻 MVP-0？ | [01-mvp0-hypotheses.md](01-mvp0-hypotheses.md) | 判死线是否足够严格、是否真正可观察。 |
| 三个任务如何避免把 Pi 教成固定 SOP？ | [02-dynamic-missions.md](02-dynamic-missions.md) | 任务状态是否真的由事实驱动，而不是把地点顺序藏起来。 |
| 玩家究竟该怎么参与 Pi 的判断？ | [03-core-verb-experiment.md](03-core-verb-experiment.md) | “指下一站”是否应保留，还是应由“整理发现”或“提出确认问题”取代。 |
| 城市故事与真实 Trace 为什么必须属于同一产品？ | [04-story-trace-flip-contract.md](04-story-trace-flip-contract.md) | 翻面契约是否既能建立学习闭环，又不损害 evidence-honest 原则。 |
| 灰盒应该做什么、何时停下？ | [05-implementation-patch.md](05-implementation-patch.md) | 范围是否足够小、决策门是否会防止沉没成本。 |

## 推荐阅读顺序

1. 先读本文件，明确评审不是“给方案打高分”。
2. 读 `01-mvp0-hypotheses.md`，了解什么会被视为失败。
3. 读 `05-implementation-patch.md`，获得整体范围与实施顺序。
4. 读 `02-dynamic-missions.md` 与 `03-core-verb-experiment.md`，挑战核心循环和玩家权力。
5. 最后读 `04-story-trace-flip-contract.md`，检查 Story / Trace 的产品闭环和真实性边界。

若需要产品历史、既有港口世界、Semantic Trace、Context Compare 与证据模型的背景，阅读仓库根目录 [`README.md`](../../../README.md) 及上一轮研究包中的 [`08-external-review-gpt.md`](../2026-08-18-pi-city-game-design/08-external-review-gpt.md)。

## 有意冻结的内容

本阶段不评审任务数量、完整美术资产、角色动画、成长系统、开放世界、自由移动、战斗、迷宫、倒计时、货币、排行榜、动态 LLM 任务生成或真实仓库写入。它们不帮助回答 MVP-0 的核心假设，并会提高沉没成本。

## 评审输出应具备的形式

高质量评审必须给出一个明确结论：**进入 Greybox / 修改后再进入 / 暂停并重做核心动词**。每一个主要批评应引用本包内具体文件和章节，并提出一个可以用 5–8 名非技术试玩者验证的替代方案或实验。不要用“增加更多内容、增加更多奖励、加强美术、再做更多测试”之类无法证伪的建议替代判断。

可直接复制给外部模型的引导词见 [`06-prompt-for-claude-gemini.md`](06-prompt-for-claude-gemini.md)。
