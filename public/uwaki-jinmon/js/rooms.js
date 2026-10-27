// 終わりの後の場面の部屋と小道具（three.js で作る）。場面の進め方は epilogue.js。数字（大きさ・色・位置）はすべて設計判断
//   home: いつものダイニング（room.glb）に朝ごはんのテーブルを置く。夫は縛られていた椅子のまま（原点・+Z を向く）、妻は向かいに座る
//   apart: 離婚した妻の新しい部屋（明るい窓辺）。six: 元夫の6畳一間（夜・蛍光灯）。夫は原点で床に座る
// 手に持つ物は、持つ所の軸（X＝右手の親指の側・Y＝指の向き・Z＝手のひらから外へ）に合わせて付ける（付け方は epilogue.js）。指が当たって止まる部分は userData.hit（hand.js）
import * as THREE from 'three';
import { t } from './i18n.js';
import { canvasTex, phone, lockScreen } from './props.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const std = (o) => new THREE.MeshStandardMaterial(o);
const shadow = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
const lathe = (pts, mat, segs = 36) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat);
const hit = (m) => { m.userData.hit = true; return m; };
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function place(m, x, y, z) { m.position.set(x, y, z); return m; }
function disc(r, y, mat) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

// ---------- 食器（原点は底の真ん中）
// 茶碗（夫婦茶碗: 夫は大きい藍・妻は小さい赤）。ごはんは userData.eat() でひと口ずつ減る
export function chawan(big) {
  const k = big ? 1 : 0.88;
  const g = new THREE.Group();
  const pts = [[0, 0.002], [0.026, 0], [0.027, 0.008], [0.024, 0.009], [0.036, 0.016], [0.05, 0.031], [0.057, 0.05], [0.059, 0.061], [0.056, 0.062], [0.053, 0.051], [0.045, 0.032], [0.031, 0.017], [0, 0.013]];
  g.add(hit(lathe(pts.map(([r, y]) => [r * k, y * k]), std({ color: big ? 0x2b3d5c : 0xb2474b, roughness: 0.28, side: THREE.DoubleSide }))));
  const rice = new THREE.Mesh(new THREE.SphereGeometry(0.049 * k, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.44), std({ color: 0xf6f3ec, roughness: 0.9 }));
  rice.scale.y = 0.42;
  rice.position.y = 0.034 * k;
  g.add(rice);
  g.userData.top = V(0, 0.054 * k, 0);
  g.userData.eat = () => { rice.scale.y = Math.max(0.12, rice.scale.y - 0.07); rice.position.y -= 0.0016; };
  return shadow(g);
}
// 汁椀（黒っぽい朱塗り）にみそ汁（豆腐とねぎ）
export function owan() {
  const g = new THREE.Group();
  const pts = [[0, 0.002], [0.028, 0], [0.029, 0.009], [0.026, 0.01], [0.04, 0.018], [0.052, 0.036], [0.056, 0.058], [0.057, 0.066], [0.054, 0.067], [0.052, 0.058], [0.047, 0.037], [0.035, 0.02], [0, 0.015]];
  g.add(lathe(pts, std({ color: 0x3b100c, roughness: 0.22, side: THREE.DoubleSide })));
  g.add(disc(0.0505, 0.054, std({ color: 0x9a6634, roughness: 0.12 })));
  const tofu = std({ color: 0xf3efe2, roughness: 0.6 }), negi = std({ color: 0x5f8a3a, roughness: 0.6 });
  [[0.012, 0.01], [-0.016, 0.004], [0.002, -0.017]].forEach(([x, z], i) => { const m = box(0.012, 0.008, 0.012, tofu, x, 0.055, z); m.rotation.y = i; g.add(m); });
  [[-0.005, 0.02], [0.022, -0.008], [-0.024, -0.012], [0.008, -0.003]].forEach(([x, z]) => g.add(box(0.005, 0.002, 0.005, negi, x, 0.0555, z)));
  return shadow(g);
}
// 焼き鮭と大根おろしの皿
export function sakePlate() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0.001], [0.05, 0], [0.052, 0.006], [0.085, 0.012], [0.088, 0.016], [0.084, 0.016], [0.05, 0.009], [0, 0.009]], std({ color: 0xf2efe8, roughness: 0.3, side: THREE.DoubleSide })));
  const s = new THREE.Shape(); // 切り身（上から見た形）
  s.moveTo(-0.045, -0.012); s.quadraticCurveTo(-0.05, 0.02, -0.02, 0.022); s.lineTo(0.035, 0.016); s.quadraticCurveTo(0.05, 0.012, 0.046, -0.006); s.quadraticCurveTo(0.03, -0.022, -0.045, -0.012);
  const fish = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }), std({ color: 0xdd7a52, roughness: 0.62 }));
  fish.rotation.x = -Math.PI / 2;
  fish.position.set(-0.01, 0.012, 0);
  g.add(fish);
  const oroshi = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), std({ color: 0xf1efe6, roughness: 0.95 }));
  oroshi.scale.set(1, 0.6, 1);
  oroshi.position.set(0.05, 0.016, 0.02);
  g.add(oroshi);
  return shadow(g);
}
// 箸（2本）。原点は持つ所で、先は +Y（userData.tip）
export function hashi(color, len = 0.225, back = 0.07) {
  const g = new THREE.Group();
  const mat = std({ color, roughness: 0.45 });
  for (const sx of [-1, 1]) {
    const m = hit(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0034, len, 8), mat));
    m.position.set(sx * 0.0045, len / 2 - back, 0);
    m.rotation.z = sx * 0.018; // 先へ向かって少し寄る
    g.add(m);
  }
  g.userData.tip = V(0, len - back, 0);
  return shadow(g);
}
export const hashioki = () => shadow(box(0.042, 0.009, 0.012, std({ color: 0xd9d2c4, roughness: 0.4 }), 0, 0.0045, 0));
// 湯呑み（妻）と、漬物の小皿・一輪挿し
export function yunomi() {
  const g = new THREE.Group();
  g.add(hit(lathe([[0, 0.003], [0.03, 0], [0.032, 0.006], [0.036, 0.04], [0.037, 0.083], [0.034, 0.084], [0.033, 0.04], [0.029, 0.009], [0, 0.009]], std({ color: 0x8fa596, roughness: 0.35, side: THREE.DoubleSide }))));
  g.add(disc(0.0335, 0.07, std({ color: 0x8f8a3c, roughness: 0.08 })));
  return shadow(g);
}
// 急須（横に取っ手）。原点は取っ手の握る所。取っ手から急須へ +X・上 +Y・注ぎ口 -Z（先は userData.spout）。置く時は底が y = -0.04
export function kyusu() {
  const g = new THREE.Group();
  const mat = std({ color: 0x7a4630, roughness: 0.38 }); // 朱泥
  const body = hit(lathe([[0, 0], [0.042, 0], [0.055, 0.018], [0.058, 0.04], [0.052, 0.062], [0.036, 0.074], [0, 0.074]], mat));
  body.position.set(0.105, -0.04, 0);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), mat);
  knob.position.set(0.105, 0.04, 0);
  const handle = hit(new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.012, 0.075, 12), mat));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.02, 0, 0);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.011, 0.062, 10), mat);
  spout.position.set(0.105, 0.005, -0.078);
  spout.rotation.x = -0.95; // 横へ、上向きに
  g.add(body, knob, handle, spout);
  g.userData.spout = V(0.105, 0.027, -0.1);
  return shadow(g);
}
// 夫の湯呑み（空。注ぐと userData.fill(0〜1) でお茶が増える）
function yunomiEmpty() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0.003], [0.031, 0], [0.033, 0.006], [0.037, 0.045], [0.038, 0.088], [0.035, 0.089], [0.034, 0.045], [0.03, 0.009], [0, 0.009]], std({ color: 0x3f4a55, roughness: 0.35, side: THREE.DoubleSide })));
  const tea = disc(0.03, 0.01, std({ color: 0x8f8a3c, roughness: 0.08 }));
  tea.visible = false;
  g.add(tea);
  g.userData.fill = (u) => { tea.visible = u > 0.02; tea.position.y = 0.01 + 0.062 * u; tea.scale.setScalar(0.9 + 0.22 * u); };
  return shadow(g);
}
function pickles() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0.001], [0.03, 0], [0.045, 0.012], [0.047, 0.015], [0.043, 0.015], [0.03, 0.006], [0, 0.006]], std({ color: 0xe9e4d6, roughness: 0.3, side: THREE.DoubleSide })));
  const y = std({ color: 0xe2c043, roughness: 0.5 });
  [[-0.012, 0], [0.006, 0.01], [0.012, -0.012]].forEach(([x, z], i) => { const m = box(0.022, 0.006, 0.014, y, x, 0.012, z); m.rotation.y = i * 0.7; g.add(m); });
  return shadow(g);
}
export function vase() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.022, 0], [0.026, 0.03], [0.016, 0.075], [0.009, 0.1], [0.011, 0.106], [0.007, 0.106], [0, 0.1]], std({ color: 0x5d7389, roughness: 0.25 })));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.12, 6), std({ color: 0x4d6b35, roughness: 0.7 }));
  stem.position.y = 0.155; stem.rotation.z = 0.12;
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), std({ color: 0xf0e2a0, roughness: 0.8 }));
  flower.position.set(-0.008, 0.215, 0);
  g.add(stem, flower);
  return shadow(g);
}
// マグカップ（新しい部屋のコーヒー）。取っ手は +X
export function mug() {
  const g = new THREE.Group();
  const mat = std({ color: 0xe8e1d4, roughness: 0.35, side: THREE.DoubleSide });
  g.add(hit(lathe([[0, 0.002], [0.04, 0], [0.042, 0.004], [0.042, 0.095], [0.038, 0.096], [0.038, 0.008], [0, 0.008]], mat)));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0062, 8, 20, Math.PI), mat);
  h.position.set(0.041, 0.052, 0);
  h.rotation.z = -Math.PI / 2;
  g.add(h);
  g.add(disc(0.0385, 0.078, std({ color: 0x2e1c12, roughness: 0.08 })));
  return shadow(g);
}
// カップ麺（白地に赤い帯）。ふたは半分めくれて立っている。中は userData.top
export function cupNoodle() {
  const g = new THREE.Group();
  const side = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8302a'; c.fillRect(0, 10, w, 52);
    c.fillStyle = '#fff'; c.font = 'bold 30px "Hiragino Sans", sans-serif'; c.textAlign = 'center'; c.fillText('しょうゆ', w * 0.25, 48); c.fillText('しょうゆ', w * 0.75, 48);
    c.fillStyle = '#e2b43a'; c.fillRect(0, 62, w, 5);
  });
  const outer = hit(new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.037, 0.105, 32, 1, true), std({ map: side, roughness: 0.6 })));
  outer.position.y = 0.0525;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.0475, 0.0355, 0.104, 32, 1, true), std({ color: 0xf1eee6, roughness: 0.7, side: THREE.BackSide }));
  inner.position.y = 0.053;
  const soup = disc(0.045, 0.084, std({ color: 0x7a4a22, roughness: 0.1 }));
  const noodleTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h);
    c.strokeStyle = '#e8c98a'; c.lineWidth = 3;
    for (let i = 0; i < 26; i++) { c.beginPath(); const y0 = Math.random() * h; c.moveTo(0, y0); for (let x = 0; x <= w; x += 8) c.lineTo(x, y0 + Math.sin(x * 0.15 + i) * 6); c.stroke(); }
  });
  const noodles = disc(0.044, 0.0855, std({ map: noodleTex, transparent: true, roughness: 0.5 }));
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24, 0, Math.PI), std({ color: 0xeee8dc, roughness: 0.7, side: THREE.DoubleSide }));
  lid.position.set(0, 0.105, -0.004);
  lid.rotation.x = -0.25; // 奥の半分が立っている
  g.add(outer, inner, soup, noodles, lid);
  g.userData.top = V(0, 0.09, 0);
  return shadow(g);
}
// 湯気: 白いぼかしの粒が立ちのぼって消える。anchor() は湯気の出る所（世界の位置）。update(dt) を毎コマ呼ぶ
let steamTex = null;
export function steam(anchor, { n = 9, size = 0.05, rise = 0.15, life = 2.6, spread = 0.02, alpha = 0.14 } = {}) {
  steamTex ||= canvasTex(64, 64, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  const group = new THREE.Group();
  const parts = Array.from({ length: n }, (_, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    group.add(sp);
    return { sp, age: (i / n) * life, seed: i * 1.7 };
  });
  return {
    group,
    on: true,
    update(dt) {
      const b = anchor();
      for (const p of parts) {
        p.age = (p.age + dt) % life;
        const u = p.age / life;
        p.sp.position.set(b.x + Math.sin(u * 5 + p.seed) * spread * (0.3 + u), b.y + u * rise, b.z + Math.cos(u * 4 + p.seed * 1.3) * spread * (0.3 + u));
        p.sp.scale.setScalar(size * (0.5 + u * 1.2));
        p.sp.material.opacity = this.on ? alpha * Math.sin(Math.PI * u) : 0;
      }
    },
  };
}
// 箸の先から垂れる麺（毎コマ、下へ垂れるように向きを直す: epilogue.js）
export function strands() {
  const g = new THREE.Group();
  const mat = std({ color: 0xe6c88c, roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const pts = [];
    const ox = (i - 2.5) * 0.0025, len = 0.07 + (i % 3) * 0.012;
    for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(V(ox + Math.sin(u * 9 + i) * 0.004, -u * len, Math.cos(u * 7 + i * 2) * 0.003)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0011, 5), mat));
  }
  g.visible = false;
  return g;
}
// ATM のご利用明細（慰謝料の分割の振込）。total は万円
export function slip(total) {
  const n = 24, per = Math.round((total * 10000) / n / 1000) * 1000;
  const tex = canvasTex(256, 384, (c, w, h) => {
    c.fillStyle = '#f7f5ef'; c.fillRect(0, 0, w, h);
    const head = t('ご利用明細');
    c.fillStyle = '#333'; c.textAlign = 'center'; c.font = `bold ${head.length > 10 ? 16 : 22}px "Hiragino Sans", sans-serif`; c.fillText(head, w / 2, 46); // 長い見出し（英語）は小さく、紙の幅に収める
    c.textAlign = 'left'; c.font = '18px "Hiragino Sans", sans-serif';
    c.fillText(t('お振込'), 22, 96);
    c.fillText(t('摘要　慰謝料'), 22, 136);
    c.fillText(t('（分割 12/{n}回）', { n }), 22, 162);
    c.font = 'bold 30px "Hiragino Sans", sans-serif'; c.fillText(`¥${per.toLocaleString()}`, 22, 222);
    c.font = '18px "Hiragino Sans", sans-serif'; c.fillText(t('お取引後残高'), 22, 284);
    c.font = 'bold 22px "Hiragino Sans", sans-serif'; c.fillText('¥3,812', 22, 316);
    c.strokeStyle = '#bbb'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(16, 64); c.lineTo(w - 16, 64); c.stroke();
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), std({ map: tex, roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}
// 夫のスマホ（机に伏せずに置いてある）。光らせる時は light(true)。画面の上は -Z（妻の側から読める向き）
export function tablePhone(time, name, text) {
  const p = phone(0x18191b, lockScreen(time, name, text));
  p.rotation.x = -Math.PI / 2;
  const scr = p.userData.screen;
  scr.emissiveIntensity = 0;
  p.userData.light = (on) => { scr.emissiveIntensity = on ? 0.75 : 0; };
  return p;
}

// ---------- いつものダイニングの台所（夜の部屋にも朝にも出す）: 戸棚の扉・家電・冷蔵庫・壁の時計・カレンダー。
// room.glb の台所（カウンターは x -1.6〜0.4・z -1.7〜-1.05・天板 0.93、吊り戸棚は z -1.34 まで・高さ 1.55〜2.2）に合わせて置く
function clockFace() {
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f6f3ec'; c.beginPath(); c.arc(w / 2, h / 2, 124, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2b2b2b';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillRect(w / 2 + Math.sin(a) * 100 - 3, h / 2 - Math.cos(a) * 100 - 3, 6, 6); }
  });
}
function calendarTex() {
  return canvasTex(256, 360, (c, w, h) => {
    c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#5a7d6a'; c.fillRect(0, 0, w, 120);
    c.fillStyle = '#fff'; c.font = 'bold 54px "Hiragino Sans", sans-serif'; c.textAlign = 'center'; c.fillText('10', w / 2, 82);
    c.fillStyle = '#444'; c.font = '17px "Hiragino Sans", sans-serif';
    for (let d = 1; d <= 31; d++) { const k = d + 2, x = 22 + (k % 7) * 35, y = 156 + Math.floor(k / 7) * 38; c.fillStyle = k % 7 === 0 ? '#c0392b' : '#444'; c.fillText(String(d), x + 6, y); }
    c.strokeStyle = '#c0392b'; c.lineWidth = 3; c.beginPath(); c.arc(22 + (17 % 7) * 35 + 6, 156 + Math.floor(17 / 7) * 38 - 6, 15, 0, Math.PI * 2); c.stroke(); // 丸のついた日（結婚記念日）
  });
}
export function homeDressing() {
  const g = new THREE.Group();
  const door = std({ color: 0x8b6b4e, roughness: 0.55 });
  const steel = std({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.8 });
  const white = std({ color: 0xf1efea, roughness: 0.35 });
  const dark = std({ color: 0x2a2a2c, roughness: 0.4 });
  // カウンターの扉（4枚）と取っ手・幅木
  for (let i = 0; i < 4; i++) {
    const x = -1.6 + 0.25 + i * 0.5;
    g.add(box(0.49, 0.76, 0.018, door, x, 0.48, -1.041));
    g.add(box(0.12, 0.012, 0.016, steel, x, 0.81, -1.026));
  }
  g.add(box(2.0, 0.08, 0.02, dark, -0.6, 0.04, -1.045));
  // 吊り戸棚の扉の継ぎ目と取っ手
  for (const x of [-1.1, -0.6, -0.1]) g.add(box(0.006, 0.63, 0.004, dark, x, 1.875, -1.338));
  for (const x of [-1.35, -0.85, -0.35, 0.15]) g.add(box(0.1, 0.01, 0.014, steel, x, 1.585, -1.332));
  // 電気ケトル・炊飯器・しょうゆと油の瓶（天板 0.93）
  const kettle = new THREE.Group();
  kettle.add(lathe([[0, 0], [0.072, 0], [0.075, 0.02], [0.07, 0.17], [0.05, 0.2], [0, 0.205]], white));
  const kh = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20, Math.PI), white);
  kh.position.set(-0.072, 0.11, 0); kh.rotation.z = Math.PI / 2;
  kettle.add(kh, box(0.03, 0.02, 0.05, dark, 0.07, 0.17, 0));
  kettle.position.set(-1.28, 0.93, -1.42);
  const rice = new THREE.Group();
  const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 28), white);
  rb.scale.set(1, 1, 0.82); rb.position.y = 0.1;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.03, 28), std({ color: 0x3a3a3d, roughness: 0.3 }));
  lid.scale.set(1, 1, 0.82); lid.position.y = 0.215;
  const disp = box(0.06, 0.025, 0.004, std({ color: 0x0a0a0a, emissive: 0x7fd08a, emissiveIntensity: 0.6 }), 0, 0.15, 0.108);
  rice.add(rb, lid, disp);
  rice.position.set(-0.86, 0.93, -1.42);
  const bottle = (color, cap, h, x, z) => {
    const b = new THREE.Group();
    b.add(lathe([[0, 0], [0.028, 0], [0.03, 0.01], [0.03, h * 0.7], [0.012, h * 0.9], [0.012, h], [0, h]], std({ color, roughness: 0.15, transparent: true, opacity: 0.9 })));
    b.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), std({ color: cap, roughness: 0.5 })), 0, h + 0.01, 0));
    b.position.set(x, 0.93, z);
    return b;
  };
  g.add(kettle, rice, bottle(0x2a1208, 0xc0392b, 0.2, -0.58, -1.5), bottle(0xc9a23a, 0x2e6b3a, 0.24, -0.5, -1.55));
  // 冷蔵庫（カウンターの右）: 扉の継ぎ目・取っ手・マグネットと紙
  const fridge = new THREE.Group();
  const fbody = std({ color: 0xdfe1e3, roughness: 0.32, metalness: 0.25 });
  fridge.add(box(0.66, 1.78, 0.66, fbody, 0, 0.89, 0));
  fridge.add(box(0.66, 0.006, 0.004, dark, 0, 1.12, 0.332), box(0.66, 0.006, 0.004, dark, 0, 0.62, 0.332));
  fridge.add(box(0.018, 0.4, 0.03, steel, 0.27, 1.4, 0.345), box(0.25, 0.018, 0.03, steel, 0, 1.05, 0.345), box(0.25, 0.018, 0.03, steel, 0, 0.56, 0.345));
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.2), std({ map: canvasTex(150, 200, (c, w, h) => {
    c.fillStyle = '#fffdf3'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#444'; c.font = '15px "Hiragino Sans", sans-serif';
    ['ゴミの日', '燃える 月・木', 'プラ 水', '', '牛乳', 'たまご'].forEach((t, i) => c.fillText(t, 12, 28 + i * 26));
  }), roughness: 0.9 }));
  note.position.set(-0.12, 1.42, 0.334);
  note.rotation.z = 0.04;
  fridge.add(note);
  [[-0.17, 1.53, 0xc0392b], [-0.05, 1.53, 0x2e86de], [0.15, 1.3, 0xf1c40f]].forEach(([x, y, c]) => fridge.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12), std({ color: c, roughness: 0.4 })), x, y, 0.338)));
  fridge.children.slice(-3).forEach((m) => { m.rotation.x = Math.PI / 2; });
  fridge.position.set(0.93, 0, -1.37);
  g.add(fridge);
  // 壁の時計（冷蔵庫の上）。針はゲームの時刻（clock.set(分)）
  const clock = new THREE.Group();
  clock.add(new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.03, 40), std({ color: 0x5b4636, roughness: 0.5 })));
  clock.children[0].rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.12, 40), std({ map: clockFace(), roughness: 0.6 }));
  face.position.z = 0.016;
  clock.add(face);
  const hand = (len, wid) => { const h = new THREE.Group(); h.add(place(box(wid, len, 0.004, dark), 0, len / 2 - 0.012, 0)); h.position.z = 0.02; clock.add(h); return h; };
  const hour = hand(0.06, 0.008), minute = hand(0.095, 0.005);
  clock.position.set(0.93, 2.05, -1.68);
  g.add(clock);
  const setClock = (min) => { minute.rotation.z = -((min % 60) / 60) * Math.PI * 2; hour.rotation.z = -(((min / 60) % 12) / 12) * Math.PI * 2; };
  // 廊下へのドア（夫から見て左の壁。家の朝、夫はここから出かける）。部屋の内へ開く（setDoor(0〜1)）。開くと奥は暗い廊下
  const doorAt = V(2.18, 0, -0.15);
  const dwood = std({ color: 0x9a7a58, roughness: 0.5 });
  const hinge = new THREE.Group();
  hinge.position.set(doorAt.x, 0, doorAt.z - 0.4); // 蝶番は奥の側（開けた戸が、歩いてくる夫の向こうに立つ）
  hinge.add(box(0.04, 2.0, 0.8, dwood, 0, 1.0, 0.4), box(0.05, 0.02, 0.12, steel, -0.04, 1.0, 0.7));
  const hall = box(0.01, 2.0, 0.78, std({ color: 0x0b0908, roughness: 1 }), doorAt.x + 0.012, 1.0, doorAt.z);
  hall.visible = false;
  g.add(hinge, hall);
  g.add(box(0.03, 2.06, 0.05, white, doorAt.x - 0.01, 1.03, doorAt.z - 0.425), box(0.03, 2.06, 0.05, white, doorAt.x - 0.01, 1.03, doorAt.z + 0.425), box(0.03, 0.05, 0.9, white, doorAt.x - 0.01, 2.03, doorAt.z));
  const setDoor = (u) => { hinge.rotation.y = -u * 1.25; hall.visible = u > 0.01; };
  // カレンダー（冷蔵庫の右の壁）
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.39), std({ map: calendarTex(), roughness: 0.9 }));
  cal.position.set(1.62, 1.5, -1.695);
  g.add(cal);
  shadow(g);
  // 夜だけ: 吊り戸棚の下の手元灯（台所が奥に見えるように）
  const under = new THREE.PointLight(0xffd9ad, 0.32, 2.4, 2);
  under.position.set(-0.6, 1.46, -1.45);
  g.add(under);
  return { group: g, setClock, under, doorAt, setDoor };
}

// ---------- home: 朝ごはん（テーブル・夫と妻の膳）。near はテーブルの手前（夫の側）の縁の z
export function homeSet({ wood, near }) {
  const g = new THREE.Group();
  const TH = 0.72, D = 0.75, W = 1.1, far = near + D, zc = near + D / 2;
  g.add(box(W, 0.035, D, wood, 0, TH - 0.0175, zc));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, TH - 0.035, 0.05, wood, sx * (W / 2 - 0.07), (TH - 0.035) / 2, zc + sz * (D / 2 - 0.07)));
  const at = (o, x, z, ry = 0) => { o.position.set(x, TH, z); o.rotation.y = ry; g.add(o); return o; };
  // 夫の膳（夫の左は +X）: ごはんは左・みそ汁は右・鮭は奥。箸置きは手前
  const his = {
    bowl: at(chawan(true), 0.1, near + 0.14),
    soup: at(owan(), -0.07, near + 0.15),
    fish: at(sakePlate(), -0.2, near + 0.3, 0.2),
    rest: at(hashioki(), 0.17, near + 0.06),
    hashi: hashi(0x2b1a12),
  };
  his.cup = at(yunomiEmpty(), -0.03, near + 0.43);
  // 妻の膳（向かい。妻の左は -X。鮭はもう食べ終えた）と湯呑み・急須（取っ手は妻の方を向き、注ぎ口は妻の左）
  const her = {
    bowl: at(chawan(false), -0.1, far - 0.15),
    soup: at(owan(), 0.08, far - 0.16),
    cup: at(yunomi(), 0.2, far - 0.07),
    pot: at(kyusu(), 0.22, far - 0.16, Math.PI / 2),
  };
  her.pot.position.y = TH + 0.04;
  const herHashi = at(hashi(0xb04848, 0.205, 0.1), -0.02, far - 0.055);
  herHashi.rotation.set(0, 0, Math.PI / 2); herHashi.position.y = TH + 0.013; // 横に寝かせ、先は妻の左
  at(hashioki(), 0.055, far - 0.055);
  at(pickles(), 0.33, zc - 0.02);
  at(vase(), -0.42, zc - 0.12);
  shadow(g);
  return { group: g, his, her, TH, near, far, zc };
}

// ---------- 空・街の絵（窓の外。光る板）
const skyTex = () => canvasTex(512, 512, (c, w, h) => { // 朝の空と庭木（ダイニングの窓）
  const s = c.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#9cc3e6'); s.addColorStop(0.65, '#e4eef2'); s.addColorStop(1, '#f4ecd8');
  c.fillStyle = s; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${70 + Math.random() * 40},${110 + Math.random() * 40},${60 + Math.random() * 30},0.55)`; c.beginPath(); c.arc(Math.random() * w, h * 0.78 + Math.random() * h * 0.25, 30 + Math.random() * 50, 0, Math.PI * 2); c.fill(); }
});
const cityTex = () => canvasTex(1024, 512, (c, w, h) => { // 朝の街（新しい部屋の窓。高い階から見下ろす）
  const s = c.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#8fb9e3'); s.addColorStop(0.55, '#dbe8f1'); s.addColorStop(0.72, '#f3eadb'); s.addColorStop(1, '#c9cfd4');
  c.fillStyle = s; c.fillRect(0, 0, w, h);
  for (const [base, col, hmax, n] of [[0.66, '#b9c6d2', 0.12, 40], [0.74, '#9fb0bf', 0.16, 34], [0.84, '#7f909f', 0.2, 26]]) {
    for (let i = 0; i < n; i++) {
      const bw = 20 + Math.random() * 46, bh = 20 + Math.random() * hmax * h, x = Math.random() * w;
      c.fillStyle = col; c.fillRect(x, base * h - bh, bw, bh + h);
      c.fillStyle = 'rgba(255,255,255,0.18)'; for (let y = base * h - bh + 6; y < h; y += 9) c.fillRect(x + 4, y, bw - 8, 2);
    }
  }
  const sun = c.createRadialGradient(w * 0.3, h * 0.28, 4, w * 0.3, h * 0.28, 220); sun.addColorStop(0, 'rgba(255,248,226,0.95)'); sun.addColorStop(1, 'rgba(255,248,226,0)');
  c.fillStyle = sun; c.fillRect(0, 0, w, h);
});
const nightTex = () => canvasTex(512, 384, (c, w, h) => { // 夜の窓（向かいの建物に灯りが少し）
  const s = c.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#0b1220'); s.addColorStop(1, '#1a2130');
  c.fillStyle = s; c.fillRect(0, 0, w, h);
  c.fillStyle = '#141820'; c.fillRect(60, 120, 300, h);
  for (let i = 0; i < 14; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,214,150,0.8)' : 'rgba(190,210,255,0.6)'; c.fillRect(80 + (i % 5) * 56, 150 + Math.floor(i / 5) * 60, 26, 18); }
  const l = c.createRadialGradient(430, 300, 2, 430, 300, 80); l.addColorStop(0, 'rgba(255,230,180,0.6)'); l.addColorStop(1, 'rgba(255,230,180,0)'); c.fillStyle = l; c.fillRect(0, 0, w, h);
});
export const homeWindow = () => new THREE.MeshBasicMaterial({ map: skyTex() });

// 影だけ落とす板（見えない）。窓の形に光が差すよう、窓のまわりの壁の代わりに置く
const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
export function wallWithHole(axis, at, { a0, a1, y0, y1, hole: [ha0, ha1, hy0, hy1], t = 0.05 }) {
  const g = new THREE.Group();
  const piece = (pa0, pa1, py0, py1) => {
    if (pa1 - pa0 < 1e-3 || py1 - py0 < 1e-3) return;
    const m = axis === 'x' ? box(t, py1 - py0, pa1 - pa0, shadowOnly, at, (py0 + py1) / 2, (pa0 + pa1) / 2) : box(pa1 - pa0, py1 - py0, t, shadowOnly, (pa0 + pa1) / 2, (py0 + py1) / 2, at);
    m.castShadow = true;
    g.add(m);
  };
  piece(a0, a1, y0, hy0); piece(a0, a1, hy1, y1); piece(a0, ha0, hy0, hy1); piece(ha1, a1, hy0, hy1);
  return g;
}

// ---------- apart: 新しい部屋（窓の壁は z = -1.1。妻は窓のそばに立つ）
export function apartSet({ floorMap }) {
  const g = new THREE.Group();
  const X0 = -1.8, X1 = 1.8, Z0 = -1.1, Z1 = 2.6, H = 2.45;
  const wall = std({ color: 0xf3f0ea, roughness: 0.92 });
  const floor = std({ map: floorMap, color: 0xffffff, roughness: 0.42 });
  floor.color.setRGB(1.35, 1.28, 1.2); // 明るい木（いつもの床の絵を明るくして使う）
  g.add(box(X1 - X0, 0.1, Z1 - Z0, floor, 0, -0.05, (Z0 + Z1) / 2));
  g.add(box(X1 - X0, 0.1, Z1 - Z0, wall, 0, H + 0.05, (Z0 + Z1) / 2));
  g.add(box(0.1, H, Z1 - Z0, wall, X0 - 0.05, H / 2, (Z0 + Z1) / 2), box(0.1, H, Z1 - Z0, wall, X1 + 0.05, H / 2, (Z0 + Z1) / 2), box(X1 - X0, H, 0.1, wall, 0, H / 2, Z1 + 0.05));
  // 大きな窓（掃き出し）: 窓の壁は穴のまわりを4枚で
  const WX = 1.25, WY0 = 0.12, WY1 = 2.22;
  g.add(box(X1 - X0, WY0, 0.12, wall, 0, WY0 / 2, Z0 - 0.06), box(X1 - X0, H - WY1, 0.12, wall, 0, (WY1 + H) / 2, Z0 - 0.06));
  g.add(box(X1 - WX, WY1 - WY0, 0.12, wall, (X0 - WX) / 2, (WY0 + WY1) / 2, Z0 - 0.06), box(X1 - WX, WY1 - WY0, 0.12, wall, (X1 + WX) / 2, (WY0 + WY1) / 2, Z0 - 0.06));
  const alu = std({ color: 0x3b3f45, roughness: 0.4, metalness: 0.5 });
  g.add(box(2 * WX, 0.04, 0.06, alu, 0, WY0 + 0.02, Z0 - 0.06), box(2 * WX, 0.04, 0.06, alu, 0, WY1 - 0.02, Z0 - 0.06));
  for (const x of [-WX + 0.02, 0, WX - 0.02]) g.add(box(0.04, WY1 - WY0, 0.06, alu, x, (WY0 + WY1) / 2, Z0 - 0.06));
  // ベランダの手すりと、外の街
  for (const y of [0.95, 0.05]) g.add(box(2 * WX + 0.6, 0.035, 0.035, alu, 0, y, Z0 - 1.0));
  for (let x = -WX - 0.3; x <= WX + 0.3; x += 0.12) g.add(box(0.012, 0.9, 0.012, alu, x, 0.5, Z0 - 1.0));
  g.add(box(2 * WX + 1.2, 0.06, 1.1, std({ color: 0xbfc2c4, roughness: 0.8 }), 0, -0.03, Z0 - 0.6)); // ベランダの床
  const city = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: cityTex() }));
  city.position.set(0, 0.2, Z0 - 9);
  g.add(city);
  // レースのカーテン（窓の両わきに寄せてある）
  const lace = std({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.42, 2.2, 24, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 60) * 0.025); // ひだ
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, lace);
    m.position.set(sx * (WX - 0.1), 1.2, Z0 + 0.06);
    g.add(m);
  }
  // 観葉植物と、小さな丸テーブル（本）
  const plant = new THREE.Group();
  plant.add(lathe([[0, 0], [0.12, 0], [0.15, 0.32], [0.13, 0.33], [0, 0.3]], std({ color: 0xece8e0, roughness: 0.6 })));
  const leaf = std({ color: 0x3f6b3a, roughness: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), leaf);
    l.scale.set(1, 0.08, 0.55);
    const a = (i / 9) * Math.PI * 2, r = 0.12 + (i % 3) * 0.05;
    l.position.set(Math.cos(a) * r, 0.55 + (i % 4) * 0.12, Math.sin(a) * r);
    l.rotation.set(0.5 * Math.sin(i), -a, 0.6);
    plant.add(l);
  }
  plant.position.set(1.25, 0, Z0 + 0.45);
  g.add(plant);
  const tbl = new THREE.Group();
  const oak = std({ color: 0xc9a77c, roughness: 0.45 });
  tbl.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.025, 32), oak), 0, 0.55, 0));
  tbl.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.54, 12), oak), 0, 0.27, 0));
  tbl.add(box(0.16, 0.025, 0.22, std({ color: 0x7c8f9e, roughness: 0.7 }), 0.06, 0.575, 0.05));
  const fl = vase();
  fl.position.set(-0.08, 0.5625, -0.05);
  tbl.add(fl);
  tbl.position.set(-0.62, 0, Z0 + 0.62);
  g.add(tbl);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), std({ map: canvasTex(256, 172, (c, w, h) => {
    c.fillStyle = '#e9dfcf'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c9b79c'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
    c.strokeStyle = '#d8c8ae'; c.lineWidth = 2; for (let x = 24; x < w - 20; x += 14) { c.beginPath(); c.moveTo(x, 22); c.lineTo(x, h - 22); c.stroke(); }
  }), roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.05, 0.004, Z0 + 1.15);
  g.add(rug);
  shadow(g);
  city.castShadow = false; city.receiveShadow = false;
  // 光: 窓から差す朝日（窓の形の光が床に落ちる）と、明るい空の光
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
  sun.position.set(-2.2, 4.2, Z0 - 5.5);
  sun.target.position.set(0.2, 0, 0.8);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 14 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  const sky = new THREE.HemisphereLight(0xe6eef8, 0x9b8b78, 0.9);
  const fill = new THREE.PointLight(0xfff4e8, 0.6, 0, 2);
  fill.position.set(0, 1.9, 1.6);
  g.add(sun, sun.target, sky, fill);
  return { group: g, lights: [sun, sky, fill], eye: V(-0.3, 1.5, 0.9) }; // 窓から少し離れ、窓と鉢植えを斜めに見る
}

// ---------- six: 元夫の6畳一間（夜。夫は原点で、ちゃぶ台の前の座布団に足を投げ出して座る）
function tatamiTex() {
  return canvasTex(512, 683, (c, w, h) => { // 2.7m × 3.6m に 6枚（0.9m × 1.8m）
    c.fillStyle = '#b8b27e'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(90,80,40,${0.05 + Math.random() * 0.08})`; c.fillRect(0, y, w, 1); }
    c.fillStyle = '#2c3326';
    for (let i = 0; i <= 3; i++) c.fillRect(i * (w / 3) - 4, 0, 8, h); // 長い辺の縁
    c.fillStyle = 'rgba(40,36,24,0.55)';
    for (let i = 0; i <= 2; i++) c.fillRect(0, i * (h / 2) - 1, w, 2);
  });
}
export function sixSet() {
  const g = new THREE.Group();
  const X0 = -1.35, X1 = 1.35, Z0 = -1.6, Z1 = 2.0, H = 2.3;
  const wall = std({ color: 0xc7bba2, roughness: 0.95 });
  g.add(box(X1 - X0, 0.1, Z1 - Z0, std({ map: tatamiTex(), roughness: 0.85 }), 0, -0.05, (Z0 + Z1) / 2));
  g.add(box(X1 - X0, 0.1, Z1 - Z0, std({ color: 0x6a5440, roughness: 0.8 }), 0, H + 0.05, (Z0 + Z1) / 2)); // 板の天井
  g.add(box(0.1, H, Z1 - Z0, wall, X0 - 0.05, H / 2, (Z0 + Z1) / 2), box(0.1, H, Z1 - Z0, wall, X1 + 0.05, H / 2, (Z0 + Z1) / 2), box(X1 - X0, H, 0.1, wall, 0, H / 2, Z1 + 0.05));
  // 後ろの壁の窓（夜）と、くすんだカーテン
  const WX0 = -0.95, WX1 = 0.15, WY0 = 0.85, WY1 = 1.85;
  g.add(box(WX0 - X0, H, 0.1, wall, (X0 + WX0) / 2, H / 2, Z0 - 0.05), box(X1 - WX1, H, 0.1, wall, (WX1 + X1) / 2, H / 2, Z0 - 0.05));
  g.add(box(WX1 - WX0, WY0, 0.1, wall, (WX0 + WX1) / 2, WY0 / 2, Z0 - 0.05), box(WX1 - WX0, H - WY1, 0.1, wall, (WX0 + WX1) / 2, (WY1 + H) / 2, Z0 - 0.05));
  const night = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WX0, WY1 - WY0), new THREE.MeshBasicMaterial({ map: nightTex() }));
  night.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, Z0 - 0.08);
  g.add(night);
  const curtain = std({ color: 0x5f6656, roughness: 0.95, side: THREE.DoubleSide });
  const cg = new THREE.PlaneGeometry(0.55, 1.2, 20, 1);
  for (let i = 0; i < cg.attributes.position.count; i++) cg.attributes.position.setZ(i, Math.sin(cg.attributes.position.getX(i) * 40) * 0.03);
  cg.computeVertexNormals();
  const cm = new THREE.Mesh(cg, curtain);
  cm.position.set(WX1 - 0.2, (WY0 + WY1) / 2 + 0.05, Z0 + 0.05);
  g.add(cm);
  // 天井の丸い蛍光灯（ひもつき）
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.07, 32), std({ color: 0xffffff, emissive: 0xeef4ff, emissiveIntensity: 1.4, roughness: 0.6 }));
  lamp.position.set(0, H - 0.06, 0.25);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.5, 4), std({ color: 0xdddddd }));
  cord.position.set(0.03, H - 0.35, 0.25);
  g.add(lamp, cord);
  // ちゃぶ台・座布団・布団・テレビ・コンビニの袋・缶
  const dark = std({ color: 0x4a3426, roughness: 0.5 });
  const table = new THREE.Group();
  table.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.025, 40), dark), 0, 0.3175, 0));
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; table.add(box(0.04, 0.305, 0.04, dark, Math.cos(a) * 0.27, 0.1525, Math.sin(a) * 0.27)); }
  table.position.set(0.02, 0, 0.7); // 夫（原点・足を前へ投げ出す）の胸と腹が天板に入らない所（2026-10-25 オーナー「家具と合体してる」）
  g.add(table);
  g.add(box(0.56, 0.06, 0.56, std({ color: 0x5b2a2c, roughness: 0.9 }), 0, 0.03, -0.06));
  const futon = new THREE.Group();
  futon.add(box(1.0, 0.09, 2.0, std({ color: 0xc9d2db, roughness: 0.95 }), 0, 0.045, 0));
  const blanket = box(0.95, 0.12, 1.1, std({ color: 0x6b7f96, roughness: 0.95 }), 0.05, 0.13, -0.3);
  blanket.rotation.set(0.04, 0.25, 0.05);
  futon.add(blanket);
  futon.position.set(0.72, 0, -0.75);
  futon.rotation.y = 0.08;
  g.add(futon);
  const tvScreen = std({ color: 0x000000, emissive: 0xffffff, emissiveMap: canvasTex(128, 80, (c, w, h) => {
    const s = c.createLinearGradient(0, 0, w, h); s.addColorStop(0, '#f0a040'); s.addColorStop(0.5, '#e05080'); s.addColorStop(1, '#4070e0');
    c.fillStyle = s; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(10, 56, 108, 14);
  }), emissiveIntensity: 0.9, roughness: 0.2 });
  const tv = new THREE.Group();
  tv.add(box(0.62, 0.3, 0.36, std({ color: 0x2a2624, roughness: 0.6 }), 0, 0.15, 0));
  tv.add(box(0.56, 0.34, 0.04, std({ color: 0x111111, roughness: 0.4 }), 0, 0.5, 0));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.3), tvScreen);
  scr.position.set(0, 0.5, 0.021);
  tv.add(scr);
  tv.position.set(0.98, 0, 1.15);
  tv.rotation.y = Math.atan2(-0.98, -1.15);
  g.add(tv);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), std({ color: 0xf2f2f0, roughness: 0.4, transparent: true, opacity: 0.85 }));
  bag.scale.set(1, 0.7, 0.8);
  bag.position.set(-0.62, 0.08, 0.55);
  g.add(bag);
  const can = std({ map: canvasTex(128, 64, (c, w, h) => { // 銀の缶に金と紺の帯（ビール）
    c.fillStyle = '#c9d0d6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f3a64'; c.fillRect(0, 18, w, 26);
    c.fillStyle = '#d9b04a'; c.fillRect(0, 16, w, 3); c.fillRect(0, 44, w, 3);
  }), roughness: 0.3, metalness: 0.6 });
  [[-0.04, 0.98], [0.06, 1.02], [-0.62, 0.32, true]].forEach(([x, z, down]) => { // 明細を撮る線に入らないよう、机の手前へ
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.122, 16), can);
    m.position.set(x, down ? 0.033 : 0.33 + 0.061, z);
    if (down) m.rotation.z = Math.PI / 2;
    g.add(m);
  });
  shadow(g);
  night.castShadow = false;
  lamp.castShadow = false;
  // 光: 蛍光灯（青白い・影あり）と、テレビのちらつく光
  const top = new THREE.SpotLight(0xe8efff, 6, 0, 1.25, 0.7, 2);
  top.position.set(0, H - 0.12, 0.25);
  top.target.position.set(0, 0, 0.3);
  top.castShadow = true;
  top.shadow.mapSize.set(2048, 2048);
  top.shadow.radius = 4; // 髪の細かい影が額に縞にならないように
  top.shadow.bias = -0.0004;
  top.shadow.normalBias = 0.02;
  const tvLight = new THREE.PointLight(0x8aa6ff, 0.5, 4, 2);
  tvLight.position.set(0.85, 0.55, 1.0);
  const amb = new THREE.HemisphereLight(0x3d4658, 0x241f1a, 0.25);
  g.add(top, top.target, tvLight, amb);
  return { group: g, lights: [top, tvLight, amb], table, tvLight, tvScreen, TH: 0.33 };
}
