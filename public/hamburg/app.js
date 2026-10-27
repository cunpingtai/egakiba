// ハンバーグ作り: 材料を入れる → こねる → 形を作る → 焼く → ソース → 採点
(() => {
  const $ = (id) => document.getElementById(id);
  const cv = $("c"), ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  let CX = 0, CY = 0, R = 100; // いま作業している物(ボウル・まな板・フライパン)の中心と大きさ

  // ---------- 材料 ----------
  const ING = [
    { id: "meat", e: "🥩", name: "ひき肉" },
    { id: "panko", e: "🍞", name: "パン粉" },
    { id: "milk", e: "🥛", name: "牛乳" },
    { id: "egg", e: "🥣", name: "とき卵" },
    { id: "eggShell", e: "🥚", name: "殻つき卵" },
    { id: "salt", e: "🧂", name: "塩こしょう" },
    { id: "nutmeg", e: "🌰", name: "ナツメグ" },
    { id: "cheese", e: "🧀", name: "チーズ" },
    { id: "flour", e: "🌾", name: "小麦粉" },
    { id: "banana", e: "🍌", name: "バナナ", joke: true },
    { id: "choco", e: "🍫", name: "チョコ", joke: true },
    { id: "straw", e: "🍓", name: "いちご", joke: true },
    { id: "natto", e: "🫘", name: "納豆", joke: true },
  ];
  const MAX_EACH = Infinity; // 全部の材料が入れ放題(笑)
  const NO_LIMIT = new Set(["meat", "egg", "milk"]);
  let counts = {}, pieces = [], meatBits = [], seqN = 0; // seq=入れた順番(あとから入れた物ほど上)

  const rnd = (a, b) => a + Math.random() * (b - a);
  // ボウルに入った材料の見た目の部品(単位円の中の位置。x0,y0=落ちた所 → x1,y1=こねた後)
  function addPieces(id, ux, uy) {
    const P = (o) => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.78;
      pieces.push({ seq: ++seqN, id, x0: ux + rnd(-0.12, 0.12), y0: uy + rnd(-0.12, 0.12), x1: Math.cos(a) * rr, y1: Math.sin(a) * rr, rot: rnd(0, 6.3), ...o });
    };
    const n = (k, o) => { for (let i = 0; i < k; i++) P(typeof o === "function" ? o() : o); };
    switch (id) {
      case "meat": for (let i = 0; i < 7; i++) meatBits.push({ seq: ++seqN, x: ux + rnd(-0.22, 0.22), y: uy + rnd(-0.22, 0.22), r: rnd(0.17, 0.27) }); break;
      case "onionS": n(16, () => ({ kind: "sq", s: rnd(0.016, 0.026), col: "#f4edd4" })); break;
      case "onionM": n(5, () => ({ kind: "chunk", s: rnd(0.07, 0.1), col: "#f1e7c6" })); break;
      case "onionL": P({ kind: "emoji", e: "🧅", s: 0.34, x1: rnd(-0.2, 0.2), y1: rnd(-0.2, 0.2) }); break;
      case "panko": n(26, () => ({ kind: "dot", s: rnd(0.008, 0.014), col: "#e8c98a" })); break;
      case "flour": n(30, () => ({ kind: "dot", s: rnd(0.006, 0.012), col: Math.random() < 0.7 ? "#fbf8f1" : "#efe8d8" })); break;
      case "milk": P({ kind: "puddle", s: 0.2, col: "#fbf9f2", melt: true, x0: ux, y0: uy, t0: performance.now() }); break; // 落ちた所から広がる
      case "egg": P({ kind: "egg", s: 0.17, melt: true, x0: ux, y0: uy, t0: performance.now() }); break; // 落ちた所にそのまま(ずらさない)
      case "eggShell": if (window.Bowl3D && Bowl3D.ok && Bowl3D.hasEgg) P({ kind: "egg3d", d3: true, s: 0.16, x0: ux, y0: uy }); else P({ kind: "emoji", e: "🥚", s: 0.16, after: "shell" }); break;
      case "salt": n(14, () => ({ kind: "dot", s: rnd(0.005, 0.008), col: Math.random() < 0.5 ? "#222" : "#fff" })); break;
      case "nutmeg": n(10, () => ({ kind: "dot", s: rnd(0.005, 0.009), col: "#7a4a24" })); break;
      case "cheese": n(4, () => ({ kind: "sq", s: rnd(0.045, 0.06), col: "#ffd34d" })); break;
      case "banana": n(3, () => ({ kind: "slice", s: rnd(0.06, 0.075), col: "#fff3b0" })); break;
      case "choco": n(3, () => ({ kind: "sq", s: rnd(0.05, 0.065), col: "#5a3018" })); break;
      case "straw": n(2, () => ({ kind: "emoji", e: "🍓", s: 0.11 })); break;
      case "natto": n(12, () => ({ kind: "bean", s: rnd(0.022, 0.03), col: "#b9823b" })); break;
    }
  }

  // ---------- 状態 ----------
  let stage = "title";   // title / ing / knead / shape / cook / sauce / result
  let knead = 0, swirl = 0;
  let shape = null;      // { pts:[x,y,...] 正規化(面積が半径1の円と同じ), q: 丸さ }
  let drawPts = null;    // 形を描いている途中の線(画面座標)
  let side = [0, 0], down = 0, flipT = -1, flips = 0, cookStarted = 0, cracked = false;
  let sauce = [], sauceCur = null, sauceCol = "#5a1d0e";
  let pattyPieces = [], speck = [], cracks = [], pattyTex = null, clothPat = null;

  // ---------- 音 ----------
  let ac = null, master = null, noise = null, sizzleG = null;
  function initAudio() {
    if (ac) { if (ac.state !== "running") ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // じゅーー(焼いている音)
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500;
    sizzleG = ac.createGain(); sizzleG.gain.value = 0;
    s.connect(hp).connect(sizzleG).connect(master); s.start();
  }
  for (const ev of ["pointerdown", "touchend", "keydown"]) window.addEventListener(ev, () => initAudio(), { capture: true, passive: true });
  function nz(freq, q, vol, dur, type = "bandpass") {
    if (!ac) return;
    const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(freq, dur, type = "sine", vol = 0.15, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  // ---- 本物っぽい効果音(その場で合成) ----
  // 時刻 t に、帯域をしぼったノイズを短く鳴らす(サクッ・コッ などの元)
  function burst(t, freq, q, vol, dur, type = "bandpass") {
    if (!ac) return;
    const s = ac.createBufferSource(); s.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  function ping(t, f0, f1, vol, dur, type = "sine") {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // 玉ねぎを切る「ザクッ・トンッ」: 繊維が切れるシャクッ + 包丁がまな板に当たるトンッ
  function chop(delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay, p = 0.85 + Math.random() * 0.3;
    burst(t, 2600 * p, 1.1, 0.5, 0.05); burst(t + 0.008, 4200 * p, 1.4, 0.3, 0.04); burst(t + 0.02, 1700 * p, 1.2, 0.32, 0.06);
    for (let i = 0; i < 4; i++) burst(t + 0.01 + Math.random() * 0.03, 3000 + Math.random() * 3000, 3, 0.12, 0.012); // シャリシャリ
    ping(t + 0.045, 210 * p, 85, 0.55, 0.14);            // トンッ(まな板)
    burst(t + 0.045, 380, 0.8, 0.35, 0.09, "lowpass");
  }
  // たまごをボウルのふちに当てる「コンッ」: 殻のコッ + ステンレスのボウルのカーン
  function knock(strong) {
    if (!ac) return;
    const t = ac.currentTime;
    burst(t, 3300, 1.6, strong ? 0.75 : 0.5, 0.025); burst(t, 1200, 2, 0.25, 0.03);
    for (const [f, v, d] of [[1870, 0.11, 0.7], [2640, 0.07, 0.5], [3730, 0.045, 0.38], [5120, 0.03, 0.26], [940, 0.04, 0.5]]) ping(t, f, f * 0.995, v * (strong ? 1.3 : 1), d);
    // パリッ(殻にヒビ)。強すぎるとグシャッ
    const n = strong ? 9 : 3;
    for (let i = 0; i < n; i++) burst(t + 0.01 + Math.random() * (strong ? 0.09 : 0.04), 2500 + Math.random() * 4000, 2.5, strong ? 0.3 : 0.18, 0.015);
    if (strong) burst(t + 0.02, 1800, 0.9, 0.4, 0.12);
  }
  // パカッと割って、ボウルに「ぽちゃ」
  function eggOpen() {
    if (!ac) return;
    const t = ac.currentTime;
    for (let i = 0; i < 3; i++) burst(t + i * 0.012, 3500 + Math.random() * 2000, 2.5, 0.2, 0.015);
    ping(t + 0.33, 520, 170, 0.28, 0.12); burst(t + 0.33, 700, 1, 0.3, 0.16, "lowpass"); ping(t + 0.37, 330, 140, 0.15, 0.1);
  }
  const plop = () => { nz(500, 1.2, 0.5, 0.12, "lowpass"); tone(rnd(300, 420), 0.08, "sine", 0.12); };
  const squish = () => {
    if (!ac) return;
    const t = ac.currentTime;
    burst(t, rnd(280, 520), 2.5, 0.35, 0.13); burst(t + 0.02, rnd(900, 1500), 4, 0.14, 0.07);
    ping(t, rnd(170, 240), 85, 0.1, 0.1);
    for (let i = 0; i < 3; i++) burst(t + Math.random() * 0.07, rnd(1800, 3800), 6, 0.05, 0.012); // ぐちゅ(細かい泡)
  };

  // ---------- 画面 ----------
  let toastT = 0;
  // 上に出る実況の文字は出さない(形をなぞり直す時の案内だけ残す)
  const TOAST_KEEP = /囲って|まだ玉ねぎしか|まだ何も入って/;
  function toast(m, ms = 1800) { if (!TOAST_KEEP.test(m)) return; const el = $("toast"); el.textContent = m; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), ms); }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px"; // アプリ内ブラウザ(X・インスタ)でも画面ぴったりに
  }
  window.addEventListener("resize", resize);
  if (window.visualViewport) visualViewport.addEventListener("resize", resize);
  let GUIDE_EXTRA = 0; // 上の説明の文字の高さ(その分、3Dの物を下げて小さく)
  let LB = 0; // 下のパネルの上のふち(3Dの物がここより下にかくれないように)
  function layout() {
    const p = $("panel"), ph = p.classList.contains("hide") ? 0 : p.offsetHeight + 16;
    const rh = $("result").classList.contains("hide") ? 0 : $("result").querySelector(".card").offsetHeight + 10;
    const gd = $("guide"), gb = gd && gd.childElementCount && !p.classList.contains("hide") ? gd.getBoundingClientRect().bottom + 6 : 58;
    const top = Math.max(58, gb), bottom = H - Math.max(ph, rh) - 8; GUIDE_EXTRA = top - 58;
    CX = W / 2; CY = (top + bottom) / 2; LB = bottom;
    R = Math.max(60, Math.min(W * 0.42, (bottom - top) / 2 * 0.9));
  }
  const panel = $("panel");
  // 次の手順に変わった直後(0.55秒)は、パネルのボタンを押せないようにする
  // (重い場面の切り替え中に2回タップすると、同じ場所の次のボタンまで押されて手順が飛ぶため)
  let panelT = 0;
  // 説明の文字は、下のボタンの上ではなく、画面の上(材料の上あたり)に出す
  function setPanel(html) { panel.innerHTML = html; panel.classList.remove("hide"); panelT = performance.now(); const gd = $("guide"); if (gd) { gd.innerHTML = ""; panel.querySelectorAll(".hint").forEach((h) => gd.appendChild(h)); } }
  // 画面が切り替わった直後のタップは無視(前の画面の同じ場所のボタンを2回押して、次の画面のボタンまで押されないように)
  panel.addEventListener("click", (e) => { if (performance.now() - panelT < 700 && e.target.closest("button")) { e.stopPropagation(); e.preventDefault(); } }, true);
  function setStep(t) { $("step").textContent = t; showRecipe(); }
  const RECIPE_STEPS = [
    ["cut", "玉ねぎを<b>細かく</b>きざむ（細かいほど◎）"],
    ["ing", "材料をボウルへ（卵は割って中身だけ）"],
    ["knead", "ねばりが出るまで、よーくこねる"],
    ["toss", "手でペチペチ、空気をぬく（やりすぎ注意）"],
    ["shape", "まな板で、きれいな小判形に"],
    ["cook", "油はうすく全体に → 片面<b>20秒くらい</b>、こんがりしたら返す"],
    ["sauce", "ソースをかけて完成！"],
  ];
  function showRecipe() {
    const box = $("recipe"); if (!box || box.classList.contains("hide")) return;
    box.innerHTML = `<b style="font-size:15px">📖 おいしいハンバーグのレシピ</b>
      <div class="rc-ing">ひき肉 2〜3つかみ ／ 玉ねぎ みじん切り ／ たまご 1個 ／ 牛乳 1杯 ／ パン粉 1つかみ ／ 塩こしょう 少々 ／ ナツメグ お好みで</div>
      <ol>${RECIPE_STEPS.map(([st, tx]) => `<li class="${st === stage ? "now" : ""}">${tx}</li>`).join("")}</ol>
      <div style="font-size:11px;color:#888">※ あくまで目安。焼き加減は色を見てね</div>
      <b style="font-size:14px;display:block;margin-top:8px">🔒 隠しレシピ ${foundRecipes().length}/${RECIPES.length}</b>
      <ul style="margin:4px 0 0;padding-left:18px">${RECIPES.map((r) => foundRecipes().includes(r.id) ? `<li><b>${r.e} ${r.name}</b></li>` : `<li style="color:#888">？？？ <small>ヒント：${r.hint}</small></li>`).join("")}</ul>`;
  }
  { const b = $("recipeBtn"), box = $("recipe");
    if (b && box) b.onclick = () => { box.classList.toggle("hide"); showRecipe(); }; if (box) box.onclick = () => box.classList.add("hide"); }

  // ---------- 1. 玉ねぎを切る ----------
  // かけら = 凸多角形(玉ねぎの半径を1とした座標)。指でなぞった線で本当に2つに割る
  let onion = [], onionCuts = 0, cutPath = null, cutFx = [], onionAdded = false, peelMode = false, peelPtr = null;
  function circlePoly(n) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push(Math.cos(a), Math.sin(a)); } return o; }
  function goCut() {
    stage = "cut"; counts = {}; pieces = []; meatBits = []; MM = null; mixTile = null; pattyTex = null; chunks = []; wholeSprite = null; eggImg = null; faceTex = null; faceChunks = null; tossN = 0; toss = null; toss3 = false; tossTex = null; tossChunks = null; oil = null; pan = null; knead = 0; swirl = 0; shape = null; sauce = [];
    side = [0, 0]; down = 0; flips = 0; flipT = -1; cracked = false; cookStarted = 0; DK = { kind: "meat", vol: 4 }; hRatio = 0.62; melts = []; resultData = null;
    onion = [{ pts: circlePoly(28) }]; onionCuts = 0; cutPath = null; cutFx = []; onionAdded = false;
    if (window.Bowl3D && Bowl3D.ok && Bowl3D.tex()) Bowl3D.resetItems();
    if (window.Bowl3D && Bowl3D.ok && Bowl3D.clearOnion) Bowl3D.clearOnion();
    $("title").classList.add("hide"); $("result").classList.add("hide");
    setStep("1/7 玉ねぎを切る");
    peelMode = false;
    setPanel(`<p class="hint">玉ねぎを<b>指でスパッとなぞって切る！</b>（何回でも）<br>🧅 先に<b>皮をむく</b>と◎（「皮をむく」にしてこする）</p>
      <div class="btns" style="margin-bottom:6px"><button class="btn" id="modeCut" style="background:#2b2b2b;color:#fff">🔪 切る</button><button class="btn" id="modePeel">🧅 皮をむく</button></div>
      <p class="hint" id="cutInfo" style="margin-top:-4px">まだ切ってない（まるごと）</p>
      <div class="btns"><button class="btn" id="noOnion">玉ねぎなし</button><button class="btn go" id="toIng">ボウルへ →</button></div>`);
    const setPeel = (on) => { peelMode = on; $("modePeel").style.cssText = on ? "background:#2b2b2b;color:#fff" : ""; $("modeCut").style.cssText = on ? "" : "background:#2b2b2b;color:#fff"; };
    $("modeCut").onclick = () => setPeel(false); $("modePeel").onclick = () => setPeel(true);
    $("toIng").onclick = () => {
      // むいていない皮は、そのまま中に入る
      if (use3D() && Cut3D.peelFrac) { const pf = Cut3D.peelFrac(); if (pf < 0.6) counts.onionSkin = 1; }
      let sprites = null;
      let d3 = null;
      if (use3D()) { onion = Cut3D.toPieces2D(); try { sprites = Cut3D.toSprites(); } catch {} try { if (Cut3D.toBowl) d3 = Cut3D.toBowl(); } catch {} Cut3D.stop(); }
      addOnion(sprites);
      // 3Dのボウルでは、切ったかけらを本物の立体のまま流し入れる(2Dの絵はボウルでは描かない)
      if (d3 && window.Bowl3D && Bowl3D.ok) { Bowl3D.addOnion(d3); for (const pc of pieces) if (pc.id === "onion" || pc.id === "onionL") pc.d3 = true; }
      goIng();
    };
    $("noOnion").onclick = () => { if (use3D()) Cut3D.stop(); onion = []; if (window.Bowl3D && Bowl3D.ok) Bowl3D.clearOnion(); goIng(); };
    if (use3D()) Cut3D.start(() => ({ cy: CY, panelTop: panel.getBoundingClientRect().top }));
  }
  const use3D = () => !!(window.Cut3D && Cut3D.ok);
  let peelSndT = 0;
  function peelSound(all) {
    initAudio();
    if (all) { if (ac) { burst(ac.currentTime, 2400, 1.5, 0.16, 0.18, "highpass"); burst(ac.currentTime + 0.05, 900, 2, 0.1, 0.12); } const ci = $("cutInfo"); if (ci) ci.textContent = "ペリッ！ 皮がきれいにむけた🧅"; return; }
    const now = performance.now(); if (now - peelSndT < 90) return; peelSndT = now; if (ac) burst(ac.currentTime, rnd(3500, 6000), 2, 0.05, 0.05, "highpass");
  }
  const onionR = () => R * 0.62;
  // 凸多角形を直線(点p・法線n)で2つに分ける
  function splitPoly(pts, px, py, nx, ny) {
    const a = [], b = [], n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, x1 = pts[2 * i], y1 = pts[2 * i + 1], x2 = pts[2 * j], y2 = pts[2 * j + 1];
      const d1 = (x1 - px) * nx + (y1 - py) * ny, d2 = (x2 - px) * nx + (y2 - py) * ny;
      (d1 >= 0 ? a : b).push(x1, y1);
      if ((d1 >= 0) !== (d2 >= 0)) { const t = d1 / (d1 - d2), x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; a.push(x, y); b.push(x, y); }
    }
    return a.length >= 6 && b.length >= 6 ? [a, b] : null;
  }
  const polyAreaAbs = (p) => Math.abs(polyArea(p));
  function cutAlong(x1, y1, x2, y2) {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.18) return 0;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    // 線分を少しのばした範囲にかかっているかけらだけ切る(包丁が通った所だけ)
    const ext = 0.12, out = []; let n = 0;
    for (const pc of onion) {
      let lo = Infinity, hi = -Infinity, pos = 0, neg = 0;
      for (let i = 0; i < pc.pts.length; i += 2) {
        const d = (pc.pts[i] - x1) * nx + (pc.pts[i + 1] - y1) * ny; if (d >= 0) pos++; else neg++;
        const t = (pc.pts[i] - x1) * ux + (pc.pts[i + 1] - y1) * uy; lo = Math.min(lo, t); hi = Math.max(hi, t);
      }
      if (!pos || !neg || hi < -ext || lo > L + ext || onion.length + n > 600) { out.push(pc); continue; }
      const sp = splitPoly(pc.pts, x1, y1, nx, ny);
      if (!sp) { out.push(pc); continue; }
      const push = 0.006; // 切れ目がすこし開く
      out.push({ pts: sp[0].map((v, i) => v + (i % 2 ? ny : nx) * push) }, { pts: sp[1].map((v, i) => v - (i % 2 ? ny : nx) * push) });
      n++;
    }
    onion = out; return n;
  }
  function onionStats() {
    const rs = onion.map((pc) => Math.sqrt(polyAreaAbs(pc.pts) / Math.PI)); // 同じ面積の円の半径(玉ねぎ=1)
    return { n: onion.length, max: rs.length ? Math.max(...rs) : 0, avg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0 };
  }
  function updCutInfo() {
    const el = $("cutInfo"); if (!el) return;
    const st = onionStats();
    el.textContent = st.n <= 1 ? "まだ切ってない（まるごと）" : `${st.n}個に切れた（いちばん大きいかけら：${st.max > 0.45 ? "でかい" : st.max > 0.25 ? "ゴロゴロ" : st.max > 0.12 ? "ふつう" : "みじん切り！"}）`;
  }
  let wholeSprite = null, chunks = [], eggImg = null, faceTex = null, faceChunks = null; // face 1 = 形を作った時の上の面 / 0 = 裏
  function addOnion(sprites) {
    if (onionAdded || !onion.length) return;
    onionAdded = true;
    if (onion.length === 1) { counts.onionWhole = 1; wholeSprite = sprites && sprites[0] ? sprites[0] : null; addPieces("onionL", -0.1, -0.1); return; }
    counts.onionCut = onion.length;
    const S = 0.3; // ボウルの中での玉ねぎの大きさ(ボウル半径=1)
    if (sprites && sprites.length) {
      // 3Dで切ったかけらを、そのままの見た目(断面の年輪・皮)で入れる
      for (const sp of sprites) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.72;
        pieces.push({ seq: ++seqN, id: "onion", kind: "sprite", img: sp.img, sw: sp.size * S, x0: -0.25 + sp.x * S, y0: -0.2 + sp.z * S, x1: Math.cos(a) * rr, y1: Math.sin(a) * rr, rot: 0, s: 1 });
      }
      return;
    }
    for (const pc of onion) {
      let cx = 0, cy = 0; const n = pc.pts.length / 2; for (let i = 0; i < n; i++) { cx += pc.pts[2 * i]; cy += pc.pts[2 * i + 1]; } cx /= n; cy /= n;
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.72;
      pieces.push({ seq: ++seqN, id: "onion", kind: "poly", col: "#f4ecd2", poly: pc.pts.map((v, i) => (v - (i % 2 ? cy : cx)) * S), x0: -0.25 + cx * S, y0: -0.2 + cy * S, x1: Math.cos(a) * rr, y1: Math.sin(a) * rr, rot: 0, rot1: rnd(0, 6.3), s: 1 });
    }
  }
  function drawCutBoard(t) {
    if (use3D()) { drawKnife(t); return; }
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.roundRect(CX - R * 1.05 + 8, CY - R * 0.9 + 10, R * 2.1, R * 1.8, 22); ctx.fill();
    ctx.fillStyle = "#e9c48f"; ctx.beginPath(); ctx.roundRect(CX - R * 1.05, CY - R * 0.9, R * 2.1, R * 1.8, 22); ctx.fill();
    ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = "rgba(150,100,50,.25)"; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const y = CY - R * 0.75 + i * R * 0.25; ctx.beginPath(); ctx.moveTo(CX - R * 0.95, y); ctx.bezierCurveTo(CX - R * 0.3, y + 6, CX + R * 0.3, y - 6, CX + R * 0.95, y + 3); ctx.stroke(); }
    const or = onionR();
    // 影
    ctx.fillStyle = "rgba(90,60,20,.18)"; ctx.beginPath(); ctx.ellipse(CX + 6, CY + 10, or * 1.02, or * 1.02, 0, 0, 7); ctx.fill();
    const many = onion.length > 160;
    for (const pc of onion) {
      const p = pc.pts;
      ctx.beginPath(); ctx.moveTo(CX + p[0] * or, CY + p[1] * or);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(CX + p[i] * or, CY + p[i + 1] * or);
      ctx.closePath();
      ctx.fillStyle = "#f6eedb"; ctx.fill();
      if (!many) {
        // 断面の輪(玉ねぎらしい年輪)と外の皮
        ctx.save(); ctx.clip();
        ctx.strokeStyle = "rgba(190,170,120,.55)"; ctx.lineWidth = 1.5;
        for (const r of [0.22, 0.4, 0.57, 0.73, 0.87]) { ctx.beginPath(); ctx.arc(CX, CY, r * or, 0, 7); ctx.stroke(); }
        ctx.strokeStyle = "#d9b26b"; ctx.lineWidth = or * 0.08; ctx.beginPath(); ctx.arc(CX, CY, or * 1.0, 0, 7); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = "rgba(150,120,70,.6)"; ctx.lineWidth = 1; ctx.stroke();
    }
    drawKnife(t);
  }
  function drawKnife(t) {
    // 包丁の跡(シュッ)
    cutFx = cutFx.filter((f) => t - f.t < 260);
    for (const f of cutFx) {
      const u = (t - f.t) / 260;
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`; ctx.lineWidth = 5 * (1 - u) + 1; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    }
    if (cutPath && cutPath.length > 2) {
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cutPath[0], cutPath[1]); for (let i = 2; i < cutPath.length; i += 2) ctx.lineTo(cutPath[i], cutPath[i + 1]); ctx.stroke();
    }
  }
  // なぞった線を、曲がり角ごとのまっすぐな線に分けて切る(ジグザグ切りもOK)
  function applyCutPath(path) {
    const pts = [];
    for (let i = 0; i < path.length; i += 2) pts.push([path[i], path[i + 1]]);
    if (pts.length < 2) return;
    const segs = [];
    let a = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const b = pts[i], c = pts[i + 1];
      if (!c) { segs.push([a, b]); break; }
      const d1 = Math.atan2(b[1] - a[1], b[0] - a[0]), d2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let dd = Math.abs(d2 - d1); if (dd > Math.PI) dd = 2 * Math.PI - dd;
      if (dd > 0.6 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 20) { segs.push([a, b]); a = b; }
    }
    const or = onionR(); let n = 0;
    if (use3D()) { n = Cut3D.cut(segs.map(([p, q]) => [p[0], p[1], q[0], q[1]])); onion = Cut3D.toPieces2D(); }
    for (const [p, q] of segs) {
      if (!use3D()) n += cutAlong((p[0] - CX) / or, (p[1] - CY) / or, (q[0] - CX) / or, (q[1] - CY) / or);
      cutFx.push({ x1: p[0], y1: p[1], x2: q[0], y2: q[1], t: last });
    }
    if (n) { onionCuts++; segs.forEach((_, i) => chop(i * 0.07)); }
    else nz(2500, 1, 0.12, 0.06, "highpass");
    if (onion.length > (use3D() ? 400 : 590)) toast("もう十分こまかい！");
    updCutInfo();
  }

  // ---------- 2. 材料 ----------
  function goIng() {
    stage = "ing";
    $("title").classList.add("hide"); $("result").classList.add("hide");
    setStep("2/7 材料を入れる");
    if (window.Bowl3D && Bowl3D.ok) {
      Bowl3D.setItems(ING); Bowl3D.setMode("ing");
      setPanel(`<p class="hint">材料を<b>つかんでボウルへ</b>入れよう！<br>🥚 たまごは<b>ボウルの縁でたたいて割ろう！！</b></p>
        <div class="btns"><button class="btn" id="resetIng">ぜんぶ出す</button><button class="btn go" id="toKnead">こねる →</button></div>`);
    } else setPanel(`<p class="hint">材料を<b>ボウルまで指で運ぶ</b>（タップでもOK）</p>
      <div class="tray">${ING.map((g) => `<div class="ing${g.joke ? " joke" : ""}" data-id="${g.id}"><b>${g.e}</b><span>${g.name}</span><i>0</i></div>`).join("")}</div>
      <div class="btns"><button class="btn" id="resetIng">ぜんぶ出す</button><button class="btn go" id="toKnead">こねる →</button></div>`);
    for (const el of panel.querySelectorAll(".ing")) { bindIng(el); updBadge(el); }
    $("resetIng").onclick = () => { for (const k of Object.keys(counts)) if (!k.startsWith("onion")) delete counts[k]; pieces = pieces.filter((p) => p.id === "onion" || p.id === "onionL"); meatBits = []; for (const el of panel.querySelectorAll(".ing")) updBadge(el); if (window.Bowl3D && Bowl3D.ok) Bowl3D.resetItems(); };
    let onlyOnionAt = 0;
    $("toKnead").onclick = () => {
      if (!pieces.length && !meatBits.length) { toast("まだ何も入ってないよ！"); return; }
      // 玉ねぎだけ = 材料を入れ忘れ(「ボウルへ」を2回押した等)かも。もう一度押したら、そのまま進む
      const onlyOnion = !meatBits.length && pieces.every((pc) => pc.id === "onion" || pc.id === "onionL");
      if (onlyOnion && !(onlyOnionAt && performance.now() - onlyOnionAt > 800)) { onlyOnionAt = performance.now(); toast("まだ玉ねぎしか入ってないよ！ 材料をボウルに入れよう（玉ねぎだけでいいなら、もう一回押してね）", 3200); return; }
      goKnead();
    };
  }
  if (window.Bowl3D && Bowl3D.ok) Bowl3D.on({
    drop(id, ux, uy, noPiece) {
      const g = ING.find((x) => x.id === id); if (!g) return false;
      if (!NO_LIMIT.has(id) && (counts[id] || 0) >= MAX_EACH) { toast(`${g.name}はもう入らない！`); return false; }
      dropIn(g, ux, uy, noPiece); return true;
    },
    // 注いでいる牛乳: 落ちている所のたまりに量を足す(離れた所に注いだら新しいたまり)
    pour(ux, uy, amt) {
      const d = Math.hypot(ux, uy); if (d > 0.78) { ux *= 0.78 / d; uy *= 0.78 / d; }
      let p = pourPud;
      if (!p || !pieces.includes(p) || Math.hypot(p.x0 - ux, p.y0 - uy) > 0.1) {
        p = pourPud = { seq: ++seqN, id: "milk", kind: "puddle", s: 0.2, col: "#fbf9f2", melt: true, x0: ux, y0: uy, x1: rnd(-0.5, 0.5), y1: rnd(-0.5, 0.5), rot: rnd(0, 6.3), vol: 0, cur: 0 };
        pieces.push(p);
      }
      p.vol += amt;
    },
    egg(kind, ux, uy, heavy) {
      if (kind === "crushed") {
        counts.eggShell = Math.max(0, (counts.eggShell || 0) - 1); counts.egg = (counts.egg || 0) + 1; counts.shellBits = (counts.shellBits || 0) + 1;
        const i = pieces.findIndex((pc) => pc.kind === "egg3d"); if (i >= 0) pieces.splice(i, 1);
        // こねている生地に、黄身と白身がにじむ
        if (mixCv) { const g = mixCv.getContext("2d"), x = 512 + ux / 0.92 * 512, y = 512 + uy / 0.92 * 512; const gr = g.createRadialGradient(x, y, 0, x, y, 70); gr.addColorStop(0, "rgba(255,150,30,.85)"); gr.addColorStop(0.4, "rgba(255,170,60,.45)"); gr.addColorStop(1, "rgba(255,240,220,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 70, 0, 7); g.fill(); }
        squish(); return;
      }
      if (kind === "whole") { dropIn(ING.find((x) => x.id === "eggShell"), ux, uy); toast("たまごを割らずに入れたwww"); return; }
      dropIn(ING.find((x) => x.id === "egg"), ux, uy);
      if (heavy) {
        // 強く割りすぎて殻のかけらが入った
        counts.shellBits = (counts.shellBits || 0) + 1;
        for (let i = 0; i < 4; i++) pieces.push({ seq: ++seqN, id: "shellBits", kind: "shard", s: 0.022, col: "#f6e9d6", x0: ux + rnd(-0.08, 0.08), y0: uy + rnd(-0.08, 0.08), x1: rnd(-0.6, 0.6), y1: rnd(-0.6, 0.6), rot: rnd(0, 6.3) });
        toast("あ…殻のかけらも入っちゃった");
      } else toast("パカッ！ きれいに割れた");
    },
    sound(n) {
      if (n === "crack") knock(false);
      else if (n === "crackHard") knock(true);
      else if (n === "open") eggOpen();
      else if (n === "pour") { burst(ac.currentTime, 900 + Math.random() * 500, 0.8, 0.12, 0.16, "lowpass"); burst(ac.currentTime + 0.03, 2200 + Math.random() * 800, 2, 0.05, 0.08); }
      else if (n === "shake") { const t0 = ac.currentTime; for (let i = 0; i < 6; i++) burst(t0 + i * 0.012 + Math.random() * 0.01, 5000 + Math.random() * 3000, 2, 0.08, 0.02); }
      else if (n === "splat") { ping(ac.currentTime, 300, 120, 0.2, 0.12); }
    },
    toast(t) { toast(t); },
  });
  function updBadge(el) { const n = counts[el.dataset.id] || 0; el.classList.toggle("has", n > 0); el.querySelector("i").textContent = n; }
  const ghost = $("ghost");
  let flying = [];
  function bindIng(el) {
    const id = el.dataset.id, g = ING.find((x) => x.id === id);
    let drag = null;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch {}
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      ghost.textContent = g.e; ghost.style.display = "block"; ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
      ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
    });
    const up = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      ghost.style.display = "none";
      const inBowl = Math.hypot(e.clientX - CX, e.clientY - CY) < R * 1.05;
      if (!drag.moved) flyIn(g, el);                     // タップ: 飛んでいって入る
      else if (inBowl) { const u = unitAt(e.clientX, e.clientY); dropIn(g, u[0], u[1]); }
      drag = null; updBadge(el);
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", (e) => { if (drag && drag.id === e.pointerId) { ghost.style.display = "none"; drag = null; } });
  }
  // 画面の点 → ボウルの中の位置(ボウル半径=1)
  function unitAt(x, y) {
    if (window.Bowl3D && Bowl3D.running) { const u = Bowl3D.toUnit(x, y); if (u) return [u[0] * 0.92, u[1] * 0.92]; }
    return [(x - CX) / R, (y - CY) / R];
  }
  let pourPud = null;
  function dropIn(g, ux, uy, noPiece) {
    if (!NO_LIMIT.has(g.id) && (counts[g.id] || 0) >= MAX_EACH) { toast(`${g.name}はもう入らない！`); return; }
    const d = Math.hypot(ux, uy); if (d > 0.7) { ux *= 0.7 / d; uy *= 0.7 / d; }
    counts[g.id] = (counts[g.id] || 0) + 1;
    if (!noPiece) addPieces(g.id, ux, uy);
    if (window.Bowl3D && Bowl3D.ok && Bowl3D.isSolid && Bowl3D.isSolid(g.id)) Bowl3D.spawn(g.id, ux, uy); // 3Dの物として落とす if (g.id === "meat" && window.Bowl3D && Bowl3D.ok && Bowl3D.hasOnion) Bowl3D.bury(ux, uy);
    if (g.id !== "salt" && g.id !== "nutmeg" && g.id !== "milk") plop();
    const el = panel.querySelector(`.ing[data-id="${g.id}"]`); if (el) updBadge(el);
    if (g.id === "onionL" && counts.onionL === 1) toast("玉ねぎ…まるごと…？");
    if (g.id === "eggShell" && counts.eggShell === 1) toast("殻ごといった！");
    if (g.joke && counts[g.id] === 1) toast(`${g.name}…入れるんだ…`);
  }
  function flyIn(g, el) {
    const r = el.getBoundingClientRect();
    flying.push({ g, x: r.left + r.width / 2, y: r.top + r.height / 2, tx: CX + rnd(-0.4, 0.4) * R, ty: CY + rnd(-0.4, 0.4) * R, t0: performance.now() });
  }

  // ---------- 2. こねる ----------
  // こねる時の中身(この絵を指で引きずって混ぜる)
  let mixCv = null;
  // ---------- こねる: 入れた材料から「かたさ」「まざりやすさ」「混ぜた色」を数値で決める ----------
  // 色と、色の強さ(見た目にどれだけ効くか / 1つあたり)
  const MIXC = {
    meat: [[185, 86, 75], 1], onion: [[239, 230, 200], 0.35], egg: [[246, 181, 74], 0.25], milk: [[247, 243, 234], 0.2],
    panko: [[220, 192, 138], 0.15], cheese: [[255, 211, 77], 0.15], banana: [[243, 231, 166], 0.3], choco: [[74, 36, 20], 0.7],
    straw: [[224, 56, 74], 0.5], natto: [[154, 106, 44], 0.3], nutmeg: [[122, 74, 36], 0.03], flour: [[246, 241, 230], 0.35],
  };
  function mixModel() {
    const c = (k) => counts[k] || 0, onion = c("onionCut") || c("onionWhole") ? 1 : 0, meat = c("meat");
    // 水分: 卵・牛乳(と果物) / パン粉が吸う
    const liquid = c("egg") * 0.3 + c("milk") * 0.3 + c("banana") * 0.1 + c("straw") * 0.1;
    const absorb = c("panko") * 0.35 + c("flour") * 0.3; // パン粉・小麦粉は水分を吸う
    const wet = meat ? (liquid - absorb) / Math.max(0.5, meat * 0.6) : 2;
    // かたさ → まざりやすさ(水分が多いほど指が通りやすい)
    let tex, ease;
    if (!meat) { tex = "肉がない…"; ease = 1.5; }
    else if (wet < -0.05) { tex = "パサパサ"; ease = 0.55; }
    else if (wet < 0.1) { tex = "かため"; ease = 0.75; }
    else if (wet < 0.45) { tex = "しっとり（ちょうどいい）"; ease = 1; }
    else if (wet < 0.9) { tex = "やわらかめ"; ease = 1.2; }
    else { tex = "ベチャベチャ"; ease = 1.45; }
    if (c("natto")) ease *= 0.85; // ネバネバで重い
    // 量が多いほど混ぜるのが大変
    const vol = meat + onion * 0.8 + liquid + c("panko") * 0.15 + c("cheese") * 0.2 + c("banana") * 0.3 + c("choco") * 0.15 + c("straw") * 0.15 + c("natto") * 0.2;
    ease /= Math.sqrt(Math.max(1, vol / 3));
    // 混ぜた色 = 材料の色を、量と色の強さで平均
    let sw = 0; const col = [0, 0, 0];
    for (const [k, [rgb, w0]] of Object.entries(MIXC)) {
      const n = k === "onion" ? onion : c(k); if (!n) continue;
      const w = w0 * n; sw += w; for (let i = 0; i < 3; i++) col[i] += rgb[i] * w;
    }
    const mixRGB = sw ? col.map((v) => Math.round(v / sw)) : [226, 205, 160];
    const easeLabel = ease >= 1.15 ? "まざりやすい" : ease >= 0.85 ? "ふつう" : "まざりにくい";
    return { wet, tex, ease, vol, col: mixRGB, easeLabel };
  }
  let MM = null, mixTile = null;
  // 生地の状態: meat=ひき肉がつなぎ(ハンバーグになる) / liquid=肉なしで液体が多い(丸められない・焼くと卵焼きや膜に) / pile=肉なしで具材だけ(まとまらない・ばらばら)
  let DK = { kind: "meat", vol: 4 };
  // ---------- 隠しレシピ(肉なしで、本物の料理になる組み合わせ) ----------
  const RECIPES = [
    { id: "crepe", e: "🥞", name: "クレープ", hint: "卵・牛乳・白い粉…うす〜く焼いたら？" },
    { id: "pancake", e: "🥞", name: "パンケーキ", hint: "クレープより粉を多めにすると…？" },
    { id: "omelette", e: "🍳", name: "オムレツ", hint: "卵と牛乳だけで焼いたら？" },
    { id: "tamago", e: "🍳", name: "卵焼き", hint: "卵だけで焼いたら？" },
    { id: "milkfilm", e: "🥛", name: "ホットミルクの膜", hint: "牛乳だけ焼いたら…？" },
  ];
  const recipeOf = (id) => RECIPES.find((r) => r.id === id);
  function findRecipe() {
    const c = (k) => counts[k] || 0;
    if (c("meat") || c("eggShell") || c("natto") || c("onionCut") || c("onionWhole")) return null;
    const egg = c("egg"), milk = c("milk"), flour = c("flour");
    if (flour && egg && milk) return flour >= Math.max(3, egg + milk) ? "pancake" : "crepe";
    if (flour) return null;
    if (egg && milk) return "omelette";
    if (egg) return "tamago";
    if (milk) return "milkfilm";
    return null;
  }
  const foundRecipes = () => { try { return JSON.parse(localStorage.getItem("hb_recipes") || "[]"); } catch { return []; } };
  function markFound(id) { const f = foundRecipes(); if (!f.includes(id)) { f.push(id); try { localStorage.setItem("hb_recipes", JSON.stringify(f)); } catch {} return true; } return false; }
  function dough() {
    const c = (k) => counts[k] || 0, meat = c("meat");
    const rec = findRecipe();
    if (rec) return { kind: "liquid", recipe: rec, vol: Math.max(0.3, c("egg") * 0.3 + c("milk") * 0.3 + c("flour") * 0.25), eggy: c("egg") >= c("milk") && !c("flour"), liquid: 1, solid: 0 };
    const liquid = c("egg") * 0.3 + c("milk") * 0.3;
    const solid = (c("onionCut") || c("onionWhole") ? 0.8 : 0) + c("panko") * 0.15 + c("cheese") * 0.2 + c("choco") * 0.15 + c("natto") * 0.2 + c("banana") * 0.3 + c("straw") * 0.15 + c("eggShell") * 0.4;
    const vol = (MM || mixModel()).vol;
    if (meat) return { kind: "meat", vol, liquid, solid };
    if (liquid > 0 && liquid >= solid * 0.8) return { kind: "liquid", vol: Math.max(0.3, liquid + solid), eggy: c("egg") >= c("milk"), liquid, solid };
    return { kind: "pile", vol: Math.max(0.3, liquid + solid), liquid, solid };
  }
  // 焼けた時の色味(何が焼けているか)
  const searTint = () => DK.recipe === "crepe" ? "rgb(196,124,52)" : DK.recipe === "pancake" ? "rgb(184,108,42)" : DK.kind === "liquid" ? (DK.eggy ? "rgb(214,150,52)" : "rgb(176,116,62)") : "rgb(150,90,46)";
  // 糖分が多いと早くこげる / 薄いと早く焼ける
  function cookRate() {
    const c = (k) => counts[k] || 0, sugar = c("choco") + c("banana") + c("straw") + c("milk") * 0.25 + c("cheese") * 0.3;
    if (DK.recipe && DK.recipe !== "milkfilm") return 1.1; // 隠しレシピの生地は、ハンバーグと同じくらいの速さで焼ける
    return (DK.kind === "pile" ? 1.15 : Math.max(0.7, Math.min(DK.kind === "meat" ? 1.1 : 2.2, Math.sqrt(0.62 / Math.max(0.05, hRatio))))) * (1 + Math.min(0.6, sugar * 0.12));
  }
  // 混ぜた色のひき肉模様(赤身/脂のつぶも、混ぜた色に合わせる)
  function mixPattern(g) {
    if (!mixTile) {
      const c = document.createElement("canvas"); c.width = c.height = 220; const x = c.getContext("2d"), [r0, g0, b0] = MM ? MM.col : [185, 86, 75];
      x.fillStyle = `rgb(${r0},${g0},${b0})`; x.fillRect(0, 0, 220, 220);
      const sh = (k) => `rgb(${Math.min(255, r0 * k) | 0},${Math.min(255, g0 * k) | 0},${Math.min(255, b0 * k) | 0})`;
      for (let i = 0; i < 2400; i++) {
        const px = Math.random() * 220, py = Math.random() * 220, rr = 1.2 + Math.random() * 3;
        x.fillStyle = Math.random() < 0.12 ? "rgba(246,228,214,.9)" : sh(0.78 + Math.random() * 0.4);
        x.beginPath(); x.ellipse(px, py, rr * (1 + Math.random()), rr, Math.random() * 3, 0, 7); x.fill();
      }
      mixTile = c;
    }
    return g.createPattern(mixTile, "repeat");
  }
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  // v = 指の速さ(ボウルの半径/秒)。速いほど大きく強く引きずる
  function smudge(x0, y0, x1, y1, v = 3) {
    const sp01 = clamp01(v / 5), wet = MM ? MM.wet : 0.3;
    const g = mixCv.getContext("2d"), rb = 60 + 24 * sp01, L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.min(6, Math.ceil(L / (rb * 0.45)))); // 速く動かしても処理が増えすぎない(重くなって遅れない)
    g.save(); g.beginPath(); g.arc(512, 512, 512, 0, 7); g.clip();
    for (let i = 1; i <= n; i++) {
      const ax = x0 + (x1 - x0) * (i - 1) / n, ay = y0 + (y1 - y0) * (i - 1) / n, bx = x0 + (x1 - x0) * i / n, by = y0 + (y1 - y0) * i / n;
      g.save(); g.beginPath(); g.arc(bx, by, rb, 0, 7); g.clip(); g.globalAlpha = 0.6 + 0.3 * sp01;
      g.drawImage(mixCv, ax - rb, ay - rb, rb * 2, rb * 2, bx - rb, by - rb, rb * 2, rb * 2);
      g.restore();
    }
    // こねるほど材料が肉の中にうずまる
    if (meatBits.length) { g.globalAlpha = 0.1 + 0.06 * sp01; g.fillStyle = mixPattern(g); g.beginPath(); g.arc(x1, y1, rb * 0.85, 0, 7); g.fill(); }
    // かたさの見た目: パサパサ=ボロボロのすき間 / 水っぽい=汁がにじむ
    if (wet < 0.1 && meatBits.length) { g.globalAlpha = 0.22 * clamp01((0.1 - wet) / 0.3); g.fillStyle = "#5a1d16"; for (let k = 0; k < 5; k++) { const a = Math.random() * 7, r = Math.random() * rb * 0.8; g.beginPath(); g.ellipse(x1 + Math.cos(a) * r, y1 + Math.sin(a) * r, 2 + Math.random() * 4, 1 + Math.random() * 2, a, 0, 7); g.fill(); } }
    if (wet > 0.6) { g.globalAlpha = 0.05 * clamp01((wet - 0.6) / 0.6) + 0.02; g.fillStyle = "#f3eee2"; g.beginPath(); g.ellipse(x1, y1, rb * 0.6, rb * 0.35, Math.atan2(y1 - y0, x1 - x0), 0, 7); g.fill(); }
    // 速く・水っぽいと、まわりに飛び散る
    if (v > 6 && wet > 0.3 && Math.random() < 0.5) { g.globalAlpha = 0.5; g.fillStyle = MM ? `rgb(${MM.col.join(",")})` : "#b9564b"; for (let k = 0; k < 3; k++) { const a = Math.random() * 7, r = rb * (0.9 + Math.random() * 0.6); g.beginPath(); g.arc(x1 + Math.cos(a) * r, y1 + Math.sin(a) * r, 2 + Math.random() * 3, 0, 7); g.fill(); } }
    // 混ざった材料の細かいつぶ
    const sp = [];
    if (counts.onionCut || counts.onionWhole) sp.push("#efe6c8", "#f4ecd2");
    if (counts.panko) sp.push("#e2c48a"); if (counts.cheese) sp.push("#ffd34d"); if (counts.egg) sp.push("#ffa63a"); if (counts.salt) sp.push("#222", "#f4f4f4");
    if (sp.length) { g.globalAlpha = 0.75; for (let k = 0; k < 4; k++) { const a = Math.random() * 7, r = Math.random() * rb * 0.8; g.fillStyle = sp[Math.random() * sp.length | 0]; const w = 2 + Math.random() * 4; g.fillRect(x1 + Math.cos(a) * r, y1 + Math.sin(a) * r, w, w * (0.6 + Math.random() * 0.6)); } }
    // 指でえぐった筋(影とつや)
    const nx = -(y1 - y0) / (L || 1), ny = (x1 - x0) / (L || 1);
    g.lineCap = "round";
    g.globalAlpha = 0.045; g.strokeStyle = "#3a0d08"; g.lineWidth = 16; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.globalAlpha = 0.012 + 0.07 * clamp01(wet / 0.9); g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 + nx * 10, y0 + ny * 10); g.lineTo(x1 + nx * 10, y1 + ny * 10); g.stroke();
    g.restore();
  }
  function goKnead() {
    mixCv = document.createElement("canvas"); mixCv.width = mixCv.height = 1024;
    knead = 0; swirl = 0; drawContents(mixCv.getContext("2d"), 512, 512, 512 / 0.92);
    // 3Dの玉ねぎがある所に、肉にまざる小さな玉ねぎのつぶを描いておく(こねると広がる)
    if (window.Bowl3D && Bowl3D.ok && Bowl3D.hasOnion) {
      const g = mixCv.getContext("2d"), RR = 512 / 0.92;
      for (const [ux, uy, sz] of Bowl3D.onionSpots()) for (let i = 0; i < 3 + sz * 30; i++) {
        const a = Math.random() * 7, q = Math.random() * sz;
        g.fillStyle = Math.random() < 0.7 ? "#efe7cb" : "#e2d7b0"; g.beginPath(); g.ellipse(512 + (ux + Math.cos(a) * q) * RR, 512 + (uy + Math.sin(a) * q) * RR, RR * rnd(0.008, 0.017), RR * rnd(0.005, 0.011), a, 0, 7); g.fill();
      }
    }
    MM = mixModel(); mixTile = null;
    stage = "knead"; setStep("3/7 こねる"); if (window.Bowl3D && Bowl3D.ok) Bowl3D.setMode("knead");
    setPanel(`<p class="hint">ボウルの中を<b>指でぐるぐるこねる！</b></p>
      <p class="hint" id="mixInfo" style="margin:-2px 0 4px;font-size:12px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:-2px;background:rgb(${MM.col.join(",")});border:1px solid #0002"></span> かたさ：<b>${MM.tex}</b> ・ ${MM.easeLabel}（×${MM.ease.toFixed(2)}）<br><span id="speedInfo">指の速さ：—</span> ・ まざり <b id="mixPct">0%</b></p>
      <div class="meter"><i id="kneadBar"></i></div>
      <div class="btns"><button class="btn" id="backIng">‹ 材料</button><button class="btn go" id="toShape" disabled>形を作る →</button></div>`);
    $("backIng").onclick = () => { goIng(); knead = 0; mixCv = null; };
    $("toShape").onclick = goToss;
  }
  // ハンバーグのタネ: 混ぜた色のひき肉(赤身・脂・すじ) + よく混ざった具材の細かいつぶ
  function meatTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
    const b = MM ? MM.col : [185, 86, 75], cnt = (k) => counts[k] || 0;
    if (DK.kind === "liquid") {
      // 肉がない液体(卵・牛乳): ひき肉のつぶはない。なめらかで、白身や牛乳のすじが流れる
      const base = DK.recipe === "crepe" || DK.recipe === "pancake" ? [247, 226, 178] : DK.recipe === "omelette" ? [252, 210, 96] : DK.eggy ? [250, 196, 70] : [246, 242, 232]; g.fillStyle = `rgb(${base.join(",")})`; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 60; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 20 + Math.random() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cnt("milk") && DK.eggy ? "rgba(255,248,232,.35)" : "rgba(255,255,255,.12)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      if (cnt("onionCut")) for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(242,234,206,.7)"; g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 3); }
      if (cnt("salt")) for (let i = 0; i < Math.min(400, cnt("salt") * 50); i++) { g.fillStyle = "rgba(25,20,18,.7)"; g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1); }
      return c;
    }
    const sh = (k, a = 1) => `rgba(${Math.min(255, b[0] * k) | 0},${Math.min(255, b[1] * k) | 0},${Math.min(255, b[2] * k) | 0},${a})`;
    g.fillStyle = sh(0.95); g.fillRect(0, 0, 512, 512);
    // ふんわりした明暗(でこぼこ)
    for (let i = 0; i < 260; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 10 + Math.random() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r); const l = Math.random() < 0.5; gr.addColorStop(0, l ? "rgba(255,235,225,.08)" : "rgba(40,10,5,.09)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    // ひき肉のつぶ(赤身・こい赤身・脂)
    for (let i = 0; i < 11000; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = 1.2 + Math.random() * 2.8, q = Math.random();
      g.fillStyle = q < 0.07 ? `rgba(240,218,206,${0.6 + Math.random() * 0.25})` : q < 0.3 ? sh(0.72 + Math.random() * 0.1) : sh(0.88 + Math.random() * 0.3);
      g.beginPath(); g.ellipse(x, y, r * (1 + Math.random()), r, Math.random() * 3, 0, 7); g.fill();
    }
    // ひき肉のすじ(ミンチの細いひも)
    g.lineCap = "round";
    for (let i = 0; i < 700; i++) { const x = Math.random() * 512, y = Math.random() * 512, a = Math.random() * 7, L = 5 + Math.random() * 10; g.strokeStyle = Math.random() < 0.5 ? sh(1.12, 0.6) : sh(0.7, 0.5); g.lineWidth = 1.5 + Math.random() * 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * L * 0.6, y + Math.sin(a + 1) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
    // 混ざった具材の細かいつぶ
    const bits = (n, col, s0, s1, shape) => { for (let i = 0; i < n; i++) { const x = Math.random() * 512, y = Math.random() * 512, s = s0 + Math.random() * (s1 - s0), a = Math.random() * 7; g.fillStyle = typeof col === "function" ? col() : col; g.beginPath(); if (shape === "poly") { for (let k = 0; k < 5; k++) { const aa = a + k * 1.26, rr = s * (0.6 + Math.random() * 0.5); k ? g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr) : g.moveTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } g.closePath(); } else g.ellipse(x, y, s, s * (0.5 + Math.random() * 0.4), a, 0, 7); g.fill(); } };
    if (cnt("onionCut")) bits(150, () => `rgba(242,234,206,${0.55 + Math.random() * 0.3})`, 1.5, 4.5, "poly");
    if (cnt("panko")) bits(Math.min(500, cnt("panko") * 140), "rgba(226,196,140,.85)", 0.8, 2, "poly");
    if (cnt("salt")) bits(Math.min(600, cnt("salt") * 70), "rgba(25,20,18,.8)", 0.5, 1.1);
    if (cnt("nutmeg")) bits(Math.min(300, cnt("nutmeg") * 50), "rgba(120,70,30,.7)", 0.5, 1.2);
    if (cnt("cheese")) bits(Math.min(200, cnt("cheese") * 35), "rgba(255,206,70,.9)", 2.5, 5, "poly");
    if (cnt("choco")) bits(Math.min(200, cnt("choco") * 30), "rgba(70,34,18,.95)", 2.5, 5.5, "poly");
    if (cnt("straw")) bits(Math.min(160, cnt("straw") * 25), "rgba(214,46,62,.9)", 2, 4.5, "poly");
    if (cnt("banana")) bits(Math.min(160, cnt("banana") * 22), "rgba(246,234,170,.9)", 2.5, 5, "poly");
    if (cnt("natto")) { bits(Math.min(240, cnt("natto") * 30), "rgba(160,110,48,.95)", 2.5, 3.5); bits(Math.min(240, cnt("natto") * 30), "rgba(255,255,255,.35)", 0.6, 1); }
    return c;
  }
  // こねた生地の絵(混ぜた色・玉ねぎやパン粉のつぶ入り)を切り出す
  function texFromMix() {
    if (!mixCv) return null;
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const g = c.getContext("2d"), src = 2 * 0.6 * 512 / 0.92;
    const b = MM ? MM.col : [185, 86, 75]; g.fillStyle = `rgb(${b.join(",")})`; g.fillRect(0, 0, 512, 512);
    g.drawImage(mixCv, 512 - src / 2, 512 - src / 2, src, src, 0, 0, 512, 512);
    return c;
  }

  // ---------- 4. 空気ぬき(手から手へペチペチ) ----------
  // 画面をタップ → 反対の手へ投げる。キャッチするたびに空気がぬけて、やりすぎると平べったくなる
  let tossN = 0, toss = null, tossTex = null, tossChunks = null;
  // こね終わっても肉から出ている具材: { img, sw(大きさ), nx, ny(生地の中の位置 -1〜1), vis(出ている割合), id, crushed }
  function visibleChunks() {
    const out = [];
    if (!(window.Bowl3D && Bowl3D.ok && (Bowl3D.hasOnion || Bowl3D.hasSolids || Bowl3D.hasEgg) && Bowl3D.onionVisible)) return out;
    const sprs = pieces.filter((pc) => pc.id === "onion" && pc.kind === "sprite");
    for (const v of Bowl3D.onionVisible(!!DK.recipe)) {
      if (DK.kind === "pile" || DK.recipe) v.vis = 1; // 具材だけ / 隠しレシピのトッピングは全部見える
      if (v.vis < 0.2) continue;
      let img, sw;
      if (v.id === "onion") { const sp = sprs[v.idx]; if (!sp) continue; img = sp.img; sw = sp.sw; }
      else { img = Bowl3D.solidSprite(v.body); sw = Bowl3D.solidSize(v.body) * 1.15 / 1.8; }
      const d = Math.hypot(v.ux, v.uy), k = d > 0.75 ? 0.75 / d : 1;
      out.push({ img, sw, body: v.body, nx: v.ux * k / 0.8, ny: v.uy * k / 0.8, vis: v.vis, id: v.id, rot: rnd(0, 6.3), crushed: false });
    }
    if (Bowl3D.eggList) for (const e of Bowl3D.eggList()) { const d = Math.hypot(e.ux, e.uy), k = d > 0.6 ? 0.6 / d : 1; out.push({ img: Bowl3D.eggSprite(), sw: 0.3, mesh: e.mesh, nx: e.ux * k / 0.8, ny: e.uy * k / 0.8, vis: 0.7, id: "eggwhole", rot: rnd(0, 6.3), crushed: false }); }
    // 生地の中にうまっている、いちご・バナナ: 見えないけど、叩くとつぶれて汁がしみ出す
    if (Bowl3D.solidList) for (const sd of Bowl3D.solidList()) {
      if (sd.id !== "straw" && sd.id !== "banana") continue;
      if (out.some((o) => o.id === sd.id && Math.hypot(o.nx * 0.8 - sd.ux, o.ny * 0.8 - sd.uy) < 0.05)) continue;
      const d = Math.hypot(sd.ux, sd.uy), k = d > 0.75 ? 0.75 / d : 1;
      out.push({ img: null, sw: 0, nx: sd.ux * k / 0.8, ny: sd.uy * k / 0.8, vis: 0.35, id: sd.id, rot: 0, crushed: false, hidden: true });
    }
    return out;
  }
  // 叩いた時: 出ている具材は生地に押しこまれる。いちご・バナナはつぶれて、ジャムのように生地を染める
  const MUSH = { straw: { c: [176, 22, 38], seed: true }, banana: { c: [236, 220, 160] }, choco: { c: [70, 34, 18] }, cheese: { c: [255, 205, 80] }, natto: { c: [150, 100, 40] } };
  function slapChunks() {
    if (!tossChunks || !tossTex) return;
    const g = tossTex.getContext("2d");
    for (const ch of tossChunks) {
      if (ch.crushed) continue;
      ch.vis -= rnd(0.015, 0.035); // かたい物は少しずつ押しこまれる
      const m = MUSH[ch.id];
      if (m && (ch.id === "straw" || ch.id === "banana")) ch.vis -= 0.07; // やわらかい物はすぐつぶれる
      if (m) {
        // 生地の絵に、つぶれた汁を広げる(何回も叩くほど広がる)
        const x = 256 + ch.nx * 256 / 1.05 * 0.8, y = 256 + ch.ny * 256 / 1.05 * 0.8, r = 18 + (1 - Math.max(0, ch.vis)) * 34;
        for (let k = 0; k < 5; k++) {
          const a = Math.random() * 7, d = Math.random() * r * 0.5, rx = r * (0.5 + Math.random() * 0.6);
          const gr = g.createRadialGradient(x + Math.cos(a) * d, y + Math.sin(a) * d, 0, x + Math.cos(a) * d, y + Math.sin(a) * d, rx);
          gr.addColorStop(0, `rgba(${m.c.join(",")},.55)`); gr.addColorStop(0.7, `rgba(${m.c.join(",")},.25)`); gr.addColorStop(1, `rgba(${m.c.join(",")},0)`);
          g.fillStyle = gr; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, rx, rx * (0.5 + Math.random() * 0.5), a, 0, 7); g.fill();
        }
        if (m.seed) { g.fillStyle = "rgba(240,205,90,.9)"; for (let k = 0; k < 6; k++) { const a = Math.random() * 7, d = Math.random() * r * 0.8; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6, 2.4, a, 0, 7); g.fill(); } }
        g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.25, r * 0.25, r * 0.07, -0.5, 0, 7); g.fill(); // ジャムのつや
      }
      if (ch.vis <= 0.05) ch.crushed = true; // 生地の中に入りきった(つぶれた)
    }
  }
  const tossThin = () => clamp01((tossN - 14) / 20); // 0=ふつう 1=ペラペラ
  function tossLabel() {
    return tossN === 0 ? "まだ空気が入ってる" : tossN < 4 ? "もう少しペチペチ" : tossN < 15 ? "いい感じ！空気がぬけた" : tossN < 25 ? "ちょっと平べったくなってきた" : "ペラペラ…やりすぎww";
  }
  function goToss() {
    DK = dough();
    if (DK.kind !== "meat") return goNoForm();
    toss3 = false;
    stage = "toss"; setStep("4/7 空気をぬく"); if (window.Bowl3D && Bowl3D.ok) Bowl3D.stop();
    tossN = 0; tossTex = meatTexture(); toss = { at: 0, fly: null, queue: 0, squash: 0, dip: [0, 0] };
    // こねた中身の絵(混ざりきっていない所・材料のすじ)も、生地の表面に残す
    { const mt = texFromMix(); if (mt) { const g = tossTex.getContext("2d"); g.globalAlpha = 0.42; g.drawImage(mt, 0, 0, 512, 512); g.globalAlpha = 1; } }
    tossChunks = visibleChunks();
    setPanel(`<p class="hint">画面をタップして<b>手から手へペチペチ！</b>（空気をぬく）</p>
      <p class="hint" style="margin:-2px 0 4px;font-size:13px">ペチ × <b id="tossN">0</b> ・ <span id="tossLb">${tossLabel()}</span></p>
      <div class="btns"><button class="btn go" id="toShape2">形を作る →</button></div>`);
    $("toShape2").onclick = goShape;
  }
  // 肉(つなぎ)がない: 手で丸められない → ボウルのまま、まな板で形も作れない。そのまま焼く
  let toss3 = false, tossRes = { lost: 0, crushed: 0, cracked: 0 };
  function goNoForm() {
    const liq = DK.kind === "liquid";
    tossN = 0; tossTex = meatTexture(); tossChunks = visibleChunks(); tossRes = { lost: 0, crushed: 0, cracked: 0 };
    // 手でペチペチもできる(3D): 液体は飛び散り、具材はつぶれたり落ちたりする
    toss3 = !!(window.Toss3D && Toss3D.ok);
    if (toss3) {
      const hh = Math.min(H * 0.42, R * 1.55), F = hh * 0.3 / 0.75 * (liq ? 1 : 2.2);
      try {
        if (liq) Toss3D.setup({ kind: "liquid", col: DK.eggy ? [250, 190, 60] : [248, 246, 240], F });
        else Toss3D.setup({ kind: "pile", F, list: tossChunks.filter((ch) => ch.mesh || (ch.body && ch.body.mesh)).map((ch) => ({ ch, src: ch.mesh || ch.body.mesh, id: ch.id })) });
      } catch (e) { console.warn(e); toss3 = false; }
    }
    if (toss3) { stage = "toss"; setStep("4/7 空気をぬく？"); if (window.Bowl3D && Bowl3D.ok) Bowl3D.stop(); toss = { at: 0, fly: null, queue: 0, squash: 0, dip: [0, 0] }; }
    const rc = DK.recipe && recipeOf(DK.recipe);
    setPanel(`<p class="hint">${rc && (DK.recipe === "crepe" || DK.recipe === "pancake") ? "あれ…？ これ、ハンバーグじゃなくて<b>" + (DK.recipe === "crepe" ? "クレープ" : "パンケーキ") + "の生地</b>になってない！？" : liq ? "ひき肉がないから<b>まとまらない…</b>手ですくっても指のすきまから流れ落ちる" : "ひき肉(つなぎ)がないから<b>まとまらない…</b>丸めてもボロボロくずれる"}</p>
      <p class="hint" style="margin:-2px 0 4px;font-size:12px">${toss3 ? "それでもタップで手から手へペチペチできる（" + (liq ? "飛び散るよ" : "つぶれたり落ちたり") + "）<br>" : ""}形は作れないので、${liq ? "フライパンに流しこんで焼くしかない" : "具材をそのままフライパンへ"}<br><span id="tossLb"></span></p>
      <div class="btns"><button class="btn" id="backIng2">‹ 材料</button><button class="btn go" id="toCookNF">${liq ? "流しこんで焼く →" : "そのまま焼く →"}</button></div>`);
    $("backIng2").onclick = () => { toss3 = false; toss = null; goIng(); knead = 0; mixCv = null; };
    $("toCookNF").onclick = () => {
      if (toss3) {
        // ペチペチした結果: 液体は手からこぼれた分だけ減る / 具材は落ちた物はなくなり、つぶれた物は平たいまま
        const res = Toss3D.result();
        if (liq) DK.vol *= Math.max(0.15, res.vol);
        else for (const it of res.items) { if (it.lost || it.cracked) it.ch.crushed = true; else it.ch.sq = it.sq; }
        if (!liq && tossChunks.every((ch) => ch.crushed || ch.hidden || !(ch.mesh || ch.body))) { const k = res.items.find((x) => !x.lost); if (k) k.ch.crushed = false; }
      }
      toss3 = false; toss = null;
      if (window.Bowl3D && Bowl3D.ok) Bowl3D.stop();
      // 形は自分で広がった形(液体=丸く広がる / 具材=ばらばらに散らばる)
      const n = 72, rr = R * (liq ? 0.62 : 0.5), ph = Math.random() * 7, p = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = liq ? 1 + 0.06 * Math.sin(a * 3 + ph) + 0.04 * Math.sin(a * 5 + ph * 2) : 1 + 0.18 * Math.sin(a * 4 + ph) + 0.1 * Math.sin(a * 7 + ph); p.push(CX + Math.cos(a) * rr * w, CY + Math.sin(a) * rr * w * 0.85); }
      drawPts = p; finishShape(true); if (shape) goCook();
    };
  }
  function tossThrow() {
    if (!toss || toss.fly) return;
    toss.fly = { from: toss.at, to: 1 - toss.at, t0: performance.now(), dur: toss.speed || 200 };
    if (ac) burst(ac.currentTime, 700, 0.8, 0.05, 0.12, "lowpass"); // ひゅっ
  }
  function slap() {
    if (!ac) return;
    const t = ac.currentTime;
    burst(t, rnd(1300, 1900), 1.2, 0.5, 0.05); burst(t, rnd(260, 380), 1.5, 0.45, 0.09, "lowpass"); burst(t + 0.015, rnd(3000, 4200), 3, 0.12, 0.04);
  }
  // 手(拍手する形: 指を上に向けて、手のひらが画面のまん中を向く)。side=0 左手 / 1 右手
  function drawHand(x, y, s, side, dip) {
    ctx.save(); ctx.translate(x + (side ? 1 : -1) * dip * s * 0.1, y);
    if (side === 0) ctx.scale(-1, 1);              // 左手は右手の左右反転
    ctx.rotate(-0.12);                              // 指先が少しまん中へ傾く
    ctx.scale(0.62, 1);                             // 手のひらが斜めにまん中を向いて見える
    const skin = ctx.createLinearGradient(-s * 0.5, 0, s * 0.5, 0); skin.addColorStop(0, "#f7d5b6"); skin.addColorStop(1, "#dfa881");
    ctx.shadowColor = "rgba(60,30,15,.3)"; ctx.shadowBlur = s * 0.2; ctx.shadowOffsetX = s * 0.08; ctx.shadowOffsetY = s * 0.1;
    ctx.fillStyle = skin;
    // 手首〜うで(下の画面の外へ)
    ctx.beginPath(); ctx.roundRect(-s * 0.3, s * 0.2, s * 0.6, s * 3, s * 0.28); ctx.fill();
    // 手のひら
    ctx.beginPath(); ctx.roundRect(-s * 0.4, -s * 0.42, s * 0.8, s * 0.82, s * 0.28); ctx.fill();
    ctx.shadowColor = "transparent";
    // 指(上向き・人差し指〜小指)
    const fx = [-0.29, -0.1, 0.1, 0.29], fl = [0.52, 0.6, 0.56, 0.44];
    for (let k = 0; k < 4; k++) {
      const x0 = fx[k] * s, L = fl[k] * s, w = s * 0.18;
      ctx.fillStyle = skin; ctx.beginPath(); ctx.roundRect(x0 - w / 2, -s * 0.36 - L, w, L + s * 0.1, w / 2); ctx.fill();
      ctx.strokeStyle = "rgba(150,85,55,.25)"; ctx.lineWidth = 1.2;
      for (const q of [0.38, 0.7]) { ctx.beginPath(); ctx.moveTo(x0 - w * 0.32, -s * 0.36 - L * q); ctx.lineTo(x0 + w * 0.32, -s * 0.36 - L * q); ctx.stroke(); } // 関節のしわ
    }
    // 指のすき間の影
    ctx.strokeStyle = "rgba(150,85,55,.3)"; ctx.lineWidth = 1.4;
    for (const q of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(q * s, -s * 0.36); ctx.lineTo(q * s, -s * 0.5); ctx.stroke(); }
    // 親指(まん中側・ななめ上へ)
    ctx.save(); ctx.translate(-s * 0.36, -s * 0.02); ctx.rotate(-0.55); ctx.fillStyle = skin;
    ctx.beginPath(); ctx.roundRect(-s * 0.1, -s * 0.46, s * 0.2, s * 0.5, s * 0.1); ctx.fill();
    ctx.strokeStyle = "rgba(150,85,55,.25)"; ctx.beginPath(); ctx.moveTo(-s * 0.06, -s * 0.24); ctx.lineTo(s * 0.06, -s * 0.24); ctx.stroke();
    ctx.restore();
    // 手のひらのくぼみと手相
    const pg = ctx.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.42); pg.addColorStop(0, "rgba(170,95,65,.2)"); pg.addColorStop(1, "rgba(170,95,65,0)");
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.38, s * 0.38, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(150,85,55,.32)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.2); ctx.quadraticCurveTo(0, -s * 0.12, s * 0.34, -s * 0.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.05); ctx.quadraticCurveTo(-s * 0.05, s * 0.05, s * 0.3, -s * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.18); ctx.quadraticCurveTo(-s * 0.08, s * 0.1, -s * 0.12, s * 0.34); ctx.stroke();
    ctx.restore();
  }
  // 生地のかたまり: 空気がぬけるほど(回数が多いほど)広く・うすくなる
  // 生地のかたまり(正面から見た形)。手のひらではさんで叩くので、回数が多いほど
  // 横(厚み)はうすく・縦(直径)は大きく = 縦長になる。手のひらに当たった瞬間はさらにつぶれる
  function lumpSize(s, squash) {
    const n = tossN;
    const th = s * Math.max(0.28, 1 - n * 0.03) * (1 - 0.28 * squash);
    const dia = s * (1 + Math.min(0.9, n * 0.035)) * (1 + 0.1 * squash);
    return [th, dia];
  }
  function drawLump(x, y, s, rot, squash) {
    const [th, dia] = lumpSize(s, squash), rx = th / 2, ry = dia / 2;
    const b = MM ? MM.col : [185, 86, 75];
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.clip();
    if (tossTex) ctx.drawImage(tossTex, -ry * 1.05, -ry * 1.05, ry * 2.1, ry * 2.1); else { ctx.fillStyle = `rgb(${b.join(",")})`; ctx.fill(); }
    if (tossChunks) for (const ch of tossChunks) {
      if (ch.crushed || ch.hidden || !ch.img) continue;
      const vis = Math.max(0, ch.vis), w = ch.sw * ry * 1.7 * (0.55 + 0.45 * vis), px = ch.nx * rx * 0.8, py = ch.ny * ry * 0.8;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ch.rot); ctx.scale(Math.max(0.35, rx / ry), 1);
      ctx.globalAlpha = 0.45 + 0.55 * vis; ctx.shadowColor = "rgba(40,12,5,.5)"; ctx.shadowBlur = w * 0.15; ctx.shadowOffsetY = w * 0.06;
      ctx.drawImage(ch.img, -w / 2, -w / 2, w, w); ctx.restore();
      // まわりに生地がかぶって、うまっている感じ
      const eg = ctx.createRadialGradient(px, py, w * 0.2, px, py, w * 0.62); eg.addColorStop(0, "rgba(0,0,0,0)"); eg.addColorStop(1, `rgba(${b.join(",")},${0.6 * (1 - vis * 0.6)})`);
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(px, py, w * 0.62, 0, 7); ctx.fill();
    }
    // 丸み: まん中が明るく、ふちが暗い(厚みのある円盤を横から見た感じ)
    const lg = ctx.createLinearGradient(-rx, 0, rx, 0);
    lg.addColorStop(0, "rgba(40,10,5,.45)"); lg.addColorStop(0.35, "rgba(255,240,230,.12)"); lg.addColorStop(0.6, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(40,10,5,.5)");
    ctx.fillStyle = lg; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    const vg = ctx.createLinearGradient(0, -ry, 0, ry);
    vg.addColorStop(0, "rgba(255,245,235,.18)"); vg.addColorStop(0.5, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(40,10,5,.35)");
    ctx.fillStyle = vg; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    ctx.restore(); ctx.restore();
  }
  // 手の絵(いただいた画像)。左手=手のひらが右向き / 右手=左向き
  const HAND_IMG = ["hand_l.png", "hand_r.png"].map((src) => { const im = new Image(); im.src = src + "?v=1"; return im; });
  // 画像の中の位置(px): 手首の回転の中心 / 生地がのる手のひらの点
  const HAND_PIV = [[80, 630], [112, 630]], HAND_PALM = [[178, 335], [14, 335]];
  function handPose(k, ang, px, py, sc) {
    const rot = k ? ang : -ang, c = Math.cos(rot), sn = Math.sin(rot);
    const dx = (HAND_PALM[k][0] - HAND_PIV[k][0]) * sc, dy = (HAND_PALM[k][1] - HAND_PIV[k][1]) * sc;
    const nx = k ? -1 : 1; // 手のひらの向き(まん中へ)
    return { rot, palm: [px + dx * c - dy * sn, py + dx * sn + dy * c], n: [nx * c, nx * sn] };
  }
  function drawToss(t) {
    drawTable();
    if (!toss) return;
    const ready = HAND_IMG.every((im) => im.complete && im.naturalWidth);
    const hh = Math.min(H * 0.42, R * 1.55), sc = hh / 640, py = CY + hh * 0.5, pxs = [W * 0.17, W * 0.83];
    const s = hh * 0.55;
    toss.squash *= 0.86; toss.dip = toss.dip.map((d) => d * 0.82);
    // 手の傾き: ハンバーグを持っている手は後ろへ傾けてのせる / 受ける手はまっすぐ / 投げた手はまん中へ振る
    toss.ang = toss.ang || [0.35, 0];
    for (let k = 0; k < 2; k++) {
      let tg = 0;
      if (toss.fly) tg = k === toss.fly.from ? -0.18 : 0;
      else tg = k === toss.at ? 0.35 : 0;
      toss.ang[k] += (tg - toss.ang[k]) * ((toss.speed || 200) < 150 ? 0.5 : 0.25);
    }
    const pose = [0, 1].map((k) => handPose(k, toss.ang[k], pxs[k] + (k ? 1 : -1) * toss.dip[k] * s * 0.12, py, sc));
    for (let k = 0; k < 2; k++) {
      if (ready) {
        const im = HAND_IMG[k], dpx = pxs[k] + (k ? 1 : -1) * toss.dip[k] * s * 0.12;
        ctx.save(); ctx.translate(dpx, py); ctx.rotate(pose[k].rot);
        ctx.shadowColor = "rgba(60,30,15,.3)"; ctx.shadowBlur = hh * 0.06; ctx.shadowOffsetY = hh * 0.03;
        ctx.drawImage(im, -HAND_PIV[k][0] * sc, -HAND_PIV[k][1] * sc, im.naturalWidth * sc, im.naturalHeight * sc);
        ctx.restore();
      } else drawHand(pxs[k], CY, s, k, toss.dip[k]);
    }
    const lump = hh * 0.3;
    // 手のひらにくっつく位置(生地の厚みの半分だけ手のひらから浮かせる)
    const restAt = (P, sq) => { const off = lumpSize(lump, sq)[0] / 2 + lump * 0.02; return [P.palm[0] + P.n[0] * off, P.palm[1] + P.n[1] * off]; };
    let [x, y] = restAt(pose[toss.at], toss.squash), rot = pose[toss.at].rot;
    if (toss.fly) {
      const f = toss.fly, u = Math.min(1, (t - f.t0) / f.dur);
      // 始点 = 投げた瞬間の手のひら / 終点 = まっすぐ立てて待つ手のひら(途中でバウンドしない)
      if (!f.a) { f.a = restAt(pose[f.from], 0); f.b = restAt(handPose(f.to, 0, pxs[f.to], py, sc), 0); f.r0 = pose[f.from].rot; }
      const e = u * (2 - u); // 少しだけ減速して手に収まる
      x = f.a[0] + (f.b[0] - f.a[0]) * e; y = f.a[1] + (f.b[1] - f.a[1]) * e - Math.sin(u * Math.PI) * lump * 0.25; rot = f.r0 * (1 - e);
      // 地面(テーブル)の影
      ctx.fillStyle = "rgba(40,20,10,.12)"; ctx.beginPath(); ctx.ellipse(x, py + lump * 0.2, lump * 0.6, lump * 0.2, 0, 0, 7); ctx.fill();
      if (u >= 1) {
        toss.at = f.to; toss.fly = null; tossN++; toss.squash = 1; toss.dip[toss.at] = 1; slap();
        const el = $("tossN"); if (el) el.textContent = tossN; const lb = $("tossLb"); if (lb) lb.textContent = tossLabel();
        if (toss3) {
          const o = Toss3D.slap(toss.at ? -1 : 1); tossRes.lost += o.lost; tossRes.crushed += o.crushed; if (o.cracked) tossRes.cracked++;
          const lb = $("tossLb"), rs = Toss3D.result();
          if (lb) lb.innerHTML = DK.kind === "liquid" ? `ペチ×${tossN} ・ 手に残ってる量 <b>${Math.round(rs.vol * 100)}%</b>` : `ペチ×${tossN} ・ 落ちた <b>${tossRes.lost}</b>個 ・ つぶれた <b>${tossRes.crushed}</b>個${tossRes.cracked ? " ・ 卵が割れた" : ""}`;
        } else slapChunks();
        if (tossN === 4) toast("ペチッ！ 空気がぬけてきた"); else if (tossN === 15) toast("あれ…平べったくなってきた"); else if (tossN === 25) toast("ペラペラになったwww");
        if (toss.queue) { toss.queue--; tossThrow(); }
      }
    }
    // 手のひらにペタッ: ぶつかった瞬間は横につぶれる
    if (toss3) {
      Toss3D.tableY = py + hh * 0.02;
      const side = toss.fly ? (toss.fly.to ? 1 : -1) : (toss.at ? -1 : 1);
      const img = Toss3D.render(W, H, Math.min(0.05, (t - (toss.lt || t)) / 1000), { x, y, rot, flying: !!toss.fly, side, vx: toss.fly ? (toss.fly.to ? 600 : -600) : 0 }); toss.lt = t;
      ctx.drawImage(img, 0, 0, W, H);
    } else drawLump(x, y, lump, rot, toss.fly ? 0 : toss.squash);
  }
  let kp = null;
  cv.addEventListener("pointerdown", (e) => {
    if (stage === "ing" && window.Bowl3D && Bowl3D.running) { initAudio(); if (Bowl3D.down(e.clientX, e.clientY)) { try { cv.setPointerCapture(e.pointerId); } catch {} } return; }
    if (stage === "cut" && peelMode && use3D()) { peelPtr = e.pointerId; const r = Cut3D.peelAt(e.clientX, e.clientY); if (r) peelSound(r === "all"); }
    else if (stage === "cut") { cutPath = [e.clientX, e.clientY]; cutId = e.pointerId; }
    else if (stage === "knead") { kp = { id: e.pointerId, x: e.clientX, y: e.clientY, a: Math.atan2(e.clientY - CY, e.clientX - CX), acc: 0 }; }
    else if (stage === "toss" && toss) {
      initAudio();
      // 連打するほど速く投げる(タップの間隔に合わせて 0.08〜0.2秒)
      const now = performance.now(), iv = now - (toss.lastTap || 0); toss.lastTap = now;
      toss.speed = Math.max(80, Math.min(200, iv * 0.85));
      toss.combo = iv < 260 ? (toss.combo || 0) + 1 : 0;
      if (toss.combo === 10) toast("ペチペチペチ！ 高速空気ぬき！"); else if (toss.combo === 25) toast("手が見えないwww");
      if (toss.fly) toss.queue = Math.min(3, (toss.queue || 0) + 1); else tossThrow();
    }
    else if (stage === "cook" && pan && (window.Pan3D && Pan3D.ok && Pan3D.running)) {
      initAudio();
      const kind = Pan3D.pick(e.clientX, e.clientY), P = pan.pt, [vx, vy] = panVirt(e.clientX, e.clientY);
      if (kind === "handle") pan.grab = { id: e.pointerId, sx: e.clientX, sy: e.clientY };
      else if (kind === "patty" && P.state === "wait") { P.state = "held"; P.held = e.pointerId; P.sx = vx; P.sy = vy; P.hx = e.clientX; P.hy = e.clientY; }
      else if (kind === "pot") { oil.load = 1; oil.amt++; paintOil.dry = false; oil.brush = { id: e.pointerId, x: vx, y: vy, rx: e.clientX, ry: e.clientY }; if (ac) burst(ac.currentTime, 600, 1, 0.12, 0.12, "lowpass"); oilInfo(); }

    }
    else if (stage === "cook" && pan) {
      initAudio();
      const g = panGeo(), [ax, ay, bx, by] = handleSeg(g), x = e.clientX, y = e.clientY;
      const L2 = (bx - ax) ** 2 + (by - ay) ** 2, u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2));
      const pp = potPos(), wp = waitPos(), P = pan.pt;
      if (Math.hypot(x - (ax + (bx - ax) * u), y - (ay + (by - ay) * u)) < R * 0.14) pan.grab = { id: e.pointerId, sx: x, sy: y };
      else if ((P.state === "wait") && Math.hypot(x - wp[0], y - wp[1]) < cookPR() * 1.1) { P.state = "held"; P.held = e.pointerId; P.sx = x; P.sy = y; }
      else if (Math.hypot(x - pp[0], y - pp[1]) < R * 0.22) { oil.load = 1; oil.amt++; paintOil.dry = false; oil.brush = { id: e.pointerId, x, y }; if (ac) burst(ac.currentTime, 600, 1, 0.12, 0.12, "lowpass"); oilInfo(); }

    }
    else if (stage === "shape") { drawPts = [e.clientX, e.clientY]; shapeId = e.pointerId; }
    else if (stage === "sauce" && (window.Plate3D && Plate3D.ok && Plate3D.running)) { if (Plate3D.down(e.clientX, e.clientY, sauceCol)) { sauceId = e.pointerId; sauceCur = { col: sauceCol, pts: [] }; nz(900, 1, 0.15, 0.2); } }
    else if (stage === "sauce") { sauceCur = { col: sauceCol, pts: [toPatty(e.clientX, e.clientY)] }; sauceId = e.pointerId; nz(900, 1, 0.15, 0.2); }
    try { cv.setPointerCapture(e.pointerId); } catch {}
  });
  let shapeId = null, sauceId = null, cutId = null;
  cv.addEventListener("pointermove", (e) => {
    if (stage === "ing" && window.Bowl3D && Bowl3D.dragging) { Bowl3D.move(e.clientX, e.clientY); return; }
    if (stage === "cut" && peelMode && peelPtr === e.pointerId) { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; let any = false, all = false; for (const ev of (evs.length ? evs : [e])) { const r = Cut3D.peelAt(ev.clientX, ev.clientY); if (r) any = true; if (r === "all") all = true; } if (any) peelSound(all); return; }
    if (stage === "cut" && cutPath && cutId === e.pointerId) {
      const n = cutPath.length;
      if (Math.hypot(e.clientX - cutPath[n - 2], e.clientY - cutPath[n - 1]) >= 4) cutPath.push(e.clientX, e.clientY);
    } else if (stage === "knead" && kp && kp.id === e.pointerId) {
      // 速く大きく回して指がボウルの外に出ても止めない(ふちに寄せて続ける)
      let ex = e.clientX, ey = e.clientY; { const rr = Math.hypot(ex - CX, ey - CY), lim = R * 1.0; if (rr > lim) { ex = CX + (ex - CX) * lim / rr; ey = CY + (ey - CY) * lim / rr; } }
      const d = Math.hypot(ex - kp.x, ey - kp.y);
      // 指でなぞった所だけ、肉が引きずられて混ざる + 3Dの面がへこむ
      const u0 = unitAt(kp.x, kp.y), u1 = unitAt(ex, ey), T = (v) => 512 + v / 0.92 * 512;
      // 指の速さ(ボウルの半径/秒・なめらかに)
      const now = performance.now(), dtm = Math.max(0.008, Math.min(0.1, (now - (kp.t || now - 16)) / 1000)); kp.t = now;
      kp.v = kp.v == null ? d / R / dtm : kp.v * 0.45 + (d / R / dtm) * 0.55;
      // ゆっくり=少しずつ / ちょうどいい=よく混ざる / 速すぎ=空回り
      // 速く混ぜるほど、よく混ざる(ゆっくり0.7倍 → ふつう1倍 → 速いと最大1.8倍)
      // 指の速さに比例して混ざる(ゆっくり=ゆっくり、速い=速い)
      const eff = Math.max(0.12, Math.min(4, kp.v / 3.5));
      const mm = MM || { ease: 1, wet: 0.3 };
      if (mixCv) smudge(T(u0[0]), T(u0[1]), T(u1[0]), T(u1[1]), kp.v);
      // 指の動いた向きと速さ(中身の面の単位/秒)も渡す → 具材は指に押されて転がる
      if (window.Bowl3D && Bowl3D.running) Bowl3D.poke(u1[0] / 0.92, u1[1] / 0.92, Math.min(1.6, d / 12) * (0.6 + 0.5 * clamp01(mm.wet + 0.3)), (u1[0] - u0[0]) / 0.92 / dtm, (u1[1] - u0[1]) / 0.92 / dtm);
      kp.x = ex; kp.y = ey;
      const dk = d / (R * 13) * (0.6 + 0.4 * mm.ease) * eff; // かたさの差は残しつつ、全体はさくさく混ざる
      knead = Math.min(1, knead + dk);
      // 混ざった分だけ、全体が混ぜた色に近づく(指が通っていない所の材料も、だんだんうずまる)
      kp.tint = (kp.tint || 0) + dk;
      if (mixCv && meatBits.length) while (kp.tint > 0.015) { kp.tint -= 0.015; const g = mixCv.getContext("2d"); g.save(); g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.045; g.fillStyle = mixPattern(g); g.fillRect(0, 0, 1024, 1024); g.restore(); }
      const si = $("speedInfo"); if (si) si.textContent = "指の速さ：" + (kp.v < 1.5 ? "ゆっくり" : kp.v < 5 ? "いい感じ" : kp.v < 9 ? "はやい！" : "爆速！！") + `（×${eff.toFixed(1)}）`;
      const mp = $("mixPct"); if (mp) mp.textContent = Math.round(knead * 100) + "%";
      if (window.Bowl3D && Bowl3D.ok && Bowl3D.hasOnion) Bowl3D.setKnead(knead);
      kp.acc += d; if (kp.acc > R * 0.35) {
        kp.acc = 0; squish();
      }
      const bar = $("kneadBar"); if (bar) bar.style.width = knead * 100 + "%";
      if (knead >= 1) { const b = $("toShape"); if (b && b.disabled) { b.disabled = false; tone(880, 0.15, "sine", 0.15); toast("よくこねた！ ねばりが出てきた"); } }
    } else if (stage === "cook" && pan && pan.grab && pan.grab.id === e.pointerId) {
      // 取っ手を動かした向きへ傾く(低くなる)
      let dx = (e.clientX - pan.grab.sx) / (R * 0.45), dy = (e.clientY - pan.grab.sy) / (R * 0.45); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      pan.tgt = [dx, dy];
    } else if (stage === "cook" && pan && pan.pt.state === "held" && pan.pt.held === e.pointerId) {
      if ((window.Pan3D && Pan3D.ok && Pan3D.running)) { const v = panVirt(e.clientX, e.clientY); pan.pt.sx = v[0]; pan.pt.sy = v[1]; pan.pt.hx = e.clientX; pan.pt.hy = e.clientY; }
      else { pan.pt.sx = e.clientX; pan.pt.sy = e.clientY; }
    } else if (stage === "cook" && oil && oil.brush && oil.brush.id === e.pointerId) {
      const [bx, by] = (window.Pan3D && Pan3D.ok && Pan3D.running) ? panVirt(e.clientX, e.clientY) : [e.clientX, e.clientY];
      paintOil(oil.brush.x, oil.brush.y, bx, by); oil.brush.x = bx; oil.brush.y = by; oil.brush.rx = e.clientX; oil.brush.ry = e.clientY;
      oil.brush.n = (oil.brush.n || 0) + 1; if (oil.brush.n % 10 === 0 && cookPhase === "prep") { oil.cover = oilCover(); oilInfo(); }
      if (ac && Math.random() < 0.15) burst(ac.currentTime, rnd(1500, 2500), 1, 0.04, 0.06);
    } else if (stage === "shape" && drawPts && shapeId === e.pointerId) {
      const n = drawPts.length;
      if (Math.hypot(e.clientX - drawPts[n - 2], e.clientY - drawPts[n - 1]) >= 3) drawPts.push(e.clientX, e.clientY);
    } else if (stage === "sauce" && sauceCur && sauceId === e.pointerId) {
      if ((window.Plate3D && Plate3D.ok && Plate3D.running)) Plate3D.move(e.clientX, e.clientY); else sauceCur.pts.push(toPatty(e.clientX, e.clientY));
    }
  });
  const endPtr = (e) => {
    if (stage === "ing" && window.Bowl3D && Bowl3D.dragging) { Bowl3D.up(e.clientX, e.clientY); return; }
    if (stage === "cut" && peelPtr === e.pointerId) peelPtr = null;
    if (stage === "cut" && cutPath && cutId === e.pointerId) { applyCutPath(cutPath); cutPath = null; }
    if (stage === "knead" && kp && kp.id === e.pointerId) kp = null;
    if (stage === "shape" && drawPts && shapeId === e.pointerId) { finishShape(); }
    if (stage === "sauce" && sauceCur && sauceId === e.pointerId) { if ((window.Plate3D && Plate3D.ok && Plate3D.running)) Plate3D.up(); else if (sauceCur.pts.length > 1) sauce.push(sauceCur); sauceCur = null; }
    if (stage === "cook" && pan) {
      if (pan.grab && pan.grab.id === e.pointerId) { pan.grab = null; pan.tgt = [0, 0]; }
      if (oil.brush && oil.brush.id === e.pointerId) { oil.brush = null; oil.load = 0; if (cookPhase === "prep") { oil.cover = oilCover(); oilInfo(); } }
      const P = pan.pt;
      if (P.state === "held" && P.held === e.pointerId) {
        const g = panGeo(), ux = (P.sx - g.x) / g.Ri, uy = (P.sy - g.y) / g.Ri, prU = cookPR() / g.Ri;
        if (Math.hypot(ux, uy) < 1.02) {
          // フライパンの中に置いた → その場所から焼き始める
          const lim = 0.98 - prU, r = Math.hypot(ux, uy); P.x = r > lim ? ux * lim / r : ux; P.y = r > lim ? uy * lim / r : uy; P.vx = P.vy = 0;
          P.state = "in"; startFry();
        } else P.state = (window.Pan3D && Pan3D.ok && Pan3D.running) ? "wait" : "back";
      }
    }
  };
  cv.addEventListener("pointerup", endPtr); cv.addEventListener("pointercancel", endPtr);

  // ---------- 3. 形 ----------
  function goShape() {
    stage = "shape"; setStep("5/7 形を作る"); drawPts = null;
    setPanel(`<p class="hint">まな板の上に<b>ハンバーグの形を指でなぞる</b>（ひと筆で）</p>
      <div class="btns"><button class="btn" id="redo">描き直す</button><button class="btn go" id="toCook" disabled>焼く →</button></div>`);
    $("redo").onclick = () => { shape = null; drawPts = null; $("toCook").disabled = true; if (window.Board3D && Board3D.ok) Board3D.setPatty(null); };
    if (window.Board3D && Board3D.ok) Board3D.setPatty(null);
    $("toCook").onclick = goCook;
  }
  // 生地の絵の広さ: 細長い形でも、はしまで絵の中に入るように(はみ出すと、その部分が黒く/白く抜ける)
  function texR() { if (!shape) return 1.45; let m = 0; const p = shape.pts; for (let i = 0; i < p.length; i += 2) m = Math.max(m, Math.hypot(p[i], p[i + 1])); return Math.max(1.45, m * 1.08); }
  function polyArea(p) { let a = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; } return a / 2; }
  function polyLen(p) { let L = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; L += Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1]); } return L; }
  function chaikin(p) { const o = [], n = p.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = p[2 * i], ay = p[2 * i + 1], bx = p[2 * j], by = p[2 * j + 1]; o.push(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25, ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75); } return o; }
  function inPoly(p, x, y) { let c = false; for (let i = 0, n = p.length / 2, j = n - 1; i < n; j = i++) { const xi = p[2 * i], yi = p[2 * i + 1], xj = p[2 * j], yj = p[2 * j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  function finishShape(auto = false) {
    const p = drawPts; drawPts = null;
    if (!p || p.length < 24) { toast("もっと大きく、ぐるっと囲ってね"); return; }
    // 間引き(4pxごと)
    let q = [p[0], p[1]];
    for (let i = 2; i < p.length; i += 2) if (Math.hypot(p[i] - q[q.length - 2], p[i + 1] - q[q.length - 1]) > 4) q.push(p[i], p[i + 1]);
    let A = polyArea(q);
    if (Math.abs(A) < (R * 0.25) ** 2) { toast("小さすぎ！もっと大きく囲ってね"); return; }
    if (A < 0) { const r = []; for (let i = q.length - 2; i >= 0; i -= 2) r.push(q[i], q[i + 1]); q = r; A = -A; }
    q = chaikin(chaikin(q));
    // 重心を中心に、面積が半径1の円と同じになるよう正規化
    let cx = 0, cy = 0; const n = q.length / 2; for (let i = 0; i < n; i++) { cx += q[2 * i]; cy += q[2 * i + 1]; } cx /= n; cy /= n;
    const k = 1 / Math.sqrt(A / Math.PI);
    const pts = q.map((v, i) => (v - (i % 2 ? cy : cx)) * k);
    const qq = 4 * Math.PI * polyArea(pts) / polyLen(pts) ** 2; // 丸さ(円=1)
    // 大きさ = なぞった大きさ(まな板からはみ出さないところまで)
    let mx = 0, my = 0; for (let i = 0; i < pts.length; i += 2) { mx = Math.max(mx, Math.abs(pts[i])); my = Math.max(my, Math.abs(pts[i + 1])); }
    const eqR = Math.sqrt(A / Math.PI), sz = Math.max(0.25, Math.min(eqR, R * 0.95 / Math.max(mx, 0.5), R * 0.72 / Math.max(my, 0.5))) / R;
    // 体積は材料の量で決まる: 大きく広げると薄く、小さくまとめると厚く(薄すぎ・厚すぎになる時は、自然に大きさが変わる)
    let szv = sz;
    if (DK.kind === "meat") {
      const V = DK.vol * 0.072 / Math.PI, rat = (z) => V / (z * z * z);
      if (rat(szv) < 0.3) szv = Math.cbrt(V / 0.3); if (rat(szv) > 0.85) szv = Math.min(sz * 1.6, 0.95 / Math.max(mx, 0.5), 0.72 / Math.max(my, 0.5), Math.cbrt(V / 0.85));
      hRatio = Math.max(0.12, Math.min(0.85, rat(szv)));
      const wet = MM ? MM.wet : 0.3; if (wet >= 0.9) { hRatio *= 0.6; szv *= 1.1; } else if (wet >= 0.45) hRatio *= 0.85; // 水っぽいと、だれて広がる
    } else if (DK.recipe === "pancake") { hRatio = 0.2; szv = 0.55; } // 生地がもったり → 丸く厚め
    else if (DK.recipe === "omelette" || DK.recipe === "tamago") { hRatio = 0.1; szv = 0.62; }
    else if (DK.kind === "liquid") { hRatio = 0.035; szv = Math.min(0.9, 0.45 + Math.sqrt(DK.vol) * 0.25); }
    else { hRatio = 0.04; szv = Math.min(0.75, 0.35 + Math.sqrt(DK.vol) * 0.2); }
    shape = { pts, q: auto ? 0.7 : qq, sz: szv };
    cracked = DK.kind === "meat" && !!MM && MM.wet < -0.05; // パサパサはふちがひび割れる
    // 溶ける具材(チーズ・チョコ・いちご・バナナ): 焼くと生地のふちからとろけ出る
    melts = [];
    if (DK.kind === "meat") for (const [id, col] of [["cheese", [255, 204, 60]], ["choco", [62, 30, 14]], ["straw", [170, 22, 40]], ["banana", [214, 170, 90]]]) {
      for (let i = 0; i < Math.min(4, (counts[id] || 0) * 2); i++) { const a = rnd(0, 6.3); melts.push({ a, col, r: rnd(0.14, 0.24), d: rnd(0.72, 0.9) }); }
    }
    // こねた生地(色・玉ねぎのつぶ・パン粉など全部入り)を、そのままハンバーグの表面に使う
    pattyTex = tossTex || meatTexture(); const bodyless = DK.kind === "pile";
    eggImg = window.Bowl3D && Bowl3D.ok && Bowl3D.hasEgg ? Bowl3D.eggSprite() : null;
    // 混ざりきらずに肉から出ていた玉ねぎのかけらは、3Dのまま形の中に残る
    chunks = [];
    for (const ch of (tossChunks || visibleChunks())) {
      if (ch.crushed || ch.hidden || !ch.img || ch.vis < 0.15) continue;
      let x = ch.nx * 0.75, y = ch.ny * 0.75, t = 0; while (!inPoly(pts, x / 0.9, y / 0.9) && t++ < 20) { x *= 0.85; y *= 0.85; }
      chunks.push({ img: ch.img, sw: ch.sw, body: ch.body, mesh: ch.mesh, px: x, py: y, vis: Math.min(1, ch.vis), rot: ch.rot, sq: ch.sq, id: ch.id });
    }
    // つなぎがない具材は、くっつかずにバラバラ: 1つずつ離れて、ひと並びに散らばる
    if (DK.kind === "pile" || isDessert()) { // バラバラ(具材だけ) / トッピング(上にのせる)
      const placed = [];
      for (const ch of chunks) {
        let x = 0, y = 0;
        for (let t = 0; t < 40; t++) { const a = Math.random() * 6.3, rr = Math.sqrt(Math.random()) * (isDessert() ? 0.55 : 0.8); x = Math.cos(a) * rr; y = Math.sin(a) * rr; if (placed.every(([px, py]) => Math.hypot(px - x, py - y) > 0.22)) break; }
        placed.push([x, y]); ch.px = x; ch.py = y; ch.vis = 1;
      }
    }
    // 裏の面: 生地の模様も、出ている具材も、表とは別(ひっくり返しても同じ形が出ないように)
    const chunksB = chunks.filter(() => Math.random() < 0.6).map((ch) => {
      let x = -ch.px * 0.9 + rnd(-0.15, 0.15), y = ch.py * 0.9 + rnd(-0.15, 0.15), t = 0; while (!inPoly(pts, x / 0.9, y / 0.9) && t++ < 20) { x *= 0.85; y *= 0.85; }
      return { ...ch, px: x, py: y, rot: rnd(0, 6.3) };
    });
    faceTex = [DK.kind === "liquid" ? pattyTex : meatTexture(), pattyTex]; faceChunks = isDessert() ? [chunks, chunks] : [DK.kind === "pile" ? chunks.map((ch) => ({ ...ch, px: -ch.px, rot: ch.rot + 1.5 })) : chunksB, chunks]; // 具材だけの時は、ひっくり返しても同じ物(裏から見た向き)
    // 材料を形の中にちらす
    const solid3d = window.Bowl3D && Bowl3D.ok && Bowl3D.hasSolids; // 3Dで入れた具材は、2Dの絵ではなく上の3Dのかけら(chunks)で見せる
    pattyPieces = pieces.filter((pc) => !pc.melt && !(solid3d && Bowl3D.isSolid(pc.id))).map((pc) => {
      let x = 0, y = 0;
      for (let t = 0; t < 40; t++) { x = rnd(-1.6, 1.6); y = rnd(-1.6, 1.6); if (inPoly(pts, x, y)) break; }
      return { ...pc, px: x * 0.85, py: y * 0.85 };
    });
    speck = []; for (let i = 0; i < 90; i++) { let x, y, t = 0; do { x = rnd(-1.6, 1.6); y = rnd(-1.6, 1.6); } while (!inPoly(pts, x, y) && ++t < 30); speck.push({ x, y, r: rnd(0.02, 0.06), l: Math.random() < 0.5 }); }
    cracks = []; for (let i = 0; i < 3; i++) { const a = rnd(0, 6.3); const c = [Math.cos(a) * 1.05, Math.sin(a) * 1.05]; let x = c[0], y = c[1]; for (let s = 0; s < 6; s++) { x -= Math.cos(a) * 0.12 + rnd(-0.07, 0.07); y -= Math.sin(a) * 0.12 + rnd(-0.07, 0.07); c.push(x, y); } cracks.push(c); }
    // 3Dのまな板に、生の生地を立体で置く
    if (window.Board3D && Board3D.ok) {
      const T = 512, prT = T / 2 / texR(), c = document.createElement("canvas"); c.width = c.height = T;
      const c3 = (window.Chunk3D && Chunk3D.ok);
      drawPatty(c.getContext("2d"), T / 2, T / 2, prT, 0, 0, 1, 1, c3);
      try { Board3D.setPatty({ pts: shape.pts, S: pattyR() / R, H: pattyH(pattyR() / R), tex: c, uvK: prT / T, chunks: c3 ? faceChunks[1] : null, bodyless }); } catch (e) { console.warn(e); }
    }
    { const tc = $("toCook"); if (tc) tc.disabled = false; }
    if (auto) return;
    tone(660, 0.1, "sine", 0.15); tone(990, 0.15, "sine", 0.12, 0.08);
    if (qq < 0.55) toast("…それハンバーグの形？ww");
  }

  // ---------- 4. 焼く ----------
  const COOK_SEC = 20; // ちょうどいい焼き色になるまでの秒数(片面)
  // ---------- 6. 焼く ----------
  // 油つぼのペーパーで油をぬる(油はつぶの集まり) → ハンバーグを指でフライパンへすべらせる → 取っ手で傾ける
  // 傾けると、油もハンバーグも低い方へ(油が下にあればハンバーグはすべる / なければくっつく)
  let cookPhase = "prep", oil = null, pan = null, hRatio = 0.62, melts = [], plateCheese3D = false;
  const OIL_MAX = 320, OILG = 2.6, OIL_PER_DIP = 85; // ペーパー1回で出る油のつぶ
  function panGeo() { const Ro = R * 0.84; return { x: CX, y: CY + R * 0.16, Ro, Ri: Ro * 0.86, ha: Math.PI / 2 }; }
  const potPos = () => [CX - R * 0.66, CY - R * 0.86];
  const waitPos = () => [CX + R * 0.5, CY - R * 0.9];
  const cookPR = () => DK.kind === "pile" ? panGeo().Ri * 0.8 : Math.min(pattyR(), panGeo().Ri * (DK.kind === "liquid" && !["pancake", "omelette", "tamago"].includes(DK.recipe) ? 0.88 : 0.62)); // 液体はフライパンいっぱいに広がる
  function goCook() {
    stage = "cook"; setStep("6/7 焼く"); side = [0, 0]; down = 0; flips = 0; flipT = -1;
    cookPhase = "prep"; bubbles = []; smoke = [];
    const c = document.createElement("canvas"); c.width = c.height = 256;
    oil = { cv: c, p: [], amt: 0, load: 0, brush: null, cover: 0, dropT: 0 };
    pan = { tilt: [0, 0], tgt: [0, 0], grab: null, pt: { x: 0, y: 0, vx: 0, vy: 0, state: "wait", held: null, sx: 0, sy: 0 } };
    setPanel(`<p class="hint"><b>油つぼ</b>のペーパーで油をぬって、ハンバーグを<b>指でフライパンへスライド</b>！<br><span style="font-size:12px">取っ手をつかんで動かすと、フライパンが傾く</span></p>
      <p class="hint" id="oilInfo" style="margin:-2px 0 4px;font-size:12px">油：0回 ・ 広がり 0%</p>
      <div class="btns"><button class="btn yel" id="flipBtn" disabled>🔄 ひっくり返す</button><button class="btn go" id="doneBtn" disabled>焼けた！ →</button></div>`);
    $("flipBtn").onclick = () => {
      if (cookPhase !== "fry" || flipT >= 0) return; flipT = last; flips++; nz(3000, 0.7, 0.6, 0.5, "highpass"); nz(200, 1, 0.5, 0.15, "lowpass");
      if (!oil.p.length && flips === 1) toast("ベリッ…フライパンにくっついてた！");
    };
    $("doneBtn").onclick = goSauce;
    if (DK.kind !== "meat") { const h = document.querySelector(".panel .hint, .hint"); if (h) h.innerHTML = DK.kind === "liquid" ? "<b>油つぼ</b>のペーパーで油をぬって、<b>ボウルを指でフライパンへ</b>持っていって流しこむ！<br><span style=\"font-size:12px\">取っ手をつかんで動かすと、フライパンが傾く</span>" : "<b>油つぼ</b>のペーパーで油をぬって、<b>具材を指でフライパンへ</b>！<br><span style=\"font-size:12px\">取っ手をつかんで動かすと、フライパンが傾く</span>"; }
    startPan3D();
  }
  // 3Dのフライパン: ハンバーグの立体と、焼け具合の絵
  let pan3dCv = null, pan3dShow = -1, pan3dDraw = 0;
  // ハンバーグの厚み: 直径のおよそ3割(本物くらい)。空気ぬきでペラペラにすると薄くなる
  const pattyH = (S) => Math.max(0.015, S * hRatio) * (1 - 0.5 * tossThin());
  function startPan3D() {
    if (!(window.Pan3D && Pan3D.ok) || !shape) return;
    const T = 512, prT = T / 2 / texR(); pan3dCv = document.createElement("canvas"); pan3dCv.width = pan3dCv.height = T;
    const c3 = (window.Chunk3D && Chunk3D.ok);
    const draw = (top, rim, face = 1) => { const g = pan3dCv.getContext("2d"); g.clearRect(0, 0, T, T); drawPatty(g, T / 2, T / 2, prT, top, rim, 1, face, c3); };
    draw(0, 0);
    const g = panGeo(), prU = cookPR() / g.Ri;
    try { Pan3D.start({ pts: shape.pts, S: prU * 0.86, H: pattyH(prU * 0.86) * 0.92, uvK: prT / T, cv: pan3dCv, draw, state: () => pan.pt.state, chunks: c3 && faceChunks && !isDessert() ? faceChunks : null, bodyless: DK.kind === "pile", vessel: DK.kind === "liquid" }); } catch (e) { console.warn(e); }
    pan3dShow = -1;
  }
  // 3Dの時: 画面の点 → 2Dの計算で使う位置(フライパンの単位を、いつもの画面の座標に直す)
  function panVirt(x, y) { const u = Pan3D.unitAt(x, y), g = panGeo(); return u ? [g.x + u[0] * g.Ri, g.y + u[1] * g.Ri] : [x, y]; }
  function drawPan3D(t, dt) {
    stepPan(dt); updateOilMask();
    let flipU = -1;
    if (flipT >= 0) { const u = Math.max(0, (t - flipT) / 450); if (u >= 1) { flipT = -1; down = 1 - down; nz(3500, 0.6, 0.5, 0.6, "highpass"); } else flipU = u; }
    const showTop = flipU > 0.5 ? down : 1 - down, showRim = showTop === down ? 1 - down : down;
    pan3dDraw += dt; const redraw = showTop !== pan3dShow || pan3dDraw > 0.3; if (redraw) { pan3dShow = showTop; pan3dDraw = 0; }
    const P = pan.pt;
    Pan3D.render(CY, dt, { bot: LB, top0: 58 + GUIDE_EXTRA, tilt: pan.tilt, pt: P, flipU, face: showTop, top: side[showTop], rim: side[showRim], redraw, oilCv: oil.cv, oilN: oil.p.length,
      heat: Math.min(1, 0.3 + side[down] * 0.6), steam: side[down] > 0.4, smoke: side[down] > 1.05, smokeDark: side[down] > 1.35, held: [P.hx || 0, P.hy || 0], brush: oil.brush ? [oil.brush.rx, oil.brush.ry] : null });
    // ラベル
    ctx.clearRect(0, 0, W, H);
    const lab = (txt, xy) => { ctx.font = "800 13px system-ui, sans-serif"; const w = ctx.measureText(txt).width + 18; ctx.fillStyle = "rgba(20,16,12,.7)"; ctx.beginPath(); ctx.roundRect(xy[0] - w / 2, xy[1] - 13, w, 26, 13); ctx.fill(); ctx.fillStyle = "#f3e7d3"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, xy[0], xy[1]); };
    lab("油", Pan3D.screenOf("pot"));
    if (P.state === "wait") lab(DK.kind === "liquid" ? "ボウル" : DK.kind === "pile" ? "具材" : "ハンバーグ", Pan3D.screenOf("board"));
  }
  function oilCover() {
    const c = document.createElement("canvas"); c.width = c.height = 48; const g = c.getContext("2d"); g.drawImage(oil.cv, 0, 0, 48, 48);
    const d = g.getImageData(0, 0, 48, 48).data; let n = 0, k = 0;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { if (Math.hypot(x - 23.5, y - 23.5) > 23) continue; n++; if (d[(y * 48 + x) * 4 + 3] > 22) k++; }
    return n ? k / n : 0;
  }
  function oilInfo() { const el = $("oilInfo"); if (el && cookPhase === "prep") el.textContent = `油：${oil.amt}回 ・ 広がり ${Math.round(oil.cover * 100)}%` + (oil.brush ? ` ・ ペーパーの油 ${Math.round(Math.max(0, oil.load) * 100)}%` : ""); }
  function startFry() {
    oil.cover = oilCover(); cookPhase = "fry"; cookStarted = performance.now(); oil.dropT = last;
    initAudio(); nz(4200, 0.6, 0.7, 0.5, "highpass"); // ジュワッ
    if (!oil.p.length) toast("油なしで入れた…くっつくかも");
    $("flipBtn").disabled = false; $("doneBtn").disabled = false;
    const el = $("oilInfo"); if (el) el.textContent = "ジュー…！ ふちの色と煙を見て、いい感じでひっくり返そう";
  }
  // ペーパーで油をぬる(なぞった所に油のつぶを置く。ペーパーの油はだんだん減る)
  function paintOil(x0, y0, x1, y1) {
    const g = panGeo(), L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L / 13));
    for (let k = 1; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n, ux = (x - g.x) / g.Ri, uy = (y - g.y) / g.Ri;
      if (Math.hypot(ux, uy) > 0.96) continue;
      if (oil.p.length >= OIL_MAX) { if (!paintOil.warned) { paintOil.warned = true; toast("もう油たっぷり！"); } return; }
      // ペーパー1回分の油には限りがある(つぼに何回もつけるほど油が多くなる)
      if (oil.load <= 0) { if (!paintOil.dry) { paintOil.dry = true; oilInfo(); } return; }
      oil.load -= 1 / OIL_PER_DIP;
      oil.p.push({ x: ux + rnd(-0.015, 0.015), y: uy + rnd(-0.015, 0.015), vx: 0, vy: 0, px: 0, py: 0 }); oil.calm = 0;
    }
  }
  // 油 = 液体のつぶ(押し合う力でうすい膜に広がる・まわりと一緒に流れる)。位置ベースの簡単な流体
  const FH = 0.085, FK = 0.0016, FKN = 0.005, FRHO = 2.6;
  const FG = 26, fHead = new Int32Array(FG * FG), fNext = new Int32Array(1024), fNb = new Int32Array(256), fNq = new Float32Array(256), fNx = new Float32Array(256), fNy = new Float32Array(256);
  function stepOilFluid(dt0, tx, ty, patty, prU) {
    const ps = oil.p, n = ps.length; if (!n) return;
    // 平らで止まっている時は、ときどきだけ計算(軽くする)
    const tl = Math.hypot(tx, ty); oil.calm = tl < 0.02 && !patty ? (oil.calm || 0) + dt0 : 0;
    if (oil.calm > 1.2) { oil.skip = (oil.skip || 0) + 1; if (oil.skip % 6) return; dt0 *= 6; }
    const dt = Math.min(0.05, dt0), fr = 1 - Math.min(1, 1.6 * dt);
    // 重さ(傾き) + フライパンとの摩擦
    for (const q of ps) { q.vx = (q.vx + tx * OILG * dt) * fr; q.vy = (q.vy + ty * OILG * dt) * fr; q.px = q.x; q.py = q.y; q.x += q.vx * dt; q.y += q.vy * dt; }
    // 格子に入れる(近くのつぶだけ調べる)
    fHead.fill(-1);
    const cellOf = (v) => Math.max(0, Math.min(FG - 1, ((v + 1.1) / FH) | 0));
    for (let i = 0; i < n; i++) { const c = cellOf(ps[i].x) * FG + cellOf(ps[i].y); fNext[i] = fHead[c]; fHead[c] = i; }
    for (let i = 0; i < n; i++) {
      const a = ps[i], cx = cellOf(a.x), cy = cellOf(a.y);
      let rho = 0, rhoN = 0, m = 0;
      for (let gx = Math.max(0, cx - 1); gx <= Math.min(FG - 1, cx + 1); gx++) for (let gy = Math.max(0, cy - 1); gy <= Math.min(FG - 1, cy + 1); gy++) {
        for (let j = fHead[gx * FG + gy]; j !== -1; j = fNext[j]) {
          if (j === i) continue; const b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 >= FH * FH || d2 < 1e-12) continue; const r = Math.sqrt(d2), q = 1 - r / FH;
          rho += q * q; rhoN += q * q * q; if (m < 256) { fNb[m] = j; fNq[m] = q; fNx[m] = dx / r; fNy[m] = dy / r; m++; }
        }
      }
      // 押し合い(密すぎると広がる)と、少しくっつく力(まとまって流れる)
      const pr = FK * (rho - FRHO), prN = FKN * rhoN; let mx = 0, my = 0;
      for (let k = 0; k < m; k++) {
        const b = ps[fNb[k]], q = fNq[k], D = Math.max(-0.004, Math.min(0.004, (pr * q + prN * q * q) * 0.5));
        b.x += fNx[k] * D; b.y += fNy[k] * D; mx -= fNx[k] * D; my -= fNy[k] * D;
        const dvx = (b.vx - a.vx) * q * 0.04, dvy = (b.vy - a.vy) * q * 0.04; a.vx += dvx; a.vy += dvy; b.vx -= dvx; b.vy -= dvy; // ねばり
      }
      a.x += mx; a.y += my;
    }
    for (const q of ps) {
      // ハンバーグの下からは押し出される(まわりでジュワジュワ)
      if (patty) { const dx = q.x - patty.x, dy = q.y - patty.y, d = Math.hypot(dx, dy), R0 = prU * 0.95; if (d < R0) { if (d > 1e-4) { q.x = patty.x + dx * R0 / d; q.y = patty.y + dy * R0 / d; } else { q.x = patty.x + R0; } } }
      const r = Math.hypot(q.x, q.y); if (r > 0.95) { q.x *= 0.95 / r; q.y *= 0.95 / r; }
      q.vx = (q.x - q.px) / dt; q.vy = (q.y - q.py) / dt;
    }
  }
  // 物理: 油のつぶ・ハンバーグが、傾きに合わせて低い方へ
  function stepPan(dt) {
    const tl0 = pan.tilt;
    pan.tilt = [tl0[0] + (pan.tgt[0] - tl0[0]) * Math.min(1, dt * 8), tl0[1] + (pan.tgt[1] - tl0[1]) * Math.min(1, dt * 8)];
    const [tx, ty] = pan.tilt, tl = Math.hypot(tx, ty);
    const P = pan.pt, g = panGeo(), prU = cookPR() / g.Ri;
    stepOilFluid(dt, tx, ty, P.state === "in" ? P : null, prU);
    if (P.state === "in" && flipT < 0) {
      let n = 0; for (const q of oil.p) if (Math.hypot(q.x - P.x, q.y - P.y) < prU * 1.25) n++;
      const slick = Math.min(1, n / 15), mu = slick > 0.25 ? 0.1 + (1 - slick) * 0.15 : (side[down] > 0.3 ? 0.95 : 0.6);
      if (tl > mu) { const k = (tl - mu) / tl * OILG * 0.8; P.vx += tx * k * dt; P.vy += ty * k * dt; }
      P.vx *= 1 - Math.min(1, 2.2 * dt); P.vy *= 1 - Math.min(1, 2.2 * dt);
      P.x += P.vx * dt; P.y += P.vy * dt;
      const lim = 0.98 - prU, r = Math.hypot(P.x, P.y);
      if (r > lim) { P.x *= lim / r; P.y *= lim / r; const vn = (P.vx * P.x + P.vy * P.y) / lim; if (vn > 0) { P.vx -= vn * P.x / lim; P.vy -= vn * P.y / lim; } }
      // ハンバーグがすべると、下の油を押しのける
      const sp = Math.hypot(P.vx, P.vy);
      if (sp > 0.05) for (const q of oil.p) { const dx = q.x - P.x, dy = q.y - P.y, d = Math.hypot(dx, dy); if (d < prU * 1.05 && d > 1e-4) { q.vx += dx / d * sp * 0.5; q.vy += dy / d * sp * 0.5; } }
    }
  }
  // ---------- 5. ソース ----------
  function goSauce() {
    stage = "sauce"; setStep("7/7 ソースをかける"); if (sizzleG) sizzleG.gain.setTargetAtTime(0, ac.currentTime, 0.2);
    setPanel(`<p class="hint">指で<b>ソースをかける</b>（絵や文字もOK）</p>
      <div class="btns" style="margin-bottom:8px"><button class="btn" id="sc1" style="background:#9c2a17;color:#fff">デミ</button><button class="btn" id="sc2" style="background:#e23b2a;color:#fff">ケチャップ</button><button class="btn" id="sc3" style="background:#fff7d6">マヨ</button><button class="btn" id="scU">↶</button></div>
      <div class="btns"><button class="btn go" id="finBtn">完成！</button></div>`);
    $("sc1").onclick = () => { sauceCol = "#5a1d0e"; };
    $("sc2").onclick = () => { sauceCol = "#c4261a"; };
    $("sc3").onclick = () => { sauceCol = "#fff4c9"; };
    $("scU").onclick = () => { if ((window.Plate3D && Plate3D.ok && Plate3D.running)) Plate3D.undo(); else sauce.pop(); };
    $("finBtn").onclick = finish;
    startPlate3D();
  }
  // 3Dのお皿: 焼けたハンバーグの絵(上の面)を作って、なぞった形の立体に貼る
  function startPlate3D() {
    if (!(window.Plate3D && Plate3D.ok) || !shape) return;
    const T = 1024, prT = T / 2 / texR(), c = document.createElement("canvas"); c.width = c.height = T;
    const c3 = (window.Chunk3D && Chunk3D.ok);
    plateCheese3D = DK.kind === "meat" && !!counts.cheese && side[0] + side[1] > 0.6;
    drawPatty(c.getContext("2d"), T / 2, T / 2, prT, side[1 - down], side[down], 1, 1 - down, c3); plateCheese3D = false;
    const S = Math.min(0.62, pattyR() / R * 0.74), H = pattyH(S) * 0.9; // お皿の大きさに対して本物くらい
    try { Plate3D.start({ pts: shape.pts, S, H, tex: c, uvK: prT / T, chunks: c3 && faceChunks ? faceChunks[1 - down] : null, bodyless: DK.kind === "pile", meat: DK.kind === "meat" && !isDessert(), dessert: isDessert() ? DK.recipe : null, cook: side[1 - down], cheese: DK.kind === "meat" && side[0] + side[1] > 0.6 ? (counts.cheese || 0) : 0 }, cv); } catch (e) { console.warn(e); }
  }
  const toPatty = (x, y) => [(x - CX) / pattyR(), (y - CY) / pattyR()];

  // ---------- 採点 ----------
  let resultData = null;
  function grade() {
    const c = (id) => counts[id] || 0, cm = [];
    const add = (t, cls, pri = 0) => cm.push({ t, cls, pri });
    let mat = 22;
    if (!c("meat")) { mat -= 25; add("肉が入ってないww それハンバーグ…？", "bad", 9); }
    else if (c("meat") >= 10) { mat -= 4; add(`肉の山ww ひき肉${c("meat")}つかみ、ほぼステーキ`, "bad", 9); }
    else if (c("meat") >= 4) add("肉の量えぐいww 肉肉しい！", "good", 3); else mat += 8;
    if (c("egg") >= 5) { mat -= 5; add(`たまご${c("egg")}個入れすぎて、もはやオムレツ`, "bad", 8); }
    if (c("milk") >= 6) { mat -= 5; add(`牛乳${c("milk")}杯でシャバシャバのスープ`, "bad", 8); }
    if (c("onionWhole")) { mat -= 12; add("玉ねぎがまるごと入ってるwwwww", "bad", 10); }
    else if (c("onionCut")) {
      const st = onionStats();
      if (st.max > 0.45) { mat -= 7; add("玉ねぎがでかすぎるww", "bad", 8); }
      else if (st.max > 0.25) { mat -= 2; add("玉ねぎがゴロゴロしてる", "bad", 4); }
      else if (st.max <= 0.12) { mat += 7; add(`玉ねぎのみじん切りが完璧（${st.n}個）`, "good", 3); }
      else mat += 4;
    } else { mat -= 3; add("玉ねぎなしでちょっとさみしい", "bad", 1); }
    if (c("meat")) {
      const mmx = mixModel();
      if (mmx.wet < -0.05) { mat -= 5; add("パサパサでボロボロ崩れる", "bad", 6); }
      else if (mmx.wet >= 0.9) { mat -= 6; add("ベチャベチャでまとまらないww", "bad", 7); }
      else if (mmx.wet >= 0.1 && mmx.wet < 0.45) { mat += 3; add("しっとり、ちょうどいいかたさ", "good", 2); }
    }
    if (c("panko") && c("milk")) { mat += 8; add("パン粉＋牛乳でふっくらジューシー", "good", 2); }
    else if (!c("panko")) { mat -= 4; add("パン粉なしでちょっとかため", "bad", 2); }
    else { mat -= 2; add("牛乳なしでちょいパサつく", "bad", 1); }
    if (c("eggShell")) { mat -= 8; add("たまごを割らずにまるごと入れたwww", "bad", 9); }
    if (c("onionSkin") && (c("onionCut") || c("onionWhole"))) { mat -= 6; add("玉ねぎの皮をむかずに入れた…カサカサ", "bad", 6); }
    if (c("shellBits")) { mat -= 5; add("ジャリッ…殻のかけらが入ってる", "bad", 7); }
    if (c("egg")) mat += 5;
    else if (!c("eggShell") && DK.kind === "meat") { mat -= 6; cracked = true; add("卵なしで焼いたら割れた…", "bad", 5); }
    const s = c("salt");
    if (!s) { mat -= 6; add("味がうすい…", "bad", 3); }
    else if (s <= 2) mat += 6;
    else if (s <= 4) { mat -= 4; add("ちょっとしょっぱい", "bad", 3); }
    else if (s < 15) { mat -= 10; add("しょっぱすぎるwww 塩の塊", "bad", 7); }
    else { mat -= 18; add(`塩こしょう${s}回www もはや塩でできたハンバーグ`, "bad", 9); }
    if (c("nutmeg")) { mat += 2; if (c("nutmeg") >= 4) add("ナツメグ入れすぎて香水みたい", "bad", 4); }
    if (c("cheese")) { mat += 4; add("チーズイン！とろ〜り最高", "good", 4); }
    if (c("banana")) { mat -= 8; add("バナナ入り…まさかのフルーティー", "bad", 9); }
    if (c("choco")) { mat -= 8; add("チョコ入り…バレンタイン仕様？", "bad", 9); }
    if (c("straw")) { mat -= 8; add("いちごハンバーグ…見た目だけかわいい", "bad", 9); }
    if (c("natto")) { mat -= 6; add("納豆入りでネバネバ…体には良さそう", "bad", 8); }
    mat = Math.max(0, Math.min(40, mat));
    // 形
    const q = shape ? shape.q : 0.5;
    const shp = Math.round(Math.max(0, Math.min(1, (q - 0.45) / 0.45)) * 20);
    if (q < 0.55) add("形が独創的すぎるww", "bad", 6); else if (q > 0.85) add("形がきれいな小判形", "good", 1);
    // 焼き
    let ck = 0;
    const lv = (L, name) => {
      if (L >= 0.85 && L <= 1.15) return 20;
      if (L >= 0.7 && L < 0.85) return 14;
      if (L > 1.15 && L <= 1.3) { add(`${name}がちょっとこげた`, "bad", 2); return 14; }
      if (L >= 0.5 && L < 0.7) { add(`${name}がちょっと生焼け`, "bad", 3); return 7; }
      if (L > 1.3 && L <= 1.55) { add(`${name}がこげすぎたwww`, "bad", 8); return 6; }
      if (L > 1.55) { add(`${name}が真っ黒で炭になったwww`, "bad", 10); return 0; }
      add(`${name}が生焼け…おなか痛くなるやつ`, "bad", 7); return 0;
    };
    if (!flips) { add("片面しか焼いてないww", "bad", 8); }
    if (oil) {
      const N = oil.p.length;
      if (!N) { mat = Math.max(0, mat - 6); add("油をひかずに焼いたらフライパンにくっついたww", "bad", 8); }
      else if (N >= OIL_MAX * 0.97) { mat = Math.max(0, mat - 8); add("油どばどば…もはや揚げハンバーグww", "bad", 9); }
      else if (N >= 285) { mat = Math.max(0, mat - 4); add("油ギトギト", "bad", 5); }
      else if (N < 40 || oil.cover < 0.3) { mat = Math.max(0, mat - 2); add("油が足りなくて一部くっついた", "bad", 3); }
      else { mat = Math.min(40, mat + 3); add("油をちょうどよくひけた", "good", 2); }
    }
    if (DK.kind !== "meat") {}
    else if (tossN === 0) { mat = Math.max(0, mat - 3); add("空気ぬきをサボった", "bad", 4); }
    else if (tossN >= 25) { mat = Math.max(0, mat - 5); add(`空気ぬき${tossN}回でペラペラのせんべいww`, "bad", 8); }
    else if (tossN >= 15) { mat = Math.max(0, mat - 1); add("ちょっと平べったい", "bad", 2); }
    else if (tossN >= 4) { mat = Math.min(40, mat + 4); add("ペチペチ空気ぬきバッチリ", "good", 2); }
    ck += lv(side[0], "表"); ck += lv(side[1], "裏");
    if (DK.kind === "liquid") add(DK.eggy ? "肉なし…焼いたらただの卵焼きになったww" : "牛乳を焼いた…フライパンに膜が残っただけww", "bad", 11);
    else if (DK.kind === "pile") add("つなぎの肉がなくてまとまらず、具材をバラバラに焼いただけww", "bad", 11);
    else if (MM && MM.wet >= 0.9) add("水分が多すぎて、だれて平べったくなった", "bad", 6);
    if (DK.kind === "liquid" && tossN > 0) add("液体をペチペチして、手も机もびしょびしょww", "bad", 7);
    if (DK.kind === "pile" && tossRes.crushed) add("具材をペチペチしてぐちゃぐちゃにつぶしたww", "bad", 7);
    if (DK.kind === "pile" && tossRes.lost) add(`まとまらないから${tossRes.lost}個も手からこぼれ落ちた`, "bad", 6);
    const total = Math.round(DK.kind === "meat" ? mat + shp + ck : Math.min(15, (mat + ck) * 0.3));
    const rank = total >= 90 ? "洋食屋さんのハンバーグ" : total >= 75 ? "おうちの自慢ハンバーグ" : total >= 55 ? "ふつうにおいしい" : total >= 35 ? "ギリ食べられる" : total >= 15 ? "これは事件" : "ハンバーグではない何か";
    cm.sort((a, b) => b.pri - a.pri);
    if (!cm.length) cm.push({ t: "文句なしのハンバーグ！", cls: "good", pri: 0 });
    return { total, rank, cm, mat, shp, ck };
  }
  // ---------- ハンバーグの名前: 材料・焼き加減・油・ペチペチの回数から決まる ----------
  const isDessert = () => DK.recipe === "crepe" || DK.recipe === "pancake";
  // 隠しレシピの名前: 焼き加減 + トッピング + 料理名
  function recipeName() {
    const c = (k) => counts[k] || 0, rc = recipeOf(DK.recipe), hi = Math.max(side[0], side[1]), lo = Math.min(side[0], side[1]);
    const pre = !flips ? "片面だけ焼き" : hi > 1.55 ? "真っ黒こげの" : hi > 1.3 ? "こげこげ" : lo < 0.5 ? "ほぼ生の" : lo < 0.7 ? "生焼け" : lo >= 0.85 && hi <= 1.15 ? "こんがり" : "";
    const top = isDessert() ? [["straw", "いちご"], ["banana", "バナナ"], ["choco", "チョコ"], ["cheese", "チーズ"]].filter(([k]) => c(k)).map(([, n]) => n).join("") : "";
    return pre + top + rc.name;
  }
  function recipeScore() {
    const c = (k) => counts[k] || 0;
    const lv = (L) => (L >= 0.85 && L <= 1.15 ? 20 : L >= 0.7 && L <= 1.3 ? 13 : L >= 0.5 && L <= 1.55 ? 6 : 0);
    let t = 30 + lv(side[0]) + lv(side[1]);
    if (!flips) t -= 10;
    if (isDessert()) t += Math.min(15, (c("straw") ? 6 : 0) + (c("banana") ? 5 : 0) + (c("choco") ? 5 : 0));
    else t += 10;
    if (oil && oil.p.length >= 40 && oil.p.length < 285) t += 5;
    if (c("salt") >= 3 || c("nutmeg") >= 3) t -= 10;
    return Math.max(0, Math.min(100, Math.round(t)));
  }
  function hamburgName(r) {
    if (DK.recipe) return recipeName();
    const c = (k) => counts[k] || 0, pre = [], fill = [];
    let bad = 0;
    // 油
    if (oil) { const N = oil.p.length; if (N >= OIL_MAX * 0.97) { pre.push("油ドバドバ"); bad++; } else if (N >= 285) { pre.push("油ギトギト"); bad++; } else if (!N) { pre.push("フライパンにこびりついた"); bad++; } }
    // 焼き加減(両面)
    const hi = Math.max(side[0], side[1]), lo = Math.min(side[0], side[1]);
    if (!flips) { pre.push("片面だけ焼き"); bad++; }
    else if (hi > 1.55) { pre.push("真っ黒こげの炭"); bad++; }
    else if (hi > 1.3) { pre.push("こげこげ"); bad++; }
    else if (lo < 0.5) { pre.push("ほぼ生"); bad++; }
    else if (lo < 0.7) { pre.push("生焼け"); bad++; }
    else if (lo >= 0.85 && hi <= 1.15) pre.push("こんがり");
    // ペチペチ(空気ぬき)
    if (DK.kind === "meat") {
      if (tossN === 0) { pre.push("空気パンパン"); bad++; } else if (tossN >= 25) { pre.push("ペラペラせんべい"); bad++; } else if (tossN >= 15) { pre.push("ぺったんこ"); bad++; } else if (tossN >= 4) pre.push("ふっくら");
      if (MM && MM.wet >= 0.9) { pre.push("ベチャベチャ"); bad++; } else if (MM && MM.wet < -0.05) { pre.push("パサパサ"); bad++; }
    } else if (tossN > 0) { pre.push(DK.kind === "liquid" ? "びしょびしょ" : "ぐちゃぐちゃ"); bad++; }
    if (c("salt") >= 15) { pre.push("塩のかたまり"); bad++; } else if (c("salt") >= 5) { pre.push("しょっぱすぎ"); bad++; }
    if (c("nutmeg") >= 4) { pre.push("香水みたいな"); bad++; }
    if (c("egg") >= 5) { pre.push("卵だらけ"); bad++; }
    if (c("milk") >= 6) { pre.push("シャバシャバ"); bad++; }
    // 入っている、ふつうじゃない具材
    const ODD = [["straw", "いちご"], ["banana", "バナナ"], ["natto", "納豆"], ["choco", "チョコレート"], ["cheese", "チーズ"]];
    for (const [k, n] of ODD) if (c(k)) fill.push(n);
    if (c("onionWhole")) { fill.unshift("玉ねぎまるごと"); bad++; }
    if (c("eggShell")) { fill.unshift("殻つき卵"); bad++; }
    if (c("shellBits")) { pre.push("ジャリジャリ"); bad++; }
    if (c("onionSkin") && (c("onionCut") || c("onionWhole"))) { pre.push("玉ねぎの皮入り"); bad++; }
    bad += fill.filter((n) => n !== "チーズ").length;
    // 名前すら付けられない
    if (bad >= 7 || (r.total < 8 && bad >= 5)) return "名前すら付けられない前代未聞ハンバーグ";
    const P = pre.slice(0, 3).join("");
    if (DK.kind !== "meat") {
      // 肉なし: 入っている物だけで「〜onlyハンバーグ」
      const all = []; if (c("milk")) all.push("牛乳"); if (c("egg")) all.push("卵"); if (c("onionCut")) all.push("玉ねぎ"); all.push(...fill);
      const body = all.length === 1 ? all[0] + "only" : all.slice(0, 3).join("と");
      return `${P}肉なし${body}ハンバーグ`;
    }
    const F = fill.length >= 2 ? fill.slice(0, -1).slice(0, 2).join("と") + "in" + fill[fill.length - 1] : fill.length ? fill[0] + "in" : "";
    if (!F && r.total >= 90) return `${P}洋食屋さんの特製ハンバーグ`;
    return `${P}${F}ハンバーグ`;
  }
  function finish() {
    stage = "result"; setStep("完成！"); panel.classList.add("hide"); { const gd = $("guide"); if (gd) gd.innerHTML = ""; }
    resultData = grade();
    if (DK.recipe) {
      const rc = recipeOf(DK.recipe), isNew = markFound(DK.recipe);
      resultData.total = recipeScore(); resultData.recipe = rc; resultData.isNew = isNew;
      resultData.rank = `${rc.e} 隠しレシピ${isNew ? "発見！" : ""}`;
      resultData.found = foundRecipes().length;
    }
    $("rankName").textContent = resultData.rank;
    $("scoreNum").innerHTML = `${resultData.total}<small> 点</small>`;
    resultData.name = hamburgName(resultData);
    $("hamName").textContent = resultData.name + (resultData.recipe ? `\n（ハンバーグを作ってたら${resultData.recipe.name}ができた！ 隠しレシピ ${resultData.found}/${RECIPES.length}）` : "");
    $("hamName").style.whiteSpace = "pre-line";
    $("result").classList.remove("hide"); if ((window.Plate3D && Plate3D.ok && Plate3D.running)) Plate3D.orbit(true);
    tone(660, 0.12, "sine", 0.16); tone(880, 0.12, "sine", 0.16, 0.12); tone(1320, 0.3, "sine", 0.16, 0.24);
  }
  $("againBtn").onclick = goCut;
  $("startBtn").onclick = () => { initAudio(); goCut(); };
  // シェア用のカード画像(1200x630): 左にお皿の写真、右に点数・ランク・名前
  function shareCard() {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 630; const g = c.getContext("2d"), r = resultData;
    g.fillStyle = "#fff6e3"; g.fillRect(0, 0, 1200, 630);
    if (window.Plate3D && Plate3D.ok && Plate3D.running) g.drawImage(Plate3D.snapshot(630), 0, 0, 630, 630);
    else drawPlate(g, 315, 300, 230);
    const w = 510, cx = 660 + w / 2; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#ffd23f"; g.strokeStyle = "#2b2b2b"; g.lineWidth = 5; g.font = "900 34px system-ui, sans-serif";
    const rw = Math.min(w, g.measureText(r.rank).width + 50); g.beginPath(); g.roundRect(cx - rw / 2, 70, rw, 60, 30); g.fill(); g.stroke();
    g.fillStyle = "#2b2b2b"; g.fillText(r.rank, cx, 101);
    g.font = "900 130px system-ui, sans-serif"; const tw = g.measureText(String(r.total)).width; g.fillText(String(r.total), cx - 24, 220);
    g.font = "900 44px system-ui, sans-serif"; g.fillText("点", cx - 24 + tw / 2 + 32, 245);
    // 名前(長いので折り返す)
    g.fillStyle = "#b8321f"; let fs = 40;
    const lines = (f) => { g.font = `900 ${f}px system-ui, sans-serif`; const out = []; let cur = ""; for (const ch of r.name) { if (g.measureText(cur + ch).width > w - 20) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur); return out; };
    let L = lines(fs); while (L.length > 4 && fs > 24) { fs -= 3; L = lines(fs); }
    L.slice(0, 5).forEach((t, i) => g.fillText(t, cx, 330 + i * fs * 1.3));
    g.fillStyle = "#777"; g.font = "800 26px system-ui, sans-serif"; g.fillText("#ハンバーグ作り", cx, 590);
    return new Promise((res) => c.toBlob(res, "image/jpeg", 0.86));
  }
  // 結果の文面を、このページのアドレスとともに共有する
  $("shareBtn").onclick = async () => {
    const r = resultData; if (!r) return;
    const text = r.recipe ? `ハンバーグ作ってたら${r.recipe.e}${r.recipe.name}ができたwww\n「${r.name}」${r.total}点（隠しレシピ ${r.found}/${RECIPES.length}）` : `ハンバーグ作ったら ${r.total}点「${r.rank}」だった\n名前は「${r.name}」`;
    const url = new URL("./", location.href).href;
    const payload = text + "\n" + url;
    const btn = $("shareBtn");
    try {
      if (navigator.share) { await navigator.share({ text: payload }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(payload); const prev = btn.textContent; btn.textContent = "コピーしました"; setTimeout(() => { btn.textContent = prev; }, 1600); } catch (e) {}
  };
  $("saveBtn").onclick = async () => {
    const r = resultData; if (!r) return;
    const S = 1080, c = document.createElement("canvas"); c.width = S; c.height = S;
    const g = c.getContext("2d");
    g.fillStyle = "#fff6e3"; g.fillRect(0, 0, S, S);
    if ((window.Plate3D && Plate3D.ok && Plate3D.running)) { const sc = Plate3D.snapshot(), sw = sc.width, sh = sc.height, k = Math.max(S / sw, S / sh); g.drawImage(sc, (S - sw * k) / 2, (S - sh * k) / 2, sw * k, sh * k); g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(0, 40, S, 100); g.fillRect(0, S - 150, S, 150); }
    else drawPlate(g, S / 2, S * 0.47, S * 0.36);
    g.fillStyle = "#2b2b2b"; g.textAlign = "center"; g.font = "900 64px system-ui, sans-serif";
    g.fillText(`${r.total}点 「${r.rank}」`, S / 2, 110);
    g.font = "800 40px system-ui, sans-serif"; g.fillStyle = "#d63c3c";
    { let fs = 44; g.font = `900 ${fs}px system-ui, sans-serif`; while (g.measureText(r.name).width > S - 80 && fs > 22) { fs -= 2; g.font = `900 ${fs}px system-ui, sans-serif`; } g.fillText(r.name, S / 2, S - 105); }
    g.fillStyle = "#777"; g.font = "800 30px system-ui, sans-serif"; g.fillText("#ハンバーグ作り", S / 2, S - 50);
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "hamburg.png", { type: "image/png" });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: "#ハンバーグ作り" }); return; } } catch {}
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "hamburg.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }, "image/png");
  };

  // ---------- 描画 ----------
  const lerp = (a, b, t) => a + (b - a) * t;
  function mix(c1, c2, t) { return `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`; }
  const RAW = [217, 128, 118], MIXED = [214, 150, 132];
  let meatTile = null;
  function meatPattern(g) {
    if (!meatTile) {
      const c = document.createElement("canvas"); c.width = c.height = 220; const x = c.getContext("2d");
      x.fillStyle = "#9e3a31"; x.fillRect(0, 0, 220, 220);
      const cols = ["#c0534a", "#8a2e27", "#d26a5f", "#b2453c", "#76261f", "#c25a4f", "#a63c33"];
      for (let i = 0; i < 2600; i++) {
        const px = Math.random() * 220, py = Math.random() * 220, r = 1.2 + Math.random() * 3.2;
        x.fillStyle = Math.random() < 0.13 ? `rgba(244,${222 + Math.random() * 20 | 0},${212 + Math.random() * 20 | 0},.95)` : cols[Math.random() * cols.length | 0];
        x.beginPath(); x.ellipse(px, py, r * (1 + Math.random()), r, Math.random() * 3, 0, 7); x.fill();
        // 端をまたいでも途切れないように
        if (px < 8 || py < 8) { x.beginPath(); x.ellipse(px + 220 * (px < 8), py + 220 * (py < 8), r, r, 0, 0, 7); x.fill(); }
      }
      meatTile = c;
    }
    return g.createPattern(meatTile, "repeat");
  }
  const COOK = [[0, [0, 0, 0]], [0.5, [196, 150, 118]], [0.9, [150, 86, 44]], [1.15, [104, 56, 26]], [1.45, [46, 30, 20]], [1.8, [18, 16, 15]]];
  function cookCol(L, base) {
    if (L <= 0) return mix(base, base, 0);
    for (let i = 1; i < COOK.length; i++) {
      if (L <= COOK[i][0]) { const a = COOK[i - 1], b = COOK[i]; const ca = i === 1 ? base : a[1]; return mix(ca, b[1], (L - a[0]) / (b[0] - a[0])); }
    }
    return mix(COOK[COOK.length - 1][1], COOK[COOK.length - 1][1], 0);
  }
  const rgbOf = (s) => s.match(/\d+/g).map(Number);
  function pieceDraw(g, pc, x, y, S) {
    const s = pc.s * S;
    g.save(); g.translate(x, y); g.rotate(pc.rot);
    if (pc.kind === "emoji") {
      g.font = `${s * 2}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(pc.e, 0, 0);
    } else {
      g.fillStyle = pc.col;
      if (pc.kind === "sq") g.fillRect(-s, -s, s * 2, s * 2);
      else if (pc.kind === "dot") { g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill(); }
      else if (pc.kind === "chunk") { g.beginPath(); g.moveTo(-s, -s * 0.6); g.lineTo(s * 0.8, -s); g.lineTo(s, s * 0.7); g.lineTo(-s * 0.7, s); g.closePath(); g.fill(); g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 1; g.stroke(); }
      else if (pc.kind === "slice") { g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill(); g.fillStyle = "rgba(120,90,40,.5)"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(Math.cos(i * 2.1) * s * 0.35, Math.sin(i * 2.1) * s * 0.35, s * 0.1, 0, 7); g.fill(); } }
      else if (pc.kind === "bean") { g.beginPath(); g.ellipse(0, 0, s, s * 0.65, 0, 0, 7); g.fill(); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 1; g.stroke(); }
      else if (pc.kind === "sprite") { const w = pc.sw * S; g.drawImage(pc.img, -w / 2, -w / 2, w, w); }
      else if (pc.kind === "poly") { const p = pc.poly; g.beginPath(); g.moveTo(p[0] * S, p[1] * S); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] * S, p[i + 1] * S); g.closePath(); g.fill(); g.strokeStyle = "rgba(150,120,70,.45)"; g.lineWidth = 1; g.stroke(); }
      else if (pc.kind === "egg") {
        // 白身: 透明で、ふちだけ少し白く光る。落ちた瞬間にベチャっと広がる(0.2秒)
        const sp = pc.t0 ? Math.min(1, (performance.now() - pc.t0) / 200) : 1, ws = s * (0.55 + 0.45 * (1 - (1 - sp) ** 3));
        { const s = ws;
        g.beginPath();
        for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2, rr = s * (1 + 0.13 * Math.sin(a * 3 + pc.rot * 2) + 0.06 * Math.sin(a * 5)); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9); }
        g.closePath(); g.fillStyle = "rgba(255,255,246,.2)"; g.fill();
        g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = Math.max(1, s * 0.05); g.stroke();
        g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(-s * 0.4, -s * 0.42, s * 0.24, s * 0.07, -0.6, 0, 7); g.fill(); }
        // 黄身: オレンジでつやつや
        const yr = s * 0.5, gr = g.createRadialGradient(-yr * 0.35, -yr * 0.35, yr * 0.08, 0, 0, yr);
        gr.addColorStop(0, "#ffd075"); gr.addColorStop(0.5, "#ff8f17"); gr.addColorStop(1, "#d9620a");
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, yr, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.ellipse(-yr * 0.38, -yr * 0.42, yr * 0.22, yr * 0.12, -0.6, 0, 7); g.fill();
      }
      else if (pc.kind === "puddle") {
        // 牛乳のたまり: 落ちた所からじわっと広がる。ふちは少し影、上につや
        // 牛乳のたまり: 落ちたらすぐ広がる。注いでいる間は量に合わせて大きくなる
        let ss;
        if (pc.vol != null) {
          const now = performance.now(), dt = Math.min(0.1, (now - (pc.lt || now)) / 1000); pc.lt = now;
          const target = s * Math.min(2.6, Math.sqrt(Math.max(0.12, pc.vol)) * 1.05);
          pc.cur += (target - pc.cur) * Math.min(1, dt * 10); ss = Math.max(pc.cur, s * 0.12);
        } else { const gr = pc.t0 ? Math.min(1, (performance.now() - pc.t0) / 220) : 1; ss = s * (0.4 + 0.6 * (1 - (1 - gr) ** 3)); }
        const blob = (r) => { g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, q = r * (1 + 0.1 * Math.sin(a * 3 + pc.rot * 3) + 0.06 * Math.sin(a * 5 + pc.rot)); i ? g.lineTo(Math.cos(a) * q, Math.sin(a) * q * 0.86) : g.moveTo(Math.cos(a) * q, Math.sin(a) * q * 0.86); } g.closePath(); };
        g.save(); g.rotate(-pc.rot);
        g.fillStyle = "rgba(120,110,95,.22)"; blob(ss * 1.06); g.fill();
        const lg = g.createRadialGradient(-ss * 0.3, -ss * 0.35, ss * 0.1, 0, 0, ss * 1.05);
        lg.addColorStop(0, "#ffffff"); lg.addColorStop(0.6, "#f7f4ea"); lg.addColorStop(1, "#e4ded0");
        g.fillStyle = lg; blob(ss); g.fill();
        g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.ellipse(-ss * 0.35, -ss * 0.38, ss * 0.28, ss * 0.07, -0.5, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.ellipse(ss * 0.3, ss * 0.32, ss * 0.1, ss * 0.03, -0.5, 0, 7); g.fill();
        g.restore();
      }
      else if (pc.kind === "shard") { g.beginPath(); g.moveTo(-s, 0); g.lineTo(0, -s * 0.8); g.lineTo(s, s * 0.3); g.closePath(); g.fill(); }
    }
    g.restore();
  }
  // ボウルの中身(肉・材料)。g に、中心(cx,cy)・ボウル半径R で描く
  function drawContents(g, cx, cy, R) {
    const k = knead, e = k * k * (3 - 2 * k);
    g.save(); g.beginPath(); g.arc(cx, cy, R * 0.92, 0, 7); g.clip();
    const sw = swirl;
    const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    // 肉(こねると1つの塊に)
    if (meatBits.length) {
      const col = mix(RAW, MIXED, e);
      g.fillStyle = meatPattern(g);
      const big = Math.min(0.86, 0.42 + meatBits.length * 0.025);
      g.globalAlpha = e; g.beginPath(); g.arc(cx, cy, big * R, 0, 7); g.fill(); g.globalAlpha = 1;
      // こねるほど混ざって、少し白っぽくなめらかに
      if (e > 0) { g.save(); g.globalAlpha = 0.16 * e; g.fillStyle = col; g.beginPath(); g.arc(cx, cy, big * R, 0, 7); g.fill(); g.restore(); }
      // 丸みの陰影(上が明るく、ふちが暗い)
      const sh = g.createRadialGradient(cx - big * R * 0.3, cy - big * R * 0.35, big * R * 0.1, cx, cy, big * R * 1.05);
      sh.addColorStop(0, "rgba(255,255,255,.18)"); sh.addColorStop(0.65, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(60,10,5,.28)");
      g.save(); g.globalAlpha = e; g.fillStyle = sh; g.beginPath(); g.arc(cx, cy, big * R, 0, 7); g.fill(); g.restore();
      // ひき肉のつぶつぶ
      g.fillStyle = "rgba(255,255,255,.08)";
      for (let i = 0; i < 60; i++) { const a = i * 2.39 + sw, rr = Math.sqrt((i * 37 % 60) / 60) * big * (0.4 + 0.6 * e); g.beginPath(); g.arc(cx + Math.cos(a) * rr * R, cy + Math.sin(a) * rr * R, R * 0.012, 0, 7); g.fill(); }
    }
    // 入れた順に重ねて描く: 先に入れた物は、あとから入れた肉の下にうもれる
    const order = pieces.map((pc) => ({ pc, seq: pc.seq || 0 }));
    if (meatBits.length && e < 0.98) for (const b of meatBits) order.push({ b, seq: b.seq || 0 });
    order.sort((a, b) => a.seq - b.seq);
    for (const it of order) {
      if (it.b) {
        const b = it.b, [x, y] = rot(lerp(b.x, 0, e * 0.85), lerp(b.y, 0, e * 0.85), sw * (1 - e)), rr = b.r * R * (1 + e * 0.6), px = cx + x * R, py = cy + y * R;
        // 肉のかたまり: 下に落ちる影 → 肉 → 上が明るい丸み
        g.fillStyle = "rgba(70,15,10,.22)"; g.beginPath(); g.arc(px + rr * 0.06, py + rr * 0.1, rr * 1.04, 0, 7); g.fill();
        g.fillStyle = meatPattern(g); g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
        const hl = g.createRadialGradient(px - rr * 0.35, py - rr * 0.4, rr * 0.05, px, py, rr);
        hl.addColorStop(0, "rgba(255,235,225,.2)"); hl.addColorStop(0.7, "rgba(0,0,0,0)"); hl.addColorStop(1, "rgba(60,10,5,.18)");
        g.fillStyle = hl; g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
        continue;
      }
      const pc = it.pc;
      if ((pc.d3 || (window.Bowl3D && Bowl3D.ok && Bowl3D.isSolid && Bowl3D.isSolid(pc.id) && Bowl3D.hasSolids)) && window.Bowl3D && Bowl3D.ok && (Bowl3D.hasOnion || Bowl3D.hasEgg || Bowl3D.hasSolids)) {
        // 3Dのかけらで見せている。こね始めの絵には、肉にまざる小さな玉ねぎのつぶだけ描いておく
        continue;
      }
      if (pc.melt && e > 0.6) continue;
      let x = lerp(pc.x0, pc.x1, e), y = lerp(pc.y0, pc.y1, e);
      [x, y] = rot(x, y, sw * 0.5);
      if (pc.after === "shell" && e > 0.5) { pieceDraw(g, { kind: "shard", s: 0.03, col: "#fdf8ee", rot: pc.rot }, cx + x * R, cy + y * R, R); pieceDraw(g, { kind: "shard", s: 0.025, col: "#fdf8ee", rot: pc.rot + 2 }, cx + (x + 0.06) * R, cy + (y - 0.04) * R, R); continue; }
      g.globalAlpha = pc.melt ? 1 - e : 1;
      pieceDraw(g, pc, cx + x * R, cy + y * R, R);
      g.globalAlpha = 1;
    }
    g.restore();
  }
  function drawBowl(t) {
    // 3Dのボウルが使える時: 中身の絵をボウルの中に貼って、3Dで描く
    if (window.Bowl3D && Bowl3D.ok) {
      Bowl3D.start();
      const tc = Bowl3D.tex(), tg = tc.getContext("2d");
      tg.clearRect(0, 0, 1024, 1024);
      if (stage === "knead" && mixCv) tg.drawImage(mixCv, 0, 0); else drawContents(tg, 512, 512, 512 / 0.92);
      const e = knead * knead * (3 - 2 * knead);
      const meatH = meatBits.length ? Math.min(0.15, 0.035 + meatBits.length * 0.012) * (0.75 + 0.25 * e) : 0.005;
      const info = Bowl3D.render(CY, $("panel").getBoundingClientRect().top - GUIDE_EXTRA, meatH);
      if (info) { CX = info.cx; CY = info.cy; R = info.rad / 0.92; }
      ctx.clearRect(0, 0, W, H);
    } else {
    // 影・ボウル
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(CX + 8, CY + 12, R * 1.08, R * 1.08, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(CX - R * 0.3, CY - R * 0.3, R * 0.1, CX, CY, R * 1.1);
    g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#d9dde2");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R * 1.06, 0, 7); ctx.fill();
    ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#eef1f4"; ctx.beginPath(); ctx.arc(CX, CY, R * 0.92, 0, 7); ctx.fill();
      if (stage === "knead" && mixCv) ctx.drawImage(mixCv, CX - R * 0.92, CY - R * 0.92, R * 1.84, R * 1.84); else drawContents(ctx, CX, CY, R);
    }
    // 飛んでくる材料
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], u = Math.max(0, Math.min(1, (t - f.t0) / 380));
      const x = lerp(f.x, f.tx, u), y = lerp(f.y, f.ty, u) - Math.sin(u * Math.PI) * 80;
      ctx.font = `44px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(f.g.e, x, y);
      if (u >= 1) { flying.splice(i, 1); const q = unitAt(f.tx, f.ty); dropIn(f.g, q[0], q[1]); }
    }
  }
  const pattyR = () => {
    if (shape && shape.sz) return R * shape.sz * (1 + 0.15 * tossThin()); // なぞった大きさ
    // 材料の量で大きさが変わる(多いほどでかい)
    const vol = (counts.meat || 0) * 1 + (counts.onionWhole || counts.onionCut ? 0.8 : 0) + Object.entries(counts).reduce((a, [k, v]) => a + (k === "meat" || k.startsWith("onion") ? 0 : v * 0.25), 0);
    return R * Math.max(0.42, Math.min(0.72, 0.38 + Math.sqrt(vol) * 0.15)) * (1 + 0.3 * tossThin());
  };
  function pattyPath(g, cx, cy, pr) {
    const p = shape.pts; g.beginPath(); g.moveTo(cx + p[0] * pr, cy + p[1] * pr);
    for (let i = 2; i < p.length; i += 2) g.lineTo(cx + p[i] * pr, cy + p[i + 1] * pr);
    g.closePath();
  }
  // ハンバーグ本体。top=上の面の焼け具合, rim=下の面の焼け具合(ふちに見える)
  function drawPatty(g, cx, cy, pr, top, rim, sy = 1, face = 1, noChunks = false) {
    const pTex = faceTex ? faceTex[face] : pattyTex, pChunks = noChunks ? [] : faceChunks ? faceChunks[face] : chunks;
    if (!shape) return;
    const base = counts.meat ? (MM ? MM.col.map((v, i) => Math.round(lerp(v, [240, 222, 208][i], 0.35))) : MIXED) : DK.kind === "liquid" ? (DK.eggy ? [250, 196, 70] : [246, 242, 232]) : [226, 205, 160];
    g.save(); g.translate(cx, cy); g.scale(1, sy); g.translate(-cx, -cy);
    // 置いた影 → 下の面(ふちからのぞく) → 横の厚み → 上の面
    g.save(); g.shadowColor = "rgba(40,15,5,.42)"; g.shadowBlur = pr * 0.2; g.shadowOffsetY = pr * 0.1;
    g.translate(cx, cy + pr * 0.09); g.scale(1.03, 1.03); g.translate(-cx, -cy - pr * 0.09);
    g.fillStyle = cookCol(rim, base); pattyPath(g, cx, cy + pr * 0.09, pr); g.fill(); g.restore();
    g.fillStyle = "rgba(40,10,5,.3)"; g.save(); g.translate(cx, cy + pr * 0.09); g.scale(1.03, 1.03); g.translate(-cx, -cy - pr * 0.09); pattyPath(g, cx, cy + pr * 0.09, pr); g.fill(); g.restore();
    const col = cookCol(top, base);
    for (let k = Math.max(1, Math.round(6 * (1 - 0.75 * tossThin()))); k >= 1; k--) { g.fillStyle = col; pattyPath(g, cx, cy + pr * 0.012 * k, pr); g.fill(); g.fillStyle = `rgba(30,8,4,${0.06 + k * 0.035})`; g.fill(); }
    g.fillStyle = col; pattyPath(g, cx, cy, pr); g.fill();
    g.save(); pattyPath(g, cx, cy, pr); g.clip();
    // こねた生地の表面(混ぜた色・玉ねぎ・パン粉のつぶがそのまま)
    if (pTex) { const cov = Math.max(1.35, texR()); g.drawImage(pTex, cx - pr * cov, cy - pr * cov, pr * cov * 2, pr * cov * 2); }
    for (const ch of pChunks) {
      const w = ch.sw * pr * 1.8 * (0.75 + 0.25 * ch.vis), x = cx + ch.px * pr, y = cy + ch.py * pr;
      g.save(); g.translate(x, y); g.rotate(ch.rot);
      g.shadowColor = "rgba(40,12,5,.55)"; g.shadowBlur = w * 0.18; g.shadowOffsetX = w * 0.06; g.shadowOffsetY = w * 0.1;
      g.drawImage(ch.img, -w / 2, -w / 2, w, w);
      g.restore();
      // ふちに肉がかぶって、埋まっている感じ
      const eg = g.createRadialGradient(x, y, w * 0.25, x, y, w * 0.6); eg.addColorStop(0, "rgba(0,0,0,0)"); eg.addColorStop(1, `rgba(${(MM ? MM.col : [185, 86, 75]).join(",")},${0.55 * (1 - ch.vis * 0.6)})`);
      g.fillStyle = eg; g.beginPath(); g.arc(x, y, w * 0.6, 0, 7); g.fill();
    }
    // つぶつぶ(ひき肉の質感)
    for (const s of speck) { g.fillStyle = s.l ? "rgba(255,255,255,.1)" : "rgba(60,20,10,.12)"; g.beginPath(); g.arc(cx + (face ? s.x : -s.x) * pr, cy + s.y * pr, s.r * pr * 0.7, 0, 7); g.fill(); }
    // 中に入っている材料(生地の絵に入っていない物だけ: 殻のかけら)
    const darken = pattyTex ? Math.min(0.92, Math.max(0, top) * 0.75) : Math.min(0.85, Math.max(0, top) * 0.55);
    for (const pc of pattyPieces) {
      if (pc.after === "shell") { pieceDraw(g, { kind: "shard", s: 0.05, col: "#fdf8ee", rot: pc.rot }, cx + pc.px * pr, cy + pc.py * pr, pr); continue; }
      if (pc.kind === "emoji" || pattyTex) continue;
      pieceDraw(g, pc, cx + pc.px * pr, cy + pc.py * pr, pc.kind === "poly" || pc.kind === "sprite" ? pr * 1.8 : pr);
    }
    // 焼き色を上から重ねる
    if (pattyTex && top > 0) drawSear(g, cx, cy, pr, top, noChunks);
    else if (darken > 0) { g.globalAlpha = darken; g.fillStyle = col; g.fillRect(cx - pr * 2, cy - pr * 2, pr * 4, pr * 4); g.globalAlpha = 1; }
    // ふっくらした丸み(真ん中が明るく、ふちが暗い)+てかり
    if (!noChunks) { // 3Dのときは本物の光で丸みが出るので、絵の光(白いもや)は描かない
    const dm = g.createRadialGradient(cx - pr * 0.15, cy - pr * 0.2, pr * 0.1, cx, cy, pr * 1.3);
    dm.addColorStop(0, "rgba(255,240,230,.12)"); dm.addColorStop(0.6, "rgba(0,0,0,0)"); dm.addColorStop(1, "rgba(40,10,5,.42)");
    g.fillStyle = dm; g.fillRect(cx - pr * 2, cy - pr * 2, pr * 4, pr * 4);
    const hl = g.createRadialGradient(cx - pr * 0.35, cy - pr * 0.4, 0, cx - pr * 0.35, cy - pr * 0.4, pr * 0.8);
    hl.addColorStop(0, "rgba(255,255,255,.2)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hl; g.fillRect(cx - pr * 2, cy - pr * 2, pr * 4, pr * 4);
    }
    // 焼けると、ふちからとろけ出る(チーズ・チョコ・いちごの汁・バナナ)。焼けすぎるとこげる
    { const L = Math.max(top, rim), a0 = clamp01((L - 0.3) / 0.45);
      if (a0 > 0) for (const m of melts) {
        if (plateCheese3D && m.col[0] === 255) continue; // お皿ではチーズは立体でとろける
        const x = cx + Math.cos(m.a) * m.d * pr, y = cy + Math.sin(m.a) * m.d * pr, rr = m.r * pr * (0.5 + 0.6 * a0), burn = clamp01((L - 1.05) / 0.5);
        const col = m.col.map((v) => Math.round(v * (1 - 0.6 * burn)));
        g.save(); g.globalAlpha = a0; g.fillStyle = `rgb(${col.join(",")})`; g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, m.a, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(x - rr * 0.25, y - rr * 0.25, rr * 0.35, rr * 0.12, -0.5, 0, 7); g.fill(); g.restore();
      }
    }
    // 割れ
    if (cracked) { g.strokeStyle = "rgba(40,20,10,.75)"; g.lineWidth = Math.max(2, pr * 0.03); for (const c of cracks) { g.beginPath(); g.moveTo(cx + c[0] * pr, cy + c[1] * pr); for (let i = 2; i < c.length; i += 2) g.lineTo(cx + c[i] * pr, cy + c[i + 1] * pr); g.stroke(); } }
    g.restore();
    // はみ出す大きい物(まるごと玉ねぎ・殻つき卵・いちご)
    for (const pc of pattyPieces) if (pc.kind === "egg3d" && eggImg && face === 1 && !noChunks && !chunks.some((c) => c.mesh)) {
      // 割らずに入れた卵: 3Dの見た目のまま、肉に半分うまって残る
      const w = pr * 0.62, x = cx + pc.px * 0.55 * pr, y = cy + pc.py * 0.55 * pr;
      g.save();
      if (top > 0.4) g.filter = `brightness(${Math.max(0.4, 1 - (top - 0.4) * 0.45)}) sepia(${Math.min(0.6, (top - 0.4) * 0.6)})`;
      g.shadowColor = "rgba(40,12,5,.5)"; g.shadowBlur = w * 0.15; g.shadowOffsetX = w * 0.05; g.shadowOffsetY = w * 0.08;
      g.drawImage(eggImg, x - w / 2, y - w / 2, w, w); g.restore();
      const eg = g.createRadialGradient(x, y, w * 0.2, x, y, w * 0.55); eg.addColorStop(0, "rgba(0,0,0,0)"); eg.addColorStop(1, `rgba(${(MM ? MM.col : [185, 86, 75]).join(",")},.45)`);
      g.fillStyle = eg; g.beginPath(); g.arc(x, y, w * 0.55, 0, 7); g.fill();
    }
    for (const pc of pattyPieces) if (pc.kind === "emoji" && pc.after !== "shell") {
      g.save();
      if (top > 0.4) g.filter = `brightness(${Math.max(0.25, 1 - (top - 0.4) * 0.6)}) sepia(${Math.min(0.8, (top - 0.4) * 0.8)})`; // 一緒に焼けて茶色くなる
      if (pc.id === "onionL" && wholeSprite) { const w = pr * 1.15; g.shadowColor = "rgba(40,12,5,.5)"; g.shadowBlur = w * 0.15; g.shadowOffsetY = w * 0.08; g.drawImage(wholeSprite.img, cx + pc.px * pr - w / 2, cy + pc.py * pr - w / 2, w, w); }
      else pieceDraw(g, { ...pc, s: pc.s * 1.3 }, cx + pc.px * pr, cy + pc.py * pr, pr);
      g.restore();
    }
    g.strokeStyle = "rgba(60,25,10,.22)"; g.lineWidth = 1.5; pattyPath(g, cx, cy, pr); g.stroke();
    g.restore();
  }
  // 焼き色(メイラード反応の茶色)。L=焼け具合 0生〜1ちょうど〜1.5こげ
  const SEAR = [[0, [255, 255, 255]], [0.5, [242, 228, 214]], [1.0, [212, 178, 148]], [1.25, [158, 122, 96]], [1.5, [84, 64, 50]], [1.9, [36, 29, 25]]];
  function searCol(L) {
    for (let i = 1; i < SEAR.length; i++) if (L <= SEAR[i][0]) { const a = SEAR[i - 1], b = SEAR[i], u = (L - a[0]) / (b[0] - a[0]); return a[1].map((v, k) => Math.round(v + (b[1][k] - v) * u)); }
    return SEAR[SEAR.length - 1][1];
  }
  let crustTex = null;
  function crustTile() {
    if (crustTex) return crustTex;
    const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
    // こんがりのムラ(濃い茶色のしみ・カラメル色のつや・細かい焼き目)
    for (let i = 0; i < 220; i++) { const px = Math.random() * 256, py = Math.random() * 256, r = 4 + Math.random() * 18; const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(60,28,10,${0.25 + Math.random() * 0.3})`); gr.addColorStop(1, "rgba(60,28,10,0)"); x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2); }
    for (let i = 0; i < 160; i++) { const px = Math.random() * 256, py = Math.random() * 256, r = 3 + Math.random() * 10; const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(196,120,60,${0.2 + Math.random() * 0.25})`); gr.addColorStop(1, "rgba(196,120,60,0)"); x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2); }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(40,18,8,${Math.random() * 0.35})`; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    crustTex = c; return c;
  }
  function drawSear(g, cx, cy, pr, L, d3 = false) {
    const k = Math.min(1, L);
    // 色味だけ、こんがりした茶色に(明るさ=生地のつぶつぶの模様は残す) → 焼けるほど少しずつ暗く
    g.save(); g.globalCompositeOperation = "color"; g.globalAlpha = 0.85 * k; g.fillStyle = searTint(); g.fillRect(cx - pr * 2, cy - pr * 2, pr * 4, pr * 4); g.restore();
    g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = `rgb(${searCol(L).join(",")})`; g.fillRect(cx - pr * 2, cy - pr * 2, pr * 4, pr * 4); g.restore();
    // こんがりのムラ
    g.save(); g.globalAlpha = 0.9 * k; g.drawImage(crustTile(), cx - pr * 1.4, cy - pr * 1.4, pr * 2.8, pr * 2.8); g.restore();
    // ふちほど濃く焼ける
    const eg = g.createRadialGradient(cx, cy, pr * 0.55, cx, cy, pr * 1.15); eg.addColorStop(0, "rgba(40,18,8,0)"); eg.addColorStop(1, `rgba(40,18,8,${0.45 * k})`);
    g.fillStyle = eg; g.fillRect(cx - pr * 2, cy - pr * 2, pr * 4, pr * 4);
    // 焦げ(こげすぎると黒い焦げ跡が増える)
    if (L > 1.15) { const b = Math.min(1, (L - 1.15) / 0.5); g.save(); g.globalAlpha = b; for (let i = 0; i < 26; i++) { const a = i * 2.4, r = Math.sqrt((i * 37 % 26) / 26) * pr * 0.95; g.fillStyle = "rgba(15,10,8,.55)"; g.beginPath(); g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, pr * (0.05 + (i % 5) * 0.02), pr * 0.04, a, 0, 7); g.fill(); } g.restore(); }
    // 肉汁のつや(ちょうどいい焼き加減ほど、てらっと光る)
    const gl = k * Math.max(0, 1 - Math.max(0, L - 1.1) * 2);
    if (gl > 0) {
      g.save(); g.globalAlpha = gl;
      const sh = g.createRadialGradient(cx - pr * 0.3, cy - pr * 0.35, 0, cx - pr * 0.3, cy - pr * 0.35, pr * 0.7);
      sh.addColorStop(0, "rgba(255,230,200,.35)"); sh.addColorStop(1, "rgba(255,230,200,0)"); g.fillStyle = sh; if (!d3) g.fillRect(cx - pr * 2, cy - pr * 2, pr * 4, pr * 4); // 3Dは本物の光でつやが出る
      g.fillStyle = "rgba(255,245,230,.55)";
      for (let i = 0; i < 22; i++) { const a = i * 1.7 + 0.5, r = Math.sqrt((i * 13 % 22) / 22) * pr * 0.8; g.beginPath(); g.ellipse(cx - pr * 0.1 + Math.cos(a) * r, cy - pr * 0.1 + Math.sin(a) * r * 0.85, pr * 0.018, pr * 0.01, -0.6, 0, 7); g.fill(); }
      g.restore();
    }
  }
  function drawSauce(g, cx, cy, pr) {
    g.lineCap = "round"; g.lineJoin = "round";
    for (const s of [...sauce, ...(sauceCur ? [sauceCur] : [])]) {
      const w = pr * 0.11;
      const path = (ox, oy) => { g.beginPath(); s.pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x * pr + ox, cy + y * pr + oy) : g.moveTo(cx + x * pr + ox, cy + y * pr + oy))); if (s.pts.length === 1) g.lineTo(cx + s.pts[0][0] * pr + ox + 0.1, cy + s.pts[0][1] * pr + oy); };
      const rgb = rgbOf(s.col.startsWith("#") ? `rgb(${parseInt(s.col.slice(1, 3), 16)},${parseInt(s.col.slice(3, 5), 16)},${parseInt(s.col.slice(5, 7), 16)})` : s.col);
      g.strokeStyle = "rgba(30,10,5,.25)"; g.lineWidth = w * 1.1; path(w * 0.08, w * 0.15); g.stroke(); // 影
      g.strokeStyle = `rgb(${rgb.map((v) => v * 0.7 | 0).join(",")})`; g.lineWidth = w; path(0, 0); g.stroke(); // ふち(濃い)
      g.strokeStyle = s.col; g.lineWidth = w * 0.72; path(0, 0); g.stroke();
      g.strokeStyle = `rgba(${rgb.map((v) => Math.min(255, v + 60)).join(",")},.55)`; g.lineWidth = w * 0.35; path(-w * 0.08, -w * 0.12); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = w * 0.12; path(-w * 0.18, -w * 0.22); g.stroke(); // つや
    }
  }
  // 白い陶器のお皿(ふちが少し高く、まん中がくぼむ)
  function drawPlateBase(g, cx, cy, size) {
    g.save(); g.shadowColor = "rgba(60,30,20,.35)"; g.shadowBlur = size * 0.12; g.shadowOffsetY = size * 0.06;
    g.fillStyle = "#f4f1ec"; g.beginPath(); g.arc(cx, cy, size, 0, 7); g.fill(); g.restore();
    const rim = g.createRadialGradient(cx - size * 0.3, cy - size * 0.35, size * 0.2, cx, cy, size);
    rim.addColorStop(0, "#ffffff"); rim.addColorStop(0.75, "#f2efe9"); rim.addColorStop(1, "#d9d4cb");
    g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, size, 0, 7); g.fill();
    // くぼみ(内側の段差)
    const well = g.createRadialGradient(cx + size * 0.05, cy + size * 0.08, size * 0.5, cx, cy, size * 0.78);
    well.addColorStop(0, "rgba(0,0,0,0)"); well.addColorStop(0.85, "rgba(120,105,90,.10)"); well.addColorStop(1, "rgba(120,105,90,.22)");
    g.fillStyle = well; g.beginPath(); g.arc(cx, cy, size * 0.78, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = size * 0.012; g.beginPath(); g.arc(cx, cy, size * 0.79, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = size * 0.02; g.beginPath(); g.arc(cx, cy, size * 0.96, Math.PI * 1.05, Math.PI * 1.65); g.stroke();
  }
  // 湯気(ゆらゆら上る)
  function drawSteam(g, cx, cy, pr, t) {
    g.save(); g.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      const ph = (t / 2200 + k / 3) % 1, x0 = cx + (k - 1) * pr * 0.45, y0 = cy - pr * 0.2 - ph * pr * 1.3;
      g.strokeStyle = `rgba(255,255,255,${0.35 * Math.sin(ph * Math.PI)})`; g.lineWidth = pr * 0.09;
      g.beginPath(); for (let i = 0; i <= 10; i++) { const u = i / 10; const x = x0 + Math.sin(u * 6 + t / 500 + k) * pr * 0.07, y = y0 - u * pr * 0.55; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    g.restore();
  }
  function drawPlate(g, cx, cy, size) {
    drawPlateBase(g, cx, cy, size);
    const pr = size * 0.55 * Math.min(1.25, pattyR() / (R * 0.6));
    drawPatty(g, cx - size * 0.08, cy, pr, side[1 - down], side[down], 1, 1 - down);
    drawSauce(g, cx - size * 0.08, cy, pr);
    if (g === ctx) drawSteam(g, cx - size * 0.08, cy, pr, performance.now());
    g.font = `${size * 0.26}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.save(); g.shadowColor = "rgba(60,30,20,.3)"; g.shadowBlur = size * 0.04; g.shadowOffsetY = size * 0.02;
    g.fillText("🥦", cx + size * 0.62, cy - size * 0.28); g.fillText("🍟", cx + size * 0.6, cy + size * 0.32); g.restore();
  }
  let smoke = [], bubbles = [];
  // 材料の画面と同じギンガムチェックのテーブル
  function drawTable() {
    if (!clothPat) {
      const c = document.createElement("canvas"); c.width = c.height = 88; const x = c.getContext("2d");
      x.fillStyle = "#fbf5ea"; x.fillRect(0, 0, 88, 88); x.fillStyle = "rgba(214,72,72,.42)";
      for (let i = 0; i < 2; i++) { x.fillRect(i * 44, 0, 22, 88); x.fillRect(0, i * 44, 88, 22); }
      x.fillStyle = "rgba(0,0,0,.035)"; for (let y = 0; y < 88; y += 2) x.fillRect(0, y, 88, 1);
      clothPat = ctx.createPattern(c, "repeat");
    }
    ctx.fillStyle = clothPat; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H * 0.4, Math.min(W, H) * 0.3, W / 2, H * 0.4, Math.max(W, H) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(60,30,20,.18)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  let woodPat = null;
  function drawWoodBoard(x, y, w, h) {
    if (!woodPat) {
      const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#e8cf9f"); gr.addColorStop(1, "#dcbd88"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 80; i++) { g.strokeStyle = `rgba(150,105,55,${Math.random() * 0.14})`; g.lineWidth = 1 + Math.random() * 2; const yy = Math.random() * 256; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(170, yy + Math.random() * 10 - 5, 340, yy + Math.random() * 10 - 5, 512, yy + Math.random() * 8 - 4); g.stroke(); }
      for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,80,40,${Math.random() * 0.08})`; g.lineWidth = 1; const xx = Math.random() * 512, yy = Math.random() * 256; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 20 + Math.random() * 40, yy + Math.random() * 4 - 2); g.stroke(); } // 包丁のあと
      woodPat = ctx.createPattern(c, "repeat");
    }
    const r = Math.min(w, h) * 0.06, th = h * 0.06;
    ctx.save(); ctx.shadowColor = "rgba(50,25,10,.4)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#b98d55"; ctx.beginPath(); ctx.roundRect(x, y + th, w, h, r); ctx.fill(); ctx.restore(); // 厚み
    ctx.fillStyle = woodPat; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    const lg = ctx.createLinearGradient(x, y, x + w * 0.4, y + h); lg.addColorStop(0, "rgba(255,255,255,.18)"); lg.addColorStop(1, "rgba(0,0,0,.06)");
    ctx.fillStyle = lg; ctx.fill();
  }
  function drawBoard() {
    drawTable();
    drawWoodBoard(CX - R * 1.05, CY - R * 0.85, R * 2.1, R * 1.7);
    if (shape) drawPatty(ctx, CX, CY, pattyR(), 0, 0);
    else if (!drawPts) {
      ctx.fillStyle = "rgba(43,43,43,.45)"; ctx.font = "900 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("ここに形をなぞってね", CX, CY);
    }
    if (drawPts && drawPts.length > 2) {
      ctx.strokeStyle = "#c8695c"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(drawPts[0], drawPts[1]); for (let i = 2; i < drawPts.length; i += 2) ctx.lineTo(drawPts[i], drawPts[i + 1]); ctx.stroke();
    }
  }
  // コンロ(黒い天板・五徳・青い火)
  function drawStove(t, g) {
    const bg = ctx.createRadialGradient(g.x, g.y, R * 0.4, g.x, g.y, Math.max(W, H));
    bg.addColorStop(0, "#3b3c40"); bg.addColorStop(1, "#151619"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.beginPath(); ctx.ellipse(W * 0.3, H * 0.15, W * 0.6, H * 0.08, -0.3, 0, 7); ctx.fill();
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + 0.3;
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(a);
      const gg = ctx.createLinearGradient(0, -R * 0.05, 0, R * 0.05); gg.addColorStop(0, "#4a4a4d"); gg.addColorStop(0.5, "#1c1c1e"); gg.addColorStop(1, "#0d0d0e");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.roundRect(g.Ro * 0.8, -R * 0.05, g.Ro * 0.6, R * 0.1, R * 0.03); ctx.fill();
      ctx.restore();
    }
    for (let k = 0; k < 28; k++) {
      const a = k / 28 * Math.PI * 2, fl = 0.7 + 0.3 * Math.sin(t / 70 + k * 1.7), rr = g.Ro * (1.03 + 0.05 * fl);
      const x = g.x + Math.cos(a) * rr, y = g.y + Math.sin(a) * rr, fr = g.Ro * 0.07 * fl;
      const fg = ctx.createRadialGradient(x, y, 0, x, y, fr);
      fg.addColorStop(0, "rgba(150,200,255,.75)"); fg.addColorStop(0.5, "rgba(60,120,255,.35)"); fg.addColorStop(1, "rgba(40,80,255,0)");
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y, fr, 0, 7); ctx.fill();
    }
  }
  // 取っ手のつかむ所(画面の線分)
  function handleSeg(g) { const c = Math.cos(g.ha), sn = Math.sin(g.ha); return [g.x + c * g.Ro * 1.15, g.y + sn * g.Ro * 1.15, g.x + c * g.Ro * 2.25, g.y + sn * g.Ro * 2.25]; }
  // フライパン本体(上から見たところ)
  function drawPanBody(g) {
    const Ro = g.Ro, Ri = g.Ri, X = g.x, Y = g.y;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(g.ha);
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = Ro * 0.08; ctx.shadowOffsetY = Ro * 0.05;
    const mb = ctx.createLinearGradient(0, -Ro * 0.08, 0, Ro * 0.08); mb.addColorStop(0, "#c9ccd1"); mb.addColorStop(0.5, "#7d8188"); mb.addColorStop(1, "#4b4e53");
    ctx.fillStyle = mb; ctx.beginPath(); ctx.roundRect(Ro * 0.92, -Ro * 0.075, Ro * 0.32, Ro * 0.15, Ro * 0.03); ctx.fill();
    const hb = ctx.createLinearGradient(0, -Ro * 0.1, 0, Ro * 0.1); hb.addColorStop(0, "#4a4a4c"); hb.addColorStop(0.35, "#1d1d1f"); hb.addColorStop(1, "#0a0a0b");
    ctx.fillStyle = hb; ctx.beginPath(); ctx.roundRect(Ro * 1.18, -Ro * 0.1, Ro * 1.1, Ro * 0.2, Ro * 0.1); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.roundRect(Ro * 1.22, -Ro * 0.08, Ro * 1.0, Ro * 0.04, Ro * 0.02); ctx.fill();
    ctx.fillStyle = "#0b0b0c"; ctx.beginPath(); ctx.ellipse(Ro * 2.15, 0, Ro * 0.045, Ro * 0.032, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#aeb2b8"; for (const yy of [-0.035, 0.035]) { ctx.beginPath(); ctx.arc(Ro * 0.99, yy * Ro, Ro * 0.018, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.arc(X + Ro * 0.03, Y + Ro * 0.06, Ro * 1.01, 0, 7); ctx.fill();
    const rim = ctx.createLinearGradient(X - Ro, Y - Ro, X + Ro, Y + Ro);
    rim.addColorStop(0, "#9aa0a8"); rim.addColorStop(0.45, "#4e5359"); rim.addColorStop(0.55, "#3a3e43"); rim.addColorStop(1, "#7b8188");
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(X, Y, Ro, 0, 7); ctx.fill();
    const wall = ctx.createRadialGradient(X, Y, Ri * 0.98, X, Y, Ro * 0.97);
    wall.addColorStop(0, "#151618"); wall.addColorStop(1, "#2d3034");
    ctx.fillStyle = wall; ctx.beginPath(); ctx.arc(X, Y, Ro * 0.965, 0, 7); ctx.fill();
    const fl = ctx.createRadialGradient(X - Ri * 0.2, Y - Ri * 0.25, Ri * 0.1, X, Y, Ri);
    fl.addColorStop(0, "#34373c"); fl.addColorStop(1, "#1b1d20");
    ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(X, Y, Ri, 0, 7); ctx.fill();
    if (!drawPanBody.dots) { drawPanBody.dots = []; for (let k = 0; k < 260; k++) drawPanBody.dots.push([Math.sqrt(Math.random()) * 0.98, Math.random() * 7, Math.random()]); }
    for (const [rr, a, l] of drawPanBody.dots) { ctx.fillStyle = l > 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.18)"; ctx.fillRect(X + Math.cos(a) * rr * Ri, Y + Math.sin(a) * rr * Ri, 1.4, 1.4); }
    ctx.strokeStyle = "rgba(255,255,255,.025)"; ctx.lineWidth = 1;
    for (let k = 1; k < 14; k++) { ctx.beginPath(); ctx.arc(X, Y, Ri * k / 14, 0, 7); ctx.stroke(); }
    const sp = ctx.createRadialGradient(X - Ri * 0.35, Y - Ri * 0.4, 0, X - Ri * 0.35, Y - Ri * 0.4, Ri * 0.55);
    sp.addColorStop(0, "rgba(255,255,255,.13)"); sp.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(X, Y, Ri, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, Y, Ro - 1, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
  }
  // 油: つぶを、にじんだ丸で描いて油の膜にする → うすい金色 + 照明のつや
  let oilBlob = null;
  function updateOilMask() {
    if (!oilBlob) { oilBlob = document.createElement("canvas"); oilBlob.width = oilBlob.height = 32; const b = oilBlob.getContext("2d"), gr = b.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,.42)"); gr.addColorStop(0.45, "rgba(255,255,255,.3)"); gr.addColorStop(0.8, "rgba(255,255,255,.1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); b.fillStyle = gr; b.fillRect(0, 0, 32, 32); }
    const m = oil.cv.getContext("2d"); m.clearRect(0, 0, 256, 256);
    const br = 0.16 * 128;
    for (const q of oil.p) m.drawImage(oilBlob, 128 + q.x * 128 - br, 128 + q.y * 128 - br, br * 2, br * 2);
  }
  function drawOil(t, g) {
    updateOilMask();
    if (!oil.p.length) return;
    const X = g.x, Y = g.y, Ri = g.Ri;
    ctx.save(); ctx.beginPath(); ctx.arc(X, Y, Ri, 0, 7); ctx.clip();
    const tc = drawOil.tc || (drawOil.tc = document.createElement("canvas")); tc.width = tc.height = 256; const w = tc.getContext("2d");
    w.fillStyle = "#e0ad3c"; w.fillRect(0, 0, 256, 256); w.globalCompositeOperation = "destination-in"; w.drawImage(oil.cv, 0, 0); w.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.28; ctx.drawImage(tc, X - Ri, Y - Ri, Ri * 2, Ri * 2); ctx.globalAlpha = 1;
    const sh = drawOil.sh || (drawOil.sh = document.createElement("canvas")); sh.width = sh.height = 256; const q = sh.getContext("2d");
    const hx = 90 + Math.sin(t / 900) * 6, hy = 80 + Math.cos(t / 1100) * 5;
    const hg = q.createRadialGradient(hx, hy, 0, hx, hy, 130); hg.addColorStop(0, "rgba(255,255,255,1)"); hg.addColorStop(0.35, "rgba(255,250,235,.5)"); hg.addColorStop(1, "rgba(255,255,255,.08)");
    q.fillStyle = hg; q.fillRect(0, 0, 256, 256);
    q.fillStyle = "rgba(255,255,255,.8)"; for (let k = 0; k < 9; k++) { const a = k * 2.3 + t / 2000; q.beginPath(); q.arc(128 + Math.cos(a) * (30 + k * 9), 128 + Math.sin(a) * (30 + k * 9), 1.4, 0, 7); q.fill(); }
    q.globalCompositeOperation = "destination-in"; q.drawImage(oil.cv, 0, 0); q.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.55; ctx.drawImage(sh, X - Ri, Y - Ri, Ri * 2, Ri * 2); ctx.globalAlpha = 1;
    ctx.restore();
  }
  // 油つぼ(陶器のつぼ + 油 + キッチンペーパー)と、手に持ったペーパー
  function drawPot(x, y, r) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(x + r * 0.08, y + r * 0.15, r * 1.05, r * 1.0, 0, 0, 7); ctx.fill();
    const og = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); og.addColorStop(0, "#f4f0e8"); og.addColorStop(1, "#b9b2a6");
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = "#2e2a24"; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, 7); ctx.fill();
    const lg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, 0, x, y, r * 0.8); lg.addColorStop(0, "#f5d27a"); lg.addColorStop(1, "#b98322");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, r * 0.76, 0, 7); ctx.fill();
    if (!oil.brush) drawPaper(x + r * 0.15, y - r * 0.1, r * 0.55, 1);
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = `900 ${Math.max(10, r * 0.45)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText("油", x, y + r * 1.65);
    ctx.restore();
  }
  function drawPaper(x, y, r, load) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(r * 0.1, r * 0.2, r, r * 0.85, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgb(${250 - 20 * load},${248 - 40 * load},${240 - 110 * load})`;
    ctx.beginPath(); for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 2, q = r * (0.85 + 0.15 * Math.sin(a * 5)); k ? ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q * 0.85) : ctx.moveTo(Math.cos(a) * q, Math.sin(a) * q * 0.85); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(150,140,120,.45)"; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.6 + k * r * 0.35, -r * 0.5); ctx.quadraticCurveTo(-r * 0.4 + k * r * 0.35, 0, -r * 0.6 + k * r * 0.35, r * 0.5); ctx.stroke(); }
    ctx.restore();
  }
  function drawPan(t, dt) {
    const g = panGeo();
    stepPan(dt);
    drawStove(t, g);
    // 傾けた分だけ、低い方へずれて・傾いた向きに少しつぶれて見える
    const [tx, ty] = pan.tilt, tl = Math.hypot(tx, ty), ang = Math.atan2(ty, tx);
    ctx.save(); ctx.translate(g.x + tx * g.Ro * 0.05, g.y + ty * g.Ro * 0.05); ctx.rotate(ang); ctx.scale(1 - 0.08 * tl, 1); ctx.rotate(-ang); ctx.translate(-g.x, -g.y);
    drawPanBody(g);
    drawOil(t, g);
    // 傾きの陰影(低い方が暗い)
    if (tl > 0.02) { const lg = ctx.createLinearGradient(g.x - tx * g.Ri, g.y - ty * g.Ri, g.x + tx * g.Ri, g.y + ty * g.Ri); lg.addColorStop(0, `rgba(255,255,255,${0.06 * tl})`); lg.addColorStop(1, `rgba(0,0,0,${0.3 * tl})`); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(g.x, g.y, g.Ro, 0, 7); ctx.fill(); }
    const pr = cookPR(), P = pan.pt;
    if (P.state === "in") drawPanPatty(t, g, pr);
    ctx.restore();
    // 油つぼ・まな板の上のハンバーグ(フライパンの外)
    const pp = potPos(); drawPot(pp[0], pp[1], R * 0.17);
    if (P.state === "wait" || P.state === "held" || P.state === "back") {
      const wp = waitPos();
      drawWoodBoard(wp[0] - pr * 1.25, wp[1] - pr * 1.05, pr * 2.5, pr * 2.1);
      if (P.state === "back") { P.sx += (wp[0] - P.sx) * Math.min(1, dt * 10); P.sy += (wp[1] - P.sy) * Math.min(1, dt * 10); if (Math.hypot(wp[0] - P.sx, wp[1] - P.sy) < 1) P.state = "wait"; }
      const x = P.state === "wait" ? wp[0] : P.sx, y = P.state === "wait" ? wp[1] : P.sy;
      if (P.state === "held") { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + pr * 0.15, y + pr * 0.3, pr * 1.05, pr * 0.9, 0, 0, 7); ctx.fill(); }
      drawPatty(ctx, x, y, pr, 0, 0);
      if (P.state === "wait" && cookPhase === "prep") { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "800 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("↙ 指でフライパンへ", x, y + pr * 1.35); }
    }
    if (oil.brush) drawPaper(oil.brush.x, oil.brush.y, R * 0.1, Math.max(0, oil.load));
  }
  function drawPanPatty(t, g, pr) {
    const P = pan.pt, X = g.x + P.x * g.Ri, Y = g.y + P.y * g.Ri;
    let sy = 1;
    if (flipT >= 0) {
      const u = Math.max(0, (t - flipT) / 450);
      if (u >= 1) { flipT = -1; down = 1 - down; nz(3500, 0.6, 0.5, 0.6, "highpass"); }
      else sy = Math.abs(Math.cos(u * Math.PI));
    }
    const showTop = flipT >= 0 && (t - flipT) / 450 > 0.5 ? down : 1 - down;
    const showRim = showTop === down ? 1 - down : down;
    const jg = ctx.createRadialGradient(X, Y, pr * 0.9, X, Y, pr * 1.35);
    jg.addColorStop(0, `rgba(110,55,20,${Math.min(0.45, side[down] * 0.3)})`); jg.addColorStop(1, "rgba(110,55,20,0)");
    ctx.fillStyle = jg; ctx.beginPath(); ctx.arc(X, Y, pr * 1.4, 0, 7); ctx.fill();
    const heat = Math.min(1, 0.3 + side[down] * 0.6), rate = (oil.p.length ? Math.min(1, 0.3 + oil.p.length / 600) : 0.1) * heat;
    if (Math.random() < rate) bubbles.push({ a: rnd(0, 6.3), r: rnd(0.98, 1.2), t, s: rnd(1.5, 3.5) });
    bubbles = bubbles.filter((b) => t - b.t < 420);
    for (const b of bubbles) {
      const u = Math.max(0, (t - b.t) / 420), x = X + Math.cos(b.a) * pr * b.r, y = Y + Math.sin(b.a) * pr * b.r, rr = b.s * (0.6 + u);
      ctx.strokeStyle = `rgba(255,236,180,${0.7 * (1 - u)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(255,250,230,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.35, 0, 7); ctx.fill();
    }
    const du = Math.min(1, (t - oil.dropT) / 220), dropS = 1 + 0.08 * (1 - du);
    ctx.save(); ctx.translate(X, Y); ctx.scale(dropS, dropS); ctx.translate(-X, -Y);
    drawPatty(ctx, X, Y, pr, side[showTop], side[showRim], Math.max(0.05, sy), showTop);
    ctx.restore();
    const burn = Math.max(0, side[down] - 1.05);
    if (burn > 0 && Math.random() < Math.min(0.9, burn * 2.5)) smoke.push({ x: X + rnd(-pr, pr), y: Y + rnd(-pr * 0.5, pr * 0.5), t, dark: side[down] > 1.35 });
    if (side[down] > 0.4 && Math.random() < 0.15) smoke.push({ x: X + rnd(-pr * 0.7, pr * 0.7), y: Y + rnd(-pr * 0.4, pr * 0.4), t, dark: false, steam: true });
    smoke = smoke.filter((s2) => t - s2.t < 1600);
    for (const s2 of smoke) { const u = Math.max(0, (t - s2.t) / 1600), a0 = s2.steam ? 0.18 : 0.45; ctx.fillStyle = s2.dark ? `rgba(40,40,40,${a0 * (1 - u)})` : `rgba(235,235,235,${a0 * (1 - u)})`; ctx.beginPath(); ctx.arc(s2.x + Math.sin(u * 6 + s2.x) * 10, s2.y - u * R * 0.9, 8 + u * 26, 0, 7); ctx.fill(); }
  }

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (innerWidth !== W || innerHeight !== H) resize(); // 画面の大きさが変わったのに知らせが来ないブラウザ向け
    layout();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bowlStage = stage === "ing" || stage === "knead" || stage === "title";
    if (!bowlStage && window.Bowl3D && Bowl3D.running) Bowl3D.stop();
    // ほかの場面の3Dは止める(止めないと、前の場面の3Dが上に残って見える)
    if (window.Plate3D && Plate3D.ok && Plate3D.running && stage !== "sauce" && stage !== "result") Plate3D.stop();
    if (window.Pan3D && Pan3D.ok && Pan3D.running && stage !== "cook") Pan3D.stop();
    if (window.Board3D && Board3D.ok && Board3D.running && stage !== "shape") Board3D.stop();
    if (stage === "cut" && use3D()) { ctx.clearRect(0, 0, W, H); drawCutBoard(t); requestAnimationFrame(loop); return; }
    if (bowlStage && window.Bowl3D && Bowl3D.ok) { drawBowl(t); requestAnimationFrame(loop); return; }
    if ((stage === "sauce" || stage === "result") && (window.Plate3D && Plate3D.ok && Plate3D.running)) { ctx.clearRect(0, 0, W, H); Plate3D.render(CY, dt); requestAnimationFrame(loop); return; }
    ctx.fillStyle = "#fff6e3"; ctx.fillRect(0, 0, W, H);
    // テーブルのチェック柄
    ctx.fillStyle = "rgba(255,120,120,.10)";
    for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 0 : 40; x < W; x += 80) ctx.fillRect(x, y, 40, 40);
    if (stage === "cut") drawCutBoard(t);
    else if (stage === "ing" || stage === "knead" || stage === "title") drawBowl(t);
    else if (stage === "toss") drawToss(t);
    else if (stage === "shape" && window.Board3D && Board3D.ok) {
      // 3Dのまな板と生地。2Dにはなぞっている線と案内だけ
      if (!Board3D.running) Board3D.start();
      Board3D.render(CY, R); ctx.clearRect(0, 0, W, H);
      if (!shape && !drawPts) { ctx.fillStyle = "rgba(43,43,43,.5)"; ctx.font = "900 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("ここに形をなぞってね", CX, CY); }
      if (drawPts && drawPts.length > 2) { ctx.strokeStyle = "#c8695c"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(drawPts[0], drawPts[1]); for (let i = 2; i < drawPts.length; i += 2) ctx.lineTo(drawPts[i], drawPts[i + 1]); ctx.stroke(); }
    }
    else if (stage === "shape") drawBoard();
    else if (stage === "cook") {
      if (cookPhase === "fry" && flipT < 0) { side[down] += dt / COOK_SEC * cookRate() * (1 + 0.7 * tossThin()) * (oil && !oil.p.length ? 1.15 : 1); side[1 - down] += dt / 110; }
      if (!cracked && DK.kind === "meat" && tossN === 0 && side[down] > 0.6) { cracked = true; toast("パカッ…空気がぬけてなくて割れた！"); nz(1800, 3, 0.4, 0.15); }
      if (sizzleG && ac) sizzleG.gain.setTargetAtTime(cookPhase === "fry" ? (0.05 + Math.min(0.12, side[down] * 0.06)) * (oil && oil.p.length ? Math.min(1.6, 0.8 + oil.p.length / 500) : 0.6) : (oil && oil.p.length ? 0.012 : 0), ac.currentTime, 0.1);
      if (!cracked && DK.kind === "meat" && !counts.egg && !counts.eggShell && side[down] > 0.5) { cracked = true; toast("ピキッ…割れた！（つなぎの卵がない）"); nz(1800, 3, 0.4, 0.15); }
      if ((window.Pan3D && Pan3D.ok && Pan3D.running)) drawPan3D(t, dt); else drawPan(t, dt);
    } else if (stage === "sauce") {
      drawTable(); drawPlateBase(ctx, CX, CY, R * 1.02);
      drawPatty(ctx, CX, CY, pattyR(), side[1 - down], side[down], 1, 1 - down); drawSauce(ctx, CX, CY, pattyR()); drawSteam(ctx, CX, CY, pattyR(), t);
    } else if (stage === "result") {
      drawTable(); drawPlate(ctx, CX, CY, R * 1.05);
    }
    requestAnimationFrame(loop);
  }
  resize(); requestAnimationFrame(loop);
})();
