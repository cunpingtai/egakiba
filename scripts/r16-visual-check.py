from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for label,language,width,height in [('desktop','ja',1440,960),('tablet','en',800,920),('mobile','ja',390,844),('narrow','zh',320,690)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content((root/'assets'/f'r16-fixture-{language}.html').read_text(),wait_until='domcontentloaded',timeout=20000)
  page.wait_for_timeout(120)
  overflow=page.evaluate('Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth')
  loaded=page.locator('[data-continue="prepare"]').is_disabled()
  rows=page.locator('.r2-stat').count()
  page.locator('[data-font-next="mincho"]').click()
  selected=page.locator('[data-font-next="mincho"]').get_attribute('aria-pressed')
  path=root/'assets'/f'r16-glyph-{label}-layout-fixture.png'
  page.screenshot(path=str(path),full_page=True)
  result={'viewport':[width,height],'language':language,'overflowPx':overflow,'statRows':rows,'initiallyDisabled':loaded,'fontSwitch':selected,'errors':errors,'screenshot':path.name,'kind':'UI-only fixture (no original WebGL, no font archive)'}
  results.append(result);print(result)
  page.close()
 browser.close()
(root/'docs'/'R16_GLYPH_LAYOUT_FIXTURE_RESULTS.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
assert all(x['overflowPx']<=1 and x['statRows']==4 and x['initiallyDisabled'] and x['fontSwitch']=='true' and not x['errors'] for x in results)
