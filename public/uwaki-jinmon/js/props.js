// 小道具。手に持つ物は、妻の手の「持つ所」（wife.js の grip）の軸で作る:
//   X＝右手なら親指の側（左手は小指の側）・Y＝指の向き・Z＝手のひらから外へ。原点は手のひらの真ん中
//   指が当たって止まる部分の Mesh には userData.hit を付ける（hand.js）
// 置く物（漬物石・工具箱・離婚届・まな板と包丁）は世界の位置に置く。数字（大きさ・位置）は設計判断
import * as THREE from 'three';
import { t, lang } from './i18n.js';

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const std = (o) => new THREE.MeshStandardMaterial(o);
const shadow = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

// スマホ（14.6×7.1cm）: 背中を手のひらに当て、画面は Z の向き。画面の素材は userData.screen（消す時は emissiveIntensity を 0 に）
export function phone(caseColor, screen) {
  const g = new THREE.Group();
  const side = std({ color: caseColor, roughness: 0.45, metalness: 0.2 });
  const face = std({ color: 0x000000, emissive: 0xffffff, emissiveMap: screen, emissiveIntensity: 0.55, roughness: 0.15 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.071, 0.146, 0.008), [side, side, side, side, face, side]);
  m.position.set(0, 0.02, 0.006);
  m.userData.hit = true;
  g.add(m);
  g.userData.screen = face;
  return shadow(g);
}
export const lockScreen = (time = '22:41', name = 'ユイ', text = '昨日はありがとう♡') => canvasTex(256, 512, (g, w, h) => { // 縛られる側のスマホ: 待ち受けに LINE の通知（名前と文は日本語で受けて、描く時にいまの言葉にする）
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#1d2a3a'); bg.addColorStop(1, '#0b1018');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8eef5'; g.font = '200 64px "Hiragino Sans", sans-serif'; g.textAlign = 'center'; g.fillText(time, w / 2, 120);
  g.fillStyle = 'rgba(240,240,240,0.92)'; g.beginPath(); g.roundRect(14, 170, w - 28, 92, 18); g.fill();
  g.fillStyle = '#06c755'; g.fillRect(28, 186, 26, 26);
  g.fillStyle = '#222'; g.textAlign = 'left'; g.font = 'bold 20px "Hiragino Sans", sans-serif'; g.fillText(t(name), 64, 206);
  g.font = '18px "Hiragino Sans", sans-serif'; g.fillText(t(text), 28, 240);
});
const recScreen = () => canvasTex(256, 512, (g, w, h) => { // 妻のスマホ: 録音中
  g.fillStyle = '#17191c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e5484d'; g.beginPath(); g.arc(w / 2, 170, 18, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.font = 'bold 30px "Hiragino Sans", sans-serif'; g.fillText(t('録音中'), w / 2, 240);
  g.fillStyle = '#b8bcc4'; g.font = '200 44px "Hiragino Sans", sans-serif'; g.fillText('00:00', w / 2, 300);
  g.strokeStyle = '#3a3f46'; g.lineWidth = 3; for (let i = 0; i < 24; i++) { const x = 30 + i * 8.5, hh = 6 + ((i * 7) % 5) * 6; g.beginPath(); g.moveTo(x, 380 - hh); g.lineTo(x, 380 + hh); g.stroke(); }
});
const callScreen = () => canvasTex(256, 512, (g, w, h) => { // 妻のスマホ: 義母に発信中
  g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#9aa0a8'; g.beginPath(); g.arc(w / 2, 150, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.font = 'bold 30px "Hiragino Sans", sans-serif'; g.fillText(t('お義母さん'), w / 2, 240);
  g.fillStyle = '#b8bcc4'; g.font = '20px "Hiragino Sans", sans-serif'; g.fillText(t('発信中…'), w / 2, 276);
  g.fillStyle = '#e5484d'; g.beginPath(); g.arc(w / 2, 430, 32, 0, Math.PI * 2); g.fill();
});

// ペンチ: 握りは手の中（X の向きに通す）、口は親指の先へ出る。2本の柄が Y まわりに開く
function pliers() {
  const g = new THREE.Group();
  const grip = std({ color: 0xa8231b, roughness: 0.6 }), steel = std({ color: 0x55585c, roughness: 0.35, metalness: 0.85 });
  const halves = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.position.set(0.045, 0.035, 0.02); // 支点（柄は指の付け根で握る）
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.013, 0.011), grip);
    handle.position.set(-0.06, 0, s * 0.008);
    handle.userData.hit = true;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.007), steel);
    jaw.position.set(0.03, 0, s * 0.004);
    h.add(handle, jaw);
    g.add(h);
    halves.push([h, s]);
  }
  g.userData.open = (a) => halves.forEach(([h, s]) => { h.rotation.y = s * a; });
  return shadow(g);
}

// 包丁: 柄は手の中（X）、刃は親指の側（+X）へ伸び、刃先（切れる側）は +Y（指の側）
function knife(envTex) {
  const g = new THREE.Group();
  const wood = std({ color: 0x2b1d14, roughness: 0.7 });
  const steel = std({ color: 0xcfd2d4, roughness: 0.22, metalness: 0.95, envMap: envTex || null, envMapIntensity: 1.5 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.018), wood);
  handle.position.set(-0.005, 0.022, 0.02);
  handle.userData.hit = true;
  const s = new THREE.Shape();
  s.moveTo(0.05, 0.008); s.lineTo(0.215, 0.012); s.quadraticCurveTo(0.245, 0.016, 0.25, 0.034);
  s.quadraticCurveTo(0.225, 0.054, 0.19, 0.056); s.lineTo(0.05, 0.058); s.lineTo(0.05, 0.008);
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.0018, bevelEnabled: false }), steel);
  blade.position.set(0, 0, 0.019);
  g.add(handle, blade);
  return shadow(g);
}

// スタンガン（2026-10-27 オーナー「電気ショックを加えたい」）: 黒い握りの箱。先（+X。ペンチの口・包丁の刃と同じ、親指の側）に金属の電極が2本。
// arc(true) で電極の間に青白い火花（光る板と小さな灯り）。傷は描かない（当てた所は赤くならない）
function stunGun() {
  const g = new THREE.Group();
  const body = std({ color: 0x15161a, roughness: 0.55, metalness: 0.2 }), rubber = std({ color: 0x2a2c31, roughness: 0.95 }), steel = std({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.95 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.03), body); // 握り（手の中。X が長さ）
  box.position.set(-0.01, 0.035, 0.02);
  box.userData.hit = true;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.042, 0.032), rubber); // ゴムの滑り止め
  pad.position.set(-0.03, 0.035, 0.02);
  pad.userData.hit = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.026), body); // 先の細くなった所
  head.position.set(0.078, 0.035, 0.02);
  g.add(box, pad, head);
  const prongs = [];
  for (const z of [-0.009, 0.009]) {
    const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0028, 0.016, 10), steel);
    pr.rotation.z = Math.PI / 2;
    pr.position.set(0.1, 0.035, 0.02 + z);
    g.add(pr); prongs.push(pr);
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 1.5, roughness: 0.4 })); // 通電の赤い灯
  led.position.set(0.04, 0.057, 0.02);
  g.add(led);
  // 火花: 電極の間の光る板（両面・加算）と灯り。普段は消えている
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const arc = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.018), arcMat);
  arc.rotation.y = Math.PI / 2; // 板を YZ に（電極と電極をつなぐ向き）
  arc.position.set(0.107, 0.035, 0.02);
  arc.visible = false;
  const glow = new THREE.PointLight(0x9fd4ff, 0, 0.7, 2);
  glow.position.set(0.107, 0.035, 0.02);
  g.add(arc, glow);
  g.userData.arc = (on) => { arc.visible = on; glow.intensity = on ? 1.6 : 0; if (on) { arc.rotation.x = (Math.random() - 0.5) * 0.9; arc.scale.set(1, 0.8 + Math.random() * 0.5, 1); } };
  g.userData.flicker = () => { if (arc.visible) { arc.rotation.x = (Math.random() - 0.5) * 0.9; arc.scale.set(1, 0.7 + Math.random() * 0.6, 1); glow.intensity = 1.0 + Math.random() * 1.2; } }; // 当てている間、毎フレーム揺らす
  g.userData.tip = [0.108, 0.035, 0.02]; // 電極の先（持つ所の軸で）。clips.js の tip
  return shadow(g);
}

// バリカン（2026-10-27 オーナー「バリカン」）: 黒い握りの箱。先（+X）に銀の刃と櫛の歯。刃の先は userData.tip（clips.js の CLIP_TIP）
function clipper() {
  const g = new THREE.Group();
  const body = std({ color: 0x1a1b1f, roughness: 0.5, metalness: 0.2 }), steel = std({ color: 0xc4c8cc, roughness: 0.3, metalness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.042, 0.034), body);
  box.position.set(-0.01, 0.035, 0.02);
  box.userData.hit = true;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), body);
  neck.position.set(0.078, 0.035, 0.02);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.04), steel); // 刃（薄い板）
  blade.position.set(0.098, 0.022, 0.02);
  g.add(box, neck, blade);
  for (let i = 0; i < 9; i++) { // 櫛の歯
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.003, 0.0025), steel);
    t.position.set(0.106, 0.024, 0.004 + i * 0.004);
    g.add(t);
  }
  g.userData.tip = [0.11, 0.022, 0.02];
  return shadow(g);
}

// コップの水（liquid: 中身の色・level: 入っている割合）: 親指を上にして握る（コップの軸は X）。酒は同じコップに琥珀色を半分
function cup(liquid = 0x9fc2d6, level = 1) {
  const g = new THREE.Group();
  const glass = std({ color: 0xdfe8ec, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const water = std({ color: liquid, roughness: 0.1, transparent: true, opacity: level < 1 ? 0.62 : 0.45, depthWrite: false });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.1, 28, 1, true), glass);
  body.userData.hit = true;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.03, 28), glass);
  bottom.rotation.x = Math.PI / 2; bottom.position.y = -0.05;
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.03, 0.062 * level, 28), water);
  w.position.y = -0.049 + 0.031 * level;
  const c = new THREE.Group();
  c.add(body, bottom, w);
  c.rotation.z = -Math.PI / 2; // 円柱の軸（Y）を X に
  c.position.set(0.03, 0.066, 0.047); // 手はコップの下の方を指で包み、親指はコップの外に沿わせる（手のひらは少し離れる。口に当たるのはふちだけ）
  g.add(c);
  return g;
}

// おにぎり: 手のひらを上にして乗せ、とがった所は指の向き（夫の口へ）。海苔は下の辺
function onigiri() {
  const g = new THREE.Group();
  const s = new THREE.Shape(), r = 0.012;
  const P = [[0, 0.045], [-0.042, -0.03], [0.042, -0.03]];
  for (let i = 0; i < 3; i++) {
    const a = P[i], b = P[(i + 1) % 3], c = P[(i + 2) % 3];
    const toward = (p, q, d) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); return [p[0] + (dx / L) * d, p[1] + (dy / L) * d]; };
    const p1 = toward(a, c, r), p2 = toward(a, b, r);
    if (i === 0) s.moveTo(...p1); else s.lineTo(...p1);
    s.quadraticCurveTo(a[0], a[1], ...p2);
  }
  s.closePath();
  const rice = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3 }), std({ color: 0xf2efe6, roughness: 0.92 }));
  rice.position.z = -0.011;
  const nori = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.032, 0.036), std({ color: 0x1b2118, roughness: 0.6 }));
  nori.position.set(0, -0.026, 0);
  rice.userData.hit = nori.userData.hit = true;
  const o = new THREE.Group();
  o.add(rice, nori);
  o.rotation.z = 0; // とがった所が +Y（指の向き）
  o.position.set(0, 0.04, 0.024);
  g.add(o);
  g.userData.bite = () => { o.scale.set(1, 0.82, 1); o.position.y = 0.032; }; // ひと口かじった
  return shadow(g);
}

// 手錠: 手首の輪（手の骨の付け根に付ける。骨の Y が手の向き）と、両手の間の鎖
function cuffRing() {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.0042, 10, 36), std({ color: 0xb9bcc0, roughness: 0.25, metalness: 0.95 }));
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  return m;
}

function paperTexture() { // 離婚届（緑の枠）
  return canvasTex(512, 724, (g) => {
    g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, 512, 724);
    g.strokeStyle = '#3c8a5a'; g.lineWidth = 6; g.strokeRect(24, 24, 464, 676);
    g.fillStyle = '#3c8a5a'; g.font = 'bold 54px "Hiragino Mincho ProN", serif'; g.fillText('離 婚 届', 150, 110);
    if (lang !== 'ja') { g.font = 'bold 24px "Hiragino Sans", sans-serif'; g.textAlign = 'center'; g.fillText(t('離婚届'), 256, 142); g.textAlign = 'left'; } // 日本の書類のまま、下にその言葉の名を添える
    g.lineWidth = 2; for (let y = 160; y < 680; y += 46) { g.beginPath(); g.moveTo(44, y); g.lineTo(468, y); g.stroke(); }
  });
}

export function makeProps(scene, { envTex, counterAt, notice }) {
  // 漬物石2つ（ごつごつした灰色の石）
  const stoneMat = std({ color: 0x6f6d6a, roughness: 0.92, flatShading: true });
  const stones = new THREE.Group();
  [[0, 0, 0.1, 1], [0.015, 0.07, 0.085, 2]].forEach(([x, y, r, seed]) => {
    const g = new THREE.IcosahedronGeometry(r, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + 0.12 * Math.sin(p.getX(i) * 61 * seed + p.getZ(i) * 47) * Math.cos(p.getY(i) * 53 + seed); p.setXYZ(i, p.getX(i) * k * 1.25, p.getY(i) * k * 0.55, p.getZ(i) * k); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, stoneMat); m.position.set(x, y, 0); m.rotation.y = seed; stones.add(m);
  });
  stones.visible = false;
  // 工具箱のふた・金づち・ペンチ・紐（テーブルの上）
  const toolbox = new THREE.Group();
  {
    const dark = std({ color: 0x1d1b1a, roughness: 0.5, metalness: 0.4 }), red = std({ color: 0x7a1f17, roughness: 0.6 });
    const wood = std({ color: 0x6b4a2c, roughness: 0.7 }), rope = std({ color: 0xa88a5c, roughness: 0.95 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.22), red); box.position.y = 0.03; toolbox.add(box);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.28, 12), wood); handle.rotation.z = Math.PI / 2; handle.position.set(-0.05, 0.075, -0.04); toolbox.add(handle);
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.1), dark); hm.position.set(0.09, 0.075, -0.04); toolbox.add(hm);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 32), rope); coil.rotation.x = Math.PI / 2; coil.position.set(0.15, 0.07, 0.06); toolbox.add(coil);
    toolbox.visible = false;
  }
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), std({ map: paperTexture(), roughness: 0.9 }));
  paper.visible = false;
  // まな板と包丁（夫の後ろの台所。妻はここから包丁を取る）
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.018, 0.24), std({ color: 0xc9b48e, roughness: 0.8 }));
  board.position.copy(counterAt).add(new THREE.Vector3(0, 0.009, 0));
  const boardKnife = knife(envTex);
  boardKnife.rotation.set(Math.PI / 2, 0, 0.5); // 刃を寝かせて置く
  boardKnife.position.copy(counterAt).add(new THREE.Vector3(-0.06, 0.02, 0.02));
  const cuffs = [cuffRing(), cuffRing()];
  const chain = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0022, 6, 14), std({ color: 0xb9bcc0, roughness: 0.25, metalness: 0.95 })); m.visible = false; return m; });
  scene.add(stones, toolbox, paper, shadow(board), boardKnife, ...chain);
  return {
    stones, toolbox, paper, board, boardKnife, cuffs, chain,
    // 待ち受けの通知の名前と文は台本のきっかけから（女性浮気版はケンタ。2026-10-26 オーナー「妻の方がユイのまま」）
    phoneH: phone(0x18191b, lockScreen(undefined, notice && notice.name, notice && notice.text)), phoneW: phone(0xe9e3dc, callScreen()), phoneR: phone(0xe9e3dc, recScreen()), pliers: pliers(), stun: stunGun(), clipper: clipper(), knife: knife(envTex), cup: cup(), sake: cup(0xd19a3a, 0.45), onigiri: onigiri(),
  };
}
