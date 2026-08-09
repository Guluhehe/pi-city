from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "public" / "assets" / "models"
LIBRARY = ROOT / "public" / "experience" / "library.json"
ASPECT = 16 / 9


def load_library() -> dict:
    if not LIBRARY.exists():
        raise SystemExit(
            "missing public/experience/library.json — run: npm run export:experience"
        )
    return json.loads(LIBRARY.read_text())


def vertices(path: Path) -> np.ndarray:
    scene = trimesh.load(path, force="scene")
    chunks = [np.asarray(g.vertices) for g in scene.geometry.values() if len(g.vertices)]
    if not chunks:
        raise RuntimeError(f"no geometry: {path}")
    return np.vstack(chunks)


def project_bounds(points: np.ndarray, position: np.ndarray, look: np.ndarray, fov: float) -> np.ndarray:
    forward = look - position
    forward /= np.linalg.norm(forward)
    right = np.cross(forward, np.array([0.0, 1.0, 0.0]))
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    rel = points - position
    x = rel @ right
    y = rel @ up
    z = rel @ forward
    visible = z > 0.01
    if not np.any(visible):
        raise AssertionError("entire subject is behind camera")
    scale = math.tan(math.radians(fov) / 2)
    nx = x[visible] / (z[visible] * scale * ASPECT)
    ny = y[visible] / (z[visible] * scale)
    return np.array([nx.min(), nx.max(), ny.min(), ny.max()])


def main() -> None:
    library = load_library()
    districts = {key: np.array(value) for key, value in library["districts"].items()}
    models = library["models"]
    shots = library["shots"]
    canonical = library["canonicalFrames"]

    results = {}
    for key, frame in canonical.items():
        district_name = frame["district"]
        shot = shots[frame["shotId"]]
        district = districts[district_name]
        points = vertices(ASSET / models[district_name]) + district
        pos = district + np.array(shot["offset"])
        look = district + np.array(shot["lookShift"])
        bounds = project_bounds(points, pos, look, shot["fov"])
        width = bounds[1] - bounds[0]
        height = bounds[3] - bounds[2]
        center = np.array([(bounds[0] + bounds[1]) / 2, (bounds[2] + bounds[3]) / 2])
        results[key] = (bounds, width, height, center)

    # Arrival is deliberately smaller and left-weighted to preserve harbor scale.
    a = results["arrival"]
    assert 0.35 <= a[1] <= 0.65, a
    assert a[3][0] < -0.10, a
    assert np.all(a[0] > -1) and np.all(a[0] < 1), a

    # Context should feel close but remain fully legible inside the frame.
    c = results["context"]
    assert 1.10 <= c[1] <= 1.55, c
    assert 1.10 <= c[2] <= 1.55, c
    assert np.all(c[0] > -1) and np.all(c[0] < 1), c

    # Model Core is tall; it should nearly fill the vertical frame without cropping.
    m = results["model"]
    assert 1.50 <= m[2] <= 1.90, m
    assert np.all(m[0] > -1) and np.all(m[0] < 1), m

    for name, (bounds, width, height, center) in results.items():
        b = ", ".join(f"{v:+.2f}" for v in bounds)
        print(f"{name:7s} NDC=[{b}] size={width:.2f}×{height:.2f} center=({center[0]:+.2f},{center[1]:+.2f})")
    print("canonical frames OK · 16:9 hero geometry stays inside the intended composition")
    print(f"shot source: {LIBRARY.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
