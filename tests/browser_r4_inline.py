"""Restricted-environment inline Chromium smoke. Does not validate GPU or ES module over HTTP."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
def src(p):return (ROOT/p).read_text(encoding='utf8')
def plain(s):
 s=re.sub(r'^import .*?;\s*','',s,flags=re.M)
 return re.sub(r'\bexport (class|const|function|let)\b',r'\1',s)
def factory(path,names,dependencies=''):
 return '(()=>{'+dependencies+'\n'+plain(src(path))+'\nreturn {'+','.join(names)+'};})()'
def html():
 h=src('r9-index.html')
 for p in ['styles.css','flow.css','r3-battle.css']:
  h=h.replace(f'<link rel="stylesheet" href="./{p}" />','<style>'+src(p)+'</style>')
 h=h.replace('<script src="./app.js"></script>','<script>'+src('app.js')+'</script>')
 stats=factory('engine/glyph-stats.mjs',['measureBinaryMask','statsFromFeatures','FONT_CSS'])
 geom=factory('engine/glyph-geometry.mjs',['rasterGlyphGeometry','geometryFromMask','containsWorld','silhouetteContact','GEOMETRY_VERSION','assertGeometry'],f'const {{measureBinaryMask,statsFromFeatures,FONT_CSS}}={stats};')
 save=factory('engine/r4-local-save.mjs',['loadSave','commitBattle'])
 stages=factory('engine/level-catalog.mjs',['LEVEL_CATALOG','isPlayable'])
 sim=factory('engine/arena-sim.mjs',['SIM_HZ','enemyAction','normalizeAction','MAX_TICKS','FIELD_RADIUS'])
 shape=factory('engine/shape-sim.mjs',['ShapeSimulation','SHAPE_SIM_VERSION','SHAPE_RULE_VERSION'],f'const {{SIM_HZ,enemyAction,normalizeAction,MAX_TICKS,FIELD_RADIUS}}={sim};const {{assertGeometry,silhouetteContact,GEOMETRY_VERSION}}={geom};')
 preview=plain(src('preview3d.js'))
 flow=plain(src('r2-flow.js'))
 battle=plain(src('r4-battle.mjs'))
 flowbody='(()=>{const {rasterGlyphGeometry}='+geom+';const {isPlayable}='+stages+';const {loadSave}='+save+';'+preview+'\n'+flow+'})();'
 battlebody='(()=>{const {rasterGlyphGeometry}='+geom+';const {ShapeSimulation,SHAPE_SIM_VERSION:SIM_VERSION,SHAPE_RULE_VERSION:RULE_VERSION}='+shape+';const {SIM_HZ,enemyAction}='+sim+';const {loadSave,commitBattle}='+save+';const {LEVEL_CATALOG}='+stages+';'+battle+'})();'
 h=h.replace('<script type="module" src="./r2-flow.js"></script>','<script>'+flowbody+'</script>')
 h=h.replace('<script type="module" src="./r4-battle.mjs"></script>','<script>'+battlebody+'</script>')
 return h
async def main():
 page_html=html()
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
  for width,height in [(320,720),(390,844),(768,1024),(1440,900)]:
   page=await browser.new_page(viewport={'width':width,'height':height})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content(page_html,wait_until='load')
   await page.locator('#primary-play').click()
   await page.locator('[data-continue="glyph"]').click()
   await page.locator('#glyph-input').fill('田')
   await page.locator('[data-continue="prepare"]').click()
   await page.locator('[data-launch]').click()
   assert await page.locator('#battle-root').is_visible(),'battle not started'
   assert await page.locator('.r3-local-indicator').inner_text()=='LOCAL · R4'
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'overflow width={width}'
   await page.locator('#r3-precise').click()
   await page.locator('#r3-fire').click()
   await page.wait_for_timeout(600)
   assert await page.locator('#r3-clock').inner_text()!='00.0','battle clock did not advance'
   assert not errors,(width,errors)
   if width in (390,1440):await page.screenshot(path=str(ROOT/'assets'/f'r4-arena-{width}.png'))
   await page.locator('#r3-exit').click()
   await page.close()
   print(f'R4 BROWSER PASS {width}px: HOME→STAGE→GLYPH→PREPARE→SHAPE BATTLE; canvas/timer rendered; no JS errors or horizontal overflow')
  await browser.close()
if __name__=='__main__':asyncio.run(main())
