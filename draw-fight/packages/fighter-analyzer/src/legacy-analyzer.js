/** R1-02: direct extracted legacy image processing + skeletal/mesh analysis.
 * Preserves original algorithm and shape behavior; detached from Three.js and game rules.
 * Canvas still runs on main thread: worker migration & boundary fixture testing pending.
 */
const TEX = 1024, MASK_RES = 512, ANA = 128;
const SEG_LEN = 9, SPUR = 5, RAY_N = 6, MIN_JOINTS = 3, RAY_COVER = 1.0;
const MAX_JOINTS = 48, GRID_N = 176, THICK_MAX = 0.45, INFLATE = 3.5, THICK_SMOOTH = 28;
const CHAR_H = 2.0;
const NB8 = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];

  function segDist(px, py, pz, ax, ay, az, bx, by, bz){
    const vx = bx - ax, vy = by - ay, vz = bz - az;
    const vv = vx*vx + vy*vy + vz*vz;
    let t = vv > 0 ? ((px-ax)*vx + (py-ay)*vy + (pz-az)*vz) / vv : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - ax - vx*t, py - ay - vy*t, pz - az - vz*t);
  }

  function dilate(m, W, H){
    const o = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
      if (!m[y * W + x]) continue;
      for (let dy = -1; dy <= 1; dy++){
        const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++){
          const xx = x + dx; if (xx < 0 || xx >= W) continue;
          o[yy * W + xx] = 1;
        }
      }
    }
    return o;
  }
  // 外周から壁を越えずに届く場所（4近傍で広げて、斜めのすき間から漏れないようにする）
  function outsideOf(bar, W, H){
    const out = new Uint8Array(W * H), q = new Int32Array(W * H);
    let h = 0, t = 0;
    const push = i => { if (!bar[i] && !out[i]){ out[i] = 1; q[t++] = i; } };
    for (let x = 0; x < W; x++){ push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++){ push(y * W); push(y * W + W - 1); }
    while (h < t){
      const i = q[h++], x = i % W, y = (i / W) | 0;
      if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
      if (y > 0) push(i - W); if (y < H - 1) push(i + W);
    }
    return out;
  }
  function makeTexture(src){
    const c = document.createElement('canvas'); c.width = c.height = TEX;
    const g = c.getContext('2d', { willReadFrequently:true });
    g.drawImage(src, 0, 0, TEX, TEX);
    const img = g.getImageData(0, 0, TEX, TEX), d = img.data, N = TEX * TEX;
    // 線で囲まれた内側の判定は半分の解像度で行う（境目は線の下に隠れるので粗くても見えない）
    const M = MASK_RES, mc = document.createElement('canvas'); mc.width = mc.height = M;
    const mg = mc.getContext('2d', { willReadFrequently:true });
    mg.drawImage(src, 0, 0, M, M);
    const md = mg.getImageData(0, 0, M, M).data, MN = M * M;
    mc.width = mc.height = 0;   // 使い終わったキャンバスはすぐ手放す（iPhoneのキャンバス用メモリ対策）
    const st = new Uint8Array(MN);
    for (let i = 0; i < MN; i++) st[i] = md[i * 4 + 3] > 40 ? 1 : 0;
    const bar = dilate(dilate(st, M, M), M, M);   // 線の小さなすき間をふさいでから内側を判定
    const out = outsideOf(bar, M, M);
    const inner = new Uint8Array(MN);
    for (let i = 0; i < MN; i++) inner[i] = (!out[i] && !bar[i]) ? 1 : 0;
    const fillM = dilate(inner, M, M), sc = M / TEX;
    for (let i = 0; i < N; i++){
      if (!fillM[((((i / TEX) | 0) * sc) | 0) * M + (((i % TEX) * sc) | 0)]) continue;
      const a = d[i * 4 + 3] / 255;
      d[i * 4]     = d[i * 4]     * a + 255 * (1 - a);
      d[i * 4 + 1] = d[i * 4 + 1] * a + 255 * (1 - a);
      d[i * 4 + 2] = d[i * 4 + 2] * a + 255 * (1 - a);
      d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // 表示用のテクスチャ：メッシュ自体が輪郭に沿うので透明度は使わない。
  // 縁で隣の透明な所の色（黒）が混ざらないよう、絵の色を外側へ広げてから不透明にする
  function displayTexture(tex){
    const W = tex.width, c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d');
    const src = tex.getContext('2d').getImageData(0, 0, W, W), d = src.data, N = W * W;
    let have = new Uint8Array(N);
    for (let i = 0; i < N; i++) have[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
    for (let pass = 0; pass < 4; pass++){
      const next = have.slice();
      for (let i = 0; i < N; i++){
        if (have[i]) continue;
        const x = i % W;
        let j = -1;
        if (x > 0 && have[i - 1]) j = i - 1;
        else if (x < W - 1 && have[i + 1]) j = i + 1;
        else if (i >= W && have[i - W]) j = i - W;
        else if (i < N - W && have[i + W]) j = i + W;
        if (j >= 0){ d[i*4] = d[j*4]; d[i*4+1] = d[j*4+1]; d[i*4+2] = d[j*4+2]; next[i] = 1; }
      }
      have = next;
    }
    for (let i = 0; i < N; i++) d[i * 4 + 3] = 255;
    g.putImageData(src, 0, 0);
    return c;
  }

  // ===== 自動ボーン入れ =====
  // Zhang-Suen 細線化：形の真ん中を通る1ピクセル幅の線（骨格）を取り出す
  function thin(m, W, H){
    const img = m.slice(), del = [];
    let changed = true;
    while (changed){
      changed = false;
      for (let pass = 0; pass < 2; pass++){
        del.length = 0;
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++){
          const i = y * W + x;
          if (!img[i]) continue;
          const p2 = img[i-W], p3 = img[i-W+1], p4 = img[i+1], p5 = img[i+W+1],
                p6 = img[i+W], p7 = img[i+W-1], p8 = img[i-1], p9 = img[i-W-1];
          const B = p2+p3+p4+p5+p6+p7+p8+p9;
          if (B < 2 || B > 6) continue;
          const A = (1-p2)*p3 + (1-p3)*p4 + (1-p4)*p5 + (1-p5)*p6 + (1-p6)*p7 + (1-p7)*p8 + (1-p8)*p9 + (1-p9)*p2;
          if (A !== 1) continue;
          if (pass === 0){ if (p2*p4*p6 || p4*p6*p8) continue; }
          else           { if (p2*p4*p8 || p2*p6*p8) continue; }
          del.push(i);
        }
        for (const i of del) img[i] = 0;
        if (del.length) changed = true;
      }
    }
    return img;
  }

  function analyze(tex){
    const W = ANA, H = ANA, N = W * H;
    const c = document.createElement('canvas'); c.width = c.height = ANA;
    const g = c.getContext('2d');
    g.drawImage(tex, 0, 0, ANA, ANA);
    const d = g.getImageData(0, 0, W, H).data;
    c.width = c.height = 0;   // 使い終わったキャンバスはすぐ手放す
    let m = new Uint8Array(N);
    for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] > 90 ? 1 : 0;
    m = dilate(m, W, H);                                  // 近い線どうしをつなぐ
    for (let x = 0; x < W; x++){ m[x] = 0; m[(H - 1) * W + x] = 0; }
    for (let y = 0; y < H; y++){ m[y * W] = 0; m[y * W + W - 1] = 0; }

    // 絵全体の範囲
    let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
    for (let i = 0; i < N; i++) if (m[i]){
      const x = i % W, y = (i / W) | 0;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
    }
    if (bx1 < 0) return null;

    // いちばん大きいかたまりだけで骨格を作る（離れた部分は近いボーンにくっつける）
    const comp = new Int32Array(N).fill(-1), q = new Int32Array(N);
    let best = -1, bestN = 0;
    for (let s = 0; s < N; s++){
      if (!m[s] || comp[s] >= 0) continue;
      let h = 0, t = 0; q[t++] = s; comp[s] = s;
      while (h < t){
        const i = q[h++], x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of NB8){
          const j = (y + dy) * W + x + dx;
          if (m[j] && comp[j] < 0){ comp[j] = s; q[t++] = j; }
        }
      }
      if (t > bestN){ bestN = t; best = s; }
    }
    const main = new Uint8Array(N);
    let sx = 0, sy = 0;
    for (let i = 0; i < N; i++) if (comp[i] === best){ main[i] = 1; sx += i % W; sy += (i / W) | 0; }
    const gx = sx / bestN, gy = sy / bestN;

    // 太さ（輪郭からの距離）：当たり判定の半径に使う
    const dist = new Int16Array(N).fill(-1);
    { let h = 0, t = 0;
      for (let i = 0; i < N; i++) if (!m[i]){ dist[i] = 0; q[t++] = i; }
      while (h < t){
        const i = q[h++], x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of NB8){
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (dist[j] < 0){ dist[j] = dist[i] + 1; q[t++] = j; }
        }
      }
    }

    // 骨格と根元（重心にいちばん近い骨格のピクセル）
    let sk = thin(main, W, H);
    let root = -1, rd = Infinity;
    for (let i = 0; i < N; i++) if (sk[i]){
      const dd = (i % W - gx) ** 2 + (((i / W) | 0) - gy) ** 2;
      if (dd < rd){ rd = dd; root = i; }
    }
    if (root < 0){
      for (let i = 0; i < N; i++) if (main[i]){
        const dd = (i % W - gx) ** 2 + (((i / W) | 0) - gy) ** 2;
        if (dd < rd){ rd = dd; root = i; }
      }
      sk = new Uint8Array(N); sk[root] = 1;
    }

    // 骨格を根元からたどって木にする（輪っかは自然に切れる）
    const par = new Int32Array(N).fill(-2), kids = new Array(N), order = [root];
    par[root] = -1;
    for (let h = 0; h < order.length; h++){
      const i = order[h], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of NB8){
        const j = (y + dy) * W + x + dx;
        if (sk[j] && par[j] === -2){ par[j] = i; order.push(j); (kids[i] || (kids[i] = [])).push(j); }
      }
    }
    const height = new Int32Array(N);
    for (let h = order.length - 1; h > 0; h--){
      const i = order[h];
      if (height[i] + 1 > height[par[i]]) height[par[i]] = height[i] + 1;
    }
    // 分かれ道の短い枝（細線化で出るヒゲ）だけ捨てる。塗った形の角へ伸びる枝も手足として残す
    // （どんな形でも動くことを優先し、形が崩れるのは遊びとして許容する）
    const keep = new Array(N);
    for (const i of order){
      const k = kids[i] || [];
      let r;
      if (k.length <= 1) r = k;
      else {
        r = k.filter(c2 => height[c2] + 1 >= SPUR);
        if (!r.length){ let b = k[0]; for (const c2 of k) if (height[c2] > height[b]) b = c2; r = [b]; }
      }
      keep[i] = r;
    }
    let total = 0;
    { const st = [root]; while (st.length){ const i = st.pop(); total++; for (const c2 of keep[i]) st.push(c2); } }
    const segLen = Math.max(SEG_LEN, Math.ceil(total / (MAX_JOINTS * 0.8)));

    // 骨格に沿って一定間隔・分かれ道・先端に関節を置く
    const J = [{ p:root, par:-1 }];
    const lab = new Int16Array(N).fill(-3);              // 各ピクセルがどのボーンに付くか（-2=根元に固定）
    const st = [[root, 0]];
    while (st.length){
      const [p0, j] = st.pop();
      for (const c2 of keep[p0]){
        let p = c2, len = 1; const path = [c2];
        while (keep[p].length === 1 && len < segLen){ p = keep[p][0]; len++; path.push(p); }
        if (keep[p].length === 0 && len < 3){ for (const qq of path) lab[qq] = j > 0 ? j : -2; continue; }
        const nj = J.length;
        J.push({ p, par:j });
        for (const qq of path) lab[qq] = nj;
        st.push([p, nj]);
      }
    }
    // 丸や点のように骨格がほぼ1点になる形は、中心から放射状にボーンを伸ばして動けるようにする
    if (J.length < MIN_JOINTS || total < Math.sqrt(bestN) * RAY_COVER){
      const rx0 = root % W + 0.5, ry0 = ((root / W) | 0) + 0.5;
      for (let k = 0; k < RAY_N; k++){
        const a = Math.PI / 2 + k * Math.PI * 2 / RAY_N;   // 真上から等間隔
        const dx = Math.cos(a), dy = -Math.sin(a), path = [];
        for (let t = 1; ; t++){   // 形の外に出るまで進む
          const x = Math.floor(rx0 + dx * t), y = Math.floor(ry0 + dy * t);
          if (x < 0 || y < 0 || x >= W || y >= H || !m[y * W + x]) break;
          const i = y * W + x;
          if (path[path.length - 1] !== i) path.push(i);
        }
        if (path.length < 2) continue;
        const step = Math.max(1, Math.min(segLen, Math.floor(path.length / 2)));   // 1本に関節を2つ以上置いて曲がるようにする
        let parent = 0, start = 0;
        for (let e = step - 1; e < path.length; e += step){
          const nj = J.length;
          J.push({ p:path[e], par:parent });
          for (let q = start; q <= e; q++) lab[path[q]] = nj;
          parent = nj; start = e + 1;
        }
      }
    }

    let firstChild = -2;
    for (let j = 1; j < J.length; j++) if (J[j].par === 0){ firstChild = j; break; }
    lab[root] = firstChild;

    // 絵の各ピクセルを、絵の中を通って近いボーンに割り当てる（腕と胴がくっつかないように）
    function grow(cond){
      let h = 0, t = 0;
      for (let i = 0; i < N; i++) if (lab[i] !== -3) q[t++] = i;
      while (h < t){
        const i = q[h++], x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of NB8){
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j2 = yy * W + xx;
          if (lab[j2] === -3 && cond(j2)){ lab[j2] = lab[i]; q[t++] = j2; }
        }
      }
    }
    grow(i => m[i] === 1);   // まず絵の中だけで広げる
    grow(() => true);         // 離れた部分や余白は近いものに付ける

    // 3D座標へ（足元を y=0、横の中心を x=0）
    const s = CHAR_H / Math.max(by1 - by0 + 1, (bx1 - bx0 + 1) * 0.7);
    const cx = (bx0 + bx1 + 1) / 2, base = by1 + 1;
    const toX = x => (x - cx) * s, toY = y => (base - y) * s;
    const joints = J.map(o => {
      const x = o.p % W, y = (o.p / W) | 0;
      return { x:toX(x + 0.5), y:toY(y + 0.5), par:o.par, rad:Math.max(dist[o.p], 1.5) * s };
    });

    // 変形用のメッシュ：絵の輪郭（不透明度0.5の線）にぴったり沿わせる（マーチングスクエア）
    // 格子で切り抜くと縁がガタガタになり、厚みを付けたときに側面が開くため、輪郭上に頂点を置いて厚さ0にする
    const TW = tex.width, A = tex.getContext('2d').getImageData(0, 0, TW, TW).data;
    const k4 = TW / ANA;
    const alphaAt = (X, Y) => {   // 解析座標での不透明度（0〜1、なめらかに補間）
      const fx = Math.max(0, Math.min(TW - 1.001, X * k4 - 0.5)), fy = Math.max(0, Math.min(TW - 1.001, Y * k4 - 0.5));
      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const a = (x, y) => A[((y * TW) + x) * 4 + 3];
      return ((a(ix, iy) * (1 - tx) + a(ix + 1, iy) * tx) * (1 - ty) + (a(ix, iy + 1) * (1 - tx) + a(ix + 1, iy + 1) * tx) * ty) / 255;
    };
    const ISO = 0.5;
    const span = Math.max(bx1 - bx0, by1 - by0) + 3;
    const stp = Math.max(0.48, span / GRID_N);
    const x0 = bx0 - 1, y0 = by0 - 1;
    const nx = Math.ceil((bx1 + 2 - x0) / stp) + 1, ny = Math.ceil((by1 + 2 - y0) / stp) + 1;
    const val = new Float32Array(nx * ny);
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) val[iy * nx + ix] = alphaAt(x0 + ix * stp, y0 + iy * stp);
    const VX = [], VY = [], onEdge = [];
    const cornerId = new Int32Array(nx * ny).fill(-1), hId = new Int32Array(nx * ny).fill(-1), vId = new Int32Array(nx * ny).fill(-1);
    const corner = (ix, iy) => {
      const g = iy * nx + ix;
      if (cornerId[g] < 0){ cornerId[g] = VX.length; VX.push(x0 + ix * stp); VY.push(y0 + iy * stp); onEdge.push(0); }
      return cornerId[g];
    };
    const cross = (ids, ax, ay, bx, by, horiz) => {   // 辺の上で不透明度がちょうど0.5になる点
      const g = ay * nx + ax;
      if (ids[g] < 0){
        const va = val[g], vb = val[by * nx + bx], t = Math.max(0, Math.min(1, (ISO - va) / ((vb - va) || 1e-6)));
        ids[g] = VX.length;
        VX.push(x0 + (ax + (bx - ax) * t) * stp); VY.push(y0 + (ay + (by - ay) * t) * stp); onEdge.push(1);
      }
      return ids[g];
    };
    const tris = [];
    for (let iy = 0; iy < ny - 1; iy++) for (let ix = 0; ix < nx - 1; ix++){
      const c = [[ix, iy], [ix + 1, iy], [ix + 1, iy + 1], [ix, iy + 1]];
      const inn = c.map(([x, y]) => val[y * nx + x] >= ISO);
      if (!inn[0] && !inn[1] && !inn[2] && !inn[3]) continue;
      const poly = [];
      for (let e = 0; e < 4; e++){   // 左上→上の辺→右上→右の辺→右下→下の辺→左下→左の辺 の順に一周
        const [cx, cy] = c[e], [dx, dy] = c[(e + 1) % 4];
        if (inn[e]) poly.push(corner(cx, cy));
        if (inn[e] !== inn[(e + 1) % 4]){
          if (e === 0) poly.push(cross(hId, ix, iy, ix + 1, iy));
          else if (e === 1) poly.push(cross(vId, ix + 1, iy, ix + 1, iy + 1));
          else if (e === 2) poly.push(cross(hId, ix, iy + 1, ix + 1, iy + 1));
          else poly.push(cross(vId, ix, iy, ix, iy + 1));
        }
      }
      for (let k = 1; k + 1 < poly.length; k++) tris.push(poly[0], poly[k], poly[k + 1]);
    }
    const nv = VX.length;
    const rx = new Float32Array(nv), ry = new Float32Array(nv), uv = new Float32Array(nv * 2), vlab = new Int16Array(nv);
    const clampI = v => Math.max(0, Math.min(ANA - 1, Math.floor(v)));
    for (let i = 0; i < nv; i++){
      rx[i] = toX(VX[i]); ry[i] = toY(VY[i]);
      uv[i * 2] = VX[i] / ANA; uv[i * 2 + 1] = 1 - VY[i] / ANA;
      vlab[i] = lab[clampI(VY[i]) * W + clampI(VX[i])];
    }
    // 表が手前（+z）を向くように三角形の向きをそろえる
    const index = [];
    for (let t = 0; t < tris.length; t += 3){
      const a = tris[t], b = tris[t + 1], c = tris[t + 2];
      const cr = (rx[b] - rx[a]) * (ry[c] - ry[a]) - (ry[b] - ry[a]) * (rx[c] - rx[a]);
      if (Math.abs(cr) < 1e-12) continue;
      if (cr > 0) index.push(a, b, c); else index.push(a, c, b);
    }
    // ふくらみの厚さ：輪郭からメッシュの上を何歩で届くか（格子の間隔を掛けて距離にする）。
    // 細かいばらつきは次のなめらか処理で消えるので、重い最短距離計算はしない
    const deg = new Int32Array(nv + 1);
    for (let t = 0; t < index.length; t++) deg[index[t] + 1] += 2;
    for (let i = 0; i < nv; i++) deg[i + 1] += deg[i];
    const adj = new Int32Array(deg[nv]), fill = deg.slice(0, nv);
    for (let t = 0; t < index.length; t += 3){
      const a = index[t], b = index[t + 1], c = index[t + 2];
      adj[fill[a]++] = b; adj[fill[a]++] = c; adj[fill[b]++] = a; adj[fill[b]++] = c; adj[fill[c]++] = a; adj[fill[c]++] = b;
    }
    const dd = new Float32Array(nv).fill(-1), qq = new Int32Array(nv);
    let qh = 0, qt = 0;
    for (let i = 0; i < nv; i++) if (onEdge[i]){ dd[i] = 0; qq[qt++] = i; }
    while (qh < qt){
      const v = qq[qh++];
      for (let k = deg[v]; k < deg[v + 1]; k++){ const w = adj[k]; if (dd[w] < 0){ dd[w] = dd[v] + stp; qq[qt++] = w; } }
    }
    // 輪郭のすぐ内側は格子の頂点ごとに距離がばらつき、平方根で厚さにすると縁がノコギリ状になるので、
    // 輪郭（0）を固定したまま周りの頂点と平均してなめらかにしてから厚さにする
    for (let i = 0; i < nv; i++) if (dd[i] < 0) dd[i] = 0;
    let cur = dd, nx2 = new Float32Array(nv);
    for (let it = 0; it < THICK_SMOOTH; it++){
      for (let i = 0; i < nv; i++){
        const n0 = deg[i], n1 = deg[i + 1];
        if (onEdge[i] || n0 === n1){ nx2[i] = 0; continue; }
        let sum = 0; for (let k = n0; k < n1; k++) sum += cur[adj[k]];
        nx2[i] = cur[i] * 0.5 + sum / (n1 - n0) * 0.5;
      }
      [cur, nx2] = [nx2, cur];
    }
    const thick = new Float32Array(nv);
    for (let i = 0; i < nv; i++) thick[i] = Math.min(THICK_MAX, INFLATE * Math.sqrt(cur[i]) * s);
    return { joints, rx, ry, uv, vlab, nv, index, tex, thick };
  }



export { makeTexture, analyze, thin, outsideOf };
/** Quantize visual data into a bounded battle input; full per-pixel data stays cosmetic. */
export function shapeFeatures(source, result){
  const d = source.getContext('2d', {willReadFrequently:true}).getImageData(0,0,source.width,source.height).data;
  let n=0,minX=source.width,minY=source.height,maxX=-1,maxY=-1;
  for(let y=0;y<source.height;y+=4)for(let x=0;x<source.width;x+=4){
    if(d[(y*source.width+x)*4+3]<=90) continue;
    n++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  if(n===0)throw new Error('絵が見つかりませんでした');
  const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY),area=Math.max(1,w*h/16);
  const joints=result.joints || [];
  const tipCount=new Array(joints.length).fill(0);
  for(const j of joints)if(j.par>=0)tipCount[j.par]++;
  const ends=joints.filter((j,i)=>i>0&&tipCount[i]===0);
  const ext=ends.length?Math.max(...ends.map(j=>Math.hypot(j.x-joints[0].x,j.y-joints[0].y))):0.5;
  const clamp=(v)=>Math.max(0,Math.min(1,v));
  return {
    mass:clamp((n/area - 0.12)/0.7),
    limbReach:clamp((ext-0.3)/1.6),
    limbCount:clamp(ends.length/8),
    slenderness:clamp(Math.abs(Math.log(w/h))/2),
  };
}
export async function drawingHash(canvas){
  const {data}=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height);
  const digest=await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
