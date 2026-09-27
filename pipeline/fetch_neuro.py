"""Download the pinned TemplateFlow files, validating their recorded SHA-256."""
from pathlib import Path
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'pipeline/neuro-source.json').read_text())
out=ROOT/'data/neuro/templateflow';out.mkdir(parents=True,exist_ok=True)
for item in source['files']:
 p=out/item['file']
 if not p.exists():
  with urllib.request.urlopen(item['url'],timeout=90) as r: data=r.read()
  assert hashlib.sha256(data).hexdigest()==item['sha256'],item['file']
  p.write_bytes(data)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],item['file']
 print('verified',item['file'])
