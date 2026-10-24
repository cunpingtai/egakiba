"""Create real completed local simulation result screenshot (simulated ticks advanced in test)."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from browser_r5_inline import html
R=Path(__file__).resolve().parents[1]
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
  p=await b.new_page(viewport={'width':390,'height':844})
  await p.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))}});}""")
  await p.set_content(html(),wait_until='load')
  await p.locator('#primary-play').click();await p.locator('[data-continue="glyph"]').click()
  await p.locator('#glyph-input').fill('田');await p.locator('[data-continue="prepare"]').click()
  await p.locator('[data-launch]').click();await p.locator('#r3-precise').click()
  await p.locator('#r3-fire').click()
  result=await p.evaluate("""() => {const b=window.__r5battle;b.sim.runToEnd();const result=b.sim.result;b.finish(result);return result;}""")
  assert await p.locator('#r3-finish').is_visible()
  assert await p.locator('.r3-result-card').is_visible()
  assert await p.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await p.screenshot(path=str(R/'assets'/'r5-result-390.png'))
  print('R5 ACTUAL SIMULATION FINISHED',result['winner'],result['reason'],result['durationSeconds'],result['contactCount'],'save UI',await p.locator('.r3-save-note').inner_text())
  await b.close()
if __name__=='__main__':asyncio.run(main())
