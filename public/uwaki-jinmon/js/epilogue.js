// 終わりの後の場面（判決のあと・答え合わせの前）: 夫婦を続けた家の朝（home: warm・cold・phone）と、離婚した後のそれぞれの暮らし（apart → six）。
// 2026-10-25 オーナー「終了後の生活をモーションで入れてください」。誓約書で許した時も夫婦は続くので、家の朝を見せる。中身は verdict() の epilogue（game.js）
// 場面はショットの列。ショットごとに部屋と光を切り替え、カメラと黒幕のキー・時刻つきの合図（cues）で進む。時間は描くコマの dt で進む（?step で撮れる）
// 夫の手は puppet.js（キーは夫の体の [右, 上, 前]）、妻の手は wife.js と clips.js。部屋と小道具は rooms.js。終わった後は元に戻さない（答え合わせの後は読み直す）
import * as THREE from 'three';
import { makePuppet, aimBone } from './puppet.js';
import * as R from './rooms.js';
import * as C from './clips.js';
import * as SE from './se.js';
import { t } from './i18n.js';
import { mirror, basisRot } from './wife.js';
import { fitFov } from './view.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const smooth = (u) => u * u * (3 - 2 * u);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const val = (x) => (typeof x === 'function' ? x() : x.clone());

// 夫の手の形（物を持つ形は曲げを多めにしておき、指は物に当たった所で止める。hand.js）
const CHOP = { curl: [0.45, 0.6, 0.95, 1.15], kn: [0.25, 0.25, 0.15, 0.1], tog: 0.5, thumb: 0.95, topp: 0.25, tcurl: 0.45 }; // 箸: 親指の付け根のまたに通し、軽く曲げた人差し指と中指に沿わせる。薬指と小指は握る（握りこぶしに見えないように人差し指は伸ばし気味）
const BOWL = { curl: 0.8, kn: 0.25, tog: 0.9, thumb: 0.6, topp: 0.2, tcurl: 0.35 }; // 茶碗: 底を指で受け、親指は横に添える
const CUPH = { curl: 1.2, kn: 0.1, tog: 0.9, thumb: 0.6, topp: 0.1, tcurl: 0.35 }; // カップ麺: 横から指で包む
const FLAT = { curl: 0.2, tog: 0.7, thumb: 0.3 }; // テーブルに置いた手
const GRAB = { curl: 0.9, kn: 0.2, tog: 0.7, thumb: 0.7, topp: 0.4, tcurl: 0.5 }; // スマホをつかむ
// 持つ物の付け方（持つ所の軸で）
// 箸: 親指の付け根のまた（HASHI_AT）を通り、HASHI_DIR の向きへ出る（曲げた人差し指に沿って前へ）。2本が並ぶ向きは、手のひらの向きに少し傾けた X
const HASHI_AT = [0.046, 0.015, 0];
const HASHI_DIR = V(-0.12, 0.9, 0.42).normalize();
const HASHI_Q = (() => {
  const x = V(0.5, 0, 1);
  x.addScaledVector(HASHI_DIR, -x.dot(HASHI_DIR)).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, HASHI_DIR, x.clone().cross(HASHI_DIR)));
})();
const hashiTip = (len) => V(...HASHI_AT).addScaledVector(HASHI_DIR, len).toArray(); // 箸の先（持つ所の軸で）。len は持つ所から先までの長さ
const TIP = hashiTip(0.155), TIP6 = hashiTip(0.145); // 家の箸（長さ 0.225・持つ所は後ろから 0.07）と 6畳の箸（0.21・0.065）
// 箸の先の向き sdir と親指の向き tdir（どちらも夫の体の軸）から手の向き g・n を決める（箸は手の中で HASHI_DIR を向くので、その分だけ手を回す）
function hashiHand(sdir, tdir) {
  // 夫の体の軸（右・上・前）は左手系なので、外積で決めた親指の側は世界では逆を向く。先に符号を返しておく（2026-10-25 親指が逆に出ていた不具合）
  const s = V(...sdir).normalize(), t = V(...tdir).negate();
  t.addScaledVector(s, -t.dot(s)).normalize();
  const x = V(1, 0, 0).addScaledVector(HASHI_DIR, -HASHI_DIR.x).normalize();
  const R = basisRot(HASHI_DIR, x, s, t);
  return { g: V(0, 1, 0).applyQuaternion(R).toArray(), n: V(0, 0, 1).applyQuaternion(R).toArray() };
}
const BOWL_AT = [0, 0.022, 0.012]; // 茶碗の底の真ん中（手のひらの上。茶碗の上は Z）
const CUP_AT = [0.052, 0.03, 0.07]; // カップ麺の底の真ん中（左手で横から持つ。左手の X は小指の側＝下。手のひらから離して指で包む）

// ---------- 夫の動き
// 手の向き（2026-10-25 オーナー「箸の持ち方がおかしい」: 前は手の甲が正面を向き、拳から箸が下に出て見えた）。sdir・tdir は夫の体の軸（右・上・前）
// 茶碗の上: 箸は左下へ、手の甲が上、親指は上の内側（手のひらは下・後ろ）。口へ運ぶ時: 箸は左上へ口へ、手のひらは左（顔の側）、親指は体の側
const OVER = { at: 'bowlTop', tip: TIP, ...hashiHand([-0.7, -0.45, 0.55], [-0.7, 0.5, -0.5]), pole: [0.75, -0.65, -0.1], ...CHOP }; // 手は茶碗の右上（顔の前に来ない）
const MOUTH = { at: 'mouth', tip: TIP, p: [0, -0.004, 0.012], ...hashiHand([-0.5, 0.55, -0.67], [0, -0.8, -0.6]), pole: [0.8, -0.6, 0], ...CHOP }; // 箸は下から斜めに口へ（手が顔に重ならない）
const MOUTH6 = { ...MOUTH, tip: TIP6 };
const HOLD_BOWL = { at: 'body', tip: BOWL_AT, p: [0.12, -0.16, 0.32], g: [0.55, 0, 0.83], n: [0.1, 1, 0], pole: [-0.7, -0.7, -0.1], ...BOWL };
// 茶碗を左手に持ち、箸で n 口食べる（1口 2.6秒）
function eatBowl(n) {
  const r = [{ t: 0, ...OVER, p: [0, 0.05, 0] }], ev = [];
  for (let i = 0; i < n; i++) {
    const b = i * 2.6;
    r.push({ t: b + 0.45, ...OVER, p: [0, 0.005, 0], ease: 'out' }, { t: b + 0.75, ...OVER, p: [0, 0.04, 0] }, { t: b + 1.35, ...MOUTH }, { t: b + 1.6, ...MOUTH }, { t: b + 2.25, ...OVER, p: [0, 0.05, 0] });
    ev.push({ t: b + 1.15, name: 'open' }, { t: b + 1.42, name: 'bite' }, { t: b + 2.5, name: 'swallow' });
  }
  return { r, l: [{ t: 0, ...HOLD_BOWL }, { t: n * 2.6, ...HOLD_BOWL }], ev };
}
const TABLE_L = { at: 'tableL', palm: true, g: [0.35, 0, 1], n: [0, -1, 0], pole: [-0.7, -0.6, -0.3], ...FLAT };
const TABLE_R = { at: 'tableR', palm: true, g: [-0.35, 0, 1], n: [0, -1, 0], pole: [0.7, -0.6, -0.3], ...FLAT };
// 茶碗と箸を置いて、両手をテーブルに
const putDown = {
  l: [
    { t: 0, ...HOLD_BOWL },
    { t: 0.7, ...HOLD_BOWL, at: 'bowlSpot', p: [0, 0.012, 0], n: [0, 1, 0] },
    { t: 0.9, ...HOLD_BOWL, at: 'bowlSpot', p: [0, 0, 0], n: [0, 1, 0] },
    { t: 1.15, ...HOLD_BOWL, at: 'bowlSpot', p: [0.06, 0.05, -0.04], n: [0.2, 1, 0], ...FLAT }, // 離したら手を開いて上げる（持った形のまま動くと爪のように見える）
    { t: 1.6, ...TABLE_L },
  ],
  r: [
    { t: 0, ...OVER, p: [0, 0.05, 0] },
    { t: 0.8, at: 'rest', palm: true, p: [-0.02, 0.05, -0.04], g: [-0.8, -0.2, 0.5], n: [0, -1, 0], pole: [0.7, -0.7, -0.2], ...CHOP },
    { t: 1.0, at: 'rest', palm: true, p: [-0.02, 0.035, -0.04], g: [-0.8, -0.2, 0.5], n: [0, -1, 0], pole: [0.7, -0.7, -0.2], ...CHOP },
    { t: 1.25, at: 'rest', palm: true, p: [-0.03, 0.06, -0.05], g: [-0.8, -0.2, 0.5], n: [0, -1, 0], pole: [0.7, -0.7, -0.2], ...FLAT },
    { t: 1.7, ...TABLE_R },
  ],
  ev: [{ t: 0.9, name: 'bowlDown' }, { t: 1.0, name: 'chopsDown' }],
};
// 光ったスマホを、箸を置いてつかみ、テーブルの下（ポケット）へ隠す
const hidePhone = {
  r: [
    { t: 0, ...OVER, p: [0, 0.05, 0] },
    { t: 0.35, at: 'rest', palm: true, p: [-0.02, 0.04, -0.04], g: [-0.8, -0.2, 0.5], n: [0, -1, 0], pole: [0.7, -0.7, -0.2], ...CHOP },
    { t: 0.85, at: 'phone', palm: true, p: [0, 0.04, 0], g: [-0.2, -0.1, 1], n: [0, -1, 0], pole: [0.7, -0.6, -0.3], ...FLAT },
    { t: 1.0, at: 'phone', palm: true, p: [0, 0.016, 0], g: [-0.2, -0.1, 1], n: [0, -1, 0], pole: [0.7, -0.6, -0.3], ...GRAB },
    { t: 1.4, at: 'body', palm: true, p: [0.04, -0.17, 0.2], g: [-0.1, -0.3, 1], n: [0, -1, 0.1], pole: [0.7, -0.6, -0.3], ...GRAB },
    { t: 1.8, at: 'body', palm: true, p: [0.02, -0.42, 0.16], g: [0, -0.6, 0.8], n: [0.2, -0.6, -0.5], pole: [0.7, -0.6, -0.3], ...GRAB },
    { t: 2.6, ...TABLE_R },
  ],
  l: [{ t: 0, ...HOLD_BOWL }, { t: 2.0, ...HOLD_BOWL }, { t: 2.7, ...HOLD_BOWL, at: 'bowlSpot', p: [0, 0, 0], n: [0, 1, 0] }, { t: 2.95, ...HOLD_BOWL, at: 'bowlSpot', p: [0.06, 0.05, -0.04], n: [0.2, 1, 0], ...FLAT }, { t: 3.4, ...TABLE_L }],
  ev: [{ t: 0.45, name: 'chopsDown' }, { t: 1.0, name: 'grabPhone', freeze: ['phone'] }, { t: 1.8, name: 'pocket' }, { t: 2.7, name: 'bowlDown' }],
};
// 立ち上がって歩いて出ていく（家の朝の終わり）: テーブルに手をついて立ち、腕を下ろし、向きを変えて歩く（腕は脚と逆に振る）
const RELAXH = { curl: [0.35, 0.45, 0.5, 0.55], tog: 0.8, thumb: 0.5, tcurl: 0.25 }; // 下ろした手（力を抜いて軽く曲がる）
const HANG = { at: 'body', palm: true, p: [0.04, -0.5, 0.02], g: [0, -1, 0.06], n: [-1, 0, 0.1], pole: [0.1, -0.2, -1], ...RELAXH };
const WALK = { hz: 0.9, speed: 0.7, swing: 0.23 }; // 1秒に 0.9 歩きの組（2歩）・速さ m/秒・脚を振る角度
function leaveClip(walkAt) {
  const r = [{ t: 0, ...TABLE_R }, { t: 0.3, ...TABLE_R }, { t: 0.9, ...HANG }], l = [{ t: 0, ...TABLE_L }, { t: 0.3, ...TABLE_L }, { t: 0.9, ...mirror(HANG) }]; // 手は早めにテーブルから離す（体が起きてから残ると宙に浮いて見える）
  const half = 0.5 / WALK.hz;
  for (let k = 0; k < 8; k++) { // 歩き始めてから、半歩ごとに腕の前後を入れかえる
    const f = (k % 2 ? -1 : 1) * 0.07;
    r.push({ t: walkAt + half * (k + 0.5), ...HANG, p: [0.04, -0.5, 0.02 + f] });
    l.push({ t: walkAt + half * (k + 0.5), ...mirror(HANG), p: [-0.04, -0.5, 0.02 - f] });
  }
  return { r, l };
}
// カップ麺（左手で持ち、箸ですする。1口 3秒）
const HOLD_CUP = { at: 'body', tip: CUP_AT, p: [0.14, -0.2, 0.26], g: [0.75, 0, 0.66], tdir: [0, 1, 0], pole: [-0.7, -0.7, 0], ...CUPH };
const OVER_CUP = { ...OVER, at: 'cupTop', tip: TIP6 };
function slurpCup(n) {
  const r = [{ t: 0, ...OVER_CUP, p: [0, 0.05, 0] }], ev = [];
  for (let i = 0; i < n; i++) {
    const b = i * 3;
    r.push({ t: b + 0.4, ...OVER_CUP, p: [0, -0.025, 0], ease: 'out' }, { t: b + 1.25, ...OVER_CUP, p: [0, 0.11, -0.02] }, { t: b + 1.8, ...MOUTH6 }, { t: b + 2.2, ...MOUTH6 }, { t: b + 2.8, ...OVER_CUP, p: [0, 0.05, 0] });
    ev.push({ t: b + 0.55, name: 'noodlesOn' }, { t: b + 1.6, name: 'open' }, { t: b + 1.85, name: 'slurp' }, { t: b + 2.15, name: 'noodlesOff' }, { t: b + 2.7, name: 'swallow' });
  }
  return { r, l: [{ t: 0, ...HOLD_CUP }, { t: n * 3, ...HOLD_CUP }], ev };
}
const cupDown = {
  l: [{ t: 0, ...HOLD_CUP }, { t: 0.8, ...HOLD_CUP, at: 'cupSpot', p: [0, 0.012, 0] }, { t: 1.0, ...HOLD_CUP, at: 'cupSpot', p: [0, 0, 0] }, { t: 1.25, ...HOLD_CUP, at: 'cupSpot', p: [0.07, 0.04, -0.03], ...FLAT }, { t: 1.7, ...TABLE_L }],
  r: [{ t: 0, ...OVER_CUP, p: [0, 0.05, 0] }, { t: 1.0, ...TABLE_R, p: [0, 0.03, 0], ...CHOP }, { t: 1.4, ...TABLE_R, ...CHOP }],
  ev: [{ t: 1.0, name: 'cupDown' }],
};

export function makeEpilogue({ scene, camera, H, W, PR, room, dress, night, subtitle }) {
  const P = makePuppet(H, H.arms);
  const fade = document.getElementById('fade');
  const eye = V(), look = V();
  let run = null, used = false;
  let set = null; // いまの部屋（rooms.js の返り値）と、その場面で使う物
  const T = {}; // 目印（世界の位置を返す関数）。部屋ごとに入れ替える
  const added = []; // 場面のために足した物（次の部屋では隠す）
  const add = (...os) => { scene.add(...os); added.push(...os); };
  // 前の部屋を隠す（夜の部屋の光・家の朝の物）
  function clearStage() {
    night.forEach((l) => { l.visible = false; });
    added.forEach((o) => { o.visible = false; });
  }
  const roomMat = (name) => { let m = null; room.traverse((o) => { if (o.isMesh && o.material.name === name) m = o.material; }); return m; };

  // ---------- 持つ・置く
  const hold = (grip, obj, at, rot) => { grip.add(obj); obj.position.set(...at); if (rot.isQuaternion) obj.quaternion.copy(rot); else obj.rotation.set(...rot); obj.visible = true; };
  const putOn = (obj, spot, ry = 0) => { scene.attach(obj); obj.position.copy(spot); obj.rotation.set(0, ry, 0); };

  // ---------- 夫を場面に合わせる（縛りを解く・椅子か床か）
  function freeHusband({ floor = false } = {}) {
    H.statics.rope.visible = false;
    H.statics.chair.visible = !floor;
    H.watch(null); H.react('up');
    H.setRed(0); H.setTremble(0); H.setBreath(1); H.setMouth(0);
    // 腕を前に出すと肩の皮膚が少しTシャツの外へ出るので、Tシャツを奥行きで少し手前に描く
    H.root.traverse((o) => { if (o.isMesh && /casualsuit/.test(o.material.name)) Object.assign(o.material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }); });
    if (floor) { // 座布団に足を投げ出して座る（ちゃぶ台の下へ）
      H.root.position.y = -0.33;
      for (const s of ['l', 'r']) {
        const sx = s === 'l' ? 1 : -1;
        aimBone(H.bones[`calf_${s}`], V(0.04 * sx, -0.14, 1));
        aimBone(H.bones[`foot_${s}`], V(0.25 * sx, 0.8, 0.55));
      }
    }
  }

  // ---------- 立ち上がって左（+X）へ歩いて出ていく。t0 から 1.3秒で立ち・0.6秒止まり・0.6秒で向きを変え・歩く
  // 脚はテーブルの陰でほとんど見えないので、骨の向きを毎コマ決めるだけ（座る: 太もも前・すね下 → 立つ: どちらも下 → 歩く: 振る）
  function leave(t0) {
    scene.attach(H.statics.chair); // 椅子はその場に残す
    const B = (n) => H.bones[n];
    const start = H.root.position.clone().add(V(0, 0, 0.06)), door = dress.doorAt.clone().add(V(-0.25, 0, 0)); // ドアの手前まで歩く
    const way = door.clone().sub(start).setY(0), len = way.length(), yaw = Math.atan2(way.x, way.z);
    way.normalize();
    set.walk = (t) => {
      const u = smooth(clamp01((t - t0) / 1.3)), turn = smooth(clamp01((t - t0 - 1.9) / 0.6)), w = Math.max(0, t - t0 - 2.5);
      const ph = w * WALK.hz * Math.PI * 2, d = Math.min(w * WALK.speed, len);
      H.root.position.set(start.x + way.x * d, 0.46 * u + (w > 0 ? 0.012 * Math.cos(ph * 2) : 0), start.z * u + way.z * d);
      H.root.rotation.y = turn * yaw;
      if (d >= len) H.root.visible = false; // ドアから出た
      dress.setDoor(smooth(clamp01((t - t0 - 4.3) / 0.6)) * (1 - smooth(clamp01((t - t0 - 5.45) / 0.55)))); // 着く前に開け、出たら閉める
      H.root.updateMatrixWorld(true);
      const q = H.root.quaternion, F = V(0, 0, 1).applyQuaternion(q), L = V(1, 0, 0).applyQuaternion(q), D = V(0, -1, 0);
      for (const [s, sx, off] of [['l', 1, 0], ['r', -1, Math.PI]]) {
        let th = (1 - u) * Math.PI / 2, kn = (1 - u) * Math.PI / 2; // 太ももの前への角度・ひざの曲げ
        if (w > 0) { const p = ph + off; th = WALK.swing * Math.sin(p); kn = 0.08 + 0.65 * Math.max(0, Math.cos(p)) ** 2; }
        const dir = (a) => D.clone().multiplyScalar(Math.cos(a)).addScaledVector(F, Math.sin(a));
        aimBone(B(`thigh_${s}`), dir(th).addScaledVector(L, 0.04 * sx));
        aimBone(B(`calf_${s}`), dir(th - kn).addScaledVector(L, 0.02 * sx));
        aimBone(B(`foot_${s}`), F.clone().multiplyScalar(0.85).addScaledVector(D, 0.5));
      }
    };
  }

  // ---------- 家の朝
  function setupHome(info) {
    room.traverse((o) => {
      if (!o.isMesh) return;
      if (/table/.test(o.name)) o.visible = false;
      if (/window|curtain_rail/.test(o.name)) o.castShadow = false;
    });
    [PR.toolbox, PR.paper, PR.stones, PR.boardKnife].forEach((o) => { o.visible = false; });
    clearStage();
    const shade = roomMat('shade');
    if (shade) shade.emissiveIntensity = 0.05;
    const win = room.getObjectByName('window');
    if (win) win.material = R.homeWindow();
    const curtain = roomMat('curtain');
    if (curtain) curtain.color.setRGB(0.78, 0.72, 0.62);
    freeHusband();
    H.setLean(0.22);
    dress.setClock(7 * 60 + 12);
    const near = H.point('kneeL').z - 0.12;
    const S = R.homeSet({ wood: roomMat('wood'), near });
    add(S.group);
    // 窓の朝日（窓の形に差す）・空の光・照り返し
    const sun = new THREE.DirectionalLight(0xffe4be, 3.6);
    sun.position.set(-6, 3.3, 0.9);
    sun.target.position.set(0.2, 0.7, 0.5);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 12 });
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    const sky = new THREE.HemisphereLight(0xdfe6ee, 0x8a7058, 0.32);
    const bounce = new THREE.PointLight(0xffecd6, 0.28, 0, 2);
    bounce.position.set(0.4, 1.7, S.far + 0.6);
    add(sun, sun.target, sky, bounce, R.wallWithHole('x', -2.27, { a0: -2.6, a1: 1.7, y0: 0, y1: 2.4, hole: [-0.2, 1.2, 0.8, 2.1] }));
    scene.environmentIntensity = 0.16;
    // 夫の箸は右手・茶碗は左手。スマホは夫の右（光るのは phone の時だけ）
    hold(P.grip('r'), S.his.hashi, HASHI_AT, HASHI_Q);
    hold(P.grip('l'), S.his.bowl, BOWL_AT, [Math.PI / 2, 0, 0]);
    const phone = R.tablePhone('7:12', t(info.partner || ''), t('おはよ♡ 今日も会える？'));
    phone.position.set(-0.42, S.TH, near + 0.17);
    phone.rotation.z = 0.25;
    S.group.add(phone);
    P.touch('r', [S.his.bowl, phone]); // 右手の指は、箸を入れる時に茶碗へ・つかむ時にスマホへ入らない
    const bowlSpot = V(0.1, S.TH, near + 0.14), restAt = S.his.rest.position.clone(), cupSpot = S.her.cup.position.clone(), potSpot = S.her.pot.position.clone();
    Object.assign(T, {
      bowlTop: () => S.his.bowl.localToWorld(S.his.bowl.userData.top.clone()),
      mouth: () => H.point('mouth'),
      bowlSpot: () => bowlSpot.clone(),
      rest: () => restAt.clone().add(V(0, 0.012, 0)),
      phone: () => phone.getWorldPosition(V()),
      tableL: () => V(0.17, S.TH + 0.012, near + 0.07),
      tableR: () => V(-0.17, S.TH + 0.012, near + 0.07),
      herCup: () => cupSpot.clone(),
      herHand: () => V(-0.27, S.TH + 0.012, S.far - 0.07),
      potHandle: () => potSpot.clone(),
      hisCup: () => S.his.cup.getWorldPosition(V()),
      hisCupTop: () => S.his.cup.localToWorld(V(0, 0.07, 0)),
    });
    // 急須から湯呑みへ落ちるお茶
    const streamGeo = new THREE.CylinderGeometry(0.0022, 0.0028, 1, 8, 1, true);
    streamGeo.translate(0, 0.5, 0);
    const stream = new THREE.Mesh(streamGeo, new THREE.MeshStandardMaterial({ color: 0xb6a24c, roughness: 0.1, transparent: true, opacity: 0.8 }));
    stream.visible = false;
    add(stream);
    // 湯気: みそ汁2つ・妻の湯呑み・注いだ後の夫の湯呑み
    const top = (o, y) => () => o.localToWorld(V(0, y, 0));
    const steams = [R.steam(top(S.his.soup, 0.06)), R.steam(top(S.her.soup, 0.06)), R.steam(top(S.her.cup, 0.08), { n: 7, size: 0.04 }), R.steam(top(S.his.cup, 0.075), { n: 7, size: 0.04 })];
    steams[3].on = false;
    steams.forEach((st) => add(st.group));
    set = { ...S, phone, bowlSpot, restAt, cupSpot, potSpot, stream, fill: 0, steams };
    SE.ambient('morning');
  }
  // 夫の動きの合図
  const ON = {
    open: () => H.setMouth(0.3),
    bite: () => { H.setMouth(0.04, 0.14); set.his?.bowl.userData.eat(); },
    swallow: () => H.setMouth(0),
    bowlDown: () => { putOn(set.his.bowl, set.bowlSpot); SE.play('clink'); },
    chopsDown: () => { putOn(set.his.hashi, set.restAt.clone().add(V(-0.1, 0.012, 0))); set.his.hashi.rotation.set(0, 0, -Math.PI / 2); }, // 先は夫の左（箸置きの上）
    grabPhone: () => { P.grip('r').attach(set.phone); set.phone.userData.light(false); },
    pocket: () => { set.phone.visible = false; },
    noodlesOn: () => { set.strands.visible = true; },
    noodlesOff: () => { set.strands.visible = false; },
    slurp: () => { SE.play('slurp'); H.setMouth(0.12, 0.1); },
    cupDown: () => { putOn(set.cup, set.cupSpot); },
  };
  const playH = (clip) => P.play(clip, { targets: T, onEvent: (n) => ON[n]?.() });
  const W_ON = {
    potUp: () => hold(W.grip('r'), set.her.pot, C.POTGRIP, [Math.PI, 0, 0]),
    pourOn: () => { set.pouring = true; },
    pourOff: () => { set.pouring = false; set.stream.visible = false; set.steams[3].on = true; },
    potDown: () => { putOn(set.her.pot, set.potSpot, Math.PI / 2); SE.play('clink'); },
  };
  const playW = (clip) => W.play(clip, { targets: { ...T }, onEvent: (n) => W_ON[n]?.() });

  // 家の朝の終わり: 立ち上がり（椅子の音）、warm は妻に笑ってから・cold は目を合わせずに、向きを変えて歩いて出ていく。カメラは追ってから、空いた椅子へ戻る
  function leaveCues(at, cam, t0, { warm }) {
    at(t0, () => { leave(t0); playH(leaveClip(2.5)); H.setLean(0.5); SE.play('chair'); });
    at(t0 + 0.75, () => H.setLean(0.03));
    at(t0 + 1.9, () => { H.watch(null); H.react('droop', 0); H.setFace(warm ? 'relief' : 'neutral'); });
    at(t0 + 5.3, () => SE.play('door')); // 取っ手の音 → 0.7秒後に閉まる音
    at(t0, () => {
      const herEye = cam[0].pos, seated = val(cam[0].look);
      const up = () => H.eyesWorld().add(V(0, -0.12, 0));
      const follow = () => V(Math.min(H.root.position.x, 1.25), 1.3, H.root.position.z);
      const chair = V(0, 0.92, 0.2);
      cam.length = 0; // ここからのカメラ（前のキーは使い終わっている）
      cam.push({ t: t0, pos: herEye, look: seated, fov: 48 }, { t: t0 + 1.4, pos: herEye, look: up, fov: 46 }, { t: t0 + 2.5, pos: herEye, look: up, fov: 46 });
      cam.push({ t: t0 + 4.4, pos: herEye, look: follow, fov: 48 }, { t: t0 + 5.2, pos: herEye, look: follow, fov: 48 }, { t: t0 + 6.8, pos: herEye, look: chair, fov: 46 });
    });
  }

  function homeShot(info) {
    const mood = info.mood;
    const cues = [];
    const at = (t, fn) => cues.push([t, fn]);
    const say = (t, who, text) => at(t, () => subtitle(who, text));
    const cam = [];
    const POUR_AT = 2.2; // 妻が急須でお茶を注ぎ始める時刻（冷えた方は注がない）
    at(0, () => {
      setupHome(info);
      const face0 = H.eyesWorld().add(V(0, -0.2, 0)); // 顔と胸（テーブルの上も入る）
      const herEye = V(0.03, 1.15, set.far + 0.22), lean = herEye.clone().add(V(0.02, -0.03, -0.12));
      const cup = T.hisCupTop(), phoneAt = set.phone.getWorldPosition(V());
      const k = (t, pos, look, fov = 48) => cam.push({ t, pos, look, fov });
      k(0, herEye, face0);
      if (mood === 'cold') { // 自分の手（湯呑みと、指輪）を見る
        const hands = T.herHand().lerp(T.herCup(), 0.3).add(V(0, 0.02, -0.05));
        k(7.6, herEye, face0); k(8.6, herEye, hands, 42); k(10.2, herEye, hands, 42); k(11.2, herEye, face0);
      } else { // 前へかがんで夫の湯呑みに注ぐ（phone は注ぎ終わりに夫のスマホを見る）
        const t0 = POUR_AT;
        k(t0 + 0.2, herEye, face0); k(t0 + 1.0, lean, face0.clone().lerp(cup, 0.4), 52); k(t0 + 2.4, lean, face0.clone().lerp(cup, 0.8), 56); k(t0 + 4.4, lean, face0.clone().lerp(cup, 0.8), 56);
        if (mood === 'phone') { k(t0 + 4.8, lean, phoneAt.clone().lerp(face0, 0.1), 50); k(t0 + 6.6, lean, phoneAt.clone().lerp(face0, 0.1), 50); k(t0 + 7.4, herEye, face0); }
        else { k(t0 + 6.0, lean, face0.clone().lerp(cup, 0.3)); k(t0 + 6.8, herEye, face0); }
      }
      fade.textContent = t(info.later);
      SE.play('birds');
      H.watch(T.bowlTop);
      H.setFace(mood === 'cold' ? 'shame' : 'relief', true);
      playH(eatBowl(mood === 'cold' ? 4 : 2));
      if (mood === 'cold') { playW(C.holdCup(20)); W.touch('r', [set.her.cup]); } // 湯呑みはテーブルに置いたまま包む（指は湯呑みに当たった所で止まる）
    });
    if (mood !== 'cold') {
      at(POUR_AT, () => playW(C.pourTea));
      for (const t of [4.5, 9, 13.5, 18]) at(t, () => SE.play('birds')); // 窓の外の小鳥
    }
    if (mood === 'warm') {
      at(5.4, () => H.watch(T.hisCup));
      at(6.9, () => { H.watch(() => eye.clone()); H.setFace('smile'); });
      say(7.1, '夫', '…ありがとう');
      at(8.6, () => { subtitle('', ''); H.watch(T.bowlTop); H.setFace('relief'); playH(eatBowl(1)); });
      at(11.2, () => playH(putDown));
      at(12.6, () => { H.watch(() => eye.clone()); H.setFace('smile'); });
      say(12.9, '夫', 'ごちそうさま。……いってきます');
      leaveCues(at, cam, 13.9, { warm: true });
      say(16.2, '妻', 'いってらっしゃい');
      return { dur: 21, cam, cues, black: [[0, 1], [1.6, 1], [2.6, 0]] };
    }
    if (mood === 'cold') {
      for (let t = 2; t < 20; t += 1) at(t, () => SE.play('tick'));
      say(4.4, '妻', '…今日は、何時に帰るの');
      say(6.2, '夫', '……わからない');
      at(7.8, () => subtitle('', ''));
      at(10.6, () => { playH(putDown); H.watch(() => V(-1.6, 1.0, 1.4)); H.setFace('neutral'); }); // 目を合わせずに
      say(12.4, '夫', '……いってきます');
      leaveCues(at, cam, 13.4, { warm: false });
      at(15.0, () => subtitle('', ''));
      return { dur: 20.5, cam, cues, black: [[0, 1], [1.6, 1], [2.6, 0]] };
    }
    // phone: 注いでいる時に、夫のスマホが光る
    at(5.4, () => H.watch(T.hisCup));
    at(6.0, () => { set.phone.userData.light(true); SE.play('buzz'); H.react('flinch', 0.6); H.watch(T.phone); });
    at(7.0, () => showPhone(info.partner, 'おはよ♡ 今日も会える？', 2.0));
    at(6.5, () => H.playTell('micro_fear'));
    at(7.7, () => playH(hidePhone));
    at(10.4, () => { H.watch(() => eye.clone()); H.setFace('appease'); });
    say(10.8, '夫', '……会社の、人');
    at(11.1, () => H.playTell(info.tell));
    return { dur: 15, cam, cues, black: [[0, 1], [1.6, 1], [2.6, 0]] };
  }

  // ---------- 離婚: 新しい部屋（妻）→ 6畳一間（元夫）
  function apartShot() {
    const cues = [];
    const at = (t, fn) => cues.push([t, fn]);
    const cam = [];
    at(0, () => {
      W.stop();
      clearStage();
      H.root.visible = false;
      room.visible = false;
      dress.group.visible = false;
      [PR.board, PR.boardKnife, PR.toolbox, PR.paper, PR.stones].forEach((o) => { o.visible = false; });
      const S = R.apartSet({ floorMap: roomMat('floor')?.map });
      add(S.group);
      scene.environmentIntensity = 0.5;
      W.root.traverse((o) => { if (o.isMesh && /ring/.test(o.material.name)) o.material.visible = false; }); // 指輪はもう無い
      cam.push({ t: 0, pos: S.eye, look: V(0.35, 1.18, -1.1), fov: 54 }, { t: 9.5, pos: S.eye.clone().add(V(0.1, 0, -0.15)), look: V(0.1, 1.26, -1.1), fov: 54 });
      fade.textContent = t('1年後');
      SE.play('birds');
      const mug = R.mug(); // 取っ手は手のひらと反対の側（前）へ
      mug.rotation.order = 'ZYX';
      hold(W.grip('r'), mug, C.MUGGRIP, [0, -Math.PI / 2, -Math.PI / 2]);
      added.push(mug);
      playW(C.coffeeWindow(12));
      const st = R.steam(() => mug.localToWorld(V(0, 0.1, 0)), { n: 8, size: 0.045, alpha: 0.12 });
      add(st.group);
      set = { ...S, steams: [st] };
      SE.ambient('city');
    });
    at(5.4, () => subtitle('', '指輪の跡は、もう消えた'));
    at(8.3, () => subtitle('', ''));
    return { dur: 9.6, cam, cues, black: [[0, 1], [1.4, 1], [2.6, 0], [8.7, 0], [9.5, 1]] };
  }
  function sixShot(info) {
    const cues = [];
    const at = (t, fn) => cues.push([t, fn]);
    const cam = [];
    at(0, () => {
      W.stop();
      clearStage();
      const S = R.sixSet();
      add(S.group);
      scene.environmentIntensity = 0.06;
      H.root.visible = true;
      freeHusband({ floor: true });
      H.setLean(0.3);
      H.setFace('exhausted', true);
      const cup = R.cupNoodle(), hs = R.hashi(0xd8c09a, 0.21, 0.065), strands = R.strands();
      hold(P.grip('l'), cup, CUP_AT, [0, 0, Math.PI / 2]);
      hold(P.grip('r'), hs, HASHI_AT, HASHI_Q);
      P.touch('r', [cup]);
      hs.add(strands);
      strands.position.copy(hs.userData.tip);
      const slip = R.slip(info.amount);
      slip.position.set(0.18, S.TH + 0.001, 0.62);
      slip.rotation.z = -0.3;
      const phone = R.tablePhone('23:48', t(info.partner || ''), t('今から行ってもいい？'));
      phone.position.set(-0.22, S.TH, 0.7);
      phone.rotation.z = 0.5;
      const glow = new THREE.PointLight(0xbcd0ff, 0, 0.9, 2); // 光った画面が顔を下から照らす
      glow.position.set(-0.22, S.TH + 0.08, 0.68);
      S.group.add(slip, phone, glow);
      phone.userData.light = ((light) => (on) => { light(on); glow.intensity = on ? 0.35 : 0; })(phone.userData.light);
      const cupSpot = V(0.12, S.TH, 0.5);
      Object.assign(T, {
        cupTop: () => cup.localToWorld(cup.userData.top.clone()),
        mouth: () => H.point('mouth'),
        cupSpot: () => cupSpot.clone(),
        tableL: () => V(0.2, S.TH + 0.012, 0.42),
        tableR: () => V(-0.2, S.TH + 0.012, 0.42),
        phone: () => phone.getWorldPosition(V()),
        slip: () => slip.getWorldPosition(V()),
      });
      const st = R.steam(() => cup.localToWorld(V(0, 0.11, 0)), { n: 10, size: 0.05, alpha: 0.1 });
      add(st.group);
      set = { ...S, cup, strands, slip, phone, cupSpot, steams: [st] };
      SE.ambient('tv');
      const look0 = V(0, 0.55, 0.3);
      cam.push({ t: 0, pos: V(-1.2, 1.42, 1.9), look: look0, fov: 40 }, { t: 5.6, pos: V(-1.0, 1.3, 1.6), look: look0, fov: 40 });
      // 明細に寄る（夫の左の前から見下ろす。夫の体は入らない）→ 夫の顔へ
      const slipAt = slip.getWorldPosition(V()), faceAt = () => H.eyesWorld().add(V(0, -0.06, 0));
      cam.push({ t: 6.3, pos: slipAt.clone().add(V(0.2, 0.45, 0.3)), look: slipAt, fov: 30 }, { t: 8.7, pos: slipAt.clone().add(V(0.17, 0.42, 0.27)), look: slipAt, fov: 30 });
      cam.push({ t: 9.5, pos: V(-0.75, 1.0, 1.25), look: faceAt, fov: 34 }, { t: 13, pos: V(-0.55, 0.86, 0.98), look: faceAt, fov: 30 });
      fade.textContent = t('その頃、元夫は');
      H.watch(T.cupTop);
      playH(slurpCup(2));
    });
    at(6.0, () => { playH(cupDown); H.watch(T.slip); });
    at(7.0, () => subtitle('', '慰謝料の振込は、あと12回'));
    at(8.2, () => { H.react('droop', 0.7); H.setFace('shame'); });
    at(9.2, () => subtitle('', ''));
    if (info.partner) {
      at(9.8, () => { set.phone.userData.light(true); SE.play('buzz'); H.watch(T.phone); });
      at(10.4, () => showPhone(info.partner, '今から行ってもいい？', 2.2));
      at(10.8, () => { H.setFace('evasive'); H.playTell('smirk'); });
    } else {
      at(9.8, () => { H.watch(T.phone); });
      at(10.6, () => subtitle('', 'スマホは、もう鳴らない'));
    }
    return { dur: 13.2, cam, cues, black: [[0, 1], [1.4, 1], [2.4, 0]] };
  }

  // 光ったスマホの通知を、画面の横に大きく出す（main.js の証拠と同じ札）
  function showPhone(name, text, sec) {
    const ui = document.getElementById('phoneui');
    document.getElementById('phonebody').innerHTML = `<div style="font-size:12px;color:#555">${t(name)}</div><div class="msg">${t(text)}</div>`;
    ui.classList.add('on');
    run.hideAt = run.t + sec;
  }

  // ---------- 進める
  function camAt(keys, t) {
    if (!keys.length) return null;
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)];
    const u = smooth(Math.max(0, Math.min(1, (t - k0.t) / Math.max(1e-6, k1.t - k0.t))));
    return { pos: val(k0.pos).lerp(val(k1.pos), u), look: val(k0.look).lerp(val(k1.look), u), fov: k0.fov + (k1.fov - k0.fov) * u };
  }
  function blackAt(keys, t) {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
    const [t0, v0] = keys[i], [t1, v1] = keys[Math.min(i + 1, keys.length - 1)];
    return v0 + (v1 - v0) * Math.max(0, Math.min(1, (t - t0) / Math.max(1e-6, t1 - t0)));
  }
  const qTmp = new THREE.Quaternion();
  function tick(dt) {
    if (!run) return;
    run.t += dt;
    const sh = run.shots[run.i];
    while (run.ci < sh.cues.length && run.t >= sh.cues[run.ci][0]) sh.cues[run.ci++][1]();
    set?.walk?.(run.t); // 立って歩く体（腕の前に決める）
    P.update(dt);
    set?.steams?.forEach((st) => st.update(dt));
    if (set?.pouring) { // お茶: 注ぎ口の先から湯呑みのお茶の面へ。注ぐ間に増える
      set.fill = Math.min(0.85, set.fill + dt / 1.3);
      set.his.cup.userData.fill(set.fill);
      const from = set.her.pot.localToWorld(set.her.pot.userData.spout.clone()), to = set.his.cup.localToWorld(V(0, 0.01 + 0.062 * set.fill, 0));
      const d = from.clone().sub(to);
      set.stream.position.copy(to);
      set.stream.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
      set.stream.scale.set(1, d.length(), 1);
      set.stream.visible = true;
    }
    if (set?.strands?.visible) { // 麺は箸の先から下へ垂れる
      set.strands.parent.getWorldQuaternion(qTmp);
      set.strands.quaternion.copy(qTmp).invert();
    }
    if (set?.tvLight) { const f = 0.35 + 0.25 * Math.sin(run.t * 7.3) * Math.sin(run.t * 2.1 + 1) + 0.1 * Math.sin(run.t * 23); set.tvLight.intensity = f; set.tvScreen.emissiveIntensity = 0.6 + f; }
    const c = camAt(sh.cam, run.t);
    if (c) {
      const sway = 0.003 * Math.sin(run.t * 1.3);
      eye.copy(c.pos).add(V(0, sway, 0));
      look.copy(c.look);
      camera.position.copy(eye);
      camera.fov = fitFov(c.fov, camera.aspect); // 縦長の画面では広げる（view.js）
      camera.updateProjectionMatrix();
      camera.lookAt(look);
    }
    fade.style.opacity = blackAt(sh.black, run.t);
    if (run.hideAt && run.t >= run.hideAt) { document.getElementById('phoneui').classList.remove('on'); run.hideAt = 0; }
    if (run.t >= sh.dur) {
      run.i++; run.t = 0; run.ci = 0;
      if (run.i >= run.shots.length) { const r = run; run = null; r.resolve(); }
    }
  }
  // info: verdict() の epilogue。終わる（か、飛ばす）と resolve
  function play(info) {
    if (!info) return Promise.resolve();
    fade.style.transition = 'none';
    fade.style.opacity = 1;
    subtitle('', '');
    W.stop();
    document.body.classList.add('epi', 'epiRun'); // epi は答え合わせの後も残す（時計などは出さない）
    const shots = info.scene === 'home' ? [homeShot(info)] : [apartShot(), sixShot(info)];
    shots.forEach((sh) => sh.cues.sort((a, b) => a[0] - b[0])); // 同じ時刻は書いた順
    used = true;
    return new Promise((resolve) => { run = { shots, i: 0, t: 0, ci: 0, resolve: () => { document.body.classList.remove('epiRun'); subtitle('', ''); resolve(); } }; });
  }
  function skip() { // 残りの合図は出さずに終える（場面の絵はそのまま）
    if (!run) return;
    const r = run;
    run = null;
    fade.style.opacity = 0;
    subtitle('', '');
    r.resolve();
  }
  // on: 再生中。used: 一度でも始めた（終わった後もカメラは場面のまま）
  return { play, tick, skip, eye, look, get on() { return !!run; }, get used() { return used; }, dbg: { P, T, hashiHand, TIP, CHOP } }; // dbg は撮影・確かめ用
}
