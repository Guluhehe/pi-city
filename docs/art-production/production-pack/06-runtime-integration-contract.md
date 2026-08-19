# 第二章正式资产运行时接入合同

## 接入目的

正式GLB不会作为一个“新场景”另起炉灶，而是在现有 `FountainStoryScene` 的坐标、任务状态机和相机语言中逐层替换程序化对象。这样既保留全部 12 项委托的可玩逻辑，也确保第二章资产真正承担观察、出发、带回和城市改变。

## 当前代码职责与接入点

| 现有组件/模块 | 当前职责 | 正式资产到位后的职责 | 不得改变的边界 |
|---|---|---|---|
| `src/game/city-missions.ts` | 输出 `arrival → first-look → choose-question → plan → expedition → return → complete` 以及事实卡。 | 不改写任务逻辑；只为场景提供阶段、事实与目的地。 | 教学故事依旧是 `source: 'tutorial'`，不写入真实Trace。 |
| `src/product/CityMissionStory.tsx` | 将任务阶段转换为 `missionTheme`、`missionFacts`、`storyRoute` 与 UI。 | 增加第二章场景合同输入；继续将每次带回物传给3D世界。 | 仍由任务阶段驱动，不允许资产反向篡改任务状态。 |
| `src/world/FountainStoryScene.tsx` | 提供港口、相机、Pi、记忆风和章节地标。 | 读取 `memory-wind-scene-contract.ts` 的锚点/状态；在第二章预览中挂载GLB。 | 默认港口在资产未通过时不受影响。 |
| `src/world/memory-wind-scene-contract.ts` | 定义锚点、镜头、`memoryWindAssetState()`。 | 成为GLB节点、灯光状态与Pi动画的单一映射来源。 | 坐标变更必须同时更新固定镜头验收。 |

## 接入顺序：先替换，再组合，最后切换默认

| 序号 | 到位资产 | 运行时改造 | 通过条件 | 默认入口状态 |
|---|---|---|---|---|
| 1 | Pi 英雄GLB | `PiCompanion` 新增 `production` 模式：加载成功时播放合同指定片段；否则保留当前安全回退。 | `idle-observe`、`take-note`、`turn-and-trot` 在三个镜头中正确混合。 | 仍关闭。 |
| 2 | 红门窄屋 + 湿石 + 铜灯 | 新建 `MemoryWindStreetAssets`，仅按 `MEMORY_WIND_ASSET_ANCHORS` 挂点加载。 | 前景灯/Pi/红门均在 `notice` 固定镜头内。 | 仍关闭。 |
| 3 | 记忆风套件 | 用资产节点驱动 `observe` / `route` 两种布局；纸页和线绳以节点或轻量程序动画完成。 | `return` 时路线指向 `route-end`，不以泛光奖励替代。 | 仍关闭。 |
| 4 | 档案门与钥匙 | `keys` 主题接入 closed/clue/open 三种门状态。 | 新证据出现后，第二把钥匙/门缝变化可见。 | 仍关闭。 |
| 5 | 雨天银幕套件 | `cinema` 主题接入 folded/prepped/open 三种雨棚状态与两格小包。 | 两件事实均带回后才展开雨棚。 | 仍关闭。 |
| 6 | 全部第二章资产 | 打开 `chapter2-art-ready` 预览开关；完成真实三委托回放。 | 四道门与性能/构建全部通过。 | 评审批准后才允许打开。 |

## GLB节点约定

| 资产 | 必需节点/动画 | 在代码中的映射 | 缺失时处理 |
|---|---|---|---|
| `pi-hero.glb` | `Armature`；`idle-observe`、`take-note`、`turn-and-trot`。 | `memoryWindAssetState().piAnimation`。 | 记录警告并渲染当前回退Pi；不计美术通过。 |
| `memory-wind-red-door-house.glb` | `red_door`、`front_steps`、`window_warm`、`roof_eave`。 | `redDoorLight` 决定窗灯材质强度；`red-door`锚点决定位置。 | 整个街角预览关闭，避免盒子替代。 |
| `wet-stone-kit.glb` | `stone_2m`、`stone_stairs`、`dock_post`、`mooring_ring`。 | `wet-stone-foreground`、`red-door-steps`锚点。 | 不加载局部替代地面。 |
| `foreground-lantern.glb` | `lantern_body`、`glass_panels`、`light_anchor`。 | `foreground-lantern`锚点；`light_anchor`产生局部暖点。 | 不创建额外点光源去伪造资产。 |
| `memory-wind-set.glb` | `kite`、`paper_pages`、`rope_trails`、`route_anchor`。 | `memoryWindMode` 从 `observe` 转为 `route`。 | 不回退到纯色圆环/光球。 |
| `archive-door-keys.glb` | 门、两把钥匙、拓印平面。 | `archiveDoor` 为 closed/clue/open。 | 钥匙委托保持稳定旧地标，直到资产合格。 |
| `rain-cinema-set.glb` | canopy、screen、projector、ticket hooks。 | `cinemaCanopy` 为 folded/prepped/open。 | 电影委托保持稳定旧地标，直到资产合格。 |

## 最小伪代码：不更改任务状态，只消费状态

```ts
const sceneState = memoryWindAssetState(
  missionPhase,
  missionTheme,
  missionFacts,
);

<MemoryWindStreetAssets
  enabled={chapter2ArtReady}
  anchors={MEMORY_WIND_ASSET_ANCHORS}
  state={sceneState}
/>

<PiCompanion
  productionAsset={chapter2ArtReady ? '/assets/production/pi-hero.glb' : undefined}
  productionAnimation={sceneState.piAnimation}
/>
```

`chapter2ArtReady` 只能由通过验收的 manifest 集合导出，不能由“本地存在同名文件”或UI查询参数单独打开。

## 完整性与安全回退

1. 加载器先校验manifest中所有必需节点、动画名和贴图条目，再加载GLB。
2. 单一资产不合格时，只关闭对应的第二章美术预览层；不能让其他任务或默认港口加载失败。
3. 所有状态变化只读 `CityMissionState.phase`、`facts` 和 `lastReturn`；不会产生新的任务事实或改变解锁链。
4. 默认入口切换前须保存 `arrival`、`first-look`、`return`、`complete` 四张实拍图，并完成三项委托真实回放。
