// 材料を入れる・こねるところの3Dボウル(three.js)
// ステンレスのボウル + テーブル + 影。中身はアプリが描いた絵(キャンバス)を、ボウルの中のふくらんだ面に貼る
(() => {
  if (!window.THREE) { window.Bowl3D = { ok: false }; return; }
  const V = THREE.Vector3;
  let r = null, scene, cam, cv, contents, tex, texCv, dome = 0, running = false;
  const RC = 0.8, CY0 = 0.15; // 中身の面の半径と高さ(ボウルの口の半径=1)

  // 映り込み用のかんたんな部屋(明るい窓と天井の照明)
  function envScene() {
    const s = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x5d554c, side: THREE.BackSide }));
    s.add(room);
    const panel = (w, h, col, x, y, z, ry, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
    panel(8, 4, 0xffffff, 0, 5.9, 0, 0, Math.PI / 2);   // 天井の照明
    panel(6, 5, 0xfff6e6, -9.9, 2, 0, Math.PI / 2);       // 窓
    panel(5, 3, 0xe8f0ff, 0, 2, -9.9, 0);
    panel(20, 2, 0x2e2822, 0, -5, 0, 0, Math.PI / 2);   // 床
    panel(3, 8, 0x1c1a18, 9.9, 1, 0, Math.PI / 2);        // 暗い壁(金属に映るコントラスト)
    panel(4, 6, 0x24211e, 0, 1, 9.9, 0);
    return s;
  }
  function clothTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#fbf5ea"; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "rgba(214,72,72,.42)";
    for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 32, 256); g.fillRect(0, i * 64, 256, 32); }
    // 織り目
    g.fillStyle = "rgba(0,0,0,.035)";
    for (let y = 0; y < 256; y += 2) g.fillRect(0, y, 256, 1);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return t;
  }
  function init() {
    cv = document.createElement("canvas"); cv.id = "c3b";
    cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100dvh;display:none;z-index:0;pointer-events:none";
    document.body.insertBefore(cv, document.body.firstChild);
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xefe6d6);
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(envScene(), 0.03).texture;
    cam = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a76, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(2.2, 6, 2.8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 18 }); sun.shadow.radius = 6; sun.shadow.bias = -0.0005;
    scene.add(sun);
    // テーブルクロス
    const table = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: clothTexture(), roughness: 0.92 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
    // ステンレスのボウル(断面を回して作る)。内側→ふち→外側
    const P = [[0, 0.055], [0.3, 0.058], [0.55, 0.075], [0.72, 0.13], [0.85, 0.24], [0.94, 0.38], [0.99, 0.5], [1.0, 0.56], [1.035, 0.585], [1.06, 0.57], [1.045, 0.53], [0.99, 0.4], [0.9, 0.24], [0.76, 0.1], [0.6, 0.02], [0.45, 0.0], [0, 0.0]];
    const bowlGeo = new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x, y)), 96);
    const steel = new THREE.MeshStandardMaterial({ color: 0xd7dbe0, metalness: 1, roughness: 0.17, side: THREE.DoubleSide, envMapIntensity: 1.1 });
    const bowl = new THREE.Mesh(bowlGeo, steel); bowl.castShadow = true; bowl.receiveShadow = true; scene.add(bowl);
    // 中身(アプリが描いた絵を貼る、少しふくらんだ円)
    texCv = document.createElement("canvas"); texCv.width = texCv.height = 1024;
    tex = new THREE.CanvasTexture(texCv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    // 細かい格子(指で押してへこませるため)。円の外は透明
    const cg = new THREE.PlaneGeometry(RC * 2, RC * 2, 90, 90); cg.rotateX(-Math.PI / 2);
    bump = new Float32Array(cg.attributes.position.count);
    contents = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: tex, color: 0xbdbdbd, roughness: 0.62, metalness: 0, transparent: true, alphaTest: 0.02 }));
    contents.position.y = CY0; contents.receiveShadow = true; scene.add(contents);
  }
  // 中身の盛り上がり(肉が多いほど山になる)
  let bump = null, bumpOn = false, domeDirty = true;
  function setDome(h) {
    if (Math.abs(h - dome) >= 0.002) { dome = h; domeDirty = true; }
    if (!domeDirty && !bumpOn) return;
    domeDirty = false;
    const pos = contents.geometry.attributes.position;
    let any = false;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z) / RC;
      if (d > 1) { pos.setY(i, -0.02); continue; }
      pos.setY(i, dome * (1 - d * d) * (1 - d * d * 0.3) + bump[i] * (1 - d * d));
      if (Math.abs(bump[i]) > 0.0005) any = true;
    }
    bumpOn = any;
    pos.needsUpdate = true; contents.geometry.computeVertexNormals();
  }
  // 指で押す: 押した所がへこみ、まわりが盛り上がる(ぐにゅっ)
  function poke(ux, uy, k = 1) {
    if (!contents) return;
    const pos = contents.geometry.attributes.position, px = ux * RC, pz = uy * RC, r = 0.17;
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i) - px, pos.getZ(i) - pz);
      if (d < r) bump[i] = Math.max(-0.07, bump[i] - 0.03 * k * (1 - d / r) ** 2);
      else if (d < r * 1.8) bump[i] = Math.min(0.05, bump[i] + 0.012 * k * Math.sin(Math.PI * (d - r) / (r * 0.8)));
    }
    bumpOn = true;
  }
  function relaxBumps(dt) {
    if (!bumpOn) return;
    const f = Math.pow(0.55, dt);
    for (let i = 0; i < bump.length; i++) bump[i] *= f;
  }
  // ===================== 切った玉ねぎ(本物の3Dのかけら) =====================
  // まな板から流し入れる → 重力で落ちて、中身の面やほかのかけらの上に積み重なる。
  // 肉を上から入れると、その下のかけらは肉にうもれる / こねると混ざって沈む
  const OS = 0.26, OG = 9; // まな板の玉ねぎ(半径1) → ボウルでの大きさ / 重力
  let onionGroup = null, obods = [], kneadSink = 0, oMat = null;
  function surfAt(x, z) { const d = Math.hypot(x, z) / RC; if (d >= 1) return CY0; return CY0 + dome * (1 - d * d) * (1 - d * d * 0.3); }
  function clearOnion() { if (onionGroup) scene.remove(onionGroup); if (solidGroup) scene.remove(solidGroup); onionGroup = null; solidGroup = null; obods = []; kneadSink = 0; }
  // ===================== ほかの具材も3Dの物 =====================
  // チョコ・いちご・バナナ・納豆・チーズ・パン粉は、本物の形でボウルに落ちて、玉ねぎと同じ物理で
  // ころがる・ほかの物の上にのる・肉に埋もれる・こねると沈む
  const SOLID_IDS = new Set(["choco", "straw", "banana", "natto", "cheese", "panko", "shell", "yolk"]);
  let solidGroup = null;
  const solidMats = {};
  function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear(); // 色を見た目どおりに(sRGB→リニア)
  function solidMat(id) {
    if (solidMats[id]) return solidMats[id];
    let m;
    if (id === "choco") m = new THREE.MeshStandardMaterial({ roughness: 0.32, map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#4a2414"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2c1309"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.strokeStyle = "rgba(140,80,50,.5)"; g.lineWidth = 2; g.strokeRect(9, 9, w - 18, h - 18); }) });
    else if (id === "straw") m = new THREE.MeshStandardMaterial({ roughness: 0.28, map: canvasTex(128, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f0485a"); gr.addColorStop(1, "#b5121f"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = (i * 37) % w, y = (i * 53) % h; g.fillStyle = "#f6d36a"; g.beginPath(); g.ellipse(x, y, 1.6, 2.4, 0, 0, 7); g.fill(); g.fillStyle = "rgba(120,0,10,.35)"; g.beginPath(); g.arc(x, y + 1.5, 2.6, 0, 7); g.fill(); } }) });
    else if (id === "banana") m = [new THREE.MeshStandardMaterial({ color: lin(0xf1e2a0), roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "#efe2a6"); gr.addColorStop(1, "#f7efc4"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(120,90,40,.55)"; for (let i = 0; i < 3; i++) { const a = i * 2.1; g.beginPath(); g.ellipse(64 + Math.cos(a) * 14, 64 + Math.sin(a) * 14, 4, 2, a, 0, 7); g.fill(); } g.strokeStyle = "rgba(200,170,90,.35)"; g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 30, 0, 7); g.stroke(); }) })];
    else if (id === "natto") m = new THREE.MeshStandardMaterial({ color: lin(0xa8742e), roughness: 0.25, metalness: 0.05 });
    else if (id === "cheese") m = new THREE.MeshStandardMaterial({ color: lin(0xffcc45), roughness: 0.5 });
    else if (id === "shell") m = new THREE.MeshStandardMaterial({ color: lin(0xdc8a4c), roughness: 0.6, side: THREE.DoubleSide });
    else if (id === "yolk") m = new THREE.MeshPhysicalMaterial({ color: lin(0xff8a0a), roughness: 0.12, clearcoat: 1, emissive: lin(0x3a1400) });
    else m = new THREE.MeshStandardMaterial({ color: lin(0xc79a5c), roughness: 0.95 });
    return (solidMats[id] = m);
  }
  function solidMeshes(id) {
    const out = [], mat = solidMat(id);
    if (id === "choco") for (let i = 0; i < 2; i++) { const g = new THREE.BoxGeometry(0.1, 0.028, 0.1); const side = new THREE.MeshStandardMaterial({ color: lin(0x3b1c0f), roughness: 0.4 }); out.push(new THREE.Mesh(g, [side, side, mat, mat, side, side])); }
    else if (id === "straw") for (let i = 0; i < 2; i++) {
      const prof = []; for (let k = 0; k <= 12; k++) { const t = k / 12, y = -0.055 + t * 0.1, r = Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 0.045 * (t > 0.85 ? 1 - (t - 0.85) * 4 : 1); prof.push(new THREE.Vector2(Math.max(0.001, r), y)); }
      const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), mat);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.012, 7), new THREE.MeshStandardMaterial({ color: lin(0x3f8f2c), roughness: 0.6 })); cap.position.y = 0.047; cap.rotation.x = Math.PI;
      const grp = new THREE.Group(); grp.add(body, cap); grp.userData.geo = body.geometry; out.push(grp);
    }
    else if (id === "banana") for (let i = 0; i < 3; i++) out.push(new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.016, 22), mat));
    else if (id === "natto") for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), mat); m.scale.set(1.35, 0.9, 1); out.push(m); }
    else if (id === "cheese") for (let i = 0; i < 4; i++) { const s = 0.032 + Math.random() * 0.01; out.push(new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat)); }
    else if (id === "shell") for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8, Math.random() * 6, 0.9 + Math.random() * 0.8, Math.random() * 2, 0.7 + Math.random() * 0.6), mat); out.push(m); }
    else if (id === "yolk") { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), mat); m.scale.set(1, 0.6, 1); out.push(m); }
    else for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.009 + Math.random() * 0.006, 0), mat); m.scale.set(1 + Math.random(), 0.6 + Math.random() * 0.6, 1 + Math.random() * 0.5); out.push(m); }
    return out;
  }
  // 物の形(当たり判定に使う頂点)
  function solidPoints(mesh) {
    const geo = mesh.userData.geo || mesh.geometry, pos = geo.attributes.position, seen = new Set(), pts = [];
    for (let i = 0; i < pos.count; i++) { const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`; if (seen.has(k)) continue; seen.add(k); pts.push(new V(pos.getX(i), pos.getY(i), pos.getZ(i)).multiply(mesh.scale)); }
    const step = Math.max(1, Math.floor(pts.length / 40)); return pts.filter((_, i) => i % step === 0);
  }
  function spawnSolid(id, x, z) {
    if (!SOLID_IDS.has(id)) return;
    if (!solidGroup) { solidGroup = new THREE.Group(); scene.add(solidGroup); }
    solidMeshes(id).forEach((mesh, i) => {
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.scale.multiplyScalar(2.4); // 実物の大きさ(ボウルの半径=約12cm)
      const local = solidPoints(mesh); // 頂点は見た目の大きさ(scale込み)
      let r = 0, rg = 0; for (const p of local) { r = Math.max(r, p.length()); rg += p.lengthSq(); } rg /= local.length;
      const bb = new THREE.Box3().setFromPoints(local), sz = new V(); bb.getSize(sz);
      const rc = Math.min(r * 0.62, Math.cbrt(sz.x * sz.y * sz.z) * 0.55);
      mesh.position.set(x + (Math.random() - 0.5) * 0.12, 0.92 + Math.random() * 0.12, z + (Math.random() - 0.5) * 0.12);
      mesh.quaternion.setFromEuler(new THREE.Euler(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3));
      const b = { kind: "solid", id, rc, mesh, local, r, v: new V((Math.random() - 0.5) * 0.3, -0.3, (Math.random() - 0.5) * 0.3), w: new V((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8), m: 1, I: Math.max(1e-5, rg * 0.5), sink: 0, rest: 0, sleep: false, wait: i * 0.02 };
      mesh.visible = false; solidGroup.add(mesh); obods.push(b);
    });
  }
  function clearSolids() { if (solidGroup) scene.remove(solidGroup); solidGroup = null; obods = obods.filter((b) => b.kind !== "solid"); }
  function addOnion(data) {
    if (!r) init();
    clearOnion();
    if (!data || !data.list.length) return;
    oMat = data.mat.clone(); oMat.uniforms.amb.value = 0.62; oMat.uniforms.dif.value = 0.5; if (data.mat.uniforms.peelMap) oMat.uniforms.peelMap = data.mat.uniforms.peelMap; // むいた皮の地図は同じ物を使う
    onionGroup = new THREE.Group(); scene.add(onionGroup);
    // まな板の上の並びのまま、ボウルの左奥あたりへザーッと流し入れる
    let cx = 0, cz = 0; for (const d of data.list) { cx += d.x; cz += d.z; } cx /= data.list.length; cz /= data.list.length;
    const order = data.list.map((d, i) => ({ d, idx: i, k: d.x + Math.random() * 0.6 })).sort((a, b) => a.k - b.k);
    order.forEach(({ d, idx }, i) => {
      const mesh = new THREE.Mesh(d.geo, oMat); mesh.scale.setScalar(OS); mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.quaternion.copy(d.quat);
      const local = d.local.map((p) => p.multiplyScalar(OS));
      let rg = 0; for (const p of local) rg += p.lengthSq(); rg /= local.length;
      // ぶつかり判定の大きさ = 同じ体積の球(うすい・細いかけらは小さく。見た目より大きい見えない球で浮かないように)
      const rc = d.vol ? Math.min(d.r * 0.62, Math.cbrt(3 * d.vol / (4 * Math.PI))) * OS : d.r * OS * 0.62;
      const b = { idx, rc, mesh, local, r: d.r * OS, v: new V((Math.random() - 0.5) * 0.3, -0.2, (Math.random() - 0.5) * 0.3), w: new V((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6), m: 1, I: rg * 0.5, sink: 0, rest: 0, sleep: false, wait: i * 0.018 };
      mesh.position.set(-0.12 + (d.x - cx) * OS * 0.8, 1.05 + d.y * OS + Math.random() * 0.08, 0.02 + (d.z - cz) * OS * 0.8);
      mesh.visible = false; onionGroup.add(mesh); obods.push(b);
    });
  }
  const _t = new V(), _t2 = new V(), _up = new V(0, 1, 0);
  function stepOnionBody(b, dt) {
    if (b.sleep) return;
    if (b.wait > 0) { b.wait -= dt; return; }
    b.mesh.visible = true;
    b.v.y -= OG * dt;
    const P = b.mesh.position, q = b.mesh.quaternion, w = b.w;
    P.addScaledVector(b.v, dt);
    const dq = new THREE.Quaternion(w.x * dt * 0.5, w.y * dt * 0.5, w.z * dt * 0.5, 0).multiply(q);
    q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
    // 中身の面(肉に埋まった分だけ低い)との接触: もぐった頂点ごとに押し返す
    let pen = 0, touching = false;
    const sink = b.sink + kneadSink;
    for (const p of b.local) {
      const rr = _t.copy(p).applyQuaternion(q), wx = P.x + rr.x, wy = P.y + rr.y, wz = P.z + rr.z;
      const fl = surfAt(wx, wz) - sink, dpt = fl - wy;
      if (dpt <= 0) continue;
      touching = true; pen = Math.max(pen, dpt);
      const vp = _t2.copy(b.w).cross(rr).add(b.v);
      if (vp.y >= 0) continue;
      const rxn = new V().copy(rr).cross(_up);
      const jn = -1.1 * vp.y / (1 / b.m + rxn.lengthSq() / b.I);
      const J = new V(0, jn, 0), vt = new V(vp.x, 0, vp.z), vtl = vt.length();
      if (vtl > 1e-5) { const rxt = new V().copy(rr).cross(vt.clone().divideScalar(vtl)); const jt = Math.min(0.7 * jn, vtl / (1 / b.m + rxt.lengthSq() / b.I)); J.addScaledVector(vt, -jt / vtl); }
      b.v.addScaledVector(J, 1 / b.m); b.w.addScaledVector(new V().copy(rr).cross(J), 1 / b.I);
    }
    if (pen > 0) P.y += pen;
    // ボウルの内側の壁: かけらのどの角も壁から出ない(細長いかけらも)
    wallFix(b);
    if (touching) { b.v.multiplyScalar(1 - Math.min(1, 3 * dt)); b.w.multiplyScalar(1 - Math.min(1, 5 * dt)); }
    const slow = b.v.lengthSq() < 0.003 && b.w.lengthSq() < 0.5 && (touching || b.onPile);
    b.rest = slow ? b.rest + dt : 0;
    if (b.rest > 0.6) { b.sleep = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
    b.onPile = false;
  }
  // かけら同士: 丸い当たり判定で3Dに押し合う(上に乗ったかけらは下のかけらに支えられる)
  function collideOnion() {
    const n = obods.length; if (n < 2) return;
    const order = obods.slice().sort((p, q) => (p.mesh.position.x - p.rc) - (q.mesh.position.x - q.rc)); // 近くの物だけ比べる
    for (let i = 0; i < n; i++) {
      const a = order[i]; if (a.wait > 0) continue;
      const pa = a.mesh.position, ra = a.rc, ax = pa.x + ra;
      for (let j = i + 1; j < n; j++) {
        const b = order[j]; if (b.mesh.position.x - b.rc > ax) break; if (b.wait > 0 || (a.sleep && b.sleep)) continue;
        const pb = b.mesh.position, rb = b.rc, dx = pb.x - pa.x, dy = (pb.y - pa.y) * 1.25, dz = pb.z - pa.z;
        const d2 = dx * dx + dy * dy + dz * dz, rr = ra + rb;
        if (d2 >= rr * rr || d2 < 1e-10) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, over = rr - d;
        // 寝ているかけらは動かない土台(上のかけらだけ押し上げる)
        const wa = a.sleep ? 0 : 1, wb = b.sleep ? 0 : 1, sw = wa + wb || 1;
        pa.x -= nx * over * wa / sw; pa.y -= ny * over * wa / sw; pa.z -= nz * over * wa / sw;
        pb.x += nx * over * wb / sw; pb.y += ny * over * wb / sw; pb.z += nz * over * wb / sw;
        // ぶつかる向きの速さを止める(弾まない)
        const rv = (b.v.x - a.v.x) * nx + (b.v.y - a.v.y) * ny + (b.v.z - a.v.z) * nz;
        if (rv < 0) {
          if (wa) { a.v.x += nx * rv * wa / sw; a.v.y += ny * rv * wa / sw; a.v.z += nz * rv * wa / sw; }
          if (wb) { b.v.x -= nx * rv * wb / sw; b.v.y -= ny * rv * wb / sw; b.v.z -= nz * rv * wb / sw; }
        }
        // 上に乗ったほうは、こすれて止まる
        if (ny > 0.5 && wb) { b.onPile = true; b.v.x *= 0.9; b.v.z *= 0.9; b.w.multiplyScalar(0.9); }
        if (ny < -0.5 && wa) { a.onPile = true; a.v.x *= 0.9; a.v.z *= 0.9; a.w.multiplyScalar(0.9); }
      }
    }
  }
  // まるごとの卵も固い物: ほかの具材は卵にめりこまず、上に乗ったり横に押しのけられたりする(卵の形=細長い楕円の球)
  const _e = new V();
  function collideEggs() {
    if (!bowlEggs.length) return;
    for (const e of bowlEggs) {
      const ry = e.ry, ax = Math.cos(ry), az = -Math.sin(ry), A = EGG_H / 2 * 0.98, B = EGG_R * 0.98;
      const cy = surfAt(e.x, e.z) + EGG_R * 0.92 - e.sink - kneadSink * 0.35;
      for (const b of obods) {
        if (b.wait > 0) continue;
        const P = b.mesh.position, q = b.mesh.quaternion;
        if (Math.hypot(P.x - e.x, P.z - e.z) > A + (b.r || 0.2) + 0.05) continue;
        let worst = 0, n = null;
        for (const p of b.local) {
          _e.copy(p).applyQuaternion(q); const wx = P.x + _e.x - e.x, wy = P.y + _e.y - cy, wz = P.z + _e.z - e.z;
          const u = wx * ax + wz * az, vx = wx - u * ax, vz = wz - u * az; // 卵の軸の向き / 軸に垂直
          const f = Math.sqrt((u / A) ** 2 + (wy / B) ** 2 + (vx * vx + vz * vz) / (B * B));
          if (f >= 1) continue;
          const dep = (1 - f) * B;
          if (dep > worst) { worst = dep; const gu = u / (A * A), gy = wy / (B * B), gx = vx / (B * B), gz = vz / (B * B); n = new V(gu * ax + gx, gy, gu * az + gz).normalize(); }
        }
        if (!n) continue;
        P.addScaledVector(n, worst);
        const vn = b.v.dot(n); if (vn < 0) b.v.addScaledVector(n, -vn);
        if (n.y > 0.4) { b.onPile = true; b.v.x *= 0.9; b.v.z *= 0.9; b.w.multiplyScalar(0.9); }
        if (b.sleep && worst > 0.003) wake(b);
      }
    }
  }
  // ボウルの内側の半径(高さごと)。ふちより上でも外へは出さない
  const WALL = [[0.13, 0.72], [0.24, 0.85], [0.38, 0.94], [0.5, 0.99], [0.56, 1.0]];
  function wallR(y) {
    if (y <= WALL[0][0]) return WALL[0][1];
    for (let i = 1; i < WALL.length; i++) if (y <= WALL[i][0]) { const a = WALL[i - 1], c = WALL[i]; return a[1] + (c[1] - a[1]) * (y - a[0]) / (c[0] - a[0]); }
    return 1.0;
  }
  const _w = new V();
  function wallFix(b) {
    const P = b.mesh.position, q = b.mesh.quaternion;
    let worst = 0, nx = 0, nz = 0;
    for (const p of b.local) {
      _w.copy(p).applyQuaternion(q); const wx = P.x + _w.x, wy = P.y + _w.y, wz = P.z + _w.z;
      const r = Math.hypot(wx, wz), lim = wallR(wy) * 0.95;
      if (r > lim && r - lim > worst) { worst = r - lim; nx = wx / r; nz = wz / r; }
    }
    if (worst <= 0) return false;
    P.x -= nx * worst; P.z -= nz * worst;
    const vn = b.v.x * nx + b.v.z * nz; if (vn > 0) { b.v.x -= 1.3 * vn * nx; b.v.z -= 1.3 * vn * nz; }
    b.w.multiplyScalar(0.85); if (b.sleep && worst > 0.003) { b.sleep = false; b.rest = 0; }
    return true;
  }
  function stepOnion(dt) {
    if (!obods.length) return;
    const sub = 3;
    for (let s = 0; s < sub; s++) { for (const b of obods) stepOnionBody(b, dt / sub); collideOnion(); collideEggs(); for (const b of obods) if (b.wait <= 0) wallFix(b); }
  }
  // 起こす(下の土台がなくなった時など)
  function wake(b) { b.sleep = false; b.rest = 0; }
  // 肉を入れた所の下のかけらは、肉にうもれる
  // 割らずに入れた卵(3Dのまま、中身の面の上に寝かせて置く)
  let eggGroup = null, bowlEggs = [];
  function keepEgg(egg) {
    if (!eggGroup) { eggGroup = new THREE.Group(); scene.add(eggGroup); }
    // 落ちた所(卵の形のまん中)から動かさない。立っていた卵は、傾いていた向きにそのままコロンと倒れる
    egg.updateMatrixWorld(true);
    const ax = new V(0, 1, 0).applyQuaternion(egg.quaternion), c = egg.position.clone().addScaledVector(ax, EGG_H / 2);
    let x = c.x, z = c.z; const lim = RC * 0.7, d = Math.hypot(x, z); if (d > lim) { x *= lim / d; z *= lim / d; }
    let dx = ax.x, dz = ax.z; if (Math.hypot(dx, dz) < 0.15) { const a = Math.random() * 6.3; dx = Math.cos(a); dz = Math.sin(a); }
    const ry = Math.atan2(dz, -dx);
    egg.userData.busy = true;
    eggGroup.add(egg); bowlEggs.push({ mesh: egg, x, z, sink: 0, ry, t: 0, p0: egg.position.clone(), q0: egg.quaternion.clone() });
  }
  // 割れる: 殻は3Dのかけらになって散らばり、黄身が出てくる(どちらも物理で動く)
  function crushEgg(e) {
    bowlEggs = bowlEggs.filter((x) => x !== e); if (eggGroup) eggGroup.remove(e.mesh);
    spawnSolid("shell", e.x, e.z); spawnSolid("yolk", e.x, e.z);
    for (const b of obods) if (b.kind === "solid" && (b.id === "shell" || b.id === "yolk") && b.wait > 0) { b.mesh.position.y = surfAt(e.x, e.z) + 0.12; b.wait = 0; }
    cb.sound("crackHard"); cb.egg("crushed", e.x / RC * 0.92, e.z / RC * 0.92, true);
  }
  function clearEggs() { if (eggGroup) scene.remove(eggGroup); eggGroup = null; bowlEggs = []; }
  // 卵の形の中心が (x,z) に来るように置く(寝かせた卵の原点はとがっていない方の先)
  // 卵どうしは重ならない(細長いカプセル同士で押し合って、となりに並ぶ)
  function segDist2D(ax, az, bx, bz, cx, cz, dx, dz) {
    // 線分AB と 線分CD のいちばん近い点(2D)
    const ux = bx - ax, uz = bz - az, vx = dx - cx, vz = dz - cz, wx = ax - cx, wz = az - cz;
    const a = ux * ux + uz * uz, b = ux * vx + uz * vz, c = vx * vx + vz * vz, d = ux * wx + uz * wz, e = vx * wx + vz * wz, D = a * c - b * b;
    let s = D > 1e-9 ? Math.max(0, Math.min(1, (b * e - c * d) / D)) : 0, t = c > 1e-9 ? (b * s + e) / c : 0;
    if (t < 0) { t = 0; s = a > 1e-9 ? Math.max(0, Math.min(1, -d / a)) : 0; } else if (t > 1) { t = 1; s = a > 1e-9 ? Math.max(0, Math.min(1, (b - d) / a)) : 0; }
    const px = ax + ux * s, pz = az + uz * s, qx = cx + vx * t, qz = cz + vz * t;
    return [px - qx, pz - qz];
  }
  function separateEggs() {
    const L = EGG_H / 2 - EGG_R, R2 = EGG_R * 1.95, lim = RC * 0.7;
    for (let it = 0; it < 3; it++) for (let i = 0; i < bowlEggs.length; i++) for (let j = i + 1; j < bowlEggs.length; j++) {
      const a = bowlEggs[i], b = bowlEggs[j], ad = [-Math.cos(a.ry), Math.sin(a.ry)], bd = [-Math.cos(b.ry), Math.sin(b.ry)];
      const [ox, oz] = segDist2D(a.x - ad[0] * L, a.z - ad[1] * L, a.x + ad[0] * L, a.z + ad[1] * L, b.x - bd[0] * L, b.z - bd[1] * L, b.x + bd[0] * L, b.z + bd[1] * L);
      const d = Math.hypot(ox, oz); if (d >= R2) continue;
      let nx, nz;
      if (d > 1e-5) { nx = ox / d; nz = oz / d; } else { nx = a.x - b.x; nz = a.z - b.z; const l = Math.hypot(nx, nz); if (l < 1e-5) { nx = 1; nz = 0; } else { nx /= l; nz /= l; } }
      const push = (R2 - d) / 2;
      a.x += nx * push; a.z += nz * push; b.x -= nx * push; b.z -= nz * push;
      for (const e of [a, b]) { const r = Math.hypot(e.x, e.z); if (r > lim) { e.x *= lim / r; e.z *= lim / r; } }
    }
  }
  const _eq = new THREE.Quaternion(), _ee = new THREE.Euler();
  function placeEggs(dt = 1 / 60) {
    separateEggs();
    for (const e of bowlEggs) {
      const m = e.mesh, ry = e.ry, half = EGG_H / 2;
      const y = surfAt(e.x, e.z) + EGG_R * 0.92 - e.sink - kneadSink * 0.35;
      const tx = e.x + Math.cos(ry) * half, tz = e.z - Math.sin(ry) * half;
      _eq.setFromEuler(_ee.set(0, ry, Math.PI / 2));
      if (e.t < 1) {
        // 落ちてから、その場で横に倒れる(位置は飛ばない)
        e.t = Math.min(1, e.t + dt * 4); const k = e.t * e.t * (3 - 2 * e.t);
        m.quaternion.copy(e.q0).slerp(_eq, k);
        m.position.lerpVectors(e.p0, new V(tx, y, tz), k);
      } else { m.quaternion.copy(_eq); m.position.set(tx, y, tz); }
    }
  }
  // 卵を真上から撮った絵(形を作る場面で、3Dの見た目のまま入れるため)
  let eggCamR = null;
  function snapMesh(mesh, half) {
    if (!eggCamR) { const c = document.createElement("canvas"); eggCamR = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }); eggCamR.setSize(160, 160, false); eggCamR.outputEncoding = THREE.sRGBEncoding; eggCamR.setClearColor(0, 0); }
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.9)); const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(-1, 3, 1.5); sc.add(dl);
    const m = mesh.clone(); m.position.set(0, 0, 0); sc.add(m);
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 10); cam.position.set(0, 3, 0.001); cam.lookAt(0, 0, 0);
    eggCamR.render(sc, cam);
    const out = document.createElement("canvas"); out.width = out.height = 160; out.getContext("2d").drawImage(eggCamR.domElement, 0, 0);
    return out;
  }
  function eggSprite() {
    if (!bowlEggs.length) return null;
    if (!eggCamR) { const c = document.createElement("canvas"); eggCamR = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }); eggCamR.setSize(160, 160, false); eggCamR.outputEncoding = THREE.sRGBEncoding; eggCamR.setClearColor(0, 0); }
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.9)); const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(-1, 3, 1.5); sc.add(dl);
    const m = bowlEggs[0].mesh.clone(); m.rotation.set(0, 0.4, Math.PI / 2); m.position.set(EGG_H / 2, 0, 0); sc.add(m);
    const cam = new THREE.OrthographicCamera(-0.26, 0.26, 0.26, -0.26, 0.1, 10); cam.position.set(0, 3, 0.4); cam.lookAt(0, 0, 0);
    eggCamR.render(sc, cam);
    const out = document.createElement("canvas"); out.width = out.height = 160; out.getContext("2d").drawImage(eggCamR.domElement, 0, 0);
    return out;
  }
  function buryAt(ux, uy) {
    const px = ux / 0.92 * RC, pz = uy / 0.92 * RC;
    for (const e of bowlEggs) { const d = Math.hypot(e.x - px, e.z - pz); if (d < 0.36) e.sink = Math.min(EGG_R * 1.2, e.sink + 0.05 * (1 - d / 0.36)); }
    for (const b of obods) { const d = Math.hypot(b.mesh.position.x - px, b.mesh.position.z - pz); if (d < 0.36) { b.sink += 0.17 * (1 - d / 0.36) + 0.04; wake(b); } }
  }
  // こねる: 指のまわりのかけらを押しのけて、少し沈める
  function stirOnion(ux, uy, k, fvx = 0, fvz = 0) {
    const px = ux * RC, pz = uy * RC;
    // 指の速さ(世界の単位/秒)。速すぎる値は抑える
    let mvx = fvx * RC, mvz = fvz * RC; const ms = Math.hypot(mvx, mvz); if (ms > 2.5) { mvx *= 2.5 / ms; mvz *= 2.5 / ms; }
    // 卵もこねると指に押されてころがる
    for (const e of [...bowlEggs]) {
      const dx = e.x - px, dz = e.z - pz, d = Math.hypot(dx, dz); if (d >= 0.3 || d < 1e-4) continue;
      const f = (1 - d / 0.3) * 0.02 * k; e.x += dx / d * f; e.z += dz / d * f; e.ry += f * 3; const r = Math.hypot(e.x, e.z), lim = RC * 0.7; if (r > lim) { e.x *= lim / r; e.z *= lim / r; }
      // 指で押すたびに殻が弱る(速くこねるほど早く割れる)
      e.hp = (e.hp == null ? 1 : e.hp) - (1 - d / 0.3) * (0.04 + Math.hypot(mvx, mvz) * 0.06);
      if (e.hp <= 0) crushEgg(e);
    }
    // 指のまわりの具材: 位置を飛ばさず「押す力」(速度)を与える → 物理で転がる・ほかの物にぶつかる
    for (const b of obods) {
      const P = b.mesh.position, dx = P.x - px, dz = P.z - pz, d = Math.hypot(dx, dz), R0 = 0.22;
      if (d > R0 || d < 1e-4) continue;
      const f = 1 - d / R0;
      b.v.x += (mvx * 0.55 + dx / d * 0.35) * f; b.v.z += (mvz * 0.55 + dz / d * 0.35) * f;
      const sp = Math.hypot(b.v.x, b.v.z); if (sp > 1.4) { b.v.x *= 1.4 / sp; b.v.z *= 1.4 / sp; }
      // 転がる: 押された向きに回る(床に接した球と同じ向き)
      const rr = Math.max(0.02, b.rc || b.r * 0.5); b.w.x += (mvz * 0.55 * f) / rr * 0.3; b.w.z -= (mvx * 0.55 * f) / rr * 0.3;
      const wl = b.w.length(); if (wl > 18) b.w.multiplyScalar(18 / wl);
      b.sink = Math.min(b.sink + 0.006 * k * f, 0.6); wake(b);
    }
  }
  let lay = { cy: 300, top: 600 };
  function place() {
    const W = innerWidth, H = innerHeight;
    if (r.__w !== W || r.__h !== H) { r.setSize(W, H, false); r.__w = W; r.__h = H; cv.style.width = W + "px"; cv.style.height = H + "px"; } cam.aspect = W / H;
    const avail = Math.max(200, lay.top - 60);
    const hh = Math.atan(Math.tan(THREE.MathUtils.degToRad(16)) * cam.aspect);
    if (mode === "ing") {
      const dist = Math.max(6.4, 1.62 / Math.tan(hh)) * Math.max(1, 520 / avail);
      cam.position.set(0, dist * 0.74, dist * 0.54 + 1.6); cam.lookAt(0, 0.1, 1.25); // ボウルが上(奥)、材料が下(手前)
    } else {
      const dist = Math.max(4.2, 1.35 / Math.tan(hh)) * Math.max(1, 380 / avail);
      cam.position.set(0, dist * 0.8, dist * 0.6); cam.lookAt(0, 0.18, 0);
    }
    cam.setViewOffset(W, H, 0, H / 2 - lay.cy, W, H); cam.updateProjectionMatrix();
  }
  const proj = (x, y, z) => { const v = new V(x, y, z).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new V(0, 1, 0), -CY0);
  // ===================== テーブルの上の材料(ボウルの奥に置く) =====================
  // ひき肉(トレー入り)・たまご(自分で割る)は3D。ほかはカード状のスプライト
  let itemsGroup = null, picks = [], drag = null, anims = [], itemsOn = true, mode = "ing";
  const cb = { drop: () => true, egg: () => {}, sound: () => {}, toast: () => {}, pour: () => {} };
  const HOME = {};
  let meatTex = null, eggObj = null, pack = null, meatUsed = 0;
  function meatCanvasTex() {
    if (meatTex) return meatTex;
    const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
    x.fillStyle = "#9e3a31"; x.fillRect(0, 0, 256, 256);
    const cols = ["#c0534a", "#8a2e27", "#d26a5f", "#b2453c", "#76261f", "#c25a4f"];
    for (let i = 0; i < 3200; i++) {
      x.fillStyle = Math.random() < 0.13 ? "rgba(244,230,220,.95)" : cols[Math.random() * cols.length | 0];
      const r = 1.2 + Math.random() * 3; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, r * (1 + Math.random()), r, Math.random() * 3, 0, 7); x.fill();
    }
    meatTex = new THREE.CanvasTexture(c); meatTex.encoding = THREE.sRGBEncoding; meatTex.wrapS = meatTex.wrapT = THREE.RepeatWrapping;
    return meatTex;
  }
  // たまご: 下半分と上半分(割る時に開く)。ヒビは模様のキャンバスに描き足す
  function eggHalfTex() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#e8904f"); g.addColorStop(1, "#cf7638");
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(140,70,30,${Math.random() * 0.2})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 128, Math.random() * 1.6, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return { c, x, t };
  }
  const EGG_H = 0.42, EGG_R = 0.17;
  function eggProfile(t0, t1) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = t0 + (t1 - t0) * i / 16, y = t * EGG_H;
      const k = Math.sin(Math.PI * t); let r = EGG_R * Math.sqrt(Math.max(0, k)) * (1.06 - 0.16 * t);
      if (i === 0 && t0 === 0) r = 0; if (i === 16 && t1 === 1) r = 0;
      pts.push(new THREE.Vector2(r, y));
    }
    return pts;
  }
  function makeEgg() {
    const grp = new THREE.Group();
    const halves = [[0, 0.5], [0.5, 1]].map(([a, b]) => {
      const tx = eggHalfTex();
      const m = new THREE.Mesh(new THREE.LatheGeometry(eggProfile(a, b), 40), new THREE.MeshStandardMaterial({ map: tx.t, roughness: 0.55, side: THREE.DoubleSide }));
      if (a === 0.5) { m.geometry.translate(0, -EGG_H / 2, 0); m.position.y = EGG_H / 2; } // 割れ目を軸に開く
      m.castShadow = true; m.receiveShadow = true; m.userData.tx = tx; grp.add(m); return m;
    });
    grp.userData = { halves, cracked: 0, heavy: false };
    return grp;
  }
  function drawCrack(egg, strong) {
    for (const [i, h] of egg.userData.halves.entries()) {
      const { x, t } = h.userData.tx, y0 = i === 0 ? 124 : 4;
      x.strokeStyle = "rgba(90,55,30,.85)"; x.lineWidth = strong ? 3 : 2;
      x.beginPath(); let px = 0, py = y0; x.moveTo(px, py);
      while (px < 256) { px += 6 + Math.random() * 10; py = y0 + (Math.random() - 0.5) * (strong ? 26 : 14) * (i === 0 ? 1 : 1); x.lineTo(px, py); }
      x.stroke(); t.needsUpdate = true;
    }
  }
  function cardSprite(emoji, name) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 300; const x = c.getContext("2d");
    x.font = '170px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 14; x.shadowOffsetY = 8; x.fillText(emoji, 128, 120);
    // 名前札なしの絵(手に持って傾けている時用)
    const c2 = document.createElement("canvas"); c2.width = 256; c2.height = 300; c2.getContext("2d").drawImage(c, 0, 0);
    const plain = new THREE.CanvasTexture(c2); plain.encoding = THREE.sRGBEncoding;
    x.shadowColor = "transparent"; x.font = "900 40px system-ui, sans-serif";
    const w = x.measureText(name).width + 28; x.fillStyle = "rgba(255,255,255,.92)"; x.beginPath(); x.roundRect(128 - w / 2, 236, w, 52, 26); x.fill();
    x.fillStyle = "#2b2b2b"; x.fillText(name, 128, 263);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
    s.scale.set(0.5, 0.58, 1); s.center.set(0.5, 0.05); s.userData.plain = plain; s.userData.full = t;
    return s;
  }
  function initItems(list) {
    itemsGroup = new THREE.Group(); scene.add(itemsGroup);
    // ひき肉のトレー
    pack = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.07, 0.56), new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6 }));
    tray.position.y = 0.035; tray.castShadow = true; tray.receiveShadow = true; pack.add(tray);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: meatCanvasTex(), roughness: 0.7 }));
    mound.scale.set(1.1, 0.42, 0.75); mound.position.y = 0.07; mound.castShadow = true; pack.add(mound); pack.userData.mound = mound;
    pack.position.set(-0.62, 0, 1.55); pack.userData.id = "meat"; itemsGroup.add(pack); HOME.meat = pack.position.clone();
    picks.push(pack);
    newEgg();
    // ほかの材料はカード
    const others = list.filter((g) => g.id !== "meat" && g.id !== "egg" && g.id !== "eggShell");
    const rowA = others.filter((g) => !g.joke), rowB = others.filter((g) => g.joke);
    const lay = (row, z, sp) => row.forEach((g, i) => {
      const s = cardSprite(g.e, g.name); s.position.set((i - (row.length - 1) / 2) * sp, 0, z); s.userData.id = g.id;
      itemsGroup.add(s); HOME[g.id] = s.position.clone(); picks.push(s);
    });
    lay(rowA.slice(0, 2), -1.5, 0.42); // パン粉・牛乳はたまごの右
    rowA.slice(0, 2).forEach((g, i) => { const s = picks.find((p) => p.userData.id === g.id); s.position.set(0.66 + i * 0.46, 0, 1.5); HOME[g.id] = s.position.clone(); });
    lay(rowA.slice(2), 2.45, 0.55);
    // 牛乳はカードでなく、3Dの紙パック
    const mc = picks.find((p) => p.userData.id === "milk");
    if (mc) { const m = makeMilk(); m.position.copy(mc.position); m.userData.id = "milk"; itemsGroup.remove(mc); picks[picks.indexOf(mc)] = m; itemsGroup.add(m); }
    lay(rowB, 3.25, 0.52);
  }
  // 牛乳の紙パック(屋根の形のふた・青い帯・文字)。原点は底の真ん中
  const MW = 0.3, MH = 0.6, MR = 0.1;
  function milkSideTex(face) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 512; const x = c.getContext("2d");
    x.fillStyle = "#fbfbf7"; x.fillRect(0, 0, 256, 512);
    const g = x.createLinearGradient(0, 300, 0, 512); g.addColorStop(0, "#2f74c8"); g.addColorStop(1, "#1d4f97");
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 330); x.bezierCurveTo(80, 290, 170, 360, 256, 310); x.lineTo(256, 512); x.lineTo(0, 512); x.fill();
    x.fillStyle = "#cfe3f7"; x.beginPath(); x.moveTo(0, 345); x.bezierCurveTo(80, 305, 170, 375, 256, 325); x.lineTo(256, 318); x.bezierCurveTo(170, 368, 80, 298, 0, 338); x.fill();
    if (face === 0) {
      x.fillStyle = "#1f5aa8"; x.textAlign = "center"; x.font = "900 96px system-ui, sans-serif"; x.fillText("牛乳", 128, 200);
      x.font = "700 26px system-ui, sans-serif"; x.fillText("MILK", 128, 245);
      x.fillStyle = "#fff"; x.font = "700 28px system-ui, sans-serif"; x.fillText("500ml", 128, 450);
    } else { x.fillStyle = "rgba(31,90,168,.6)"; x.font = "700 22px system-ui, sans-serif"; x.textAlign = "center"; x.fillText("種類別 牛乳", 128, 150); x.fillText("よく冷やして", 128, 185); }
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`; x.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  function makeMilk() {
    // 外側=持つ位置 / inner=傾ける(パックの真ん中を軸に回す)
    const outer = new THREE.Group(), grp = new THREE.Group(); outer.add(grp); grp.position.y = MH / 2; outer.userData.inner = grp;
    const mats = [1, 1, 2, 2, 0, 1].map((f) => f === 2 ? new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ map: milkSideTex(f), roughness: 0.55 }));
    const body = new THREE.Mesh(new THREE.BoxGeometry(MW, MH, MW), mats); body.position.y = 0; body.castShadow = true; grp.add(body);
    // 屋根(三角の柱)と上のつまみ
    const sh = new THREE.Shape(); sh.moveTo(-MW / 2, 0); sh.lineTo(0, MR); sh.lineTo(MW / 2, 0); sh.lineTo(-MW / 2, 0);
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: MW, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }));
    roof.position.set(0, MH / 2, -MW / 2); roof.castShadow = true; grp.add(roof);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, MW), new THREE.MeshStandardMaterial({ color: 0xe9e9e4, roughness: 0.6 }));
    fin.position.set(0, MH / 2 + MR + 0.012, 0); grp.add(fin);
    // 注ぎ口(左の屋根をあけた所)
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.09), new THREE.MeshStandardMaterial({ color: 0xdcdcd6, roughness: 0.7 }));
    sp.position.set(-MW / 2 + 0.02, MH / 2 + 0.03, 0); sp.rotation.z = 0.5; grp.add(sp);
    return outer;
  }
  // 注いでいる牛乳の筋(毎コマ作り直す)。出口は太く、下へ行くほど細い
  let stream = null, streamW = 0;
  const streamMat = new THREE.MeshPhysicalMaterial({ color: 0xfbfaf3, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  function setStream(from, to, w, t) {
    if (stream) { itemsGroup.remove(stream); stream.geometry.dispose(); stream = null; }
    if (!from || w < 0.002) return null;
    const pts = [], fallH = from.y - to.y, T = Math.sqrt(2 * Math.max(0.05, fallH) / 9);
    const vx = (to.x - from.x) / T, vz = (to.z - from.z) / T;
    for (let i = 0; i <= 14; i++) { const s = i / 14 * T, wob = Math.sin(t * 30 + i) * 0.003 * (i / 14); pts.push(new V(from.x + vx * s + wob, from.y - 4.5 * s * s, from.z + vz * s + wob)); }
    const curve = new THREE.CatmullRomCurve3(pts), segs = 28, rs = 11;
    const geo = new THREE.TubeGeometry(curve, segs, w, rs - 1, false);
    const pos = geo.attributes.position, c = new V();
    for (let i = 0; i <= segs; i++) {
      curve.getPointAt(i / segs, c); const k = 1 - 0.45 * (i / segs);
      for (let j = 0; j < rs; j++) { const id = i * rs + j; pos.setXYZ(id, c.x + (pos.getX(id) - c.x) * k, c.y + (pos.getY(id) - c.y) * k, c.z + (pos.getZ(id) - c.z) * k); }
    }
    geo.computeVertexNormals();
    stream = new THREE.Mesh(geo, streamMat); itemsGroup.add(stream);
    return stream;
  }
  function newEgg() {
    eggObj = makeEgg();
    eggObj.rotation.z = Math.PI / 2; eggObj.position.set(0.14 + EGG_H / 2, EGG_R * 0.95, 1.57); // 横に寝かせて置く
    eggObj.userData.id = "egg"; itemsGroup.add(eggObj); HOME.egg = eggObj.position.clone(); picks.push(eggObj);
  }
  const lift = new THREE.Plane(new V(0, 1, 0), -0.72);
  function rayAt(sx, sy) { ray.setFromCamera({ x: sx / innerWidth * 2 - 1, y: -(sy / innerHeight) * 2 + 1 }, cam); ray.camera = cam; }
  function pickAt(sx, sy) {
    if (!itemsGroup || !itemsOn) return null;
    rayAt(sx, sy);
    const hits = ray.intersectObjects(picks, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.id) o = o.parent; if (o && !o.userData.busy) return o; }
    return null;
  }
  function liftPoint(sx, sy) { rayAt(sx, sy); const p = new V(); return ray.ray.intersectPlane(lift, p) ? p : null; }
  function unitOf(p) { return [p.x / RC * 0.92, p.z / RC * 0.92]; }
  function surfaceY() { return CY0 + dome * 0.8; }
  // 物を落とす(重力)。着いたら done
  function fall(obj, done) { anims.push({ obj, vy: 0, done, kind: "fall" }); }
  function goHome(obj) { anims.push({ obj, kind: "home", t: 0, from: obj.position.clone(), to: HOME[obj.userData.id] }); }
  function itemDown(sx, sy) {
    const o = pickAt(sx, sy); if (!o) return false;
    const id = o.userData.id;
    let carry = o;
    if (id === "meat") {
      // トレーから一つかみ取り出す
      carry = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshStandardMaterial({ map: meatCanvasTex(), roughness: 0.7 }));
      carry.scale.set(1.1, 0.75, 0.95); carry.castShadow = true; carry.userData.id = "meatball"; itemsGroup.add(carry);
      carry.position.copy(pack.position).setY(0.25);
    }
    drag = { o: carry, id, sx, sy, t: performance.now(), moved: false, hist: [] };
    if (POWDER[id]) { carry.center.set(0.5, 0.6); if (carry.userData.plain) carry.material.map = carry.userData.plain; } // 瓶の真ん中を持って回す(名前札は外す)
    const p = liftPoint(sx, sy); if (p) { carry.position.set(p.x, 0.72, p.z); }
    if (id === "egg") carry.rotation.set(0, 0, Math.PI / 2.4);
    return true;
  }
  function itemMove(sx, sy) {
    if (!drag) return false;
    if (Math.hypot(sx - drag.sx, sy - drag.sy) > 8) drag.moved = true;
    const p = liftPoint(sx, sy); if (!p) return true;
    drag.o.position.set(p.x, 0.72, p.z);
    const now = performance.now(); drag.hist.push([now, p.x, p.z]); while (drag.hist.length > 6) drag.hist.shift();
    // 上下に振る動きを見つける(下へ動いて上へ切り返した所 = 1回トン)
    if (drag.lastY == null) { drag.lastY = sy; drag.turnY = sy; drag.turnT = now; drag.dirDown = null; }
    const dy = sy - drag.lastY;
    if (Math.abs(dy) >= 2) {
      const down = dy > 0;
      if (drag.dirDown === true && !down) {
        const amp = drag.lastY - drag.turnY;
        if (amp > 12) onShake(amp / Math.max(0.03, (now - drag.turnT) / 1000));
        drag.turnY = drag.lastY; drag.turnT = now;
      } else if (drag.dirDown === false && down) { drag.turnY = drag.lastY; drag.turnT = now; }
      drag.dirDown = down; drag.lastY = sy;
    }
    return true;
  }
  const POWDER = { salt: [[0.95, 0.95, 0.93], [0.12, 0.11, 0.1]], nutmeg: [[0.55, 0.36, 0.2], [0.42, 0.26, 0.14]], flour: [[0.99, 0.98, 0.95], [0.92, 0.9, 0.84]] };
  // 振った1回ぶん
  function onShake(speed) {
    const d = drag; if (!d) return;
    const o = d.o, p = o.position, rr = Math.hypot(p.x, p.z);
    if (d.id === "egg") {
      const st = o.userData;
      if (rr >= 0.82 && rr < 1.35) {
        // ふちにトン → ヒビ。速すぎるとグシャッ
        const strong = speed > 950;
        st.cracked++; if (strong) st.heavy = true;
        drawCrack(o, strong); cb.sound(strong ? "crackHard" : "crack");
        anims.push({ kind: "dip", obj: o, t: 0 });
        if (strong) cb.toast("グシャッ！ 強すぎたかも…");
        else if (st.cracked === 1) cb.toast("コンッ！ ヒビが入った。ボウルの上で振るか離すとパカッ");
      } else if (rr < 0.82 && st.cracked) {
        drag = null; openEgg(o, p.x, p.z);
      }
      return;
    }
    if (POWDER[d.id] && rr < 0.95) {
      // 下を向けた瓶を振って、粉をパラパラ(ふたの所から出る)
      d.shakes = (d.shakes || 0) + 1; d.kick = d.shakes % 2 ? 0.28 : -0.22;
      const cap = capOf(o);
      powder(cap, POWDER[d.id]); cb.sound("shake");
      if (d.shakes % 2 === 0) { const u = unitOf(cap); cb.drop(d.id, u[0], u[1]); }
    }
  }
  // 瓶のふたの位置(絵の上の端。傾きに合わせて画面の上向きを回す)
  function capOf(o) {
    const r = o.material.rotation, h = o.scale.y * 0.28, e = cam.matrixWorld.elements;
    const rx = new V(e[0], e[1], e[2]), uy = new V(e[4], e[5], e[6]);
    return o.position.clone().addScaledVector(rx, -Math.sin(r) * h).addScaledVector(uy, Math.cos(r) * h);
  }
  // 持っている間: ボウルの上ではしっかり下へ向ける(振るとカクッと揺れる)
  function stepShaker(dt) {
    const d = drag; if (!d || !POWDER[d.id]) return;
    const o = d.o, over = Math.hypot(o.position.x, o.position.z) < 0.95;
    d.kick = (d.kick || 0) * Math.pow(0.02, dt);
    const target = over ? 2.6 + d.kick : 0;
    o.material.rotation += (target - o.material.rotation) * Math.min(1, dt * 10);
  }
  function powder(c, cols) {
    const n = 30, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos.set([c.x + (Math.random() - 0.5) * 0.05, c.y + Math.random() * 0.03, c.z + (Math.random() - 0.5) * 0.05], i * 3);
      col.set(cols[Math.random() < 0.6 ? 0 : 1], i * 3);
      vel.push([(Math.random() - 0.5) * 0.3, -0.3 - Math.random() * 0.5, (Math.random() - 0.5) * 0.3]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.022, vertexColors: true }));
    itemsGroup.add(pts); anims.push({ kind: "powder", pts, vel, t: 0 });
  }
  function itemUp(sx, sy) {
    if (!drag) return false;
    const d = drag; drag = null;
    const o = d.o, p = o.position, rr = Math.hypot(p.x, p.z);
    // 離した瞬間の速さ(強く叩きつけたか)
    let speed = 0; if (d.hist.length >= 2) { const a = d.hist[0], b = d.hist[d.hist.length - 1]; speed = Math.hypot(b[1] - a[1], b[2] - a[2]) / Math.max(0.016, (b[0] - a[0]) / 1000); }
    const tap = !d.moved && performance.now() - d.t < 400;
    if (d.id === "meat") {
      if (tap) { p.set((Math.random() - 0.5) * 0.6, 0.72, (Math.random() - 0.5) * 0.6); }
      if (tap || rr < 0.88) {
        const u = unitOf(p);
        if (!cb.drop("meat", u[0], u[1])) { itemsGroup.remove(o); return true; }
        meatUsed++; const k = Math.max(0.45, 1 - meatUsed / 8); pack.userData.mound.scale.set(1.1 * Math.sqrt(k), 0.42 * k, 0.75 * Math.sqrt(k)); // 入れ放題: 少し減るけど空にはならない
        fall(o, () => { itemsGroup.remove(o); cb.sound("plop"); });
      } else { itemsGroup.remove(o); }
      return true;
    }
    if (d.id === "egg") {
      const egg = o, st = egg.userData;
      if (tap) {
        if (st.cracked) openEgg(egg, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
        else { cb.toast("たまごをつかんで、ボウルのふちでコンッと割ってね"); goHome(egg); egg.rotation.set(0, 0, Math.PI / 2); }
        return true;
      }
      if (st.cracked) {
        // カンカンしてヒビが入っていれば、手を離したら自動でボウルにパカッ
        let x = p.x, z = p.z; if (rr > 0.6) { x *= 0.5 / rr; z *= 0.5 / rr; }
        openEgg(egg, x, z); return true;
      }
      if (rr >= 0.88 && rr < 1.3) {
        // ふちに当てた → ヒビ。強すぎるとグシャッ(殻が入りやすい)
        const strong = speed > 6.5;
        st.cracked++; if (strong) st.heavy = true;
        drawCrack(egg, strong); cb.sound(strong ? "crackHard" : "crack");
        cb.toast(strong ? "グシャッ！ 強すぎたかも…" : "コンッ！ ヒビが入った。ボウルの上で離すとパカッ");
        // ふちから少し浮かせて持ったままにする
        egg.position.set(p.x * 0.8, 0.72, p.z * 0.8); egg.rotation.set(0, 0, Math.PI / 2.4);
        return true;
      }
      if (rr < 0.88) {
        if (st.cracked) openEgg(egg, p.x, p.z);
        else {
          // 割らずに入れた
          picks = picks.filter((x) => x !== egg); egg.userData.busy = true;
          fall(egg, () => { itemsGroup.remove(egg); keepEgg(egg); const u = unitOf(egg.position); cb.egg("whole", u[0], u[1], false); cb.sound("plop"); setTimeout(newEgg, 600); });
        }
        return true;
      }
      goHome(egg); egg.rotation.set(0, 0, Math.PI / 2);
      return true;
    }
    // カードの材料
    if (d.id === "milk") { o.userData.inner.rotation.z = 0; streamW = 0; setStream(null); if (tap) { const u = unitOf(new V((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)); cb.drop("milk", u[0], u[1]); cb.toast("ボウルの上に近づけると注げるよ"); } goHome(o); return true; }
    if (POWDER[d.id]) { o.material.rotation = 0; o.center.set(0.5, 0.05); if (o.userData.full) o.material.map = o.userData.full; if (tap) { const u = unitOf(new V((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)); cb.drop(d.id, u[0], u[1]); cb.toast("ボウルの上で上下に振るとパラパラ出るよ"); } goHome(o); return true; }
    if (tap) { p.set((Math.random() - 0.5) * 0.6, 0.72, (Math.random() - 0.5) * 0.6); }
    if (tap || rr < 0.88) {
      const u = unitOf(p);
      if (cb.drop(d.id, u[0], u[1])) { cb.sound("plop"); o.visible = false; setTimeout(() => { o.position.copy(HOME[d.id]); o.visible = true; }, 350); return true; }
    }
    goHome(o);
    return true;
  }
  // 割る: 横向きのたまごを、左右に開きながら上に持ち上げる(割れ目から黄身と白身が落ちる)
  function openEgg(egg, x, z) {
    picks = picks.filter((q) => q !== egg); egg.userData.busy = true;
    // ボウルの中に落ちる位置にする(外で割っても中身はボウルのふちの内側へ)。ここで決めた所に2Dの卵も置く
    const lim = RC * 0.7 / 0.92, dd = Math.hypot(x, z); if (dd > lim) { x *= lim / dd; z *= lim / dd; }
    egg.position.set(x, 0.86, z); egg.rotation.set(0, 0, 0); eggPose(egg, 0);
    cb.sound("open");
    const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), new THREE.MeshStandardMaterial({ color: 0xff7f0a, roughness: 0.12, emissive: 0x3a1400 }));
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false }));
    white.scale.set(1.1, 0.45, 1); yolk.position.set(x, 0.84, z); white.position.set(x, 0.82, z);
    yolk.visible = white.visible = false; itemsGroup.add(yolk, white);
    anims.push({ kind: "open", egg, t: 0, x, z, yolk, white, heavy: egg.userData.heavy });
  }
  // 開き具合k(0〜1)の殻の形。割れ目(真ん中)を支点に、左右へ離れて上へ上がり、口が下を向く
  function eggPose(egg, k) {
    const [bot, top] = egg.userData.halves, h = EGG_H / 2;
    const e = k * k * (3 - 2 * k), gap = e * 0.13, lift = e * 0.12, th = e * 1.05;
    // 左の殻(とがってない方): 先が左、割れ目が右
    const aL = -Math.PI / 2 - th; bot.rotation.set(0, 0, aL);
    bot.position.set(-gap + h * Math.sin(aL), lift - h * Math.cos(aL), 0);
    // 右の殻: 先が右、割れ目が左
    top.rotation.set(0, 0, -Math.PI / 2 + th); top.position.set(gap, lift, 0);
  }
  // 牛乳を注ぐ(つかんでボウルの上にある間ずっと)
  function stepPour(dt) {
    const d = drag;
    if (!d || d.id !== "milk") return;
    const o = d.o, p = o.position, over = Math.hypot(p.x, p.z) < 0.95;
    // ボウルの上に来たら、パックを左へ傾ける(注ぎ口が下を向くくらいまで)
    const inn = o.userData.inner, target = over ? 1.5 : 0;
    inn.rotation.z += (target - inn.rotation.z) * Math.min(1, dt * 6);
    o.position.y = 0.72 + 0.28 * (inn.rotation.z / 1.5); // 傾けるときは少し持ち上げる
    o.updateMatrixWorld(true);
    const lip = inn.localToWorld(new V(-MW / 2 - 0.01, MH / 2 + 0.03, 0));
    const pouring = over && inn.rotation.z > 1.1;
    streamW += ((pouring ? 0.024 : 0) - streamW) * Math.min(1, dt * (pouring ? 7 : 14));
    // 筋の落ちる先: 少し前へ飛びながら、中身の面へ
    const land = new V(lip.x - 0.05, surfaceY() + 0.01, lip.z);
    setStream(lip, land, streamW, performance.now() / 1000);
    if (pouring && streamW > 0.012) {
      // 筋が届いた所に、注いだ量だけ牛乳のたまりが広がる(毎コマ)
      const uL = unitOf(land); cb.pour(uL[0], uL[1], dt / 0.7);
    }
    if (pouring) {
      d.pourT = (d.pourT || 0) + dt;
      if (!d.pourSnd || d.pourT - d.pourSnd > 0.12) { d.pourSnd = d.pourT; cb.sound("pour"); }
      // 0.7秒注ぐごとに1杯(落ちた所に白いたまりが広がる)
      if (d.pourT >= 0.7) { d.pourT = 0; d.pourSnd = 0; const u = unitOf(land); if (!cb.drop("milk", u[0], u[1], true)) { d.pourT = -99; } }
    }
  }
  const drop = new THREE.SphereGeometry(0.018, 8, 6), milkMat = new THREE.MeshStandardMaterial({ color: 0xfffdf6, roughness: 0.25 });
  function stepAnims(dt) {
    stepPour(dt); stepShaker(dt);
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      if (a.kind === "fall") {
        a.vy -= 9 * dt; a.obj.position.y += a.vy * dt; a.obj.rotation.x += dt * 2;
        if (a.obj.position.y <= surfaceY() + 0.05) { anims.splice(i, 1); a.done(); }
      } else if (a.kind === "home") {
        a.t = Math.min(1, a.t + dt * 4); a.obj.position.lerpVectors(a.from, a.to, a.t * a.t * (3 - 2 * a.t));
        if (a.t >= 1) anims.splice(i, 1);
      } else if (a.kind === "drop") {
        a.vy -= 7 * dt; a.obj.position.y += a.vy * dt;
        if (a.obj.position.y <= surfaceY() + 0.02) { anims.splice(i, 1); itemsGroup.remove(a.obj); }
      } else if (a.kind === "dip") {
        a.t += dt; const k = Math.min(1, a.t / 0.16);
        a.obj.position.y = 0.72 - 0.16 * Math.sin(Math.PI * k);
        if (k >= 1) anims.splice(i, 1);
      } else if (a.kind === "powder") {
        a.t += dt; const pos = a.pts.geometry.attributes.position, floor = surfaceY() + 0.01;
        for (let j = 0; j < a.vel.length; j++) {
          const v = a.vel[j]; v[1] -= 6 * dt;
          let y = pos.getY(j) + v[1] * dt; if (y < floor) { y = floor; v[0] = v[2] = v[1] = 0; }
          pos.setXYZ(j, pos.getX(j) + v[0] * dt, y, pos.getZ(j) + v[2] * dt);
        }
        pos.needsUpdate = true;
        if (a.t > 1.4) { anims.splice(i, 1); itemsGroup.remove(a.pts); a.pts.geometry.dispose(); }
      } else if (a.kind === "open") {
        a.t += dt;
        eggPose(a.egg, Math.min(1, a.t / 0.45));
        if (a.t > 0.12) { a.yolk.visible = a.white.visible = true; }
        if (a.t > 0.12) for (const m of [a.yolk, a.white]) { m.userData.vy = (m.userData.vy || 0) - 9 * dt; m.position.y = Math.max(surfaceY() + 0.03, m.position.y + m.userData.vy * dt); }
        // 中身が面に着いた瞬間に、ボウルの中の卵(ベチャっと広がる)に切りかえる
        if (!a.done && a.yolk.visible && a.yolk.position.y <= surfaceY() + 0.031) {
          a.done = true; itemsGroup.remove(a.yolk, a.white);
          const u = unitOf(new V(a.x, 0, a.z)); cb.egg("open", u[0], u[1], a.heavy); cb.sound("splat");
        }
        if (a.t > 1.1 && a.done) { anims.splice(i, 1); itemsGroup.remove(a.egg); setTimeout(newEgg, 300); }
      }
    }
  }

  window.Bowl3D = {
    ok: true,
    tex: () => (r ? texCv : null),
    start() { if (!r) init(); cv.style.display = "block"; running = true; },
    stop() { if (cv) cv.style.display = "none"; running = false; },
    get running() { return running; },
    // 描いた中身を反映して1コマ描く。cy=中心にしたい画面の高さ / top=下のパネルの上端
    render(cy, top, meatH) {
      if (!running) return null;
      const now = performance.now(), dt = Math.min(0.05, (now - (this._t || now)) / 1000); this._t = now;
      if (itemsGroup) { itemsGroup.visible = itemsOn && mode === "ing"; stepAnims(dt); }
      stepOnion(dt); placeEggs(dt);
      lay = { cy, top }; place(); relaxBumps(dt); setDome(meatH);
      tex.needsUpdate = true; r.render(scene, cam);
      const c = proj(0, CY0 + dome * 0.6, 0), e = proj(RC, CY0, 0);
      return { cx: c[0], cy: c[1], rad: Math.abs(e[0] - c[0]) };
    },
    // 画面の点 → 中身の面の上の位置(中身の半径=1)
    // 材料(テーブルの上)
    setItems(list) { if (!r) init(); if (!itemsGroup) initItems(list); },
    resetItems() {
      if (!itemsGroup) return;
      meatUsed = 0; pack.userData.mound.visible = true; pack.userData.mound.scale.set(1.1, 0.42, 0.75);
      if (eggObj) { itemsGroup.remove(eggObj); picks = picks.filter((x) => x !== eggObj); }
      anims = []; drag = null; newEgg(); clearEggs(); clearSolids();
    },
    setMode(m) { mode = m; if (m === "ing" && kneadSink) { kneadSink = 0; for (const b of obods) wake(b); } },
    addOnion(data) { addOnion(data); },
    clearOnion() { clearOnion(); },
    get hasOnion() { return obods.length > 0; },
    get hasEgg() { return bowlEggs.length > 0; },
    // 全部の具材(うまっている物も): { id, ux, uy }
    solidList() { return obods.filter((b) => b.kind === "solid").map((b) => ({ id: b.id, ux: b.mesh.position.x / RC * 0.92, uy: b.mesh.position.z / RC * 0.92 })); },
    get hasSolids() { return obods.some((b) => b.kind === "solid"); },
    isSolid(id) { return SOLID_IDS.has(id); },
    spawn(id, ux, uy) { if (!r) init(); spawnSolid(id, ux / 0.92 * RC, uy / 0.92 * RC); },
    // 具材を真上から撮った絵(形を作る場面で、3Dの見た目のまま入れるため)
    eggList() { return bowlEggs.map((e) => ({ mesh: e.mesh, ux: e.x / RC * 0.92, uy: e.z / RC * 0.92 })); },
    solidSprite(b) { return snapMesh(b.mesh, b.r * 1.15); },
    solidSize(b) { return b.r * 2 / RC * 0.92; },
    eggSprite() { return eggSprite(); },
    bury(ux, uy) { buryAt(ux, uy); },
    // こねた具合(0〜1): 全体がだんだん肉の中へ
    setKnead(e) { const t = e * 0.06; if (Math.abs(t - kneadSink) > 0.002) { kneadSink = t; for (const b of obods) wake(b); } },
    // 玉ねぎのかけらの位置(アプリの単位)と大きさ
    // こね終わっても肉から出ている(混ざりきっていない)かけら: idx=切った時の番号 / vis=出ている割合
    onionVisible(all) {
      const out = [], tv = new V();
      for (const b of obods) {
        let mx = -9, mn = 9; for (const p of b.local) { tv.copy(p).applyQuaternion(b.mesh.quaternion); mx = Math.max(mx, tv.y); mn = Math.min(mn, tv.y); }
        const P = b.mesh.position, top = P.y + mx, h = Math.max(0.01, mx - mn), vis = (top - surfAt(P.x, P.z)) / h;
        if (vis > 0 || all) out.push({ idx: b.idx, id: b.kind === "solid" ? b.id : "onion", body: b, vis: Math.min(1, vis), ux: P.x / RC * 0.92, uy: P.z / RC * 0.92 });
      }
      return out;
    },
    onionSpots() { return obods.filter((b) => b.kind !== "solid").map((b) => [b.mesh.position.x / RC * 0.92, b.mesh.position.z / RC * 0.92, b.r / RC * 0.92 * 0.6]); },
    _onion: () => obods,
    _stepOnion(n = 1) { for (let i = 0; i < n; i++) stepOnion(1 / 60); },
    on(o) { Object.assign(cb, o); },
    down: (x, y) => itemDown(x, y), move: (x, y) => itemMove(x, y), up: (x, y) => itemUp(x, y),
    get dragging() { return !!drag; },
    poke(ux, uy, k, vx = 0, vy = 0) { poke(ux, uy, k); stirOnion(ux, uy, k, vx, vy); },
    // 材料の画面上の位置(テスト・案内用)
    screenOf(id) { const o = id === "egg" ? eggObj : id === "meat" ? pack : picks.find((x) => x.userData.id === id); if (!o) return null; const b = new THREE.Box3().setFromObject(o), w = new V(); b.getCenter(w); return proj(w.x, w.y, w.z); },
    screenAt(x, y, z) { return proj(x, y, z); },
    toUnit(sx, sy) {
      ray.setFromCamera({ x: sx / innerWidth * 2 - 1, y: -(sy / innerHeight) * 2 + 1 }, cam);
      const p = new V(); if (!ray.ray.intersectPlane(plane, p)) return null;
      return [p.x / RC, p.z / RC];
    },
  };
})();
