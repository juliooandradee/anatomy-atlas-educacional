"""Create regional CT/label/GLB assets on the same orthogonal RAS+ grid.

Original public datasets are immutable. Regional crops are explicit in metadata;
CT is linear-resampled HU int16, labels nearest-neighbor uint8. BoneHub data and
these derived assets remain CC BY-NC-SA 4.0.
"""
import argparse,json,hashlib
import nibabel as nib
import numpy as np
import trimesh
from scipy.ndimage import find_objects, distance_transform_edt, map_coordinates
from nibabel.processing import resample_to_output,resample_from_to
from skimage.measure import marching_cubes
from PIL import Image,ImageDraw
from common import ROOT,RAW,OUT
from fetch_regions import HEAD_NAMES

QA=ROOT/'work/qa';QA.mkdir(exist_ok=True)
HEAD_SUBJECT='s0591'
BONE_CASE='002'
HEAD_INFO={
 'brain':('Encéfalo','Encephalon','#cf98c5','Encéfalo e crânio'),
 'skull':('Crânio','Cranium','#e8d8b9','Encéfalo e crânio'),
 'spinal_cord':('Medula espinal · cervical','Medulla spinalis','#e7c08e','Coluna cervical'),
 'thyroid_gland':('Tireoide','Glandula thyroidea','#c798d4','Pescoço'),
 'trachea':('Traqueia · segmento cervical','Trachea','#94c8cb','Pescoço'),
 'common_carotid_artery_left':('Carótida comum esquerda','Arteria carotis communis','#e889a7','Pescoço'),
 'common_carotid_artery_right':('Carótida comum direita','Arteria carotis communis','#de5e82','Pescoço'),
}
for i in range(1,8):
 HEAD_INFO[f'vertebrae_C{i}']=(f'C{i} · '+({1:'Atlas',2:'Áxis'}.get(i,'Vértebra cervical')),f'Vertebra cervicalis {i}', ['#dbbaa1','#d8bea9','#d2c4ae','#c5c9b4','#bac9c5','#b6c0d4','#c0b4d1'][i-1],'Coluna cervical')
BONE_NAMES={
 'Sacrum':('Sacro','Os sacrum','Cintura pélvica','m'),
 'Hip':('Osso do quadril','Os coxae','Cintura pélvica','m'),
 'Femur':('Fêmur','Femur','Coxas','m'),
 'Patella':('Patela','Patella','Joelhos','f'),
 'Tibia':('Tíbia','Tibia','Pernas','f'),
 'Fibula':('Fíbula','Fibula','Pernas','f'),
 'Talus':('Tálus','Talus','Tarso','m'),
 'Calcaneus':('Calcâneo','Calcaneus','Tarso','m'),
 'Navicular':('Navicular','Os naviculare','Tarso','m'),
 'Cuboid':('Cuboide','Os cuboideum','Tarso','m'),
 'Medial_Cuneiform':('Cuneiforme medial','Os cuneiforme mediale','Tarso','m'),
 'Intermediate_Cuneiform':('Cuneiforme intermédio','Os cuneiforme intermedium','Tarso','m'),
 'Lateral_Cuneiform':('Cuneiforme lateral','Os cuneiforme laterale','Tarso','m'),
}
COLORS=['#e6c6a7','#d7b0ce','#a9c4db','#a8cbbd','#dfbba4','#c1b5dd','#e19fb0','#b7c69e','#9fc7d0','#d5bb91','#d7a7c4','#bdc8dd']

def bone_info(name,id,region):
 if name=='Sacrum': base=name;side=''
 else:base,side=name.rsplit('_',1)
 if base.startswith('Metatarsal_'):
  digit=int(base.split('_')[-1]); pt,latin,group,gender=f'{digit}º metatarso',f'Os metatarsale {digit}','Metatarso','m'
 elif base.startswith('Phalange_'):
  digit,part=map(int,base.split('_')[-2:]);loc='proximal' if part==1 else 'distal' if part==(2 if digit==1 else 3) else 'média'
  pt,latin,group,gender=f'Falange {loc} · dedo {digit}',f'Phalanx {"proximalis" if loc=="proximal" else "distalis" if loc=="distal" else "media"} {digit}','Falanges','f'
 else:pt,latin,group,gender=BONE_NAMES[base]
 side_pt = ('esquerdo' if side=='L' else 'direito') if gender=='m' else ('esquerda' if side=='L' else 'direita')
 display=pt + (' '+side_pt if side else '')
 note='Compare os lados e use “Isolar estrutura” para acompanhar seu contorno nas vistas sincronizadas.'
 if region=='pelvis' and base=='Femur':display+=' · proximal';note='Este módulo mostra apenas a porção proximal. Abra “Coxas e pernas” para explorar o fêmur completo.'
 if region=='feet' and base in ['Tibia','Fibula']:display+=' · distal';note='Este módulo mostra a porção distal junto ao tornozelo. O osso completo está em “Coxas e pernas”.'
 return {'id':id,'name':name.lower(),'display_name':display,'latin':latin,'group':group,'color':COLORS[(id//2)%len(COLORS)],'note':note}

def bbox(arr,ids):
 boxes=find_objects(arr)
 bounds=[boxes[i-1] for i in ids if i<=len(boxes) and boxes[i-1] is not None]
 if len(bounds)!=len(ids):raise ValueError('Missing requested source labels')
 return np.min([[s.start for s in b] for b in bounds],axis=0),np.max([[s.stop for s in b] for b in bounds],axis=0)

def cropped_grid(ct_img, labels, ids, primary, spacing, lower_mm=0,upper_mm=0):
 assert nib.aff2axcodes(ct_img.affine)==('R','A','S')
 # Both sources are axis aligned after canonicalization. Cropping by SI assumes it.
 assert np.allclose(ct_img.affine[:3,:3],np.diag(np.diag(ct_img.affine[:3,:3])),atol=1e-5)
 lo,hi=bbox(labels,primary)
 zoom=np.diag(ct_img.affine[:3,:3])
 lo=np.maximum(lo-np.ceil(np.array([18,18,18+lower_mm])/zoom).astype(int),0)
 hi=np.minimum(hi+np.ceil(np.array([18,18,18+upper_mm])/zoom).astype(int),labels.shape)
 slices=tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))
 cropped=ct_img.slicer[slices]
 cropped=nib.Nifti1Image(cropped.get_fdata(dtype=np.float32),cropped.affine)
 mask=np.asarray(labels[slices],dtype=np.uint8).copy(); mask[~np.isin(mask,ids)]=0
 target=resample_to_output(cropped,voxel_sizes=(spacing,)*3,order=1,cval=-1024)
 label_img=resample_from_to(nib.Nifti1Image(mask,cropped.affine),target,order=0,cval=0)
 return target,np.ascontiguousarray(label_img.dataobj,dtype=np.uint8),lo,hi

def write_region(region,target,labels,items,source,subject,coverage,default_id,default_window,original_affine,source_crop):
 out=OUT/region;out.mkdir(exist_ok=True);(out/'meshes').mkdir(exist_ok=True)
 spacing=np.asarray(target.header.get_zooms());shape=np.array(target.shape);center=(shape-1)*spacing/2
 ct=np.ascontiguousarray(np.rint(np.clip(target.get_fdata(dtype=np.float32),-32768,32767)),dtype='<i2')
 ct.tofile(out/'ct.bin');labels.tofile(out/'labels.bin')
 checks=[];organs=[]
 for item in items:
  id=item['id'];mask=labels==id;coords=np.argwhere(mask)
  if not len(coords):raise ValueError(f'Empty class {item}')
  centroid=coords.mean(0);anchor=coords[np.argmin(np.sum((coords-centroid)**2,axis=1))]
  low=coords.min(0);high=coords.max(0)
  # Extract locally for small bones, retaining exactly the global volume origin.
  local=mask[tuple(slice(int(a),int(b)+1) for a,b in zip(low,high))]
  verts,faces,_,_=marching_cubes(np.pad(local,1).astype(np.uint8),level=.5,spacing=spacing)
  verts+=(low-1)*spacing
  raw_mesh=trimesh.Trimesh(verts,faces,process=True)
  smooth=raw_mesh.copy();trimesh.smoothing.filter_taubin(smooth,lamb=.5,nu=.53,iterations=6)
  # Thin cortical surfaces need more triangles. Keep simplification only when
  # the resulting vertices remain within two voxels of the original mask.
  dist=distance_transform_edt(~np.pad(local,2),sampling=spacing)
  for candidate,cap,smoothing in [(smooth,30000,6),(smooth,60000,6),(smooth,120000,6),(raw_mesh,60000,0),(raw_mesh,120000,0),(raw_mesh,len(raw_mesh.faces),0)]:
   mesh=candidate.simplify_quadric_decimation(face_count=cap) if len(candidate.faces)>cap else candidate.copy()
   local_vertices=(mesh.vertices/spacing-low+2).T
   deviation=map_coordinates(dist,local_vertices,order=1,mode='nearest')
   if float(deviation.max())<float(spacing.max())*2:break
  ras=mesh.vertices-center;mesh.vertices=np.column_stack((-ras[:,0],ras[:,2],ras[:,1]));mesh.fix_normals()
  mesh.export(out/'meshes'/f'{item["name"]}.glb')
  organ={**item,'centroid':centroid.tolist(),'anchor':anchor.tolist(),'volume_ml':round(len(coords)*float(np.prod(spacing))/1000,2),'faces':len(mesh.faces),'bounds_voxel':[low.tolist(),high.tolist()]}
  organs.append(organ)
  check={'name':item['name'],'anchor_inside':bool(labels[tuple(anchor)]==id),'faces':len(mesh.faces),'finite_normals':bool(np.isfinite(mesh.vertex_normals).all()),'max_surface_distance_mm':round(float(deviation.max()),3),'watertight':bool(mesh.is_watertight),'smoothing_iterations':smoothing}
  assert check['anchor_inside'] and check['finite_normals'] and check['max_surface_distance_mm']<float(spacing.max())*2, check
  checks.append(check)
  print(region,item['display_name'],len(coords),'voxels',len(mesh.faces),'faces',flush=True)
 presets={'soft':{'width':400,'level':50},'bone':{'width':1800,'level':400},'brain':{'width':80,'level':40}}
 meta={'schema_version':1,'subject':subject,'shape':shape.tolist(),'spacing_mm':spacing.tolist(),'center_mm':center.tolist(),'affine_ras':target.affine.tolist(),'source_affine_ras':original_affine.tolist(),'source_crop_voxel':source_crop,'storage':'C-order; index = i*nj*nk + j*nk + k','ct_dtype':'int16-le','window':presets[default_window],'default_window':default_window,'default_id':default_id,'organs':organs,'source':source,'coverage':coverage}
 (out/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 total=sum(f.stat().st_size for f in out.rglob('*') if f.is_file())
 assert total < 35_000_000,f'{region}: region too large ({total})'
 pairs=[]
 names={o['name']:o for o in organs}
 for name,o in names.items():
  if name.endswith('_l') and name[:-2]+'_r' in names:
   right=names[name[:-2]+'_r'];assert right['centroid'][0]>o['centroid'][0],name
   pairs.append(name[:-2])
 # RAS+ x increases to the patient's right; camera looks from anterior.
 if region=='head-neck':
  assert names['common_carotid_artery_right']['centroid'][0]>names['common_carotid_artery_left']['centroid'][0]
  pairs.append('carotids')
 report={'region':region,'subject':subject,'shape':shape.tolist(),'spacing_mm':spacing.tolist(),'asset_bytes':total,'orthogonal_ras':bool(np.allclose(target.affine[:3,:3],np.diag(spacing))), 'left_right_pairs_checked':pairs,'structures':checks,'sha256':{str(f.relative_to(out)):hashlib.sha256(f.read_bytes()).hexdigest() for f in out.rglob('*') if f.is_file()}}
 (QA/f'{region}-checks.json').write_text(json.dumps(report,indent=2))
 # Independent slice images for visual orientation review.
 for organ in [organs[0],organs[-1]]:
  i,j,k=organ['anchor'];window=meta['window'];display=np.rint(np.clip((ct-window['level']+window['width']/2)/window['width'],0,1)*255).astype(np.uint8)
  tiles=[]
  for plane,(pix,seg,letters) in {'axial':(display[::-1,::-1,k].T,labels[::-1,::-1,k].T,'APRL'),'coronal':(display[::-1,j,::-1].T,labels[::-1,j,::-1].T,'SIRL'),'sagittal':(display[i,::-1,::-1].T,labels[i,::-1,::-1].T,'SIAP')}.items():
   rgb=np.repeat(pix[:,:,None],3,axis=2).astype(float)
   for o in organs:
    mask=seg==o['id'];color=np.array([int(o['color'][p:p+2],16) for p in (1,3,5)])
    rgb[mask]=rgb[mask]*.65+color*.35
   im=Image.fromarray(rgb.astype(np.uint8));im.thumbnail((380,430))
   tile=Image.new('RGB',(400,480),'#160e13');tile.paste(im,((400-im.width)//2,30+(430-im.height)//2));d=ImageDraw.Draw(tile)
   d.text((10,8),plane+' '+organ['name'],fill='white')
   for pos,letter in zip([(195,26),(195,456),(6,240),(386,240)],letters):d.text(pos,letter,fill='white')
   tiles.append(tile)
  montage=Image.new('RGB',(1200,480));[montage.paste(t,(400*n,0)) for n,t in enumerate(tiles)];montage.save(QA/f'{region}-{organ["name"]}-slices.png')
 print(region,'DONE',round(total/1e6,2),'MB',flush=True)


def build_head():
 ct=nib.as_closest_canonical(nib.load(RAW/HEAD_SUBJECT/'ct.nii.gz'));labels=np.zeros(ct.shape,dtype=np.uint8);items=[]
 for id,name in enumerate(HEAD_NAMES,1):
  im=nib.as_closest_canonical(nib.load(RAW/HEAD_SUBJECT/'segmentations'/f'{name}.nii.gz'))
  assert im.shape==ct.shape and np.allclose(im.affine,ct.affine,atol=1e-4),name
  mask=np.asarray(im.dataobj)>0;labels[mask]=id
  pt,latin,color,group=HEAD_INFO[name]
  note='Ajuste a janela de TC para comparar o contorno segmentado com o exame.'
  if name in ['spinal_cord','trachea'] or 'carotid' in name:note='Apenas o segmento incluído neste recorte cervical é exibido.'
  items.append({'id':id,'name':name,'display_name':pt,'latin':latin,'color':color,'group':group,'note':note})
 primary=[HEAD_NAMES.index(n)+1 for n in ['brain','skull','vertebrae_C1','vertebrae_C7','thyroid_gland']]
 target,lab,lo,hi=cropped_grid(ct,labels,list(range(1,15)),primary,1.5)
 write_region('head-neck',target,lab,items,{'url':'https://zenodo.org/records/10047263','attribution':'TotalSegmentator · Wasserthal et al. · University Hospital Basel','license':'CC BY 4.0'},HEAD_SUBJECT,f'Cabeça e pescoço do caso {HEAD_SUBJECT}. Vasos, medula e traqueia limitados ao recorte cervical; segmentação automática para exploração educacional.',1,'brain',ct.affine,[lo.tolist(),hi.tolist()])


def build_bones(requested):
 root=ROOT/'data/bonehub';ct=nib.as_closest_canonical(nib.load(root/f'{BONE_CASE}_0000.nii.gz'));img=nib.as_closest_canonical(nib.load(root/f'{BONE_CASE}.nii.gz'))
 assert ct.shape==img.shape and np.allclose(ct.affine,img.affine,atol=1e-4)
 labels=np.asarray(img.dataobj,dtype=np.uint8)
 assert set(np.unique(labels))==set(range(64))
 assert all(not np.any(labels.take([0,-1],axis=d)) for d in range(3))
 label_names=json.loads((root/'dataset.json').read_text())['labels']
 source={'url':'https://huggingface.co/datasets/BoneHub/vsd-lower-extremities-seg','attribution':'BoneHub · Alavi & Asseln (2026), baseado em Fischer (2023)','license':'CC BY-NC-SA 4.0 · uso não comercial'}
 recipes={
  'pelvis':(list(range(1,6)),[1,2,3],2.,55,0,2,'Sacro e ossos do quadril completos; fêmures limitados à porção proximal neste módulo.'),
  'legs':(list(range(4,12)),list(range(4,12)),2.,0,0,8,'Ossos longos e patelas completos. Tecidos moles aparecem na TC e não são estruturas selecionáveis.'),
  'feet':(list(range(8,64)),list(range(12,64)),1.25,0,45,14,'52 ossos dos pés e porções distais das duas tíbias e fíbulas. As extremidades superiores desses quatro segmentos são recortes regionais.'),
 }
 for region in requested:
  ids,primary,spacing,lower,upper,default,note=recipes[region]
  target,lab,lo,hi=cropped_grid(ct,labels,ids,primary,spacing,lower,upper)
  items=[bone_info(n,id,region) for n,id in label_names.items() if id in ids]
  write_region(region,target,lab,items,source,'BoneHub 002 / VSD 006',note+' Mesmo exame nos três módulos inferiores. Dados derivados sob CC BY-NC-SA 4.0.',default,'bone',ct.affine,[lo.tolist(),hi.tolist()])

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('regions',nargs='*',default=['head-neck','pelvis','legs','feet']);a=p.parse_args()
 if 'head-neck' in a.regions:build_head()
 bones=[r for r in a.regions if r in ['pelvis','legs','feet']]
 if bones:build_bones(bones)
