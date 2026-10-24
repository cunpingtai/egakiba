var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
var W = 400, H = 700, M = 700, OX = (W - M) / 2, OY = (H - M) / 2, DPR = 1, SC = 1, TX = 0, TY = 0, VW = 0, VH = 0;
var CEN = 170, LONW = 110, LATN = 75, LATS = -60;
function wrap(lon) { while (lon < CEN - 180) lon += 360; while (lon >= CEN + 180) lon -= 360; return lon; }
function merc(lat) { lat = Math.max(-85, Math.min(85, lat)) * Math.PI / 180; return Math.log(Math.tan(Math.PI / 4 + lat / 2)); }
var MY = merc(LATN), MN = merc(LATS);
function px(lon) { return W / 2 + (wrap(lon) - CEN) * W / LONW; }
function py(lat) { return (MY - merc(lat)) / (MY - MN) * H; }

var geo = null, jpRings = [], jpPts = [], mapErr = false;
var jp, ty, elapsed, over, running, spawnT, vx = 0, vy = 0, last = 0, raf = null, tsp = 55, tyNo = 0, hit = null, popupReady = true;

function resize() {
  DPR = window.devicePixelRatio || 1;
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  SC = Math.min(VW / W, VH / H); TX = (VW - W * SC) / 2; TY = (VH - H * SC) / 2;
  if (jp) draw();
}
function init() {
  cancelAnimationFrame(raf);
  bodies.forEach(function (B) { B.ox = 0; B.oy = 0; B.vx = 0; B.vy = 0; });
  jp = { x: px(144), y: py(37) }; ty = []; elapsed = 0; over = false; running = false; spawnT = 0; tsp = 55; tyNo = 0; hit = null; popupReady = true; nameIdx = Math.floor(Math.random() * 140);
  ticker.innerHTML = ''; updateRows();
  draw();
}
function toward(t) { return Math.atan2(jp.y - t.y, jp.x - t.x); }
function spawn() {
  var s = Math.floor(Math.random() * 4), x, y;
  if (s == 0) { x = Math.random() * W; y = -60; } else if (s == 1) { x = W + 60; y = Math.random() * H; }
  else if (s == 2) { x = Math.random() * W; y = H + 60; } else { x = -60; y = Math.random() * H; }
  tyNo++; var nm = NAMES[nameIdx % 140]; nameIdx++;
  var P = [
    { name: '直進', segMin: 4, segMax: 7, jitter: 0.3, pull: 0.2, spd: 1.2, stall: 0 },
    { name: '迷走', segMin: 0.7, segMax: 1.6, jitter: 2.4, pull: 0.2, spd: 0.9, stall: 0 },
    { name: '転向', segMin: 1.5, segMax: 3, jitter: 0.3, pull: 0.2, bias: (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5), spd: 1.0, stall: 0 },
    { name: '追尾', segMin: 1.5, segMax: 3, jitter: 0.6, pull: 0.9, spd: 0.8, stall: 0 },
    { name: '停滞', segMin: 1.5, segMax: 3, jitter: 1.0, pull: 0.4, spd: 1.3, stall: 0.5 }
  ];
  var pat = P[Math.floor(Math.random() * P.length)];
  var t = { no: tyNo, name: nm, pat: pat, x: x, y: y, r: M * 0.015, rPeak: M * 0.05 + Math.random() * M * 0.035, growT: 3 + Math.random() * 3, decay: false, entered: false, rot: 0, ang: 0, timer: pat.segMin + Math.random() * (pat.segMax - pat.segMin), trail: [[x, y]], life: 12 + Math.random() * 10, spd: pat.spd * (0.8 + Math.random() * 0.4), stalled: false };
  t.ang = toward(t) + (Math.random() - 0.5) * 0.8; setForecast(t); ty.push(t);
  news('タイフーン' + tyNo + '号（' + nm + '）が発生しました。今後の進路に警戒してください', 'red', '発生');
}
function region(lon, lat) {
  if (lat >= 41.3) return '北海道';
  if (lon >= 139.3 && lat >= 37) return '東北地方';
  if (lon >= 138.4 && lat >= 34.8) return '関東地方';
  if (lon >= 132.4 && lon <= 134.8 && lat >= 32.7 && lat < 34.45) return '四国地方';
  if (lon >= 136.5) return '中部地方';
  if (lon >= 134.2) return '近畿地方';
  if (lon >= 130.8 && lat >= 34) return '中国地方';
  if (lat >= 30) return '九州地方';
  return '沖縄・南西諸島';
}
var NAMES = ['ダムレイ','ティエンマ','キロギー','インニョン','コイヌ','ボラヴェン','サンバ','ジェラワット','ティロウ','マリクシ','ケーミー','プラピルーン','マリア','ソンティン','アンピル','ウーコン','ジョンダリ','サンサン','トモ','リーピ','バビンカ','プラサン','ソーリック','シマロン','ナレ','ブラパ','バリジャット','ホアバン','コキ','インシン','ケグリ','ディムサム','ヘビ','パブーク','ウーティップ','セーパット','ムーン','ダナス','ナーリー','ウィパー','フランシスコ','コメイ','クローサ','バイルー','ポードル','レンレン','カジキ','ノンファ','ペイパー','ターファー','ミートク','ラガサ','ノグリー','ブアローイ','マットゥモ','ハーロン','ナクリー','フンシェン','カルマエギ','フォンウォン','コト','ノケーン','ペンニャ','ヌーリ','シンラコウ','ハグピート','チャンミー','メーカラー','ヒーゴス','バービー','メイサーク','ハイシェン','ノウル','ドルフィン','クジラ','チャンホン','ペイロー','ナンカー','ソウデル','ナーラ','ケナリ','アッサニー','アータウ','バンラン','クロヴァン','ドゥージェン','スリゲ','チョーイワン','コグマ','チャンパー','インファ','チャンパカ','ニパルタック','ルピート','ミリネ','ニーダ','オーマイス','ルックビン','チャンスー','ディアンムー','ミンドゥル','ライオンロック','トケイ','ナムセーウン','マーロウ','ニヤトー','ソロブル','アムヤオ','コザリ','チャバ','アイレー','ソングダー','トローセス','ムーラン','メアリー','チンマー','トカゲ','オーンマン','ムイファー','マールボック','ナンマドル','タラス','ホードゥー','クラー','ロウキー','ソンカー','ネサット','ハイタン','ツァンザリー','バンヤン','ヤマネコ','パカー','サンヴー','マーワー','グチョル','タリム','ポリ','カーヌン','ラン','サオビエン'];
var nameIdx = 0;
var START = new Date(2026, 7, 1);
function gameDate() { var d = new Date(START); d.setDate(d.getDate() + Math.floor(elapsed)); return d; }
function fmtDate(d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
function setForecast(t) {
  var v = t.stalled ? tsp * 0.15 : tsp * t.spd, T = t.timer, r;
  if (t.decay || t.life - T <= 5) r = t.r - t.rPeak * 0.12 * T;
  else r = Math.min(t.rPeak, t.r + t.rPeak / t.growT * T);
  t.fx = t.x + Math.cos(t.ang) * v * T; t.fy = t.y + Math.sin(t.ang) * v * T; t.fr = Math.max(M * 0.012, r) * 0.55;
}
function update(dt) {
  if (over) {
    dt *= 0.3; slideLand(dt);
    for (var i = ty.length - 1; i >= 0; i--) { var t = ty[i]; t.x += Math.cos(t.ang) * (t.stalled ? tsp * 0.15 : tsp * t.spd) * dt; t.y += Math.sin(t.ang) * (t.stalled ? tsp * 0.15 : tsp * t.spd) * dt; }
    return;
  }
  elapsed += dt; var sp = M * 0.125;
  jp.x = Math.max(30, Math.min(W - 30, jp.x + vx * sp * dt)); jp.y = Math.max(30, Math.min(H - 30, jp.y + vy * sp * dt));
  pushLand(dt); slideLand(dt);
  tsp = M * 0.09 + elapsed * M * 0.0035;
  for (var i = ty.length - 1; i >= 0; i--) {
    var t = ty[i], pt = t.pat; t.timer -= dt;
    if (t.timer <= 0) {
      if (pt.stall > 0 && !t.stalled && Math.random() < pt.stall) { t.stalled = true; t.timer = 1 + Math.random() * 1.5; }
      else {
        t.stalled = false; t.timer = pt.segMin + Math.random() * (pt.segMax - pt.segMin);
        var a = toward(t), d = a - t.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
        t.ang += d * pt.pull + (Math.random() - 0.5) * pt.jitter + (pt.bias || 0);
      }
      t.trail.push([t.x, t.y]); setForecast(t);
    }
    var v = t.stalled ? tsp * 0.15 : tsp * t.spd;
    t.x += Math.cos(t.ang) * v * dt; t.y += Math.sin(t.ang) * v * dt;
    t.life -= dt;
    if (t.decay || t.life <= 5) { t.r -= t.rPeak * 0.12 * dt; }
    else if (t.r < t.rPeak) { t.r = Math.min(t.rPeak, t.r + t.rPeak / t.growT * dt); }
    else if (Math.random() < dt * 0.06) { t.decay = true; }
    if (t.r <= M * 0.012 || t.life <= 0) { ty.splice(i, 1); news('タイフーン' + t.no + '号（' + t.name + '）は温帯低気圧に変わりました', 'yellow', '消滅'); }
    else if (!t.entered && t.x > 0 && t.x < W && t.y > 0 && t.y < H) { t.entered = true; }
    else if ((t.entered && (t.x < -t.r || t.x > W + t.r || t.y < -t.r || t.y > H + t.r)) || t.x < -150 || t.x > W + 150 || t.y < -150 || t.y > H + 150) { ty.splice(i, 1); news('タイフーン' + t.no + '号（' + t.name + '）は日本から遠ざかり、消滅しました', 'yellow', '消滅'); }
  }
  spawnT += dt; var interval = Math.max(1.5, 4 - elapsed * 0.08);
  if (spawnT > interval && ty.length < 7) { spawnT = 0; spawn(); }
  for (var i = 0; i < ty.length && !over; i++) for (var j = 0; j < jpPts.length; j++)
    if (Math.hypot(jp.x + jpPts[j][0] - ty[i].x, jp.y + jpPts[j][1] - ty[i].y) < ty[i].r * 0.55) { over = true; hit = { no: ty[i].no, name: ty[i].name, region: region(jpPts[j][2], jpPts[j][3]) }; popupReady = false; release(); setTimeout(function () { popupReady = true; running = false; draw(); }, 1500); break; }
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0E1A36'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, TX * DPR, TY * DPR);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.fillStyle = '#1B2F5E'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#4E6656'; ctx.strokeStyle = '#7C9A86'; ctx.lineWidth = 0.7;
  for (var b = 0; b < bodies.length; b++) { var B = bodies[b]; ctx.save(); ctx.translate(B.ox, B.oy); ctx.fill(B.path); ctx.stroke(B.path); ctx.restore(); }
  if (jpRings.length) {
    ctx.save(); ctx.translate(jp.x, jp.y); ctx.fillStyle = '#8FBF7F'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.2;
    for (var r = 0; r < jpRings.length; r++) { var ring = jpRings[r]; ctx.beginPath(); for (var i = 0; i < ring.length; i++) ctx[i ? 'lineTo' : 'moveTo'](ring[i][0], ring[i][1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  } else if (mapErr) { ctx.fillStyle = '#FFFFFF'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('地図データが埋め込まれていません', W / 2, H / 2); }
  for (var i = 0; i < ty.length; i++) {
    var t = ty[i];
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.beginPath();
    for (var k = 0; k < t.trail.length; k++) ctx[k ? 'lineTo' : 'moveTo'](t.trail[k][0], t.trail[k][1]); ctx.lineTo(t.x, t.y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (var k = 0; k < t.trail.length; k++) { ctx.beginPath(); ctx.arc(t.trail[k][0], t.trail[k][1], 2.5, 0, Math.PI * 2); ctx.fill(); }
    var fx = t.fx, fy = t.fy, len = Math.hypot(fx - t.x, fy - t.y);
    var rs = t.r * 0.55, rw = t.fr, rf = rw * 0.5;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.beginPath(); ctx.arc(fx, fy, rf, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(240,70,80,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(fx, fy, rw, 0, Math.PI * 2); ctx.stroke();
    if (len > rw - rs) {
      var th = Math.atan2(fy - t.y, fx - t.x), al = Math.acos((rs - rw) / len);
      ctx.beginPath();
      for (var sg = -1; sg <= 1; sg += 2) {
        var a2 = th + sg * al;
        ctx.moveTo(t.x + rs * Math.cos(a2), t.y + rs * Math.sin(a2)); ctx.lineTo(fx + rw * Math.cos(a2), fy + rw * Math.sin(a2));
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,225,0,0.5)'; ctx.strokeStyle = '#FFE000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(225,30,45,0.75)'; ctx.strokeStyle = '#E61E2D'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(t.x - 5, t.y - 5); ctx.lineTo(t.x + 5, t.y + 5); ctx.moveTo(t.x + 5, t.y - 5); ctx.lineTo(t.x - 5, t.y + 5); ctx.stroke();
  }
  document.getElementById('time').textContent = fmtDate(gameDate());
  ctx.restore();
  var pop = document.getElementById('popup');
  if (running || (over && !popupReady)) pop.className = 'hidden';
  else {
    pop.className = '';
    if (over) { ptitle.textContent = fmtDate(gameDate()); ptext.textContent = 'タイフーン' + hit.no + '号（' + hit.name + '）が' + hit.region + 'に上陸'; pbtn.textContent = '新しい夏を始める'; }
    else { ptitle.textContent = ''; ptext.textContent = 'ドラッグで日本列島を動かし\nタイフーンから逃げよう'; pbtn.textContent = '夏を始める'; }
  }
}
var ticker = document.getElementById('ticker');
function updateRows() { document.documentElement.style.setProperty('--rows', ticker.children.length); }
function news(msg, color, tag) {
  var row = document.createElement('div'); row.className = 'row ' + color;
  row.innerHTML = '<div class="tag">' + tag + '</div><div class="track"><div class="ttext"></div></div>';
  var tt = row.querySelector('.ttext'), tr = row.querySelector('.track');
  tt.textContent = msg;
  ticker.appendChild(row); updateRows();
  var dist = tr.clientWidth + tt.offsetWidth;
  tt.style.setProperty('--dist', -dist + 'px');
  tt.style.animationDuration = (dist / 300) + 's';
  tt.addEventListener('animationend', function () { row.remove(); updateRows(); });
}
function loop(now) { if (!running) return; var dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(); raf = requestAnimationFrame(loop); }
function goPortrait() {
  var el = document.documentElement;
  var p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
  var lock = function () { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(function () {}); } catch (e) {} };
  if (p && p.then) p.then(lock).catch(lock); else lock();
}
var ptitle = document.getElementById('ptitle'), ptext = document.getElementById('ptext'), pbtn = document.getElementById('pbtn');
pbtn.onclick = function () { goPortrait(); if (over) init(); if (running) return; running = true; spawn(); last = performance.now(); raf = requestAnimationFrame(loop); };

var pad = document.getElementById('pad'), knob = document.getElementById('knob'), wrapEl = document.getElementById('wrap');
var active = false, pid = null, cx0 = 0, cy0 = 0, KM = 44, KR = 44;
function setKnob(ex, ey) {
  var dx = ex - cx0, dy = ey - cy0, d = Math.hypot(dx, dy);
  if (d > KR) { dx = dx / d * KR; dy = dy / d * KR; }
  vx = dx / KR; vy = dy / KR; knob.style.left = (KM + dx) + 'px'; knob.style.top = (KM + dy) + 'px';
}
function release() { active = false; pid = null; vx = 0; vy = 0; knob.style.left = KM + 'px'; knob.style.top = KM + 'px'; }
wrapEl.addEventListener('pointerdown', function (e) {
  if (over || e.target.closest('#ticker') || e.target.closest('#popup') || e.target.closest('#menubtn') || e.target.closest('#menu') || active) return;
  active = true; pid = e.pointerId; wrapEl.setPointerCapture(e.pointerId);
  if (e.target.closest('#pad')) { var r = pad.getBoundingClientRect(); cx0 = r.left + r.width / 2; cy0 = r.top + r.height / 2; }
  else { cx0 = e.clientX; cy0 = e.clientY; }
  setKnob(e.clientX, e.clientY); e.preventDefault();
});
wrapEl.addEventListener('pointermove', function (e) { if (active && e.pointerId === pid) setKnob(e.clientX, e.clientY); });
wrapEl.addEventListener('pointerup', function (e) { if (e.pointerId === pid) release(); });
wrapEl.addEventListener('pointercancel', function (e) { if (e.pointerId === pid) release(); });
var keys = {};
function keyVel() { vx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0); vy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0); }
window.addEventListener('keydown', function (e) { if (over) return; keys[e.key] = true; keyVel(); });
window.addEventListener('keyup', function (e) { keys[e.key] = false; keyVel(); });

var bodies = [];
function buildMap() {
  jpRings = []; jpPts = []; bodies = [];
  var K = 1.6, CX = px(138), CY = py(37);
  geo.japan.forEach(function (poly) { poly.forEach(function (ring) { var out = []; ring.forEach(function (c) { out.push([(px(c[0]) - CX) * K, (py(c[1]) - CY) * K, c[0], c[1]]); }); jpRings.push(out); jpPts = jpPts.concat(out); }); });
  geo.land.forEach(function (poly) {
    var maxLat = -90; poly[0].forEach(function (c) { if (c[1] > maxLat) maxLat = c[1]; });
    if (maxLat < -55) return;
    var path = new Path2D(), outer = [], cur = null, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    poly.forEach(function (ring, ri) {
      var prev = null;
      ring.forEach(function (c) {
        var lon = wrap(c[0]), x = px(lon), y = py(c[1]);
        if (prev === null || Math.abs(lon - prev) > 180) { if (prev !== null) path.closePath(); path.moveTo(x, y); if (ri === 0) { cur = []; outer.push(cur); } } else path.lineTo(x, y);
        prev = lon;
        if (ri === 0) { cur.push([x, y]); if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      });
      path.closePath();
    });
    outer = outer.filter(function (r) { return r.length > 2; });
    bodies.push({ path: path, outer: outer, minX: minX, minY: minY, maxX: maxX, maxY: maxY, ox: 0, oy: 0, vx: 0, vy: 0 });
  });
}
function inPoly(pt, ring) {
  var x = pt[0], y = pt[1], inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pushLand(dt) {
  var spd = M * 0.125;
  for (var b = 0; b < bodies.length; b++) {
    var B = bodies[b], sx = 0, sy = 0, n = 0;
    if (jp.x + 120 < B.minX + B.ox || jp.x - 120 > B.maxX + B.ox || jp.y + 120 < B.minY + B.oy || jp.y - 120 > B.maxY + B.oy) continue;
    for (var j = 0; j < jpPts.length; j++) {
      var q = [jp.x + jpPts[j][0] - B.ox, jp.y + jpPts[j][1] - B.oy];
      if (q[0] < B.minX || q[0] > B.maxX || q[1] < B.minY || q[1] > B.maxY) continue;
      for (var r = 0; r < B.outer.length; r++) if (inPoly(q, B.outer[r])) { sx += jpPts[j][0]; sy += jpPts[j][1]; n++; break; }
    }
    if (n) { var d = Math.hypot(sx, sy) || 1; B.vx = sx / d * spd; B.vy = sy / d * spd; }
  }
}
function slideLand(dt) {
  var k = Math.pow(0.12, dt);
  for (var b = 0; b < bodies.length; b++) {
    var B = bodies[b];
    if (!B.vx && !B.vy) continue;
    B.ox += B.vx * dt; B.oy += B.vy * dt; B.vx *= k; B.vy *= k;
    if (Math.abs(B.vx) < 0.5 && Math.abs(B.vy) < 0.5) { B.vx = 0; B.vy = 0; }
  }
}
document.getElementById('menubtn').onclick = function () { document.getElementById('menu').className = 'open'; };
document.getElementById('menuclose').onclick = function () { document.getElementById('menu').className = ''; };
window.addEventListener('resize', resize);
resize(); init();
fetch('./world.json').then(function (response) {
  if (!response.ok) throw new Error('map');
  return response.json();
}).then(function (data) {
  geo = data;
  buildMap();
  draw();
}).catch(function () {
  mapErr = true;
  draw();
});
