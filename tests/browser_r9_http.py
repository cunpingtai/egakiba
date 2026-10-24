from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys
BASE='http://127.0.0.1:8765/'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-webgl'])
 for width in (390,1440):
  page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  response=page.goto(BASE,wait_until='domcontentloaded',timeout=25000)
  print('HTTP',width,response.status)
  page.locator('#primary-play').click()
  print('STAGES',page.locator('#flow-page').is_visible(),page.locator('[data-level="01-01"]').count())
  page.locator('[data-continue="glyph"]').first.click() if page.locator('[data-continue="glyph"]').count() else page.locator('[data-level="01-01"]').first.click()
  print('CURRENT SCREEN',page.locator('.flow-heading h1').all_text_contents()[:1])
  if page.locator('[data-continue="glyph"]').count(): page.locator('[data-continue="glyph"]').first.click()
  if page.locator('[data-continue="prepare"]').count():page.locator('[data-continue="prepare"]').first.click()
  print('PREPARED',page.locator('#r9-native-prepare-stats').count())
  if page.locator('[data-launch]').count():page.locator('[data-launch]').first.click()
  page.wait_for_timeout(2500)
  print('STORY',page.locator('.r9-shell').count(),'ROOT',page.locator('#battle-root').get_attribute('hidden'),'STATUS',page.locator('#r9-status').all_text_contents()[:1])
  print('ERRORS',errors[:4])
  if page.locator('#r9-fire').count() and page.locator('#r9-fire').is_enabled():
   page.locator('#r9-fire').click();page.wait_for_timeout(6000)
   print('BATTLE FINISHED',page.locator('#r9-result').is_visible(),'HP',page.locator('#r9-p-hp-value').all_text_contents())
  page.close()
 browser.close()
