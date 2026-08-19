# 行业调研笔记：从概念图到风格化实时游戏环境

## 可迁移到 Pi City 的共识

| 行业方法 | 来源中的具体做法 | Pi City 的直接含义 |
|---|---|---|
| 先做镜头锁定的灰盒 | 先用基础形体在引擎内验证相机、比例、主视线和大形体，再进DCC拆分模块。 | 不应先建“完整小镇”；先锁定记忆风街角的一台英雄镜头和一条玩家行走视线。 |
| 环境是模块系统而非散件堆放 | 屋、墙、台阶、屋檐、窗、角件、过渡件按网格和连接规则设计，独特资产只承担叙事焦点。 | 当前随机尺寸的盒状房屋要替换为一个窄屋模块包；红门、记忆风喷泉和灯柱是英雄资产。 |
| 高模服务于看得见的轮廓与烘焙细节 | 先抓大/中形体、倒角与轮廓，之后将高模细节烘焙到低模法线与材质中。 | 石板边缘、坡屋顶、窗框、灯罩和背包扣件必须是网格/法线细节；不能全靠单色基础体。 |
| 材质是统一风格的关键 | tileable、trim sheet、顶点色/decals与粗糙度变化将建筑和地面统一为同一世界。 | 建立“湿石、深木、漆面青金属、铜/玻璃、红布、旧纸”六材质包，避免每个对象一个纯色材质。 |
| 电影化层级来自构图，不是泛滥特效 | 以近/中/远景组织画面；主焦点附近有最高对比、色彩变化和细节；用局部雾软化远景。 | 前景是灯笼/绳索，Pi为近景主角，记忆风为中景问题，红门为远景承诺；远处建筑不能与中心同样清晰/明亮。 |
| 光是重点分配而非平均照明 | 一盏主光先确立，再以少量实用灯聚焦；雾、色调和后期用于分离层级。 | 以冷蓝夜色保护大面积暗部；只让前景灯、Pi帽灯、记忆风和红门窗口享有暖高光。 |
| 优化从资产计划就开始 | 共享材质、贴图图集/trim sheet、远景LOD和billboard将美术预算留给近景英雄资产。 | 浏览器版本更应把三角面与贴图预算投给Pi和街角，远景房屋使用简化轮廓、实例化和远景卡片。 |

## 推荐的制作顺序

1. **视觉合同**：锁定一张角色在场的英雄镜头，标出前/中/后景、冷暖比例、可见英雄资产与不允许出现的塑料低模特征。
2. **可玩灰盒**：在现有Three场景中重新布置一条20–30米街角，先用相机与Pi的行走视线验证红门和记忆风是否形成明确引导。
3. **模块包**：制作墙段、内外角、窗段、屋檐、屋顶、台阶、地面、灯柱、绳索、码头柱十类可拼接网格；其中约三分之一是连接/过渡件。
4. **材质包**：用共享贴图/trim sheet服务绝大多数模块，以独立贴图仅服务红门、Pi和记忆风等镜头前英雄资产。
5. **英雄资产**：制作Pi GLB、红门、记忆风风筝骨架、前景灯具和一艘远景船；每项按镜头距离和剪影验收。
6. **Lookdev**：在真实Three渲染器中审核深夜、主暖灯、奇观发光三种光照；将雾、景深和后期限定为层级工具，不得用于掩盖几何不足。
7. **运行时组装**：先完成一个街角，在镜头、材料和性能都通过后再推广至港口其余区域。

## 参考文献

[1]: https://80.lv/articles/turning-2d-concept-art-into-a-detailed-painterly-3d-world "Turning 2D Concept Art into a Detailed Painterly 3D World"
[2]: https://www.artstation.com/blogs/anna-lofberg/wBr2A/a-deep-dive-into-stylized-open-world-game-environment-creation "A Deep-Dive into Stylized Open World Game Environment Creation"
[3]: https://nastyrodent.com/3d-environment-design/ "3D Environment Design: From Concept to Game-Ready World"
[4]: https://thundercloud-studio.com/article/stylized-3d-environment-tip-tricks/ "Stylized 3D Game Art Environment Workflow: Tips and Tricks"
