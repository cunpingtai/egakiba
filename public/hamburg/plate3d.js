// ソースをかける・完成の場面の3D(three.js)。木のテーブル + 陶器のお皿 + 立体のハンバーグ + 立体のソース。
// ソースは、なぞった所を光線でお皿/ハンバーグの表面に当てて、その表面に沿ったチューブにする(段差もそのまま立体になる)。
// 完成したら、指でカメラを回して・ピンチで近づけて、いろんな角度から見られる。
(() => {
  if (!window.THREE) { window.Plate3D = { ok: false }; return; }
  const V = THREE.Vector3;
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  let r = null, scene, cam, cv, running = false, root = null, pattyMesh = null, plate = null, table = null;
  let strokes = [], cur = null, orbitOn = false, lastPick = null;
  const ray = new THREE.Raycaster();
  const PLATE_R = 1.05;
  // カメラ(注視点のまわりを回る)
  const orbit = { az: 0, el: 1.05, dist: 3.1, tAz: 0, tEl: 1.05, tDist: 3.1, auto: true };

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  // 木のテーブル(板目)
  function woodTex() {
    return canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = "#6b4529"; g.fillRect(0, 0, w, h);
      const plank = 128;
      for (let p = 0; p < h / plank; p++) {
        const base = 0.85 + Math.random() * 0.3;
        g.fillStyle = `rgba(${(107 * base) | 0},${(69 * base) | 0},${(41 * base) | 0},1)`; g.fillRect(0, p * plank, w, plank);
        for (let i = 0; i < 90; i++) { const y = p * plank + Math.random() * plank; g.strokeStyle = `rgba(${Math.random() < 0.5 ? "40,22,10" : "150,100,60"},${0.08 + Math.random() * 0.12})`; g.lineWidth = 0.6 + Math.random() * 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x / 90 + i) * 2.5); g.stroke(); }
        g.fillStyle = "rgba(20,10,4,.6)"; g.fillRect(0, p * plank, w, 2); // 板のすき間
      }
    }, 3);
  }
  function envMap() {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x2a2018, side: THREE.BackSide })));
    const panel = (w, h, col, x, y, z, ry, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
    panel(6, 3, 0xfff0d8, 0, 5.9, 0, 0, Math.PI / 2);
    panel(4, 4, 0xffe6c4, -9.9, 2, 0, Math.PI / 2);
    panel(3, 2, 0xcfe0ff, 0, 2, -9.9, 0);
    const pm = new THREE.PMREMGenerator(r); const t = pm.fromScene(s, 0.04).texture; pm.dispose(); return t;
  }
  function init() {
    cv = document.createElement("canvas"); cv.id = "c3p";
    cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100dvh;display:none;z-index:0;pointer-events:none";
    document.body.insertBefore(cv, document.body.firstChild);
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x1c130c);
    scene.environment = envMap();
    cam = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2b1a0e, 0.55));
    const key = new THREE.DirectionalLight(0xfff0dc, 1.7); key.position.set(-2.2, 5, 2.6); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 14 }); key.shadow.radius = 5; key.shadow.bias = -0.0004;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd7b0, 0.5); rim.position.set(3, 2, -3); scene.add(rim);
    table = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.62, metalness: 0 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
    // 陶器のお皿(ふちが上がって、まん中が平ら)
    const P = [[0, 0.03], [0.6, 0.03], [0.7, 0.035], [0.84, 0.07], [0.98, 0.105], [1.05, 0.115], [1.065, 0.105], [1.0, 0.08], [0.8, 0.035], [0.55, 0.008], [0.5, 0], [0, 0]];
    plate = new THREE.Mesh(new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x, y)), 96),
      new THREE.MeshPhysicalMaterial({ color: lin(0xf7f4ee), roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.12, side: THREE.DoubleSide }));
    plate.castShadow = true; plate.receiveShadow = true; scene.add(plate);
    root = new THREE.Group(); scene.add(root);
  }
  // ---------- ハンバーグ(なぞった形を、ふっくら立体に) ----------
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
  function buildPatty(o) {
    if (pattyMesh) { root.remove(pattyMesh); pattyMesh.geometry.dispose(); }
    if (cheeseG) { root.remove(cheeseG); cheeseG = null; }
    const K = 22, M = 128, S = o.S, H = o.H, base = 0.03, pos = [], uv = [], idx = [], col = [];
    const ck = Math.max(0, Math.min(1, (o.cook || 0) / 1.0));
    const rad = []; for (let j = 0; j <= M; j++) rad.push(radiusAt(o.pts, j / M * Math.PI * 2)); // チーズの位置用
    const { ox, oy } = outline(o.pts, M);
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    for (let k = 0; k <= K; k++) {
      const s = k / K; // 0=まん中 1=ふち
      const h = H * Math.pow(Math.max(0, 1 - Math.pow(s, 5)), 0.42);
      for (let j = 0; j <= M; j++) {
        const px = ox[j] * s, py = oy[j] * s, x = px * S, z = py * S;
        const bump = s < 0.97 ? (hash(Math.round(x * 60), Math.round(z * 60)) - 0.5) * H * 0.06 : 0; // ひき肉のでこぼこ
        pos.push(x, base + h + bump, z);
        const e = o.meat ? Math.max(0, Math.min(1, (s - 0.68) / 0.32)) : Math.max(0, Math.min(1, (s - 0.8) / 0.2)), dk = 1 - (o.meat ? 0.5 : 0.38) * e * e * ck; col.push(dk, dk * 0.97, dk * 0.95); // ふちの焼き目(こんがり濃い茶色)
        uv.push(0.5 + px * o.uvK, 0.5 - py * o.uvK);
      }
    }
    for (let k = 0; k < K; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(o.meat ? richMeat(o.tex, ck) : o.tex); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8; tex.flipY = true;
    // ひき肉の表面: こまかいつぶつぶのでこぼこ(焼けた肉のザラッとした感じ)
    const bc = document.createElement("canvas"); bc.width = bc.height = 512; const bg = bc.getContext("2d"); bg.fillStyle = "#808080"; bg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const v = Math.random() < 0.5 ? 40 + Math.random() * 60 : 160 + Math.random() * 80; bg.fillStyle = `rgba(${v},${v},${v},.55)`; bg.beginPath(); bg.ellipse(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3.5, 1 + Math.random() * 2.5, Math.random() * 3, 0, 7); bg.fill(); }
    const bump = new THREE.CanvasTexture(bc); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(2, 2);
    const mat = o.meat
      // 高級感: 肉汁でつやっと光る(光る所と光らない所をまだらに)
      ? new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: bump, bumpScale: 0.011, roughness: 1, roughnessMap: juiceRough(), clearcoat: 0.55, clearcoatRoughness: 0.2, sheen: 0, vertexColors: true })
      : new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: bump, bumpScale: 0.014, roughness: 0.6, clearcoat: 0.15, clearcoatRoughness: 0.5, vertexColors: true });
    pattyMesh = new THREE.Mesh(geo, mat); pattyMesh.castShadow = true; pattyMesh.receiveShadow = true; root.add(pattyMesh);
    mat.visible = !o.bodyless;
    if (o.meat && !o.bodyless && ck > 0.25) { // お皿ににじみ出た肉汁(うすい茶色のつやつや)
      const sh = new THREE.Shape(); for (let j = 0; j <= M; j++) { const k = 1.06 + 0.03 * Math.sin(j * 0.31) + 0.02 * Math.sin(j * 0.13 + 1); const x = ox[j] * S * k, z = oy[j] * S * k; j ? sh.lineTo(x, -z) : sh.moveTo(x, -z); }
      const pool = new THREE.Mesh(new THREE.ShapeGeometry(sh, 2), new THREE.MeshPhysicalMaterial({ color: lin(0x6b3412), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.5 * Math.min(1, ck), depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.y = 0.004; pool.raycast = () => {}; pool.renderOrder = -1; pattyMesh.add(pool);
    }
    if (o.cheese && !o.bodyless) addCheese(o, rad, base);
    if (o.chunks && window.Chunk3D && Chunk3D.ok) { const cg = Chunk3D.group(o.chunks, o.pts, o.S, o.H, [5, 0.42], base); pattyMesh.add(cg); if (Chunk3D.cook && o.cook != null) Chunk3D.cook(cg, o.cook); } // 出ている具材は立体で
  }
  // 焼いた肉の絵を、こんがり深い色に(色を濃く・ふちを焼き色・焦げ目の点)
  function richMeat(src, ck) {
    const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const g = c.getContext("2d"), w = c.width, h = c.height;
    g.filter = `sepia(${0.18 * ck}) saturate(${1.05 + 0.05 * ck}) contrast(1.15) brightness(${1 - 0.14 * ck})`; g.drawImage(src, 0, 0); g.filter = "none";
    g.globalCompositeOperation = "multiply";
    const rg = g.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.5); rg.addColorStop(0, "rgb(255,236,215)"); rg.addColorStop(1, `rgb(${190 - 70 * ck},${150 - 75 * ck},${130 - 80 * ck})`);
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260 * ck; i++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * w * 0.42, r = 1 + Math.random() * w * 0.012; g.fillStyle = `rgba(${70 + Math.random() * 40},${30 + Math.random() * 20},${15},${0.25 + Math.random() * 0.35})`; g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, r, r * 0.7, a, 0, 7); g.fill(); }
    g.globalCompositeOperation = "source-over";
    return c;
  }
  // つやのまだら(黒いほどツヤツヤ): 肉汁がたまった所が光る
  let juiceRoughTex = null;
  function juiceRough() {
    if (juiceRoughTex) return juiceRoughTex;
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "rgb(120,120,120)"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) { const v = Math.random() < 0.55 ? 35 + Math.random() * 40 : 140 + Math.random() * 60; g.fillStyle = `rgba(${v},${v},${v},.6)`; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 7, 1.5 + Math.random() * 4, Math.random() * 3, 0, 7); g.fill(); }
    juiceRoughTex = new THREE.CanvasTexture(c); juiceRoughTex.wrapS = juiceRoughTex.wrapT = THREE.RepeatWrapping; juiceRoughTex.repeat.set(2, 2); return juiceRoughTex;
  }
  // ---------- とろけ出たチーズ: ハンバーグの上から、ふちを伝ってお皿にたまる(立体) ----------
  let cheeseG = null;
  function ribbon(path, mat) {
    // path = [{p: 位置, w: 幅の半分, t: 厚みの半分}]。下の面は平ら(乗っている面にはりつく)
    const M = 14, pos = [], idx = [], up = new V(0, 1, 0);
    for (let i = 0; i < path.length; i++) {
      const a = path[Math.max(0, i - 1)].p, b = path[Math.min(path.length - 1, i + 1)].p, T = b.clone().sub(a).normalize();
      let Sd = new V().crossVectors(T, up); if (Sd.lengthSq() < 1e-6) Sd.set(1, 0, 0); Sd.normalize();
      const N = new V().crossVectors(Sd, T).normalize(), { p, w, t } = path[i];
      for (let j = 0; j <= M; j++) { const an = j / M * Math.PI * 2, cs = Math.cos(an), sn = Math.sin(an); const o = Sd.clone().multiplyScalar(cs * w).addScaledVector(N, (sn > 0 ? sn : sn * 0.25) * t); pos.push(p.x + o.x, p.y + o.y, p.z + o.z); }
    }
    for (let i = 0; i < path.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function addCheese(o, rad, base) {
    if (cheeseG) root.remove(cheeseG); cheeseG = new THREE.Group(); root.add(cheeseG);
    const mat = new THREE.MeshPhysicalMaterial({ color: lin(0xf6b01c), emissive: lin(0x3a1e00), roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.15 });
    const S = o.S, H = o.H, n = Math.min(2, o.cheese >= 3 ? 2 : 1), M = rad.length - 1;
    const hAt = (s) => base + H * Math.pow(Math.max(0, 1 - Math.pow(s, 5)), 0.42);
    for (let c = 0; c < n; c++) {
      const th = Math.PI / 2 + (c ? -0.9 : 0.35), R0 = rad[Math.round(((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * M)] * S, dx = Math.cos(th), dz = Math.sin(th);
      const W = R0 * 0.24 * (c ? 0.75 : 1), at = (r, y) => new V(dx * r, y, dz * r);
      // 上(とけ始め) → ふち → 横を伝って → お皿にたまる
      const key = [
        [at(R0 * 0.35, hAt(0.35)), W * 0.75, 0.012], [at(R0 * 0.6, hAt(0.6)), W * 0.95, 0.016], [at(R0 * 0.86, hAt(0.86)), W, 0.03],
        [at(R0 * 0.99 + 0.016, hAt(0.97) - 0.005), W * 1.02, 0.032], [at(R0 + 0.03, base + H * 0.55), W * 1.05, 0.032], [at(R0 + 0.04, base + H * 0.18), W * 1.15, 0.028],
        [at(R0 + 0.07, base + 0.012), W * 1.5, 0.014], [at(R0 + 0.13, base + 0.008), W * 1.7, 0.01],
      ];
      const curve = new THREE.CatmullRomCurve3(key.map((k) => k[0]), false, "centripetal"), N = 40, path = [];
      for (let i = 0; i <= N; i++) { const u = i / N, f = u * (key.length - 1), a = Math.floor(f), b = Math.min(key.length - 1, a + 1), e = f - a; path.push({ p: curve.getPoint(u), w: key[a][1] * (1 - e) + key[b][1] * e, t: key[a][2] * (1 - e) + key[b][2] * e }); }
      // 上はとけて丸く広がる / 先はまるい水たまり
      path[0].w *= 0.5; path[N].w *= 0.6;
      cheeseG.add(ribbon(path, mat));
      const pool = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat); pool.scale.set(W * 1.8, 0.012, W * 1.6); pool.position.copy(at(R0 + 0.12, base + 0.004)); pool.castShadow = true; cheeseG.add(pool);
      const top = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat); top.scale.set(W * 1.4, 0.014, W * 1.4); top.position.copy(at(R0 * 0.4, hAt(0.4) + 0.004)); cheeseG.add(top);
    }
  }
  // ---------- デザート(クレープ=ホイップクリーム / パンケーキ=バターとシロップ) ----------
  function dessertDeco(o) {
    const g = new THREE.Group(), top = 0.03 + o.H;
    if (o.dessert === "crepe") {
      const cream = new THREE.MeshPhysicalMaterial({ color: lin(0xfffaf0), roughness: 0.45, clearcoat: 0.3 });
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + 0.4, r = o.S * 0.38, d = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 8), cream); cone.position.y = 0.06; d.add(cone);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), cream); ball.scale.y = 0.6; d.add(ball);
        d.position.set(Math.cos(a) * r, top, Math.sin(a) * r); d.rotation.y = a; d.traverse((m) => { if (m.isMesh) m.castShadow = true; }); g.add(d);
      }
    } else {
      const butter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), new THREE.MeshPhysicalMaterial({ color: lin(0xffe27a), roughness: 0.3, clearcoat: 0.6 }));
      butter.position.set(0.02, top + 0.03, -0.02); butter.rotation.y = 0.5; butter.castShadow = true; g.add(butter);
      const syrup = new THREE.Mesh(new THREE.CircleGeometry(o.S * 0.55, 40), new THREE.MeshPhysicalMaterial({ color: lin(0x9a4f12), roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.8 }));
      syrup.rotation.x = -Math.PI / 2; syrup.position.y = top + 0.004; g.add(syrup);
    }
    root.add(g);
  }
  // ---------- つけあわせ(ブロッコリー・ポテト) ----------
  function garnish() {
    const g = new THREE.Group();
    const green = [0x3f7d2a, 0x4f9134, 0x2f6a22, 0x5aa03a].map((c) => new THREE.MeshStandardMaterial({ color: lin(c), roughness: 0.8 }));
    for (let b = 0; b < 2; b++) {
      const br = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.16, 8), new THREE.MeshStandardMaterial({ color: lin(0x8dbb5a), roughness: 0.7 }));
      stem.rotation.z = Math.PI / 2; stem.position.set(0.06, 0.05, 0); br.add(stem);
      for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 8, 6), green[i % 4]); const a = Math.random() * 6.3, rr = Math.random() * 0.08; m.position.set(-0.04 + Math.cos(a) * rr * 0.6, 0.08 + Math.random() * 0.05, Math.sin(a) * rr); m.castShadow = true; br.add(m); }
      br.scale.setScalar(1.7); br.position.set(0.72 + b * 0.04, 0.02, -0.38 + b * 0.22); br.rotation.y = b * 1.2; g.add(br); // 大きめ(ひと口サイズの房)
    }
    const fry = new THREE.MeshStandardMaterial({ color: lin(0xe8b54a), roughness: 0.6 });
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.045), fry); m.position.set(0.62 + Math.random() * 0.06, 0.06 + i * 0.012, 0.22 + i * 0.05); m.rotation.y = 0.5 + Math.random() * 0.5; m.rotation.z = (Math.random() - 0.5) * 0.15; m.castShadow = true; g.add(m); }
    root.add(g);
  }
  // ---------- ソース ----------
  const sauceMats = {};
  function sauceMat(col) {
    if (sauceMats[col]) return sauceMats[col];
    return (sauceMats[col] = new THREE.MeshPhysicalMaterial({ color: lin(col), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, metalness: 0 }));
  }
  const sauceR = (col) => col === "#fff4c9" ? 0.019 : col === "#5a1d0e" || col === "#7a2412" ? 0.03 : 0.022;
  // 画面の点 → お皿かハンバーグの表面の点(と面の向き)
  function pick(x, y) {
    ray.setFromCamera({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, cam);
    // 先にかけたソースの上にも重ねられる(今かけている線そのものは除く)
    const others = strokes.filter((st) => st !== cur && st.mesh).map((st) => st.mesh);
    const hits = ray.intersectObjects([...others, cheeseG, pattyMesh, plate].filter(Boolean), true);
    for (const h of hits) { if (h.object === plate && h.point.length() > PLATE_R * 1.02) continue; const onSauce = h.object !== plate && h.object !== pattyMesh && !(cheeseG && h.object.parent === cheeseG); const n = !onSauce && h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new V(0, 1, 0); if (n.y < 0) n.negate(); return { p: h.point.clone(), n }; } // ソースの上は真上に重ねる
    return null;
  }
  function rebuild(st) {
    if (st.mesh) { root.remove(st.mesh); st.mesh.traverse((m) => m.geometry && m.geometry.dispose()); }
    const rr = sauceR(st.col), mat = sauceMat(st.col), grp = new THREE.Group();
    const pts = st.pts.map((q) => q.p.clone().addScaledVector(q.n, rr * 0.55));
    // ぽてっと丸い始まりと終わり
    const blob = (p, s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(rr * s, 12, 8), mat); m.position.copy(p); m.scale.y = 0.75; m.castShadow = true; grp.add(m); };
    blob(pts[0], 1.15);
    if (pts.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const geo = new THREE.TubeGeometry(curve, Math.min(600, pts.length * 3), rr, 10, false);
      // チューブを少しつぶす(上から見て平べったい、とろっとした線)
      const P = geo.attributes.position, c = new V();
      for (let i = 0; i <= Math.min(600, pts.length * 3); i++) { curve.getPointAt(i / Math.min(600, pts.length * 3), c); for (let j = 0; j <= 10; j++) { const id = i * 11 + j; if (id >= P.count) break; const dy = P.getY(id) - c.y; P.setY(id, c.y + dy * 0.72); } }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m);
      blob(pts[pts.length - 1], 1.05);
    }
    st.mesh = grp; root.add(grp);
  }
  function addPoint(x, y) {
    if (!cur) return;
    // 指の間をこまかく分けて表面に当てる(ふちの段差もなぞる)
    const steps = lastPick ? Math.max(1, Math.ceil(Math.hypot(x - lastPick[0], y - lastPick[1]) / 5)) : 1;
    for (let k = 1; k <= steps; k++) {
      const sx = lastPick ? lastPick[0] + (x - lastPick[0]) * k / steps : x, sy = lastPick ? lastPick[1] + (y - lastPick[1]) * k / steps : y;
      const h = pick(sx, sy); if (!h) continue;
      const lp = cur.pts[cur.pts.length - 1]; if (lp && lp.p.distanceTo(h.p) < 0.012) continue;
      cur.pts.push(h);
    }
    lastPick = [x, y];
    if (cur.pts.length) rebuild(cur);
  }
  // ---------- カメラ ----------
  let layoutCY = 0;
  function place() {
    const W = innerWidth, H = innerHeight;
    if (r.__w !== W || r.__h !== H) { r.setSize(W, H, false); r.__w = W; r.__h = H; cv.style.width = W + "px"; cv.style.height = H + "px"; } cam.aspect = W / H;
    // 画面の横幅にお皿が入る距離を最低限に
    const hh = Math.atan(Math.tan(THREE.MathUtils.degToRad(17)) * cam.aspect), fit = (PLATE_R * 1.15) / Math.tan(hh);
    if (!orbitOn) { orbit.tDist = Math.max(2.4, fit); orbit.dist += (orbit.tDist - orbit.dist) * 0.2; }
    orbit.az += (orbit.tAz - orbit.az) * 0.18; orbit.el += (orbit.tEl - orbit.el) * 0.18; if (orbitOn) orbit.dist += (orbit.tDist - orbit.dist) * 0.2;
    const ce = Math.cos(orbit.el), se = Math.sin(orbit.el);
    cam.position.set(Math.sin(orbit.az) * ce * orbit.dist, se * orbit.dist, Math.cos(orbit.az) * ce * orbit.dist);
    cam.lookAt(0, 0.08, 0);
    cam.setViewOffset(W, H, 0, H / 2 - layoutCY, W, H); cam.updateProjectionMatrix();
  }
  // 完成後: 1本指=回す / 2本指=近づける・遠ざける / ホイール=ズーム
  const touches = new Map(); let pinch0 = 0, dist0 = 0;
  function attachOrbit(el) {
    el.addEventListener("pointerdown", (e) => { if (!orbitOn) return; touches.set(e.pointerId, [e.clientX, e.clientY]); orbit.auto = false; if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = orbit.tDist; } });
    el.addEventListener("pointermove", (e) => {
      if (!orbitOn || !touches.has(e.pointerId)) return;
      const prev = touches.get(e.pointerId); touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size === 1) { orbit.tAz -= (e.clientX - prev[0]) * 0.008; orbit.tEl = Math.max(0.12, Math.min(1.45, orbit.tEl + (e.clientY - prev[1]) * 0.006)); }
      else if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); orbit.tDist = Math.max(1.3, Math.min(6, dist0 * pinch0 / Math.max(10, d))); }
    });
    const up = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", (e) => { if (!orbitOn) return; e.preventDefault(); orbit.auto = false; orbit.tDist = Math.max(1.3, Math.min(6, orbit.tDist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
  }
  let attached = false;
  window.Plate3D = {
    ok: true,
    get running() { return running; },
    // o = { pts(形), S(お皿の半径を1とした大きさ), H(厚み), tex(焼けたハンバーグの絵), uvK }
    start(o, el) {
      if (!r) init();
      if (!attached && el) { attachOrbit(el); attached = true; }
      for (const st of strokes) if (st.mesh) root.remove(st.mesh);
      strokes = []; cur = null; orbitOn = false; orbit.auto = true;
      orbit.az = orbit.tAz = 0; orbit.el = orbit.tEl = 1.12; orbit.dist = orbit.tDist = 3;
      while (root.children.length) root.remove(root.children[0]); pattyMesh = null;
      buildPatty(o); if (o.dessert) dessertDeco(o); else garnish();
      cv.style.display = "block"; running = true;
    },
    stop() { running = false; orbitOn = false; if (cv) cv.style.display = "none"; },
    render(cy, dt) {
      if (!running) return;
      layoutCY = cy;
      if (orbitOn && orbit.auto) orbit.tAz += dt * 0.25; // 触るまではゆっくり回る
      place(); r.render(scene, cam);
    },
    down(x, y, col) { if (orbitOn) return false; cur = { col, pts: [] }; lastPick = null; strokes.push(cur); addPoint(x, y); if (!cur.pts.length) { strokes.pop(); cur = null; return false; } return true; },
    move(x, y) { if (cur) addPoint(x, y); },
    up() { cur = null; lastPick = null; },
    undo() { const st = strokes.pop(); if (st && st.mesh) root.remove(st.mesh); },
    orbit(on) { orbitOn = on; if (on) { orbit.tEl = 0.62; orbit.auto = true; } },
    get count() { return strokes.length; },
    // 保存・シェア用: 回転中の今の画面ではなく、斜め上からのきれいな定位置で、正方形に撮り直す
    snapshot(size = 1080) {
      const pr = r.getPixelRatio(), out = document.createElement("canvas"); out.width = out.height = size;
      r.setPixelRatio(1); r.setSize(size, size, false); r.__w = -1; // 撮ったあと、画面の大きさに作り直す
      cam.aspect = 1; cam.clearViewOffset();
      const half = THREE.MathUtils.degToRad(cam.fov / 2), dist = PLATE_R * 1.32 / Math.tan(half), el = 0.82, az = 0.38;
      cam.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
      cam.lookAt(0.05, 0.05, 0.02); cam.updateProjectionMatrix();
      r.render(scene, cam); out.getContext("2d").drawImage(r.domElement, 0, 0, size, size);
      r.setPixelRatio(pr); place(); r.render(scene, cam); // 画面はもとに戻す
      return out;
    },
  };
})();
