from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for name,width,height,state,lang in [('desktop',1440,900,'progress','ja'),('mobile',390,844,'progress','ja'),('narrow',320,690,'fresh','zh'),('tablet',800,900,'complete','en')]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content((root/f'assets/r15-fixture-{state}-{lang}.html').read_text(),wait_until='domcontentloaded',timeout=15000)
  page.wait_for_timeout(200)
  tilecount=page.locator('.r15-tile').count()
  board=page.locator('.r15-board').count()
  over=page.evaluate('Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)-window.innerWidth')
  # interaction scenario: select available stage and click start in renderer's fixture
  if state=='progress':
   page.locator('[data-level="01-01"]').click()
   selected=page.locator('.r15-tile.is-selected').get_attribute('data-level')
   page.locator('[data-stage-start]').click()
   launch=page.locator('body').get_attribute('data-launched')
  else:
   selected=page.locator('.r15-tile.is-selected').get_attribute('data-level')
   launch=None
  # can't activate disabled button
  locked=page.locator('.r15-tile:disabled').count()
  path=root/f'assets/r15-stage-{name}-layout-fixture.png'
  page.screenshot(path=str(path),full_page=True)
  result={'view':name,'viewport':[width,height],'tileCount':tilecount,'boardCount':board,'overflowPx':over,'selected':selected,'launchFixture':launch,'disabledStages':locked,'errors':errors,'screenshot':path.name}
  print(result)
  results.append(result)
  page.close()
 browser.close()
(root/'docs/R15_STAGE_LAYOUT_FIXTURE_RESULTS.json').write_text(json.dumps({'kind':'UI-only fixture; actual R15 renderer HTML and stylesheet but no full WebGL', 'results':results},ensure_ascii=False,indent=2))
assert all(r['tileCount']==4 and r['boardCount']==1 and r['overflowPx']<=1 and not r['errors'] for r in results), 'Layout/render test failed'
assert results[0]['launchFixture']=='01-01' and results[1]['launchFixture']=='01-01'
