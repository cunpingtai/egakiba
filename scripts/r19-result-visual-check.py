import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent / 'assets'
cases=[('r19-result-story-zh-win-fixture.html',1440,900,'r19-result-desktop-1440.png'),('r19-result-story-zh-win-fixture.html',390,844,'r19-result-mobile-390.png'),('r19-result-story-zh-win-fixture.html',320,700,'r19-result-narrow-320.png'),('r19-result-story-en-win-fixture.html',800,900,'r19-result-tablet-800.png'),('r19-result-story-ja-loss-fixture.html',390,844,'r19-result-loss-mobile-390.png'),('r19-result-classic-en-fixture.html',390,844,'r19-result-classic-mobile-390.png')]
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for file,w,h,image in cases:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content((root/file).read_text(),wait_until='load')
  page.wait_for_timeout(850)
  d=page.evaluate('''() => {const r=document.querySelector('.r19-report'),panel=document.querySelector('.r8-result');const buttons=[...document.querySelectorAll('.r9-result-actions button')];return {report:!!r,reportText:r?.innerText?.slice(0,130),overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),panelScrollHeight:panel?.scrollHeight,panelClientHeight:panel?.clientHeight,buttonsVisible:buttons.map(x=>{const b=x.getBoundingClientRect();return b.width>0&&b.height>0&&b.left>=0&&b.right<=innerWidth+2}),reportRect:r?{x:r.getBoundingClientRect().x,width:r.getBoundingClientRect().width}:null}}''')
  page.screenshot(path=str(root/image),full_page=True)
  d.update(file=file,viewport=f'{w}x{h}',screenshot=image);results.append(d)
  page.close()
 browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
(root.parent / 'docs' / 'R19_RESULT_VISUAL_RESULTS.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
if any(not x['report'] or x['overflow']>0 or not all(x['buttonsVisible']) for x in results): raise SystemExit(2)
