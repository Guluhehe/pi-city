from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
baseline = root / 'demo-recordings/scene-upgrade/baseline/01-phenomenon-notice.png'
improved = root / 'demo-recordings/scene-upgrade/reframed/01-phenomenon-notice.png'
output = root / 'demo-recordings/scene-upgrade/memory-wind-before-after.png'

with Image.open(baseline).convert('RGB') as before, Image.open(improved).convert('RGB') as after:
    if before.size != after.size:
        raise ValueError(f'Comparison screenshots must share dimensions: {before.size} vs {after.size}')
    comparison = Image.new('RGB', (before.width * 2, before.height))
    comparison.paste(before, (0, 0))
    comparison.paste(after, (before.width, 0))
    comparison.save(output, optimize=True)

print(output)
