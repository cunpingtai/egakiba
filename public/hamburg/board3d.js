// 形を作る場面の3D(three.js)。ギンガムチェックのテーブル + 木のまな板 + なぞった形の生のハンバーグ(立体)
(() => {
  if (!window.THREE) { window.Board3D = { ok: false }; return; }
  const V = THREE.Vector3;
  let r = null, scene, cam, cv, running = false, patty = null, layoutCY = 300, curR = 150;
  const BW = 2.1, BD = 1.7, BH = 0.12;

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    return t;
  }
  function init() {
    cv = document.createElement("canvas"); cv.id = "c3s";
    cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100dvh;display:none;z-index:0;pointer-events:none";
    document.body.insertBefore(cv, document.body.firstChild);
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.82;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xefe6d6);
    // 映り込み(生肉のつや用)
    const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x8a8070, side: THREE.BackSide })));
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); lp.position.set(0, 5.9, 0); lp.rotation.x = Math.PI / 2; es.add(lp);
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
    cam = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7a6a56, 0.4));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.5); sun.position.set(-3, 4.2, 2.2); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 15 }); sun.shadow.radius = 5; sun.shadow.bias = -0.0005;
    scene.add(sun);
    // ギンガムチェックのテーブル(材料の場面と同じ)
    const cloth = canvasTex(256, 256, (g) => { g.fillStyle = "#fbf5ea"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(214,72,72,.42)"; for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 32, 256); g.fillRect(0, i * 64, 256, 32); } g.fillStyle = "rgba(0,0,0,.035)"; for (let y = 0; y < 256; y += 2) g.fillRect(0, y, 256, 1); }, 4);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.92 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -BH; table.receiveShadow = true; scene.add(table);
    // 木のまな板(木目・包丁のあと)
    const top = canvasTex(1024, 820, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#d9b67f"); gr.addColorStop(1, "#c9a26a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(140,95,50,${Math.random() * 0.15})`; g.lineWidth = 1 + Math.random() * 3; const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + Math.random() * 16 - 8, w * 0.6, y + Math.random() * 16 - 8, w, y + Math.random() * 10 - 5); g.stroke(); }
      for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(110,70,35,${Math.random() * 0.1})`; g.lineWidth = 1; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 + Math.random() * 60, y + Math.random() * 6 - 3); g.stroke(); }
    });
    const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xc29a62).convertSRGBToLinear(), roughness: 0.7 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), [side, side, new THREE.MeshStandardMaterial({ map: top, roughness: 0.68 }), side, side, side]);
    board.position.y = -BH / 2; board.castShadow = true; board.receiveShadow = true; scene.add(board);
  }
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
  // なぞった形を、ふっくら(生なので少し丸くもりあがった)立体に
  function pattyGeo(pts, S, H, uvK) {
    const K = 20, M = 112, pos = [], uv = [], idx = [], rad = [];
    const { ox, oy } = outline(pts, M);
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    for (let k = 0; k <= K; k++) {
      const s = k / K, h = H * Math.pow(Math.max(0, 1 - Math.pow(s, 4)), 0.5);
      for (let j = 0; j <= M; j++) {
        const px = ox[j] * s, py = oy[j] * s, x = px * S, z = py * S;
        const bump = s < 0.96 ? (hash(Math.round(x * 70), Math.round(z * 70)) - 0.5) * H * 0.08 : 0;
        pos.push(x, h + bump, z); uv.push(0.5 + px * uvK, 0.5 - py * uvK);
      }
    }
    for (let k = 0; k < K; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  function place() {
    const W = innerWidth, H = innerHeight;
    if (r.__w !== W || r.__h !== H) { r.setSize(W, H, false); r.__w = W; r.__h = H; cv.style.width = W + "px"; cv.style.height = H + "px"; } cam.aspect = W / H;
    // 2Dのときと同じ大きさに見えるように: まな板の横幅(半分=1.05)が画面の R*1.05 になる距離
    const half = W / 2, k = curR * 1.05 / half; // まな板の半分が画面の半分の何割か
    const hh = Math.atan(Math.tan(THREE.MathUtils.degToRad(16)) * cam.aspect), dist = (1.05 / k) / Math.tan(hh);
    const el = 1.16; cam.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist); cam.lookAt(0, 0, 0);
    cam.setViewOffset(W, H, 0, H / 2 - layoutCY, W, H); cam.updateProjectionMatrix();
  }
  window.Board3D = {
    ok: true,
    get running() { return running; },
    start() { if (!r) init(); cv.style.display = "block"; running = true; },
    stop() { running = false; if (cv) cv.style.display = "none"; },
    // o = { pts, S(大きさ・まな板の半分の横幅=1.05基準), H, tex(生の生地の絵), uvK } / null で消す
    setPatty(o) {
      if (!r) init();
      if (patty) { scene.remove(patty); patty.geometry.dispose(); patty = null; }
      if (!o) return;
      const tex = new THREE.CanvasTexture(o.tex); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
      patty = new THREE.Mesh(pattyGeo(o.pts, o.S, o.H, o.uvK), new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: tex, bumpScale: 0.012, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35 }));
      patty.castShadow = true; patty.receiveShadow = true; scene.add(patty);
      patty.material.visible = !o.bodyless; // つなぎがない=具材だけ(本体なし)
      if (o.chunks && window.Chunk3D && Chunk3D.ok) patty.add(Chunk3D.group(o.chunks, o.pts, o.S, o.H, [4, 0.5], 0)); // 出ている具材は本物の立体で
    },
    render(cy, R) { if (!running) return; layoutCY = cy; curR = R; place(); r.render(scene, cam); },
  };
})();
// ---------- 生地から出ている具材を、本物の3Dの物として置く(形・焼き・お皿で共通) ----------
// list = [{ body:{mesh}|null, mesh?, px, py(生地の形の中の位置), vis(出ている割合) }]
// S = 生地の大きさ / H = 厚み / prof = [a,b] 厚みの形 h = H*(1-s^a)^b / base = 生地の底の高さ
(() => {
  if (!window.THREE) { window.Chunk3D = { ok: false }; return; }
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
  window.Chunk3D = {
    ok: true,
    group(list, pts, S, H, prof = [5, 0.42], base = 0) {
      const g = new THREE.Group();
      for (const ch of list || []) {
        const src = ch.mesh || (ch.body && ch.body.mesh); if (!src) continue;
        const m = src.clone();
        // 物の中心が原点に来るように
        const holder = new THREE.Group(); holder.add(m); m.position.set(0, 0, 0);
        m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m), c = new THREE.Vector3(), sz = new THREE.Vector3(); bb.getCenter(c); bb.getSize(sz);
        m.position.sub(c);
        const k = S / 0.62; holder.scale.setScalar(k);
        if (ch.sq && ch.sq < 0.98) { const q = Math.max(0.25, ch.sq); m.scale.multiply(new THREE.Vector3(1 / Math.sqrt(q), q, 1 / Math.sqrt(q))); m.position.y *= q; } // 手でつぶされた物は平たい
        const x = ch.px * S, z = ch.py * S, rr = Math.hypot(ch.px, ch.py), th = Math.atan2(ch.py, ch.px);
        const s = Math.min(1, rr / radiusAt(pts, th)), h = H * Math.pow(Math.max(0, 1 - Math.pow(s, prof[0])), prof[1]);
        // 生地の表面に、出ている分だけ顔を出す(残りは生地の中)
        const half = sz.y * k / 2, vis = Math.max(0.15, Math.min(1, ch.vis == null ? 0.6 : ch.vis));
        holder.position.set(x, base + h - half + vis * half * 1.1, z);
        holder.rotation.y = ch.rot || 0;
        holder.userData = { id: ch.id || "onion", m, s0: m.scale.clone(), sz: sz.clone(), p0: holder.position.clone() };
        m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { const src = o.material; o.material = Array.isArray(src) ? src.map((mm) => mm.clone()) : src.clone(); if (!Array.isArray(src) && src.uniforms && src.uniforms.peelMap) o.material.uniforms.peelMap = src.uniforms.peelMap; o.userData.c0 = [].concat(o.material).map((mm) => mm.color ? mm.color.clone() : null); } } });
        g.add(holder);
      }
      return g;
    },
    // 焼けた具合(0生〜1ちょうど〜1.5こげ)で、具材も茶色く・黒くなる
    // 具材ごとに焼け方がちがう: 玉ねぎ=すき通ったあめ色 / いちご=くずれてジャム(汁がフライパンでカラメルに) / チョコ・チーズ=とけて平たく / バナナ=こんがり
    cook(g, L) {
      if (!g) return; const k = Math.max(0, Math.min(1, L / 1.1)), b = Math.max(0, Math.min(1, (L - 1.1) / 0.5));
      const C = (h) => new THREE.Color(h).convertSRGBToLinear(), black = C(0x120c08);
      const LOOK = { onion: [C(0xc8913c), 0.75, 0], straw: [C(0x6e0812), 0.8, 0.45], banana: [C(0xa8701e), 0.7, 0.2], choco: [C(0x2a120a), 0.4, 0.65], cheese: [C(0xd99a2b), 0.6, 0.7], natto: [C(0x4a2c10), 0.6, 0], yolk: [C(0xe08a10), 0.5, 0], eggwhole: [C(0xd8c8a8), 0.2, 0], panko: [C(0x9a6024), 0.8, 0] };
      for (const h of g.children) {
        const u = h.userData || {}, look = LOOK[u.id] || [C(0x5a3418), 0.55, 0], [col, amt, melt] = look;
        h.traverse((o) => { if (o.isMesh && o.userData.c0) [].concat(o.material).forEach((mm, i) => { const c0 = o.userData.c0[i]; if (!c0 || !mm.color) return; mm.color.copy(c0).lerp(col, amt * k).lerp(black, 0.8 * b); if (u.id === "onion" && mm.roughness != null) mm.roughness = Math.max(0.12, 0.45 - 0.3 * k); }); }); // 玉ねぎは焼けるとつやが出る
        h.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((mm) => { if (mm.uniforms && mm.uniforms.cookK) { mm.uniforms.cookK.value = Math.min(1, 0.85 * k + b); mm.uniforms.cookCol.value.set(0.78, 0.52, 0.2).lerp(new THREE.Color(0.08, 0.05, 0.03), b * 0.9); } }); }); // 玉ねぎ(専用の色づけ)
        // とける物・くずれる物は、だんだん平たく広がる
        if (u.m && melt) { const q = 1 - melt * k; u.m.scale.set(u.s0.x / Math.sqrt(q), u.s0.y * q, u.s0.z / Math.sqrt(q)); }
        // いちごの汁: 下にしみ出して、焼けると赤いカラメルになる
        if (u.id === "straw" && u.sz) {
          if (!u.syrup) { u.syrup = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshPhysicalMaterial({ color: C(0x9a0f1e), roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 })); u.syrup.rotation.x = -Math.PI / 2; h.add(u.syrup); }
          const rr = Math.max(u.sz.x, u.sz.z) * (0.3 + 0.9 * k); u.syrup.scale.set(rr, rr, 1); u.syrup.position.y = -u.sz.y * 0.5 * (1 - melt * k) - 0.002; u.syrup.visible = k > 0.15;
          u.syrup.material.color.copy(C(0x9a0f1e)).lerp(C(0x4a0a08), k * 0.6).lerp(black, 0.85 * b);
        }
      }
    },
  };
})();
