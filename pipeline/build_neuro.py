"""Build a 1 mm MRI atlas in the original MNI2009cSym space, without registration."""
from pathlib import Path
import csv,json,hashlib,re
import numpy as np
import nibabel as nib
import trimesh
from skimage.measure import marching_cubes
from scipy.ndimage import distance_transform_edt,map_coordinates
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]; RAW=ROOT/'data/neuro/templateflow';OUT=ROOT/'web/public/data/neuro';QA=ROOT/'work/qa'
OUT.mkdir(parents=True,exist_ok=True);(OUT/'meshes').mkdir(exist_ok=True);QA.mkdir(exist_ok=True)
prefix='tpl-MNI152NLin2009cSym'
# Each name is defined in CerebrA's published lookup table. Midline structures
# are explicitly reunited rather than implying that two separate ventricles exist.
entries=[
('Third Ventricle','third_ventricle','III ventrículo','Ventrículos'),('Fourth Ventricle','fourth_ventricle','IV ventrículo','Ventrículos'),('Brainstem','brainstem','Tronco encefálico','Tronco e cerebelo'),('Lateral Ventricle','lateral_ventricle','Ventrículo lateral','Ventrículos'),('Inferior Lateral Ventricle','inferior_lateral_ventricle','Corno inferior do ventrículo lateral','Ventrículos'),
('Cerebellum Gray Matter','cerebellum_gray','Cerebelo · substância cinzenta','Tronco e cerebelo'),('Cerebellum White Matter','cerebellum_white','Cerebelo · substância branca','Tronco e cerebelo'),('Thalamus','thalamus','Tálamo','Estruturas profundas'),('Caudate','caudate','Núcleo caudado','Estruturas profundas'),('Putamen','putamen','Putâmen','Estruturas profundas'),('Pallidum','pallidum','Globo pálido','Estruturas profundas'),('Hippocampus','hippocampus','Hipocampo','Estruturas profundas'),('Amygdala','amygdala','Amígdala','Estruturas profundas'),('Accumbens Area','accumbens','Área accumbens','Estruturas profundas'),('Ventral Diencephalon','ventral_diencephalon','Diencéfalo ventral','Estruturas profundas'),('Optic Chiasm','optic_chiasm','Quiasma óptico e tratos','Estruturas profundas'),('Basal Forebrain','basal_forebrain','Prosencéfalo basal','Estruturas profundas'),('Vermal lobules I-V','vermis_i_v','Vermis · lóbulos I–V','Tronco e cerebelo'),('Vermal lobules VI-VII','vermis_vi_vii','Vermis · lóbulos VI–VII','Tronco e cerebelo'),('Vermal lobules VIII-X','vermis_viii_x','Vermis · lóbulos VIII–X','Tronco e cerebelo'),
('Caudal Anterior Cingulate','caudal_anterior_cingulate','Cíngulo anterior caudal','Cíngulo e ínsula'),('Caudal Middle Frontal','caudal_middle_frontal','Frontal médio caudal','Córtex frontal'),('Cuneus','cuneus','Cúneo','Córtex occipital'),('Entorhinal','entorhinal','Córtex entorrinal','Córtex temporal'),('Fusiform','fusiform','Giro fusiforme','Córtex temporal'),('Inferior Parietal','inferior_parietal','Parietal inferior','Córtex parietal'),('Inferior temporal','inferior_temporal','Temporal inferior','Córtex temporal'),('Isthmus Cingulate','isthmus_cingulate','Istmo do cíngulo','Cíngulo e ínsula'),('Lateral Occipital','lateral_occipital','Occipital lateral','Córtex occipital'),('Lateral Orbitofrontal','lateral_orbitofrontal','Orbitofrontal lateral','Córtex frontal'),('Lingual','lingual','Giro lingual','Córtex occipital'),('Medial Orbitofrontal','medial_orbitofrontal','Orbitofrontal medial','Córtex frontal'),('Middle Temporal','middle_temporal','Temporal médio','Córtex temporal'),('Parahippocampal','parahippocampal','Giro para-hipocampal','Córtex temporal'),('Paracentral','paracentral','Lóbulo paracentral','Córtex paracentral'),('Pars Opercularis','pars_opercularis','Frontal inferior · parte opercular','Córtex frontal'),('Pars Orbitalis','pars_orbitalis','Frontal inferior · parte orbital','Córtex frontal'),('Pars Triangularis','pars_triangularis','Frontal inferior · parte triangular','Córtex frontal'),('Pericalcarine','pericalcarine','Córtex pericalcarino','Córtex occipital'),('Postcentral','postcentral','Giro pós-central','Córtex parietal'),('Posterior Cingulate','posterior_cingulate','Cíngulo posterior','Cíngulo e ínsula'),('Precentral','precentral','Giro pré-central','Córtex frontal'),('Precuneus','precuneus','Pré-cúneo','Córtex parietal'),('Rostral Anterior Cingulate','rostral_anterior_cingulate','Cíngulo anterior rostral','Cíngulo e ínsula'),('Rostral Middle Frontal','rostral_middle_frontal','Frontal médio rostral','Córtex frontal'),('Superior Frontal','superior_frontal','Frontal superior','Córtex frontal'),('Superior Parietal','superior_parietal','Parietal superior','Córtex parietal'),('Superior Temporal','superior_temporal','Temporal superior','Córtex temporal'),('Supramarginal','supramarginal','Giro supramarginal','Córtex parietal'),('Transverse Temporal','transverse_temporal','Giro temporal transverso','Córtex temporal'),('Insula','insula','Ínsula','Cíngulo e ínsula')]
lookup={e[0]:e[1:] for e in entries}
midline={'Third Ventricle','Fourth Ventricle','Brainstem','Optic Chiasm','Vermal lobules I-V','Vermal lobules VI-VII','Vermal lobules VIII-X'}
images={k:nib.as_closest_canonical(nib.load(RAW/f'{prefix}_res-1_{f}.nii.gz')) for k,f in [('t1','T1w'),('t2','T2w'),('labels','atlas-CerebrA_dseg')]}
base=images['t1']
assert nib.aff2axcodes(base.affine)==('R','A','S')
for im in images.values(): assert im.shape==base.shape and np.allclose(im.affine,base.affine)
assert np.allclose(base.affine[:3,:3],np.eye(3))
original=np.rint(images['labels'].get_fdata()).astype(np.uint8)
assert set(np.unique(original))==set(range(103))
rows=list(csv.DictReader((RAW/f'{prefix}_atlas-CerebA_dseg.tsv').open(),delimiter='\t'))
assert len(rows)==102
coords=np.argwhere(original>0);lo=np.maximum(coords.min(0)-4,0);hi=np.minimum(coords.max(0)+5,original.shape)
slices=tuple(slice(int(a),int(b)) for a,b in zip(lo,hi));affine=base.affine.copy();affine[:3,3]=nib.affines.apply_affine(base.affine,lo)
labels=np.ascontiguousarray(original[slices]);shape=np.array(labels.shape);center=(shape-1)/2
for name in midline:
 ids=[int(r['label']) for r in rows if r['name']==name];labels[np.isin(labels,ids)]=min(ids)
volumes={}
for name in ['t1','t2']:
 values=images[name].get_fdata(dtype=np.float32)[slices]
 volume=np.ascontiguousarray(np.rint(values*100),dtype='<i2');volume.tofile(OUT/('ct.bin' if name=='t1' else 't2.bin'))
 assert np.max(np.abs(volume.astype(float)/100-values))<=.0051
 volumes[name]=volume
labels.tofile(OUT/'labels.bin')
colors=['#B9CFA7','#E3BC8A','#A9C9D4','#D6AEC4','#C6B6DB','#98BDB2','#D8C992','#C4A28C','#AEBCD2']
groups=list(dict.fromkeys(e[3] for e in entries));organs=[];checks=[]
for row in sorted(rows,key=lambda r:int(r['label'])):
 source_name=row['name'];id=int(row['label']);slug,pt,group=lookup[source_name]
 if source_name in midline and row['hemi']=='L':continue
 suffix='' if source_name in midline else '_'+row['hemi'].lower()
 name=slug+suffix;display=pt if not suffix else pt+(' · esquerdo' if suffix=='_l' else ' · direito')
 mask=labels==id;coords=np.argwhere(mask);assert len(coords)>0
 low=coords.min(0);high=coords.max(0);centroid=coords.mean(0)
 # Choose a deep voxel near the centroid so small, curved labels remain visible.
 local=mask[tuple(slice(int(a),int(b)+1) for a,b in zip(low,high))]
 edt=distance_transform_edt(np.pad(local,1));depth=edt[tuple((coords-low+1).T)]
 candidates=coords[depth>=min(2,float(depth.max()))]
 anchor=candidates[np.argmin(np.sum((candidates-centroid)**2,axis=1))]
 verts,faces,_,_=marching_cubes(np.pad(local,1).astype(np.uint8),.5);verts+=low-1
 raw_mesh=trimesh.Trimesh(verts,faces,process=True);smooth=raw_mesh.copy();trimesh.smoothing.filter_taubin(smooth,lamb=.5,nu=.53,iterations=3)
 distance=distance_transform_edt(~np.pad(local,2))
 for candidate,cap in [(smooth,14000),(smooth,28000),(raw_mesh,14000),(raw_mesh,28000),(raw_mesh,len(raw_mesh.faces))]:
  mesh=candidate.simplify_quadric_decimation(face_count=cap) if len(candidate.faces)>cap else candidate.copy()
  dev=map_coordinates(distance,(mesh.vertices-low+2).T,order=1,mode='nearest')
  if dev.max()<2.01:break
 assert dev.max()<2.01,(name,dev.max())
 ras=mesh.vertices-center;mesh.vertices=np.column_stack((-ras[:,0],ras[:,2],ras[:,1]));mesh.fix_normals();mesh.export(OUT/'meshes'/f'{name}.glb')
 source_ids=[int(r['label']) for r in rows if r['name']==source_name] if source_name in midline else [id]
 organ={'id':id,'name':name,'display_name':display,'latin':source_name,'group':group,'color':colors[groups.index(group)%len(colors)],'centroid':centroid.tolist(),'anchor':anchor.tolist(),'volume_ml':round(len(coords)/1000,3),'faces':len(mesh.faces),'bounds_voxel':[low.tolist(),high.tolist()],'source_ids':source_ids,'hemisphere':row['hemi'] if suffix else 'midline','note':'Parcela anatômica do atlas médio CerebrA. Os limites representam a convenção do atlas.'}
 organs.append(organ);checks.append({'name':name,'source_ids':source_ids,'anchor_inside':bool(labels[tuple(anchor)]==id),'max_surface_distance_mm':round(float(dev.max()),3),'faces':len(mesh.faces)})
 print(display,len(mesh.faces),'faces',flush=True)
# Frontal cortex first, then other cortical areas and deep structures.
organs.sort(key=lambda o:(0 if o['group'].startswith('Córtex') else 1,o['group'],o['display_name']))
meta={'schema_version':1,'modality':'MRI','subject':'ICBM152 2009c Sym / CerebrA','shape':shape.tolist(),'spacing_mm':[1,1,1],'center_mm':center.tolist(),'affine_ras':affine.tolist(),'source_affine_ras':base.affine.tolist(),'source_crop_voxel':[lo.tolist(),hi.tolist()],'ct_dtype':'int16-le','intensity_units':'unidades arbitrárias × 100; não são HU','window':{'width':11000,'level':5500},'sequence_windows':{'t1':{'width':11000,'level':5500},'t2':{'width':10000,'level':5000}},'default_id':86,'organs':organs,'source':{'url':'https://doi.gin.g-node.org/10.12751/g-node.be5e62/','attribution':'CerebrA · Manera et al. (2020) / ICBM152 · Fonov et al. / McGill','license':'CerebrA CC0 · template sob licença McGill'},'coverage':'Ressonância T1/T2 do atlas médio ICBM152 2009c simétrico, 1 mm. CerebrA: 62 parcelas corticais e 33 estruturas profundas, cerebelares ou ventriculares. Não corresponde à pessoa da TC. Limites de parcelas seguem a convenção do atlas.'}
(OUT/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));(OUT/'LICENSE-McGill.txt').write_bytes((RAW/'LICENSE').read_bytes())
(QA/'neuro-build-checks.json').write_text(json.dumps({'shape':shape.tolist(),'structures':checks,'source_labels':102,'display_structures':len(organs),'intensity_quantization_max':.0051,'sha256':{str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.rglob('*') if p.is_file()}},indent=2))
# Montage of the actual source-derived data in radiological orientation.
for seq,data in volumes.items():
 display=np.rint(np.clip(data/11000,0,1)*255).astype(np.uint8);i,j,k=(shape//2).tolist()
 tiles=[]
 for title,a in [('Axial',display[::-1,::-1,k].T),('Coronal',display[::-1,j,::-1].T),('Sagital',display[i,::-1,::-1].T)]:
  im=Image.fromarray(a).convert('RGB');im.thumbnail((390,390));tile=Image.new('RGB',(410,430),'#0b100f');tile.paste(im,((410-im.width)//2,30+(390-im.height)//2));ImageDraw.Draw(tile).text((14,10),f'{seq.upper()} - {title}',fill='white');tiles.append(tile)
 montage=Image.new('RGB',(1230,430));[montage.paste(t,(410*n,0)) for n,t in enumerate(tiles)];montage.save(QA/f'neuro-{seq}-source.png')
print('DONE',len(organs),'structures',sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()),'bytes',flush=True)
