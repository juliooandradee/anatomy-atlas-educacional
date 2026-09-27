"""Build all browser assets from one shared, orthogonal RAS+ grid."""
import json
import argparse
import hashlib
import nibabel as nib
import numpy as np
import trimesh
from nibabel.processing import resample_to_output, resample_from_to
from skimage.measure import marching_cubes
from PIL import Image, ImageDraw
from common import ROOT, RAW, OUT, STRUCTURES

selection = json.loads((ROOT/'work/selection.json').read_text())
subject = selection['selected']['subject']
source = RAW / subject
ct_img = nib.as_closest_canonical(nib.load(source/'ct.nii.gz'))
# Float32 prevents an unnecessary float64 allocation during interpolation.
ct_img = nib.Nifti1Image(ct_img.get_fdata(dtype=np.float32), ct_img.affine)
parser = argparse.ArgumentParser()
parser.add_argument('--spacing',type=float,default=2.0,help='Output isotropic spacing in millimeters')
spacing = parser.parse_args().spacing
if spacing <= 0: raise ValueError('Spacing must be positive')
extent = np.ptp(nib.affines.apply_affine(ct_img.affine, np.array(np.meshgrid(*[(0,n-1) for n in ct_img.shape], indexing='ij')).reshape(3,-1).T), axis=0)
while np.prod(np.ceil(extent/spacing)+1) > 40_000_000:
    spacing = round(spacing + .1, 1)
target = resample_to_output(ct_img, voxel_sizes=(spacing,)*3, order=1, cval=-1024)
ct = target.get_fdata(dtype=np.float32)
labels = np.zeros(target.shape, dtype=np.uint8)
overlap = 0
for label, (name, _, _, _) in enumerate(STRUCTURES, 1):
    files = sorted((source/'segmentations').glob('vertebrae_*.nii.gz')) if name == 'spine' else [source/'segmentations'/f'{name}.nii.gz']
    for file in files:
        img = nib.as_closest_canonical(nib.load(file))
        if img.shape != ct_img.shape or not np.allclose(img.affine, ct_img.affine, atol=1e-4):
            raise ValueError(f'Input CT/mask alignment mismatch: {file.name}')
        mask = np.asarray(resample_from_to(img, target, order=0).dataobj) > 0
        overlap += int(np.count_nonzero(mask & (labels > 0)))
        labels[mask] = label
    print(f'Prepared {name}', flush=True)

occupied = np.where(labels > 0)
margin = int(np.ceil(20/spacing))
lo = np.maximum([int(a.min())-margin for a in occupied], 0)
hi = np.minimum([int(a.max())+margin+1 for a in occupied], target.shape)
slices = tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))
labels = np.ascontiguousarray(labels[slices])
ct = np.ascontiguousarray(np.rint(np.clip((ct[slices]+150)/400, 0, 1)*255), dtype=np.uint8)
shape = np.array(labels.shape)
center = (shape-1)*spacing/2
cropped_affine = target.affine.copy()
cropped_affine[:3,3] = nib.affines.apply_affine(target.affine, lo)
OUT.mkdir(parents=True, exist_ok=True)
(OUT/'meshes').mkdir(exist_ok=True)
ct.tofile(OUT/'ct.bin')
labels.tofile(OUT/'labels.bin')
organs = []
for label, (name, display, color, latin) in enumerate(STRUCTURES, 1):
    mask = labels == label
    coords = np.argwhere(mask)
    if not len(coords):
        raise ValueError(f'Empty output structure {name}')
    centroid = coords.mean(axis=0)
    anchor = coords[np.argmin(np.sum((coords-centroid)**2, axis=1))]
    assert labels[tuple(anchor)] == label
    vertices, faces, _, _ = marching_cubes(np.pad(mask, 1).astype(np.uint8), level=.5, spacing=(spacing,)*3)
    vertices -= spacing
    mesh = trimesh.Trimesh(vertices, faces, process=True)
    trimesh.smoothing.filter_taubin(mesh, lamb=.5, nu=.53, iterations=10)
    if len(mesh.faces) > 40000:
        mesh = mesh.simplify_quadric_decimation(face_count=40000)
    ras = mesh.vertices.copy() - center
    mesh.vertices = np.column_stack((-ras[:,0], ras[:,2], ras[:,1]))
    mesh.fix_normals()
    mesh.export(OUT/'meshes'/f'{name}.glb')
    organs.append({'id':label, 'name':name, 'display_name':display, 'latin':latin, 'color':color, 'centroid':centroid.tolist(), 'anchor':anchor.tolist(), 'volume_ml':round(len(coords)*spacing**3/1000,1), 'faces':len(mesh.faces), 'bounds_voxel':[coords.min(0).tolist(),coords.max(0).tolist()]})
    print(f'{name}: {len(mesh.faces)} faces', flush=True)

assert organs[0]['centroid'][0] > organs[1]['centroid'][0], 'Liver must be on patient right'
assert organs[3]['centroid'][0] > organs[4]['centroid'][0], 'Right kidney must be on patient right'
meta = {'schema_version':1, 'subject':subject, 'shape':shape.tolist(), 'spacing_mm':[spacing]*3, 'crop_offset':lo.tolist(), 'center_mm':center.tolist(), 'affine_ras':cropped_affine.tolist(), 'source_affine_ras':ct_img.affine.tolist(), 'storage':'uint8 C-order; index = i*nj*nk + j*nk + k', 'window':{'width':400,'level':50}, 'organs':organs, 'source':{'url':'https://zenodo.org/records/10047263','attribution':'TotalSegmentator — Wasserthal et al., University Hospital Basel','license':'CC BY 4.0'}, 'selection_criterion':selection['criterion'], 'overlap_voxels':overlap}
(OUT/'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2))

qa = ROOT/'work/qa'
qa.mkdir(exist_ok=True)
for organ in [organs[0], organs[4], organs[7]]:
    i,j,k = organ['anchor']
    planes = {'axial':(ct[::-1,::-1,k].T, labels[::-1,::-1,k].T, ('A','P','R','L')), 'coronal':(ct[::-1,j,::-1].T, labels[::-1,j,::-1].T, ('S','I','R','L')), 'sagittal':(ct[i,::-1,::-1].T, labels[i,::-1,::-1].T, ('S','I','A','P'))}
    for plane,(pixels, segmentation, letters) in planes.items():
        rgb=np.repeat(pixels[:,:,None],3,axis=2).astype(float)
        for item in organs:
            mask = segmentation == item['id']
            color=np.array([int(item['color'][p:p+2],16) for p in (1,3,5)])
            rgb[mask]=rgb[mask]*.7+color*.3
        im=Image.fromarray(rgb.astype(np.uint8)).resize((pixels.shape[1]*3,pixels.shape[0]*3))
        d=ImageDraw.Draw(im)
        w,h=im.size
        for xy,t in [((w//2,8),letters[0]),((w//2,h-20),letters[1]),((8,h//2),letters[2]),((w-20,h//2),letters[3])]:
            d.text(xy,t,fill='white',stroke_width=1,stroke_fill='black')
        im.save(qa/f'{organ["name"]}-{plane}.png')

# Sibling regional datasets live under OUT too; this budget covers abdomen only.
abdomen_files = [OUT/'ct.bin', OUT/'labels.bin', OUT/'meta.json', *(OUT/'meshes').glob('*.glb')]
total = sum(f.stat().st_size for f in abdomen_files)
checks={'subject':subject,'liver_right_of_spleen':True,'kidney_lateralities':True,'all_anchors_inside':True,'input_mask_grids_match_ct':True,'output_orthogonal_ras':bool(np.allclose(cropped_affine[:3,:3],np.diag([spacing]*3))), 'shape':shape.tolist(),'spacing_mm':spacing,'asset_bytes':total,'under_20_MB':total<20_000_000,'sha256':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in [OUT/'ct.bin',OUT/'labels.bin']}}
(qa/'pipeline-checks.json').write_text(json.dumps(checks,indent=2))
assert total < 20_000_000, f'Assets exceed target: {total}'
print(json.dumps(checks,indent=2), flush=True)
