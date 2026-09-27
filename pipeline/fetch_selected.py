"""Fetch ZIP members by HTTP ranges. zipfile verifies each member CRC32."""
import concurrent.futures
import json
import hashlib
import zlib
import sys
import subprocess
import zipfile
from pathlib import Path
from common import ROOT, RAW, REQUIRED

URL='https://www.dropbox.com/scl/fi/pee5yxebfxrhz007cbuy5/Totalsegmentator_dataset_small_v201.zip?rlkey=osvfk02jc4lw5gr6uhrldtb9e&dl=1'
SIZE=3244617817
archive=ROOT/'work/archive-index.zip'
(ROOT/'work').mkdir(parents=True,exist_ok=True)
RAW.mkdir(parents=True,exist_ok=True)
if not archive.exists():
    tail=ROOT/'work/zip-tail.bin'
    subprocess.run(['curl','-Ls','--fail','--retry','3','--range',f'{SIZE-2097152}-{SIZE-1}',URL+'&range_start=index','-o',str(tail)],check=True)
    data=tail.read_bytes()
    if len(data)!=2097152: raise ValueError('Invalid ZIP index response size')
    with archive.open('wb') as f: f.truncate(SIZE); f.seek(SIZE-len(data)); f.write(data)
subject=json.loads((ROOT/'work/selection.json').read_text())['selected']['subject'] if '--subject' in sys.argv else None
with zipfile.ZipFile(archive) as z:
    groups={}
    for info in z.infolist():
        parts=Path(info.filename).parts
        if subject:
            match=parts[0]==subject and (info.filename.endswith('/ct.nii.gz') or '/segmentations/vertebrae_' in info.filename)
        else:
            match=len(parts)==3 and parts[2].removesuffix('.nii.gz') in REQUIRED
        if match: groups.setdefault(parts[0],[]).append(info)

def fetch(item):
    name,infos=item
    if all((RAW/i.filename).exists() and zlib.crc32((RAW/i.filename).read_bytes())==i.CRC for i in infos):
        print(f'{name}: {len(infos)} cached files CRC verified',flush=True)
        return
    # Keep CT and the masks separate to avoid downloading unrelated members.
    blocks=[[i] for i in infos if i.filename.endswith('/ct.nii.gz')]
    masks=[i for i in infos if not i.filename.endswith('/ct.nii.gz')]
    if masks: blocks.append(masks)
    for num,block in enumerate(blocks):
        start=min(i.header_offset for i in block)
        end=max(i.header_offset+30+len(i.filename.encode())+len(i.extra)+i.compress_size+64 for i in block)
        part=ROOT/f'work/range-{name}-{num}.bin'
        progress=ROOT/'work/download.json'
        prefix=json.loads(progress.read_text())['prefix'] if progress.exists() else 0
        if end < prefix and (ROOT/'data/small.zip').exists():
            with (ROOT/'data/small.zip').open('rb') as f: f.seek(start); data=f.read(end-start+1)
        else:
            subprocess.run(['curl','-Ls','--fail','--retry','3','--max-time','180','--range',f'{start}-{end}',URL+f'&range_start={start}','-o',str(part)],check=True)
            data=part.read_bytes()
        if len(data)!=end-start+1: raise ValueError(f'Range length mismatch: {name}')
        with archive.open('r+b',buffering=0) as f: f.seek(start); f.write(data)
        part.unlink(missing_ok=True)
    with zipfile.ZipFile(archive) as z:
        for info in infos:
            target=RAW/info.filename;target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(z.read(info.filename))
    print(f'{name}: {len(infos)} files CRC verified',flush=True)

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(fetch,groups.items()))
checks=[]
for infos in groups.values():
    for info in infos:
        raw=(RAW/info.filename).read_bytes()
        assert zlib.crc32(raw)==info.CRC
        checks.append({'file':info.filename,'zip_crc32':f'{info.CRC:08x}','crc32_matches':True,'sha256':hashlib.sha256(raw).hexdigest()})
(ROOT/f'work/integrity-{"subject" if subject else "masks"}.json').write_text(json.dumps({'source':'https://zenodo.org/records/10047263','method':'HTTP ranges from the official Dropbox mirror; CRC32 for every extracted ZIP member','full_archive_md5_verified':False,'files':checks},indent=2))
print('Selected ZIP members fetched and verified.',flush=True)
