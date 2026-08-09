from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site-live-beta"
HTML = (SITE / "index.html").read_text()

required = [
    "assets/mattes/industrial-harbor-concept.jpg",
    "assets/models/arrival-harbor.glb",
    "assets/models/session-archive.glb",
    "assets/models/context-works.glb",
    "assets/models/model-core.glb",
    "assets/models/tool-works.glb",
    "assets/noise.png",
]
missing = [path for path in required if not (SITE / path).exists()]
if missing:
    raise SystemExit(f"missing live-beta assets: {missing}")

def durations(block_start: str, block_end: str):
    block = HTML.split(block_start, 1)[1].split(block_end, 1)[0]
    return [int(value) for value in re.findall(r"duration:(\d+)", block)]

auth = durations("const authFrames=[", "];\nconst multiFrames")
multi = durations("const multiFrames=[", "];\nconst runs=")
assert len(auth) >= 12, len(auth)
assert 55_000 <= sum(auth) <= 80_000, sum(auth)
assert len(multi) >= 10, len(multi)
assert 45_000 <= sum(multi) <= 75_000, sum(multi)

for needle in [
    "Tool Result is not the answer.",
    "Same Agent. Different evidence.",
    "enterExplore",
    "normalizeRuntime",
    "context-cut",
    "request-vessel",
    "tool-result",
    "watch-mode",
    "chapterBumper",
    "updateHotspots",
    "CINEMA UI",
    "weatherMaterial",
    "pi-weather-v2",
    "hazePlane",
    "lightField",
]:
    assert needle in HTML, needle

print(f"live beta OK · auth={len(auth)} frames/{sum(auth)/1000:.1f}s · multi={len(multi)} frames/{sum(multi)/1000:.1f}s")
