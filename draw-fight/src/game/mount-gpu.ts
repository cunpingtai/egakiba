// @ts-nocheck
import { Battle3DRenderer } from '../../packages/render3d/src/renderer.js'
import { makeTexture, analyze } from '../../packages/fighter-analyzer/src/legacy-analyzer.js'
import { BALANCE_VERSION, createMatch, stepMatch, statsFromShape, TICK_RATE } from '../../packages/game-core/src/index.ts'

export function mountGpu(root: ParentNode = document) {
  const ac = new AbortController()
  const signal = ac.signal
  const $ = id => root.querySelector<HTMLElement>('#' + id)
  let render = null, match = null, ended = false, clock = 0, last = 0, acc = 0, gesture = false, frameId = 0
  const keys = new Set()
  function drawSample(primary) {
    const c = document.createElement('canvas'); c.width = c.height = 1024
    const x = c.getContext('2d'); const col = primary ? '#7fd3e3' : '#f3a3a1'
    x.strokeStyle = '#27364c'; x.lineWidth = 28; x.lineCap = x.lineJoin = 'round'; x.fillStyle = col
    x.beginPath(); x.ellipse(512, 455, 230, 260, 0, 0, 2 * Math.PI); x.fill(); x.stroke()
    x.beginPath(); x.moveTo(340, 540); x.lineTo(205, 660); x.moveTo(700, 540); x.lineTo(820, 630)
    x.moveTo(414, 696); x.lineTo(353, 853); x.moveTo(607, 694); x.lineTo(665, 856); x.stroke()
    x.fillStyle = '#27364c'; for (const ex of [440, 581]) { x.beginPath(); x.ellipse(ex, 430, 18, 25, 0, 0, 2 * Math.PI); x.fill() }
    x.beginPath(); x.moveTo(464, 533); x.quadraticCurveTo(513, 569, 568, 529); x.stroke()
    return c
  }
  function makeFighter(id, features) { return { id, revision: 1, analyzerVersion: 'gpu-demo', balanceVersion: BALANCE_VERSION, stats: statsFromShape(features) } }
  function setText(id, str) { $(id).textContent = str }
  function fallback(message) {
    ended = true
    if (render) { render.dispose(); render = null }
    $('gpuStage').hidden = true; $('fallback').hidden = false
    const c = $('fallback'), ctx = c.getContext('2d'); ctx.fillStyle = '#faf5e8'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#27364c'; ctx.textAlign = 'center'; ctx.font = 'bold 42px sans-serif'; ctx.fillText('WebGL2 が使えません', 480, 230)
    ctx.font = '27px sans-serif'; ctx.fillText('おえかきは 2D モードで あそべます！', 480, 305)
    setText('glStatus', '使用不可'); setText('modeBadge', '2D 安全フォールバック'); setText('gpuNotice', message)
  }
  function start() {
    if (signal.aborted) return
    ended = false; acc = 0; last = 0; clock = 0
    try {
      const a = drawSample(true), b = drawSample(false)
      const data = [a, b].map(c => analyze(makeTexture(c)))
      if (data.some(x => !x)) throw Error('サンプルキャラの生成に失敗しました')
      if (render) { render.dispose(); render = null }
      render = new Battle3DRenderer($('gpuStage'), { onUnavailable: fallback, mobile: matchMedia('(max-width:650px)').matches })
      render.setFighters(data)
      match = createMatch(makeFighter('blue', { mass: .45, limbCount: .5, limbReach: .5, slenderness: .45 }), makeFighter('red', { mass: .55, limbCount: .55, limbReach: .45, slenderness: .5 }), 20261023, 180)
      $('gpuStage').hidden = false; $('fallback').hidden = true
      setText('glStatus', '利用可能'); setText('modeBadge', 'WebGL2 LIVE')
      setText('rendererStatus', render.gl.getParameter(render.gl.VERSION) || 'WebGL2')
      setText('fighterStatus', '2体 / 原版の自動骨格'); setText('gpuNotice', 'WASD で移動、J で攻撃。実際の輪郭と厚みを描画しています。')
    } catch (error) { fallback('3D の準備に失敗しました：' + (error.message || error)) }
  }
  function command() {
    const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
    const z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    return { moveX: x, moveZ: z, attackHeld: keys.has('KeyJ') || gesture, guardHeld: keys.has('KeyK') }
  }
  function frame(now) {
    frameId = requestAnimationFrame(frame)
    if (signal.aborted || !render || !match || ended) return
    if (!last) last = now; const dt = Math.min(.05, (now - last) / 1000); last = now; acc += dt
    let steps = 0
    while (acc >= 1 / TICK_RATE && steps < 4) {
      acc -= 1 / TICK_RATE; steps++; clock++
      const c = command(); const cpu = { moveX: Math.sin(clock / 45) * .42, moveZ: Math.sin(clock / 80) * .3, attackHeld: clock % 90 < 23, guardHeld: clock % 160 > 120 }
      const result = stepMatch(match, c, cpu)
      for (const e of result.events) render.markEvent(e, match)
      if (match.phase === 'finished') match = createMatch(match.p1.definition, match.p2.definition, 20261023, 180)
    }
    try { render.render(match, dt, now) } catch (error) { fallback('レンダリングエラー：' + (error.message || error)); return }
    if (render.frame % 45 === 0) { const d = render.getDiagnostics(); setText('frameStatus', String(d.frames)); setText('qualityStatus', `${d.pixelRatio}x · Q${d.qualityLevel}`); setText('screenStatus', `${render.canvas.width} × ${render.canvas.height}`) }
  }
  $('reset').addEventListener('click', start, { signal })
  $('strike').addEventListener('pointerdown', () => { gesture = true }, { signal })
  for (const e of ['pointerup', 'pointercancel', 'pointerleave']) $('strike').addEventListener(e, () => { gesture = false }, { signal })
  $('guard').addEventListener('pointerdown', () => keys.add('KeyK'), { signal })
  for (const e of ['pointerup', 'pointercancel', 'pointerleave']) $('guard').addEventListener(e, () => keys.delete('KeyK'), { signal })
  $('loseContext').addEventListener('click', () => { const ext = render?.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); else setText('gpuNotice', 'この環境では WEBGL_lose_context を使えません。') }, { signal })
  window.addEventListener('keydown', e => { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) { e.preventDefault(); keys.add(e.code) } }, { signal })
  window.addEventListener('keyup', e => keys.delete(e.code), { signal })
  window.addEventListener('blur', () => { keys.clear(); gesture = false }, { signal })
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); gesture = false; last = 0 } }, { signal })
  frameId = requestAnimationFrame(frame)
  const startTimer = setTimeout(start, 80)
  return () => {
    ac.abort()
    clearTimeout(startTimer)
    cancelAnimationFrame(frameId)
    try { render?.dispose() } catch { /* context already gone */ }
    render = null
  }
}
