"""R7 offline inline Chromium smoke.  Not HTTP ES-module, GPU WebGL or Safari validation."""
import asyncio,re,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
def src(p):return (ROOT/p).read_text(encoding='utf8')
def plain(s):
 s=re.sub(r'^import .*?;\s*','',s,flags=re.M)
 s=s.replace('export async function','async function')
 return re.sub(r'\bexport (class|const|function|let)\b',r'\1',s)
def factory(path,names,deps=''):
 return '(()=>{'+deps+'\n'+plain(src(path))+'\nreturn {'+','.join(names)+'};})()'
def html():
 h=src('r9-index.html')
 for f in ['styles.css','flow.css','r3-battle.css']:
  h=h.replace(f'<link rel="stylesheet" href="./{f}" />','<style>'+src(f)+'</style>')
 h=h.replace('<script src="./app.js"></script>','<script>'+src('app.js')+'</script>')
 st=factory('engine/glyph-stats.mjs',['measureBinaryMask','statsFromFeatures','FONT_CSS'])
 ge=factory('engine/glyph-geometry.mjs',['rasterGlyphGeometry','geometryFromMask','containsWorld','worldOutlinePoint','GEOMETRY_VERSION','assertGeometry'],f'const {{measureBinaryMask,statsFromFeatures,FONT_CSS}}={st};')
 lvl=factory('engine/level-catalog.mjs',['LEVEL_CATALOG','LEVEL_ORDER','isPlayable','isUnlocked','evaluateLevelResult'])
 base=factory('engine/arena-sim.mjs',['SIM_HZ','MAX_TICKS','FIELD_RADIUS','normalizeAction','enemyAction'])
 mf=factory('engine/shape-contact-v5.mjs',['contactManifold','outwardNormal'],f'const {{containsWorld,worldOutlinePoint,assertGeometry}}={ge};')
 sim=factory('engine/shape-sim-v5.mjs',['ShapeSimulationV5','SHAPE_SIM_VERSION','SHAPE_RULE_VERSION'],f'const {{assertGeometry,GEOMETRY_VERSION}}={ge};const {{contactManifold}}={mf};const {{SIM_HZ,MAX_TICKS,FIELD_RADIUS,normalizeAction,enemyAction}}={base};')
 snap=factory('engine/glyph-snapshot-v6.mjs',['packGlyphSnapshot','unpackGlyphSnapshot'],f'const {{geometryFromMask,assertGeometry,GEOMETRY_VERSION}}={ge};')
 rep=factory('engine/replay-v6.mjs',['recordBattleReplay','verifyBattleReplay','summarizeBattleEvents'],f'const {{packGlyphSnapshot,unpackGlyphSnapshot}}={snap};const {{ShapeSimulationV5,SHAPE_SIM_VERSION,SHAPE_RULE_VERSION}}={sim};const {{GEOMETRY_VERSION}}={ge};const {{normalizeAction}}={base};')
 save=factory('engine/r5-local-save.mjs',['loadSave','commitBattle','emptySave'],f'const {{LEVEL_CATALOG,isPlayable,isUnlocked,evaluateLevelResult}}={lvl};const {{SHAPE_SIM_VERSION,SHAPE_RULE_VERSION}}={sim};')
 source=factory('engine/glyph-source-v7.mjs',['getGlyphGeometry','glyphAssetStatus','installGlyphPack','loadConfiguredGlyphPack','removeGlyphPack'],
                'const {rasterGlyphGeometry}='+ge+';'+
                'const {validateCanonicalGlyphPack,findPackedGlyph}='+factory('engine/canonical-glyph-v7.mjs',['validateCanonicalGlyphPack','findPackedGlyph'],
                'const {geometryFromMask}='+ge+';const {packGlyphSnapshot,unpackGlyphSnapshot}='+snap+';')+';')
 flow='(()=>{const {getGlyphGeometry,loadConfiguredGlyphPack,glyphAssetStatus}='+source+';const {LEVEL_CATALOG,LEVEL_ORDER,isPlayable,isUnlocked}='+lvl+';const {loadSave}='+save+';'+plain(src('preview3d.js'))+'\n'+plain(src('r2-flow.js'))+'})();'
 battle='(()=>{const {getGlyphGeometry,glyphAssetStatus}='+source+';const {ShapeSimulationV5,SHAPE_SIM_VERSION:SIM_VERSION,SHAPE_RULE_VERSION:RULE_VERSION}='+sim+';const {SIM_HZ,enemyAction}='+base+';const {loadSave,commitBattle}='+save+';const {LEVEL_CATALOG,isUnlocked}='+lvl+';const {recordBattleReplay,verifyBattleReplay,summarizeBattleEvents}='+rep+';'+plain(src('r5-battle.mjs'))+'\nwindow.__r5battle=battle;})();'
 h=h.replace('<script type="module" src="./r2-flow.js"></script>','<script>'+flow+'</script>')
 h=h.replace('<script type="module" src="./r5-battle.mjs"></script>','<script>'+battle+'</script>')
 return h

async def main():
 content=html()
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
  for width,height in [(320,740),(390,844),(768,1024),(1440,900)]:
   page=await browser.new_page(viewport={'width':width,'height':height})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content(content,wait_until='load')
   await page.locator('#primary-play').click()
   assert await page.locator('.flow-status').inner_text()=='R5 · CHAPTER 1 PLAYABLE'
   await page.locator('[data-level="01-02"]').click()
   assert 'LOCKED' in await page.locator('.stage-detail').inner_text()
   await page.locator('[data-continue="glyph"]').click()
   await page.locator('#glyph-input').fill('田')
   await page.locator('[data-continue="prepare"]').click()
   assert await page.locator('[data-launch]').count()==0,'locked level should not offer launch'
   await page.locator('[data-continue="stages"]').click()
   await page.locator('[data-level="01-01"]').click()
   await page.locator('[data-continue="glyph"]').click()
   await page.locator('[data-continue="prepare"]').click()
   await page.locator('[data-launch]').click()
   assert await page.locator('#battle-root').is_visible()
   assert await page.locator('.r3-local-indicator').inner_text()=='LOCAL · R7'
   await page.locator('#r3-precise').click()
   await page.locator('#r3-fire').click()
   await page.wait_for_timeout(360)
   assert await page.locator('#r3-clock').inner_text()!='00.0'
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow at {width}'
   assert 'DEVICE FONT / NOT RANKED' in await page.locator('.r3-disclaimer').inner_text()
   assert not errors,(width,errors)
   if width in (390,1440):await page.screenshot(path=str(ROOT/'assets'/f'r7-arena-{width}.png'))
   await page.locator('#r3-exit').click()
   await page.close()
   print(f'R7 BROWSER PASS {width}px: locked 01-02 blocked, 01-01 launches, timer ticks; no errors/overflow')
  # In a fresh page use deterministic mock guest save to test multiple stage wiring.
  page=await browser.new_page(viewport={'width':390,'height':844})
  await page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});const save={schema:1,revision:5,progress:{'01-01':{stars:2,bestSeconds:10},'01-02':{stars:2,bestSeconds:15},'01-03':{stars:1,bestSeconds:20}},battleCount:5,lastGlyph:'文',lastFont:'gothic',updatedAt:null};localStorage.setItem('moji-blade.v3.r5.local-save.v1',JSON.stringify(save));}""")
  await page.set_content(content,wait_until='load')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.locator('#primary-play').click()
  for stage,glyph in [('01-02','力'),('01-03','山'),('01-04','剣')]:
   await page.locator(f'[data-level="{stage}"]').click()
   assert glyph in await page.locator('.stage-rival').inner_text()
   await page.locator('[data-continue="glyph"]').click()
   await page.locator('[data-continue="prepare"]').click()
   assert await page.locator('[data-launch]').count()==1,stage
   await page.locator('[data-launch]').click()
   assert await page.locator('.r3-red-text').inner_text()==glyph
   assert await page.evaluate('window.__r5battle.level.id')==stage
   await page.locator('#r3-exit').click()
   await page.locator('[data-continue="stages"]').click()
  assert not errors,errors
  await page.screenshot(path=str(ROOT/'assets'/'r7-stage-unlocked-390.png'))
  await page.close();await browser.close()
  print('R7 BROWSER PASS sequential stage 01-02/03/04 enemy setup and launch wiring with test fixture save')
if __name__=='__main__':asyncio.run(main())
