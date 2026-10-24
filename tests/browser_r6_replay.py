"""R6 inline Chromium UI regression. Does not validate HTTP ES modules or production V2 physics."""
import asyncio, subprocess, json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_r6_inline import html
ROOT=Path(__file__).resolve().parents[1]
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
  for width,height in [(320,740),(390,844),(1440,900)]:
   page=await browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))}});}""")
   await page.set_content(html(),wait_until='load')
   await page.locator('#primary-play').click();await page.locator('[data-continue="glyph"]').click()
   await page.locator('#glyph-input').fill('田');await page.locator('[data-continue="prepare"]').click()
   await page.locator('[data-launch]').click();await page.locator('#r3-precise').click();await page.locator('#r3-fire').click()
   result=await page.evaluate("""() => {const b=window.__r5battle;while(!b.sim.done){const ev=b.sim.step();if(b.sim.tick%2===0||b.sim.done)b.replayFrames.push(b.captureReplayFrame());if(ev.length)b.record(ev);}return {result:b.sim.result,frames:b.replayFrames.length};}""")
   assert result['frames']>1,result
   assert await page.locator('#r3-finish').is_visible()
   assert await page.locator('.r6-review').is_visible()
   assert await page.locator('#r6-watch').is_visible()
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if width in (390,1440):await page.screenshot(path=str(ROOT/'assets'/f'r6-result-{width}.png'))
   await page.locator('#r6-watch').click()
   assert await page.locator('#r6-replay-controls').is_visible()
   assert await page.locator('#r3-finish').is_hidden()
   seek=page.locator('#r6-seek');await seek.fill(str(result['frames']//2))
   assert await page.locator('#r6-current').inner_text()!='0.0s'
   if width==390:await page.screenshot(path=str(ROOT/'assets'/'r6-replay-390.png'))
   await page.locator('#r6-back').click()
   assert await page.locator('#r3-finish').is_visible()
   assert await page.locator('#r6-replay-controls').count()==0
   async with page.expect_download() as event:
    await page.locator('#r6-export').click()
   download=await event.value
   exported=ROOT/'docs'/f'r6-export-{width}.json';await download.save_as(str(exported))
   capsule=json.loads(exported.read_text())
   assert capsule['verified'] is False and capsule['schema']==1
   verify=subprocess.run(['node','--input-type=module','-e',f"import {{verifyBattleReplay}} from './engine/replay-v6.mjs';import fs from 'node:fs';const c=JSON.parse(fs.readFileSync('docs/r6-export-{width}.json','utf8'));console.log(JSON.stringify(verifyBattleReplay(c)));"],cwd=ROOT,text=True,capture_output=True)
   assert verify.returncode==0,verify.stderr
   assert '"consistent":true' in verify.stdout
   assert not errors,(width,errors)
   print('R6 REPLAY PASS',width,'frames',result['frames'],'replay seek/back, exported JSON independently re-simulated')
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
