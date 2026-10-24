"""R24 page-template visual regression. Mock values are for layout only, not attribute evidence."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
assets=root/'assets'
cases=[('zh','ready',1440,960,'r24-ranking-desktop-1440.png'),('zh','ready',390,844,'r24-ranking-mobile-390.png'),('zh','ready',320,700,'r24-ranking-mobile-320.png'),('ja','loading',800,900,'r24-ranking-tablet-loading-800.png'),('en','unavailable',390,844,'r24-ranking-unavailable-390.png')]
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for lang,mode,w,h,name in cases:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content((assets/f'r24-ranking-{lang}-{mode}-fixture.html').read_text(),wait_until='load')
  page.screenshot(path=str(assets/name),full_page=True)
  data=page.evaluate('''() => ({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),page:!!document.querySelector('.r24-ranking'),filters:document.querySelectorAll('.r24-control').length,rows:document.querySelectorAll('.r24-rank-row').length,unavailable:document.querySelector('.r24-state')?.textContent||'',actions:[...document.querySelectorAll('.r24-rank-actions button')].every(x=>x.getBoundingClientRect().left>=-1&&x.getBoundingClientRect().right<=innerWidth+1)})''')
  data.update(viewport=f'{w}x{h}',mode=mode,screenshot=name);results.append(data);page.close()
 browser.close()
(root/'docs'/'R24_RANKING_VISUAL_RESULTS.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
if any(x['overflow']!=0 or not x['page'] or x['filters']!=5 or (x['mode']=='ready' and x['rows']!=8) or (x['mode']!='ready' and x['rows']!=0) or not x['actions'] for x in results):raise SystemExit('R24 visual check failed')
