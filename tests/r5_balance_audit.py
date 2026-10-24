"""Fast sampled gameplay outcomes using Chromium installed font only. Not balance certification."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_r5_inline import html
ROOT=Path(__file__).resolve().parents[1]
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  await page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))}});localStorage.setItem('moji-blade.v3.r5.local-save.v1', JSON.stringify({schema:1,revision:3,progress:{'01-01':{stars:2,bestSeconds:14},'01-02':{stars:2,bestSeconds:14},'01-03':{stars:2,bestSeconds:14}},battleCount:3,lastGlyph:'文',lastFont:'gothic',updatedAt:null}));}""")
  await page.set_content(html(),wait_until='load')
  await page.locator('#primary-play').click()
  summary={}
  for stage in ['01-01','01-02','01-03','01-04']:
   await page.locator(f'[data-level="{stage}"]').click()
   await page.locator('[data-continue="glyph"]').click()
   await page.locator('#glyph-input').fill('田')
   await page.locator('[data-continue="prepare"]').click()
   await page.locator('[data-launch]').click()
   outputs=await page.evaluate('''() => {
    const b=window.__r5battle, C=b.sim?.constructor;
    if(!C){b.angle=0;b.power=.8;b.fire();}
    const Sim=b.sim.constructor, results=[];
    for(const angle of [0,.18,-.18,.38,-.38])for(const power of [.65,.85,1]){
     const sim=new Sim({player:{glyph:b.payload.player.char,geometry:b.geometry[0],stats:b.stats[0]},enemy:{glyph:b.level.enemy,geometry:b.geometry[1],stats:b.stats[1]},playerAction:{angle,power,spinDirection:1},enemyLaunch:{angle:0,power:b.level.enemyPower,spinDirection:-1},stage:b.level.id,stageConfig:b.level});
     sim.runToEnd();results.push({angle,power,winner:sim.result.winner,reason:sim.result.reason,contacts:sim.result.contactCount,duration:sim.result.durationSeconds});
    }
    return results;
   }''')
   summary[stage]={'wins':sum(r['winner']==0 for r in outputs),'losses':sum(r['winner']==1 for r in outputs),'draws':sum(r['winner'] is None for r in outputs),'contacted':sum(r['contacts']>0 for r in outputs),'outcomes':outputs}
   await page.locator('#r3-exit').click()
   await page.locator('[data-continue="stages"]').click()
  print(json.dumps({k:{a:v[a] for a in ['wins','losses','draws','contacted']} for k,v in summary.items()},ensure_ascii=False,indent=2))
  (ROOT/'docs'/'R5_BALANCE_SAMPLE.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
  await page.close();await browser.close()
if __name__=='__main__':asyncio.run(main())
