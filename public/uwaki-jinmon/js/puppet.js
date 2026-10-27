// 夫の腕（終わりの後の場面）: 縛りを解いた腕を前に出し、手首・手のひら・指を決める（肩と肘の2本の骨の IK と手首）。
// 腕の基準（立った形）は、読み込んですぐ・座った形を当てる前に captureArms() で覚える（husband.js）。
// 解く時は、いまの鎖骨の向きに合わせて基準を回す（背中を丸めても、肩から先は同じ決まりで動く）。
// 前腕をねじる骨が無いので、手首を返す分は半分を前腕に、残りを手首に持たせる。
// 動き（clip）は右手 r・左手 l・合図 ev。腕のキーは wife.js と同じ書き方で、位置と向きは夫の体の [右, 上, 前]:
//   { t, at: 'body'（肩）|目印の名前, p, palm: 手のひらの真ん中を p へ, tip: 持った物の一点（持つ所の軸で）を p へ, g, n, pole, 手の形（curl・kn・tog・thumb・topp・tcurl。hand.js）, ease }
//   n の代わりに tdir（親指の向き）でもよい: 指の向きと親指の向きから手のひらの向きを決める（箸を持つ手など）
//   合図: { t, name, freeze: [目印…] }。動きが終わっても、最後のキーの形を保つ。持った物に userData.hit があると、指はその物に当たった所で止まる（hand.js）。
//   持たずに触れる物（反対の手の茶碗など）は touch(側, [物…]) で足す（stop() まで残る）
import * as THREE from 'three';
import { basisRot, twistAbout } from './wife.js';
import { captureFingers, setFingers, gripHits } from './hand.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const EASE = { lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), inout: (u) => u * u * (3 - 2 * u) };
const lerp = (a, b, u) => a + (b - a) * u;
const lerpCurl = (a, b, u) => (typeof a === 'number' && typeof b === 'number' ? lerp(a, b, u) : [0, 1, 2, 3].map((i) => lerp(+(a[i] ?? a), +(b[i] ?? b), u)));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const TWIST_FOREARM = 0.5; // 手首を返す分のうち前腕が受け持つ割合

// 立った形のうちに、腕と指の基準を覚える（模型は原点・回転なしのこと。世界の値＝模型の中の値）
export function captureArms(root, bones) {
  root.updateMatrixWorld(true);
  const skins = [];
  root.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); }); // 指の太さを測る
  const P = (o) => o.getWorldPosition(V());
  const Q = (o) => o.getWorldQuaternion(new THREE.Quaternion());
  const inv = (q) => q.clone().invert();
  const out = {};
  for (const s of ['r', 'l']) {
    const b = (n) => bones[`${n}_${s}`];
    const B = { clav: b('clavicle'), ua: b('upperarm'), la: b('lowerarm'), hand: b('hand') };
    const S0 = P(B.ua), E0 = P(B.la), W0 = P(B.hand);
    const a = E0.clone().sub(S0).normalize(), f = W0.clone().sub(E0).normalize();
    const bend = f.clone().addScaledVector(a, -f.dot(a));
    if (bend.lengthSq() < 1e-6) bend.set(0, 0, 1).addScaledVector(a, -a.z); // まっすぐ伸びていたら前へ曲がることにする
    bend.normalize();
    const kn = ['index', 'middle', 'ring', 'pinky'].map((k) => P(b(`${k}_01`)));
    const g = kn[1].clone().sub(W0).normalize();
    const across = kn[0].clone().sub(kn[3]);
    const n = s === 'r' ? across.clone().cross(g) : g.clone().cross(across);
    n.addScaledVector(g, -n.dot(g)).normalize();
    const q = { clav: Q(B.clav), ua: Q(B.ua), la: Q(B.la), hand: Q(B.hand) };
    const fingers = captureFingers(b, n, skins);
    // 手のひらの真ん中（手首と指の付け根の間を少し手のひらの側へ）。持つ所の軸は X＝g×n・Y＝指の向き・Z＝手のひらの向き
    const palmOff = W0.clone().lerp(kn[1].clone().lerp(kn[2], 0.3), 0.55).addScaledVector(n, 0.012).sub(W0).applyQuaternion(inv(q.hand));
    const gL = g.clone().applyQuaternion(inv(q.hand)), nL = n.clone().applyQuaternion(inv(q.hand));
    const grip = new THREE.Group();
    grip.name = `grip_${s}`;
    grip.position.copy(palmOff);
    grip.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(gL.clone().cross(nL), gL, nL));
    B.hand.add(grip);
    out[s] = { s, B, L1: S0.distanceTo(E0), L2: E0.distanceTo(W0), a, f, bend, g, n, q, fingers, palmOff, grip, hits: [], extra: [], relLH: inv(q.la).multiply(q.hand) };
  }
  return out;
}

const setLocal = (bone, qWorld, qParent) => bone.quaternion.copy(qParent).invert().multiply(qWorld);
const _q = new THREE.Quaternion();

// 手首 W・手の向き qH・肘の出る向き pole（すべて世界）から腕の骨を決める。届く割合を返す
function solve(A, W, qH, pole) {
  const Qc = A.B.clav.getWorldQuaternion(new THREE.Quaternion());
  const D = Qc.clone().multiply(_q.copy(A.q.clav).invert()); // 立った形からの、鎖骨の回り
  const S = A.B.ua.getWorldPosition(V());
  const a = A.a.clone().applyQuaternion(D), bend = A.bend.clone().applyQuaternion(D), f = A.f.clone().applyQuaternion(D);
  const d = W.clone().sub(S);
  const dist = THREE.MathUtils.clamp(d.length(), Math.abs(A.L1 - A.L2) + 0.02, (A.L1 + A.L2) * 0.985);
  d.normalize();
  const Wc = S.clone().addScaledVector(d, dist);
  const cosA = (A.L1 * A.L1 + dist * dist - A.L2 * A.L2) / (2 * A.L1 * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const pv = pole.clone().addScaledVector(d, -pole.dot(d));
  if (pv.lengthSq() < 1e-6) pv.set(0, -1, 0).addScaledVector(d, d.y);
  pv.normalize();
  const E = S.clone().addScaledVector(d, A.L1 * cosA).addScaledVector(pv, A.L1 * sinA);
  const u = E.clone().sub(S).normalize();
  const v = Wc.clone().sub(E).normalize();
  const bn = v.clone().addScaledVector(u, -v.dot(u)).normalize();
  const Ru = basisRot(a, bend, u, bn);
  const qUA = Ru.clone().multiply(D).multiply(A.q.ua);
  let qLA = new THREE.Quaternion().setFromUnitVectors(f.clone().applyQuaternion(Ru), v).multiply(Ru).multiply(D).multiply(A.q.la);
  const follow = qLA.clone().multiply(A.relLH);
  const tau = twistAbout(qH.clone().multiply(follow.invert()), v);
  qLA = new THREE.Quaternion().setFromAxisAngle(v, tau * TWIST_FOREARM).multiply(qLA);
  setLocal(A.B.ua, qUA, Qc);
  setLocal(A.B.la, qLA, qUA);
  setLocal(A.B.hand, qH, qLA);
  return dist / (A.L1 + A.L2);
}
// 骨を世界の向き dir へ向ける（いちばん小さい回転。骨は自分の Y の向きに伸びている）
export function aimBone(bone, dir) {
  bone.updateWorldMatrix(true, false);
  const qw = bone.getWorldQuaternion(new THREE.Quaternion());
  const now = V(0, 1, 0).applyQuaternion(qw);
  const qp = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  setLocal(bone, new THREE.Quaternion().setFromUnitVectors(now, dir.clone().normalize()).multiply(qw), qp);
  bone.updateMatrixWorld(true);
}

// 夫の手の動きを再生する。update(dt) は夫の頭と背中（H.update）の後に呼ぶ
export function makePuppet(H, arms) {
  let clip = null;
  const state = { reach: { r: 0, l: 0 } };
  const tracks = (c) => ['r', 'l'].filter((s) => c[s]);
  const lastT = (c) => Math.max(...tracks(c).map((s) => c[s][c[s].length - 1].t), ...(c.ev || []).map((e) => e.t), 0);
  function play(def, { targets = {}, onEvent } = {}) {
    if (clip && !clip.done) clip.resolve();
    return new Promise((resolve) => {
      clip = { ...def, t: 0, dur: lastT(def), targets, frozen: {}, fired: new Set(), onEvent, resolve, done: false };
      update(0);
    });
  }
  function segment(keys, t) {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)];
    const u = (EASE[k1.ease] || EASE.inout)(clamp01((t - k0.t) / Math.max(1e-6, k1.t - k0.t)));
    return [k0, k1, u];
  }
  function update(dt) {
    const c = clip;
    if (!c) return;
    c.t += dt;
    for (const e of c.ev || []) {
      if (c.t >= e.t && !c.fired.has(e)) {
        c.fired.add(e);
        for (const n of e.freeze || []) if (c.targets[n]) c.frozen[n] = c.targets[n]().clone();
        c.onEvent?.(e.name);
        if (clip !== c) return;
      }
    }
    // 夫の体の軸（模型は +Z を向き、本人の右は -X）
    H.root.updateMatrixWorld(true);
    const qr = H.root.getWorldQuaternion(new THREE.Quaternion());
    const R = V(-1, 0, 0).applyQuaternion(qr), U = V(0, 1, 0).applyQuaternion(qr), F = V(0, 0, 1).applyQuaternion(qr);
    const ax = (a) => V().addScaledVector(R, a[0]).addScaledVector(U, a[1]).addScaledVector(F, a[2]);
    for (const s of tracks(c)) {
      const A = arms[s];
      const S = A.B.ua.getWorldPosition(V());
      const keyPose = (k) => {
        const gW = ax(k.g).normalize();
        let nW;
        if (k.tdir) { const tW = ax(k.tdir); nW = (s === 'r' ? tW.cross(gW) : gW.clone().cross(tW)).normalize(); } // 右手は X（親指の側）＝ g×n なので n＝親指×g
        else nW = ax(k.n).normalize();
        gW.addScaledVector(nW, -nW.dot(gW)).normalize();
        const qH = basisRot(A.g, A.n, gW, nW).multiply(A.q.hand);
        const origin = !k.at || k.at === 'body' ? S.clone() : (c.frozen[k.at] || c.targets[k.at]?.() || S).clone();
        const P0 = origin.add(ax(k.p || [0, 0, 0]));
        if (k.palm || k.tip) {
          const off = A.palmOff.clone();
          if (k.tip) off.add(V(...k.tip).applyQuaternion(A.grip.quaternion));
          P0.sub(off.applyQuaternion(qH));
        }
        return { W: P0, qH, pole: ax(k.pole || [0, -1, 0]).normalize(), curl: k.curl ?? 0, kn: k.kn ?? 0, tog: k.tog ?? 0, thumb: k.thumb ?? 0, topp: k.topp ?? 0, tcurl: k.tcurl ?? 0 };
      };
      const [k0, k1, u] = segment(c[s], Math.max(c.t, c[s][0].t));
      const p0 = keyPose(k0), p1 = keyPose(k1);
      // 手首は肩を中心に弧を描いて動く
      const r0 = p0.W.clone().sub(S), r1 = p1.W.clone().sub(S);
      const len = lerp(r0.length(), r1.length(), u);
      const dir = r0.normalize().applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(r0, r1.normalize()), u));
      state.reach[s] = solve(A, S.clone().addScaledVector(dir, len), p0.qH.clone().slerp(p1.qH, u), p0.pole.clone().lerp(p1.pole, u).normalize());
      A.B.hand.updateWorldMatrix(true, false);
      setFingers(A.fingers, {
        curl: lerpCurl(p0.curl, p1.curl, u), kn: lerpCurl(p0.kn, p1.kn, u), tog: lerp(p0.tog, p1.tog, u),
        thumb: lerp(p0.thumb, p1.thumb, u), topp: lerp(p0.topp, p1.topp, u), tcurl: lerp(p0.tcurl, p1.tcurl, u),
      }, gripHits(A.grip, A.hits, A.extra), Math.min(1, dt * 22));
    }
    if (c.t >= c.dur && !c.done) { c.done = true; c.resolve(); }
  }
  const stop = () => { if (clip && !clip.done) clip.resolve(); clip = null; for (const s of ['r', 'l']) arms[s].extra = []; };
  const touch = (s, objs = []) => { arms[s].extra = objs; };
  return { play, update, stop, touch, arms, grip: (s) => arms[s].grip, get reach() { return state.reach; }, get time() { return clip ? clip.t : 0; } };
}
