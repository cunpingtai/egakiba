import json
from pathlib import Path
from playwright.sync_api import sync_playwright
folder=Path(__file__).resolve().parent.parent/'assets'
cases=[('r20-profile-zh-all-fixture.html',1440,900,'r20-profile-desktop-1440.png'),('r20-profile-zh-all-fixture.html',390,844,'r20-profile-mobile-390.png'),('r20-profile-zh-all-fixture.html',320,700,'r20-profile-mobile-320.png'),('r20-profile-en-loss-fixture.html',800,900,'r20-profile-filtered-tablet-800.png'),('r20-profile-ja-empty-fixture.html',390,844,'r20-profile-empty-mobile-390.png')]
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for html,w,h,shot in cases:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content((folder/html).read_text(),wait_until='load')
  page.screenshot(path=str(folder/shot),full_page=True)
  check=page.evaluate('''() => ({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),profile:!!document.querySelector('.r20-profile'),filters:[...document.querySelectorAll('.r20-filters select')].map(x=>({width:x.getBoundingClientRect().width,visible:x.getBoundingClientRect().right<=innerWidth+2})),cards:document.querySelectorAll('.r20-metrics article').length,shownMatches:document.querySelectorAll('.r20-match').length})''')
  check.update(size=f'{w}x{h}',fixture=html,screenshot=shot)
  checks.append(check)
  page.close()
 browser.close()
print(json.dumps(checks,ensure_ascii=False,indent=2))
(folder.parent/'docs'/'R20_PROFILE_VISUAL_RESULTS.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
if any(not v['profile'] or v['cards']!=4 or v['overflow']>0 or any(not f['visible'] for f in v['filters']) for v in checks):raise SystemExit(2)
