import asyncio,re,json
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parent.parent
s=(root/'r9-story-screen.mjs').read_text()
m=re.search(r'root\.innerHTML=`([\s\S]*?)`;\s*this\.\$=',s)
assert m,'no template'
fixture=m.group(1)
fixture=re.sub(r'\$\{[^{}]*\}','BATTLE',fixture)
css='\n'.join((root/f).read_text() for f in ['styles.css','flow.css','r3-battle.css','game-experience-r10.css'])
html='<html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>'+css+'</style></head><body><main id="battle-root">'+fixture+'</main></body></html>'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  reports=[]
  for width,height in [(320,568),(360,640),(390,844),(430,932),(800,390),(844,390),(768,1024),(1440,900)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2)
   await page.set_content(html,wait_until='domcontentloaded')
   await page.evaluate("document.querySelector('.r9-shell').dataset.phase='ready'")
   stats=await page.evaluate('''() => {let r=id=>{let e=document.querySelector(id);if(!e)return null;let b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,visible:getComputedStyle(e).display!=='none'}};return {viewport:{w:innerWidth,h:innerHeight},hud:r('.r9-hud'),control:r('.r9-controls'),mission:r('.r9-mission'),arena:r('.r9-stage'),settings:r('.r13-options'),dash:r('.r10-dash-button'),fire:r('.r10-launch-button'),spin:r('.r10-spin-button'),pause:r('.r10-pause-button'),scrollWidth:document.documentElement.scrollWidth}}''')
   if width in (320,390,800):
    (root/'assets'/f'r13-layout-{width}x{height}.png').parent.mkdir(exist_ok=True,parents=True)
    await page.screenshot(path=str(root/'assets'/f'r13-layout-{width}x{height}.png'))
   # Open settings in the HTML fixture to exercise CSS space.
   await page.locator('#r13-options summary').click()
   stats['settingsPanel']=await page.evaluate('''() => {let b=document.querySelector('.r13-options-panel').getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom}}''')
   reports.append(stats)
   await page.close()
  await browser.close()
  (root/'docs'/'R13_LAYOUT_MEASUREMENTS.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
  for r in reports:
   v=r['viewport']; c=r['control']; h=r['hud']; m=r['mission'];sp=r['settingsPanel']
   issues=[]
   if r['scrollWidth']>v['w']+2:issues.append('horizontal-overflow')
   if c['y']<h['bottom']:issues.append('HUD-controls-overlap')
   if c['bottom']>v['h']+3:issues.append('controls-beyond-bottom')
   if sp['x']<0 or sp['right']>v['w']+2:issues.append('settings-outside-width')
   print(v,'controls',tuple(round(c[k]) for k in ['x','y','w','h']), 'HUD end',round(h['bottom']),'settings',tuple(round(sp[k]) for k in ['x','right']),'issues',issues)
asyncio.run(main())
