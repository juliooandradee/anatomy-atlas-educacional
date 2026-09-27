"""Rank real subjects; report all exclusions and boundary-touching structures."""
import json
import sys
import zipfile
import nibabel as nib
import numpy as np
from common import ROOT, RAW, REQUIRED

records = []
for subject in sorted(RAW.glob('s*')):
    if not subject.is_dir():
        continue
    record = {'subject': subject.name, 'volume_mm3': 0.0, 'touches_si': [], 'missing': [], 'invalid_grid': []}
    reference = None
    for name in REQUIRED:
        file = subject / 'segmentations' / f'{name}.nii.gz'
        if not file.exists():
            record['missing'].append(name)
            continue
        image = nib.as_closest_canonical(nib.load(file))
        if reference is None:
            reference = image
        if image.shape != reference.shape or not np.allclose(image.affine, reference.affine, atol=1e-4):
            record['invalid_grid'].append(name)
            continue
        mask = np.asarray(image.dataobj) > 0
        if not mask.any():
            record['missing'].append(name)
            continue
        record['volume_mm3'] += float(mask.sum() * abs(np.linalg.det(image.affine[:3, :3])))
        if mask[:, :, 0].any() or mask[:, :, -1].any():
            record['touches_si'].append(name)
    records.append(record)
    print(f"{record['subject']}: {record['volume_mm3']/1000:.0f} mL, boundary={record['touches_si']}", flush=True)

strict = [r for r in records if not r['missing'] and not r['touches_si'] and not r['invalid_grid']]
if not strict:
    (ROOT/'work/selection.json').write_text(json.dumps({'candidates': records, 'selected': None}, indent=2))
    raise SystemExit('No subject passes the seven-mask complete-coverage criterion. Inspect work/selection.json.')
selected = max(strict, key=lambda r: r['volume_mm3'])
report = {'criterion': 'Seven non-empty masks, none touching superior/inferior scan boundaries; maximum total physical volume.', 'selected': selected, 'qualifying_count': len(strict), 'candidates': records}
(ROOT/'work/selection.json').write_text(json.dumps(report, indent=2))
if '--select-only' in sys.argv:
    print('SELECTED', selected, flush=True)
    raise SystemExit(0)
with zipfile.ZipFile(ROOT/'data/small.zip') as z:
    prefix = selected['subject'] + '/'
    for name in z.namelist():
        if name == prefix+'ct.nii.gz' or name.startswith(prefix+'segmentations/vertebrae_'):
            target = RAW / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(z.read(name))
print('SELECTED', selected, flush=True)
