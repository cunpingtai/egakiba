// 玉ねぎを3Dで切る(three.js)。
// かけら = 凸多面体。指でなぞった線 → まっすぐ下ろす包丁の面で本当に2つに割り、
// 割れたかけらは重力で倒れたり転がったりする(かんたんな剛体物理)。
(() => {
  if (!window.THREE || !THREE.ConvexHull || !THREE.ConvexGeometry) { window.Cut3D = { ok: false }; return; }
  const V = THREE.Vector3;
  let renderer = null, scene, camera, cv, board, light, running = false, raf = 0;
  let bodies = [];
  const G = 26;           // 重力(見た目がリアルに見える強さ)
  const MAX_PIECES = 3000; // 実質上限なし(固まらないための安全のためだけ)
  const BW = 4.6, BD = 3.6; // まな板の大きさ(玉ねぎの半径=1)
  const tmp = new V(), tmp2 = new V();

  // ---------- 玉ねぎの断面・皮の見た目(場所で色を決めるので、どこを切っても年輪が出る) ----------
  // 玉ねぎの輪郭(高さyでの横の半径)。形とシェーダーで同じものを使う
  // 下(根)は少し平ら、上(芽)は細くとがる
  const PROFILE_GLSL = `
    float prof(float y) {
      float t = y > 0.0 ? y / 1.05 : y / 0.84;
      t = clamp(t, -1.0, 1.0);
      float r = sqrt(max(0.0, 1.0 - t * t));
      if (t > 0.0) r *= 1.0 - 0.3 * t * t;
      return max(r, 0.035);
    }`;
  const PW = 128, PH = 64, peelData = new Uint8Array(PW * PH * 4); let peelAll = false;
  const peelTex = new THREE.DataTexture(peelData, PW, PH, THREE.RGBAFormat); peelTex.wrapS = THREE.RepeatWrapping; peelTex.magFilter = THREE.LinearFilter; peelTex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    uniforms: { lightDir: { value: new V(0.45, 1, 0.55).normalize() }, amb: { value: 0.58 }, dif: { value: 0.55 }, cookCol: { value: new THREE.Color(0.78, 0.52, 0.2) }, cookK: { value: 0 }, peelMap: { value: peelTex } },
    vertexShader: `
      attribute vec3 opos;
      varying vec3 vO; varying vec3 vN; varying vec3 vR;
      void main() {
        vO = opos;
        mat3 m = mat3(modelMatrix);
        vN = normalize(m * normal);
        vR = normalize(m * normalize(vec3(opos.x, opos.y * 0.55, opos.z)));
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: PROFILE_GLSL + `
      uniform vec3 lightDir; uniform float amb; uniform float dif; uniform vec3 cookCol; uniform float cookK; uniform sampler2D peelMap;
      varying vec3 vO; varying vec3 vN; varying vec3 vR;
      void main() {
        // 層 = 玉ねぎの形を横に縮めたもの。上(芽)と下(根)で全部の層が集まる
        float L = length(vO.xz) / prof(vO.y);
        // 中身: ほぼ白〜クリーム色。外側の層ほどうっすら黄緑。芯はほんのり黄色
        vec3 flesh = mix(vec3(0.99, 0.98, 0.94), vec3(0.93, 0.95, 0.80), smoothstep(0.55, 0.95, L));
        flesh = mix(vec3(0.95, 0.94, 0.78), flesh, smoothstep(0.04, 0.16, L));
        // 層のさかい目はうすい線だけ(本物みたいに控えめに)
        float f = fract(L * 8.0 / 0.958);
        float line = smoothstep(0.07, 0.0, f) + smoothstep(0.95, 1.0, f);
        flesh = mix(flesh, vec3(0.86, 0.86, 0.70), clamp(line, 0.0, 1.0) * 0.45 * (1.0 - smoothstep(0.9, 0.958, L)));
        // 外の皮(薄いオレンジ茶色)。上から下へ流れる細いすじ
        float outer = smoothstep(0.958, 0.972, L); // 面のまん中は少し内側にへこむので余裕をもたせる
        float ang = atan(vO.z, vO.x);
        // むいた所は皮がなくなって、つるっとした外側の実が出る
        float pe = texture2D(peelMap, vec2(ang / 6.2831853 + 0.5, clamp((vO.y + 0.9) / 2.0, 0.0, 1.0))).r;
        float sk = outer * (1.0 - smoothstep(0.3, 0.7, pe));
        flesh = mix(flesh, vec3(0.95, 0.96, 0.84), outer * (1.0 - sk));
        float streak = 0.018 * sin(ang * 31.0 + sin(vO.y * 3.0) * 0.6) + 0.012 * sin(ang * 7.0 + 1.3);
        vec3 skin = vec3(0.98, 0.72, 0.44) + streak;
        skin = mix(skin, vec3(0.70, 0.46, 0.26), smoothstep(0.75, 1.1, vO.y));   // 芽のほうは乾いて濃い
        skin = mix(skin, vec3(0.78, 0.56, 0.36), smoothstep(-0.7, -0.84, vO.y)); // 根っこ
        vec3 col = mix(flesh, skin, sk);
        // 皮はなめらかな法線、切り口は平ら
        vec3 n = normalize(vN);
        if (outer > 0.5 && dot(n, vR) > 0.3) n = vR;
        float d = max(dot(n, normalize(lightDir)), 0.0);
        vec3 c = col * (amb + dif * d);
        vec3 h = reflect(-normalize(lightDir), n);
        float sp = pow(max(dot(h, vec3(0.0, 0.6, 0.8)), 0.0), 14.0);
        c += sp * mix(0.22, 0.3, sk);   // 切り口はみずみずしく、皮はつやっと
        c = mix(c, c * cookCol * 1.25, cookK); // 焼けた色(玉ねぎはあめ色→こげ)
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  // ---------- 凸多面体のかけら ----------
  function hullOf(points) { const h = new THREE.ConvexHull(); h.setFromPoints(points); return h; }
  function hullVerts(h) {
    const out = [], seen = new Set();
    for (const f of h.faces) { let e = f.edge; do { const p = e.head().point, k = `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`; if (!seen.has(k)) { seen.add(k); out.push(p.clone()); } e = e.next; } while (e !== f.edge); }
    return out;
  }
  function hullEdges(h) {
    const out = [];
    for (const f of h.faces) { let e = f.edge; do { out.push([e.tail().point, e.head().point]); e = e.next; } while (e !== f.edge); }
    return out;
  }
  // body: { mesh, local:[V](重心まわり), o:V(玉ねぎ座標での重心), v, w, m, I, r, rest }
  // 体積の重心(頂点の平均だと切り口側にかたよって、倒れ方がおかしくなる)
  function volumeCentroid(geo) {
    const P = geo.attributes.position, c = new V(); let vol = 0;
    const a = new V(), b = new V(), d = new V();
    for (let i = 0; i < P.count; i += 3) {
      a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); d.fromBufferAttribute(P, i + 2);
      const v = a.dot(tmp.copy(b).cross(d)) / 6; // 原点とこの三角形でできる四面体
      vol += v; c.x += v * (a.x + b.x + d.x) / 4; c.y += v * (a.y + b.y + d.y) / 4; c.z += v * (a.z + b.z + d.z) / 4;
    }
    return Math.abs(vol) > 1e-9 ? { c: c.divideScalar(vol), vol: Math.abs(vol) } : null;
  }
  function makeBody(localPts, o, pos, quat) {
    let geo;
    try { geo = new THREE.ConvexGeometry(localPts); } catch { return null; }
    const vc = volumeCentroid(geo);
    if (!vc || vc.vol < 1e-5) { geo.dispose(); return null; }
    const c = vc.c;
    geo.translate(-c.x, -c.y, -c.z);
    const pts = localPts.map((p) => p.clone().sub(c));
    const pos3 = geo.attributes.position, op = new Float32Array(pos3.count * 3);
    const oc = o.clone().add(c);
    for (let i = 0; i < pos3.count; i++) { op[3 * i] = pos3.getX(i) + oc.x; op[3 * i + 1] = pos3.getY(i) + oc.y; op[3 * i + 2] = pos3.getZ(i) + oc.z; }
    geo.setAttribute("opos", new THREE.BufferAttribute(op, 3));
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
    const q = quat.clone();
    mesh.quaternion.copy(q);
    mesh.position.copy(pos).add(c.clone().applyQuaternion(q));
    scene.add(mesh);
    let r = 0, rg = 0; for (const p of pts) { r = Math.max(r, p.length()); rg += p.lengthSq(); }
    rg = rg / pts.length;
    const vol = vc.vol;
    const b = { mesh, local: pts, o: oc, v: new V(), w: new V(), m: vol, I: vol * rg * 0.5, r, rest: 0 };
    return b;
  }
  function removeBody(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); }

  function onionPoints() {
    const prof = (y) => { let t = y > 0 ? y / 1.05 : y / 0.84; t = Math.max(-1, Math.min(1, t)); let r = Math.sqrt(Math.max(0, 1 - t * t)); if (t > 0) r *= 1 - 0.3 * t * t; return r; };
    const pts = [];
    for (let i = 1; i < 24; i++) {
      const t = -1 + (i / 24) * 2, y = t > 0 ? t * 1.05 : Math.max(t * 0.84, -0.8); // 下は根っこで少し平ら
      const r = prof(y);
      for (let j = 0; j < 40; j++) { const a = j / 40 * Math.PI * 2; pts.push(new V(Math.cos(a) * r, y, Math.sin(a) * r)); }
    }
    // 根っこの平らなところ
    for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2; pts.push(new V(Math.cos(a) * 0.22, -0.82, Math.sin(a) * 0.22)); }
    // 芽の先(乾いた細いとんがり)
    for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2; pts.push(new V(Math.cos(a) * 0.07, 1.12, Math.sin(a) * 0.07)); }
    pts.push(new V(0.02, 1.27, 0));
    return pts;
  }


  // ---------- 物理 ----------
  const up = new V(0, 1, 0);
  function stepBody(b, dt) {
    if (b.sleep) return;
    b.v.y -= G * dt;
    b.mesh.position.addScaledVector(b.v, dt);
    const w = b.w, q = b.mesh.quaternion;
    const dq = new THREE.Quaternion(w.x * dt * 0.5, w.y * dt * 0.5, w.z * dt * 0.5, 0).multiply(q);
    q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
    // 床(まな板)との接触: 下にもぐった頂点ごとに押し返す
    let minY = Infinity, touching = false;
    for (let it = 0; it < 2; it++) {
      for (const p of b.local) {
        const r = tmp.copy(p).applyQuaternion(q);
        const wy = b.mesh.position.y + r.y;
        if (it === 0) minY = Math.min(minY, wy);
        if (wy > 0.002) continue;
        touching = true;
        // その点の速さ
        const vp = tmp2.copy(b.w).cross(r).add(b.v);
        if (vp.y >= 0) continue;
        const rxn = new V().copy(r).cross(up);
        const jn = -(1.15) * vp.y / (1 / b.m + rxn.lengthSq() / b.I);
        // 摩擦
        const vt = new V(vp.x, 0, vp.z), vtl = vt.length();
        const J = new V(0, jn, 0);
        if (vtl > 1e-5) { const rxt = new V().copy(r).cross(vt.clone().divideScalar(vtl)); const jt = Math.min(0.6 * jn, vtl / (1 / b.m + rxt.lengthSq() / b.I)); J.addScaledVector(vt, -jt / vtl); }
        b.v.addScaledVector(J, 1 / b.m);
        b.w.addScaledVector(new V().copy(r).cross(J), 1 / b.I);
      }
    }
    if (minY < 0) b.mesh.position.y -= minY;
    // まな板から落ちないように、ふちでやさしく止める
    const P = b.mesh.position, mx = BW / 2 - b.r * 0.7, mz = BD / 2 - b.r * 0.7;
    if (Math.abs(P.x) > mx) { P.x = Math.sign(P.x) * mx; b.v.x *= -0.2; b.w.multiplyScalar(0.6); }
    if (Math.abs(P.z) > mz) { P.z = Math.sign(P.z) * mz; b.v.z *= -0.2; b.w.multiplyScalar(0.6); }
    if (touching) { b.v.multiplyScalar(1 - 2.5 * dt); b.w.multiplyScalar(1 - 4.5 * dt); } // 1秒あたりの減り方(サブステップ数に左右されない)
    if (b.mesh.position.y < -3) b.mesh.position.y = 0.5;
    const slow = b.v.lengthSq() < 0.004 && b.w.lengthSq() < 0.01 && touching;
    b.rest = slow ? b.rest + dt : 0;
    if (b.rest > 0.4) { b.sleep = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
  }
  // かけら同士がめりこまないよう、横方向にそっと押し合う
  function separate() {
    const n = bodies.length; if (n < 2) return;
    const order = bodies.slice().sort((p, q) => (p.mesh.position.x - p.r * 0.42) - (q.mesh.position.x - q.r * 0.42)); // 近くの物だけ比べる(かけらが何千個でも重くならない)
    for (let i = 0; i < n; i++) {
      const a = order[i], pa = a.mesh.position, ax = pa.x + a.r * 0.42;
      for (let j = i + 1; j < n; j++) {
        const b = order[j], pb = b.mesh.position; if (pb.x - b.r * 0.42 > ax) break;
        const dx = pb.x - pa.x, dz = pb.z - pa.z, d2 = dx * dx + dz * dz, rr = (a.r + b.r) * 0.42;
        if (d2 >= rr * rr || d2 < 1e-8) continue;
        const d = Math.sqrt(d2), push = (rr - d) * 0.04, nx = dx / d, nz = dz / d;
        if (Math.abs(pa.y - pb.y) > (a.r + b.r) * 0.9) continue;
        pa.x -= nx * push; pa.z -= nz * push; pb.x += nx * push; pb.z += nz * push;
      }
    }
  }

  // ---------- 切る ----------
  const ray = new THREE.Raycaster();
  function screenToBoard(x, y, h) {
    const r = cv.getBoundingClientRect();
    const nx = ((x - r.left) / r.width) * 2 - 1, ny = -((y - r.top) / r.height) * 2 + 1;
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (Math.abs(d.y) < 1e-6) return null;
    const t = (h - o.y) / d.y; return t > 0 ? new V(o.x + d.x * t, h, o.z + d.z * t) : null;
  }
  function splitBody(b, P, n) {
    const q = b.mesh.quaternion, qi = q.clone().invert();
    const lp = P.clone().sub(b.mesh.position).applyQuaternion(qi), ln = n.clone().applyQuaternion(qi);
    const A = [], B = [];
    for (const p of b.local) (p.clone().sub(lp).dot(ln) >= 0 ? A : B).push(p);
    if (A.length < 1 || B.length < 1) return null;
    let h; try { h = hullOf(b.local); } catch { return null; }
    for (const [p1, p2] of hullEdges(h)) {
      const d1 = p1.clone().sub(lp).dot(ln), d2 = p2.clone().sub(lp).dot(ln);
      if ((d1 >= 0) === (d2 >= 0)) continue;
      const t = d1 / (d1 - d2), x = p1.clone().lerp(p2, t); A.push(x); B.push(x.clone());
    }
    if (A.length < 4 || B.length < 4) return null;
    let ha, hb; try { ha = hullVerts(hullOf(A)); hb = hullVerts(hullOf(B)); } catch { return null; }
    if (ha.length < 4 || hb.length < 4) return null;
    const ba = makeBody(ha, b.o, b.mesh.position, q), bb = makeBody(hb, b.o, b.mesh.position, q);
    if (!ba || !bb) { if (ba) removeBody(ba); if (bb) removeBody(bb); return null; }
    // 包丁が入って少し左右に開く(あとは重力で倒れる)
    for (const [nb, s] of [[ba, 1], [bb, -1]]) {
      nb.v.copy(b.v).addScaledVector(n, s * 0.3); nb.v.y += 0.15; nb.w.copy(b.w);
      nb.w.addScaledVector(new V(n.z, 0, -n.x), s * 0.4); // 切った面から外へ倒れはじめる
    }
    return [ba, bb];
  }
  // segs: 画面座標の線分の並び [[x1,y1,x2,y2],...]
  function cut(segs) {
    let made = 0;
    for (const [x1, y1, x2, y2] of segs) {
      const a = screenToBoard(x1, y1, 0.6), c = screenToBoard(x2, y2, 0.6);
      if (!a || !c) continue;
      const dir = c.clone().sub(a); dir.y = 0; const L = dir.length(); if (L < 0.12) continue;
      dir.divideScalar(L);
      const n = new V(-dir.z, 0, dir.x); // 包丁の面(まっすぐ下ろす)の向き
      const next = [];
      for (const b of bodies) {
        if (bodies.length + made >= MAX_PIECES) { next.push(b); continue; }
        // 包丁が通った範囲にかかっているかけらだけ
        let pos = 0, neg = 0, lo = Infinity, hi = -Infinity;
        for (const p of b.local) {
          const w = tmp.copy(p).applyQuaternion(b.mesh.quaternion).add(b.mesh.position);
          const d = (w.x - a.x) * n.x + (w.z - a.z) * n.z; if (d >= 0) pos++; else neg++;
          const t = (w.x - a.x) * dir.x + (w.z - a.z) * dir.z; lo = Math.min(lo, t); hi = Math.max(hi, t);
        }
        if (!pos || !neg || hi < -0.15 || lo > L + 0.15) { next.push(b); continue; }
        const sp = splitBody(b, a, n);
        if (!sp) { next.push(b); continue; }
        removeBody(b); next.push(sp[0], sp[1]); made++;
        for (const o of next) o.sleep = false;
      }
      bodies = next;
      for (const b of bodies) b.sleep = false;
    }
    return made;
  }

  // ---------- 皮をむく: 指でこすった所の皮がはがれる ----------
  const _tri = new THREE.Triangle(), _bc = new V(), _pa = new V(), _pb = new V(), _pc = new V(), _lp = new V();
  const profJS = (y) => { let t = y > 0 ? y / 1.05 : y / 0.84; t = Math.max(-1, Math.min(1, t)); let r = Math.sqrt(Math.max(0, 1 - t * t)); if (t > 0) r *= 1 - 0.3 * t * t; return Math.max(r, 0.035); };
  function peelAt(x, y) {
    const r = cv.getBoundingClientRect();
    ray.setFromCamera({ x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 }, camera);
    const hit = ray.intersectObjects(bodies.map((b) => b.mesh), false)[0]; if (!hit || !hit.face) return false;
    const g = hit.object.geometry, pos = g.attributes.position, op = g.attributes.opos, f = hit.face;
    _lp.copy(hit.point); hit.object.worldToLocal(_lp);
    _pa.fromBufferAttribute(pos, f.a); _pb.fromBufferAttribute(pos, f.b); _pc.fromBufferAttribute(pos, f.c);
    _tri.set(_pa, _pb, _pc).getBarycoord(_lp, _bc);
    const ox = op.getX(f.a) * _bc.x + op.getX(f.b) * _bc.y + op.getX(f.c) * _bc.z, oy = op.getY(f.a) * _bc.x + op.getY(f.b) * _bc.y + op.getY(f.c) * _bc.z, oz = op.getZ(f.a) * _bc.x + op.getZ(f.b) * _bc.y + op.getZ(f.c) * _bc.z;
    if (Math.hypot(ox, oz) / profJS(oy) < 0.9) return false; // 切り口(中身)はむけない
    const u = (Math.atan2(oz, ox) / (Math.PI * 2) + 0.5) * PW, v = Math.max(0, Math.min(1, (oy + 0.9) / 2)) * PH;
    const R = 13; let changed = false;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy * 1.3); if (d > R) continue;
      const px = ((Math.round(u + dx) % PW) + PW) % PW, py = Math.round(v + dy); if (py < 0 || py >= PH) continue;
      const k = (py * PW + px) * 4, val = Math.min(255, peelData[k] + Math.round(255 * (1 - d / R) * 0.9));
      if (val > peelData[k]) { peelData[k] = peelData[k + 1] = peelData[k + 2] = val; peelData[k + 3] = 255; changed = true; }
    }
    if (changed) peelTex.needsUpdate = true;
    // 3割くらいむけたら、残りの皮はつながっているのでペリッと全部むける(見えない裏側も)
    if (changed && !peelAll && peelFrac() > 0.3) { peelAll = true; for (let i = 0; i < peelData.length; i += 4) { peelData[i] = peelData[i + 1] = peelData[i + 2] = peelData[i + 3] = 255; } peelTex.needsUpdate = true; return "all"; }
    return changed;
  }
  // むけた割合(根っこと芽のはしは数えない)
  function peelFrac() { let n = 0, m = 0; for (let y = Math.round(PH * 0.12); y < Math.round(PH * 0.88); y++) for (let x = 0; x < PW; x++) { n++; if (peelData[(y * PW + x) * 4] > 128) m++; } return n ? m / n : 0; }

  // ---------- 2Dの手順へ渡す(上から見た形) ----------
  function hull2(pts) {
    pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up2 = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up2.length >= 2 && cr(up2[up2.length - 2], up2[up2.length - 1], p) <= 0) up2.pop(); up2.push(p); }
    return lo.slice(0, -1).concat(up2.slice(0, -1));
  }
  function toPieces2D() {
    return bodies.map((b) => {
      const ps = b.local.map((p) => { const w = tmp.copy(p).applyQuaternion(b.mesh.quaternion).add(b.mesh.position); return [w.x, w.z]; });
      return { pts: hull2(ps).flat() };
    });
  }

  // ---------- ボウルへ渡す見た目: かけらを1つずつ真上から撮った小さな画像 ----------
  let sprR = null, sprScene, sprCam;
  function toSprites() {
    if (!sprR) {
      const c = document.createElement("canvas");
      sprR = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
      sprR.setPixelRatio(1); sprR.setClearColor(0x000000, 0);
      sprScene = new THREE.Scene();
      sprCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    }
    mat.uniforms.amb.value = 0.95; mat.uniforms.dif.value = 0.15;
    const small = []; // 小さいかけらの絵はいくつか作って使い回す
    const out = bodies.map((b, bi) => {
      const r = b.r * 1.04, px = Math.max(16, Math.min(128, Math.round(r * 2 * 56)));
      if (bodies.length > 250 && px <= 20 && small.length >= 12) { const s = small[bi % small.length]; return { img: s, size: r * 2, x: b.mesh.position.x, z: b.mesh.position.z }; }
      sprR.setSize(px, px, false);
      Object.assign(sprCam, { left: -r, right: r, top: r, bottom: -r });
      sprCam.position.set(0, 10, 0); sprCam.up.set(0, 0, -1); sprCam.lookAt(0, 0, 0); sprCam.updateProjectionMatrix();
      const m = new THREE.Mesh(b.mesh.geometry, mat); m.quaternion.copy(b.mesh.quaternion);
      sprScene.add(m); sprR.render(sprScene, sprCam); sprScene.remove(m);
      const out = document.createElement("canvas"); out.width = out.height = px;
      out.getContext("2d").drawImage(sprR.domElement, 0, 0);
      if (px <= 20 && small.length < 12) small.push(out);
      return { img: out, size: r * 2, x: b.mesh.position.x, z: b.mesh.position.z };
    });
    mat.uniforms.amb.value = 0.58; mat.uniforms.dif.value = 0.55;
    return out;
  }

  // ---------- 起動・描画 ----------
  function woodTexture() {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const g = c.getContext("2d"); g.fillStyle = "#dfc296"; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(150,105,55,${Math.random() * 0.16})`; g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + Math.random() * 12 - 6, 340, y + Math.random() * 12 - 6, 512, y + Math.random() * 8 - 4); g.stroke(); }
    const t = new THREE.CanvasTexture(c); return t;
  }
  // 材料を入れる画面と同じギンガムチェックのテーブルクロス
  function clothTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#fbf5ea"; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "rgba(214,72,72,.42)";
    for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 32, 256); g.fillRect(0, i * 64, 256, 32); }
    g.fillStyle = "rgba(0,0,0,.035)";
    for (let y = 0; y < 256; y += 2) g.fillRect(0, y, 256, 1);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.anisotropy = 8;
    return t;
  }
  function init() {
    cv = document.createElement("canvas"); cv.id = "c3";
    cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100dvh;display:none;z-index:0;pointer-events:none";
    document.body.insertBefore(cv, document.body.firstChild);
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xefe6d6);
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c6a6, 0.75));
    light = new THREE.DirectionalLight(0xffffff, 0.75); light.position.set(3, 8, 4); light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048); Object.assign(light.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); light.shadow.radius = 4;
    scene.add(light);
    board = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.35, BD), [0, 0, 0, 0, 0, 0].map((_, i) => new THREE.MeshLambertMaterial(i === 2 ? { map: woodTexture() } : { color: 0xdcc39a })));
    board.position.y = -0.175; board.receiveShadow = true; board.castShadow = true; scene.add(board);
    // テーブル(材料の画面と同じクロス。ボウルを置く場所にまな板)
    const table = new THREE.Mesh(new THREE.PlaneGeometry(62, 62), new THREE.MeshLambertMaterial({ map: clothTexture() }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.35; table.receiveShadow = true; scene.add(table);
  }
  function resize(cy, panelTop) {
    const W = innerWidth, H = innerHeight;
    if (renderer.__w !== W || renderer.__h !== H) { renderer.setSize(W, H, false); renderer.__w = W; renderer.__h = H; cv.style.width = W + "px"; cv.style.height = H + "px"; }
    camera.aspect = W / H;
    // まな板の横幅がぴったり画面に収まる距離(縦長スマホでも横がはみ出さない)
    const avail = Math.max(200, panelTop - 60);
    const hh = Math.atan(Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect);
    const dist = Math.max(6.5, (BW / 2 + 0.55) / Math.tan(hh)) * Math.max(1, 420 / avail) * 0.92;
    camera.position.set(0, dist * 0.82, dist * 0.62);
    camera.lookAt(0, 0.2, 0);
    camera.setViewOffset(W, H, 0, (H / 2 - cy), W, H);
    camera.updateProjectionMatrix();
  }
  let lastT = 0, getLayout = null;
  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.033, (t - (lastT || t)) / 1000); lastT = t;
    const sub = 4;
    for (let s = 0; s < sub; s++) for (const b of bodies) stepBody(b, dt / sub);
    separate();
    if (getLayout) { const L = getLayout(); resize(L.cy, L.panelTop); }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  window.Cut3D = {
    ok: true,
    peelAt, peelFrac,
    start(layoutFn) {
      peelData.fill(0); peelTex.needsUpdate = true; peelAll = false; // 新しい玉ねぎは皮つき
      if (renderer && renderer.getContext().isContextLost()) { try { renderer.dispose(); cv.remove(); } catch (e) {} renderer = null; bodies = []; }
      if (!renderer) init();
      for (const b of bodies) removeBody(b);
      bodies = [];
      const b = makeBody(onionPoints(), new V(), new V(0, 0, 0), new THREE.Quaternion());
      // まな板の上に置く
      let minY = Infinity; for (const p of b.local) minY = Math.min(minY, p.y);
      b.mesh.position.y = -minY; bodies.push(b);
      getLayout = layoutFn; cv.style.display = "block"; running = true; lastT = 0;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); if (cv) cv.style.display = "none"; },
    cut, toPieces2D, toSprites,
    // ボウルへ渡す: 3Dのかけらの形(複製)・向き・まな板の上の位置
    toBowl() { return { mat, list: bodies.map((b) => ({ geo: b.mesh.geometry.clone(), local: b.local.map((p) => p.clone()), quat: b.mesh.quaternion.clone(), x: b.mesh.position.x, y: b.mesh.position.y, z: b.mesh.position.z, r: b.r, vol: b.m })) }; },
    get count() { return bodies.length; },
    // テスト用: 物理を手で進める
    _step(n = 1) { for (let i = 0; i < n; i++) { for (let s = 0; s < 4; s++) for (const b of bodies) stepBody(b, 1 / 60 / 4); separate(); } if (getLayout) { const L = getLayout(); resize(L.cy, L.panelTop); } renderer.render(scene, camera); },
  };
})();
