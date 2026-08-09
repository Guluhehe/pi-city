from __future__ import annotations
from pathlib import Path
import numpy as np
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

ROOT=Path(__file__).resolve().parents[1]
MODELS=[
    ('Arrival Harbor','arrival-harbor.glb'),
    ('Context Works','context-works.glb'),
    ('Model Core','model-core.glb'),
]

def rgba(mesh):
    try:
        fc=np.asarray(mesh.visual.face_colors)
        if fc.size:
            c=fc.mean(axis=0)/255.0
            if len(c)==4: return c
    except Exception:
        pass
    try:
        mat=mesh.visual.material
        b=np.asarray(mat.baseColorFactor,dtype=float)
        if b.max()>1.1: b=b/255.0
        return b
    except Exception:
        return np.array([.45,.42,.34,1])

def draw(ax, path:Path):
    scene=trimesh.load(path,force='scene')
    meshes=scene.dump()
    allv=[]
    for m in meshes:
        if not isinstance(m,trimesh.Trimesh) or len(m.faces)==0: continue
        # Project the Y-up glTF/Three.js world into matplotlib's Z-up axes:
        # display X = model X, display Y = model Z, display Z = model Y.
        raw=m.vertices
        v=raw[:, [0,2,1]]
        allv.append(v)
        faces=v[m.faces]
        # cap very dense pieces for preview speed while retaining silhouette
        if len(faces)>1600:
            faces=faces[::max(1,len(faces)//1600)]
        col=rgba(m)
        pc=Poly3DCollection(faces, facecolor=col, edgecolor=(.09,.10,.09,.16), linewidths=.12)
        pc.set_alpha(min(.98, col[3] if len(col)>3 else .98))
        ax.add_collection3d(pc)
    v=np.vstack(allv)
    mn=v.min(0); mx=v.max(0); c=(mn+mx)/2; span=max(mx-mn)*.62
    ax.set_xlim(c[0]-span,c[0]+span); ax.set_ylim(c[1]-span,c[1]+span); ax.set_zlim(max(-.5,c[2]-span*.55),c[2]+span*.85)
    ax.view_init(elev=22,azim=128)
    ax.set_box_aspect((1,1,.82)); ax.set_axis_off()
    ax.set_facecolor('#c7aa7c')

fig=plt.figure(figsize=(16,8.7),dpi=160,facecolor='#b79165')
for i,(title,file) in enumerate(MODELS,1):
    ax=fig.add_subplot(1,3,i,projection='3d')
    draw(ax,ROOT/'public'/'assets'/'models'/file)
    ax.set_title(title,fontsize=17,pad=4,color='#2e2c27',fontweight='bold')
fig.text(.04,.945,'PI CITY · v0.5 HERO ASSET PASS',fontsize=21,color='#292824',weight='bold')
fig.text(.04,.915,'Asset-based industrial harbor · geometry preview (not final browser lighting)',fontsize=10,color='#4b453c')
plt.subplots_adjust(left=.015,right=.99,bottom=.02,top=.88,wspace=-.02)
out=ROOT/'public'/'assets'/'hero-assets-preview-v05.png'
fig.savefig(out,facecolor=fig.get_facecolor())
print(out)
