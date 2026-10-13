"""Verify and unpack a calculation subset into a fresh directory; no execution."""
import argparse
import gzip
import hashlib
import json
import os
import signal
from pathlib import Path

CHUNK=1024*1024
MAX_TOTAL=1536*1024*1024
MAX_MEMBER=256*1024*1024

def require(ok,message):
    if not ok:raise ValueError(message)

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for part in iter(lambda:f.read(CHUNK),b''):h.update(part)
    return h.hexdigest()

def relative(name):
    p=Path(name)
    require(not p.is_absolute() and '..' not in p.parts and p.parts and str(p)==name,'relative canonical member')
    return p

def copy_verified(source,target,entry):
    h=hashlib.sha256();count=0
    opener=gzip.open if entry['encoding']=='gzip' else open
    require(entry['encoding'] in ('gzip','identity'),'encoding')
    with opener(source,'rb') as f, target.open('xb') as out:
        for part in iter(lambda:f.read(CHUNK),b''):
            count+=len(part)
            require(count<=entry['bytes']<=MAX_MEMBER,'uncompressed member bound')
            h.update(part);out.write(part)
    require(count==entry['bytes'] and h.hexdigest()==entry['sha256'],'uncompressed member integrity')

def unpack(package,expected,output):
    manifest=package/'package-manifest.json'
    require(manifest.is_file() and not manifest.is_symlink() and manifest.resolve().parent==package.resolve(),'manifest alias')
    require(digest(manifest)==expected,'externally supplied package manifest hash')
    data=json.loads(manifest.read_text())
    require(data['schema']==1 and data['scope']=='calculation-subset-not-full-native-provenance','package scope')
    files=data['files'];require(isinstance(files,list) and files,'members')
    require(sum(x['bytes'] for x in files)<=MAX_TOTAL,'total bound')
    names=set();stored=set()
    for entry in files:
        name=relative(entry['path']);blob=relative(entry['storedPath'])
        require(str(name) not in names and str(blob) not in stored,'duplicate member')
        names.add(str(name));stored.add(str(blob))
        require(type(entry['bytes']) is int and 0<=entry['bytes']<=MAX_MEMBER,'member bound')
        require(type(entry['storedBytes']) is int and 0<=entry['storedBytes']<=MAX_MEMBER+1024*1024,'stored member bound')
        source=package/blob
        require(source.resolve().relative_to(package.resolve())==blob and source.is_file() and not source.is_symlink(),'stored alias')
        require(source.stat().st_size==entry['storedBytes'] and digest(source)==entry['storedSha256'],'stored member integrity')
    require(not output.exists() and not output.is_symlink(),'fresh destination')
    require(output.parent.resolve(strict=True)==output.parent,'canonical output parent')
    output.mkdir(mode=0o700)
    for entry in files:
        target=output/entry['path'];target.parent.mkdir(parents=True,exist_ok=True)
        copy_verified(package/entry['storedPath'],target,entry)
    return {'status':'PASS_EXACT_CALCULATION_PACKAGE_UNPACK','files':len(files),'packageManifestSha256':expected,'catalogManifestSha256':data['catalogManifestSha256'],'nativeExecuted':False,'publicReparsePerformed':False}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--package',type=Path,required=True);p.add_argument('--manifest-sha256',required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    os.setpriority(os.PRIO_PROCESS,0,15);require(os.getpriority(os.PRIO_PROCESS,0)==15,'nice15')
    def stop(signum,frame):raise TimeoutError('unpack deadline/interruption')
    for sig in (signal.SIGALRM,signal.SIGINT,signal.SIGTERM,signal.SIGHUP):signal.signal(sig,stop)
    signal.alarm(900)
    print(json.dumps(unpack(a.package.resolve(strict=True),a.manifest_sha256,a.output.absolute()),indent=2))

if __name__=='__main__':main()
