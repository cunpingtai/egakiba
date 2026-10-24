// @ts-nocheck
/* Home controller from the rewritten notebook page. */
import { drawHref } from '../paths.ts'
export function mountHome(onSound: (enabled: boolean) => void, root: ParentNode = document) {
  const ac = new AbortController()
  const signal = ac.signal
  const $ = id => root.querySelector<HTMLElement>('#' + id)
  const dialog = $('gameDialog')
  const title = $('dialogTitle')
  const eyebrow = $('dialogEyebrow')
  const content = $('dialogContent')
  const arena = $('arenaInteract')
  const reduceMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  const safeStorage = (() => { try { const x = window.localStorage; x.getItem('rakugaki-v2-sound'); return x } catch { return { getItem: () => null, setItem: () => {} } } })()
  let audioContext = null
  let soundEnabled = safeStorage.getItem('rakugaki-v2-sound') === 'on'
  let reduced = safeStorage.getItem('rakugaki-v2-reduced-motion') === 'on'
  let libraryObjectUrls = []
  let punchTimer = 0

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
  }
  function ping(kind = 'tap') {
    if (!soundEnabled) return
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.type = kind === 'hit' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(kind === 'hit' ? 300 : 550, now)
      osc.frequency.exponentialRampToValueAtTime(kind === 'hit' ? 95 : 710, now + .11)
      gain.gain.setValueAtTime(.0001, now)
      gain.gain.exponentialRampToValueAtTime(.045, now + .01)
      gain.gain.exponentialRampToValueAtTime(.0001, now + .17)
      osc.connect(gain).connect(audioContext.destination)
      osc.start(now); osc.stop(now + .18)
    } catch { /* keep the page usable when audio is blocked */ }
  }
  function syncSettingUI() {
    onSound(soundEnabled)
    document.documentElement.classList.toggle('reduce-motion', reduced)
    $('soundToggle').setAttribute('aria-pressed', String(soundEnabled))
    $('soundToggle').setAttribute('aria-label', soundEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする')
  }
  syncSettingUI()
  $('soundToggle').addEventListener('click', () => {
    soundEnabled = !soundEnabled
    safeStorage.setItem('rakugaki-v2-sound', soundEnabled ? 'on' : 'off')
    syncSettingUI(); ping()
  }, { signal })
  function closeDialog() {
    if (dialog.open) dialog.close()
  }
  $('dialogClose').addEventListener('click', closeDialog, { signal })
  dialog.addEventListener('click', e => {
    if (e.target === dialog) closeDialog()
  }, { signal })
  dialog.addEventListener('close', () => {
    libraryObjectUrls.forEach(URL.revokeObjectURL)
    libraryObjectUrls = []
  }, { signal })
  function showPanel({ name, heading, body }) {
    eyebrow.textContent = name
    title.textContent = heading
    content.innerHTML = body
    if (!dialog.open) dialog.showModal()
    ping()
  }
  function showStages() {
    window.location.href = drawHref('studio?screen=stages')
  }
  async function showLibrary() {
    showPanel({ name: 'MY FIGHTERS / 端末内の作品', heading: 'マイキャラ', body: '<div class="dialog-empty"><span class="empty-art">✎</span><strong>作品を確認しています…</strong></div>' })
    let items = []
    try {
      const storage = await import('../../packages/drawing/src/storage.js')
      if (signal.aborted) return
      await storage.migrateLegacy()
      items = await storage.listFighters()
    } catch (error) { console.warn('Local library not available', error) }
    if (signal.aborted || !dialog.open || title.textContent !== 'マイキャラ') return
    if (!items.length) {
      content.innerHTML = `<div class="dialog-empty"><span class="empty-art">✎</span><strong>まだキャラがいないみたい！</strong><p>おえかきスタジオで描くと、この端末に保存できます。</p></div><a class="dialog-action" href="${drawHref('studio')}">キャラをかく ↗</a>`
      return
    }
    const html = items.slice(0, 30).map((item, i) => {
      const blob = item.png instanceof Blob ? item.png : new Blob([item.png], { type: 'image/png' })
      const src = URL.createObjectURL(blob); libraryObjectUrls.push(src)
      return `<div class="library-entry"><img src="${src}" alt="保存したキャラ ${i + 1}"><span>${escapeHtml(item.name || 'らくがき ' + (i + 1))}</span></div>`
    }).join('')
    content.innerHTML = `<p class="dialog-intro">この端末の保存済みキャラ <strong>${items.length} 件</strong>。旧バージョンの作品も、元データを削除せずにコピーします。</p><div class="library-grid">${html}</div><a class="dialog-action" href="${drawHref('studio')}">新しいキャラをかく ↗</a>`
  }
  function showRanking() {
    showPanel({ name: 'RANKING / UNDER DEVELOPMENT', heading: 'ランキング', body: '<div class="dialog-empty"><span class="empty-art">🏆</span><strong>みんなの勝負は、もう少し先！</strong><p>ランキングは、正式なステージとサーバーでの記録チェックが完成してから公開します。架空の順位やスコアは表示しません。</p></div><p class="dialog-intro" style="margin-top:15px">予定：ステージ別ランキング・週間ランキング・自己ベスト。リアルタイム対戦のランキングはさらに後の段階です。</p>' })
  }
  function showSettings() {
    showPanel({
      name: 'GAME OPTIONS / LOCAL', heading: 'せってい', body: `
      <div class="setting-row"><span><strong>サウンド</strong><small>ホームのキャラとボタンの効果音</small></span><button id="setSound" class="toggle" type="button" aria-pressed="${soundEnabled}">${soundEnabled ? 'ON' : 'OFF'}</button></div>
      <div class="setting-row"><span><strong>アニメーションを減らす</strong><small>キャラの動きを最小限にします</small></span><button id="setMotion" class="toggle" type="button" aria-pressed="${reduced}">${reduced ? 'ON' : 'OFF'}</button></div>
      <div class="setting-row"><span><strong>言語 / LANGUAGE</strong><small>ホームデザイン初稿は日本語のみ</small></span><span style="font-weight:900">日本語</span></div>
      <p class="dialog-intro" style="margin-top:18px">PC: Enter / Space で中央のキャラを動かせます。戦闘本編では矢印/WASD、Space、Shift が使えます。キー再設定は V2 のゲーム入力システムに実装予定です。</p>
    `})
    $('setSound').addEventListener('click', () => {
      soundEnabled = !soundEnabled
      safeStorage.setItem('rakugaki-v2-sound', soundEnabled ? 'on' : 'off'); syncSettingUI()
      $('setSound').textContent = soundEnabled ? 'ON' : 'OFF'; $('setSound').setAttribute('aria-pressed', String(soundEnabled)); ping()
    }, { signal })
    $('setMotion').addEventListener('click', () => {
      reduced = !reduced; safeStorage.setItem('rakugaki-v2-reduced-motion', reduced ? 'on' : 'off'); syncSettingUI()
      $('setMotion').textContent = reduced ? 'ON' : 'OFF'; $('setMotion').setAttribute('aria-pressed', String(reduced))
    }, { signal })
  }
  root.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => {
    const panel = b.dataset.panel
    if (panel === 'stages') showStages()
    if (panel === 'library') void showLibrary()
    if (panel === 'ranking') showRanking()
  }, { signal }))
  $('settingsButton').addEventListener('click', showSettings, { signal })

  arena.addEventListener('click', () => {
    clearTimeout(punchTimer)
    arena.classList.remove('is-punching')
    void arena.offsetWidth
    arena.classList.add('is-punching')
    $('stageCaption').textContent = 'やった！ ナイスパンチ！'
    ping('hit')
    $('announcement').textContent = 'ラクガキがパンチした！'
    punchTimer = setTimeout(() => {
      arena.classList.remove('is-punching')
      $('stageCaption').textContent = '✳ タップすると、うごくよ！'
    }, 850)
  }, { signal })

  try {
    const raw = safeStorage.getItem('rakugaki-v2-campaign-r3')
    const data = raw ? JSON.parse(raw) : null
    if (data?.schema === 1 && data.campaignVersion === 'campaign-r3a' && data.records && new URLSearchParams(location.search).get('preview') !== 'returning') {
      const ids = ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3', '2-4', '3-1', '3-2', '3-3', '3-4']
      let cleared = 0, stars = 0
      for (const id of ids) { const record = data.records[id]; if (!record || !Number.isInteger(record.stars) || record.stars < 1 || record.stars > 3) break; cleared++; stars += record.stars }
      if (cleared > 0) {
        const current = ids[Math.min(cleared, ids.length - 1)]
        const memo = $('playerMemo'); memo.replaceChildren()
        const pin = document.createElement('span'); pin.className = 'pin'; pin.setAttribute('aria-hidden', 'true')
        const kicker = document.createElement('span'); kicker.className = 'memo-kicker'; kicker.textContent = 'WELCOME BACK / つづきから'
        const heading = document.createElement('h2'); heading.textContent = `おかえり！ ${cleared}/12 クリア`
        const summary = document.createElement('p'); summary.style.cssText = 'font-size:12px;line-height:1.7;color:#6d7888;font-weight:700'; summary.textContent = `★ ${stars} / 36 · 次のステージ ${current} · 端末内の記録`
        const link = document.createElement('a'); link.className = 'dialog-action'; link.href = drawHref('studio?screen=stages'); link.textContent = 'ステージのつづきへ ↗'
        memo.append(pin, kicker, heading, summary, link)
      }
    }
  } catch (error) { console.warn('Could not read local campaign progress', error) }
  if (new URLSearchParams(window.location.search).get('preview') === 'returning') {
    const memo = $('playerMemo')
    memo.innerHTML = `<span class="pin" aria-hidden="true"></span><span class="memo-kicker">DESIGN PREVIEW / 再訪ユーザー表示</span><h2>おかえり！<br>つづきから あそぶ？</h2><p style="font-size:12px;line-height:1.7;color:#6d7888;font-weight:700">これは再訪時の UI サンプルです。実際の進行データではありません。</p><a class="dialog-action" href="${drawHref('studio?demo=1')}">ゲームへもどる ↗</a>`
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(punchTimer); arena.classList.remove('is-punching') }
  }, { signal })
  if (reduceMedia.matches) document.documentElement.classList.add('system-reduced-motion')

  return () => {
    ac.abort()
    clearTimeout(punchTimer)
    libraryObjectUrls.forEach(URL.revokeObjectURL)
    try { audioContext?.close() } catch { /* already closed */ }
  }
}
