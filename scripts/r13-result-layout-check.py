import asyncio,re,json
from pathlib import Path
from playwright.async_api import async_playwright
r=Path(__file__).resolve().parent.parent
source=(r/'r9-story-screen.mjs').read_text()
def template(pattern):
 m=re.search(pattern,source)
 assert m,pattern
 return re.sub(r'\$\{[^{}]*\}','VICTORY',m.group(1))
main=template(r'root\.innerHTML=`([\s\S]*?)`;\s*this\.\$=')
# Real approximate dynamically created result DOM, with accessible CTA.
result='<div class="r9-result-content" data-outcome="win"><small>STAGE 01-01</small><strong class="r11-finish-title">VICTORY</strong><p>WIN · KO · 10.3s</p><div class="r9-result-stars">★★★</div><p>MISSION CLEAR!</p><div class="r11-result-summary"><span>⚡ 2 DASH</span><span>✦ 8 HIT</span><span>♥ 75 HP</span></div><p class="r9-save-status">保存しました</p><div class="r9-result-actions"><button class="r8-cta" id="r9-again">再挑戦</button><button class="r8-cta">次のステージ</button><button class="r8-second">ステージ選択</button><details class="r11-battle-details"><summary>バトルの記録</summary></details></div></div>'
css='\n'.join((r/f).read_text() for f in ['styles.css','flow.css','r3-battle.css','game-experience-r10.css'])
html='<html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+css+'</style></head><body><main id="battle-root">'+main+'</main></body></html>'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for w,h in [(320,568),(390,844),(844,390)]:
   page=await b.new_page(viewport={'width':w,'height':h});await page.set_content(html)
   await page.evaluate('''html => {document.querySelector('.r9-shell').dataset.phase='result';document.querySelector('#r9-result').hidden=false;document.querySelector('#r9-result').innerHTML=html;}''',result)
   data=await page.evaluate('''() => {const pan=document.querySelector('#r9-result'),btn=document.querySelector('#r9-again');const bb=btn.getBoundingClientRect();let style=getComputedStyle(pan);return {client:pan.clientHeight,scroll:pan.scrollHeight,overflowY:style.overflowY,buttonRect:{top:bb.top,bottom:bb.bottom,left:bb.left,right:bb.right},viewport:{w:innerWidth,h:innerHeight}}}''')
   await page.locator('#r9-again').scroll_into_view_if_needed()
   await page.locator('#r9-again').focus()
   visible=await page.locator('#r9-again').is_visible()
   print(w,h, data,'retryVisible',visible)
   if not visible or data['buttonRect']['right']>w+5:raise AssertionError('retry CTA unreachable')
   await page.close()
  await b.close()
asyncio.run(main())
