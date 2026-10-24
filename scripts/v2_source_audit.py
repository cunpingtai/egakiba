#!/usr/bin/env python3
"""Non-destructive intake audit for user's original V2 game project.
Usage: python scripts/v2_source_audit.py /path/to/original-v2 [--output /tmp/v2-audit.json]
Does not copy, upload, or modify font files. Writes only manifest/checksums.
"""
from pathlib import Path
import argparse,hashlib,json,re,sys
parser=argparse.ArgumentParser(description='Audit V2 source tree; no writes to input')
parser.add_argument('v2_root',type=Path)
parser.add_argument('--output',type=Path,default=Path('v2-source-audit.json'))
args=parser.parse_args()
root=args.v2_root.resolve()
if not root.is_dir():sys.exit(f'Not a directory: {root}')
expected=['physics.js','glyph.js','config.js','render.js','stages.js','fonts.js','app.js']
entries=[];imports={};seen=set()
for path in sorted(root.rglob('*')):
 if not path.is_file() or path.is_symlink():continue
 try:rel=str(path.relative_to(root))
 except ValueError:continue
 if len(rel.split('/'))>15 or path.stat().st_size>100*1024*1024:continue
 raw=path.read_bytes();kind='font-asset' if path.suffix.lower() in {'.woff','.woff2','.ttf','.otf'} else 'file'
 entries.append({'path':rel,'size':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'type':kind})
 if path.suffix.lower() in {'.js','.mjs','.ts'} and len(raw)<2_000_000:
  js=raw.decode('utf-8',errors='replace')
  imports[rel]=re.findall(r'(?:from\s*|import\s*\(|import\s*)[\'\"](\.[^\'\"]+)',js)
  seen.add(path.name)
result={'root':str(root),'required':{name:name in seen for name in expected},'files':entries,'relativeImports':imports,'notes':['Hashes for local asset comparison; SHA is not a license or provenance guarantee.','No font files are copied into this report.','Physical V2 equivalence still requires the original runtime and trace tests.']}
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'AUDIT: {len(entries)} files, {len(imports)} source modules; missing: {[k for k,v in result["required"].items() if not v]}')
print(f'Wrote {args.output.resolve()}')
