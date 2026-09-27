"""Resume the official mirror in bounded ranges; full MD5 checked afterwards."""
import concurrent.futures
import json
import threading
import time
import urllib.request
from common import ROOT

URL = 'https://www.dropbox.com/scl/fi/pee5yxebfxrhz007cbuy5/Totalsegmentator_dataset_small_v201.zip?rlkey=osvfk02jc4lw5gr6uhrldtb9e&dl=1'
SIZE = 3244617817
file = ROOT/'data/small.zip'
manifest = ROOT/'work/download.json'
lock = threading.Lock()
(ROOT/'work').mkdir(parents=True,exist_ok=True)
(ROOT/'data').mkdir(parents=True,exist_ok=True)
if manifest.exists():
    state = json.loads(manifest.read_text())
else:
    prefix = file.stat().st_size if file.exists() else 0
    state = {'prefix': prefix, 'completed': [], 'chunks': [[s,min(s+4*1024*1024,SIZE)-1] for s in range(prefix,SIZE,4*1024*1024)]}
    manifest.write_text(json.dumps(state))
    with file.open('ab') as f:
        f.truncate(SIZE)

def fetch(chunk):
    start,end=chunk
    if start in state['completed']:
        return
    for attempt in range(4):
        try:
            request=urllib.request.Request(URL+f'&range_start={start}',headers={'Range':f'bytes={start}-{end}'})
            with urllib.request.urlopen(request,timeout=45) as response, file.open('r+b',buffering=0) as output:
                if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{SIZE}':
                    raise RuntimeError('Server did not honor requested range')
                output.seek(start)
                remaining=end-start+1
                while remaining:
                    data=response.read(min(1024*1024,remaining))
                    if not data: raise RuntimeError('Truncated response')
                    output.write(data)
                    remaining-=len(data)
            with lock:
                state['completed'].append(start)
                manifest.write_text(json.dumps(state))
                done=state['prefix']+sum(e-s+1 for s,e in state['chunks'] if s in state['completed'])
                print(f'Download {done/SIZE:.1%} ({done/1e6:.0f} MB)',flush=True)
            return
        except Exception as exc:
            if attempt==3: raise
            print(f'Retrying range {start}: {exc}',flush=True)
            time.sleep(2**attempt)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(fetch,state['chunks']))
print('Download complete. Run prepare_data.py to verify the full checksum.',flush=True)
