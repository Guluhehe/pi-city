from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/art-production/2026-08-19-asset-inventory.csv'
OUTPUT = ROOT / 'docs/art-production/2026-08-19-asset-delivery-dashboard.png'

font_candidates = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
]
font_path = next((Path(path) for path in font_candidates if Path(path).exists()), None)
if font_path:
    font_manager.fontManager.addfont(str(font_path))
    plt.rcParams['font.family'] = font_manager.FontProperties(fname=str(font_path)).get_name()
else:
    plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

inventory = pd.read_csv(SOURCE)
chapters = ['第一章', '第二章', '第三章', '第四章']
mission_rows = inventory[inventory['chapter'].isin(chapters)].copy()
state_order = ['已交付GLB', '程序化占位', '未生产正式资产']
colors = {'已交付GLB': '#4C9A82', '程序化占位': '#D49A45', '未生产正式资产': '#B64D50'}

fig = plt.figure(figsize=(15.5, 9.3), facecolor='#F6F2EA')
grid = fig.add_gridspec(2, 2, height_ratios=[1.05, .95], width_ratios=[1.3, 1], hspace=.34, wspace=.28)

# Chapter stacked delivery bars
ax = fig.add_subplot(grid[0, :])
ax.set_facecolor('#FCFAF5')
left = pd.Series(0, index=chapters, dtype=float)
for state in state_order:
    values = mission_rows[mission_rows['delivery_state'] == state].groupby('chapter').size().reindex(chapters, fill_value=0)
    bars = ax.barh(chapters, values, left=left, color=colors[state], edgecolor='#F6F2EA', linewidth=2.2, height=.58)
    for bar, count in zip(bars, values):
        if count:
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_y() + bar.get_height()/2, str(count), ha='center', va='center', color='white', fontsize=11, fontweight='bold')
    left += values
ax.set_xlim(0, 3)
ax.set_xticks([0, 1, 2, 3])
ax.set_xlabel('每章关键环境/道具资产条目数（每章 3 项委托场景）', color='#41515A', labelpad=10)
ax.set_title('各章节关键场景资产：交付状态（以真实模型文件与源码实现为准）', loc='left', fontsize=16, fontweight='bold', color='#193848', pad=13)
ax.spines[['top', 'right', 'left']].set_visible(False)
ax.grid(axis='x', color='#D8D1C3', linewidth=.8, alpha=.7)
ax.set_axisbelow(True)
ax.tick_params(axis='y', length=0, labelcolor='#243B44', labelsize=11)
ax.tick_params(axis='x', colors='#60707A')
ax.legend(handles=[Patch(facecolor=colors[state], label=state) for state in state_order], ncol=3, frameon=False, loc='upper right')

# Global asset type card
ax = fig.add_subplot(grid[1, 0])
ax.set_facecolor('#FCFAF5')
summary = pd.DataFrame([
    ['正式静态GLB地标', len(inventory[(inventory['delivery_state'] == '已交付GLB') & (inventory['category'].str.contains('建筑'))])],
    ['运行时程序化角色', len(inventory[(inventory['delivery_state'] == '程序化占位') & (inventory['category'] == '角色')])],
    ['章节程序化场景', len(mission_rows[mission_rows['delivery_state'] == '程序化占位'])],
    ['未生产的第二章正式包', len(mission_rows[(mission_rows['chapter'] == '第二章') & (mission_rows['delivery_state'] == '未生产正式资产')])],
    ['概念参考图', len(inventory[inventory['category'] == '概念参考'])],
], columns=['类别', '数量'])
bar_colors = ['#4C9A82', '#D49A45', '#D49A45', '#B64D50', '#788F9A']
bars = ax.barh(summary['类别'][::-1], summary['数量'][::-1], color=bar_colors[::-1], height=.55)
for bar, value in zip(bars, summary['数量'][::-1]):
    ax.text(value + .08, bar.get_y() + bar.get_height()/2, str(value), va='center', color='#193848', fontsize=11, fontweight='bold')
ax.set_xlim(0, max(summary['数量']) + 1.2)
ax.set_title('全局资产库存：模型、占位与参考的实际数量', loc='left', fontsize=13, fontweight='bold', color='#193848', pad=10)
ax.spines[['top', 'right', 'bottom', 'left']].set_visible(False)
ax.set_xticks([])
ax.tick_params(axis='y', length=0, labelcolor='#41515A', labelsize=10.5)

# Chapter two readiness matrix
ax = fig.add_subplot(grid[1, 1])
ax.set_facecolor('#FCFAF5')
ax.axis('off')
chapter_two = mission_rows[mission_rows['chapter'] == '第二章'][['asset_name', 'delivery_state', 'notes']].copy()
chapter_two['状态'] = chapter_two['delivery_state'].map({'已交付GLB': '已交付', '程序化占位': '占位', '未生产正式资产': '未生产'})
chapter_two['正式资产缺口'] = ['红门街区、风筝、纸页、Pi', '档案门、钥匙、图书管理员', '雨棚、屏幕、放映员']
table = ax.table(cellText=chapter_two[['asset_name', '状态', '正式资产缺口']].values,
                 colLabels=['第二章委托', '当前状态', '需交付的正式资产'],
                 cellLoc='left', colLoc='left',
                 colWidths=[.27, .17, .56],
                 bbox=[0, .12, 1, .76])
table.auto_set_font_size(False)
table.set_fontsize(10)
for (row, column), cell in table.get_celld().items():
    cell.set_edgecolor('#E4DDD2')
    if row == 0:
        cell.set_facecolor('#193848')
        cell.set_text_props(color='white', weight='bold')
    else:
        cell.set_facecolor('#FFFDF8' if row % 2 else '#F4EFE6')
        if column == 1:
            status = chapter_two.iloc[row-1]['状态']
            cell.set_text_props(color={'占位': '#98631E', '未生产': '#A83F45', '已交付': '#2C7562'}.get(status, '#41515A'), weight='bold')
ax.set_title('第二章：美术评审的交付缺口', loc='left', fontsize=13, fontweight='bold', color='#193848', pad=10)
ax.text(0, .02, '注：统计仅将可在仓库中定位的 GLB 视为“已交付建模”；概念图与运行时基础几何不计入正式建模完成度。', transform=ax.transAxes, fontsize=8.6, color='#68757B', wrap=True)

fig.suptitle('Pi City 资产建模与交付状态盘点', x=.06, y=.985, ha='left', fontsize=21, fontweight='bold', color='#163643')
fig.text(.06, .948, '数据来源：public/assets、src/world/FountainStoryScene.tsx、src/game/city-campaign.ts；盘点日期：2026-08-19', fontsize=9.5, color='#617078')
fig.savefig(OUTPUT, dpi=190, bbox_inches='tight', facecolor=fig.get_facecolor())
print(OUTPUT)
