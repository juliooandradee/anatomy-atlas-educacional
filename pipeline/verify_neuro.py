"""Independent source, exported-volume and GLB checks."""
from pathlib import Path
import json,nibabel as nib,numpy as np,trimesh
from scipy.ndimage import distance_transform_edt,map_coordinates
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'web/public/data/neuro';raw=ROOT/'data/neuro/templateflow';m=json.loads((out/'meta.json').read_text());shape=tuple(m['shape']);lo,hi=np.array(m['source_crop_voxel']);crop=tuple(slice(int(a),int(b)) for a,b in zip(lo,hi));prefix='tpl-MNI152NLin2009cSym_res-1_'
labels=np.fromfile(out/'labels.bin',np.uint8).reshape(shape);source=nib.as_closest_canonical(nib.load(raw/(prefix+'atlas-CerebrA_dseg.nii.gz')));expected=np.asarray(source.dataobj)[crop].copy()
for organ in m['organs']:expected[np.isin(np.asarray(source.dataobj)[crop],organ['source_ids'])]=organ['id']
assert np.array_equal(expected,labels)
assert np.allclose(np.array(m['affine_ras'])[:3,3],nib.affines.apply_affine(source.affine,lo))
assert set(np.unique(labels))=={0,*[o['id'] for o in m['organs']]}
quantization={}
for seq,file in [('T1w','ct.bin'),('T2w','t2.bin')]:
 image=nib.as_closest_canonical(nib.load(raw/(prefix+seq+'.nii.gz')));assert np.allclose(image.affine,source.affine)
 data=np.fromfile(out/file,dtype='<i2').reshape(shape)/100;maxerr=float(np.max(np.abs(data-image.get_fdata()[crop])));assert maxerr<=.0051;quantization[seq]=maxerr
checks=[]
for o in m['organs']:
 mask=labels==o['id'];assert mask[tuple(o['anchor'])]
 if o['hemisphere']=='L':assert nib.affines.apply_affine(np.array(m['affine_ras']),o['centroid'])[0]<0
 if o['hemisphere']=='R':assert nib.affines.apply_affine(np.array(m['affine_ras']),o['centroid'])[0]>0
 mesh=trimesh.load(out/'meshes'/f'{o["name"]}.glb',force='mesh');v=mesh.vertices
 vox=np.column_stack((-v[:,0],v[:,2],v[:,1]))+np.array(m['center_mm'])
 low,high=np.array(o['bounds_voxel']);local=mask[tuple(slice(int(a),int(b)+1) for a,b in zip(low,high))]
 d=distance_transform_edt(~np.pad(local,2));deviation=map_coordinates(d,(vox-low+2).T,order=1,mode='nearest')
 assert np.isfinite(v).all() and deviation.max()<2.01
 checks.append({'name':o['name'],'anchor_inside':True,'max_glb_distance_mm':round(float(deviation.max()),4),'hemisphere_verified':o['hemisphere']})
report={'structures':checks,'source_label_volume_exact_match':True,'original_spacing_mm':[1,1,1],'all_voxel_intensity_error':quantization,'coordinate_frame':'MNI152NLin2009cSym RAS','new_registration':False}
(ROOT/'work/qa/neuro-independent-checks.json').write_text(json.dumps(report,indent=2));print('PASS',len(checks),'structures; full T1/T2 volume and labels checked')
