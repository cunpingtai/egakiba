from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
cases=[('story','ready','ja','desktop',1440,900),('story','battle','zh','mobile',390,844),('story','battle','zh','narrow',320,680),('story','paused','en','paused',800,820),('classic','battle','en','classic',390,844)]
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for mode,phase,locale,label,width,height in cases:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errs=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  html=(root/'assets'/f'r18-{mode}-{phase}-{locale}-fixture.html').read_text()
  page.set_content(html,wait_until='domcontentloaded',timeout=30000)
  page.wait_for_timeout(90)
  data=page.evaluate('''() => {
   const w=innerWidth,h=innerHeight;
   const ids= ['r10-dash','r9-fire','r9-pause'];
   return {overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-w,
    controls:ids.map(id=>{const n=document.getElementById(id);if(!n)return null;const r=n.getBoundingClientRect();const ok= r.width>0&&r.height>0&&r.right<=w+1&&r.left>=-1&&r.bottom<=h+1&&r.top>=-1;return {id,visible:ok,rect:{x:r.x,y:r.y,w:r.width,h:r.height}};}),
    phase:document.querySelector('.r18-phase-chip,#r18-classic-phase')?.textContent||''}
  }''')
  image=root/'assets'/f'r18-battle-{label}-layout-fixture.png'
  page.screenshot(path=str(image),full_page=True)
  result={'mode':mode,'phase':phase,'viewport':[width,height],'overflowPx':data['overflow'],'controls':data['controls'],'phaseLabel':data['phase'],'errors':errs,'screenshot':image.name,'kind':'native-markup UI-only, no live Rapier/WebGL'}
  results.append(result)
  print(result)
  page.close()
 browser.close()
(root/'docs'/'R18_BATTLE_VISUAL_RESULTS.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
assert all(r['overflowPx']<=1 and not r['errors'] for r in results)
# Only visible controls are checked: paused overlay intentionally masks the controls.
for r in results:
 if r['mode']=='story' and r['phase']=='battle':
  for c in r['controls']:
   assert c is None or c['visible'] or (c['rect']['w']==0 and c['rect']['h']==0),r
