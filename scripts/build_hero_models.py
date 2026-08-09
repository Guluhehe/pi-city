from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import trimesh
from trimesh.transformations import translation_matrix, rotation_matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets' / 'models'
OUT.mkdir(parents=True, exist_ok=True)

PALETTE = {
    'stone': (126, 112, 88, 255),
    'stone_dark': (82, 76, 65, 255),
    'stone_light': (158, 142, 108, 255),
    'wood': (76, 53, 37, 255),
    'wood_light': (112, 78, 48, 255),
    'iron': (57, 65, 63, 255),
    'iron_light': (83, 91, 84, 255),
    'bronze': (145, 105, 55, 255),
    'brass': (183, 139, 69, 255),
    'copper': (132, 82, 51, 255),
    'glass': (105, 139, 139, 190),
    'glass_dark': (72, 101, 104, 210),
    'paper': (209, 193, 145, 255),
    'roof': (47, 62, 61, 255),
    'roof_warm': (78, 65, 53, 255),
    'warm': (224, 172, 88, 255),
    'black': (34, 35, 32, 255),
}

rng = np.random.default_rng(20260809)


def colored(mesh: trimesh.Trimesh, key: str, variation: float = 0.045) -> trimesh.Trimesh:
    base = np.array(PALETTE[key], dtype=float)
    # Metals and glass use explicit PBR materials so browser lighting can do more of the work.
    pbr = {
        'iron': (0.18, 0.72, None),
        'iron_light': (0.12, 0.68, None),
        'bronze': (0.38, 0.48, None),
        'brass': (0.52, 0.36, None),
        'copper': (0.36, 0.46, None),
        'roof': (0.12, 0.68, None),
        'roof_warm': (0.08, 0.74, None),
        'glass': (0.02, 0.24, 'BLEND'),
        'glass_dark': (0.03, 0.34, 'BLEND'),
        'warm': (0.12, 0.30, None),
    }.get(key)
    if pbr:
        metallic, roughness, alpha_mode = pbr
        kwargs = dict(
            name=key,
            baseColorFactor=(base / 255.0).tolist(),
            metallicFactor=metallic,
            roughnessFactor=roughness,
            doubleSided=key.startswith('glass'),
        )
        if alpha_mode:
            kwargs['alphaMode'] = alpha_mode
        if key == 'warm':
            kwargs['emissiveFactor'] = [0.42, 0.24, 0.07]
        material = trimesh.visual.material.PBRMaterial(**kwargs)
        mesh.visual = trimesh.visual.texture.TextureVisuals(
            uv=np.zeros((len(mesh.vertices), 2), dtype=float), material=material
        )
    else:
        n = len(mesh.vertices)
        noise = rng.normal(0, 255 * variation, size=(n, 1))
        rgb = np.clip(base[:3] + noise, 0, 255)
        alpha = np.full((n, 1), base[3])
        mesh.visual.vertex_colors = np.concatenate([rgb, alpha], axis=1).astype(np.uint8)
    return mesh


def add(scene: trimesh.Scene, mesh: trimesh.Trimesh, name: str, pos=(0, 0, 0), rot=None):
    tf = translation_matrix(pos)
    if rot:
        axis, angle = rot
        tf = tf @ rotation_matrix(angle, axis)
    scene.add_geometry(mesh, node_name=name, geom_name=name, transform=tf)


def box(scene, name, size, pos, mat='stone', variation=0.035, rot=None):
    m = colored(trimesh.creation.box(extents=size), mat, variation)
    add(scene, m, name, pos, rot)


def cyl(scene, name, radius, height, pos, mat='iron', sections=16, axis='z'):
    m = colored(trimesh.creation.cylinder(radius=radius, height=height, sections=sections), mat, 0.03)
    if axis == 'x':
        rot = ([0, 1, 0], math.pi / 2)
    elif axis == 'y':
        rot = ([1, 0, 0], math.pi / 2)
    else:
        rot = None
    add(scene, m, name, pos, rot)


def cone(scene, name, radius, height, pos, mat='roof', sections=16):
    m = colored(trimesh.creation.cone(radius=radius, height=height, sections=sections), mat, 0.03)
    add(scene, m, name, pos, ([1, 0, 0], math.pi / 2))


def sphere(scene, name, radius, pos, mat='warm'):
    m = colored(trimesh.creation.icosphere(subdivisions=2, radius=radius), mat, 0.02)
    add(scene, m, name, pos)


def torus(scene, name, major, minor, pos, mat='bronze', rot=None):
    m = colored(trimesh.creation.torus(major_radius=major, minor_radius=minor, major_sections=28, minor_sections=8), mat, 0.02)
    add(scene, m, name, pos, rot)


def beam_between(scene, name, a, b, radius=0.045, mat='iron'):
    a = np.asarray(a, float); b = np.asarray(b, float)
    v = b - a; length = float(np.linalg.norm(v))
    m = colored(trimesh.creation.cylinder(radius=radius, height=length, sections=8), mat, 0.02)
    align = trimesh.geometry.align_vectors([0, 0, 1], v / length)
    tf = translation_matrix((a + b) / 2) @ align
    scene.add_geometry(m, node_name=name, geom_name=name, transform=tf)


def roof_sawtooth(scene, prefix, x0, count, width, depth, y, mat='roof'):
    for i in range(count):
        x = x0 + i * width
        # simple angled roof blades
        box(scene, f'{prefix}_roof_a_{i}', (width * 0.9, 0.12, depth), (x, y, 0), mat, rot=([0, 0, 1], 0.20))
        box(scene, f'{prefix}_roof_b_{i}', (width * 0.48, 0.11, depth), (x + width * 0.33, y + 0.24, 0), 'glass_dark', rot=([0, 0, 1], -0.62))


def add_windows(scene, prefix, xs, ys, z, w=0.34, h=0.5, depth=0.04, mat='glass_dark'):
    for yi, y in enumerate(ys):
        for xi, x in enumerate(xs):
            box(scene, f'{prefix}_window_{yi}_{xi}', (w, h, depth), (x, y, z), mat, 0.01)


def arrival_harbor():
    s = trimesh.Scene()
    # heavy dock and warehouse
    box(s, 'dock_base', (5.4, 0.35, 3.6), (0, 0.10, 0), 'wood', 0.07)
    for x in np.linspace(-2.4, 2.4, 7):
        cyl(s, f'pile_{x:.1f}', 0.09, 1.3, (x, -0.42, 1.45), 'wood', axis='y')
        cyl(s, f'pile_back_{x:.1f}', 0.09, 1.3, (x, -0.42, -1.45), 'wood', axis='y')
    box(s, 'warehouse', (2.7, 1.75, 2.2), (0.8, 1.05, -0.28), 'stone', 0.055)
    # roof body + ridge
    box(s, 'warehouse_roof', (3.0, 0.16, 2.55), (0.8, 1.98, -0.28), 'roof', rot=([0,0,1],0.0))
    add_windows(s, 'warehouse', [0.05, 0.8, 1.55], [0.9, 1.35], 0.84, w=.34, h=.34, depth=.08)
    # lighthouse/arrival tower
    cyl(s, 'arrival_tower', 0.52, 3.6, (-1.55, 1.9, 0.15), 'stone_light', sections=20, axis='y')
    cyl(s, 'tower_band_low', 0.59, 0.18, (-1.55, 1.25, 0.15), 'bronze', sections=20, axis='y')
    cyl(s, 'tower_band_high', 0.59, 0.18, (-1.55, 3.15, 0.15), 'bronze', sections=20, axis='y')
    cyl(s, 'lantern_room', 0.62, 0.62, (-1.55, 3.78, 0.15), 'glass', sections=20, axis='y')
    cone(s, 'tower_cap', 0.72, 0.7, (-1.55, 4.42, 0.15), 'roof', sections=20)
    sphere(s, 'arrival_beacon', .16, (-1.55, 4.06, 0.15), 'warm')
    # crane with trussed boom
    beam_between(s, 'crane_mast', (2.2,.35,1.0),(2.2,4.2,1.0), .09, 'iron')
    beam_between(s, 'crane_boom', (2.2,3.8,1.0),(4.7,4.15,1.0), .08, 'bronze')
    beam_between(s, 'crane_boom_low', (2.2,3.55,1.0),(4.7,4.15,1.0), .05, 'iron')
    for t in np.linspace(0.15, .85, 4):
        a=(2.2+(4.7-2.2)*t, 3.58+(4.15-3.58)*t, 1.0)
        b=(2.2+(4.7-2.2)*t, 3.90+(4.15-3.90)*t, 1.0)
        beam_between(s, f'crane_truss_{t:.2f}', a,b,.035,'iron')
    beam_between(s, 'crane_cable', (4.35,4.1,1.0),(4.35,1.1,1.0), .022, 'black')
    box(s, 'crane_hook', (.22,.32,.18), (4.35,.92,1.0), 'bronze')
    # cargo, bollards, signal mast
    for i,(x,z) in enumerate([(-.3,1.0),(.3,1.0),(.9,1.0),(1.5,1.0),(2.0,-1.1)]):
        box(s, f'cargo_{i}', (.55,.48,.65), (x,.47,z), 'wood_light' if i%2 else 'wood', .07)
    for i,x in enumerate([-2.4,-.8,.9,2.5]):
        cyl(s, f'bollard_{i}', .12,.45,(x,.45,1.55),'iron',axis='y')
    beam_between(s,'signal_mast',(-2.35,.3,-1.2),(-2.35,2.7,-1.2),.05,'iron')
    box(s,'signal_arm',(.85,.07,.07),(-1.95,2.3,-1.2),'bronze')
    return s


def session_archive():
    s=trimesh.Scene()
    # stone archive hall with buttresses and sunken drawers
    box(s,'archive_body',(4.0,2.75,3.0),(0,1.55,0),'stone',.06)
    box(s,'archive_plinth',(4.5,.38,3.45),(0,.22,0),'stone_dark',.06)
    # buttresses
    for x in [-1.85,-.95,0,.95,1.85]:
        box(s,f'buttress_{x}',(.22,2.4,.34),(x,1.35,1.58),'stone_dark',.05)
    # stacked archive drawers in facade
    for row,y in enumerate([.75,1.2,1.65,2.1]):
        for col,x in enumerate(np.linspace(-1.45,1.45,5)):
            box(s,f'drawer_{row}_{col}',(.47,.24,.11),(x,y,1.54),'paper' if (row+col)%3==0 else 'bronze',.025)
            box(s,f'drawer_handle_{row}_{col}',(.13,.045,.04),(x,y,1.61),'iron',.01)
    # monumental dark roof
    roof_sawtooth(s,'archive',-1.35,4,.9,3.25,3.14,'roof')
    # underground shaft visual at back
    box(s,'archive_shaft',(1.1,2.0,1.0),(-1.25,-.85,-.65),'iron_light',.04)
    for i in range(5):
        box(s,f'shaft_slot_{i}',(.72,.12,.08),(-1.25,-.2-i*.32,-.12),'paper',.02)
    # clock/registry disc
    torus(s,'registry_ring',.52,.08,(1.25,2.2,1.56),'bronze',rot=([1,0,0],math.pi/2))
    cyl(s,'registry_hub',.12,.14,(1.25,2.2,1.61),'brass',axis='z')
    # pipes and archive chute
    beam_between(s,'chute',(-2.25,2.6,-.9),(-2.25,.45,-.9),.12,'copper')
    beam_between(s,'chute_out',(-2.25,.45,-.9),(-1.65,.45,-.9),.12,'copper')
    return s


def context_works():
    s=trimesh.Scene()
    box(s,'context_plinth',(4.6,.35,3.4),(0,.18,0),'stone_dark',.05)
    # framed glass factory
    for x in [-2.0,-1.0,0,1.0,2.0]:
        beam_between(s,f'frame_front_{x}',(x,.35,1.45),(x,3.25,1.45),.055,'bronze')
        beam_between(s,f'frame_back_{x}',(x,.35,-1.45),(x,3.25,-1.45),.055,'bronze')
    for y in [.5,1.3,2.1,2.95]:
        beam_between(s,f'frame_top_{y}',(-2.1,y,1.45),(2.1,y,1.45),.045,'bronze')
        beam_between(s,f'frame_backtop_{y}',(-2.1,y,-1.45),(2.1,y,-1.45),.045,'bronze')
    # translucent-looking panels approximated with glass color
    for x in [-1.5,-.5,.5,1.5]:
        box(s,f'glass_front_{x}',(.9,2.55,.055),(x,1.7,1.43),'glass',.015)
    box(s,'context_roof',(4.35,.16,3.0),(0,3.33,0),'roof',.03)
    # sorting drums / conveyors visible through facade
    for i,x in enumerate([-1.25,-.42,.42,1.25]):
        cyl(s,f'sorter_{i}',.28,1.65,(x,1.25,.25),'bronze',sections=16,axis='y')
        torus(s,f'sorter_ring_{i}',.36,.05,(x,1.25,.25),'brass',rot=([1,0,0],math.pi/2))
    box(s,'conveyor',(3.35,.18,.65),(0,.63,.25),'iron',.04)
    for x in np.linspace(-1.35,1.35,6):
        cyl(s,f'roller_{x:.1f}',.11,.72,(x,.73,.25),'iron_light',sections=12,axis='z')
    # compression press and capsule chamber
    beam_between(s,'press_left',(-.6,.55,-.85),(-.6,2.65,-.85),.1,'iron')
    beam_between(s,'press_right',(.6,.55,-.85),(.6,2.65,-.85),.1,'iron')
    box(s,'press_head',(1.45,.28,.9),(0,2.35,-.85),'bronze',.03)
    sphere(s,'capsule_chamber',.38,(0,1.25,-.85),'warm')
    # extraction tower + pipes
    cyl(s,'context_stack',.24,2.3,(1.75,4.15,-.8),'iron',sections=14,axis='y')
    cyl(s,'context_stack_cap',.32,.18,(1.75,5.3,-.8),'bronze',axis='y')
    beam_between(s,'context_pipe_a',(1.75,3.0,-.8),(2.35,3.0,-.8),.09,'copper')
    beam_between(s,'context_pipe_b',(2.35,3.0,-.8),(2.35,1.1,-.8),.09,'copper')
    # overhead gantry
    beam_between(s,'gantry_top',(-2.55,3.9,0),(2.55,3.9,0),.08,'iron')
    beam_between(s,'gantry_leg_l',(-2.55,.3,0),(-2.55,3.9,0),.08,'iron')
    beam_between(s,'gantry_leg_r',(2.55,.3,0),(2.55,3.9,0),.08,'iron')
    return s


def model_core():
    s=trimesh.Scene()
    # circular heavy base
    cyl(s,'core_base',2.15,.55,(0,.3,0),'stone_dark',sections=32,axis='y')
    cyl(s,'core_hall',1.78,1.85,(0,1.45,0),'stone',sections=32,axis='y')
    # dark dome and copper rings
    sphere_mesh = trimesh.creation.icosphere(subdivisions=3,radius=1.75)
    sphere_mesh.apply_scale([1,0.55,1])
    sphere_mesh.apply_translation([0,2.6,0])
    colored(sphere_mesh,'roof',.035)
    s.add_geometry(sphere_mesh,node_name='core_dome',geom_name='core_dome')
    torus(s,'core_ring_a',1.74,.09,(0,1.15,0),'bronze',rot=([1,0,0],math.pi/2))
    torus(s,'core_ring_b',1.48,.07,(0,2.45,0),'bronze',rot=([1,0,0],math.pi/2))
    # front turbine / decision wheel
    torus(s,'decision_ring',.72,.10,(0,1.95,1.78),'brass',rot=([1,0,0],math.pi/2))
    cyl(s,'decision_hub',.18,.28,(0,1.95,1.88),'bronze',axis='z')
    for angle in np.linspace(0,2*math.pi,8,endpoint=False):
        a=(0,1.95,1.91)
        b=(math.cos(angle)*.62,1.95+math.sin(angle)*.62,1.91)
        beam_between(s,f'spoke_{angle:.2f}',a,b,.035,'bronze')
    # four decision gate bays around front arc
    gate_x=[-1.25,-.42,.42,1.25]
    for i,x in enumerate(gate_x):
        box(s,f'gate_frame_{i}',(.58,1.0,.22),(x,.88,1.67),'iron',.025)
        box(s,f'gate_panel_{i}',(.42,.7,.09),(x,.88,1.82),'bronze' if i==0 else 'stone_light',.025)
    # side cooling fins and stacks
    for side in [-1,1]:
        for z in [-.9,-.3,.3,.9]:
            box(s,f'fin_{side}_{z}',(.12,1.0,.36),(side*1.9,1.35,z),'iron_light',.03)
        cyl(s,f'stack_{side}',.19,2.1,(side*1.45,3.45,-.55),'iron',sections=14,axis='y')
    # copper pipe ring around hall
    for side in [-1,1]:
        beam_between(s,f'pipe_vert_{side}',(side*2.05,.6,-1.15),(side*2.05,2.2,-1.15),.07,'copper')
        beam_between(s,f'pipe_in_{side}',(side*2.05,2.2,-1.15),(side*1.6,2.2,-1.15),.07,'copper')
    return s


def tool_works():
    s=trimesh.Scene()
    box(s,'tool_plinth',(5.6,.35,3.5),(0,.18,0),'stone_dark',.05)
    # four workshop bays
    xs=[-2.0,-.67,.67,2.0]
    for i,x in enumerate(xs):
        box(s,f'shop_{i}',(1.12,1.65,2.4),(x,1.05,0),'stone' if i%2 else 'wood_light',.055)
        box(s,f'shop_door_{i}',(.58,.95,.09),(x,.75,1.24),'iron',.03)
        box(s,f'shop_sign_{i}',(.62,.16,.07),(x,1.52,1.25),'bronze',.03)
    roof_sawtooth(s,'tools',-2.0,4,1.33,2.6,2.14,'roof')
    # chimneys
    for i,x in enumerate([-2.0,-.67,.67,2.0]):
        cyl(s,f'chimney_{i}',.14,2.2,(x,3.25,-.65),'iron',sections=12,axis='y')
        cyl(s,f'cap_{i}',.2,.12,(x,4.32,-.65),'bronze',sections=12,axis='y')
    # overhead gantry crane
    for x in [-2.65,2.65]:
        beam_between(s,f'gantry_leg_{x}',(x,.35,-1.4),(x,3.15,-1.4),.09,'iron')
        beam_between(s,f'gantry_leg2_{x}',(x,.35,1.4),(x,3.15,1.4),.09,'iron')
    beam_between(s,'gantry_cross_front',(-2.65,3.15,1.4),(2.65,3.15,1.4),.10,'bronze')
    beam_between(s,'gantry_cross_back',(-2.65,3.15,-1.4),(2.65,3.15,-1.4),.10,'bronze')
    beam_between(s,'gantry_bridge',(0,3.15,-1.4),(0,3.15,1.4),.08,'bronze')
    beam_between(s,'gantry_hook',(0,3.0,.8),(0,1.25,.8),.035,'black')
    box(s,'gantry_hook_block',(.3,.35,.25),(0,1.08,.8),'bronze')
    # barrels/crates
    for i,(x,z) in enumerate([(-2.45,1.45),(-1.9,1.5),(.25,1.45),(1.55,1.5),(2.35,1.4)]):
        cyl(s,f'barrel_{i}',.2,.5,(x,.43,z),'wood',sections=12,axis='y')
    return s

MODELS = {
    'arrival-harbor': arrival_harbor,
    'session-archive': session_archive,
    'context-works': context_works,
    'model-core': model_core,
    'tool-works': tool_works,
}

manifest = {}
for slug,builder in MODELS.items():
    scene=builder()
    path=OUT/f'{slug}.glb'
    path.write_bytes(scene.export(file_type='glb'))
    bounds=scene.bounds.tolist()
    manifest[slug]={
        'file': f'/assets/models/{slug}.glb',
        'geometryCount': len(scene.geometry),
        'bounds': bounds,
        'bytes': path.stat().st_size,
    }
    print(slug, len(scene.geometry), path.stat().st_size)

(ROOT/'public'/'assets'/'models.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
