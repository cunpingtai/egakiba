"""Chromium regression for R3 in restricted localhost environments.
Inlines separate JS modules as isolated factory closures; validates UI/events, NOT HTTP imports or GPU behavior.
"""
import asyncio,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
def source(rel):return (ROOT/rel).read_text(encoding='utf8')
def remove_exports(js):return re.sub(r'\bexport (class|const|function|interface|let)\b',r'\1',js)
def factory(path,exposed):return '(()=>{\n'+remove_exports(source(path))+'\nreturn {'+', '.join(exposed)+'};})()'
def inline():
 html=source('r9-index.html')
 for name in ['styles.css','flow.css','r3-battle.css']:
  html=html.replace(f'<link rel="stylesheet" href="./{name}" />', '<style>'+source(name)+'</style>')
 html=html.replace('<script src="./app.js"></script>', '<script>'+source('app.js')+'</script>')
 renderer=remove_exports(source('preview3d.js'))
 flow=re.sub(r"^import .*?;\s*",'',source('r2-flow.js'),flags=re.M)
 battle=re.sub(r"^import .*?;\s*",'',source('r3-battle.mjs'),flags=re.M)
 common_stats=factory('engine/glyph-stats.mjs',['rasterStats','GLYPH_STATS_VERSION'])
 common_levels=factory('engine/level-catalog.mjs',['LEVEL_CATALOG','isPlayable'])
 common_save=factory('engine/local-save.mjs',['loadSave','commitBattle','SAVE_KEY'])
 flow_js=f'''(()=>{{const {{rasterStats}}={common_stats};const {{isPlayable}}={common_levels};const {{loadSave}}={common_save};\n{renderer}\n{flow}\n}})();'''
 common_sim=factory('engine/arena-sim.mjs',['ArenaSimulation','SIM_HZ','SIM_VERSION','RULE_VERSION','enemyAction'])
 battle_js=f'''(()=>{{const {{rasterStats}}={common_stats};const {{ArenaSimulation,SIM_HZ,SIM_VERSION,RULE_VERSION,enemyAction}}={common_sim};const {{loadSave,commitBattle}}={common_save};const {{LEVEL_CATALOG}}={common_levels};\n{battle}\n}})();'''
 html=html.replace('<script type="module" src="./r2-flow.js"></script>','<script>'+flow_js+'</script>')
 html=html.replace('<script type="module" src="./r3-battle.mjs"></script>','<script>'+battle_js+'</script>')
 return html
async def main():
 html=inline()
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  for width,height in [(320,720),(390,844),(768,1024),(1440,900)]:
   page=await b.new_page(viewport={'width':width,'height':height})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content(html,wait_until='load')
   await page.locator('#primary-play').click()
   await page.locator('[data-level="01-01"]').click()
   await page.locator('[data-continue="glyph"]').click()
   await page.locator('#glyph-input').fill('文')
   await page.locator('[data-continue="prepare"]').click()
   await page.locator('[data-launch]').click()
   await page.wait_for_timeout(160)
   assert await page.locator('#battle-root').is_visible(),'did not start game'
   assert await page.locator('#r3-p-hptxt').inner_text()!='—','HP absent'
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'viewport overflow {width}'
   await page.locator('#r3-precise').click()
   await page.locator('#r3-angle').fill('0')
   await page.locator('#r3-fire').click()
   assert await page.locator('#r3-pause').is_visible(),'battle not running'
   # Use deterministic pure-simulation test for finish; here check HUD live advancement.
   await page.wait_for_timeout(250)
   tick=await page.locator('#r3-clock').inner_text()
   assert tick!='00.0',f'no timer advancement {width} {tick}'
   # A second run via RETURN; local progress only written on terminal result.
   await page.locator('#r3-exit').click()
   assert await page.locator('#battle-root').is_hidden()
   await page.locator('#flow-back').click()
   await page.locator('#flow-back').click()
   await page.locator('[data-chapter="2"]').click()
   await page.locator('[data-continue="glyph"]').click()
   await page.locator('[data-continue="prepare"]').click()
   assert await page.locator('[data-launch]').count()==0,'planned level should not show working launch button'
   assert not errors,(width,errors)
   print(f'PASS UI {width}px: HOME→STAGE→GLYPH→PREPARE→LIVE ARENA→AIM→FIRE→TIMER→EXIT; planned level gated; no page errors')
   if width in [390,1440]:
    await page.locator('#flow-back').click()
    await page.locator('#flow-back').click()
    await page.locator('[data-chapter="0"]').click()
    await page.locator('[data-level="01-01"]').click()
    await page.locator('[data-continue="glyph"]').click()
    await page.locator('[data-continue="prepare"]').click()
    await page.locator('[data-launch]').click()
    await page.screenshot(path=str(ROOT/'assets'/f'r3-arena-{width}.png'),full_page=False)
   await page.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
