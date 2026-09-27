"""Reproducible exploratory texture comparison; not a clinical image-quality score."""
import json
import nibabel as nib
import numpy as np
from scipy.ndimage import binary_erosion,median_filter
from common import ROOT,RAW

rows=[]
for subject in ['s1082','s1388','s0591','s1029','s1369']:
 ct=nib.as_closest_canonical(nib.load(RAW/subject/'ct.nii.gz'))
 mask=nib.as_closest_canonical(nib.load(RAW/subject/'segmentations/brain.nii.gz'))
 assert ct.shape==mask.shape and np.allclose(ct.affine,mask.affine,atol=1e-4)
 brain=np.asarray(mask.dataobj)>0;coords=np.argwhere(brain)
 lo=np.maximum(coords.min(0)-5,0);hi=np.minimum(coords.max(0)+6,ct.shape)
 slices=tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))
 image=ct.slicer[slices].get_fdata(dtype=np.float32);interior=binary_erosion(brain[slices],iterations=4)
 delta=(image-median_filter(image,size=3))[interior]
 rows.append({'case':subject,'spacing':list(map(float,ct.header.get_zooms())),'robust_residual_hu':float(np.median(np.abs(delta-np.median(delta)))*1.4826),'p10_p50_p90':np.percentile(image[interior],[10,50,90]).tolist(),'brain_voxels':int(brain.sum())})
 print(rows[-1],flush=True)
folder=ROOT/'work/brain-review';folder.mkdir(exist_ok=True)
(folder/'quality-recomputed.json').write_text(json.dumps(rows,indent=2))
