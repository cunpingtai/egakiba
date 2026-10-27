// 妻の腕（妻の目線なので、画面に出すのは腕だけ）: GLB を読み、体をカメラ（妻の目）の位置に合わせ、
// 「手首をどこへ・手のひらと指をどちらへ・肘をどちらへ」から腕の骨を決める（肩と肘の2本の骨の IK・前腕のねじり・手首）。
// 動き（clip）は右腕・左腕・体（カメラの立ち位置とひねり）のキーと、合図（ev）を持つ。動きの中身は clips.js。
//   腕のキー: { t, at: 'body'|目印の名前, p: [右, 上, 前]（m）, palm: 手のひらの真ん中の位置なら true, tip: 持った物の一点をその位置へ, g: 指の向き, n: 手のひらの向き（n を優先）,
//             pole: 肘の出る向き, 手の形（curl・kn・tog・thumb・topp・tcurl。中身は hand.js）, shake: 震え（m）, ease, hide }
//   持った物（持つ所 grip の子）に userData.hit があると、指はその物に当たった所で止まる（hand.js）。持たずに触れる物は touch(側, [物…]) で足す
//   体のキー: { t, view: カメラの立ち位置の名前, twist: 体のひねり（左へ +）, ease }。立ち位置の中身は main.js
//   合図: { t, name, freeze: [目印…] }（freeze はその時の位置で止める）。キーに wait: true があると、release() まで そこで止まる
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { SKIN_DIFFUSE } from './husband.js';
import { captureFingers, setFingers, gripHits } from './hand.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// 体の軸（模型の中で一定）: 本人の右・上・前。模型は +Z を向いていて、本人の右は -X
const AX = { r: V(-1, 0, 0), u: V(0, 1, 0), f: V(0, 0, 1) };
const ruf = (a) => V().addScaledVector(AX.r, a[0]).addScaledVector(AX.u, a[1]).addScaledVector(AX.f, a[2]);
const EASE = { lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), inout: (u) => u * u * (3 - 2 * u) };
const lerp = (a, b, u) => a + (b - a) * u;
const lerpCurl = (a, b, u) => (typeof a === 'number' && typeof b === 'number' ? lerp(a, b, u) : [0, 1, 2, 3].map((i) => lerp(+(a[i] ?? a), +(b[i] ?? b), u)));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// 向きの組 (a1, b1) を (a2, b2) に重ねる回転（どちらも直交する単位ベクトル）。夫の腕（puppet.js）でも使う
export function basisRot(a1, b1, a2, b2) {
  const m1 = new THREE.Matrix4().makeBasis(a1, b1, a1.clone().cross(b1));
  const m2 = new THREE.Matrix4().makeBasis(a2, b2, a2.clone().cross(b2));
  return new THREE.Quaternion().setFromRotationMatrix(m2.multiply(m1.transpose()));
}
// 回転 q のうち、axis まわりのねじりの角度
export function twistAbout(q, axis) {
  let t = 2 * Math.atan2(q.x * axis.x + q.y * axis.y + q.z * axis.z, q.w);
  if (t > Math.PI) t -= 2 * Math.PI;
  if (t < -Math.PI) t += 2 * Math.PI;
  return t;
}
const setLocal = (bone, qModel, qParent) => bone.quaternion.copy(qParent).invert().multiply(qModel);
// 左腕のキーは右腕のキーを左右に映して作る
export const mirror = (k) => ({ ...k, ...Object.fromEntries(['p', 'g', 'n', 'pole'].filter((x) => k[x]).map((x) => [x, [-k[x][0], k[x][1], k[x][2]]])) });

// model は問い詰める側の腕の模型の名前（wife: 妻の腕。hands_m: 女性浮気版の夫の腕。2026-10-26）
export async function loadWife(scene, { envTex, model: glb = 'wife' } = {}) {
  const [gltf, pores] = await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`./assets/${glb}.glb`),
    new THREE.TextureLoader().loadAsync('./assets/skin_pores_normal.webp'),
  ]);
  const model = gltf.scene;
  scene.add(model);
  pores.wrapS = pores.wrapT = THREE.RepeatWrapping;
  pores.repeat.set(24, 24);
  const bones = {}, marks = {}, meshes = { r: [], l: [] };
  model.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (/^(palm_[lr]|eye_point)$/.test(o.name)) marks[o.name] = o;
    if (!o.isMesh) return;
    const m = o.material;
    m.transparent = false; // 書き出しは BLEND になっているので直す
    m.depthWrite = true;
    if (/body/.test(m.name)) {
      m.side = THREE.FrontSide;
      m.normalMap = pores;
      m.normalScale.set(0.3, 0.3);
      m.roughness = 0.5;
      m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', SKIN_DIFFUSE); };
    } else if (/ring/.test(m.name)) {
      if (envTex) m.envMap = envTex;
      m.envMapIntensity = 0.5;
      m.roughness = 0.35;
    } else {
      m.side = THREE.DoubleSide; // 袖口の内側も見える
      m.roughness = 0.9;
    }
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    o.visible = false;
    meshes[/_r$/.test(o.name) ? 'r' : 'l'].push(o); // 指輪は左手
  });
  model.updateMatrixWorld(true);
  // ---------- 立った形（骨の基準）での寸法と向き。模型はまだ原点なので、世界の値＝模型の中の値
  const P = (o) => o.getWorldPosition(V());
  const Q = (o) => o.getWorldQuaternion(new THREE.Quaternion());
  const inv = (q) => q.clone().invert();
  const eyeM = P(marks.eye_point);
  function restArm(s) {
    const b = (n) => bones[`${n}_${s}`];
    const B = { clav: b('clavicle'), ua: b('upperarm'), la: b('lowerarm'), tw: b('lowerarm_twist'), hand: b('hand') };
    const S0 = P(B.ua), E0 = P(B.la), W0 = P(B.hand);
    const a = E0.clone().sub(S0).normalize(), f = W0.clone().sub(E0).normalize();
    const bend = f.clone().addScaledVector(a, -f.dot(a)).normalize(); // 肘が曲がる向き（立った形でも少し前へ曲がっている）
    const kn = ['index', 'middle', 'ring', 'pinky'].map((k) => P(b(`${k}_01`)));
    const g = kn[1].clone().sub(W0).normalize(); // 指の向き（中指の付け根へ）
    const across = kn[0].clone().sub(kn[3]);
    const n = s === 'r' ? across.clone().cross(g) : g.clone().cross(across); // 手のひらの向き
    n.addScaledVector(g, -n.dot(g)).normalize();
    const q = { clav: Q(B.clav), ua: Q(B.ua), la: Q(B.la), tw: Q(B.tw), hand: Q(B.hand) };
    const fingers = captureFingers(b, n, meshes[s]);
    const palmOff = P(marks[`palm_${s}`]).sub(W0).applyQuaternion(inv(q.hand)); // 手首から手のひらの真ん中（手の骨の中で）
    // 持つ物を付ける所: 手のひらの真ん中。軸は X＝g×n（右手は親指の側・左手は小指の側）・Y＝指の向き・Z＝手のひらの向き
    const gL = g.clone().applyQuaternion(inv(q.hand)), nL = n.clone().applyQuaternion(inv(q.hand));
    const grip = new THREE.Group();
    grip.name = `grip_${s}`;
    grip.position.copy(palmOff);
    grip.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(gL.clone().cross(nL), gL, nL));
    B.hand.add(grip);
    return {
      s, B, S0, L1: S0.distanceTo(E0), L2: E0.distanceTo(W0), a, f, bend, g, n, q, fingers, palmOff, grip, hits: [], extra: [],
      relLH: inv(q.la).multiply(q.hand), relLT: inv(q.la).multiply(q.tw), meshes: meshes[s],
    };
  }
  const ARMS = { r: restArm('r'), l: restArm('l') };
  // 指輪を指に合わせる: 書き出しでは薬指の骨（手の甲の側に寄っている）を中心にしていて、輪の上半分が指から浮いて見えた。
  // 手のひらの側へ寄せ、少し小さくして指にそわせる（量は撮って決めた）
  model.traverse((o) => {
    if (!o.isMesh || !/ring/.test(o.material.name)) return;
    const qb = o.parent.getWorldQuaternion(new THREE.Quaternion());
    o.position.addScaledVector(ARMS.l.n.clone().applyQuaternion(qb.invert()), 0.0055);
    o.scale.multiplyScalar(0.86);
  });

  // ---------- 腕を決める（すべて模型の中の座標）
  function solve(A, W, qH, pole) {
    const d = W.clone().sub(A.S0);
    const dist = THREE.MathUtils.clamp(d.length(), Math.abs(A.L1 - A.L2) + 0.02, (A.L1 + A.L2) * 0.985);
    d.normalize();
    const Wc = A.S0.clone().addScaledVector(d, dist);
    const cosA = (A.L1 * A.L1 + dist * dist - A.L2 * A.L2) / (2 * A.L1 * dist);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const pv = pole.clone().addScaledVector(d, -pole.dot(d));
    if (pv.lengthSq() < 1e-6) pv.set(0, -1, 0).addScaledVector(d, d.y);
    pv.normalize();
    const E = A.S0.clone().addScaledVector(d, A.L1 * cosA).addScaledVector(pv, A.L1 * sinA);
    const u = E.clone().sub(A.S0).normalize();
    const v = Wc.clone().sub(E).normalize();
    const bn = v.clone().addScaledVector(u, -v.dot(u)).normalize();
    const Ru = basisRot(A.a, A.bend, u, bn);
    const qUA = Ru.clone().multiply(A.q.ua);
    const qLA = new THREE.Quaternion().setFromUnitVectors(A.f.clone().applyQuaternion(Ru), v).multiply(Ru).multiply(A.q.la); // 肘は曲げるだけ
    // 手首を返す分（前腕の軸まわり）は、ねじりの骨が手首の側だけで受け持つ
    const follow = qLA.clone().multiply(A.relLH);
    const tau = twistAbout(qH.clone().multiply(follow.invert()), v);
    const qTW = new THREE.Quaternion().setFromAxisAngle(v, tau).multiply(qLA).multiply(A.relLT);
    setLocal(A.B.ua, qUA, A.q.clav);
    setLocal(A.B.la, qLA, qUA);
    setLocal(A.B.tw, qTW, qLA);
    setLocal(A.B.hand, qH, qLA);
    return dist / (A.L1 + A.L2);
  }
  // ---------- 再生
  let clip = null;
  const state = { view: null, twist: 0, reach: { r: 0, l: 0 }, dt: 1 / 60 };
  const tracks = (c) => ['r', 'l'].filter((s) => c[s]);
  const lastT = (c) => Math.max(...tracks(c).map((s) => c[s][c[s].length - 1].t), ...(c.body ? [c.body[c.body.length - 1].t] : [0]), ...(c.ev || []).map((e) => e.t));
  function end(c, cut) {
    for (const s of tracks(c)) {
      if (cut || c[s][c[s].length - 1].hide) ARMS[s].meshes.forEach((m) => { m.visible = false; });
      ARMS[s].extra = [];
    }
    state.view = null;
    state.twist = 0;
    if (clip === c) clip = null;
    c.resolve();
  }
  // def: clips.js の動き。targets: { 名前: () => 世界の位置 }。onEvent(名前): 合図
  function play(def, { targets = {}, onEvent } = {}) {
    if (clip) end(clip, true);
    return new Promise((resolve) => {
      const c = { ...def, t: 0, dur: lastT(def), targets, frozen: {}, fired: new Set(), onEvent, resolve, released: false };
      c.waits = [...tracks(def).flatMap((s) => def[s]), ...(def.body || [])].filter((k) => k.wait).map((k) => k.t).sort((a, b) => a - b);
      for (const s of ['r', 'l']) ARMS[s].meshes.forEach((m) => { m.visible = !!def[s]; });
      clip = c;
      advance(0);
    });
  }
  const release = () => { if (clip) clip.released = true; };
  const stop = () => { if (clip) end(clip, true); }; // 動きを切って腕を消す
  const touch = (s, objs = []) => { ARMS[s].extra = objs; }; // 持たずに触れる物（テーブルの上の湯呑みなど）。動きが終わると外れる。play() の後に呼ぶ

  function segment(keys, t) {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)];
    const u = (EASE[k1.ease] || EASE.inout)(clamp01((t - k0.t) / Math.max(1e-6, k1.t - k0.t)));
    return [k0, k1, u];
  }
  // 時間を進め、合図を出し、カメラの立ち位置と体のひねりを決める（腕はまだ）
  function advance(dt) {
    const c = clip;
    if (!c) return;
    state.dt = dt;
    let t = c.t + dt;
    if (!c.released) for (const w of c.waits) if (c.t <= w && t > w) { t = w; break; }
    c.t = t;
    for (const e of c.ev || []) {
      if (t >= e.t && !c.fired.has(e)) {
        c.fired.add(e);
        for (const n of e.freeze || []) if (c.targets[n]) c.frozen[n] = c.targets[n]().clone();
        c.onEvent?.(e.name);
        if (clip !== c) return; // 合図の中で別の動きが始まった
      }
    }
    if (c.body) {
      const [k0, k1, u] = segment(c.body, t);
      state.view = { a: k0.view || 'base', b: k1.view || 'base', u };
      state.twist = lerp(k0.twist ?? 0, k1.twist ?? 0, u);
    } else state.view = null;
  }

  const camDir = V();
  function keyPose(A, k, c) {
    const nM = ruf(k.n).normalize();
    const gM = ruf(k.g);
    gM.addScaledVector(nM, -nM.dot(gM)).normalize();
    const qH = basisRot(A.g, A.n, gM, nM).multiply(A.q.hand);
    let origin = A.S0;
    if (k.at && k.at !== 'body') {
      const w = c.frozen[k.at] || c.targets[k.at]?.();
      if (w) origin = model.worldToLocal(w.clone());
    }
    const P0 = origin.clone().add(ruf(k.p || [0, 0, 0]));
    // palm: 手のひらの真ん中を P0 へ。tip: 持った物の一点（持つ所の軸で [X, Y, Z]）を P0 へ
    const off = k.palm || k.tip ? A.palmOff.clone() : null;
    if (k.tip) off.add(V(...k.tip).applyQuaternion(A.grip.quaternion));
    const W = off ? P0.sub(off.applyQuaternion(qH)) : P0;
    return { W, qH, pole: ruf(k.pole).normalize(), curl: k.curl ?? 0, kn: k.kn ?? 0, tog: k.tog ?? 0, thumb: k.thumb ?? 0, topp: k.topp ?? 0, tcurl: k.tcurl ?? 0, shake: k.shake ?? 0 };
  }
  // 体をカメラ（妻の目）に合わせ、腕のキーを補間して骨を決める。動きが終わったら片付ける
  function pose(eyePos, lookPos) {
    const c = clip;
    if (!c) return;
    camDir.subVectors(lookPos, eyePos);
    model.quaternion.setFromAxisAngle(AX.u, Math.atan2(camDir.x, camDir.z) + state.twist);
    model.position.copy(eyePos).sub(eyeM.clone().applyQuaternion(model.quaternion));
    model.updateMatrixWorld(true);
    for (const s of tracks(c)) {
      const A = ARMS[s];
      const [k0, k1, u] = segment(c[s], Math.max(c.t, c[s][0].t));
      const p0 = keyPose(A, k0, c), p1 = keyPose(A, k1, c);
      // 手首は肩を中心に弧を描いて動く（向きを回し、肩からの距離を変える）
      const r0 = p0.W.clone().sub(A.S0), r1 = p1.W.clone().sub(A.S0);
      const len = lerp(r0.length(), r1.length(), u);
      const dir = r0.normalize().applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(r0, r1.normalize()), u));
      const W = A.S0.clone().addScaledVector(dir, len);
      const sh = lerp(p0.shake, p1.shake, u);
      if (sh) W.y += sh * Math.sin(c.t * 23) * Math.sin(c.t * 7.3);
      state.reach[s] = solve(A, W, p0.qH.clone().slerp(p1.qH, u), p0.pole.clone().lerp(p1.pole, u).normalize());
      A.B.hand.updateWorldMatrix(true, false);
      setFingers(A.fingers, {
        curl: lerpCurl(p0.curl, p1.curl, u), kn: lerpCurl(p0.kn, p1.kn, u), tog: lerp(p0.tog, p1.tog, u),
        thumb: lerp(p0.thumb, p1.thumb, u), topp: lerp(p0.topp, p1.topp, u), tcurl: lerp(p0.tcurl, p1.tcurl, u),
      }, gripHits(A.grip, A.hits, A.extra), Math.min(1, state.dt * 22));
    }
    if (c.t >= c.dur) end(c, false);
  }

  const palmWorld = (s = 'r') => P(marks[`palm_${s}`]);
  return {
    root: model, bones, ARMS, play, release, stop, touch, advance, pose, palmWorld,
    grip: (s) => ARMS[s].grip,
    get view() { return state.view; }, get reach() { return state.reach; }, get playing() { return !!clip; }, get time() { return clip ? clip.t : 0; },
  };
}
