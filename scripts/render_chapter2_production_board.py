from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/art-production/2026-08-19-chapter2-production-board.csv'
OUTPUT = ROOT / 'docs/art-production/production-pack/04-chapter2-production-launch-board.png'

font_candidates = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
]
font_path = next((Path(p) for p in font_candidates if Path(p).exists()), None)
if font_path:
    font_manager.fontManager.addfont(str(font_path))
    plt.rcParams['font.family'] = font_manager.FontProperties(fname=str(font_path)).get_name()
else:
    plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

board = pd.read_csv(SOURCE)
batch_order = ['P0', 'P1', 'P2', 'P3', 'P4']
assets_by_batch = board.groupby('batch')['asset_name'].apply(list).reindex(batch_order, fill_value=[])
counts = board.groupby('batch').size().reindex(batch_order, fill_value=0)
colors = {'P0': '#991B1B', 'P1': '#B45309', 'P2': '#C47A22', 'P3': '#7C8A9A', 'P4': '#9AA6B2'}

fig = plt.figure(figsize=(15.5, 9), facecolor='#F6F2EA')
grid = fig.add_gridspec(2, 1, height_ratios=[.9, 1.1], hspace=.28)
ax1 = fig.add_subplot(grid[0])
ax1.set_facecolor('#FCFAF5')
bars = ax1.barh(batch_order[::-1], counts.reindex(batch_order[::-1]), color=[colors[b] for b in batch_order[::-1]], height=.56)
for bar, batch, count in zip(bars, batch_order[::-1], counts.reindex(batch_order[::-1])):
    ax1.text(.08, bar.get_y()+bar.get_height()/2, f'{batch}  ·  {count} 项资产', va='center', color='white', fontsize=12, fontweight='bold')
    ax1.text(count + .08, bar.get_y()+bar.get_height()/2, '优先' if batch == 'P0' else '后续', va='center', color='#40505A', fontsize=11)
ax1.set_xlim(0, max(counts)+.9)
ax1.set_title('第二章资产生产批次：先完成 P0 与 P1，才允许进入任务镜头验收', loc='left', fontsize=17, fontweight='bold', color='#193848', pad=12)
ax1.set_xticks([])
ax1.spines[['top','right','bottom','left']].set_visible(False)
ax1.tick_params(axis='y', length=0, labelcolor='#193848', labelsize=12)

ax2 = fig.add_subplot(grid[1])
ax2.set_facecolor('#FCFAF5')
ax2.axis('off')
rows=[]
for _, item in board.iterrows():
    first_gate = 'Pi三段动作' if item['asset_id'] == 'pi-hero' else ('英雄镜头三层空间' if item['asset_id'] in ['red-door-house','wet-stone-kit','foreground-lantern','memory-wind-set'] else '对应任务回放')
    rows.append([item['batch'], item['asset_name'], item['status'].replace('规范冻结；', ''), first_gate])
table = ax2.table(cellText=rows,
                  colLabels=['批次', '资产', '当前状态', '首个验收门'],
                  cellLoc='left', colLoc='left',
                  colWidths=[.1,.26,.30,.34],
                  bbox=[0,.05,1,.87])
table.auto_set_font_size(False)
table.set_fontsize(10.5)
for (row, col), cell in table.get_celld().items():
    cell.set_edgecolor('#E4DDD2')
    if row == 0:
        cell.set_facecolor('#193848')
        cell.set_text_props(color='white', weight='bold')
    else:
        cell.set_facecolor('#FFFDF8' if row % 2 else '#F4EFE6')
        if col == 0:
            batch = rows[row-1][0]
            cell.set_text_props(color=colors.get(batch,'#3F3F46'), weight='bold')
        if col == 2:
            cell.set_text_props(color='#A83F45')
ax2.set_title('生产看板：每件资产交付后，先在独立预览与固定镜头中验收，再进入真实委托', loc='left', fontsize=15, fontweight='bold', color='#193848', pad=14)

fig.suptitle('Pi City 第二章“记忆风”资产生产启动板', x=.06, y=.985, ha='left', fontsize=21, fontweight='bold', color='#163643')
fig.text(.06, .948, '状态基线：规范冻结；等待正式GLB与贴图交付。概念生产图不计入建模完成度。', fontsize=10, color='#617078')
fig.savefig(OUTPUT, dpi=190, bbox_inches='tight', facecolor=fig.get_facecolor())
print(OUTPUT)
