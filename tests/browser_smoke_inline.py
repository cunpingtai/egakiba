"""R25 local-browser regression for the production HTML entry.
Requires Playwright and a local Chromium executable. Starts a temporary HTTP server
so native ES-module imports work; font/WebGL checks fail closed when original font
assets are not present. This does not replace a production build or real-device test.
"""
import asyncio, os, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

async def main():
    handler=partial(QuietHandler, directory=str(ROOT))
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{server.server_port}/r9-index.html'
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
            for width,height in [(320,720),(390,844),(768,1024),(1024,768),(1440,900)]:
                page=await browser.new_page(viewport={'width':width,'height':height})
                errors=[]
                page.on('pageerror',lambda err:errors.append(str(err)))
                await page.goto(base,wait_until='networkidle',timeout=30000)
                await page.wait_for_timeout(250)
                assert await page.locator('.seo-content').count()==1
                assert await page.locator('.seo-faq details').count()==4
                assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'home overflow {width}'
                assert await page.locator('[data-panel="leaderboard"]').count()==0
                assert await page.locator('[data-panel="account"]').count()==0
                assert await page.locator('[data-panel="local"]').count()==0
                assert await page.locator('.mode-card--streak,.mode-card--scout').count()==0
                await page.locator('#choose-mode').click()
                await page.locator('[data-mode-next="story"]').click()
                assert await page.locator('.r15-tile').count()==4
                assert await page.locator('.r15-current-chapter').count()==1
                assert await page.locator('.r15-chapter-tab.is-planned').count()==0
                assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'stage overflow {width}'
                await page.locator('[data-stage-start="01-01"]').click()
                assert await page.locator('#glyph-input').count()==1
                # Missing original fonts must keep the continue button disabled, never show fake stats.
                await page.wait_for_timeout(150)
                assert await page.locator('[data-continue="prepare"]').is_disabled()
                assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'glyph overflow {width}'
                await page.locator('#flow-back').click()
                await page.locator('#flow-back').click()
                await page.locator('#flow-back').click()
                assert not await page.locator('#home-page').is_hidden()
                await page.locator('[data-panel="guide"]').click()
                assert '文字ブレード' in await page.locator('#panel-content').inner_text()
                await page.locator('#close-overlay').click()
                assert '文字ブレード' in await page.title()
                assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'home overflow {width}'
                assert not errors,(width,errors)
                print('PASS:',width,'px; home SEO, real modes, 4 playable stages, glyph validation, guide; JS errors 0')
                await page.close()
            await browser.close()
    finally:
        server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
