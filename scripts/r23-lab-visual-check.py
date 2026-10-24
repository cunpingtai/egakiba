"""Visual verification for R23 CSS and actual static HTML generator. No WebGL claims."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
folder=Path(__file__).resolve().parent.parent/'assets'
cases=[('zh','ready',1440,960,'r23-lab-desktop-1440.png'),('zh','ready',390,844,'r23-lab-mobile-390.png'),('zh','ready',320,700,'r23-lab-mobile-320.png'),('ja','waiting',800,900,'r23-lab-tablet-loading-800.png'),('en','unsupported',390,844,'r23-lab-unsupported-390.png')]
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for lang,mode,w,h,name in cases:
  pg=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  pg.set_content((folder/f'r23-lab-{lang}-{mode}-fixture.html').read_text(),wait_until='load')
  pg.screenshot(path=str(folder/name),full_page=True)
  data=pg.evaluate('''() => ({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),lab:!!document.querySelector('.r23-lab'),sideCount:document.querySelectorAll('.r23-side').length,metrics:document.querySelectorAll('.r23-metric').length, battleDisabled:document.querySelector('[data-r23-battle]').disabled,controls:[...document.querySelectorAll('.r23-side input,.r23-side select,[data-r23-battle]')].map(x=>({id:x.id||x.dataset.r23Battle||'battle',inBounds:x.getBoundingClientRect().right<=innerWidth+1&&x.getBoundingClientRect().left>=-1}))})''')
  data.update(viewport=f'{w}x{h}',screenshot=name,mode=mode);results.append(data)
  pg.close()
 browser.close()
(folder.parent/'docs'/'R23_LAB_VISUAL_RESULTS.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
if any(x['overflow']!=0 or not x['lab'] or x['sideCount']!=2 or x['metrics']!=4 or any(not c['inBounds'] for c in x['controls']) or x['battleDisabled']!=(x['mode']!='ready') for x in results):raise SystemExit('R23 visual fixture failure')
