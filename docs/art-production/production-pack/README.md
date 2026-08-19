# Pi City 第二章“记忆风”资产生产包

本目录是第二章美术生产的唯一入口。它将概念、建模、贴图、动画、文件导出与运行时接入拆成可验收的交付物，避免再次将低质量占位几何或概念图误记为正式完成。

## 使用顺序

| 使用者 | 第一步 | 必须交付 | 通过后进入 |
|---|---|---|---|
| 角色建模/动画 | 阅读 `01-pi-hero-production-brief.md` 与 `pi-hero-production-sheet.png`。 | `pi-hero.glb`、三段动画、材质贴图、Pi manifest、三张预览图。 | Pi独立预览与固定英雄镜头。 |
| 环境建模/材质 | 阅读 `02-red-door-street-environment-brief.md` 与 `red-door-street-production-sheet.png`。 | 红门窄屋、湿石模块、前景铜灯、记忆风套件、共享材质贴图、环境manifest。 | 街角独立预览与固定英雄镜头。 |
| 美术评审 | 阅读 `03-production-acceptance-and-runtime-integration.md`。 | 针对灰盒、Lookdev、角色和运行时四道门给出通过/返修结论。 | 真实任务回放。 |
| 运行时集成 | 读取各 asset manifest；使用项目既有第二章预览入口。 | 资产加载日志、固定镜头截图、带回阶段截图、完整质量门禁结果。 | 第二章默认入口切换评审。 |

## 文件说明

| 文件 | 类型 | 作用 | 当前状态 |
|---|---|---|---|
| `01-pi-hero-production-brief.md` | 规范 | Pi角色、动画、贴图和GLB交付标准。 | 已冻结。 |
| `pi-hero-production-sheet.png` | 概念参考 | 角色轮廓、材质区和持纸动作锚点。 | 仅作为建模参考；不是GLB。 |
| `02-red-door-street-environment-brief.md` | 规范 | 红门街角模块、道具、材质、镜头和技术预算。 | 已冻结。 |
| `red-door-street-production-sheet.png` | 概念参考 | 红门窄屋、湿石模块、铜灯、风筝/纸页的造型锚点。 | 仅作为建模参考；不是GLB。 |
| `manifests/pi-hero-manifest.template.json` | 模板 | Pi GLB、贴图、骨架、动画、QA交付清单。 | 待制作者填充。 |
| `manifests/memory-wind-environment-manifest.template.json` | 模板 | 红门街角四组环境GLB和共享材质交付清单。 | 待制作者填充。 |
| `03-production-acceptance-and-runtime-integration.md` | 验收 | 生产看板、验收门与运行时接入流程。 | 已冻结。 |

## 生产状态口径

- **规范冻结**：制作可开始；不表示模型已完成。
- **已交付待验收**：已收到GLB、贴图与manifest，尚未通过固定镜头和运行时测试。
- **美术通过**：灰盒/Lookdev/角色门通过，允许进入真实任务回放。
- **运行时通过**：真实委托回放和构建门禁通过，才允许启用默认入口。

> 任何阶段未通过时，第二章默认入口继续使用当前稳定港口。不得将概念参考图、纯色基础几何或加载失败后的回退对象标记为“正式资产”。
