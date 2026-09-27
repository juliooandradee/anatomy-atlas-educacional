"""Download only the requested public source files, with integrity checks."""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import zipfile
import urllib.request
import zlib
from pathlib import Path
from common import ROOT, RAW

HEAD_NAMES = ['brain', 'skull', *[f'vertebrae_C{i}' for i in range(1,8)],
              'spinal_cord', 'thyroid_gland', 'trachea',
              'common_carotid_artery_left', 'common_carotid_artery_right']
MIRROR = 'https://www.dropbox.com/scl/fi/pee5yxebfxrhz007cbuy5/Totalsegmentator_dataset_small_v201.zip?rlkey=osvfk02jc4lw5gr6uhrldtb9e&dl=1'

def fetch_subject(subject, ct=False):
    archive = ROOT/'work/archive-index.zip'
    if not archive.exists():
        archive.parent.mkdir(exist_ok=True)
        size=3244617817;tail=ROOT/'work/zip-tail.bin'
        subprocess.run(['curl','-Ls','--fail','--retry','3','--range',f'{size-2097152}-{size-1}',MIRROR+'&range_start=index','-o',str(tail)],check=True)
        b=tail.read_bytes();assert len(b)==2097152
        with archive.open('wb') as f:f.truncate(size);f.seek(size-len(b));f.write(b)
    names = [f'{subject}/ct.nii.gz'] if ct else [f'{subject}/segmentations/{n}.nii.gz' for n in HEAD_NAMES]
    needed = []
    with zipfile.ZipFile(archive) as z:
        for name in names:
            p = RAW/name
            info = z.getinfo(name)
            if p.exists() and zlib.crc32(p.read_bytes()) == info.CRC: continue
            try:
                raw = z.read(name)
                p.parent.mkdir(parents=True, exist_ok=True);p.write_bytes(raw)
            except (zipfile.BadZipFile, zlib.error): needed.append(info)
    if needed:
        start = min(i.header_offset for i in needed)
        end = max(i.header_offset + 30 + len(i.filename.encode()) + len(i.extra) + i.compress_size + 64 for i in needed)
        part = ROOT/f'work/head-{subject}-{int(ct)}.part'
        subprocess.run(['curl', '-Ls', '--fail', '--retry', '3', '--max-time', '240',
                        '--range', f'{start}-{end}', MIRROR+f'&range_start={start}', '-o', str(part)], check=True)
        data = part.read_bytes()
        if len(data) != end-start+1: raise ValueError('ZIP range size mismatch')
        with archive.open('r+b', buffering=0) as f: f.seek(start); f.write(data)
        part.unlink()
        with zipfile.ZipFile(archive) as z:
            for info in needed:
                p = RAW/info.filename;p.parent.mkdir(parents=True, exist_ok=True);p.write_bytes(z.read(info.filename))
    checks = []
    with zipfile.ZipFile(archive) as z:
        for name in names:
            b = (RAW/name).read_bytes(); info = z.getinfo(name)
            assert zlib.crc32(b) == info.CRC
            checks.append({'file': name, 'crc32': f'{info.CRC:08x}', 'sha256': hashlib.sha256(b).hexdigest()})
    (ROOT/f'work/head-integrity-{subject}-{int(ct)}.json').write_text(json.dumps(checks, indent=2))
    print(subject, 'CT' if ct else '14 masks', 'CRC verified', flush=True)

def bonehub(case='002'):
    manifest=json.loads((ROOT/'pipeline/bonehub-source.json').read_text())
    if case!=manifest['case']:raise ValueError('Only the pinned, reviewed case is supported; update the source manifest for a new case.')
    dest=ROOT/'data/bonehub';dest.mkdir(parents=True,exist_ok=True)
    base=f"https://huggingface.co/datasets/{manifest['repository']}/resolve/{manifest['revision']}/"
    for file in ['README.md','lower_extremity_ct/dataset.json']:
        target=dest/Path(file).name
        if not target.exists():target.write_bytes(urllib.request.urlopen(base+file).read())
    checks=[]
    for info in manifest['files']:
        filename=Path(info['path']).name;target=dest/filename
        def valid():
            if not target.exists() or target.stat().st_size!=info['size']:return False
            with target.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()==info['sha256']
        if not valid():
            subprocess.run(['curl','-L','--fail','--retry','3','--max-time','1200',base+info['path']+'?download=true','-o',str(target)],check=True)
        assert valid(),f'Invalid file SHA-256: {filename}'
        checks.append({'file':filename,'sha256':info['sha256'],'bytes':info['size'],'sha256_matches':True,'revision':manifest['revision']})
        print(filename,'Hugging Face LFS SHA-256 verified',flush=True)
    (ROOT/f'work/bonehub-integrity-{case}.json').write_text(json.dumps(checks,indent=2))

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--bonehub', action='store_true');parser.add_argument('--case',default='002');parser.add_argument('--subjects', nargs='+');parser.add_argument('--ct', action='store_true');a=parser.parse_args()
    if a.bonehub: bonehub(a.case)
    if a.subjects:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda s: fetch_subject(s,a.ct), a.subjects))
