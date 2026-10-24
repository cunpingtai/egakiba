"""Actual HTTP ES-module smoke test (separate from GPU/Safari validation)."""
import asyncio,subprocess,time,socket
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main():
 with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 server=subprocess.Popen(['python3','-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  await asyncio.sleep(.5)
  async with async_playwright() as pw:
   browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader'])
   for width,height in [(320,740),(390,844),(768,1024),(1440,900)]:
    page=await browser.new_page(viewport={'width':width,'height':height})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto(f'http://127.0.0.1:{port}/',wait_until='domcontentloaded',timeout=12000)
    await page.locator('#primary-play').click(timeout=8000)
    await page.locator('[data-continue="glyph"]').click()
    await page.locator('#glyph-input').fill('田')
    await page.locator('[data-continue="prepare"]').click()
    await page.locator('[data-launch]').click()
    await page.locator('#r3-precise').click()
    await page.locator('#r3-fire').click()
    await page.wait_for_timeout(450)
    assert await page.locator('#r3-clock').inner_text()!='00.0'
    assert await page.locator('.r3-local-indicator').inner_text()=='LOCAL · R7'
    assert 'DEVICE FONT / NOT RANKED' in await page.locator('.r3-disclaimer').inner_text()
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Overflow {width}'
    assert not errors,(width,errors)
    await page.screenshot(path=str(ROOT/'assets'/f'r7-http-{width}.png'))
    await page.close();print(f'R7 HTTP BROWSER PASS {width}px')
   await browser.close()
 finally:server.terminate();server.wait(timeout=3)
if __name__=='__main__':asyncio.run(main())
