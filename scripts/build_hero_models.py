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
    'oxide': (83, 101, 92, 255),
    'rust': (111, 65, 39, 255),
    'cream': (188, 169, 126, 255),
    'red': (112, 54, 40, 255),
}

rng = np.random.default_rng(20260809)


def colored(mesh: trimesh.Trimesh, key: str, variation: float = 0.045) -> trimesh.Trimesh:
    base = np.array(PALETTE[key], dtype=float)
    # Metals and glass use explicit PBR materials so browser lighting can do more of the work.
    pbr = {
        # masonry / timber: high roughness, almost no metallic response
        'stone': (0.00, 0.92, None),
        'stone_dark': (0.00, 0.96, None),
        'stone_light': (0.00, 0.88, None),
        'cream': (0.00, 0.86, None),
        'wood': (0.00, 0.88, None),
        'wood_light': (0.00, 0.82, None),
        'paper': (0.00, 0.96, None),
        # weathered industrial surfaces
        'iron': (0.18, 0.72, None),
        'iron_light': (0.12, 0.68, None),
        'oxide': (0.10, 0.82, None),
        'rust': (0.05, 0.90, None),
        'red': (0.04, 0.82, None),
        'bronze': (0.38, 0.48, None),
        'brass': (0.52, 0.36, None),
        'copper': (0.36, 0.46, None),
        'roof': (0.12, 0.68, None),
        'roof_warm': (0.08, 0.74, None),
        # glazing and practical light
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
    add(scene, m, name, pos, ([1, 0, 0], -math.pi / 2))


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


def lit_windows(scene, prefix, centers, size=(.26,.28,.045), strength_mat='warm'):
    """Small emissive-looking panes used as practical dusk lights."""
    for i,(x,y,z) in enumerate(centers):
        box(scene,f'{prefix}_lit_{i}',size,(x,y,z),strength_mat,.0)


def rail(scene, prefix, start, end, height=.42, mat='iron'):
    """Simple industrial safety railing between two X/Z points."""
    a=np.asarray(start,float); b=np.asarray(end,float)
    length=float(np.linalg.norm(b-a))
    if length < 1e-6: return
    steps=max(2,int(length/.55)+1)
    for i,t in enumerate(np.linspace(0,1,steps)):
        p=a*(1-t)+b*t
        beam_between(scene,f'{prefix}_post_{i}',(p[0],p[1],p[2]),(p[0],p[1]+height,p[2]),.025,mat)
    beam_between(scene,f'{prefix}_top',(a[0],a[1]+height,a[2]),(b[0],b[1]+height,b[2]),.028,mat)
    beam_between(scene,f'{prefix}_mid',(a[0],a[1]+height*.54,a[2]),(b[0],b[1]+height*.54,b[2]),.018,mat)


def stairs(scene, prefix, start, count=6, step=(.42,.16,.8), direction=1, mat='iron_light'):
    x,y,z=start
    sx,sy,sz=step
    for i in range(count):
        box(scene,f'{prefix}_step_{i}',(sx,.08,sz),(x+direction*i*sx*.48,y+i*sy,z),mat,.025)
    endx=x+direction*(count-1)*sx*.48
    rail(scene,f'{prefix}_rail_a',(x,y+.08,z-sz*.42),(endx,y+(count-1)*sy+.08,z-sz*.42),.34,'iron')
    rail(scene,f'{prefix}_rail_b',(x,y+.08,z+sz*.42),(endx,y+(count-1)*sy+.08,z+sz*.42),.34,'iron')


def catwalk(scene, prefix, a, b, width=.48, mat='iron_light'):
    a=np.asarray(a,float); b=np.asarray(b,float)
    center=(a+b)/2; length=float(np.linalg.norm(b-a))
    angle=math.atan2((b-a)[2],(b-a)[0])
    box(scene,f'{prefix}_deck',(length,.09,width),tuple(center),mat,.02,rot=([0,1,0],-angle))
    # rail helper is axis agnostic because it uses beam_between
    perp=np.array([-math.sin(angle),0,math.cos(angle)])*width*.42
    rail(scene,f'{prefix}_ra',(tuple(a+perp)),(tuple(b+perp)),.42,'iron')
    rail(scene,f'{prefix}_rb',(tuple(a-perp)),(tuple(b-perp)),.42,'iron')


def truss_portal(scene, prefix, x, y0, y1, z0, z1, mat='iron'):
    beam_between(scene,f'{prefix}_l',(x,y0,z0),(x,y1,z0),.055,mat)
    beam_between(scene,f'{prefix}_r',(x,y0,z1),(x,y1,z1),.055,mat)
    beam_between(scene,f'{prefix}_top',(x,y1,z0),(x,y1,z1),.055,mat)
    beam_between(scene,f'{prefix}_diag1',(x,y0+.2,z0),(x,y1-.1,z1),.032,mat)
    beam_between(scene,f'{prefix}_diag2',(x,y0+.2,z1),(x,y1-.1,z0),.032,mat)


def lamp(scene, name, pos, height=.8):
    x,y,z=pos
    beam_between(scene,f'{name}_post',(x,y,z),(x,y+height,z),.025,'iron')
    sphere(scene,f'{name}_bulb',.07,(x,y+height+.03,z),'warm')


def vent(scene, name, pos, scale=1.0):
    x,y,z=pos
    cyl(scene,f'{name}_body',.13*scale,.52*scale,(x,y,z),'iron',sections=12,axis='y')
    cyl(scene,f'{name}_cap',.2*scale,.08*scale,(x,y+.3*scale,z),'bronze',sections=12,axis='y')


def gabled_roof(scene, name, width, depth, height, pos, mat='roof'):
    w=width/2; d=depth/2
    verts=np.array([[-w,0,-d],[w,0,-d],[0,height,-d],[-w,0,d],[w,0,d],[0,height,d]],dtype=float)
    faces=np.array([[0,1,2],[3,5,4],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]])
    m=colored(trimesh.Trimesh(vertices=verts,faces=faces,process=False),mat,.03)
    add(scene,m,name,pos)


def arch_frame(scene, prefix, center, radius=.55, height=.9, mat='bronze'):
    x,y,z=center
    beam_between(scene,f'{prefix}_left',(x-radius,y,z),(x-radius,y+height,z),.045,mat)
    beam_between(scene,f'{prefix}_right',(x+radius,y,z),(x+radius,y+height,z),.045,mat)
    pts=[]
    for a in np.linspace(math.pi,0,9): pts.append((x+math.cos(a)*radius,y+height+math.sin(a)*radius,z))
    for i in range(len(pts)-1): beam_between(scene,f'{prefix}_arch_{i}',pts[i],pts[i+1],.045,mat)


def roof_monitor(scene, prefix, center, width, depth, height=.55):
    x,y,z=center
    box(scene,f'{prefix}_base',(width,.12,depth),(x,y,z),'roof_warm',.025)
    gabled_roof(scene,f'{prefix}_gable',width*.92,depth*.92,height,(x,y+.05,z),'glass_dark')


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
    # grand gabled customs hall evokes the concept-art station/archive silhouette
    gabled_roof(s,'warehouse_gable',3.15,2.7,.85,(.8,2.02,-.28),'roof')
    arch_frame(s,'warehouse_arch',(.8,.45,0.86),.58,.78,'bronze')
    box(s,'warehouse_arch_glass',(1.02,1.12,.055),(.8,1.08,.82),'glass_dark',.01)
    for sx in [-.8,.8]:
        box(s,f'warehouse_pilaster_{sx}',(.2,1.9,.24),(.8+sx,1.08,.9),'stone_light',.035)
    roof_monitor(s,'warehouse_monitor',(.8,2.78,-.28),1.15,1.05,.42)
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
    # v0.5 harbor threshold: customs canopy, elevated walk, second service crane and practical lights
    box(s,'customs_annex',(1.35,1.2,1.45),(-.45,.82,-1.0),'cream',.055)
    box(s,'customs_awning',(1.75,.12,1.65),(-.45,1.48,-1.0),'roof_warm',.03)
    add_windows(s,'customs',[-.75,-.2],[.72,1.02],-.25,w=.28,h=.22,depth=.04,mat='glass_dark')
    stairs(s,'dock_stairs',(-2.55,.22,-.55),count=7,step=(.42,.14,.58),direction=1,mat='iron_light')
    catwalk(s,'tower_walk',(-2.0,2.95,-.65),(1.55,2.95,-.65),.42,'iron_light')
    # smaller loading crane creates foreground depth against the hero truss crane
    beam_between(s,'service_crane_mast',(-.2,.32,1.42),(-.2,2.7,1.42),.065,'iron')
    beam_between(s,'service_crane_arm',(-.2,2.55,1.42),(1.45,2.8,1.42),.055,'rust')
    beam_between(s,'service_crane_cable',(1.25,2.77,1.42),(1.25,1.12,1.42),.018,'black')
    box(s,'service_hook',(.16,.22,.14),(1.25,1.0,1.42),'bronze')
    rail(s,'dock_front_rail',(-2.6,.3,-1.68),(2.55,.3,-1.68),.38,'iron')
    for i,(x,z) in enumerate([(-2.25,-1.45),(-1.05,-1.45),(.2,-1.45),(1.45,-1.45),(2.35,-1.45)]):
        lamp(s,f'dock_lamp_{i}',(x,.3,z),.68)
    # warm occupied windows break the asset out of the 'museum model' look at dusk
    lit_windows(s,'arrival_windows',[
        (.18,1.10,.875),(.80,1.10,.875),(1.42,1.10,.875),
        (.18,1.50,.875),(.80,1.50,.875),(1.42,1.50,.875),
        (-.72,.86,-.255),(-.18,.86,-.255)
    ],(.25,.22,.055))
    # tiny worker silhouettes establish human scale without turning the asset into a character scene
    for i,(x,z) in enumerate([(-1.15,.95),(-.65,.82),(1.65,-.85)]):
        cyl(s,f'worker_body_{i}',.07,.38,(x,.58,z),'black',sections=8,axis='y')
        sphere(s,f'worker_head_{i}',.085,(x,.86,z),'cream')
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
    for i,x in enumerate([-1.35,-.45,.45,1.35]):
        gabled_roof(s,f'context_roof_bay_{i}',.88,2.85,.5,(x,3.36,0),'roof_warm' if i%2 else 'roof')
    roof_monitor(s,'context_monitor',(0,4.02,0),1.25,1.35,.55)
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
    # v0.5 makes Context Works read like a production plant from silhouette alone
    box(s,'intake_annex',(1.15,1.25,1.35),(-2.5,.82,.62),'stone_light',.05)
    box(s,'reject_annex',(1.15,1.0,1.35),(2.48,.69,.62),'rust',.05)
    box(s,'intake_hopper',(.9,.78,.86),(-2.52,1.62,.62),'bronze',.04,rot=([0,0,1],.08))
    box(s,'reject_chute',(.8,.2,1.7),(2.42,1.08,.15),'iron_light',.025,rot=([0,0,1],-.22))
    # bridge/catwalk makes the building feel occupied and serviceable
    catwalk(s,'upper_service_walk',(-2.35,3.48,1.3),(2.3,3.48,1.3),.42,'iron_light')
    stairs(s,'context_service_stairs',(2.42,.33,1.24),count=10,step=(.38,.18,.52),direction=-1,mat='iron_light')
    for x in [-1.55,0,1.55]:
        truss_portal(s,f'roof_truss_{x}',x,3.15,4.15,-1.42,1.42,'iron')
    # auxiliary tanks make the production process legible from the exterior
    for i,z in enumerate([-1.0,.15,1.15]):
        cyl(s,f'buffer_tank_{i}',.34,1.4,(2.9,1.05,z),'oxide',sections=18,axis='y')
        cyl(s,f'buffer_cap_{i}',.38,.12,(2.9,1.78,z),'bronze',sections=18,axis='y')
    beam_between(s,'buffer_pipe',(2.9,1.65,-1.0),(2.9,1.65,1.15),.065,'copper')
    for i,(x,z) in enumerate([(-2.55,1.35),(-.9,1.35),(.9,1.35),(2.45,1.35)]):
        lamp(s,f'context_lamp_{i}',(x,.34,z),.72)
    # practical interior light bars are visible through the glass factory shell
    lit_windows(s,'context_interior',[
        (-1.45,1.0,1.39),(-.48,1.0,1.39),(.48,1.0,1.39),(1.45,1.0,1.39),
        (-1.45,2.05,1.39),(-.48,2.05,1.39),(.48,2.05,1.39),(1.45,2.05,1.39)
    ],(.34,.10,.06))
    # visible rejected cargo catcher and sealed output cradle
    box(s,'reject_bin',(1.0,.55,.85),(2.45,.52,1.68),'wood',.06)
    torus(s,'output_cradle',.48,.07,(0,.55,-1.62),'bronze',rot=([1,0,0],math.pi/2))
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
    # v0.5 monumentalize the core with gate tunnels, buttresses and a service ring
    for i,x in enumerate([-1.26,-.42,.42,1.26]):
        box(s,f'gate_tunnel_{i}',(.66,.92,.82),(x,.82,2.05),'stone_dark',.04)
        box(s,f'gate_lintel_{i}',(.78,.16,.92),(x,1.34,2.05),'bronze',.03)
    for angle in np.linspace(0,2*math.pi,8,endpoint=False):
        x=math.cos(angle)*2.23; z=math.sin(angle)*2.23
        box(s,f'core_buttress_{angle:.2f}',(.38,1.35,.34),(x,.86,z),'stone_dark',.05,rot=([0,1,0],-angle))
    # elevated maintenance ring / catwalk around the core front half
    for angle in np.linspace(-2.55,-.6,9):
        x=math.cos(angle)*2.45; z=math.sin(angle)*2.45
        box(s,f'ring_deck_{angle:.2f}',(.48,.08,.46),(x,2.1,z),'iron_light',.02,rot=([0,1,0],-angle))
        beam_between(s,f'ring_post_{angle:.2f}',(x,2.13,z),(x,2.55,z),.022,'iron')
    # cooling annexes and vents frame the dome and add industrial scale
    for side in [-1,1]:
        box(s,f'cooling_house_{side}',(.95,1.3,1.55),(side*2.5,.88,-.45),'oxide',.045)
        for zi,z in enumerate([-.9,-.3,.3]):
            vent(s,f'cooling_vent_{side}_{zi}',(side*2.5,1.75,z),.8)
    stairs(s,'core_front_stairs',(-2.0,.34,2.35),count=9,step=(.4,.16,.5),direction=1,mat='iron_light')
    for i,(x,z) in enumerate([(-2.4,1.85),(-.8,2.45),(.8,2.45),(2.4,1.85)]):
        lamp(s,f'core_lamp_{i}',(x,.3,z),.8)
    # four warm gate clerestories make the decision exits readable from the harbor
    lit_windows(s,'core_gate_lights',[
        (-1.26,1.22,2.50),(-.42,1.22,2.50),(.42,1.22,2.50),(1.26,1.22,2.50)
    ],(.34,.10,.055))
    # crown lantern gives the Model Core a unique skyline signature
    cyl(s,'core_crown',.48,.55,(0,3.92,0),'glass_dark',sections=18,axis='y')
    torus(s,'core_crown_ring',.58,.07,(0,4.2,0),'brass',rot=([1,0,0],math.pi/2))
    sphere(s,'core_beacon',.12,(0,4.35,0),'warm')
    for i,a in enumerate([-2.4,-.8,.8,2.4]):
        x=math.sin(a)*2.65; z=math.cos(a)*2.65
        cyl(s,f'core_turret_{i}',.34,.9,(x,.68,z),'stone_light',sections=14,axis='y')
        cone(s,f'core_turret_cap_{i}',.42,.5,(x,1.42,z),'roof',sections=14)
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
