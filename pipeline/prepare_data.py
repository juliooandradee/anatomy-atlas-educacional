"""Verify the official archive, extracting only the masks needed for selection."""
import hashlib
import json
import zipfile
from pathlib import PurePosixPath
from common import ROOT, RAW, REQUIRED

archive = ROOT / 'data/small.zip'
with archive.open('rb') as f:
    digest = hashlib.file_digest(f, 'md5').hexdigest()
if digest != '6b5524af4b15e6ba06ef2d700c0c73e0':
    raise SystemExit(f'Checksum inválido: {digest}')
count = 0
with zipfile.ZipFile(archive) as z:
    for name in z.namelist():
        parts = PurePosixPath(name).parts
        if '..' in parts or name.startswith('/'):
            raise ValueError('Unsafe archive path')
        if len(parts) == 3 and parts[1] == 'segmentations' and parts[2].removesuffix('.nii.gz') in REQUIRED:
            target = RAW / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(z.read(name))
            count += 1
    if 'meta.csv' in z.namelist():
        (RAW / 'meta.csv').write_bytes(z.read('meta.csv'))
(ROOT / 'work/archive-check.json').write_text(json.dumps({'md5': digest, 'masks_extracted': count}, indent=2))
print(f'Archive verified; {count} masks extracted.', flush=True)
