#!/usr/bin/env python3
"""Extract *locally* owned original font files from source.zip. Font binaries are not distributed."""
import argparse,zipfile,pathlib,hashlib
p=argparse.ArgumentParser();p.add_argument('--source-zip',required=True);p.add_argument('--target',default=str(pathlib.Path(__file__).resolve().parent.parent/'legacy-v2/fonts'));a=p.parse_args()
zip_path=pathlib.Path(a.source_zip).resolve();dest=pathlib.Path(a.target).resolve();dest.mkdir(parents=True,exist_ok=True)
files=['mplus1-medium.ttf','NotoSerifJP-Regular.ttf','RoundedMplus1c-ExtraBold.ttf','KouzanGyousho.ttf']
with zipfile.ZipFile(zip_path) as z:
 for name in files:
  source='source/fonts/'+name
  if source not in z.namelist():
   print('MISSING IN SOURCE:',name);continue
  if pathlib.Path(source).name!=name:raise ValueError('Invalid font path')
  out=dest/name
  if out.exists():print('ALREADY PRESENT:',name);continue
  with z.open(source) as fi,out.open('xb') as fo:
   for block in iter(lambda:fi.read(65536),b''):fo.write(block)
  print('INSTALLED LOCALLY:',name,'sha256',hashlib.sha256(out.read_bytes()).hexdigest())
print('Local fonts installed; do not repackage these font files into a release ZIP.')
