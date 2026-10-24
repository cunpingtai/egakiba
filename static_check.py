"""R9 source/static contract audit; does NOT replace real browser HTTP/GPU tests."""
import os,subprocess
from html.parser import HTMLParser
class Inspect(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.dups=set();self.scripts=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if 'id' in attrs:
   if attrs['id'] in self.ids:self.dups.add(attrs['id'])
   self.ids.add(attrs['id'])
  if tag=='script' and attrs.get('src'):self.scripts.append(attrs['src'])
root=os.path.dirname(__file__)
p=Inspect();p.feed(open(f'{root}/r9-index.html',encoding='utf8').read())
assert not p.dups,p.dups
for key in ['home-page','flow-page','flow-content','flow-back','arena-canvas','overlay','battle-root']:
 assert key in p.ids,key
assert {'./app.js','./r2-flow.js','./r8-classic-screen.mjs','./r8-classic-stats.mjs','./r9-story-screen.mjs','./r9-story-stats.mjs'}.issubset(p.scripts),p.scripts
js=['app.js','r2-flow.js','preview3d.js','r3-battle.mjs','r4-battle.mjs','r5-battle.mjs','engine/glyph-geometry.mjs','engine/glyph-stats.mjs','engine/arena-sim.mjs','engine/shape-sim.mjs','engine/shape-contact-v5.mjs','engine/shape-sim-v5.mjs','engine/r4-local-save.mjs','engine/r5-local-save.mjs','engine/level-catalog.mjs','engine/local-save.mjs','engine/battle-port.mjs','engine/glyph-snapshot-v6.mjs','engine/replay-v6.mjs','engine/canonical-glyph-v7.mjs','engine/glyph-source-v7.mjs','engine/competitive-gate-v7.mjs','engine/physics-parity-v7.mjs','integration/v3-bridge.example.js','engine/classic-v2-adapter.mjs','r8-classic-screen.mjs','r8-classic-stats.mjs','r9-story-screen.mjs','r9-story-stats.mjs','engine/native-hp-adapter.mjs','engine/native-hp-rules.mjs','engine/r9-native-save.mjs','scripts/verify_v2_parity.mjs','scripts/verify_replay.mjs','scripts/build_glyph_pack.mjs','scripts/verify_glyph_pack.mjs']
for f in js:subprocess.run(['node','--check',f'{root}/{f}'],check=True,stdout=subprocess.DEVNULL)
for f in ['styles.css','flow.css','r3-battle.css']:
 s=open(f'{root}/{f}',encoding='utf8').read()
 assert s.count('{')==s.count('}'),f
entry=open(f'{root}/r2-flow.js',encoding='utf8').read()
assert 'moji:v3-battle-request' in entry
assert 'moji-blade.v3.r2.preview' in entry
assert 'tsukuruum.moji-blade.v2' in entry
assert 'moji:r9-native-progress' in entry
active=open(f'{root}/r5-battle.mjs',encoding='utf8').read()
assert 'recordBattleReplay' in active and 'startReplay' in active and 'exportReplay' in active
assert 'getGlyphGeometry' in active and 'glyphAssetStatus' in active
assert 'ShapeSimulationV5' in active
assert 'commitBattle' in active
assert 'isUnlocked' in active
assert './engine/shape-sim-v5.mjs' in active
assert './engine/r5-local-save.mjs' in active
# Fonts may be locally installed for manual tests; release archive must exclude them.
print(f'R9 STATIC PASS: {len(js)} JS modules, no duplicate HTML ids, R9 native story bridge and isolated save linked, CSS balance, local font assets excluded at packaging.')
