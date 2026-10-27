// 焼く場面の3D(three.js)。暗いキッチン・コンロ・本物っぽいフライパン(木の取っ手)・油の膜・立体のハンバーグ。
// 動き(油のつぶ・傾き・ハンバーグの位置)はアプリ側の計算を使い、ここは「見た目」と「指がどこを触ったか」を担当する。
(() => {
  if (!window.THREE) { window.Pan3D = { ok: false }; return; }
  const V = THREE.Vector3;
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  let r = null, scene, cam, cv, running = false;
  let panG, panBody, handle, oilMesh, oilTex, oilMaskCv, pattyMesh = null, pattyTex = null, pattyCv = null;
  let pot, potHit, board, boardPatty = null, flames = [], bubbles, steamSprites = [];
  const RO = 1.0, RI = 0.86, BOTTOM = 0.06; // フライパンの外の半径・底の半径・底の高さ
  const ray = new THREE.Raycaster();
  const POT = new V(-0.78, 0, -1.95), BOARD = new V(0.42, 0, -2.05);
  let layoutCY = 300, layoutBot = 99999, layoutTop = 52;

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    return t;
  }
  function envMap() {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x141210, side: THREE.BackSide })));
    const panel = (w, h, col, x, y, z, ry, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
    panel(3, 1.5, 0xfff2dc, 0, 5.9, -1, 0, Math.PI / 2); // 天井の照明(油のつやに映る)
    panel(2, 3, 0xffe0b8, -9.9, 2, 0, Math.PI / 2);
    const pm = new THREE.PMREMGenerator(r); const t = pm.fromScene(s, 0.02).texture; pm.dispose(); return t;
  }
  function init() {
    cv = document.createElement("canvas"); cv.id = "c3k";
    cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100dvh;display:none;z-index:0;pointer-events:none";
    document.body.insertBefore(cv, document.body.firstChild);
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0f0d0b);
    scene.environment = envMap();
    cam = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
    scene.add(new THREE.HemisphereLight(0xffeedd, 0x1a120c, 0.35));
    // 真上のスポットライト(だし巻きのサイトのような、暗い部屋に1灯)
    const spot = new THREE.SpotLight(0xfff0dc, 2.4, 14, 0.62, 0.55, 1.2); spot.position.set(-0.6, 5.5, 0.8); spot.target.position.set(0, 0, -0.4);
    spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.radius = 5; spot.shadow.bias = -0.0004; scene.add(spot, spot.target);
    // 台(グレーのつや消し)
    const counter = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ color: lin(0x77736e), roughness: 0.85 }));
    counter.rotation.x = -Math.PI / 2; counter.position.y = -0.32; counter.receiveShadow = true; scene.add(counter);
    // コンロ: 五徳(黒い鉄)と、青い火
    const iron = new THREE.MeshStandardMaterial({ color: lin(0x1a1a1b), roughness: 0.55, metalness: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 8, 64), iron); ring.rotation.x = Math.PI / 2; ring.position.y = -0.24; ring.castShadow = true; scene.add(ring);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3, bar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.06), iron); bar.position.set(Math.cos(a) * 0.82, -0.2, Math.sin(a) * 0.82); bar.rotation.y = -a; bar.castShadow = true; scene.add(bar); }
    const fmat = new THREE.MeshBasicMaterial({ color: 0x4a8cff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), fmat); f.position.set(Math.cos(a) * 0.55, -0.2, Math.sin(a) * 0.55); f.rotation.z = Math.cos(a) * -0.5; f.rotation.x = Math.sin(a) * 0.5; scene.add(f); flames.push(f); }
    const glow = new THREE.PointLight(0x4f7dff, 0.7, 3); glow.position.set(0, -0.15, 0); scene.add(glow);
    // 油のつやに映る小さな照明(てらっと光る点)
    const shine = new THREE.PointLight(0xfff4e0, 0.9, 7, 1.5); shine.position.set(0.35, 2.6, 0.9); scene.add(shine);

    // ---- フライパン(傾けるのでグループ) ----
    panG = new THREE.Group(); scene.add(panG);
    const P = [[0, BOTTOM], [RI, BOTTOM], [RI + 0.04, BOTTOM + 0.012], [RO - 0.02, 0.2], [RO, 0.215], [RO + 0.012, 0.205], [RO - 0.012, 0.19], [RI + 0.03, -0.0], [RI - 0.02, -0.02], [0, -0.02]];
    const speck = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#26272a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.25)"; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } g.strokeStyle = "rgba(255,255,255,.025)"; for (let k = 1; k < 40; k++) { g.beginPath(); g.arc(w / 2, h / 2, k * 6.4, 0, 7); g.stroke(); } });
    panBody = new THREE.Mesh(new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x, y)), 96),
      new THREE.MeshPhysicalMaterial({ map: speck, color: lin(0xffffff), roughness: 0.42, metalness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.3, side: THREE.DoubleSide }));
    panBody.castShadow = true; panBody.receiveShadow = true; panG.add(panBody);
    // 底の平らな面(フッ素加工のつぶ・同心円の模様)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(RI, 72), panBody.material); floor.rotation.x = -Math.PI / 2; floor.position.y = BOTTOM + 0.001; floor.receiveShadow = true; panG.add(floor);
    // 木の取っ手(手前=画面の下へ)
    const wood = canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#7a4520"; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${Math.random() < 0.5 ? "40,18,6" : "190,120,60"},${0.15 + Math.random() * 0.2})`; g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y + 1); g.stroke(); } });
    const metal = new THREE.MeshStandardMaterial({ color: lin(0x9a9ea4), roughness: 0.3, metalness: 1 });
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.32), metal); bracket.position.set(0, 0.17, RO + 0.13); bracket.rotation.x = -0.18; panG.add(bracket);
    handle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 1.05, 16), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 }));
    handle.rotation.x = Math.PI / 2 - 0.18; handle.position.set(0, 0.24, RO + 0.78); handle.castShadow = true; panG.add(handle);
    // 油の膜(油のつぶから作った絵を、透ける金色のつやで)
    oilMaskCv = document.createElement("canvas"); oilMaskCv.width = oilMaskCv.height = 256;
    oilTex = new THREE.CanvasTexture(oilMaskCv);
    oilMesh = new THREE.Mesh(new THREE.CircleGeometry(RI, 72), new THREE.MeshPhysicalMaterial({ color: lin(0xb87e22), transparent: true, alphaMap: oilTex, opacity: 0.6, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.0, envMapIntensity: 3, depthWrite: false }));
    oilMesh.rotation.x = -Math.PI / 2; oilMesh.position.y = BOTTOM + 0.006; panG.add(oilMesh);
    // 油のパチパチ(小さな泡)
    bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshPhysicalMaterial({ color: lin(0xfff0c0), transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1 }), 80);
    bubbles.count = 0; panG.add(bubbles);

    // ---- 油つぼ(黒い陶器・油・キッチンペーパー) ----
    pot = new THREE.Group();
    const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.32, 32, 1, true), new THREE.MeshStandardMaterial({ color: lin(0x161514), roughness: 0.35, side: THREE.DoubleSide }));
    potBody.position.y = 0.16; potBody.castShadow = true;
    const potOil = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshPhysicalMaterial({ color: lin(0xc98a2a), roughness: 0.05, clearcoat: 1 })); potOil.rotation.x = -Math.PI / 2; potOil.position.y = 0.27;
    const paper = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), new THREE.MeshStandardMaterial({ color: lin(0xf2ece0), roughness: 0.9, flatShading: true })); paper.position.set(0.04, 0.36, 0); paper.scale.set(1, 0.8, 0.9); paper.castShadow = true;
    pot.add(potBody, potOil, paper); pot.userData.paper = paper; pot.position.copy(POT).setY(-0.32); scene.add(pot);
    potHit = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.6, 12), new THREE.MeshBasicMaterial({ visible: false })); potHit.position.copy(POT).setY(-0.05); scene.add(potHit);
    // ---- まな板(ハンバーグを置いておく) ----
    const boardTex = canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#d9b98a"); gr.addColorStop(1, "#c9a675"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(130,90,45,${Math.random() * 0.18})`; g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 5, w * 0.6, y - 5, w, y + 2); g.stroke(); } });
    board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.2), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.7 }));
    board.position.copy(BOARD).setY(-0.28); board.castShadow = true; board.receiveShadow = true; scene.add(board);
    // 湯気・煙のスプライト
    const smokeTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); steamSprites.push({ s, t: -1 }); }
  }
  // ---------- ハンバーグ(なぞった形のふっくら立体。絵は焼けるたびに描き直す) ----------
  function radiusAt(pts, th) {
    const dx = Math.cos(th), dy = Math.sin(th); let best = 0;
    for (let i = 0, n = pts.length / 2; i < n; i++) {
      const j = (i + 1) % n, ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[2 * j], by = pts[2 * j + 1];
      const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
      const t = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
    }
    return best || 1;
  }
  function pattyGeo(pts, S, H, uvK) {
    const K = 18, M = 96, pos = [], uv = [], idx = [], rad = [];
    const { ox, oy } = outline(pts, M);
    for (let k = 0; k <= K; k++) {
      const s = k / K, h = H * Math.pow(Math.max(0, 1 - Math.pow(s, 5)), 0.42);
      for (let j = 0; j <= M; j++) { const px = ox[j] * s, py = oy[j] * s; pos.push(px * S, h, py * S); uv.push(0.5 + px * uvK, 0.5 - py * uvK); }
    }
    for (let k = 0; k < K; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  // なぞった形のふち(線にそって等間隔に M 点)。くぼみのある形(ねこの耳など)でも、ふちをそのまま使う
  function outline(pts, M) {
    const n = pts.length / 2, cum = [0];
    let A = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; A += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1]; }
    const P = []; for (let i = 0; i < n; i++) { const k = A >= 0 ? i : n - 1 - i; P.push(pts[2 * k], pts[2 * k + 1]); } // 向きをそろえる
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(P[2 * j] - P[2 * i], P[2 * j + 1] - P[2 * i + 1])); }
    const L = cum[n] || 1, ox = [], oy = []; let seg = 0;
    for (let m = 0; m < M; m++) {
      const t = m / M * L; while (seg < n - 1 && cum[seg + 1] < t) seg++;
      const a = seg, b = (seg + 1) % n, u = (t - cum[seg]) / ((cum[seg + 1] - cum[seg]) || 1);
      ox.push(P[2 * a] + (P[2 * b] - P[2 * a]) * u); oy.push(P[2 * a + 1] + (P[2 * b + 1] - P[2 * a + 1]) * u);
    }
    ox.push(ox[0]); oy.push(oy[0]); return { ox, oy };
  }
  let opts = null, chunkG = [], vessel = null, spread = 1;
  // 液体(肉なし)はボウルに入ったまま。フライパンの上で傾けて流しこむ
  function makeVessel() {
    const prof = [[0, 0], [0.34, 0], [0.5, 0.05], [0.6, 0.2], [0.63, 0.3], [0.6, 0.3], [0.57, 0.2], [0.48, 0.07], [0.33, 0.025], [0, 0.025]];
    const m = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64), new THREE.MeshStandardMaterial({ color: lin(0xd8dce0), roughness: 0.22, metalness: 1, side: THREE.DoubleSide }));
    m.castShadow = true; m.receiveShadow = true; return m;
  }
  function makePatty(o) {
    pattyCv = o.cv; pattyTex = new THREE.CanvasTexture(pattyCv); pattyTex.encoding = THREE.sRGBEncoding; pattyTex.anisotropy = 8;
    const mat = new THREE.MeshPhysicalMaterial({ map: pattyTex, bumpMap: pattyTex, bumpScale: 0.01, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.4 });
    const geo = pattyGeo(o.pts, o.S, o.H, o.uvK);
    pattyMesh = new THREE.Mesh(geo, mat); pattyMesh.castShadow = true; pattyMesh.receiveShadow = true; mat.visible = !o.bodyless;
    scene.add(pattyMesh);
    // 出ている具材(面ごと)を立体で。上を向いている面のぶんだけ見せる
    chunkG = (o.chunks || []).map((list) => { const g = window.Chunk3D && Chunk3D.ok ? Chunk3D.group(list, o.pts, o.S, o.H, [5, 0.42], 0) : new THREE.Group(); pattyMesh.add(g); return g; });
  }
  // ---------- カメラ(前の少し上から。お皿のときと同じく、横幅にフライパンが入る距離) ----------
  function place() {
    const W = innerWidth, H = innerHeight;
    if (r.__w !== W || r.__h !== H) { r.setSize(W, H, false); r.__w = W; r.__h = H; cv.style.width = W + "px"; cv.style.height = H + "px"; } cam.aspect = W / H;
    const hh = Math.atan(Math.tan(THREE.MathUtils.degToRad(17)) * cam.aspect);
    let dist = Math.max(4.2, 1.45 / Math.tan(hh));
    const el = 0.98, set = () => { cam.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist + 0.1); cam.lookAt(0, 0, -0.55); cam.setViewOffset(W, H, 0, H / 2 - layoutCY, W, H); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); };
    // 縦にも収める(iPadなど): 取っ手の先が下のパネルにかくれず、奥の油つぼ・まな板が上に切れないところまで引く
    const sy = (x, y, z) => (1 - new V(x, y, z).project(cam).y) / 2 * H;
    set();
    for (let i = 0; i < 20; i++) { if (sy(0, 0.3, RO + 1.32) <= layoutBot - 8 && sy(0, 0.35, -2.75) >= layoutTop) break; dist *= 1.06; set(); }
  }
  const ndc = (x, y) => ({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 });
  // フライパンの底の面(傾きこみ)で、指の点 → フライパンの単位(底の半径=1)
  function unitAt(x, y) {
    ray.setFromCamera(ndc(x, y), cam);
    const inv = new THREE.Matrix4().copy(panG.matrixWorld).invert();
    const o = ray.ray.origin.clone().applyMatrix4(inv), d = ray.ray.direction.clone().transformDirection(inv);
    if (Math.abs(d.y) < 1e-6) return null;
    const t = (BOTTOM - o.y) / d.y; if (t < 0) return null;
    const p = o.addScaledVector(d, t); return [p.x / RI, p.z / RI];
  }
  function toPanWorld(ux, uy, y) { return new V(ux * RI, y, uy * RI).applyMatrix4(panG.matrixWorld); }

  window.Pan3D = {
    ok: true,
    get running() { return running; },
    start(o) {
      if (!r) init();
      if (pattyMesh) { scene.remove(pattyMesh); pattyMesh.geometry.dispose(); pattyMesh = null; }
      opts = o; makePatty(o);
      if (vessel) { scene.remove(vessel); vessel = null; }
      if (o.vessel) { vessel = makeVessel(); vessel.position.set(BOARD.x, -0.24, BOARD.z); scene.add(vessel); }
      spread = 1;
      cv.style.display = "block"; running = true;
    },
    stop() { running = false; if (cv) cv.style.display = "none"; },
    // 指がどこを触ったか: handle(取っ手) / pot(油つぼ) / patty(まな板のハンバーグ) / pan(フライパンの中)
    pick(x, y) {
      ray.setFromCamera(ndc(x, y), cam);
      const hits = ray.intersectObjects([handle, potHit, board, pattyMesh, vessel].filter(Boolean), false);
      for (const h of hits) {
        if (h.object === handle) return "handle";
        if (h.object === potHit) return "pot";
        if ((h.object === board || h.object === pattyMesh || h.object === vessel) && opts && opts.state() === "wait") return "patty";
      }
      return "pan";
    },
    unitAt,
    // 毎コマ: s = { tilt, pt:{state,x,y,sx,sy}, flipU(-1 or 0..1), top, rim, oilCv, oilN, heat, held:[x,y] }
    render(cy, dt, s) {
      if (!running) return;
      layoutCY = cy; if (s.bot) layoutBot = s.bot; if (s.top0) layoutTop = s.top0; const t = performance.now() / 1000;
      // 傾き: 指で動かした向きが低くなる
      const [tx, ty] = s.tilt; panG.rotation.set(ty * 0.3, 0, -tx * 0.3);
      panG.updateMatrixWorld(true);
      for (const f of flames) { const k = 0.75 + 0.25 * Math.sin(t * 22 + f.position.x * 9); f.scale.set(1, k, 1); }
      // 油の膜: 白いつぶの絵を黒の上に描いて、透ける量にする
      const mg = oilMaskCv.getContext("2d"); mg.fillStyle = "#000"; mg.fillRect(0, 0, 256, 256); mg.drawImage(s.oilCv, 0, 0); oilTex.needsUpdate = true;
      oilMesh.visible = s.oilN > 0;
      // ハンバーグ
      if (pattyMesh) {
        chunkG.forEach((g, i) => { g.visible = i === s.face; });
        if (s.redraw && window.Chunk3D && Chunk3D.cook && chunkG[s.face]) Chunk3D.cook(chunkG[s.face], s.top);
        if (s.redraw) { opts.draw(s.top, s.rim, s.face); pattyTex.needsUpdate = true; }
        const st = s.pt.state;
        // 液体: ボウルの中では小さく深く、フライパンに流れ出ると広がる
        if (vessel) {
          if (st === "in") { spread = Math.min(1, spread + dt * 1.6); const k = 0.35 + 0.65 * (1 - Math.pow(1 - spread, 3)); pattyMesh.scale.set(k, 1, k); vessel.position.lerp(new V(BOARD.x, -0.24, BOARD.z), Math.min(1, dt * 6)); vessel.rotation.set(0, 0, 0); }
          else { spread = 0; const k = 0.5 / opts.S; pattyMesh.scale.set(k, 3, k); }
          if (st === "held") { const u = unitAt(s.held[0], s.held[1]) || [0, 0], p = toPanWorld(u[0], u[1], BOTTOM + 0.5); vessel.position.lerp(p, Math.min(1, dt * 18)); vessel.rotation.set(0.5, 0, 0); pattyMesh.position.copy(vessel.position).y += 0.04; pattyMesh.quaternion.setFromEuler(vessel.rotation); }
          else if (st !== "in") { vessel.position.lerp(new V(BOARD.x, -0.24, BOARD.z), Math.min(1, dt * 10)); vessel.rotation.set(0, 0, 0); }
        }
        // 具材だけ(つなぎなし): まな板の上ではひとかたまり → フライパンに入れるとバラバラに散らばる
        if (opts.bodyless) {
          if (st === "in") spread = Math.min(1, spread + dt * 2.2); else spread = 0;
          const k = 0.35 + 0.65 * (1 - Math.pow(1 - spread, 3));
          for (const g of chunkG) for (const h of g.children) if (h.userData && h.userData.p0) { h.position.x = h.userData.p0.x * k; h.position.z = h.userData.p0.z * k; }
        }
        if (vessel && st === "held") { /* ボウルと一緒に動く(上で済み) */ }
        else if (vessel && st !== "in") { pattyMesh.position.set(vessel.position.x, vessel.position.y + 0.03, vessel.position.z); pattyMesh.quaternion.identity(); }
        else if (st === "in") {
          const p = toPanWorld(s.pt.x, s.pt.y, BOTTOM + 0.004);
          let lift = 0, rot = 0;
          if (s.flipU >= 0) { lift = Math.sin(s.flipU * Math.PI) * 0.55; rot = s.flipU < 0.5 ? s.flipU * Math.PI : (s.flipU - 1) * Math.PI; }
          pattyMesh.position.copy(p); pattyMesh.position.y += lift;
          pattyMesh.quaternion.copy(panG.quaternion); pattyMesh.rotateX(rot);
        } else if (st === "held") {
          const u = unitAt(s.held[0], s.held[1]) || [0, 0], p = toPanWorld(u[0], u[1], BOTTOM + 0.35);
          pattyMesh.position.lerp(p, Math.min(1, dt * 18)); pattyMesh.quaternion.identity();
        } else {
          const goal = new V(BOARD.x, -0.24, BOARD.z); pattyMesh.position.lerp(goal, Math.min(1, dt * 10)); pattyMesh.quaternion.identity();
        }
        // 油のパチパチ: ハンバーグのまわりに泡
        if (st === "in") {
          const n = Math.min(80, Math.round(s.heat * (s.oilN ? 30 + s.oilN / 8 : 6))); bubbles.count = n;
          const m = new THREE.Matrix4(), pr = opts.S * 1.05;
          for (let i = 0; i < n; i++) {
            const a = (i * 2.399 + t * (0.3 + (i % 5) * 0.1)) % (Math.PI * 2), ph = (t * 3 + i * 0.37) % 1, rr = pr * (1.0 + 0.18 * ((i * 7) % 10) / 10);
            const sc = 0.008 + 0.014 * Math.sin(ph * Math.PI);
            m.makeScale(sc, sc * 0.6, sc).setPosition((s.pt.x * RI) + Math.cos(a) * rr, BOTTOM + 0.01, (s.pt.y * RI) + Math.sin(a) * rr);
            bubbles.setMatrixAt(i, m);
          }
          bubbles.instanceMatrix.needsUpdate = true;
        } else bubbles.count = 0;
        // 湯気・煙
        for (const sp of steamSprites) {
          if (sp.t < 0 && st === "in" && Math.random() < (s.smoke ? 0.35 : s.steam ? 0.08 : 0)) { sp.t = 0; sp.dark = !!s.smokeDark; sp.x = pattyMesh.position.x + (Math.random() - 0.5) * opts.S * 1.4; sp.z = pattyMesh.position.z + (Math.random() - 0.5) * opts.S; sp.s.visible = true; sp.s.material.color.set(sp.dark ? 0x333333 : 0xffffff); }
          if (sp.t >= 0) { sp.t += dt / 1.8; const u = sp.t; sp.s.position.set(sp.x + Math.sin(u * 5 + sp.x * 9) * 0.06, pattyMesh.position.y + 0.15 + u * 1.3, sp.z); sp.s.scale.setScalar(0.25 + u * 0.7); sp.s.material.opacity = (sp.dark ? 0.6 : 0.3) * Math.sin(Math.min(1, u) * Math.PI); if (u >= 1) { sp.t = -1; sp.s.visible = false; } }
        }
      }
      // ペーパー(油をぬっている時は、指の所へ)
      const paper = pot.userData.paper;
      if (s.brush) { const u = unitAt(s.brush[0], s.brush[1]); if (u) { const p = toPanWorld(u[0], u[1], BOTTOM + 0.08); pot.worldToLocal(p); paper.position.lerp(p, 0.6); } }
      else paper.position.lerp(new V(0.04, 0.36, 0), 0.25);
      place(); r.render(scene, cam);
    },
    // 画面上の位置(ラベル用)
    screenOf(name) {
      const p = name === "pot" ? new V(POT.x, 0.25, POT.z) : new V(BOARD.x, 0.05, BOARD.z - 0.55);
      const v = p.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
    },
  };
})();
