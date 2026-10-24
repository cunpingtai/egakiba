#!/usr/bin/env python3
"""Reproducible R18 cumulative source archive retaining .git and old files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import os,sys
root=Path(__file__).resolve().parent.parent
out=Path('/mnt/data/MOJI_BLADE_R18_PAGE005_BATTLE_CUMULATIVE_2026-10-24.zip')
manifest=root/'R18_MANIFEST_SHA256.txt'
def files():
    for p in sorted(root.rglob('*')):
        if not p.is_file():continue
        rel=p.relative_to(root)
        if any(x in {'__pycache__','.pytest_cache','.DS_Store'} for x in rel.parts) or p.suffix=='.pyc':continue
        if p==manifest:continue
        if rel.as_posix()=='.git/index.lock':continue
        yield p,rel
entries=list(files())
manifest.write_text('R18 source file hashes — SHA-256 (excluding .git and this manifest)\n'+''.join(f'{sha256(p.read_bytes()).hexdigest()}  {rel.as_posix()}\n' for p,rel in entries if '.git' not in rel.parts))
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
    for p,rel in entries:z.write(p,str(rel))
    z.write(manifest,manifest.name)
with ZipFile(out) as z:
    bad=z.testzip()
    assert bad is None, f'Corrupted ZIP entry: {bad}'
    assert '.git/HEAD' in z.namelist() and 'r18-battle.css' in z.namelist() and 'R17_MANIFEST_SHA256.txt' in z.namelist()
    count=len(z.namelist())
sumfile=out.with_suffix(out.suffix+'.sha256')
sumfile.write_text(f'{sha256(out.read_bytes()).hexdigest()}  {out.name}\n')
print(f'{out}: {out.stat().st_size:,} bytes, {count} files, sha256={sha256(out.read_bytes()).hexdigest()}')
