// ---------- 空気ぬき(肉なし)の3D: 手でペチペチすると、液体は飛び散り、具材はつぶれたり落ちたりする ----------
// 画面の座標(px)そのままの正射影カメラで描いて、2Dの画面(手の絵の上)に貼る
(() => {
  if (!window.THREE) { window.Toss3D = { ok: false }; return; }
  const V = THREE.Vector3, lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const rgb = (c) => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255).convertSRGBToLinear();
  let r = null, scene, cam, cluster, blob = null, items = [], drops = [], liq = null, F = 100, dripT = 0, W = 0, H = 0;
  // やわらかさ(1=すぐつぶれる)と、つぶれた時の汁の色
  const SOFT = { straw: [0.8, [176, 22, 40]], banana: [0.6, [238, 224, 160]], cheese: [0.3, [255, 210, 80]], yolk: [0.9, [255, 150, 20]], natto: [0.25, [150, 100, 40]], onion: [0.08, [242, 238, 220]], choco: [0.04, [62, 30, 14]], panko: [0, [220, 192, 138]], shell: [0, [240, 225, 200]] };
  const dropGeo = () => (dropGeo.g = dropGeo.g || new THREE.SphereGeometry(1, 12, 9));
  const matCache = {};
  const dropMat = (c) => { const k = c.join(","); return (matCache[k] = matCache[k] || new THREE.MeshPhysicalMaterial({ color: rgb(c), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 })); };
  function init() {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    scene = new THREE.Scene();
    cam = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000); cam.position.z = 1000;
    scene.add(new THREE.HemisphereLight(0xfff4e8, 0x6b4a36, 0.75));
    const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(-0.6, 1, 1.2); scene.add(d);
    const d2 = new THREE.DirectionalLight(0xffe2c8, 0.5); d2.position.set(1, -0.2, 0.6); scene.add(d2);
  }
  function size(w, h) { if (w === W && h === H) return; W = w; H = h; r.setSize(w, h, false); cam.left = 0; cam.right = w; cam.top = 0; cam.bottom = -h; cam.updateProjectionMatrix(); }
  // 飛び散るしずく / かけら
  function spawn(pos, vel, rad, col, kind = "drop") {
    let d = drops.find((x) => x.dead);
    if (!d) { if (drops.length > 160) { d = drops.shift(); } else d = {}; drops.push(d); if (!d.m) { d.m = new THREE.Mesh(dropGeo(), dropMat(col)); scene.add(d.m); } }
    if (!d.m) { d.m = new THREE.Mesh(dropGeo(), dropMat(col)); scene.add(d.m); }
    d.m.material = kind === "shard" ? (spawn.sh = spawn.sh || new THREE.MeshStandardMaterial({ color: lin(0xe9d9c2), roughness: 0.55 })) : dropMat(col);
    d.m.visible = true; d.p = pos.clone(); d.v = vel.clone(); d.r = rad; d.dead = false; d.rest = false; d.kind = kind;
    d.floor = -(Toss3D.tableY + Math.random() * 46); d.m.scale.set(rad, kind === "shard" ? rad * 0.3 : rad, rad); d.m.position.copy(d.p);
    d.m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
  }
  function worldOf(obj) { const p = new V(); obj.getWorldPosition(p); return p; }
  window.Toss3D = {
    ok: true, tableY: 600,
    // kind="liquid": { col, vol } / kind="pile": list=[{ ch, src(元の3Dの物), id }]
    setup(o) {
      if (!r) init();
      if (cluster) scene.remove(cluster); for (const d of drops) if (d.m) scene.remove(d.m); drops = []; items = []; blob = null; liq = null;
      cluster = new THREE.Group(); scene.add(cluster); F = o.F || 100;
      if (o.kind === "liquid") {
        liq = { vol: 1, col: o.col, wob: 0 };
        blob = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshPhysicalMaterial({ color: rgb(o.col), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0 }));
        cluster.add(blob);
      } else {
        const n = o.list.length;
        o.list.forEach((it, i) => {
          const m = it.src.clone(); m.traverse((x) => { if (x.isMesh && x.material) x.material = Array.isArray(x.material) ? x.material.map((mm) => mm.clone()) : x.material.clone(); });
          const holder = new THREE.Group(), inner = new THREE.Group(); inner.add(m); m.position.set(0, 0, 0); m.updateMatrixWorld(true);
          const bb = new THREE.Box3().setFromObject(m), c = new V(); bb.getCenter(c); m.position.sub(c);
          holder.add(inner); holder.scale.setScalar(F);
          // 手のひらの上に、ひと山にのせる(まとまってはいない)
          const a = i * 2.4, rr = Math.sqrt(i / Math.max(1, n)) * 0.16;
          holder.position.set(Math.cos(a) * rr * 0.6 * F, Math.sin(a) * rr * F, (Math.random() - 0.5) * 0.1 * F);
          holder.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
          cluster.add(holder);
          const id = it.id === "eggwhole" ? "eggwhole" : it.id;
          items.push({ ch: it.ch, id, holder, inner, sq: 1, on: true, crack: false, v: new V(), w: new V(), rest: false });
        });
      }
      return this;
    },
    // 毎コマ: 手のひらの上の位置(x,y)と傾き(rot)。flying=投げている途中
    render(w, h, dt, s) {
      size(w, h); dt = Math.min(0.05, dt);
      cluster.position.set(s.x, -s.y, 0); cluster.rotation.set(0, 0, -s.rot);
      cluster.updateMatrixWorld(true);
      const side = s.side || 1; // 手のひらの向き(+1=右向き)
      if (liq) {
        // 液体: 手のひらに張りついた水たまり。量が減るほど小さく、ゆれる
        liq.wob *= Math.pow(0.02, dt); const k = Math.cbrt(Math.max(0.02, liq.vol)), R0 = F * 0.18 * k, wob = Math.sin(performance.now() / 45) * liq.wob;
        blob.scale.set(R0 * (0.45 - 0.2 * wob), R0 * (1 + 0.3 * wob), R0 * (0.9 + 0.2 * wob));
        blob.position.set(0, R0 * 0.25, 0);
        // 手からたれる(持っている間も少しずつこぼれる)
        dripT += dt; const iv = s.flying ? 0.03 : 0.16;
        while (dripT > iv && liq.vol > 0.03) {
          dripT -= iv; liq.vol -= s.flying ? 0.004 : 0.0025;
          const p = worldOf(blob).add(new V((Math.random() - 0.5) * R0 * 0.5, -R0 * 0.9, 0));
          spawn(p, new V((Math.random() - 0.5) * 30 + (s.vx || 0) * 0.5, -40 - Math.random() * 60, 0), F * (0.012 + Math.random() * 0.014), liq.col);
        }
      }
      // 手から落ちた具材(つなぎがないのでバラバラ): 重力で机へ
      for (const it of items) {
        if (it.on || it.rest) continue;
        it.v.y -= 2000 * dt; it.holder.position.addScaledVector(it.v, dt); it.holder.rotation.x += it.w.x * dt; it.holder.rotation.z += it.w.z * dt;
        if (it.holder.position.y < it.floor) { it.holder.position.y = it.floor; if (Math.abs(it.v.y) < 160) { it.rest = true; } else { it.v.y *= -0.3; it.v.x *= 0.5; it.w.multiplyScalar(0.5); } }
      }
      for (const d of drops) {
        if (d.dead || d.rest) continue;
        d.v.y -= 2000 * dt; d.p.addScaledVector(d.v, dt);
        if (d.p.y < d.floor) { d.p.y = d.floor; d.rest = true; if (d.kind === "drop") d.m.scale.set(d.r * 1.9, d.r * 0.32, d.r * 1.9); else d.m.rotation.set(0, d.m.rotation.y, 0); }
        if (d.p.x < -50 || d.p.x > W + 50) { d.dead = true; d.m.visible = false; }
        d.m.position.copy(d.p);
      }
      r.render(scene, cam);
      return r.domElement;
    },
    // 手のひらにペチッ: 液体は飛び散る / やわらかい物はつぶれて汁が飛ぶ / まとまっていないので落ちる物も
    slap(dirX = 1) {
      const out = { lost: 0, crushed: 0, cracked: false };
      if (liq) {
        const p0 = worldOf(blob), n = Math.round(10 + 22 * Math.min(1, liq.vol)), R0 = F * 0.18 * Math.cbrt(liq.vol);
        for (let i = 0; i < n; i++) { const a = (Math.random() - 0.5) * 2.6 + (dirX > 0 ? Math.PI : 0); spawn(p0.clone().add(new V((Math.random() - 0.5) * R0, (Math.random() - 0.5) * R0 * 1.6, 0)), new V(Math.cos(a) * (150 + Math.random() * 450) * 0.6, Math.sin(a) * 300 + 120 + Math.random() * 300, 0), F * (0.01 + Math.random() * 0.03), liq.col); }
        liq.vol *= 0.8; liq.wob = 1; out.lost = 0.2;
        return out;
      }
      const left = items.filter((x) => x.on);
      for (const it of left) {
        if (it.id === "eggwhole" && !it.crack) {
          // まるごとの卵: 手でたたくと殻が割れて、中身が飛び散る
          it.crack = true; out.cracked = true; it.inner.visible = false;
          const p = worldOf(it.holder);
          for (let i = 0; i < 9; i++) spawn(p.clone(), new V((Math.random() - 0.5) * 500, 200 + Math.random() * 350, 0), F * (0.03 + Math.random() * 0.03), [240, 225, 200], "shard");
          for (let i = 0; i < 16; i++) spawn(p.clone(), new V((Math.random() - 0.5) * 520, 100 + Math.random() * 400, 0), F * (0.012 + Math.random() * 0.03), i % 3 ? [250, 246, 232] : [255, 150, 20]);
          const yolk = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ color: lin(0xff8a0a), roughness: 0.1, clearcoat: 1 }));
          yolk.scale.set(F * 0.05, F * 0.035, F * 0.05); it.holder.add(yolk); it.holder.scale.setScalar(1); it.id = "yolk"; it.yolk = yolk;
          continue;
        }
        const [soft, col] = SOFT[it.id] || [0.1, [200, 180, 150]];
        if (soft > 0.05) {
          const before = it.sq; it.sq = Math.max(0.2, it.sq - soft * 0.3 * (0.7 + Math.random() * 0.6));
          // 手のひらに向かって押しつぶされる(横に広がる)
          const k = it.yolk ? 1 : F; const sp = Math.pow(it.sq, -0.35); it.inner.scale.set(it.sq, sp, sp); if (it.yolk) it.yolk.scale.set(F * 0.05 * it.sq, F * 0.035 * sp, F * 0.05 * sp);
          if (it.sq < 0.5 && before >= 0.5) out.crushed++;
          const p = worldOf(it.holder), nj = Math.round(soft * 7 * (before - it.sq + 0.1) * 4);
          for (let i = 0; i < nj; i++) spawn(p.clone(), new V((Math.random() - 0.5) * 420, 80 + Math.random() * 320, 0), F * (0.008 + Math.random() * 0.016), col);
          // つぶれた色: 汁が出て少し暗く
          it.inner.traverse((x) => { if (x.isMesh && x.material && x.material.color) x.material.color.multiplyScalar(0.97); });
        }
        // つなぎがないので、ペチッとするたびにこぼれ落ちる物がある(つぶれてベタベタの物は落ちにくい)
        if (left.filter((x) => x.on).length > 1 && Math.random() < 0.2 * (it.sq < 0.5 ? 0.4 : 1)) {
          it.on = false; out.lost++;
          const wp = worldOf(it.holder); cluster.remove(it.holder); scene.add(it.holder); it.holder.position.copy(wp);
          it.holder.scale.multiplyScalar(1);
          it.v.set((Math.random() - 0.5) * 300 + dirX * -80, 100 + Math.random() * 200, 0); it.w.set((Math.random() - 0.5) * 14, 0, (Math.random() - 0.5) * 14);
          it.floor = -(Toss3D.tableY + Math.random() * 40);
        }
      }
      return out;
    },
    // 結果: 液体の残り / 具材ごとのつぶれ具合・落ちたか
    result() { return { vol: liq ? liq.vol : 1, items: items.map((it) => ({ ch: it.ch, sq: it.sq, lost: !it.on, cracked: it.crack })) }; },
  };
})();
