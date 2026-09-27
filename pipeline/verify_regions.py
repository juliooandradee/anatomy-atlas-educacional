"""Independently reload exported assets and reconcile meshes with label volumes."""
import json
import numpy as np
import nibabel as nib
import trimesh
from scipy.ndimage import distance_transform_edt,map_coordinates
from common import ROOT,OUT,RAW
reports=[]
for region in ['head-neck','pelvis','legs','feet']:
 path=OUT/region;m=json.loads((path/'meta.json').read_text());shape=tuple(m['shape']);spacing=np.array(m['spacing_mm']);center=np.array(m['center_mm'])
 ct=np.fromfile(path/'ct.bin',dtype='<i2').reshape(shape);lab=np.fromfile(path/'labels.bin',dtype=np.uint8).reshape(shape)
 assert nib.aff2axcodes(np.array(m['affine_ras']))==('R','A','S')
 assert set(np.unique(lab))=={0,*[o['id'] for o in m['organs']]}
 checks=[]
 for o in m['organs']:
  mesh=trimesh.load(path/'meshes'/f'{o["name"]}.glb',force='mesh');v=mesh.vertices
  assert np.isfinite(v).all() and np.isfinite(mesh.vertex_normals).all()
  assert lab[tuple(o['anchor'])]==o['id']
  vox=(np.column_stack((-v[:,0],v[:,2],v[:,1]))+center)/spacing
  low,high=np.array(o['bounds_voxel']);local=lab[tuple(slice(int(a),int(b)+1) for a,b in zip(low,high))]==o['id']
  dist=distance_transform_edt(~np.pad(local,2),sampling=spacing)
  deviation=map_coordinates(dist,(vox-low+2).T,order=1,mode='nearest')
  assert deviation.max()<spacing.max()*2,o['name']
  checks.append({'name':o['name'],'anchor_inside':True,'max_glb_surface_to_mask_mm':round(float(deviation.max()),3)})
 # Compare the saved int16 HU against independent interpolation of original CT.
 source=RAW/m['subject']/'ct.nii.gz' if region=='head-neck' else ROOT/'data/bonehub/002_0000.nii.gz'
 original=nib.as_closest_canonical(nib.load(source));lo,hi=m['source_crop_voxel'];cropped=original.slicer[tuple(slice(a,b) for a,b in zip(lo,hi))]
 data=cropped.get_fdata(dtype=np.float32)
 rng=np.random.default_rng(72);points=rng.integers([1,1,1],np.array(shape)-1,size=(256,3))
 transform=np.linalg.inv(cropped.affine)@np.array(m['affine_ras']);source_points=nib.affines.apply_affine(transform,points)
 expected=map_coordinates(data,source_points.T,order=1,mode='constant',cval=-1024)
 actual=ct[tuple(points.T)];hu_error=float(np.abs(actual-expected).max());assert hu_error<=.51,hu_error
 reports.append({'region':region,'structures':checks,'ct_hu_samples':256,'ct_max_rounding_error_hu':round(hu_error,4),'label_ids_match_metadata':True,'orthogonal_ras':True})
 print(region,'exported GLBs and 256 original CT samples verified',flush=True)
(ROOT/'work/qa/regional-independent-checks.json').write_text(json.dumps(reports,indent=2))
