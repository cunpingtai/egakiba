from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    for label,language,width,height in [('desktop','ja',1440,900),('tablet','en',800,900),('mobile','ko',390,844),('narrow','zh',320,690)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content((root/'assets'/f'r17-prepare-fixture-{language}.html').read_text(),wait_until='domcontentloaded',timeout=30000)
        page.wait_for_timeout(100)
        over=page.evaluate('Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth')
        disabled=page.locator('[data-launch]').is_disabled()
        fighters=page.locator('.r17-fighter').count()
        stats=page.locator('.r17-statline span').count()
        if label=='narrow':
            page.locator('#r8-opponent-input').fill('文剣')
        dest=root/'assets'/f'r17-prepare-{label}-layout-fixture.png'
        page.screenshot(path=str(dest),full_page=True)
        result={'viewport':[width,height],'language':language,'horizontalOverflowPx':over,'fighters':fighters,'nativeStatSlots':stats,'startDisabledUntilValidation':disabled,'errors':errors,'screenshot':dest.name,'kind':'UI-only (no WebGL or licensed font resources)'}
        results.append(result)
        print(result)
        page.close()
    browser.close()
(root/'docs'/'R17_PREPARE_VISUAL_RESULTS.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
assert all(x['horizontalOverflowPx']<=1 and x['fighters']==2 and x['nativeStatSlots']==8 and x['startDisabledUntilValidation'] and not x['errors'] for x in results), results
