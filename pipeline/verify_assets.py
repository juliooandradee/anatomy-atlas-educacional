"""Independent geometric checks against final label voxels and exported GLBs."""
import json
import nibabel as nib
import numpy as np
import trimesh
from scipy.ndimage import distance_transform_edt
from common import ROOT, OUT

meta=json.loads((OUT/'meta.json').read_text())
shape=tuple(meta['shape'])
spacing=np.array(meta['spacing_mm'])
center=np.array(meta['center_mm'])
labels=np.fromfile(OUT/'labels.bin',dtype=np.uint8).reshape(shape)
ct=np.fromfile(OUT/'ct.bin',dtype=np.uint8).reshape(shape)
assert ct.min()>=0 and ct.max()<=255
assert set(np.unique(labels))==set(range(9))
assert nib.aff2axcodes(np.array(meta['affine_ras']))==('R','A','S')
checks=[]
for organ in meta['organs']:
    mesh=trimesh.load(OUT/'meshes'/f'{organ["name"]}.glb',force='mesh')
    assert mesh.faces.shape[0]<=40000
    assert np.isfinite(mesh.vertices).all()
    v=mesh.vertices
    ras=np.column_stack((-v[:,0],v[:,2],v[:,1]))+center
    voxels=np.rint(ras/spacing).astype(int)
    voxels=np.clip(voxels,0,np.array(shape)-1)
    outside=distance_transform_edt(labels!=organ['id'],sampling=spacing)
    distances=outside[tuple(voxels.T)]
    assert distances.max()<=np.max(spacing)*2.5,(organ['name'],distances.max())
    assert labels[tuple(organ['anchor'])]==organ['id']
    checks.append({'organ':organ['name'],'max_mesh_to_mask_distance_mm':round(float(distances.max()),3),'mean_distance_mm':round(float(distances.mean()),3),'faces':len(mesh.faces),'watertight':bool(mesh.is_watertight),'anchor_inside':True})
(ROOT/'work/qa/mesh-checks.json').write_text(json.dumps(checks,indent=2))
print(json.dumps(checks,indent=2))
