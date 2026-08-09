from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "public" / "assets" / "models"
ASPECT = 16 / 9

DISTRICTS = {
    "arrival": np.array([-11.5, 0.35, 4.8]),
    "context": np.array([1.0, 0.35, -4.6]),
    "model": np.array([7.1, 0.35, -0.15]),
}

@dataclass(frozen=True)
class Shot:
    district: str
    model: str
    offset: tuple[float, float, float]
    look_shift: tuple[float, float, float]
    fov: float

SHOTS = {
    "arrival": Shot("arrival", "arrival-harbor.glb", (14.2, 7.4, 13.1), (3.0, 1.12, -0.45), 40),
    "context": Shot("context", "context-works.glb", (6.4, 3.7, 5.0), (-0.20, -0.50, -0.90), 30),
    "model": Shot("model", "model-core.glb", (8.5, 5.0, 6.8), (-1.20, 0.30, -0.35), 32),
}


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
    results = {}
    for name, shot in SHOTS.items():
        district = DISTRICTS[shot.district]
        points = vertices(ASSET / shot.model) + district
        pos = district + np.array(shot.offset)
        look = district + np.array(shot.look_shift)
        bounds = project_bounds(points, pos, look, shot.fov)
        width = bounds[1] - bounds[0]
        height = bounds[3] - bounds[2]
        center = np.array([(bounds[0] + bounds[1]) / 2, (bounds[2] + bounds[3]) / 2])
        results[name] = (bounds, width, height, center)

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


if __name__ == "__main__":
    main()
