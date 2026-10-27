// 指（妻の手・夫の手で同じ作り）: 立った形のうちに指の基準を覚え（captureFingers）、手の形を当てる（setFingers）。
// 手の形: curl（指の曲げ。数か [人差し, 中, 薬, 小]）・kn（付け根の節だけ曲げる。数か4つ）・tog（指を閉じる。1 を超えるとぴったり付ける）・
//         thumb（親指を人差し指に沿わせる）・topp（親指を手のひらの側へ倒す）・tcurl（親指の関節を曲げる）
// 持った物（や、触れる物）があれば、指はその物に当たった所で止まる（2026-10-25 オーナー「手とスマホ貫通してるでしょ」）:
//   付け根から先までを一緒に曲げていき、ある節が物に当たったら、そこから根元の側は止め、先の側だけ曲げ続ける（物を包むように止まる）。
//   物の形は、持つ所（grip）の子のうち userData.hit のある Mesh の形（箱・円柱・球・ろくろ形はその形、ほかは外箱）。
//   指の節は、皮膚の頂点から測った太さの棒（骨の中の座標。断面の中心は骨から手のひらの側へずれている）
import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const NAMES = ['index', 'middle', 'ring', 'pinky', 'thumb'];
const RATIO = [1.1, 1.5, 1.0]; // curl を付け根・中・先の節に分ける割合
const OPEN = -0.2, THUMB_OPEN = -0.4; // 物に当てる時に曲げ始める形（立った形の指は手のひらの側へ少し曲がっているので、少し反らせてまっすぐにした所から。親指は少し開いた所から）
const SKIN = 0.0005; // 物の面から皮膚までに残す隙間（m）
const STEPS = 6, HALVES = 4; // 曲げを何段に分けて当たりを見るか・当たった段を何回半分にして詰めるか

// b(名前): その側の骨（'index_01' など）。n: 手のひらの向き（世界）。meshes: 指の太さを測る皮膚（SkinnedMesh）
export function captureFingers(b, n, meshes) {
  const P = (o) => o.getWorldPosition(V());
  const Q = (o) => o.getWorldQuaternion(new THREE.Quaternion());
  const inv = (q) => q.clone().invert();
  const dirOf = (k) => P(b(`${k}_02`)).sub(P(b(`${k}_01`))).normalize();
  const toLocal = (bn, qw) => inv(Q(bn)).multiply(qw).multiply(Q(bn)); // 世界の回転を、その骨の中の回転に
  // 指を曲げる軸は指ごと（その指の向き×手のひらの向き）。全部の指で同じ軸にすると、人差し指と小指が曲げた時に横へずれる
  // 親指: 付け根で「人差し指に沿わせる」と「手のひらの側へ倒す（中指の付け根の前へ）」、2つ目と3つ目の関節で人差し指の側へ曲げる
  const thumb0 = P(b('thumb_01')), tdir = P(b('thumb_03')).sub(thumb0).normalize();
  const toIndex = P(b('index_01')).sub(thumb0);
  const thumbAxis = tdir.clone().cross(toIndex.addScaledVector(tdir, -toIndex.dot(tdir)).normalize()).normalize();
  const oppTo = P(b('middle_01')).lerp(P(b('middle_02')), 0.5).addScaledVector(n, 0.028).sub(thumb0).normalize();
  const caps = measure(b, meshes);
  return NAMES.map((k, fi) => ({
    k, fi,
    joints: [1, 2, 3].map((i) => {
      const bn = b(`${k}_0${i}`);
      // 付け根の骨だけ「閉じる」回転を持つ: 指は中指の向きへ、親指は人差し指の向きへ寄せる
      let close = null, opp = null;
      if (i === 1 && k === 'thumb') {
        close = toLocal(bn, new THREE.Quaternion().setFromUnitVectors(tdir, dirOf('index')));
        opp = toLocal(bn, new THREE.Quaternion().setFromUnitVectors(tdir, oppTo));
      } else if (i === 1 && k !== 'middle') close = toLocal(bn, new THREE.Quaternion().setFromUnitVectors(dirOf(k), dirOf('middle')));
      const ax = k === 'thumb' ? thumbAxis.clone() : dirOf(k).cross(n).normalize();
      return { bone: bn, rest: bn.quaternion.clone(), axis: ax.applyQuaternion(inv(Q(bn))), close, opp, cap: caps.get(bn) || null };
    }),
  }));
}

// 指の節ごとの棒: 皮膚の頂点のうち、その骨がいちばん重い（6割以上）頂点を骨の中の座標にし、節の真ん中あたりの断面の中心と半径を取る。
// 先の節は指先まで（頂点のいちばん先から半径を引いた所まで）。親指の付け根の節は手のひらの中なので棒を持たない
function measure(b, meshes) {
  const pts = new Map();
  for (const k of NAMES) for (const i of [1, 2, 3]) if (!(k === 'thumb' && i === 1)) pts.set(b(`${k}_0${i}`), []);
  const v = V();
  for (const m of meshes) {
    if (!m.isSkinnedMesh) continue;
    const { skinWeight: sw, skinIndex: si, position } = m.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      let best = -1, bw = 0;
      for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w > bw) { bw = w; best = si.getComponent(i, c); } }
      const list = bw >= 0.6 && pts.get(m.skeleton.bones[best]);
      if (!list) continue;
      m.getVertexPosition(i, v);
      list.push(v.clone().applyMatrix4(m.matrixWorld));
    }
  }
  const caps = new Map();
  for (const [bone, list] of pts) {
    const toBone = bone.matrixWorld.clone().invert();
    const loc = list.map((p) => p.applyMatrix4(toBone));
    const next = bone.children.find((c) => c.isBone);
    const len = next ? next.position.length() : 0;
    const mid = loc.filter((p) => (len ? p.y > len * 0.25 && p.y < len * 0.75 : p.y > 0.004 && p.y < 0.014));
    if (mid.length < 6) continue;
    const cx = mid.reduce((a, p) => a + p.x, 0) / mid.length, cz = mid.reduce((a, p) => a + p.z, 0) / mid.length;
    const rs = mid.map((p) => Math.hypot(p.x - cx, p.z - cz)).sort((x, y) => x - y);
    const r = rs[Math.floor(rs.length / 2)];
    const ys = loc.map((p) => p.y).sort((x, y) => x - y);
    const end = next ? next.position.y : Math.max(0.006, ys[Math.floor(ys.length * 0.99)] - r);
    // 付け根の側は少し空ける（関節のまわりは手のひらの皮膚と重なるので、当たりに数えない）
    const n = Math.ceil(end / 0.006) + 1;
    caps.set(bone, { a: V(cx, end * (next ? 0.3 : 0.2), cz), b: V(cx, end, cz), r, n });
  }
  return caps;
}

// ---------- 物の形（物の中の座標での、面からの距離。中は負）
const _t = V();
function sdBox(p, h) {
  const qx = Math.abs(p.x) - h.x, qy = Math.abs(p.y) - h.y, qz = Math.abs(p.z) - h.z;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
}
function sdRound(p, rAt, y0, y1) { // 軸が Y の回る形（高さで半径が変わる）。半径の傾きは小さいとみなす
  const dx = Math.hypot(p.x, p.z) - rAt(Math.min(y1, Math.max(y0, p.y))), dy = Math.max(y0 - p.y, p.y - y1);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
}
function makeSD(g) {
  const p = g.parameters || {};
  if (g.type === 'BoxGeometry') { const h = V(p.width / 2, p.height / 2, p.depth / 2); return (q) => sdBox(q, h); }
  if (g.type === 'SphereGeometry') return (q) => q.length() - p.radius;
  if (g.type === 'CylinderGeometry') {
    const hh = p.height / 2, r0 = p.radiusBottom, r1 = p.radiusTop;
    return (q) => sdRound(q, (y) => r0 + (r1 - r0) * (y + hh) / (2 * hh), -hh, hh);
  }
  if (g.type === 'LatheGeometry') { // 輪郭の線のうち、その高さでいちばん外の半径（中のくぼみは埋めて見る）
    const pts = p.points, y0 = Math.min(...pts.map((a) => a.y)), y1 = Math.max(...pts.map((a) => a.y));
    const N = 32, table = [];
    for (let i = 0; i <= N; i++) {
      const y = y0 + (y1 - y0) * i / N;
      let r = 0;
      for (let j = 0; j < pts.length - 1; j++) {
        const a = pts[j], c = pts[j + 1];
        if (y < Math.min(a.y, c.y) - 1e-6 || y > Math.max(a.y, c.y) + 1e-6) continue;
        r = Math.max(r, c.y === a.y ? Math.max(a.x, c.x) : a.x + (c.x - a.x) * (y - a.y) / (c.y - a.y));
      }
      table.push(r);
    }
    return (q) => sdRound(q, (y) => { const f = (y - y0) / (y1 - y0 || 1) * N, i = Math.min(N - 1, Math.max(0, Math.floor(f))); return table[i] + (table[i + 1] - table[i]) * (f - i); }, y0, y1);
  }
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(V()), h = g.boundingBox.getSize(V()).multiplyScalar(0.5);
  return (q) => sdBox(_t.copy(q).sub(c), h);
}
const shown = (o, top) => { for (let x = o; x && x !== top; x = x.parent) if (!x.visible) return false; return true; };
// 持つ所（grip）に付いている物と、extra（持たずに触れる、世界に置かれた物）の当たり。grip の親（手の骨）の世界の行列は新しいこと
export function gripHits(grip, out = [], extra = []) {
  out.length = 0;
  grip.updateMatrixWorld(true);
  const visit = (root, top) => root.traverse((o) => {
    if (!o.isMesh || !o.userData.hit || !shown(o, top)) return;
    const h = o.userData.hitShape || (o.userData.hitShape = { inv: new THREE.Matrix4(), sd: makeSD(o.geometry), k: 1 });
    h.inv.copy(o.matrixWorld).invert();
    _t.setFromMatrixScale(o.matrixWorld);
    h.k = Math.min(_t.x, _t.y, _t.z);
    out.push(h);
  });
  visit(grip, grip.parent);
  for (const e of extra) visit(e, e.parent);
  return out;
}

// ---------- 手の形を当てる
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _a = V(), _b = V(), _p = V();
const pick = (x, fi) => (typeof x === 'number' ? x : +(x?.[fi] ?? 0));
// 節 j を、曲げの割合 s（0〜1）の形にする
function poseJoint(ch, j, s, sh) {
  const J = ch.joints[j], q = J.bone.quaternion.copy(J.rest);
  if (ch.k === 'thumb') {
    if (j === 0) {
      const t1 = sh.thumb || 0, t0 = Math.min(t1, THUMB_OPEN);
      q.multiply(_q.copy(_qi).slerp(J.close, (t0 + (t1 - t0) * s) * 0.6));
      if (sh.topp) q.multiply(_q.copy(_qi).slerp(J.opp, sh.topp * s));
    } else q.multiply(_q.setFromAxisAngle(J.axis, (sh.tcurl || 0) * (j === 1 ? 0.55 : 0.85) * s));
    return;
  }
  if (j === 0 && J.close) q.multiply(_q.copy(_qi).slerp(J.close, (sh.tog || 0) * 0.8));
  const a = pick(sh.curl, ch.fi) * RATIO[j] + (j === 0 ? pick(sh.kn, ch.fi) : 0);
  const a0 = Math.min(a, OPEN * RATIO[j]);
  q.multiply(_q.setFromAxisAngle(J.axis, a0 + (a - a0) * s));
}
function fk(ch, from) {
  for (let j = from; j < 3; j++) {
    const bn = ch.joints[j].bone;
    bn.matrix.compose(bn.position, bn.quaternion, bn.scale);
    bn.matrixWorld.multiplyMatrices(bn.parent.matrixWorld, bn.matrix);
  }
}
// 節 from より先のどれかが物に当たっていれば、いちばん根元の側の節の番号（無ければ -1）
function touching(ch, from, hits) {
  for (let j = from; j < 3; j++) {
    const c = ch.joints[j].cap;
    if (!c) continue;
    const mw = ch.joints[j].bone.matrixWorld;
    _a.copy(c.a).applyMatrix4(mw);
    _b.copy(c.b).applyMatrix4(mw);
    for (const h of hits) {
      for (let i = 0; i < c.n; i++) {
        _p.lerpVectors(_a, _b, i / (c.n - 1)).applyMatrix4(h.inv);
        if (h.sd(_p) * h.k < c.r + SKIN) return j;
      }
    }
  }
  return -1;
}
function setAll(ch, from, s, sh) { for (let j = from; j < 3; j++) poseJoint(ch, j, s, sh); fk(ch, from); }
// fingers: captureFingers の返り値。sh: 手の形。hits: gripHits の返り値（無ければ形のまま）。blend: 前のコマの形からどれだけ寄せるか（1 で一気に）。
// 物がある時は、手の骨の世界の行列が新しいこと。物に当たる位置はコマごとに少し変わるので、blend を 1 未満にして指のぴくつきを消す
export function setFingers(fingers, sh, hits, blend = 1) {
  for (const ch of fingers) {
    solveFinger(ch, sh, hits);
    for (const J of ch.joints) {
      if (blend < 1 && J.last) J.bone.quaternion.copy(J.last.slerp(J.bone.quaternion, blend));
      J.last = (J.last || new THREE.Quaternion()).copy(J.bone.quaternion);
    }
  }
}
function solveFinger(ch, sh, hits) {
  {
    if (!hits || !hits.length) { for (let j = 0; j < 3; j++) poseJoint(ch, j, 1, sh); return; }
    setAll(ch, 0, 1, sh);
    if (touching(ch, 0, hits) < 0) return; // 決めた形のままで物に当たらない
    setAll(ch, 0, 0, sh);
    if (touching(ch, 0, hits) >= 0) { setAll(ch, 0, 1, sh); return; } // 伸ばしても当たる（物が指の付け根にある）なら、決めた形にしておく
    let from = 0, cur = 0;
    while (from < 3) {
      let lo = cur, hi = -1, hit = -1;
      for (let k = 1; k <= STEPS; k++) {
        const s = cur + (1 - cur) * k / STEPS;
        setAll(ch, from, s, sh);
        hit = touching(ch, from, hits);
        if (hit >= 0) { hi = s; break; }
        lo = s;
      }
      if (hit < 0) break; // 先まで曲げ切った
      for (let i = 0; i < HALVES; i++) {
        const m = (lo + hi) / 2;
        setAll(ch, from, m, sh);
        const h = touching(ch, from, hits);
        if (h >= 0) { hi = m; hit = h; } else lo = m;
      }
      setAll(ch, from, lo, sh); // 当たる手前で止める
      from = hit + 1;
      cur = lo;
    }
  }
}
