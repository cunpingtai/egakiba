// オムライスシミュレーター: 卵を混ぜて折り、フライパンを振って転がして包み、チキンライスに乗せて切る
// 中がトロトロならトロッと開き、焼きすぎるとカチカチで二つに割れて転がる。振りが強すぎると飛び出す
import * as THREE from 'three';
import { skinMaps, curdMaps, charMaps, studioEnv } from './realtex.js';
import { N, TUNE, ACTIVE, TRANSFER, CUT_AUTO, RESID_T, FLY_DELAY, DT, residAdd, plateOf, title, cause, fireOf, seamOk, canFinish, finish, newGame as newState, pour, setKnob, setPan, advance, stir, fold, cut, judge, encodeRes, decodeRes, botPath, flickAt, flickLen, look } from './logic.js';

const W = 540, H = 960;
const FONT = '"Noto Sans JP", "Yu Gothic", "Hiragino Sans", sans-serif';
const params = new URLSearchParams(location.search);
try {
  if (window.parent && window.parent !== window) {
    const parent = new URLSearchParams(window.parent.location.search);
    for (const [key, value] of parent) if (!params.has(key)) params.set(key, value);
  }
} catch {}
const REC = params.get('rec') === '1';
const URL_PAGE = new URL('./', location.href).href;
const clamp01 = k => Math.min(1, Math.max(0, k));
const ease = k => 1 - (1 - clamp01(k)) ** 3;
const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const visc = k => 1 - (1 - clamp01(k)) ** 3.5;   // 粘りのある動き: はじめに動いて、減速しながらゆっくり止まる

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const TOUCH = !matchMedia('(hover: hover) and (pointer: fine)').matches;
const modalOpen = () => { const m = document.getElementById('result'); return m && !m.hidden; };
let scale = 1;

// ---------- 3D（ローポリ。陰影と影あり。点滅なし） ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#7a5c40');   // 低い画角で映る奥は、暗すぎない壁の色
const camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 60);
scene.fog = new THREE.Fog('#7a5c40', 14, 40);   // 遠くの台はなじませる
const hemi = new THREE.HemisphereLight('#fff4e2', '#3b3128', 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 2.1); sun.position.set(-2.5, 7, 3.5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 10, top: 5, bottom: -5, near: 1, far: 20 }); sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.025;
sun.target.position.set(2.7, 0, 0); scene.add(sun, sun.target);
// 皿の場面の光（料理中は 0。皿へ移るあいだにゆっくり切りかわる。明るさを急に変えない）
const rimL = new THREE.DirectionalLight('#d6e2ff', 0); scene.add(rimL, rimL.target);
const LIGHT0 = { sun: sun.position.clone(), tgt: sun.target.position.clone(), bg: new THREE.Color('#7a5c40') }, BG1 = new THREE.Color('#241a13');
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const pho = (c, sh = 40, o = {}) => new THREE.MeshPhongMaterial({ color: c, shininess: sh, flatShading: true, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); m.castShadow = true; m.receiveShadow = true; return m; }
// 決まった並びのでこぼこ（乱数を使わない）
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

const vnoise0 = (x, y, sd) => {   // 決まった値のなめらかなでこぼこ（0〜1）
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf), h = (a, b) => hash(a + sd * 17, b - sd * 31);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), sx), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), sx), sy);
};
// 角の丸い箱
function roundBox(w, h, d, r) {
  const g = new THREE.BoxGeometry(w, h, d, 8, 4, 6), p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { a.fromBufferAttribute(p, i); b.set(Math.max(-w / 2 + r, Math.min(w / 2 - r, a.x)), Math.max(-h / 2 + r, Math.min(h / 2 - r, a.y)), Math.max(-d / 2 + r, Math.min(d / 2 - r, a.z))); a.sub(b); if (a.lengthSq() > 0) a.setLength(r); a.add(b); p.setXYZ(i, a.x, a.y, a.z); }
  g.computeVertexNormals(); return g;
}
// 映り込み（卵・皿のつや用。明るい板を並べた小さな部屋から作る）
let envTex = null;
function eggEnvLater() {
  if (envTex) return envTex;
  const es = new THREE.Scene(); es.background = new THREE.Color('#5a5048');
  const pm = new THREE.PMREMGenerator(renderer);
  const panel = (w, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  panel(6, 3, -2, 6, 3, '#fff6e4'); panel(4, 2, 5, 3, -2, '#d8d0c4'); panel(8, 8, 0, -5, 0, '#8a7a66'); panel(3, 3, -5, 2, -4, '#b8c4d0'); panel(1.5, 1.5, 2, 6, 1, '#ffffff');
  envTex = pm.fromScene(es, 0.04).texture; return envTex;
}
// 調理台（木目は絵で作る）
{
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#8a6a4a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${60 + (i * 37) % 40},${40 + (i * 13) % 25},20,${0.12 + hash(i, 2) * 0.18})`; g.lineWidth = 1 + hash(i, 5) * 3; g.beginPath(); const y = hash(i, 1) * 256; g.moveTo(0, y); for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 4); g.stroke(); }
  for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(40,28,16,.25)'; g.fillRect(0, k * 64, 256, 2); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(16, 18);
  const top = mesh(new THREE.BoxGeometry(120, 0.4, 120), new THREE.MeshLambertMaterial({ map: tex }), 2.7, -0.62, -30);   // 低い画角でも端が見えないよう広く top.castShadow = false;
}
// コンロ（黒い天板・ごとく）と炎
const flames = [];
{
  { const tp = mesh(new THREE.CylinderGeometry(1.8 / Math.cos(Math.PI / 8), 1.8 / Math.cos(Math.PI / 8), 0.12, 8), pho('#26262a', 60), 0, -0.36, 0.1); tp.rotation.y = Math.PI / 8; tp.scale.z = 3.4 / 3.6; tp.castShadow = false; }   // 天板は角を落とした八角形（皿を映すとき、奥の角が画面の端に入らない）
  const grate = lam('#151517');
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const b = mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), grate, Math.cos(a) * 1.35, -0.2, Math.sin(a) * 1.35); b.rotation.y = -a; }
  mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.12, 12), lam('#3a3a3e'), 0, -0.26, 0);
  const fm = new THREE.MeshBasicMaterial({ color: '#4d7ad8', transparent: true, opacity: 0.85 });
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), fm); f.position.set(Math.cos(a) * 1.18, -0.16, Math.sin(a) * 1.18); f.rotation.z = -Math.cos(a) * 0.9; f.rotation.x = Math.sin(a) * 0.9; scene.add(f); flames.push({ f, a }); }
}
// フライパン（返すときは手に合わせて前後に動くようにまとめる）
const RE = 1.08;   // 卵の円盤の半径
const panG = new THREE.Group(); scene.add(panG);
{
  const metal = pho('#2e2e33', 70, { specular: '#5a5a62' });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.22, 0.24, 32, 1, true), new THREE.MeshPhongMaterial({ color: '#2e2e33', shininess: 70, specular: '#5a5a62', side: THREE.DoubleSide, flatShading: true }));
  body.position.y = 0.1; body.receiveShadow = true; panG.add(body);
  const bottom = mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.04, 32), pho('#34343a', 50, { specular: '#444' }), 0, -0.02, 0, panG); bottom.castShadow = false;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.03, 4, 32), metal); rim.rotation.x = Math.PI / 2; rim.position.y = 0.22; panG.add(rim);
  const hd = mesh(new THREE.BoxGeometry(0.22, 0.1, 1.9), lam('#5a3a22'), 0, 0.3, 2.45, panG); hd.rotation.x = -0.12;
  mesh(new THREE.BoxGeometry(0.14, 0.08, 0.5), metal, 0, 0.2, 1.55, panG).rotation.x = -0.25;
}
// 皿とチキンライス（ローポリの山。米粒のでこぼこ・鶏肉・グリーンピース）
const P = new THREE.Vector3(5.6, 0.04, 0);   // 皿の上面の中心
const DOME = { ax: 1.05, az: 0.6, h: 0.5 };
const domeY = (x, z) => DOME.h * Math.sqrt(Math.max(0, 1 - (x / DOME.ax) ** 2 - (z / DOME.az) ** 2));
const PLATE_ROT = 0.7;   // オムレツの長い向きが、手前左から奥右へ約 40° 斜めに伸びる   // 皿を 24° 回して斜めに
const plateG = new THREE.Group(); plateG.position.copy(P); plateG.rotation.y = PLATE_ROT; scene.add(plateG);   // ローカル x が奥行き（オムレツの長さ）。皿を斜めに置き、オムレツは手前左から奥右へ伸びる
// 皿の上の場面（結果）だけで見えるもの: 木の台・陶器の皿・ケチャップライス。料理中の画面には映らない
const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
// 皿の上の場面だけの本物寄りの質感: 細かい凹凸（法線の絵）と、色・ざらつきのむら（uDet で 0〜1。料理中は 0）
const SKIN = skinMaps(512), CURD = curdMaps(256), CHAR = charMaps(256);
SKIN.nrm.repeat.set(2, 2); CURD.nrm.repeat.set(1.6, 1.6);
const studio = studioEnv(renderer);
function detailize(mat, maps, k = 1, rk = 0.8, tint = [1, 1, 1]) {
  mat.userData.tint = { value: new THREE.Vector3(...tint) };
  mat.normalMap = maps.nrm; mat.userData.det = { value: k }; mat.userData.detMap = { value: maps.det }; mat.userData.rk = { value: rk };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uDet = mat.userData.det; sh.uniforms.uDetMap = mat.userData.detMap; sh.uniforms.uRk = mat.userData.rk; sh.uniforms.uTint = mat.userData.tint;
    sh.fragmentShader = 'uniform float uDet; uniform float uRk; uniform vec3 uTint; uniform sampler2D uDetMap;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\nvec4 detC = texture2D(uDetMap, vNormalMapUv);\ndiffuseColor.rgb *= mix(vec3(1.0), detC.rgb * 2.0 * uTint, uDet);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + uDet * uRk * (detC.a - 0.5), 0.03, 1.0);');
  };
  mat.customProgramCacheKey = () => 'det1';
  return mat;
}
const RIM = 1.74, RIM_Y = 0.085, BOARD_TOP = -0.1;   // 皿のふち（皿の中心からの距離・高さ）と、皿を載せた木の台の上面（皿の座標）
const PLATE_TOP = r => r < 1.2 ? 0 : RIM_Y * smooth((r - 1.2) / 0.5);   // 皿の上面の高さ
const supp = (x, z) => { const r = Math.hypot(x, z), y = r < RIM ? PLATE_TOP(r) : BOARD_TOP + (RIM_Y - BOARD_TOP) * (1 - smooth((r - RIM) / 0.28)); return Math.max(y, domeY(x, z)); };   // ご飯・皿・台の上の高さ
{
  // 木の台（厚い板。木目と浅いでこぼこ）
  const grain = (g, w, h, bump) => {
    g.fillStyle = bump ? '#808080' : '#5c3a22'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const y = hash(i, 21) * h, a = 0.05 + hash(i, 22) * 0.18, lt = hash(i, 23) > 0.5;
      g.strokeStyle = bump ? (lt ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`) : (lt ? `rgba(140,95,60,${a + 0.1})` : `rgba(40,22,12,${a + 0.1})`);
      g.lineWidth = 1 + hash(i, 24) * 4; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 6 + Math.sin(x * 0.05 + i * 2) * 1.5); g.stroke();
    }
  };
  const bt = canvasTex(512, 512, (g, w, h) => grain(g, w, h, false)), bb = canvasTex(512, 512, (g, w, h) => grain(g, w, h, true), false);
  const board = mesh(new THREE.BoxGeometry(4.6, BOARD_TOP + 0.46, 3.5), new THREE.MeshStandardMaterial({ map: bt, bumpMap: bb, bumpScale: 1.2, roughness: 0.62 }), 0, (BOARD_TOP - 0.46) / 2, 0, plateG); board.castShadow = false;
  // 陶器の皿（ろくろで回した形。ふちが少し立ち、下に高台）
  const prof = [[0, 0], [0.3, 0], [0.6, 0], [0.9, 0], [1.2, 0], [1.45, 0.025], [1.62, 0.07], [1.7, RIM_Y], [1.748, 0.078], [1.75, 0.064], [1.5, -0.03], [1.12, -0.07], [1.02, BOARD_TOP], [0, BOARD_TOP]].reverse().map(([r, y]) => new THREE.Vector2(r, y));   // 下から上へ並べる（面の向き・法線が外を向く）
  const plate = mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshPhysicalMaterial({ color: '#e6ded0', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMap: eggEnvLater(), envMapIntensity: 0.55 }), 0, 0, 0, plateG); plate.castShadow = false;
  // 皿とご飯の接地の影（やわらかい丸）
  const blob = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 8, 64, 64, 63); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const shade = (rx, rz, y, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: blob, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 })); m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.y = y; plateG.add(m); return m; };
  shade(2.05, 2.05, BOARD_TOP + 0.004, 0.55); shade(DOME.ax * 1.32, DOME.az * 1.55, 0.05, 0.42);   // ご飯のすその接地の影（ソースの上にも落ちる） shade(DOME.ax * 1.12, DOME.az * 1.22, 0.006, 0.3);
  // ケチャップライス: 米粒の模様と、粒のでこぼこ（bump）。少し油でつやがある
  const rice = (g, w, h, bump) => {
    g.fillStyle = bump ? '#202020' : '#b8441f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const x = hash(i, 31) * w, y = hash(i, 32) * h, a = hash(i, 33) * Math.PI, l = 5 + hash(i, 34) * 3, k = hash(i, 35);
      g.save(); g.translate(x, y); g.rotate(a);
      if (bump) { const gr = g.createRadialGradient(0, 0, 0.5, 0, 0, l); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#303030'); g.fillStyle = gr; }
      else g.fillStyle = k < 0.55 ? '#d8613a' : k < 0.85 ? '#e98a5c' : k < 0.95 ? '#c24a26' : '#f2b08a';
      g.beginPath(); g.ellipse(0, 0, l, 2.6, 0, 0, Math.PI * 2); g.fill();
      if (!bump && k > 0.3) { g.fillStyle = 'rgba(255,225,200,.35)'; g.beginPath(); g.ellipse(-l * 0.2, -0.8, l * 0.5, 0.9, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
  };
  const rt = canvasTex(512, 256, (g, w, h) => rice(g, w, h, false)), rb = canvasTex(512, 256, (g, w, h) => rice(g, w, h, true), false);
  rt.repeat.set(3, 1); rb.repeat.set(3, 1);
  const g = new THREE.SphereGeometry(1, 56, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = (vnoise0(x * 3 + 5, z * 3 + y * 2, 1) - 0.5) * 0.012 * (y > 0.02 ? 1 : 0);   // ご飯の盛りの、なだらかなでこぼこ
    pos.setXYZ(i, x * DOME.ax * (1 + n), y * DOME.h * (1 + n), z * DOME.az * (1 + n));
  }
  g.computeVertexNormals();
  const riceM = mesh(g, new THREE.MeshStandardMaterial({ map: rt, bumpMap: rb, bumpScale: 2.2, roughness: 0.48 }), 0, 0, 0, plateG); 
  const chicken = new THREE.MeshStandardMaterial({ color: '#e7c49a', roughness: 0.55 }), pea = new THREE.MeshStandardMaterial({ color: '#6f9a3a', roughness: 0.35 }), onion = new THREE.MeshStandardMaterial({ color: '#f3e3c4', roughness: 0.4 });
  for (let k = 0; k < 40; k++) {   // 鶏肉・グリーンピース・玉ねぎ（山の表面に）
    const u = hash(k, 3) * 2 - 1, v = hash(k, 7) * 2 - 1; if (u * u + v * v > 0.85) continue;
    const x = u * DOME.ax, z = v * DOME.az, y = domeY(x, z);
    if (k % 3 === 1) mesh(roundBox(0.11, 0.07, 0.09, 0.025), chicken, x, y + 0.012, z, plateG).rotation.set(k, k * 2, 0);
    else if (k % 3 === 2) mesh(new THREE.SphereGeometry(0.042, 10, 8), pea, x, y - 0.01, z, plateG);
    else mesh(new THREE.BoxGeometry(0.08, 0.012, 0.06), onion, x, y - 0.004, z, plateG).rotation.set(0.3, k, 0.2);
  }
  // ケチャップライスの米粒（1粒ずつの細長い粒。油でつやがあり、色に少しむら）。山の地肌は粒の間の影として暗めに
  riceM.castShadow = false; riceM.material.map = null; riceM.material.bumpMap = null; riceM.material.color.set('#a0401f'); riceM.material.roughness = 0.7;
  const NG = 2700, grains = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.4 }), NG);
  grains.receiveShadow = true; grains.castShadow = false; plateG.add(grains);
  const o = new THREE.Object3D(), nn = new THREE.Vector3(), tt = new THREE.Vector3(), gb = new THREE.Vector3(), mm = new THREE.Matrix4(), cc = new THREE.Color();
  const GC = ['#d9603a', '#e2703f', '#cb5230', '#e98a55', '#bd4626', '#efa574'];
  for (let i = 0; i < NG; i++) {
    const r = Math.pow(hash(i, 201), 0.36) * 1.0, a = hash(i, 202) * Math.PI * 2, x = r * Math.cos(a) * DOME.ax, z = r * Math.sin(a) * DOME.az, y = domeY(x, z);
    nn.set(x / DOME.ax ** 2, Math.max(y, 0.02) / DOME.h ** 2, z / DOME.az ** 2).normalize();
    tt.set(hash(i, 203) - 0.5, hash(i, 204) - 0.5, hash(i, 205) - 0.5).cross(nn).normalize(); gb.crossVectors(tt, nn);
    const L = 0.046 + 0.01 * hash(i, 206), Wd = 0.019 + 0.004 * hash(i, 207), Th = 0.016;
    mm.makeBasis(tt.multiplyScalar(L), nn.clone().multiplyScalar(Th), gb.multiplyScalar(Wd)); mm.setPosition(x + nn.x * 0.006, y + nn.y * 0.006, z + nn.z * 0.006);
    grains.setMatrixAt(i, mm);
    const q = hash(i, 208); cc.set(GC[q < 0.3 ? 0 : q < 0.55 ? 1 : q < 0.7 ? 2 : q < 0.85 ? 3 : q < 0.95 ? 4 : 5]); grains.setColorAt(i, cc);
  }
  grains.instanceMatrix.needsUpdate = true;
}

// ボウルと菜箸
const bowl = new THREE.Group(); scene.add(bowl); bowl.position.set(-1.25, 0.25, -1.75);
{
  const g = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const b = mesh(g, new THREE.MeshPhongMaterial({ color: '#d9d4c8', shininess: 50, side: THREE.DoubleSide, flatShading: true }), 0, 0.3, 0, bowl);
  b.scale.y = 0.75;
  const egg = new THREE.Mesh(new THREE.CircleGeometry(0.43, 12), new THREE.MeshStandardMaterial({ color: '#f2ad1a', roughness: 0.15 })); egg.rotation.x = -Math.PI / 2; egg.position.y = 0.22; bowl.add(egg); bowl.userData.egg = egg;
}
const sticks = new THREE.Group(); scene.add(sticks);
{ const m = lam('#c49a64'); for (const dx of [-0.05, 0.05]) { const s = mesh(new THREE.CylinderGeometry(0.018, 0.03, 2.2, 6), m, dx, 1.1, 0, sticks); s.castShadow = true; } }
// フライ返し
const spatula = new THREE.Group(); scene.add(spatula);
{ const m = pho('#b9bec4', 70); const b = mesh(new THREE.BoxGeometry(0.7, 0.02, 0.55), m, 0, 0, 0, spatula); const h2 = mesh(new THREE.BoxGeometry(0.08, 0.06, 1.4), lam('#2a2320'), 0, 0.12, 0.95, spatula); h2.rotation.x = -0.2; }
// 流し込む卵の筋
const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 8), new THREE.MeshStandardMaterial({ color: '#f2ad1a', roughness: 0.15 })); scene.add(stream); stream.visible = false;
// 包丁
const knife = new THREE.Group(); scene.add(knife);
{
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 1.15), new THREE.MeshStandardMaterial({ color: '#d6dade', metalness: 0.9, roughness: 0.28 })); blade.position.set(0, 0.11, 0); knife.add(blade); blade.castShadow = true;
  const hd = new THREE.Mesh(roundBox(0.09, 0.12, 0.8, 0.035), new THREE.MeshStandardMaterial({ color: '#5a3a24', roughness: 0.6 })); hd.position.set(0, 0.17, 0.9); knife.add(hd); hd.castShadow = true;
  knife.visible = false;
}
// ---------- 卵（同じ網の目を、円盤 → 包んだ形 → 開いた形に変える） ----------
const NU = 40, NS = 12, TEX = 128;
function makeTex() { const d = new Uint8Array(TEX * TEX * 4); const t = new THREE.DataTexture(d, TEX, TEX, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; }
const topTex = makeTex(), topRough = makeTex(), botTex = makeTex(), botRough = makeTex();
topTex.colorSpace = botTex.colorSpace = THREE.SRGBColorSpace;
const skinBump = canvasTex(128, 128, (g, w, h) => { const d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const x = i % w, y = Math.floor(i / w), v = 128 + 70 * (vnoise0(x / 9, y / 9, 5) - 0.5) + 40 * (vnoise0(x / 3, y / 3, 6) - 0.5); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); }, false);   // 卵の皮の細かいしわ（皿の上だけ効かせる）
// 卵: 皿の上ではやわらかい卵ほど上がけのつや（clearcoat）が強く、固い卵はつやなし。料理中は 0 に近く、見た目は今までどおり
const topMat = new THREE.MeshPhysicalMaterial({ map: topTex, roughnessMap: topRough, roughness: 1, metalness: 0, side: THREE.FrontSide, clearcoat: 0.0001, clearcoatRoughness: 0.18, normalScale: new THREE.Vector2(0, 0) });
const botMat = new THREE.MeshPhysicalMaterial({ map: botTex, roughnessMap: botRough, roughness: 1, metalness: 0, side: THREE.BackSide, clearcoat: 0.0001, clearcoatRoughness: 0.2, normalScale: new THREE.Vector2(0, 0) });
detailize(topMat, CURD, 0, 0.9, [1.0, 0.84, 0.52]); detailize(botMat, SKIN, 0, 0.8, [1.0, 0.72, 0.26]);
botMat.clearcoatNormalMap = SKIN.nrm; botMat.clearcoatNormalScale = new THREE.Vector2(0, 0); topMat.clearcoatNormalMap = CURD.nrm; topMat.clearcoatNormalScale = new THREE.Vector2(0, 0);
const capMat = new THREE.MeshStandardMaterial({ color: '#f4d77a', roughness: 0.85, side: THREE.DoubleSide, flatShading: true });
let eggEnv = null;
eggEnv = eggEnvLater(); topMat.envMap = botMat.envMap = eggEnv; topMat.envMapIntensity = 1.15; botMat.envMapIntensity = 1.0;
const eggG = new THREE.Group(); scene.add(eggG);
const halves = [1, -1].map(sg => {
  const piv = new THREE.Group(), inner = new THREE.Group(); eggG.add(piv); piv.add(inner);
  const nv = (NU + 1) * (NS + 1), pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
  const xs = [], fs = [], cell = new Int32Array(nv), bump = new Float32Array(nv);
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NS; j++) {
    const v = i * (NS + 1) + j, x = RE * 0.99 * Math.sin(-Math.PI / 2 + Math.PI * i / NU), h = Math.sqrt(Math.max(0, RE * RE - x * x)), z = sg * h * j / NS;
    xs[v] = x; fs[v] = j / NS;
    uv[v * 2] = (x / RE + 1) / 2; uv[v * 2 + 1] = (z / RE + 1) / 2;
    const gx = Math.min(N - 1, Math.max(0, Math.round((x / RE + 1) / 2 * N - 0.5))), gy = Math.min(N - 1, Math.max(0, Math.round((z / RE + 1) / 2 * N - 0.5)));
    cell[v] = gy * N + gx;
    { const za = Math.abs(z); bump[v] = 0.5 + 0.5 * Math.sin(x * 23.1 + za * 9.7) * Math.sin(za * 19.3 - x * 7.9) + 0.25 * Math.sin(x * 41 + za * 37); }   // 左右対称（折り目で左右がぴったり合い、継ぎ目の線が出ない）
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NS; j++) {
    const a = i * (NS + 1) + j, b = a + NS + 1, c = a + 1, d = b + 1;
    if (sg > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const top = new THREE.Mesh(geo, topMat), bot = new THREE.Mesh(geo, botMat); top.castShadow = bot.castShadow = true; top.receiveShadow = true; inner.add(top, bot);
  // 切り口（カチカチで割れたときだけ見える）
  const cpos = new Float32Array((NU + 1) * 2 * 3), cidx = [];
  for (let i = 0; i < NU; i++) { const a = i * 2; cidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const cgeo = new THREE.BufferGeometry(); cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3)); cgeo.setIndex(cidx);
  const cap = new THREE.Mesh(cgeo, capMat); cap.visible = false; cap.castShadow = true; inner.add(cap);
  return { sg, piv, inner, geo, pos, xs, fs, cell, bump, cap, cgeo, cpos };
});
// 流れ出る卵（とろとろの山と、皿にひろがる溜まり）。皿の上はオムレツのねじれ（yaw）に合わせて回す
const yawG = new THREE.Group(); plateG.add(yawG);
const runMat = new THREE.MeshStandardMaterial({ color: '#f0a81c', roughness: 0.1, envMap: eggEnv, envMapIntensity: 1.0 });
// 断面から両側へ垂れる半熟の「舌」（4本）。切り口から山の斜面を下り、皿の溜まりにつながる
const TONGUES = [[-0.45, 1, 0.22, 0.36], [0.15, 1, 0.18, 0.3], [-0.15, -1, 0.2, 0.34], [0.42, -1, 0.17, 0.28]];   // [長さ方向の位置, 向き, 幅, 長さ]。開いた卵のふちから皿へ垂れる
const TU = 14, TV = 6;
const tongues = TONGUES.map(() => {
  const g = new THREE.BufferGeometry(), idx = [];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TU + 1) * (TV + 1) * 3), 3));
  for (let i = 0; i < TU; i++) for (let j = 0; j < TV; j++) { const a = i * (TV + 1) + j, b = a + TV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  g.setIndex(idx); const m = new THREE.Mesh(g, runMat); m.visible = false; m.receiveShadow = true; yawG.add(m); return m;
});
function shapeTongues(k, flow, jig = 0) {   // k: 流れた割合 0〜1。jig: ぷるんと揺れる分
  tongues.forEach((m, n) => {
    const [x0, sd, w0, len] = TONGUES[n], L = len * k * (0.55 + 0.45 * flow), pos = m.geometry.attributes.position;
    m.visible = k > 0.02;
    for (let i = 0; i <= TU; i++) {
      const u = i / TU * L, wu = w0 * (1.25 + 0.4 * flow) * (0.65 + 0.35 * k) * (1 - 0.2 * u / len) * Math.sqrt(Math.max(0, 1 - Math.max(0, (i / TU - 0.55) / 0.45) ** 2));   // 先は丸く
      const z = sd * (Math.sqrt(Math.max(0, RE * RE - x0 * x0)) * 0.82 + u), x = x0 + 0.04 * Math.sin(u * 5 + n);
      for (let j = 0; j <= TV; j++) {
        const v = j / TV * 2 - 1, xx = x + v * wu, base = Math.max(domeY(xx * 0.95, z), 0);
        const th = (0.045 + 0.07 * (1 - 0.5 * u / (len + 0.01))) * (1 + jig) * Math.sqrt(Math.max(0, 1 - v * v));   // 厚く、真ん中が盛り上がる
        const edge = Math.sqrt(Math.max(0, RE * RE - xx * xx)) * 0.98, lift = lerp(0.055, 0.006, smooth((Math.abs(z) - edge + 0.05) / 0.15));   // 卵のふちを越えたら皿の上へ
        pos.setXYZ(i * (TV + 1) + j, xx, base + lift + th * (lift > 0.03 ? 1 : 0.6), z);
      }
    }
    pos.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
  });
}
const puddleGeo = new THREE.CircleGeometry(1, 40, 0, Math.PI * 2);
{ const ps = puddleGeo.attributes.position; for (let i = 1; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i), a = Math.atan2(y, x), k = 1 + 0.13 * Math.sin(5 * a) + 0.08 * Math.sin(9 * a + 1) + 0.05 * Math.sin(14 * a + 2); ps.setXY(i, x * k, y * k); }
  // 溜まりは平たい膜にせず、低く盛り上げる（まわりは丸く落ちる）
  for (let i = 0; i < ps.count; i++) { const r = Math.hypot(ps.getX(i), ps.getY(i)); ps.setZ(i, 0.05 * Math.sqrt(Math.max(0, 1 - (r / 1.2) ** 2))); }
  puddleGeo.computeVertexNormals(); }
const puddle = new THREE.Mesh(puddleGeo, runMat); puddle.rotation.x = -Math.PI / 2; puddle.position.y = 0.006; puddle.receiveShadow = true; yawG.add(puddle); puddle.visible = false;
// 切り口に盛り上がる半熟の卵（低くこんもり、濃い橙〜黄のグラデ、強いつや）
const moundMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.14, envMap: eggEnv, envMapIntensity: 0.8 });   // 中身: 丸く広い照り（細長いすじにしない）   // 中身だけつや（細長いハイライト）
const dryMat = new THREE.MeshLambertMaterial({ color: '#fff0b8' });   // 固まった卵（つやなし）
const FSEG = 28, FRING = 9;
const mound = (() => {
  const g = new THREE.BufferGeometry(), n = 1 + FRING * FSEG, idx = [], col = [];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  for (let r = 0; r < FRING; r++) for (let a = 0; a < FSEG; a++) {
    const a2 = (a + 1) % FSEG, v = 1 + r * FSEG + a, v2 = 1 + r * FSEG + a2;
    if (r === 0) idx.push(0, v2, v); else { const p = v - FSEG, p2 = v2 - FSEG; idx.push(p, p2, v, p2, v2, v); }
  }
  for (let i = 0; i < n; i++) { const rr = i === 0 ? 0 : (1 + Math.floor((i - 1) / FSEG)) / FRING, c = new THREE.Color('#ffae18').lerp(new THREE.Color('#ffcc48'), rr * rr * 0.8); col.push(c.r, c.g, c.b); }
  g.setIndex(idx); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const m = new THREE.Mesh(g, moundMat); m.visible = false; m.castShadow = true; m.receiveShadow = true; yawG.add(m); return m;
})();
// 手前の垂れ: 中身の縁からそのまま続く、幅広で短いしずく形のふくらみ（根元が太く、先が丸く少し太る）。長さと位置をずらした2本
const hiMat = new THREE.MeshBasicMaterial({ color: '#fffaf0', transparent: true, opacity: 0.85 });
const hilite = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), hiMat); hilite.visible = false; yawG.add(hilite);   // 中身の小さな白いハイライト（短い楕円）
let fillTop = 0;
const dripMat = new THREE.MeshPhysicalMaterial({ color: '#ffb424', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, envMap: eggEnv, envMapIntensity: 0.8 });   // 中身と同じ色・つや
const DRIPS = [[-0.04, 0.5, 0.3], [0.3, 0.36, 0.17], [-0.36, 0.28, 0.15]], DU = 18, DV = 10;   // [z, 長さ, 根元の半幅]
const drips = DRIPS.map(() => {
  const g = new THREE.BufferGeometry(), idx = [];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((DU + 1) * (DV + 1) * 3), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((DU + 1) * (DV + 1) * 2), 2));
  for (let i = 0; i < DU; i++) for (let j = 0; j < DV; j++) { const a = i * (DV + 1) + j, b = a + DV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  g.setIndex(idx); const m = new THREE.Mesh(g, dripMat); m.visible = false; m.castShadow = true; yawG.add(m); return m;
});
function shapeDrips(x0, k, show) {
  drips.forEach((m, n) => {
    const [z0, len, w0] = DRIPS[n], L = 0.04 + len * k, ps = m.geometry.attributes.position;
    m.visible = show && k > 0.02; if (!m.visible) return;
    for (let i = 0; i <= DU; i++) {
      const u = i / DU, x = x0 + 0.2 - (L + 0.2) * u;   // 根元は中身の中から。ライスの斜面の上だけ
      const tip = (u > 0.8 ? Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2)) : 1) * (0.55 + 0.45 * smooth(u / 0.35));   // 両端とも丸く
      const w = w0 * (1 - 0.3 * smooth(u / 0.55) + 0.25 * smooth((u - 0.5) / 0.3)) * tip;   // 根元が太く、少しくびれて、先が丸く太る
      for (let j = 0; j <= DV; j++) {
        const v = j / DV * 2 - 1, z = z0 + v * w, th = (0.028 + 0.014 * smooth((u - 0.5) / 0.3)) * tip * Math.sqrt(Math.max(0, 1 - v * v));
        const dy = Math.max(domeY(x * 0.97, z), 0), lift = (0.03 + 0.045 * smooth((u - 0.15) / 0.35)) * Math.min(1, 0.15 + dy / 0.18);
        ps.setXYZ(i * (DV + 1) + j, x, dy + lift + th, z); m.geometry.attributes.uv.setXY(i * (DV + 1) + j, x * 0.7 + 0.3, z * 0.7 + 0.5);   // 斜面に沿って下り、ご飯のすそでは皿の近くまで垂れる（横へ突き出さない）   // 先のほうは皮の上に乗せる（根元は中身になじむ）
      }
    }
    ps.needsUpdate = true; m.geometry.attributes.uv.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
  });
}
// 中身のふくらみ: 割れ目から盛り上がる丘。真ん中が一番高く、縁は丸く落ちる。輪郭は少し波打つ。ライスの形に沿わせる
function shapeFilling(len, wid, H, t, sp) {
  // 中身: 割れ目からあふれて、左右の皮の内側の縁の上とご飯の側面へ垂れる平たい山（真ん中:縁 ≈ 3:1、縁はだらっと下がる）。
  // 手前（-x）に先の丸い垂れを 2 本。表面にゆるい凹凸（つるつるの固まりに見せない）
  const ps = mound.geometry.attributes.position;
  for (let i = 0; i < ps.count; i++) {
    const r = i === 0 ? 0 : (1 + Math.floor((i - 1) / FSEG)) / FRING, a = i === 0 ? 0 : ((i - 1) % FSEG) / FSEG * Math.PI * 2;
    const lobe = Math.exp(-(((a - Math.PI + 0.45) / 0.22) ** 2)) + 0.85 * Math.exp(-(((a - Math.PI - 0.5) / 0.2) ** 2));   // 手前の垂れ 2 本（すそのライスを覆う）
    const wv = 1 + 0.035 * Math.sin(a * 5 + 1.1) * r + 0.025 * Math.sin(a * 3 + 1.3) + 0.0 * lobe;
    const x = Math.max(-DOME.ax * 0.98, Math.min(DOME.ax * 0.98, len * r * Math.cos(a) * wv)), z = wid * r * Math.sin(a) * wv;
    const zE = DOME.az * 0.93 * Math.sqrt(Math.max(0, 1 - (x / DOME.ax) ** 2)), gh = 0.4 * zE;
    const skin = 0.1 * smooth((Math.abs(z) - gh + 0.06) / 0.16);   // 皮の縁の上に乗る
    const prof = r < 0.75 ? 0.33 + 0.67 * (1 - (r / 0.75) ** 2) ** 0.7 : 0.33 * (1 - smooth((r - 0.75) / 0.25));   // 平たい山、縁はだらっと下がる
    const bump = (0.03 * (vnoise0(x * 5 + 2, z * 6, 3) - 0.5) + 0.006 * Math.sin(x * 4 + z * 3 + 0.7)) * (1 - 0.7 * r);   // やわらかい粒のでこぼこ
    const yy = Math.max(domeY(x * 0.97, z), 0) + 0.02 + skin + H * prof + bump; if (i === 0) fillTop = yy;
    ps.setXYZ(i, x, yy, z); mound.geometry.attributes.uv.setXY(i, x * 0.7 + 0.5, z * 0.7 + 0.5);
  }
  mound.geometry.attributes.uv.needsUpdate = true;
  ps.needsUpdate = true; mound.geometry.computeVertexNormals(); mound.geometry.computeBoundingSphere();
}
// ビシャッと崩れた・破れたときにフライパンに広がる生の卵
const panPuddle = new THREE.Mesh(puddleGeo, runMat); panPuddle.rotation.x = -Math.PI / 2; panPuddle.position.y = 0.008; scene.add(panPuddle); panPuddle.visible = false;
// 焦げの煙（灰色のもやが、ゆっくり上る。明るさは急に変えない）
const smokes = [], steams = [];   // steams: 湯気（中に火が入るほど濃く、ゆっくり上る）
{
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex, color: '#8a8580', transparent: true, opacity: 0, depthWrite: false })); scene.add(m); smokes.push(m); }
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); scene.add(m); steams.push(m); }
}

// 卵の色とつや（マスの火の通り → 小さな絵）。マスの間はなめらかにつなぎ、ふわふわ（粒）・炒り卵・焦げの斑は決まった模様で描く
const NEAR = new Int32Array(N * N);
{
  const act = new Set(ACTIVE);
  for (let i = 0; i < N * N; i++) {
    if (act.has(i)) { NEAR[i] = i; continue; }
    let best = 0, bd = 1e9; const x = i % N, y = Math.floor(i / N);
    for (const a of ACTIVE) { const d = (a % N - x) ** 2 + (Math.floor(a / N) - y) ** 2; if (d < bd) { bd = d; best = a; } }
    NEAR[i] = best;
  }
}
const vnoise = (u, v, f, sd) => {   // 決まった値のなめらかなでこぼこ（0〜1）
  const x = u * f, y = v * f, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const h = (a, b) => hash(a + sd * 17, b - sd * 31);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), sx), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), sx), sy);
};
const TX = TEX * TEX, S00 = new Int32Array(TX), S10 = new Int32Array(TX), S01 = new Int32Array(TX), S11 = new Int32Array(TX), WX = new Float32Array(TX), WY = new Float32Array(TX);
const WXU = new Float32Array(TX), FK = new Float32Array(TX), RR2 = new Float32Array(TX), NC = new Float32Array(TX), NF = new Float32Array(TX), NB = new Float32Array(TX);
for (let ty = 0; ty < TEX; ty++) for (let tx = 0; tx < TEX; tx++) {
  const k = ty * TEX + tx, u = (tx + 0.5) / TEX, v = (ty + 0.5) / TEX;
  const gx = Math.min(N - 1.001, Math.max(0, u * N - 0.5)), gy = Math.min(N - 1.001, Math.max(0, v * N - 0.5)), x0 = Math.floor(gx), y0 = Math.floor(gy);
  S00[k] = NEAR[y0 * N + x0]; S10[k] = NEAR[y0 * N + x0 + 1]; S01[k] = NEAR[(y0 + 1) * N + x0]; S11[k] = NEAR[(y0 + 1) * N + x0 + 1]; WX[k] = gx - x0; WY[k] = gy - y0;
  RR2[k] = Math.hypot(u * 2 - 1, v * 2 - 1); WXU[k] = u * 2 - 1;
  { const xx = u * 2 - 1, zz = v * 2 - 1; FK[k] = Math.abs(zz) / Math.sqrt(Math.max(1e-4, 1 - xx * xx)) * (1 - smooth((Math.abs(xx) - 0.88) / 0.08)); }   // 合わせ目（巻いたときのふち）までの割合。両端は除く
  NC[k] = 0.62 * vnoise(u, v, 9, 1) + 0.38 * vnoise(u, v, 19, 2);   // ふわふわの粒の形
  NF[k] = hash(tx * 3.1, ty * 5.7);                                  // 細かいざらつき
  NB[k] = 0.6 * vnoise(u, v, 7, 3) + 0.4 * vnoise(u, v, 15, 4);     // 焼き色の斑
}
const smp = (a, k) => { const wx = WX[k], wy = WY[k]; return (a[S00[k]] * (1 - wx) + a[S10[k]] * wx) * (1 - wy) + (a[S01[k]] * (1 - wx) + a[S11[k]] * wx) * wy; };
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const RAW = [0.99, 0.68, 0.08], HALF = [0.99, 0.82, 0.3], SET = [0.99, 0.92, 0.62], GOLD = [0.93, 0.72, 0.32], BROWN = [0.62, 0.37, 0.15], BURNT = [0.3, 0.18, 0.08];
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function eggColor(v) {   // v: 火の通り
  if (v < 0.45) return mix3(RAW, HALF, Math.max(0, v) / 0.45);
  if (v < 0.85) return mix3(HALF, SET, (v - 0.45) / 0.4);
  if (v < 1.05) return mix3(SET, GOLD, (v - 0.85) / 0.2 * 0.35);
  if (v < 1.3) return mix3(mix3(SET, GOLD, 0.35), BROWN, (v - 1.05) / 0.25);
  return mix3(BROWN, BURNT, clamp01((v - 1.3) / 0.25));
}
const rough = v => lerp(0.04, 0.9, smooth((v - 0.18) / 0.55));
// o: { add: 皿の余熱で中に足す分, inside: 開いて見える内側を生に寄せる分, L: 外から透けて見える中の柔らかさ（0〜1） }
function paintEgg(s, o) {
  const tc = topTex.image.data, tr = topRough.image.data, bc = botTex.image.data, brr = botRough.image.data, { ct, cb, curd, iri } = s;
  const plate = o.plate || 0, add = o.add || 0, inside = o.inside || 0, L = o.L || 0, tear = Math.min(1, o.tear || 0), cook = !!o.cook, ringW = o.ring || 0, burnt = o.burnt || 0, op = o.open || 0, ov = o.openV || 0, oGloss = o.openGloss || 0;
  for (let k = 0; k < TX; k++) {
    let vt = smp(ct, k) + add; const vb = smp(cb, k), cr = smp(curd, k), ir = smp(iri, k), rr = RR2[k], n1 = NC[k], n2 = NF[k];
    // フライパンの上では、中の火の通りを3段で見せる: 生の液（濃い橙・つやつや）→ 半熟の膜（淡い黄・半つや・小さな泡）→ 固まった（白っぽい黄・つやなし）
    const ct0 = vt;
    if (cook) vt = vt < 0.12 ? vt * 1.5 : vt < 0.3 ? 0.18 + (vt - 0.12) * 2.2 : 0.58 + (vt - 0.3) * 1.3;
    // 上: 液のところはつやつやの濃い黄色。混ぜてできた粒は固まった淡い色でつやなし、粒のふちに影
    const m = cr > 0.01 ? sstep(1.0 - 1.25 * cr, 1.16 - 1.25 * cr, n1) : 0;
    let v = lerp(vt, Math.max(vt + 0.25, 0.58) + 0.2 * ir, m);
    v = lerp(v, 0.82 + 0.25 * n2, clamp01(ir * 1.6) * (0.5 + 0.5 * (n2 > 0.45)));   // 炒り卵: ぼろぼろの乾いた粒
    // ふち: 膜ができた輪（淡い色・つやなし）が、底が固まるにつれて内側へ広がる。輪の内側のふちは少し濃い線
    const e = cook ? sstep(1 - ringW - 0.03, 1 - ringW + 0.01, rr) : sstep(0.7, 0.96, rr), sk = sstep(0.36, 0.52, vb);
    v = lerp(v, Math.max(v, lerp(vb * 0.9, 0.64 + (vb - 0.52) * 0.9, sk)), e);
   // まだらを残したまま、ゆっくり卵黄の黄色へ   // 真ん中ほど濃い橙、外ほど黄色   // 開いた内側: 左右とも同じ見た目（中の柔らかさだけで決まる）
    let c = eggColor(v - inside);
    const lump = sstep(0.42, 0.62, n1);
    if (op > 0) c = mix3(c, oGloss ? mix3(mix3([0.97, 0.6, 0.08], [1.0, 0.84, 0.4], 0.3 + 0.2 * lump + 0.3 * FK[k]), [0.98, 0.91, 0.66], sstep(0.55, 0.9, FK[k])) : mix3([0.9, 0.74, 0.4], [0.95, 0.85, 0.54], sstep(0.03, 0.1, FK[k]) * (1 - sstep(0.9, 0.97, FK[k]))), op);   // 開いた内側: トロッは濃い卵黄色の半熟（やわらかい粒・つや）、固めは淡いマットな薄黄   // 開いた皮の内側: 淡いマットな薄黄（縁は焼き色を少し）
    if (burnt > 0) c = mix3(c, o.burntCol || [0.13, 0.09, 0.06], 0.85 * burnt);   // 焦げきった卵は中まで黒い（ハンバーグは焦げ茶）
    if (cook && ringW > 0.02) { const d0 = rr - (1 - ringW - 0.03), ln = sstep(0, 0.015, d0) * (1 - sstep(0.02, 0.04, d0)); c = mix3(c, GOLD, 0.5 * ln); }
    // 小さな泡: 半熟の膜の段階でぽつぽつ出る（位置は決まっている）
    const bub = cook ? sstep(0.06, 0.16, ct0) * (1 - sstep(0.3, 0.4, ct0)) * (1 - m) : 0;
    const isB = bub > 0 && n2 > 0.985 - 0.05 * bub;
    if (isB) c = mix3(c, [1, 0.98, 0.9], 0.55); const sh = lerp(1 - 0.22 * m * (1 - m) * 4 * Math.min(1, cr * 4) - 0.05 * n2 * clamp01(v * 2), 1, op);
    tc[k * 4] = c[0] * 255 * sh; tc[k * 4 + 1] = c[1] * 255 * sh; tc[k * 4 + 2] = c[2] * 255 * sh; tc[k * 4 + 3] = 255;
    tr[k * 4 + 1] = lerp(isB ? 0.05 : rough(v - inside), oGloss ? lerp(0.05, 0.45, sstep(0.45, 0.85, FK[k])) + 0.12 * lump : 0.8, op) * 255;   // 開いた中: 真ん中の半熟はぬれたつや、外側の焼けた膜はつやを抑える tr[k * 4 + 3] = 255;   // 広がった部分は強く光らせない
    // 下（外側）: 火の通りで淡い黄色 → 焼き色の斑 → 焦げ。中がまだ柔らかいと、薄い所が透けてつやが出る
    const b = vb + (vb > 0.8 ? (NB[k] - 0.5) * 0.5 * clamp01((vb - 0.8) / 0.3) : 0) + (n2 - 0.5) * 0.03;
    c = eggColor(b); const thin = clamp01((1.05 - vb) / 0.5), lk = L * thin, seam = sstep(0.8, 0.88, FK[k]);
    c = mix3(c, [0.68, 0.4, 0.15], 0.75 * seam * (1 - 0.7 * op) * (1 - 0.85 * plate));
    if (plate > 0) { c = mix3(c, [1.0, 0.93, 0.58], plate * 0.22 * (1 - sstep(0.1, 0.5, FK[k]))); c = mix3(c, [0.92, 0.64, 0.2], plate * 0.3 * sstep(0.4, 0.9, FK[k])); }   // 上は明るい黄、すそは濃い金色
    if (plate > 0) { const ux = Math.abs(WXU[k]); c = mix3(c, [0.86, 0.6, 0.24], plate * (0.35 * sstep(0.62, 0.95, ux) + 0.22 * sstep(0.6, 0.9, NB[k]) * sstep(0.55, 0.85, FK[k]))); }   // 皿の上: 両端と底の側に、うすい焼き色のむら   // ふち＝巻いたときの合わせ目: 太く濃い焼き色の帯
    c = mix3(c, [1.0, 0.78, 0.2], 0.38 * lk);
    // 破れ: 裂け目から中の生の卵がにじむ（つやのある濃い黄色）
    const tr2 = tear > 0 ? sstep(1.0 - 0.55 * tear, 1.04 - 0.55 * tear, n1) : 0;
    if (tr2 > 0) c = mix3(c, RAW, 0.9 * tr2);
    if (op > 0) c = mix3(c, [0.95, 0.76, 0.31], op * (1 - sstep(0.95, 1.12, vb)));
    if (burnt > 0) c = mix3(c, o.burntCol || [0.12, 0.08, 0.05], 0.92 * burnt);
    if (tr2 > 0 && op > 0) c = mix3(c, RAW, 0.9 * tr2);   // 裂け目は開いても残る   // 開いたら外皮は淡い黄の単色（#F2C14E 前後）。焼けた・焦げた所はそのまま
    bc[k * 4] = c[0] * 255; bc[k * 4 + 1] = c[1] * 255; bc[k * 4 + 2] = c[2] * 255; bc[k * 4 + 3] = 255;
    brr[k * 4 + 1] = lerp(lerp(lerp(lerp(rough(b), 0.12, 0.7 * lk), 0.85, seam), 0.05, tr2), 0.85, op) * 255; brr[k * 4 + 3] = 255;
  }
  topTex.needsUpdate = topRough.needsUpdate = botTex.needsUpdate = botRough.needsUpdate = true;
}

// 形: ph＝{ t, pourK, foldK, bicha, rollK, transK, openP, kind, flow, ysc, lift }
// 円盤 → 奥の半分を手前へ二つに折る（半月）→ ふちに当てて転がす（筒になり、さらに回って合わせ目が下）→ 皿へ → 切って開く
// rollK: 0〜0.5 で半月が筒になり、そこから 1 回転＝1。1 で折り目が上・合わせ目が真下
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
// 皿に乗せたオムレツの形（切る前）。xb: 長い向きの位置、al: 筒の周りの角度（0＝上）。両端がとがった紡錘形で、底はご飯の山に沿って沈む
// 焼き具合で少しだけ形が変わる: 生（湖）はゆるく平たく垂れ、混ぜ足りない（クロス）は薄くしぼんでしわ、混ぜすぎ（そぼろ）はでこぼこ、焼きすぎ（炭）は縮んで角ばる
const OMF = { '': { w: 1, h: 1, lump: 0, fq: 0, sag: 0 }, lake: { w: 1.4, h: 0.5, lump: 0.35, fq: 5, sag: 1.8 }, cloth: { w: 0.85, h: 0.38, lump: 0.8, fq: 17, sag: 0.3 }, soboro: { w: 1.02, h: 1.05, lump: 1, fq: 23, sag: 0 }, volcano: { w: 1.02, h: 1.05, lump: 1.2, fq: 23, sag: 0 }, brick: { w: 0.86, h: 0.86, lump: 0.35, fq: 11, sag: 0 }, flower: { w: 1, h: 0.9, lump: 0.3, fq: 13, sag: 0.2 } };
function omeletOf(xb, al, ph) {
  const F = OMF[ph.formK] || OMF[''], u = xb / RE, pr = Math.pow(Math.max(0, 1 - u * u), 0.62), xo = xb * 0.86;
  const Rz = (0.47 * pr + 0.012) * F.w, H = (0.27 * pr + 0.008) * F.h * ph.ysc / 0.82, ca = Math.cos(al);
  const lump = F.lump * 0.11 * Math.sin(xb * F.fq + al * 3.1) * Math.sin(xb * F.fq * 0.47 - al * 5.3 + 1.3) * pr;
  // 上半分: ご飯の上に置いた丸いカタマリ（横はご飯の斜面に沿って下りて接する）。下半分: ご飯の山の上に沿う底（見えない）
  const z = Rz * Math.sin(al) * (ca >= 0 ? 1 + lump : Math.pow(Math.abs(Math.sin(al)), 3)), sag = F.sag * 0.06 * u * u;
  const y = domeY(xo, z) + 0.006 - sag * (1 - Math.abs(ca)) + (ca > 0 ? H * Math.pow(ca, 0.75) * (1 + lump) - sag * ca : 0);
  return { x: xo, y, z };
}
function shapeEgg(s, ph) {
  const m1 = ease(clamp01(ph.rollK * 2)), phi = Math.PI * 2 * Math.max(0, ph.rollK - 0.5), cph = Math.cos(phi), sph = Math.sin(phi);
  for (const hf of halves) {
    const { pos, xs, fs, cell, bump, sg } = hf;
    for (let v = 0; v < xs.length; v++) {
      const x = xs[v], f = fs[v], h = Math.sqrt(Math.max(0, RE * RE - x * x)), c = cell[v];
      const curd = s.curd[c], ct = s.ct[c], bmp = (curd * 0.09 + s.iri[c] * 0.06 + 0.004) * bump[v];
      // 円盤（フライパンの上）。生の間は表面がゆらゆら揺れる。底に膜ができるとふちが少しめくれて浮く
      const g = ph.pourK, liq = clamp01(1 - ct * 2.6), zz0 = sg * h * f;
      let px = x * g, pz = zz0 * g;
      let py = 0.012 + bmp + liq * 0.008 * Math.sin(ph.t * 1.9 + x * 6.3 + zz0 * 2.1) * Math.sin(ph.t * 1.37 - zz0 * 5.1 + x * 1.3 + 0.7);
      if (ph.lift) py += 0.07 * (0.3 * clamp01(s.cb[c] / 0.36) + 0.7 * smooth((s.cb[c] - 0.36) / 0.16)) * smooth((f - 0.8) / 0.2) * g;
      // 二つに折る（奥の半分 sg<0 が、真ん中の線を軸に手前へ返る）
      if (ph.foldK > 0 && sg < 0) {
        let fphi, spread = 1;
        if (ph.bicha) { const k = ph.foldK; fphi = Math.PI * (0.75 * ease(k * 2.2) - 0.25 * smooth((k - 0.45) / 0.4)); spread = 1 + 0.15 * smooth((k - 0.4) / 0.6); }
        else fphi = Math.PI * ease(ph.foldK * 1.15 - 0.15 * f);
        const zz = pz * spread, yy = py - 0.012;
        pz = zz * Math.cos(fphi) - yy * Math.sin(fphi); py = 0.012 + (-zz) * Math.sin(fphi) + yy * Math.cos(fphi) + 0.03 * smooth(fphi / Math.PI);
        if (ph.bicha) { const k = smooth((ph.foldK - 0.35) / 0.5); py = Math.max(0.012, py) * (1 - 0.5 * k) + k * 0.035 * (0.5 + 0.5 * Math.sin(x * 9 + pz * 7)); px *= spread; }
      } else if (ph.foldK > 0 && ph.bicha) { const sp = 1 + 0.1 * smooth((ph.foldK - 0.5) / 0.5); px *= sp; pz *= sp; }
      // 転がす（半月 → 筒 → 回る）
      if (ph.rollK > 0) {
        const r = h / Math.PI, th = Math.PI * f, xb = x * 0.97;
        const yb = lerp(0.012, (ph.drape ? supp(0, ph.dOff + xb) : domeY(xb * 0.9, 0)) + 0.005, ph.transK);   // 飛んできた卵は、ご飯の横から皿のふちを越えて台へ垂れる
        vA.set(lerp(px, xb, m1), lerp(py, yb + r - r * Math.cos(th), m1) + Math.sin(Math.PI * m1) * 0.1 * f, lerp(pz, sg * r * Math.sin(th), m1));
        if (m1 > 0.5 && f > 0.86) {   // 合わせ目の段差: 巻き終わりのふちが少し外へ出る
          const cy = yb + r, dy = vA.y - cy, dz = vA.z, L2 = Math.hypot(dy, dz) || 1, k2 = 0.035 * smooth((f - 0.86) / 0.1) * (m1 - 0.5) * 2;
          vA.y += dy / L2 * k2; vA.z += dz / L2 * k2;
        }
        if (phi > 0) { const cy = yb + r, dy = vA.y - cy, dz = vA.z; vA.y = cy + dy * cph - dz * sph; vA.z = dy * sph + dz * cph; }
        vA.y = yb + (vA.y - yb) * ph.ysc;   // 中が柔らかいと少しつぶれ、ぷるんと揺れる
        if (ph.twist) {   // 斜めに振った卵: 長い向きにねじれて、片方の端がとがる（ドリル）
          const w = (xb / RE + 1) / 2, tq = 1 - 0.9 * ph.taper * smooth((w - 0.2) / 0.8), cy = yb + r * ph.ysc, ang = ph.twist * xb / RE, dy = (vA.y - cy) * tq, dz = vA.z * tq, ca = Math.cos(ang), sa = Math.sin(ang);
          vA.y = yb + r * ph.ysc * tq + dy * ca - dz * sa; vA.z = dy * sa + dz * ca;
        }
        if (ph.cover > 0) {   // 皿の上（切る前）: フライパンで巻いたオムレツ（紡錘形でふっくらしたカタマリ）がご飯の山の上に乗る。ご飯は見えたまま。切って初めて開いてご飯を覆う（下の op）
          const cy = yb + r * ph.ysc, al = Math.atan2(vA.z, vA.y - cy), O = omeletOf(xb, al, ph);
          vA.set(lerp(vA.x, O.x, ph.cover), lerp(vA.y, O.y, ph.cover), lerp(vA.z, O.z, ph.cover));
        }
        const op = ph.openP;   // トロッ: 切り口の縁が外へ倒れてライスの斜面に沿って垂れる。開ききらない: 形は変えず少し倒すだけ（pose）
        if (op > 0) {
          // 開いた形: 折り目（上）で切ると、半分ずつ外へ倒れて内側が上を向く（合わせ目は真ん中の下に残る）
          // 広がるのはチキンライスの幅の約1.15倍まで。ふちは丸く厚みを持ってライスのすそで止まる（皿に平たく広げない）
          const xt = xb * 0.98, zE = DOME.az * 0.93 * Math.sqrt(Math.max(0, 1 - (xt / (DOME.ax * 1.0)) ** 2)), zO = DOME.az * 1.2 * Math.sqrt(Math.max(0, 1 - (xt / (DOME.ax * 1.06)) ** 2));   // ライスのすそは 2 割ほど見える
          const gh = 0.4 * zE * smooth(op) * smooth((1 - Math.abs(xt) / DOME.ax) / 0.2), zd = -sg * (gh + (zO - gh) * (1 - f)), base = supp(xt * 0.97, zd);   // 真ん中に割れ目（皮の全幅の約4割）を残す
          const rim = f < 0.16 ? 0.03 + 0.07 * Math.sin(Math.PI / 2 * f / 0.16) : f > 0.84 ? 0.05 + 0.05 * Math.sin(Math.PI / 2 * (1 - f) / 0.16) : 0.1 - 0.05 * smooth((f - 0.16) / 0.68);   // 両方の縁を丸く厚く   // ふちの丸いふくらみ（厚み）→ 上は皮の厚み
          const tipK = xt < 0 ? smooth((1 - Math.abs(xt) / DOME.ax) / 0.4) : 1;   // 手前の端は薄く低く（垂れの下へ逃がす）
          const yd = base - 0.03 * (1 - tipK) + rim * (0.2 + 0.8 * tipK) + bmp * 0.12 * (1 - smooth((f - 0.8) / 0.2));   // 皮のすじは控えめ
          const q2 = smooth(op * 1.25 - 0.25 * f);   // 皮が左右へ倒れる（外側から先に）
          vB.set(lerp(vA.x, xt, q2), lerp(vA.y, yd, q2) + Math.sin(Math.PI * q2) * 0.1 * (1 - f), lerp(vA.z, zd, q2));
          vA.copy(vB);
        }
        px = vA.x; py = vA.y; pz = vA.z;
      }
      pos[v * 3] = px; pos[v * 3 + 1] = py; pos[v * 3 + 2] = pz;
    }
    hf.geo.attributes.position.needsUpdate = true; hf.geo.computeVertexNormals(); hf.geo.computeBoundingSphere();
    if (hf.sg < 0) {   // 二つの半分が重なる真ん中の線は、法線をそろえて継ぎ目を消す
      const A = halves[0].geo.attributes, B = hf.geo.attributes;
      for (let i = 0; i <= NU; i++) for (const v of [i * (NS + 1), i * (NS + 1) + NS]) { if (Math.abs(A.position.getY(v) - B.position.getY(v)) + Math.abs(A.position.getZ(v) - B.position.getZ(v)) > 0.01) continue;
        const nx = A.normal.getX(v) + B.normal.getX(v), ny = A.normal.getY(v) + B.normal.getY(v), nz = A.normal.getZ(v) + B.normal.getZ(v), l = Math.hypot(nx, ny, nz) || 1;
        A.normal.setXYZ(v, nx / l, ny / l, nz / l); B.normal.setXYZ(v, nx / l, ny / l, nz / l); }
      A.normal.needsUpdate = B.normal.needsUpdate = true;
    }
    if (hf.cap.visible) {   // 切り口（筒の縦の面。カチカチで割れたときだけ）
      for (let i = 0; i <= NU; i++) {
        const x = RE * 0.99 * Math.sin(-Math.PI / 2 + Math.PI * i / NU), h = Math.sqrt(Math.max(0, RE * RE - x * x)), r = h / Math.PI, xb = x * 0.97, yb = domeY(xb * 0.9, 0) + 0.005;
        hf.cpos.set([xb, yb + 0.01, 0, xb, yb + (2 * r - 0.01) * ph.ysc, 0], i * 6);
      }
      hf.cgeo.attributes.position.needsUpdate = true; hf.cgeo.computeVertexNormals(); hf.cgeo.computeBoundingSphere();
    }
  }
}

// ---------- 音（その場で合成。動画では OfflineAudioContext に同じ音を並べる） ----------
let ac = null, recAudio = null, at0 = 0;
function audio() { if (REC) return null; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; }
const A = () => recAudio || ac;
const base = () => recAudio ? at0 : ac.currentTime;
const nrand = (() => { let a = 12345; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
function tone(f, at, dur, vol, type = 'sine', f2) {
  const c = A(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = base() + at;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(at, dur, vol, f0, f1, q = 1.2, type = 'bandpass') {
  const c = A(); if (!c) return;
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) { const n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = nrand() * 2 - 1; noiseBuf = b; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = base() + at;
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 3)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination); s.start(t, (at * 7.3) % 0.8); s.stop(t + dur + 0.02);
}
function sfx(name, k = 0) {
  if (!A()) return;
  if (name === 'sz2') { const a = k[0], d = k[1]; noise(0, 0.2, 0.03 + 0.1 * a, 5200 + 2600 * d, 4800 + 2600 * d, 0.6, 'highpass'); noise(0, 0.2, (0.02 + 0.05 * a) * (1 - 0.6 * d), 2400 - 900 * d, 2600 - 900 * d, 0.8); if (d > 0.4) tone(3200 + 900 * d, 0.05 * d, 0.012, 0.02 * a * d, 'triangle'); }   // 中が固まって乾いてくると、高くパチパチした音に
  if (name === 'sz') { noise(0, 0.2, 0.03 + 0.1 * k, 5200, 4800, 0.6, 'highpass'); noise(0, 0.2, 0.02 + 0.05 * k, 2400, 2600, 0.8); }   // じゅう（0.1秒ごとに重ねる。火が強いほど大きい）
  if (name === 'pour') { noise(0, 0.5, 0.35, 700, 300, 1.5); noise(0.05, 0.6, 0.25, 5000, 4000, 0.5, 'highpass'); }
  if (name === 'stir') { noise(0, 0.06, 0.08, 1800, 1200, 2); tone(900 + k * 200, 0, 0.03, 0.02, 'triangle'); }
  if (name === 'fold') { noise(0, 0.18, 0.2, 500, 250, 1); tone(140, 0, 0.18, 0.15, 'sine', 90); }
  if (name === 'place') { tone(110, 0, 0.2, 0.25, 'sine', 70); noise(0, 0.08, 0.15, 900, 400, 1); }
  if (name === 'knife') { noise(0, 0.22, 0.18, 3000, 6000, 3); }
  if (name === 'toro') { tone(210, 0, 0.5, 0.12, 'sine', 120); noise(0.05, 0.6, 0.12, 400, 200, 2); }
  if (name === 'beta') { noise(0, 0.5, 0.35, 500, 150, 1); tone(100, 0, 0.4, 0.2, 'sine', 50); }
  if (name === 'knock') { tone(520 + k * 80, 0, 0.07, 0.22, 'triangle', 380); noise(0, 0.03, 0.15, 2500, 1800, 3); }
  if (name === 'ton') { tone(150 + k * 120, 0, 0.12, 0.1 + 0.2 * k, 'sine', 90); noise(0, 0.06, 0.06 + 0.2 * k, 900, 500, 1.5); }   // 卵がふちに当たって転がる
  if (name === 'swish') { noise(0, 0.12, 0.05 + 0.08 * k, 1200, 2400, 0.8); }
  if (name === 'kata') { tone(180, 0, 0.25, 0.12, 'sine', 140); }
  if (name === 'clank') { tone(1900, 0, 0.22, 0.05 + 0.12 * k, 'triangle', 1750); tone(2870, 0, 0.14, 0.03 + 0.06 * k, 'sine'); noise(0, 0.05, 0.08 + 0.2 * k, 3200, 2200, 2); }   // 包丁が炭にはね返る
  if (name === 'crumble') { noise(0, 0.7, 0.28, 900, 260, 0.8); noise(0.08, 0.5, 0.12, 2600, 1200, 1); }   // そぼろが崩れる
  if (name === 'flap') { noise(0, 0.35, 0.22, 500, 1600, 0.7); }   // 薄い膜がぺらっと広がる
  if (name === 'tobi') { noise(0, 0.35, 0.2, 800, 2000, 0.7); tone(130, 0.55, 0.2, 0.3, 'sine', 70); noise(0.55, 0.15, 0.25, 700, 300, 1); }
}

// ---------- 進行 ----------
let st = null, fx = null, replay = null;
let best = null; try { best = Number(localStorage.getItem('omurice-best')) || null; } catch (e) { /* 保存できない環境 */ }
const VIEW_PAN = { p: new THREE.Vector3(0, 5.9, 2.75), l: new THREE.Vector3(0, -0.1, 0.55), fov: 44 };
const VIEW_ROLL = { p: new THREE.Vector3(0, 4.3, 3.9), l: new THREE.Vector3(0, -0.1, -0.15), fov: 44 };
const VIEW_PLATE = { p: new THREE.Vector3(P.x, 3.3, 5.0), l: new THREE.Vector3(P.x, 0.25, 0.1), fov: 48 };
const CUT_PAUSE = 0.15;
const LAND = new THREE.Vector3(0.3, -0.38, -2.07);   // 飛び出した卵が落ちる所（コンロの向こうの台）
const VIEW_CUT = { p: new THREE.Vector3(P.x + 0.1, 3.1, 3.55), l: new THREE.Vector3(P.x, 0.35, 0.05) };   // 切るときは斜め上から少し低めへ寄る
function newGame(knob = 0.55) {   // つまみは中火くらいから
  st = newState(knob);
  fx = { pourT: -9, foldT: -9, plateT: -9, cutT: -9, endT: -9, res: null, bicha: false, tobi: false, yabure: false, koge: false, trail: [], rollVis: 0, eVis: 0, impT: -9, impV: 0, wobT: -9, wobK: 0, tool: 'stick', stick: null, spat: null, lastSz: -9, lastStir: -9, prevCell: null,
    lastBin: null, placed: false, ended: false, fromUrl: false, knobDrag: false, foldDrag: null, from: new THREE.Vector3(), burn: 0, look: null, lookT: -9 };
  halves.forEach(h => { h.piv.position.set(0, 0, 0); h.piv.rotation.set(0, 0, 0); h.inner.position.set(0, 0, 0); h.cap.visible = false; });
  tongues.forEach(m => m.visible = false); mound.visible = false; puddle.visible = false; knife.visible = false; panPuddle.visible = false;
  fx.pre = null; fx.dk = null; eggG.scale.set(1, 1, 1); halves.forEach(h => { h.inner.scale.setScalar(1); h.inner.visible = true; }); hideDish();
}
// 皿に移る（または結果URLで始まる）ときに、何に化けるかを決める（切ったときと同じ判定。乱数なし）
function setDish(r) { fx.pre = r; fx.dk = plateOf(r); fx.sndDone = {}; if (fx.dk.k === 'futomaki') buildRoll(fx.dk.d); }
function addIn(s) { return (s.mode === 'plate' || s.mode === 'done') && s.fold && !s.fixedRes && fx.plateT > -8 ? residAdd(s.fold, (s.mode === 'done' ? s.cutT : s.t) - s.plateT) : 0; }
// 起きたこと（logic の ev）を、見た目と音に回す。queue があれば音はそこへ（動画用）
function drain(queue) {
  const s = st;
  const snd = (t, name, k) => queue ? queue.push({ t, name, k }) : sfx(name, k);
  for (const e of s.ev) {
    if (e.k === 'pour') { fx.pourT = e.t; snd(e.t, 'pour'); }
    if (e.k === 'fold') { fx.foldT = e.t; fx.broken = !!e.broken; snd(e.t + 0.25, e.broken ? 'beta' : 'fold'); if (!REC) setMsg(e.broken ? '底の膜が足りず、折ったら崩れた。このまま返す' : rollHint()); }
    if (e.k === 'bicha') { fx.foldT = e.t; fx.bicha = true; fx.res = s.fixedRes || s.res; s.res = fx.res; fx.cutT = e.t; snd(e.t + 0.35, 'beta'); }
    if (e.k === 'imp') { (window.__imps = window.__imps || []).push([+e.t.toFixed(2), +e.v.toFixed(2), +e.g.toFixed(2)]); fx.impT = e.t; fx.impV = e.v; fx.wobT = e.t + 0.15; fx.wobK = Math.min(1, e.v / 5); snd(e.t, 'ton', Math.min(1, e.v / 7)); }
    if (e.k === 'tobi' || e.k === 'yabure' || e.k === 'koge') {
      fx[e.k] = true; fx.res = s.fixedRes || s.res; s.res = fx.res; fx.cutT = e.t + (e.k === 'tobi' ? 0.9 : 0.3); fx.endT = e.t; fx.from.copy(eggG.position);   // 結果の帯は落ちてから
      snd(e.t + 0.05, e.k === 'tobi' ? 'tobi' : 'beta');
    }
    if (e.k === 'rolled') { fx.plateT = e.t; fx.from.copy(eggG.position); setDish(s.fixedRes || judge({ ...s.fold, rollT: s.rollT, add: residAdd(s.fold, RESID_T), off: 0 })); if (e.flew) { fx.flew = true; fx.flyT = s.t; snd(s.t + 0.05, 'tobi'); } if (!REC) setMsg(e.flew ? '強すぎて飛び出した' : '皿へ移して、包丁を入れる'); }
    if (e.k === 'cut') {
      fx.cutT = e.t + CUT_PAUSE; fx.res = s.res; snd(e.t - 0.3, 'knife');   // 包丁が抜けてから少し間をおいて開く
      const r = s.res, K = plateOf(r).k, plain = ['', 'drill', 'drape', 'old'].includes(K);
      if (plain && (r.kind === 'toro' || r.kind === 'usu')) snd(e.t + 0.3, 'toro');
      if (plain && r.kind === 'beta') snd(e.t + 0.25, 'beta');
      if (plain && r.kind === 'kata') snd(e.t + 0.3, 'kata');
      if ((plain && r.kind === 'kachi') || K === 'ball' || K === 'hamburg') { [0.35, 0.62, 0.78, 0.95, 1.08, 1.2, 1.3].slice(0, K === 'ball' ? 5 + Math.round(2 * plateOf(r).d) : 5).forEach((d, i) => snd(e.t + d + (i % 2) * 0.04, 'knock', i % 3)); }
      if (K === 'soboro' || K === 'volcano') snd(e.t + 0.15, 'crumble');
      if (K === 'lake') snd(e.t + 0.25, 'beta');
      if (K === 'cloth') snd(e.t + 0.08, 'flap');
      if (K === 'flower') snd(e.t + 0.12, 'toro');
      if (K === 'futomaki' && plateOf(r).d > 0.5) [0.3, 0.55].forEach((d, i) => snd(e.t + d, 'knock', i)); else if (K === 'futomaki') for (let i = 0; i < rollSl.length; i++) snd(e.t + 0.45 + i * 0.09, 'ton', 0.35);
      halves.forEach(h => h.cap.visible = K === 'ball' || K === 'hamburg' || (K === 'old' && r.kind === 'kachi'));
    }
  }
  s.ev.length = 0;
  // 包丁がはね返る音（炭のレンガ・フリスビー）。フリスビーは当たってから、コインのように回って鳴りやむ
  if (s.mode === 'plate' && fx.dk) {
    const kw = s.t - s.plateT - TRANSFER, K = fx.dk.k;
    const plan = K === 'brick' ? [[2.3, 'clank', 1], [2.85, 'clank', 0.45]] : K === 'frisbee' ? [[2.3, 'clank', 0.8], ...[0.5, 0.86, 1.14, 1.36, 1.54, 1.68, 1.79, 1.87, 1.93].map((d, i) => [2.3 + d, 'knock', i % 3])] : [];
    for (const [at, nm, kk] of plan) if (kw >= at && !fx.sndDone[at]) { fx.sndDone[at] = 1; snd(s.t, nm, kk); }
  }
  if ((s.mode === 'cook' || s.mode === 'roll') && s.t - fx.lastSz >= 0.1) { fx.lastSz = s.t; snd(s.t, 'sz2', [fireOf(s.pan) * clamp01((s.t - fx.pourT) / 0.4), clamp01(((fx.look ? fx.look.inner : 0) - 0.05) / 0.35)]); }
  if (s.mode === 'plate' && !fx.placed && s.t - s.plateT >= TRANSFER) { fx.placed = true; fx.wobT = s.t; fx.wobK = 1; snd(s.t, 'place'); }
}
const ready = s => s.mode === 'plate' && s.t - s.plateT >= TRANSFER;
const setMsg = t => { const m = document.getElementById('msg'); if (m) m.textContent = t; };
const rollHint = () => TOUCH ? '指を下へ払って転がす。合わせ目が下になったら「完成」' : '下へドラッグして転がす（キーは ↑ を押して離す）。合わせ目が下になったら「完成」（Enter）';
// 中の柔らかさ（外から見える揺れ・つや用。0＝固い〜1＝とろとろ）
function softness(s) {
  if (s.fixedRes) return clamp01((TUNE.toro + 0.06 - (s.fixedRes.H - s.fixedRes.add + addIn(s))) / 0.45);
  const f = fx.look || look(s); return clamp01((TUNE.toro + 0.06 - (f.inner + 0.8 * f.iri + addIn(s))) / 0.45);
}

// ---------- 姿勢 ----------
const camP = new THREE.Vector3(), camL = new THREE.Vector3();
function phase(s) {
  const t = s.t;
  const pourK = s.mode === 'ready' ? 0 : ease((t - fx.pourT) / 0.7);
  const foldK = fx.foldT > -8 ? clamp01((t - fx.foldT) / (fx.bicha ? 1.0 : 0.6)) : 0;
  // 転がる量: logic の roll を少し遅れて追う（当たってから 0.3 秒ほどで回りきる）
  if (s.mode === 'roll' || fx.tobi || fx.yabure || fx.koge) fx.rollVis += (s.roll - fx.rollVis) * 0.22;
  else if (s.mode === 'plate' || (s.mode === 'done' && !fx.bicha)) fx.rollVis += (s.roll - fx.rollVis) * 0.3;
  const transK = fx.plateT > -8 ? smooth((t - fx.plateT) / TRANSFER) : 0;
  let openP = 0, kind = null, flow = 0;
  if (fx.res && !fx.bicha && !fx.tobi && !fx.yabure) {
    const r = fx.res, k = t - fx.cutT; kind = r.kind; flow = r.flow;
    if (kind === 'toro') openP = smooth(k / 0.4) + 0.06 * Math.sin(Math.PI * clamp01((k - 0.3) / 0.35));   // 一気に 0.4 秒で開き、少し行きすぎて戻る   // 割れる 0.2 秒 → 皮が倒れる 0.55 秒（少し行きすぎて戻る）   // パカッと 0.4 秒で倒れ、少し行きすぎて戻る   // 皮が左右へ倒れるのに約0.85秒（出だしは重く、終わりに少し行きすぎて戻る）   // とろっと重く開き、少しだけ行きすぎて戻る
    else if (kind === 'beta') openP = smooth((k - 0.05) / 0.35);
    else if (kind === 'kata') openP = smooth(k / 0.5);   // 固め: 少し重く開く（垂れない）
  }
  const DK = dk(); if (!['', 'old'].includes(DK.k)) openP = 0;   // ドリルは開かず、ねじれたまま   // 別のものに化けたときは、ふつうには開かない
  // 中が柔らかいほど、少しつぶれて、当たったり置いたりしたときにぷるんと揺れる
  const soft = fx.rollVis > 0.3 ? softness(s) : 0, wk = t - fx.wobT;
  const wob = wk > 0 && wk < 2 ? 0.16 * soft * fx.wobK * Math.exp(-wk / 0.4) * Math.sin(wk * 21) : 0;
  const cs0 = cutStyle(fx.res), kc0 = fx.res && s.mode === 'done' ? t - fx.cutT : -1;
  const ysc = (cs0 === 'iri' && kc0 > 0 ? 1 - 0.85 * smooth(kc0 / 0.7) : 1) * (fx.plateT > -8 ? 0.82 : 1) * (1 - 0.1 * soft) * (1 + wob) * (fx.yabure ? 1 - 0.45 * smooth((t - fx.endT) / 0.5) : 1) * (fx.res && fx.res.kind === 'beta' && !fx.bicha ? 1 - 0.55 * smooth((t - fx.cutT) / 1.2) : 1) * (DK.k === 'drape' && kc0 > 0 ? 1 - 0.32 * visc(kc0 / 2.5) : 1);   // 薄焼き卵: 包丁を入れると、ぺらっとご飯にへばりつく   // 生すぎ: 包丁を入れたとたん、しぼんで流れる
  const drape = DK.k === 'drape' && fx.plateT > -8 ? 1 : 0, dOff = 1.15 + (kc0 > 0 ? 0.28 * visc(kc0 / 2.5) : 0);   // 垂れ下がった卵は、切るとさらにずり落ちる
  const tw = DK.k === 'drill' ? transK : 0;   // 開いてもねじれを残す
  return { t, pourK, foldK, bicha: fx.bicha, rollK: fx.rollVis, transK, openP, kind, flow, ysc, lift: s.mode === 'cook' || s.mode === 'ready', soft, drape, dOff, twist: tw * Math.sign(s.yaw || 1) * (12 + 5 * DK.d), taper: tw, formK: DK.k, cover: ['', 'old', 'soboro', 'volcano', 'lake', 'cloth', 'flower', 'brick'].includes(DK.k) && !fx.flew ? transK : 0 };   // 切る前は、化けるものも成功と同じ形（包丁を入れて初めて化ける）
}
function pose() {
  const s = st, t = s.t;
  if (s.mode === 'cook' || s.mode === 'roll' || t - fx.lookT > 0.25) { fx.look = look(s); fx.lookT = t; }
  const ph = phase(s), DK = dk(); lightPlate(ph.transK);
  // 切って開いた内側: トロッは中の半熟の層をつやのある濃い色で見せる（流れ出る分だけ生に寄せる）
  const rr = fx.res, ins = rr && !fx.bicha && (rr.kind === 'toro' || rr.kind === 'beta') ? 0.04 * smooth((t - fx.cutT - 0.1) / 1.4) : rr && rr.kind === 'kata' ? -0.18 * smooth((t - fx.cutT - 0.1) / 0.6) : 0;   // 開ききらない: 断面は乾いた淡い色
  // 卵の絵の描き直しは、変わっている間だけ（フライパンの上は 1/30 秒ごと、皿の上は 0.1 秒ごと、開く間は毎回）
  const cookV = s.mode === 'cook' || s.mode === 'ready', opening = fx.res && t - fx.cutT < 1.6, gap = cookV || s.mode === 'roll' ? 1 / 30 : opening ? 0 : 0.1;
  if (fx.paintT == null || t - fx.paintT >= gap || t < fx.paintT) {
    fx.paintT = t;
    const ring = cookV ? Math.min(0.5, 0.04 + 0.6 * clamp01((fx.look.p10 - 0.2) / 0.6)) : 0;
    const runny = rr && (rr.kind === 'toro' || rr.kind === 'beta'), opn = rr && !fx.bicha && ['toro', 'beta', 'kata'].includes(rr.kind) && !rr.broken && ['', 'old'].includes(DK.k) ? smooth((t - fx.cutT) / 0.3) : 0;
    topMat.envMapIntensity = lerp(1.15, runny ? 0.95 : 0.45, opn); botMat.envMapIntensity = lerp(1.0, 0.5, opn);   // 開いたら外皮・中とも大きな照り返しを抑える
    const bsrc = rr ? rr.brown : s.fold ? s.fold.brown : 0;
    if (DK.k === 'hamburg') capMat.color.set('#6b3a1a'); else capMat.color.set('#f4d77a').lerp(new THREE.Color('#140d08'), 0.95 * ((rr && rr.stuck) || (s.fold && s.fold.stuck) ? 1 : clamp01((bsrc - 0.3) / 0.6)));   // 割れた断面も、焦げきったものは黒っぽい
    const stk = (rr && rr.stuck) || (s.fold && s.fold.stuck) || (s.fixedRes && s.fixedRes.stuck);
    paintEgg(s, { plate: ph.transK, burntCol: DK.k === 'hamburg' ? [0.3, 0.15, 0.06] : DK.k === 'ball' ? [0.74, 0.68, 0.55] : null, burnt: s.mode === 'plate' || s.mode === 'done' ? (DK.k === 'hamburg' ? 0.9 * ph.transK : DK.k === 'ball' ? 0.6 * ph.transK : stk ? 1 : clamp01((bsrc - 0.3) / 0.6)) : 0, add: addIn(s), inside: ins, L: fx.rollVis > 0.3 ? ph.soft : 0, cook: cookV, ring, open: opn, fill: runny ? [1.0, 0.8, 0.27] : [0.98, 0.9, 0.62], openGloss: runny ? 1 : 0, tear: s.fixedRes ? s.fixedRes.tear : s.mode === 'plate' || s.mode === 'done' ? (s.fold && s.fold.tear) || s.tear : s.tear });
  }
  // 皿の上の卵のつや: やわらかい卵ほど上がけのつやが強く、皮のしわも見える。固い・焦げた卵はつやなし
  { const pk = ph.transK, sf = ph.soft, dry = ['brick', 'frisbee', 'hamburg', 'volcano', 'ball'].includes(DK.k) ? 0 : 1;
    topMat.clearcoat = Math.max(0.0001, pk * (0.35 + 0.6 * sf) * dry); botMat.clearcoat = Math.max(0.0001, pk * (0.1 + 0.8 * sf) * dry); const opn2 = fx.res && !fx.bicha && s.mode === 'done' ? smooth((t - fx.cutT) / 0.3) : 0;
    botMat.normalScale.setScalar(pk * 0.1); botMat.userData.det.value = pk; topMat.normalScale.setScalar(pk * opn2 * 0.07); topMat.userData.det.value = pk * opn2;
    botMat.clearcoatNormalScale.setScalar(pk * 0.04); topMat.clearcoatNormalScale.setScalar(pk * opn2 * 0.05); botMat.clearcoatRoughness = lerp(0.2, 0.14, pk); }
  shapeEgg(s, ph);
  // フライパン: 返すときは手に合わせて前後（と少し左右）に動き、動きの勢いで少し傾く
  const inRoll = s.mode === 'roll' || fx.tobi || fx.yabure || fx.koge || (fx.flew && t < fx.plateT);
  const panZ = inRoll ? s.pz : 0, panX = inRoll ? s.px : 0;
  panG.position.set(panX, 0, panZ);
  panG.rotation.x = inRoll ? Math.max(-0.12, Math.min(0.12, -s.az * 0.0012)) : 0;
  // 卵の置き場所: フライパン（折ったら奥へ寄せる）→ 皿（弧を描いて移る）
  const k = ph.transK, m1 = ease(clamp01(fx.rollVis * 2));
  if (fx.foldT > -8 && !fx.bicha) fx.eVis = lerp(0, s.e, smooth((t - fx.foldT - 0.4) / 0.35));
  const ik = t - fx.impT, hop = ik >= 0 && ik < 0.35 ? Math.sin(Math.PI * ik / 0.35) * 0.3 * Math.min(1, fx.impV / 6) : 0;
  const ex = panX, ez = panZ + fx.eVis + 0.34 * m1, ey = hop;
  eggG.scale.set(1, 1, 1);
  if (fx.plateT > -8 && DK.k === 'drape') {   // 飛び出した卵: フライパンから大きく弧を描いて、皿のふちに着地する
    const t0 = fx.flyT ?? fx.plateT - FLY_DELAY, u = clamp01((t - t0) / (fx.plateT + TRANSFER - t0));
    vB.set(0, 0, 1.15).applyAxisAngle(UPV, PLATE_ROT + s.yaw).add(P);
    eggG.position.set(lerp(fx.from.x, vB.x, u), lerp(fx.from.y, vB.y, u) + 2.6 * Math.sin(Math.PI * u), lerp(fx.from.z, vB.z, u));
    eggG.rotation.set(-Math.PI * 2 * ease(u), lerp(s.yaw, PLATE_ROT + s.yaw - Math.PI / 2, smooth(u)), 0, 'XYZ');
  } else if (fx.plateT > -8) {
    fx.sink = 0; if (['', 'old'].includes(DK.k)) eggG.scale.set(1, 1, lerp(1, 1.12, smooth(ph.openP)));   // 皿の上の形はご飯にかぶさる毛布の形（shapeEgg の cover）
    else if (DK.k === 'drill') eggG.scale.set(1, lerp(1, 0.86, k), lerp(1, 1.62, k));   // 皿の上ではご飯の山にかぶさる楕円（ご飯はすそだけ見える。開くにつれて元へ）   // 皿の上ではご飯をほぼ覆う太さに（開くにつれて元へ）
    if (DK.k === 'hamburg') eggG.scale.set(lerp(1, 0.84, k), lerp(1, 0.74, k), lerp(1, 1.34, k));   // 焦げ茶の平たい楕円（ハンバーグの形）
    if (DK.k === 'soboro' || DK.k === 'volcano') eggG.scale.set(lerp(1, 1.08, k), lerp(1, 1.28, k), lerp(1, 1.22, k));   // 混ぜすぎた卵は、ふくらんだ雲のよう
    const src = fx.flew ? LAND : fx.from;   // 飛び出したとき（古い結果）は、落ちた所から拾って皿へ
    eggG.position.set(lerp(src.x, P.x, k), lerp(src.y, P.y, k) + Math.sin(Math.PI * k) * 1.2 - (fx.sink || 0), lerp(src.z, 0, k));
    eggG.rotation.set(fx.flew ? lerp(-Math.PI, 0, k) : 0, lerp(s.yaw, PLATE_ROT + s.yaw, k), 0, 'XYZ');
  } else {   // フライパンが傾いたら、卵もいっしょに傾ける（フライパンの底にめりこまないように）
    const th = panG.rotation.x;
    eggG.position.set(ex, ey - (ez - panZ) * Math.sin(th), panZ + (ez - panZ) * Math.cos(th));
    eggG.rotation.set(th, fx.foldT > -8 ? s.yaw * smooth((t - fx.foldT) / 0.6) : 0, 0, 'YXZ');
  }
  // 飛び出した（続ける）: 奥のふちを越えて、コンロの向こうの台に落ち、少しして拾われて皿へ
  if (fx.flew && t < fx.plateT && DK.k !== 'drape') {
    const k1 = t - fx.flyT, q = clamp01(k1 / 0.7), bq = clamp01((k1 - 0.7) / 0.35);
    eggG.position.set(lerp(fx.from.x, LAND.x, q), lerp(fx.from.y, LAND.y, q) + 1.1 * Math.sin(Math.PI * q) + 0.12 * Math.sin(Math.PI * bq), lerp(fx.from.z, LAND.z, q) - 0.12 * bq);
    eggG.rotation.set(-Math.PI * ease(q) - 0.25 * Math.sin(Math.PI * bq), 0.3 * q, 0);
  }
  // 飛び出す（古い結果URL）: 奥のふちを越えて、コンロの向こうの台にポロッと落ちる（裏返って、少し跳ねる）
  if (fx.tobi) {
    const k1 = t - fx.endT, q = clamp01(k1 / 0.7), bq = clamp01((k1 - 0.7) / 0.35);
    eggG.position.set(lerp(fx.from.x, 0.3, q), lerp(fx.from.y, -0.38, q) + 1.1 * Math.sin(Math.PI * q) + 0.12 * Math.sin(Math.PI * bq), lerp(fx.from.z, -1.95, q) - 0.12 * bq);
    eggG.rotation.set(-Math.PI * 1.6 * ease(q) - 0.25 * Math.sin(Math.PI * bq), 0.3 * q, 0); fx.rollVis = Math.max(fx.rollVis, Math.min(1, 0.6 + q));   // 筒の形のまま転がり落ちる
  }
  yawG.rotation.y = s.yaw;
  // カメラ: フライパン（真上）→ 返す（斜め手前から）→ 皿
  const rk = fx.foldT > -8 && !fx.bicha ? smooth((t - fx.foldT - 0.5) / 0.6) : 0;
  camP.lerpVectors(VIEW_PAN.p, VIEW_ROLL.p, rk); camL.lerpVectors(VIEW_PAN.l, VIEW_ROLL.l, rk);
  camP.lerp(VIEW_PLATE.p, k); camL.lerp(VIEW_PLATE.l, k);
  if (fx.plateT > -8 && !fx.bicha) {
    // 盛り付け: 皿のまわりを 40° 回り込みながら、低め（仰角 30°）の画角へ。そこで止めて、包丁と開くところは固定で見せる
    const land = t - fx.plateT - TRANSFER, kc = fx.res && s.mode === 'done' ? t - fx.cutT : -1;
    // 開いた／割れたら 0.9 秒止めて見せ、そのあと 1.8 秒かけて皿の高さ近くまで下がり、横からゆっくり寄る（締め）
    const lowMax = fx.res && (fx.res.kind === 'toro' || fx.res.kind === 'beta') && !fx.res.broken ? 1 : 0.35;   // 下がりきるのはトロッ・流れる結果だけ（失敗は割れ方が見える高さで止める）
    const low = kc > 0.7 ? lowMax * smooth((kc - 0.7) / 1.4) : 0;
    const az = 0.65 * (1 - smooth(land / 2.4)) + 0.5 * low, el = lerp(0.55, 0.47, low), d = 7.4 * (1 - 0.2 * low);   // 回り込みは卵の横腹が見える側から。締めは約20°上から寄って、開いた中身としずくが見える高さで止める
    vB.set(P.x + Math.sin(az) * d * Math.cos(el), 0.35 + d * Math.sin(el), Math.cos(az) * d * Math.cos(el));
    camP.lerp(vB, k); vA.set(P.x, lerp(0.35, 0.68, low), 0); camL.lerp(vA, k);   // 締めは注視点を上げて、皿を画面の中ほどへ
  }

  if (fx.flew && DK.k === 'drape') { const ck = 0.85 * smooth((t - fx.flyT - 0.1) / 0.5) * (1 - smooth((t - fx.plateT) / 0.6)); camL.lerp(eggG.position, ck); }   // 飛んでいく卵をカメラが少し追う
  else if (fx.flew) { const ck = smooth((t - fx.flyT - 0.15) / 0.7) * (1 - smooth((t - fx.plateT) / 0.8)); vB.set(0.3, -0.3, -1.5); camL.lerp(vB, ck); vB.set(0.4, 4.3, 1.8); camP.lerp(vB, ck); }
  if (fx.tobi) { const ck = smooth((t - fx.endT - 0.15) / 0.7); vB.set(0.3, -0.3, -1.5); camL.lerp(vB, ck); vB.set(0.4, 4.3, 1.8); camP.lerp(vB, ck); }   // フライパンのふちと落ちた卵が両方入る   // 飛び出したら、落ちる先をカメラが追う
  camera.position.copy(camP); camera.lookAt(camL); camera.fov = lerp(VIEW_PAN.fov, VIEW_PLATE.fov, k); camera.updateProjectionMatrix();
  // 炎（つまみに合わせて大きさだけ変わる。明るさは変えない）
  const fl = s.mode === 'cook' || s.mode === 'ready' || s.mode === 'roll' ? 0.06 + 0.94 * s.knob : 0;   // 左いっぱいでも小さな炎（とろ火）
  flames.forEach(({ f, a }, i) => { const w = 1 + 0.08 * Math.sin(t * 5 + i * 1.7), rad = 1.12 + 0.3 * fl; f.position.set(Math.cos(a) * rad, -0.16, Math.sin(a) * rad); f.scale.set(0.6 + fl * 0.5, (0.25 + fl * 1.3) * w, 0.6 + fl * 0.5); f.visible = fl > 0.01; });   // 火が強いほど、炎の先がフライパンのふちの外へ出る
  // 焦げの煙（焦げている量だけ、ゆっくり濃くなる）
  const burnNow = s.mode === 'cook' || s.mode === 'roll' || fx.koge ? clamp01((fx.look.brown - 0.02) * 4) : 0;
  fx.burn += (burnNow - fx.burn) * 0.04;
  smokes.forEach((m, i) => {
    const q = (t * 0.35 + i / smokes.length) % 1, a = i * 2.4;
    m.visible = fx.burn > 0.01;
    m.position.set(panX + Math.cos(a) * 0.8 + Math.sin(t * 0.6 + i) * 0.1, 0.2 + q * 1.8, panZ + Math.sin(a) * 0.6);
    m.quaternion.copy(camera.quaternion); m.scale.setScalar(0.6 + q * 1.2);
    m.material.opacity = fx.burn * 0.32 * Math.sin(Math.PI * q);
  });
  const stNow = s.mode === 'cook' || s.mode === 'roll' ? clamp01(((fx.look ? fx.look.inner : 0) - 0.06) / 0.3) : (s.mode === 'plate' || s.mode === 'done') && fx.plateT > -8 ? 0.3 * ph.transK * Math.max(0.35, ph.soft) : 0;   // 皿の上でも（薄く。暗い背景でしみに見えないように）、湯気がゆっくり上る
  fx.steam = (fx.steam || 0) + (stNow - (fx.steam || 0)) * 0.05;
  steams.forEach((m, i) => {
    const q = (t * 0.45 + i / steams.length) % 1, a = i * 2.1 + 0.7;
    m.visible = fx.steam > 0.01;
    m.position.set(eggG.position.x + Math.cos(a) * 0.45 + Math.sin(t * 0.8 + i) * 0.08, (fx.plateT > -8 ? 0.75 : 0.15) + q * 1.4, eggG.position.z + Math.sin(a) * 0.35);
    m.quaternion.copy(camera.quaternion); m.scale.setScalar(0.5 + q * 0.9);
    m.material.opacity = fx.steam * 0.22 * Math.sin(Math.PI * q);
  });
  // ボウルと流し込み
  const pk = s.mode === 'ready' ? 0 : (t - fx.pourT), bk = s.mode === 'ready' ? 0 : Math.sin(Math.PI * clamp01(pk / 0.9));
  bowl.position.set(lerp(-1.25, -0.55, bk), lerp(0.25, 1.1, bk), lerp(-1.75, -0.75, bk)); bowl.rotation.z = -bk * 1.6; bowl.rotation.x = bk * 0.3;
  bowl.userData.egg.visible = pk < 0.45;
  stream.visible = pk > 0.15 && pk < 0.75;
  if (stream.visible) { stream.position.set(-0.1, 0.55, -0.25); stream.rotation.set(0.35, 0, 0.2); }
  // 菜箸
  const sp = fx.stick;
  if (s.mode === 'cook' && fx.tool === 'stick' && sp && t - fx.lastStir < 0.25) { sticks.position.set(sp[0], 0.02, sp[1]); sticks.rotation.set(-0.35, 0, -0.42); }
  else if (fx.foldT > -8) { sticks.position.set(2.6, -0.36, 1.6); sticks.rotation.set(Math.PI / 2, 0, 0.3); }   // 折ったら台へどける
  else { sticks.position.set(1.75, 0.24, -1.15); sticks.rotation.set(Math.PI / 2 - 0.1, 0, 0.5); }
  // フライ返し: 折るときは奥の半分の下に入って手前へ返す
  if (fx.foldT > -8 && t - fx.foldT < 0.62 && !fx.bicha) {
    const q = clamp01((t - fx.foldT) / 0.6), phi = Math.PI * ease(q);
    spatula.position.set(0.1, 0.09 + Math.sin(phi) * 0.6, -Math.cos(phi) * 0.6); spatula.rotation.set(phi, 0, 0);
  } else if (fx.bicha && t - fx.foldT < 1.1) {
    const q = clamp01((t - fx.foldT) / 1.0), phi = Math.PI * 0.55 * Math.sin(Math.PI * Math.min(1, q * 1.15));
    spatula.position.set(0.1, 0.03 + Math.sin(phi) * 0.55, -Math.cos(phi) * 0.55); spatula.rotation.set(phi, 0, 0);
  } else if (s.mode === 'cook' && fx.tool === 'spat' && fx.spat) { spatula.position.set(fx.spat[0], 0.04, fx.spat[1]); spatula.rotation.set(0, 0, 0); }
  else { spatula.position.set(-1.85, 0.22, 0.9); spatula.rotation.set(0, 0.6, 0); }
  spatula.visible = s.mode === 'ready' || s.mode === 'cook' || fx.bicha || (fx.foldT > -8 && t - fx.foldT < 0.62);
  // 包丁
  // 包丁（自動）: 皿に乗ったら上から降りてきて（0.5〜1.1秒）、オムレツの上を縦に一筋（1.1〜1.85秒。入りはゆっくり、すっと抜ける）→ 抜けたら上へ
  const kw = s.mode === 'plate' ? t - s.plateT - TRANSFER : s.mode === 'done' && fx.plateT > -8 ? CUT_AUTO + (t - s.cutT) : -1;
  knife.visible = !fx.bicha && kw > 1.7 && kw < CUT_AUTO + 0.6;
  if (knife.visible) {
    // 包丁: 奥の端の上から降りて（1.7〜2.3 秒）、刃を立てて長い向きに沿って手前へ引く（2.3〜4.6 秒。入りはゆっくり）→ 抜けたら上へ
    const u = clamp01((kw - 2.3) / (CUT_AUTO - 2.3)), kp = kw < 2.3 ? 1.08 : lerp(1.08, -0.12, smooth(u)) - Math.max(0, kw - CUT_AUTO) * 0.5;
    const hard = DK.k === 'brick' || DK.k === 'frisbee', bounce = hard ? 0.95 * Math.sin(Math.PI * clamp01((kw - 2.3) / 0.55)) + 0.38 * Math.sin(Math.PI * clamp01((kw - 2.85) / 0.35)) : DK.k === 'hamburg' || (DK.k === 'futomaki' && DK.d > 0.5) ? 0.45 * Math.sin(Math.PI * clamp01((kw - 2.3) / 0.5)) : 0;   // 炭: 包丁が2回はね返って、刃が入らない。焦げ茶: 一度はね返る
    const lift = bounce + (kw < 2.3 ? lerp(1.0, 0.0, smooth((kw - 1.7) / 0.6)) : kw > CUT_AUTO ? smooth((kw - CUT_AUTO) / 0.5) * 1.0 : 0);
    const xl = lerp(-RE, RE, kp) * 0.97, yb = domeY(xl * 0.9, 0) + 0.005, r = Math.sqrt(Math.max(0, RE * RE - xl * xl)) / Math.PI;
    let yk = yb + 2 * r * ph.ysc - 0.1;   // 刃先が卵に入る高さ
    if (ph.cover > 0.5) yk = omeletOf(Math.max(-RE, Math.min(RE, xl / 0.86)), 0, ph).y - 0.05;   // 刃先はご飯の上に乗ったオムレツの上から入る
    if (DK.k === 'brick') yk = 0.97; else if (DK.k === 'frisbee') yk = 0.63; else if (DK.k === 'futomaki') yk = DOME.h * 0.92 + 2 * rollG.userData.rad - 0.08; else if ((DK.k === 'soboro' || DK.k === 'volcano') && !(ph.cover > 0.5)) yk = yb + 2 * r * ph.ysc * 1.28 - 0.1; else if (DK.k === 'hamburg') yk = yb + 2 * r * ph.ysc * 0.74 - 0.06;
    if (DK.k === 'drape') { vA.set(0, supp(0, ph.dOff + xl) + 2 * r * ph.ysc - 0.1 + lift, ph.dOff + xl); yawG.localToWorld(vA); knife.rotation.set(-0.3, s.yaw + PLATE_ROT, 0, 'YXZ'); }
    else { vA.set(xl, yk + lift, 0); yawG.localToWorld(vA); knife.rotation.set(-0.3, s.yaw + PLATE_ROT - Math.PI / 2, 0, 'YXZ'); }
    knife.position.copy(vA); knife.scale.setScalar(0.9);   // 刃を切る線にそろえ、ほぼまっすぐ立てる
  }
  // 割れる・転がる（カチカチ）。合わせ目が下なので、半分ずつ（-sg の側にある）が外へ倒れる
  const r = fx.res;
  const cst = cutStyle(r), split = r && s.mode === 'done' && !fx.bicha && ['burnt', 'kachi'].includes(cst);   // 割れる（焦げ茶・カチカチ）
  if (r && !split && ['toro', 'beta', 'kata'].includes(r.kind) && s.mode === 'done' && !fx.bicha) {
    // 開く: 左右の皮が、合わせ目（下）の線を軸に外へ倒れる（トロッ 72°、開ききらない 16°）。ライスの斜面へ少し沈んで沿う
    const ang = 0 * ph.openP, yb = DOME.h + 0.005;
    halves.forEach(hf => { const sd = -hf.sg; hf.inner.position.set(0, -yb, 0); hf.piv.position.set(0, yb, 0); hf.piv.rotation.set(sd * ang, 0, 0); });
  } else if (split) {
    const k2 = t - fx.cutT;
    halves.forEach((hf, i) => {
      const sd = -hf.sg, d = k2 - (cst === 'burnt' ? 0.05 : 0.12) - i * 0.07 - (sd * r.off > 0 ? 0 : 0.03);
      let tip = smooth(d / (cst === 'burnt' ? 0.14 : 0.32)), slide = ease((d - 0.1) / 0.55), rk2 = Math.max(0, d - 0.45);
      let ang = (Math.PI * 0.6) * tip + (d > 0.45 ? 0.32 * Math.exp(-rk2 * 3.2) * Math.cos(rk2 * 11) : 0.32 * smooth((d - 0.3) / 0.15));
      if (cst === 'usu') { ang = 1.15 * smooth(d / 0.5); slide = 0.6 * ease(d / 0.6); }   // 薄焼き: ご飯に張りついたまま、真ん中から破れて少しめくれる
      if (cst === 'iri') { ang = 0.5 * smooth(d / 0.5); slide = 0.25 * ease(d / 0.7); }   // 炒り卵: 割れずに崩れて、山になる
      const yb = DOME.h + 0.005, rest = 0.34;
      hf.inner.position.set(0, -yb, 0);
      let pz = sd * lerp(0, 0.8 + 0.12 * sd * r.off, slide), py = lerp(yb, rest, slide) + Math.sin(Math.PI * clamp01(d / 0.5)) * 0.12;
      if (DK.k === 'ball') {   // ゴムまり: 割れた半分が跳ねながら転がって、固いほど皿から台へ転がり落ちる
        const u = clamp01((d - 0.45) / 1.7), ex = (0.5 + 1.5 * DK.d) * ease(u);
        pz += sd * ex; py += (0.75 + 0.6 * DK.d) * Math.abs(Math.sin(Math.PI * u * 4)) * (1 - u) ** 1.4;   // ゴムのように高く何度も跳ねる ang += sd * 0 + (ex / 0.34) * 0.6;
        py -= smooth((Math.abs(pz) - 1.55) / 0.35) * (rest - (BOARD_TOP + 0.28));
      }
      hf.piv.position.set(0, py, pz);
      hf.piv.rotation.set(sd * ang, 0, 0);
    });
  }
  // ビシャッ・破れる: 生の卵がフライパンに広がる
  panPuddle.visible = !!(((fx.bicha || fx.yabure) && s.mode === 'done') || (fx.broken && fx.plateT < -8 && s.mode !== 'ready'));
  if (panPuddle.visible && fx.broken && !fx.bicha && !fx.yabure) {   // 崩れた: 裂け目から生の卵が少しフライパンに漏れたまま（フライパンといっしょに動く）
    const g = ease((t - fx.foldT - 0.3) / 0.8); panPuddle.scale.set(lerp(0.2, 0.55, g), lerp(0.2, 0.45, g), 1); panPuddle.position.set(panX + 0.25, 0.008, panZ + 0.35);
  } else if (panPuddle.visible) {
    const t0 = fx.bicha ? fx.foldT + 0.35 : fx.endT, g = ease((t - t0) / 0.8), big = fx.bicha ? 1 : 0.75;
    panPuddle.scale.set(lerp(0.4, 1.08, g) * big, lerp(0.35, 1.02, g) * big, 1); if (fx.yabure) panPuddle.position.set(fx.from.x, 0.008, fx.from.z); else panPuddle.position.set(panX, 0.008, panZ + 0.1);
  }
  // 流れ出る卵
  const showFlow = r && !fx.bicha && ['', 'old'].includes(DK.k) && (r.kind === 'toro' || r.kind === 'beta') && r.flow > 0.02 && !(r.broken && r.kind !== 'beta');
  puddle.visible = !!showFlow; if (!showFlow) { tongues.forEach(m => m.visible = false); mound.visible = false; drips.forEach(m => m.visible = false); hilite.visible = false; }
  mound.material = moundMat;
  // 固め・薄焼き: 中は固まった淡い卵がこんもり（流れない・光らない）。中が空に見えないように
  if (r && !fx.bicha && s.mode === 'done' && r.kind === 'kata' && fx.plateT > -8 && ['', 'drill'].includes(DK.k)) {
    const k2 = t - fx.cutT, w1 = smooth((k2 - 0.1) / 0.5);
    mound.material = dryMat; mound.visible = k2 > 0.1;
    if (mound.visible) shapeFilling(DOME.ax * 0.8, 0.4 * DOME.az * 0.93 * (0.5 + 0.9 * w1), (r.kind === 'usu' ? 0.03 : 0.07) * w1, 0, 0);
  }
  if (showFlow) {
    const k2 = t - fx.cutT, fv = Math.max(0.45, r.flow);
    puddle.visible = false; tongues.forEach(m => m.visible = false);
    // 中身: 皮が倒れはじめたら割れ目から盛り上がり、手前と左右へ 2 秒ほどかけて広がる（ease-out。3 秒でもわずかに進む）
    const gw = 0.4 * DOME.az * 0.93, sp = visc((k2 - 0.3) / 1.5), up = smooth((k2 - 0.25) / 0.5);
    const jk = k2 - 0.75, jig = jk > 0 ? 0.05 * Math.exp(-jk / 0.55) * Math.sin(jk * 2 * Math.PI / 0.4) : 0;   // ふるふる（振幅 5%、周期 0.4 秒、約 1.5 秒で収まる）
    if (r.kind === 'beta') { const g2 = visc((k2 - 0.1) / 1.6); puddle.visible = g2 > 0.03; puddle.scale.set(DOME.ax * lerp(1, 1.55, g2), DOME.az * lerp(1, 2.3, g2), Math.max(0.05, 0.8 * g2)); }   // 出はじめの薄すぎる1コマは隠す（黒く見えない）   // 全部流れて皿いっぱいに
    mound.visible = k2 > 0.22;
    shapeDrips(-DOME.ax * 0.74, visc((k2 - 0.45) / 1.6), mound.visible && k2 > 0.45);
    // 落ち着いたあと、周期1.2秒で小さく2〜3回上下して止まる（形だけ）
    const sk2 = k2 - 2.6, settle = sk2 > 0 ? 0.04 * Math.exp(-sk2 / 1.3) * Math.sin(sk2 * 2 * Math.PI / 1.2) : 0;
    const over = Math.max(0, r.flow - 0.45) * 2.4;   // 柔らかいほど、ご飯の上へあふれる
    if (mound.visible) shapeFilling(DOME.ax * (0.55 + 0.42 * sp + 0.12 * over * sp) * (1 - 0.4 * jig), gw * (0.5 + (1.3 + 1.2 * over) * sp) * (1 - 0.5 * jig), (0.07 + 0.14 * up - 0.02 * sp * fv) * (1 + jig + settle), k2, sp);   // 半熟は真ん中に大きくなめらかに盛り上がる
    hilite.visible = mound.visible && k2 > 0.5; if (hilite.visible) { hilite.position.set(-0.05, fillTop + 0.004, -0.04); hilite.scale.set(0.09, 0.006, 0.03); }
  } else runMat.color.set('#f0a81c');
  // 別のものに化ける（炭のレンガ・そぼろ山・湖・テーブルクロス・花・太巻き など）。卵は小さくなって消える
  const eggS = poseDish(s, t, ph);
  halves.forEach(h => { h.inner.scale.setScalar(Math.max(0.001, eggS)); h.inner.visible = eggS > 0.01; });
}

// 拾ってきた跡: 卵の上に付いたほこり・木くず
const dust = Array.from({ length: 44 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 0.05), lam(i % 3 ? '#5a4632' : '#8a7a62')); m.visible = false; eggG.add(m); return m; });
// 切ったときの起き方（名前と同じ順で決める）: burnt＝包丁がはね返ってガリッと割れる、iri＝崩れて山になる、usu＝ご飯に張りついたまま破れる、broken＝ばらばらに散る、kachi＝割れて転がる
const cutStyle = r => { if (!r) return ''; const k = plateOf(r).k; return k === 'hamburg' ? 'burnt' : k === 'ball' || (k === 'old' && r.kind === 'kachi') ? 'kachi' : k === 'soboro' || k === 'volcano' ? 'iri' : k === 'lake' ? 'beta' : k; };
// 炒り卵のぽろぽろ（包丁を入れると散る）と、焦げの中から上がる煙
const crumbs = Array.from({ length: 48 }, (_, i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + 0.025 * hash(i, 3), 0), lam('#f2d98a')); m.visible = false; m.castShadow = true; yawG.add(m); return m; });
function poseCut(s, t) {
  dust.forEach((m, i) => {
    const fl = (s.fold && s.fold.flew) || (s.fixedRes && s.fixedRes.flew) || (fx.res && fx.res.flew);
    m.visible = !!(fl && fx.plateT > -8 && dk().k !== 'drape');
    if (!m.visible) return;
    const x = (hash(i, 11) * 2 - 1) * RE * 0.8, f = hash(i, 12), sg = hash(i, 13) > 0.5 ? 1 : -1, h = Math.sqrt(Math.max(0, RE * RE - x * x)), r = h / Math.PI, th = Math.PI * (0.55 + 0.4 * f);
    const yb = domeY(x * 0.97 * 0.9, 0) + 0.005, k = fx.res && s.mode === 'done' ? 0 : 1;
    if (k) m.position.set(x * 0.97, yb + (r + r * Math.cos(th)) * 0.82 + 0.02, sg * r * Math.sin(th)); else { const zz = sg * (0.55 + 0.4 * f); m.position.set(x * 0.9, Math.max(domeY(x * 0.9, zz), 0) + 0.06, zz); } m.rotation.set(i, i * 2, 0);
  });
  const r = fx.res, done = r && s.mode === 'done' && !fx.bicha && fx.plateT > -8, k2 = done ? t - fx.cutT : -1;
  const cst = done ? cutStyle(r) : '', iri = cst === 'iri', brk = cst === 'broken';
  // 炭のレンガ: 包丁が当たったところから、黒いかけらが飛ぶ
  const kwc = fx.plateT > -8 ? (s.mode === 'plate' ? t - s.plateT - TRANSFER : s.mode === 'done' ? CUT_AUTO + t - s.cutT : -9) - 2.3 : -9;
  crumbs.forEach((m, i) => {
    m.visible = dk().k === 'brick' && kwc > 0 && i < 16; if (!m.visible) return;
    m.scale.setScalar(1.3 + hash(i, 9)); m.material.color.set(i % 3 ? '#1c140e' : '#3a2e26');
    const tt = Math.max(0, kwc - (i < 8 ? 0 : 0.55)), vx = (hash(i, 6) - 0.5) * 1.6, vz = (hash(i, 2) - 0.5) * 1.8, vy = 0.9 + 1.0 * hash(i, 5);
    let x = 1.0 + vx * tt, z = vz * tt, y = 0.98 + vy * tt - 4 * tt * tt;
    const floor = (Math.abs(x) < 0.93 && Math.abs(z) < 0.4 ? 0.97 : supp(x, z)) + 0.03; if (y < floor) y = floor;
    m.position.set(x, y, z); m.rotation.set(i + tt * 8 * (y > floor ? 1 : 0), i * 2, 0);
  });
  if (done && r.brown >= 0.35 && k2 > 0) {   // 20秒格闘は煙が多い
    const sm = dk().k === 'volcano' ? 0.85 : r.stuck ? 0.6 : 0.42;   // 焦げ: 切ると中からも煙
    smokes.forEach((m, i) => {
      const q = (k2 * 0.3 + i / smokes.length) % 1;
      const vol = dk().k === 'volcano', top = vol ? (0.8 + 0.8 * dk().d) * visc((k2 - 0.05) / 1.3) : DOME.h + 0.35;   // 黒そぼろ火山: 頂上から煙を噴く
      vA.set((hash(i, 9) * 2 - 1) * (vol ? 0.15 + 0.3 * q : 0.6), top + 0.05 + q * (vol ? 2.2 : 1.6), (hash(i, 8) - 0.5) * 0.3); yawG.localToWorld(vA);
      m.visible = true; m.position.copy(vA); m.quaternion.copy(camera.quaternion); m.scale.setScalar(vol ? 0.7 + q * 1.8 : 0.5 + q * 1.1);   // 噴火は太い煙の柱
      m.material.opacity = sm * Math.sin(Math.PI * q) * smooth(k2 / 0.8);
    });
  }
}


// ---------- 皿の上で化けるもの（失敗ほど大げさに。結果の数値だけで決まる。logic.js の plateOf） ----------
const dk = () => (fx && fx.dk) || { k: '', d: 0 };
function lightPlate(pk) {   // pk: 皿の場面の割合 0〜1
  sun.position.lerpVectors(LIGHT0.sun, vA.set(P.x - 2.6, 6.2, 3.4), pk); sun.target.position.lerpVectors(LIGHT0.tgt, P, pk);
  const sc = sun.shadow.camera, L = lerp(-4, -3, pk), R = lerp(10, 3, pk), T = lerp(5, 3, pk);
  if (sc.left !== L || sc.right !== R) { Object.assign(sc, { left: L, right: R, top: T, bottom: -T }); sc.updateProjectionMatrix(); }
  sun.intensity = lerp(2.1, 2.9, pk); sun.color.set('#fff1dc').lerp(vC.set('#ffdcae'), pk);
  hemi.intensity = lerp(1.25, 0.42, pk);
  rimL.position.set(P.x + 2.5, 2.6, -4.2); rimL.target.position.copy(P); rimL.intensity = 2.4 * pk;
  // 皿の場面に入ったら、明るい所がなめらかに飽和する色の出し方と、窓・天井の明かりの映り込みに切りかえる（一度だけ。点滅しない）
  const real = pk > 0.001;
  if (real !== fx.real) { fx.real = real; renderer.toneMapping = real ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping; renderer.toneMappingExposure = 1.45; envMats.forEach(m => { m.envMap = real ? studio : eggEnv; }); }
  scene.background.copy(LIGHT0.bg).lerp(BG1, pk); scene.fog.color.copy(scene.background); scene.fog.near = lerp(14, 6.5, pk); scene.fog.far = lerp(40, 13, pk);
}
const vC = new THREE.Color();
const charTexs = [true, false].map(srgb => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = srgb ? '#17110d' : '#606060'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const k = hash(i, 44); g.fillStyle = srgb ? (k < 0.7 ? 'rgba(48,36,28,.8)' : k < 0.92 ? 'rgba(88,76,66,.6)' : 'rgba(140,130,120,.55)') : (k < 0.5 ? '#202020' : '#b0b0b0'); g.beginPath(); g.arc(hash(i, 41) * w, hash(i, 42) * h, 1 + hash(i, 43) * 5, 0, 7); g.fill(); }
  g.strokeStyle = srgb ? 'rgba(4,3,2,.95)' : '#000'; g.lineWidth = 2.5;
  for (let i = 0; i < 26; i++) { let x = hash(i, 45) * w, y = hash(i, 46) * h; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (hash(i, j + 50) - 0.5) * 44; y += (hash(i, j + 60) - 0.5) * 44; g.lineTo(x, y); } g.stroke(); }
}, srgb));
const charMat = new THREE.MeshStandardMaterial({ map: charTexs[0], bumpMap: charTexs[1], bumpScale: 3, roughness: 0.95 });
// 炭のレンガ（包丁がはね返る）
const brick = mesh(roundBox(1.85, 0.5, 0.78, 0.07), charMat, 0, 0.72, 0, eggG); brick.visible = false;
// 備長炭（強火で焼いた）: 灰色がかった細い炭の束。金属のような鈍い照り
const binMat = new THREE.MeshStandardMaterial({ color: '#8d8a86', roughness: 0.42, metalness: 0.55 });
const bincho = new THREE.Group(); eggG.add(bincho); bincho.visible = false;
[[0, 0], [0.2, 0], [-0.2, 0], [0.1, 0.17], [-0.1, 0.17], [0.3, 0.17], [-0.3, 0.17], [0, 0.34], [0.2, 0.34], [-0.2, 0.34]].forEach(([z, y], i) => { const g = new THREE.CylinderGeometry(0.1 + 0.012 * hash(i, 401), 0.1, 1.7 + 0.25 * hash(i, 402), 9); g.rotateZ(Math.PI / 2); const m = new THREE.Mesh(g, binMat); m.position.set(0.1 * (hash(i, 403) - 0.5), y, z); m.rotation.x = hash(i, 404); m.castShadow = m.receiveShadow = true; bincho.add(m); });
// 黒いフリスビー（折らずに焼けた平たい卵）
const frisbee = mesh(new THREE.LatheGeometry([[0, 0.05], [0.6, 0.046], [0.88, 0.036], [0.98, 0.016], [1.03, -0.02], [1.0, -0.065], [0.95, -0.07], [0.93, -0.035], [0.6, -0.004], [0, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 48),
  new THREE.MeshStandardMaterial({ map: charTexs[0], bumpMap: charTexs[1], bumpScale: 2, roughness: 0.88, side: THREE.DoubleSide }), 0, 0.56, 0, eggG); frisbee.visible = false;
// 太巻き・めん棒（輪切りが倒れて渦巻きが見える）
const spiralTex = canvasTex(256, 256, (g) => {
  g.fillStyle = '#fae49a'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#b8741e'; g.lineWidth = 11; g.beginPath();
  for (let a = 0; a < 3.5 * Math.PI * 2; a += 0.04) { const r = 8 + a * 110 / (3.5 * Math.PI * 2), x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r; if (a) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke(); g.strokeStyle = '#c3832a'; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.stroke();
});
const skinTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f2c452'; g.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { const k = hash(i, 71); g.fillStyle = k < 0.6 ? 'rgba(206,140,52,.22)' : 'rgba(255,238,175,.35)'; g.beginPath(); g.ellipse(hash(i, 72) * w, hash(i, 73) * h, 2 + hash(i, 74) * 9, 2 + hash(i, 75) * 5, hash(i, 76) * 3, 0, 7); g.fill(); } });
const rollSide = new THREE.MeshPhysicalMaterial({ map: skinTex, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35, bumpMap: skinBump, bumpScale: 1 }), rollCap = new THREE.MeshStandardMaterial({ map: spiralTex, roughness: 0.62 });
const rollG = new THREE.Group(); eggG.add(rollG); let rollSl = [];
function buildRoll(d) {
  rollSl.forEach(m => { rollG.remove(m); m.geometry.dispose(); }); rollSl = [];
  const K = 5 + Math.round(3 * d), L = 2.3 + 1.7 * d, rad = 0.34 - 0.15 * d, Ls = L / K;
  for (let i = 0; i < K; i++) { const g = new THREE.CylinderGeometry(rad, rad, Ls * (d > 0.5 ? 1.001 : 0.985), 28); g.rotateZ(Math.PI / 2); const m = new THREE.Mesh(g, [rollSide, rollCap, rollCap]); m.castShadow = m.receiveShadow = true; rollG.add(m); rollSl.push(m); }
  rollG.userData = { K, L, rad, Ls }; rollG.visible = false;
}
// そぼろ山・黒そぼろ火山（崩れた粒が積もる）
const SOB_N = 1100;
const crumbTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f3d26a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const k = hash(i, 91); g.fillStyle = k < 0.5 ? 'rgba(255,240,180,.7)' : k < 0.85 ? 'rgba(214,160,60,.55)' : 'rgba(150,100,40,.5)'; g.beginPath(); g.arc(hash(i, 92) * w, hash(i, 93) * h, 2 + hash(i, 94) * 7, 0, 7); g.fill(); } });
const sobMat = new THREE.MeshStandardMaterial({ roughness: 0.82, flatShading: true });
const sob = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), sobMat, SOB_N); sob.castShadow = true; sob.receiveShadow = true; sob.visible = false; yawG.add(sob);
const sobConeMat = new THREE.MeshStandardMaterial({ map: crumbTex, bumpMap: crumbTex, bumpScale: 2, roughness: 0.85, vertexColors: true });
const sobCone = new THREE.Mesh(new THREE.LatheGeometry(Array.from({ length: 17 }, (_, i) => new THREE.Vector2(Math.max(0.001, 1 - i / 16), i / 16)), 40), sobConeMat); sobCone.castShadow = sobCone.receiveShadow = true; sobCone.visible = false; yawG.add(sobCone);
const sobProf = (r, d) => lerp(1 - r ** 1.8, (1 - r) ** 1.35, d);   // 山の形（大げさなほど、すそが広く頂上がとがる）
{ const ps = sobCone.geometry.attributes.position; sobCone.userData.base = Float32Array.from(ps.array); sobCone.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ps.count * 3).fill(1), 3)); }
const mObj = new THREE.Object3D();
// 卵かけご飯の湖・ハンバーグの肉汁
const lakeGeo = new THREE.CircleGeometry(1, 64); { const ps = lakeGeo.attributes.position; for (let i = 1; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i), a = Math.atan2(y, x), k = 1 + 0.05 * Math.sin(5 * a) + 0.03 * Math.sin(11 * a + 1); ps.setXY(i, x * k, y * k); } lakeGeo.rotateX(-Math.PI / 2); }
const lakeMat = new THREE.MeshPhysicalMaterial({ color: '#f3a615', roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMap: eggEnv, envMapIntensity: 1.6, transparent: true, opacity: 0.94 });
const juiceMat = new THREE.MeshPhysicalMaterial({ color: '#3a1a0b', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMap: eggEnv, envMapIntensity: 1.2 });
const lake = new THREE.Mesh(lakeGeo, lakeMat), spill = new THREE.Mesh(lakeGeo, lakeMat), juice = new THREE.Mesh(lakeGeo, juiceMat);
const sauceMat = new THREE.MeshPhysicalMaterial({ color: '#8e1a0a', roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.1, envMap: eggEnv, envMapIntensity: 1.0 });
const sauceGeo = new THREE.RingGeometry(0.001, 1, 180, 12); { const ps = sauceGeo.attributes.position; for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i), a = Math.atan2(y, x), r = Math.hypot(x, y), k = 1 + 0.07 * Math.sin(5 * a + 0.4) + 0.04 * Math.sin(11 * a + 1) + 0.02 * Math.sin(17 * a + 2); ps.setXYZ(i, x * k, y * k, 0.034 * Math.sqrt(Math.max(0, 1 - r ** 5)) + 0.004 * Math.sin(x * 9 + y * 7) * (1 - r)); } sauceGeo.rotateX(-Math.PI / 2); sauceGeo.computeVertexNormals(); }   // ふちが丸く盛り上がる、とろみのあるソース
const sauce = new THREE.Mesh(sauceGeo, sauceMat);   // ふつうのオムライスの下に敷いたケチャップソース（皿の上だけ）
[lake, spill, juice, sauce].forEach(m => { m.receiveShadow = true; m.visible = false; yawG.add(m); });
// テーブルクロス・ふろしき（薄い卵の膜が広がって皿を包む）
const CRN = 22, CTN = 72;
const clothTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f7da80'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const k = hash(i, 101); g.fillStyle = k < 0.7 ? 'rgba(216,160,70,.18)' : 'rgba(190,120,40,.3)'; g.beginPath(); g.ellipse(hash(i, 102) * w, hash(i, 103) * h, 3 + hash(i, 104) * 16, 2 + hash(i, 105) * 8, hash(i, 106) * 3, 0, 7); g.fill(); } });
const clothMat = new THREE.MeshPhysicalMaterial({ map: clothTex, roughness: 0.48, sheen: 0.5, sheenColor: new THREE.Color('#fff0c0'), side: THREE.DoubleSide, bumpMap: skinBump, bumpScale: 1.4 });
const cloth = (() => {
  const n = 1 + CRN * CTN, g = new THREE.BufferGeometry(), idx = [], uv = [];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  for (let i = 0; i < n; i++) { const r = i === 0 ? 0 : (1 + Math.floor((i - 1) / CTN)) / CRN, a = i === 0 ? 0 : ((i - 1) % CTN) / CTN * Math.PI * 2; uv.push(0.5 + 0.5 * r * Math.cos(a), 0.5 + 0.5 * r * Math.sin(a)); }
  for (let r = 0; r < CRN; r++) for (let a = 0; a < CTN; a++) { const a2 = (a + 1) % CTN, v = 1 + r * CTN + a, v2 = 1 + r * CTN + a2; if (r === 0) idx.push(0, v2, v); else { const q = v - CTN, q2 = v2 - CTN; idx.push(q, q2, v, q2, v2, v); } }
  g.setIndex(idx); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, clothMat); m.castShadow = m.receiveShadow = true; m.visible = false; yawG.add(m); return m;
})();
// 卵の花（裂けた卵が花びらのように開く）
const PU = 10, PV = 6;
const petalMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, side: THREE.DoubleSide, bumpMap: skinBump, bumpScale: 1 });
const petals = Array.from({ length: 16 }, () => {
  const g = new THREE.BufferGeometry(), idx = [], col = [];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PU + 1) * (PV + 1) * 3), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(Array.from({ length: (PU + 1) * (PV + 1) }, (_, q) => [Math.floor(q / (PV + 1)) / PU * 0.6, (q % (PV + 1)) / PV * 0.25]).flat(), 2));
  for (let i = 0; i <= PU; i++) for (let j = 0; j <= PV; j++) { const u = i / PU, v = Math.abs(j / PV * 2 - 1), c = new THREE.Color('#ef8f0a').lerp(new THREE.Color('#f3c443'), smooth(u * 1.6)).lerp(new THREE.Color('#c98a2e'), 0.6 * smooth((v - 0.65) / 0.35)); col.push(c.r, c.g, c.b); }
  for (let i = 0; i < PU; i++) for (let j = 0; j < PV; j++) { const a = i * (PV + 1) + j, b = a + PV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  g.setIndex(idx); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, petalMat); m.castShadow = m.receiveShadow = true; m.visible = false; yawG.add(m); return m;
});
const pistil = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), lakeMat); pistil.visible = false; pistil.castShadow = true; yawG.add(pistil);
// 皿の場面だけに映るものは、はじめから窓・天井の映り込みにする（料理中と共用の卵・流れる卵は切りかえる）
const envMats = [topMat, botMat, runMat];
// 開いた中身（盛り上がり・垂れ）も、皮の内側と同じやわらかい粒とつやのむら
detailize(moundMat, CURD, 0.5, 0.5, [1.0, 0.9, 0.62]); detailize(dripMat, CURD, 1, 0.7, [1.0, 0.9, 0.7]); sauceMat.envMapIntensity = 0.45; sauceMat.roughness = 0.14; sauceMat.clearcoatRoughness = 0.1; sauceMat.color.set('#84160a');
moundMat.normalScale.setScalar(0.08); moundMat.roughness = 0.14; moundMat.clearcoatRoughness = 0.06; dripMat.roughness = 0.14; dripMat.normalScale.setScalar(0.2); moundMat.clearcoatNormalMap = dripMat.clearcoatNormalMap = CURD.nrm; moundMat.clearcoatNormalScale = new THREE.Vector2(0.04, 0.04); dripMat.clearcoatNormalScale = new THREE.Vector2(0.04, 0.04); dripMat.normalScale.setScalar(0.06);
[plateG, eggG, knife].forEach(g => g.traverse(o => { const ms = o.material ? [].concat(o.material) : []; ms.forEach(m => { if (m.isMeshStandardMaterial && !envMats.includes(m)) m.envMap = studio; }); }));
detailize(petalMat, SKIN, 1, 0.6, [1.0, 0.9, 0.7]); petalMat.normalScale.setScalar(0.35); petalMat.bumpMap = null;
detailize(clothMat, SKIN, 1, 0.6, [1.0, 0.92, 0.75]); clothMat.normalScale.setScalar(0.35); clothMat.bumpMap = null;
detailize(rollSide, SKIN, 1, 0.6, [1.0, 0.95, 0.85]); rollSide.normalScale.setScalar(0.35); rollSide.bumpMap = null;
[charMat, frisbee.material].forEach(m => { m.bumpMap = null; detailize(m, CHAR, 1, 0.5); m.normalScale.setScalar(0.9); m.roughness = 0.9; m.color.set('#ffffff'); });
CHAR.nrm.repeat.set(2, 1);
function hideDish() { [bincho, brick, frisbee, rollG, sob, sobCone, lake, spill, juice, cloth, pistil, ...petals].forEach(m => m.visible = false); }
// 皿の上の見た目（毎コマ）。tp: 皿へ移りはじめてからの秒、k2: 切れてからの秒（切る前は負）
function poseDish(s, t, ph) {
  const { k, d } = dk(), tp = fx.plateT > -8 ? t - fx.plateT : -9, k2 = fx.res && s.mode === 'done' && fx.plateT > -8 ? t - fx.cutT : -1;
  hideDish();
  sauce.visible = false;   // ケチャップはなし（10/16 ユーザー: チキンライスの上に卵を乗せるだけ）
  if (tp < 0 || !k) return 1;
  const swap = smooth((tp - TRANSFER - 2.3) / 0.14);   // 包丁が当たった瞬間に、別のものに入れかわる（炭のレンガ・フリスビー・太巻き）。それまでは焼けた卵のまま
  let eggS = 1;
  if (k === 'brick') { eggS = 1 - swap; const bin = ((fx.pre && fx.pre.name) || '').includes('備長炭'); brick.visible = swap > 0 && !bin; bincho.visible = swap > 0 && bin; bincho.scale.setScalar(Math.max(0.01, swap)); bincho.position.y = 0.6; brick.scale.setScalar(Math.max(0.01, swap)); const kw = tp - TRANSFER, j = kw > 2.3 ? 0.05 * Math.exp(-(kw - 2.3) / 0.25) * Math.sin((kw - 2.3) * 40) : 0; brick.rotation.set(0, 0, j); }
  if (k === 'frisbee') {
    eggS = 1 - swap; frisbee.visible = swap > 0; frisbee.scale.setScalar(Math.max(0.01, swap));
    // 包丁が当たると、ご飯の上でコインのように回りながら傾きがおさまっていく（傾くほどゆっくり、寝るほど速く回る）
    const kw = tp - TRANSFER - 2.3;
    if (kw > 0) { const a = 0.24 * Math.exp(-kw / 1.2), ph2 = kw * 6 + kw * kw * 3.5; vB.set(Math.cos(ph2), 0, Math.sin(ph2)); frisbee.quaternion.setFromAxisAngle(vB, a); frisbee.position.y = 0.56 + 1.03 * Math.sin(a) * 0.5 + 0.15 * Math.sin(Math.PI * clamp01(kw / 0.3)); }
    else { frisbee.quaternion.identity(); frisbee.rotation.set(0.12, 0, 0.06); frisbee.position.y = 0.56; }
  }
  if (k === 'futomaki') {
    eggS = 1 - swap; rollG.visible = swap > 0; rollG.scale.setScalar(Math.max(0.01, swap));
    const { K, L, rad, Ls } = rollG.userData, y0 = DOME.h * 0.92 + rad;
    if (d > 0.5) {   // めん棒: 包丁が通らず、1本のまま皿の上をごろんと転がって、端が皿からはみ出す
      const u = k2 > 0 ? visc((k2 - 0.15) / 1.4) : 0, zr = 0.75 * u;
      rollSl.forEach((m, i) => { m.position.set(-L / 2 + (i + 0.5) * Ls, y0 - 0.08 * u, zr); m.rotation.set(-zr / rad, 0, 0); });
      return 1 - swap;
    }
    rollSl.forEach((m, i) => {
      const x = -L / 2 + (i + 0.5) * Ls, u = k2 > 0 ? clamp01((k2 - 0.1 - i * 0.09) / 0.42) : 0, x1 = x * 1.14, y1 = supp(x1 * 0.97, 0) + Ls / 2 + 0.01;
      // 輪切りが順に倒れて、切り口の渦巻きが上を向く（ドミノのように）
      m.position.set(lerp(x, x1, ease(u)), lerp(y0, y1, smooth(u)) + 0.22 * Math.sin(Math.PI * u), 0);
      m.rotation.set(0.55 * smooth(u), 0, -Math.PI / 2 * smooth(u) * (1 + 0.12 * Math.sin(Math.PI * clamp01((u - 0.6) / 0.4))), 'XYZ');   // 切り口（渦巻き）を少しこちらへ向ける
    });
  }
  if (k === 'soboro' || k === 'volcano') {
    // 切る前はふくらんだ雲。包丁が入ると崩れて、ご飯を埋める山になる
    eggS = k2 > 0 ? 1 - smooth(k2 / 0.45) : 1;
    if (k2 > 0) {
      const dark = k === 'volcano', tenk = !dark && d < 0.5, ax = tenk ? 1.45 : 1.25 + 0.4 * d, az = tenk ? 1.05 : 0.9 + 0.35 * d, Hm = tenk ? 0.62 : 0.8 + 0.8 * d, g = visc((k2 - 0.05) / 1.3);   // 天かす: 低く広い山の、きつね色のかりかりした粒。そぼろ富士: 細かい黄色の粒の、すそが広がる高い山で、頂上は白い（雪）
      sobCone.visible = g > 0.01; sobCone.scale.set(ax * lerp(0.55, 1, g), Math.max(0.01, Hm * g), az * lerp(0.55, 1, g));
      if (!sobCone.userData.d || sobCone.userData.d !== d) { const ps = sobCone.geometry.attributes.position, b0 = sobCone.userData.base; for (let i = 0; i < ps.count; i++) { const x = b0[i * 3], z = b0[i * 3 + 2], r = Math.hypot(x, z); const yy0 = sobProf(Math.min(1, r), d); sobCone.geometry.attributes.color.setXYZ(i, ...(!dark && d >= 0.5 && yy0 > 0.66 ? [1.15, 1.25, 1.6] : [1, 1, 1])); ps.setY(i, yy0 * (1 + 0.06 * (vnoise0(x * 4 + 3, z * 4, 7) - 0.5))); } ps.needsUpdate = true; sobCone.geometry.computeVertexNormals(); sobCone.userData.d = d; }
      sobConeMat.color.set(dark ? '#3a2a20' : tenk ? '#b98544' : '#ffe9a8'); sobCone.geometry.attributes.color.needsUpdate = true;
      if (sobMat.flatShading !== (dark || tenk)) { sobMat.flatShading = dark || tenk; sobMat.needsUpdate = true; } sobMat.roughness = tenk ? 0.45 : 0.75;
      const n = tenk ? 420 : dark ? Math.round(300 + 260 * d) : 1100; sob.count = n; sob.visible = true;
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(hash(i, 81)) * 0.97, a = hash(i, 82) * Math.PI * 2, tx = ax * r * Math.cos(a), tz = az * r * Math.sin(a), ty = Hm * sobProf(r, d) * Math.max(g, 0.2) - 0.01;
        const sx = (hash(i, 84) * 2 - 1) * 0.95, sy = 0.62 + 0.25 * hash(i, 85), sz = (hash(i, 86) - 0.5) * 0.4, u = clamp01((k2 - 0.03 - 0.6 * hash(i, 87)) / 0.45);
        mObj.position.set(lerp(sx, tx, ease(u)), lerp(sy, ty, smooth(u)) + 0.35 * Math.sin(Math.PI * u) * hash(i, 88), lerp(sz, tz, ease(u)));
        mObj.rotation.set(i, i * 1.7, i * 0.3); const sc = (tenk ? 0.06 + 0.05 * hash(i, 83) : dark ? (0.045 + 0.045 * hash(i, 83)) * (1 + 0.3 * d) : 0.03 + 0.025 * hash(i, 83)) * (u > 0 ? 1 : 0.001); mObj.scale.set(sc * (0.7 + 0.7 * hash(i, 90)), sc * (0.55 + 0.5 * hash(i, 91)), sc * (0.7 + 0.6 * hash(i, 92))); mObj.updateMatrix(); sob.setMatrixAt(i, mObj.matrix);
        const c = hash(i, 89); vC.set(dark ? (c < 0.6 ? '#1a120d' : c < 0.9 ? '#3a271a' : '#6a5544') : tenk ? (c < 0.45 ? '#c98a38' : c < 0.75 ? '#a96c26' : c < 0.92 ? '#dcac5c' : '#86521e') : ty > Hm * 0.66 * Math.max(g, 0.2) ? (c < 0.6 ? '#fffdf6' : '#f7f1e2') : (c < 0.5 ? '#f3cc4c' : c < 0.85 ? '#f8dc84' : '#e2ac38')); sob.setColorAt(i, vC);
      }
      sob.instanceMatrix.needsUpdate = true; if (sob.instanceColor) sob.instanceColor.needsUpdate = true;
    }
  }
  if (k === 'lake') {
    // 包丁が入ると卵がとけて、皿いっぱいの湖になる（ご飯は島）。ひどいほど皿からあふれて台へ
    eggS = k2 > 0 ? 1 - smooth((k2 - 0.2) / 1.2) : 1;
    if (k2 > 0) {
      const g = visc((k2 - 0.1) / 1.6); lake.visible = g > 0.02; lake.scale.set(lerp(0.9, 1.68, g), 1, lerp(0.6, 1.68, g)); lake.position.y = 0.012 + 0.055 * g;
      const g2 = visc((k2 - 1.1) / 1.8) * smooth(d / 0.4); spill.visible = g2 > 0.02; spill.scale.set(Math.min(2.2, RIM + (0.3 + 0.7 * d) * g2), 1, Math.min(1.7, RIM + (0.2 + 0.5 * d) * g2)); spill.position.y = BOARD_TOP + 0.008;
    }
  }
  if (false && k === 'hamburg' && k2 > 0) { const g = visc((k2 - 0.35) / 1.6); juice.visible = g > 0.02; juice.scale.set(lerp(0.3, 0.95, g), 1, lerp(0.25, 0.7, g)); juice.position.y = 0.012 + 0.012 * g; }
  if (k === 'cloth') {
    // 包丁が入ると、薄い膜がぺらっと広がって、ご飯（ひどいほど皿ごと）を包む
    eggS = k2 > 0 ? 1 - smooth((k2 - 0.05) / 0.3) : 1;
    if (k2 > 0) {
      const g = visc((k2 - 0.05) / 1.1), Rm = 1.3 + 0.72 * d, R = Rm * lerp(0.35, 1, g), ps = cloth.geometry.attributes.position, drop = RIM_Y - BOARD_TOP;
      cloth.visible = true;
      for (let i = 0; i < ps.count; i++) {
        const r = i === 0 ? 0 : (1 + Math.floor((i - 1) / CTN)) / CRN, a = i === 0 ? 0 : ((i - 1) % CTN) / CTN * Math.PI * 2;
        const rr = r * R * (1 + 0.05 * Math.sin(5 * a + 1) * r + 0.03 * Math.sin(9 * a) * r);
        let x = rr * Math.cos(a) * 1.12, z = rr * Math.sin(a) * 0.86, y, rad = Math.hypot(x, z);
        if (rad > RIM) { const sd = rad - RIM, k3 = (sd < drop ? RIM + 0.06 * sd / drop : RIM + 0.06 + (sd - drop)) / rad; x *= k3; z *= k3; y = sd < drop ? RIM_Y - sd : BOARD_TOP; }
        else y = supp(x, z);
        y += (rad < RIM ? 0.045 : 0.018) + 0.07 * r * r * Math.max(0, Math.sin(a * 9 + r * 7)) * (0.6 + 0.4 * Math.sin(a * 3)) * (rad > RIM ? 0.3 : 1) + 0.25 * (1 - g) * (1 - r);
        ps.setXYZ(i, x, y, z);
      }
      ps.needsUpdate = true; cloth.geometry.computeVertexNormals(); cloth.geometry.computeBoundingSphere();
    }
  }
  if (k === 'flower') {
    // 包丁が入ると、裂けた卵が花びらのように開く。真ん中は生の卵
    eggS = k2 > 0 ? 1 - smooth((k2 - 0.02) / 0.3) : 1;
    if (k2 > 0) {
      const sun = d >= 0.75, NP = sun ? 14 : 6, o = visc((k2 - 0.05) / 0.85) + 0.07 * Math.sin(Math.PI * clamp01((k2 - 0.55) / 0.5)), Lp = sun ? 1.05 + 0.3 * d : 1.15;   // ひまわり: 細い花びらが14枚、真ん中は生の卵の大きな円。花びらオムレツ: 皮が4本の帯にむけて、中身の残ったオムレツから X 字に倒れる（むいたバナナ）
      petals.forEach((m, pi) => {
        m.visible = pi < NP; if (!m.visible) return;
        const ps = m.geometry.attributes.position, phi = sun ? Math.PI * 2 * pi / NP + 0.4 + (pi % 2) * 0.05 : Math.PI * 2 * pi / NP + 0.5 * hash(pi, 301), c = Math.cos(phi), sn = Math.sin(phi);
        for (let i = 0; i <= PU; i++) for (let j = 0; j <= PV; j++) {
          const u = i / PU, v = j / PV * 2 - 1, w = sun ? (0.05 + 0.13 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)) ** 0.6) * Math.sqrt(Math.max(0, 1 - u ** 6)) * (u > 0.85 ? 1 - (u - 0.85) / 0.15 * 0.7 : 1) : (0.03 + 0.21 * Math.sin(Math.PI * Math.pow(u, 0.75))) * Math.sqrt(Math.max(0, 1 - u ** 10)), l = v * w, r = (sun ? 0.42 : 0.15) + u * Lp;
          let xo = (c * r - sn * l) * 1.25, zo = (sn * r + c * l) * 0.95, yo = supp(xo * 0.98, zo * 0.98) + 0.07 + 0.07 * u ** 3 + 0.02 * (1 - v * v);
          if (!sun) {   // 花びらオムレツ: 裂けた皮が花びらのように皿一面に散る（ご飯は見えたまま）
            const R = 1.25 + 0.15 * hash(pi, 302), a2 = phi + 0.25 * (hash(pi, 303) - 0.5), L2 = 0.95 + 0.15 * hash(pi, 304), pxx = Math.cos(phi) * R * 1.05, pzz = Math.sin(phi) * R * 0.8;
            xo = pxx + Math.cos(a2) * (u - 0.5) * L2 - Math.sin(a2) * l; zo = pzz + Math.sin(a2) * (u - 0.5) * L2 + Math.cos(a2) * l; yo = supp(xo, zo) + 0.012 + 0.03 * (1 - v * v) * Math.sin(Math.PI * u) + 0.03 * Math.abs(2 * u - 1) ** 3;
          }
          const xc = (c * 0.14 - sn * l * 0.5) * 1.1, zc = (sn * 0.14 + c * l * 0.5) * 0.8, yc = DOME.h + 0.02 + u * 0.55;
          ps.setXYZ(i * (PV + 1) + j, lerp(xc, xo, o), lerp(yc, yo, o) + 0.12 * Math.sin(Math.PI * clamp01(o)) * u, lerp(zc, zo, o));
        }
        ps.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
      });
      pistil.visible = true; const pg = visc((k2 - 0.25) / 1.0); if (sun) { pistil.material = lakeMat; pistil.scale.set(0.5 * pg + 0.01, 0.1 * pg + 0.01, 0.42 * pg + 0.01); } else { pistil.material = dripMat; pistil.scale.set(0.001, 0.001, 0.001); } pistil.position.set(0, DOME.h - 0.02, 0);
    }
  }
  return eggS;
}

// ---------- 描画 ----------
const v3 = new THREE.Vector3();
function toScreen(v) { v3.copy(v).project(camera); return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H }; }
function label(text, x, y, col, size, align = 'center', a = 1, weight = 900) {
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(30,24,18,.85)'; ctx.lineWidth = size * 0.2; ctx.strokeText(text, x, y); ctx.fillStyle = col; ctx.fillText(text, x, y); ctx.restore();
}
function draw() {
  pose(); poseCut(st, st.t);
  renderer.render(scene, camera);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(renderer.domElement, 0, 0);
  overlay();
}
const FIN = [16, 120];   // 「完成」ボタン（返す工程で左下）
const BTN = { y: 838, h: 84, stick: [16, 112], spat: [136, 132] };
const KNOB0 = { x: 452, y: 866, r: 54 }, KNOB1 = { x: 440, y: 848, r: 70 };   // 返す工程ではつまみを大きく前へ
const knobG = () => (st && st.mode === 'roll' ? KNOB1 : KNOB0);
const KA0 = -Math.PI * 1.25, KA1 = Math.PI * 0.25;   // つまみの角度（弱 → 強）
const KIND_TEXT = { toro: 'トロッと開いた', kata: 'しっかり固まって開いた', kachi: 'カチカチで二つに割れて転がった', beta: 'ベチャッと流れ出た', usu: '薄焼き卵がペタッと開いた', bicha: '折れずにビシャッと崩れた', tobi: 'フライパンから飛び出して落ちた', yabure: '返すときに破れて崩れた', koge: '返せないまま焦げた' };
// 化けたものの、切ったときに起きたこと（結果の札の3行目）
const KT = { drape: '皿のふちから垂れ下がった', frisbee: '包丁がはね返った', brick: '包丁がはね返った', volcano: '崩れて黒い山になった', hamburg: '二枚に割れた', lake: 'とけて湖になった', soboro: '崩れてそぼろの山になった', flower: '花のように開いた', futomaki: '輪切りが倒れた', futomaki2: '包丁がはね返って転がった', cloth: '広がって包みこんだ', ball: '割れてはねた', ball2: '割れてはねて皿から落ちた' };
function resText(r) {
  // 数字は 0〜100% に収める（100% を超える分は「焼けすぎ」として 100% と書く）。合わせ目のずれは真下からの角度
  const P = v => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;
  const sub = r.kind === 'bicha' ? `底の膜 ${P(r.p10)}・ふわふわ ${P(r.curd)}`
    : r.kind === 'tobi' ? `底の膜 ${P(r.p10)}・折ってから ${r.rollT.toFixed(1)}秒`
    : r.kind === 'yabure' ? `底の膜 ${P(r.p10)}・破れ ${P(r.tear)}・折ってから ${r.rollT.toFixed(1)}秒`
    : r.kind === 'koge' ? `底の焦げ ${P(r.brown)}・折ってから ${r.rollT.toFixed(0)}秒`
    : `中の固さ ${P(r.H)}・ふわふわ ${P(r.curd)}・外の焼け ${P(r.skin)}・返す ${r.rollT.toFixed(1)}秒・合わせ目のずれ ${Math.round(Math.abs(r.seam) * 360)}°${r.tear > 0 ? `・破れ ${P(r.tear)}` : ''}${Math.abs(r.off) > 0.001 ? `・切り口のずれ ${P(Math.abs(r.off))}` : ''}`;
  const FACT = { bicha: '底の膜が足りなかった', tobi: '振りが強すぎた', yabure: '膜が薄いうちに強く振った', koge: '転がりきらないまま焦げた' };
  const FLAG = r.flew ? '強く振りすぎて、一度コンロの向こうへ飛んだ' : r.stuck >= 2 ? '折らないまま40秒たって、手で丸めて載せた' : r.stuck ? '20秒たっても皿に移さなかった' : '';
  const worst = FACT[r.kind] || (r.worst && ['toro', 'kata', 'kachi', 'beta', 'usu'].includes(r.kind) ? `いちばん響いたのは「${r.worst[0]}」（×${r.worst[1].toFixed(2)}）` : '');
  const pd = plateOf(r), kt = pd.k === 'ball' && pd.d > 0.5 ? KT.ball2 : pd.k === 'futomaki' && pd.d > 0.5 ? KT.futomaki2 : KT[pd.k] || KIND_TEXT[r.kind], w2 = FLAG ? FLAG : r.broken ? '底の膜が足りないまま折って崩れた' : r.brown > 0.15 && ['toro', 'kata', 'kachi', 'beta', 'usu'].includes(r.kind) ? `外が焦げて苦い（焦げ ${P(r.brown)}）` : worst;
  const c1 = r.cause || w2;
  return { main: `${kt}（${r.score.toFixed(1)}点）`, sub: c1 || sub, worst: w2, kt };
}
function button(x, y, w, h, text, on, enabled = true) {
  ctx.save(); ctx.globalAlpha = enabled ? 1 : 0.45;
  ctx.fillStyle = on ? '#f1e6cf' : 'rgba(30,26,22,.78)'; ctx.strokeStyle = on ? '#f1e6cf' : '#8d826f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = on ? '#2a231c' : '#f1e6cf'; ctx.font = `900 ${text.length > 3 ? 24 : 28}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, y + h / 2 + 1); ctx.restore();
}
function drawKnob(v) {
  const { x, y, r } = knobG();
  ctx.save();
  ctx.fillStyle = 'rgba(30,26,22,.78)'; ctx.beginPath(); ctx.arc(x, y, r + 14, 0, Math.PI * 2); ctx.fill();
  const n = 24; for (let i = 0; i < n; i++) {   // 目盛り（青 → 赤）
    const k = i / (n - 1), a = lerp(KA0, KA1, k); ctx.strokeStyle = `rgb(${Math.round(lerp(70, 220, k))},${Math.round(lerp(120, 80, k))},${Math.round(lerp(220, 50, k))})`;
    ctx.lineWidth = 5; ctx.globalAlpha = k <= v + 0.02 ? 1 : 0.3; ctx.beginPath(); ctx.arc(x, y, r + 6, a - 0.04, a + 0.04); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = '#3b3631'; ctx.beginPath(); ctx.arc(x, y, r - 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a443d'; ctx.beginPath(); ctx.arc(x, y, r - 16, 0, Math.PI * 2); ctx.fill();
  const a = lerp(KA0, KA1, v); ctx.strokeStyle = '#f1e6cf'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14)); ctx.stroke();
  ctx.fillStyle = '#f1e6cf'; ctx.font = `700 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('弱', x + Math.cos(KA0) * (r + 2) - 2, y + Math.sin(KA0) * (r + 2) + 22); ctx.fillText('強', x + Math.cos(KA1) * (r + 2) + 2, y + Math.sin(KA1) * (r + 2) + 22);
  ctx.restore();
}
const STEPS = [['cook', '混ぜる・待つ'], ['fold', '折る'], ['roll', '返す'], ['cut', '切る']];
function overlay() {
  const s = st, t = s.t;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  { const pk = fx.plateT > -8 ? smooth((t - fx.plateT) / TRANSFER) : 0;   // 皿の場面: 写真のように四隅をゆっくり暗く
    if (pk > 0.01) { const g = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.22, W / 2, H * 0.52, H * 0.72); g.addColorStop(0, 'rgba(10,6,3,0)'); g.addColorStop(1, `rgba(10,6,3,${0.55 * pk})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); } }
  ctx.fillStyle = 'rgba(244,239,228,.95)'; ctx.fillRect(0, 0, W, 64);
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a4238'; ctx.font = `900 22px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('オムライスシミュレーター', 16, 33);
  ctx.font = `700 17px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(best ? `最高 ${best.toFixed(1)}点` : '最高 ―', W - 16, 33);
  // 工程の並び
  const cur = s.mode === 'ready' || s.mode === 'cook' ? (fx.tool === 'spat' && s.mode === 'cook' ? 1 : 0) : s.mode === 'roll' || fx.tobi || fx.yabure || fx.koge ? 2 : s.mode === 'plate' || (s.mode === 'done' && !fx.bicha) ? 3 : 1;
  const showRes = s.mode === 'done' && t - fx.cutT > 1.9;
  if (!showRes) {
    let x = 16; ctx.font = `700 17px ${FONT}`; ctx.textAlign = 'left';
    STEPS.forEach(([, n], i) => { const w = ctx.measureText(n).width; ctx.fillStyle = i === cur ? 'rgba(241,230,207,.95)' : 'rgba(30,26,22,.6)'; ctx.beginPath(); ctx.roundRect(x - 6, 78, w + 12, 30, 6); ctx.fill(); ctx.fillStyle = i === cur ? '#2a231c' : '#d8cfbd'; ctx.fillText(n, x, 94); x += w + 22; });
    // 卵を流してからの秒（止まらない）
    if (s.mode !== 'ready' && !s.fixedRes) label(`${((s.mode === 'done' ? s.cutT : t) - s.t0).toFixed(1)}秒`, W - 16, 94, '#f4efe0', 22, 'right');
  }
  // 下の操作
  if (s.mode === 'ready' && !REC) label(TOUCH ? 'タップで卵を流す' : 'クリックで卵を流す', W / 2, 740, '#ffffff', 30);
  if (s.mode === 'ready' || s.mode === 'cook' || s.mode === 'roll') drawKnob(s.knob);
  if (s.mode === 'ready' || s.mode === 'cook') {
    button(BTN.stick[0], BTN.y, BTN.stick[1], BTN.h, '菜箸', fx.tool === 'stick');
    button(BTN.spat[0], BTN.y, BTN.spat[1], BTN.h, 'フライ返し', fx.tool === 'spat');
    if (s.mode === 'cook' && fx.tool === 'spat' && !fx.foldDrag) {   // フライ返し: 卵の上半分に、奥から手前への薄い矢印
      const a0 = toScreen(vA.set(0, 0.05, -0.75)), a1 = toScreen(vB.set(0, 0.05, 0.15));
      ctx.save(); ctx.globalAlpha = 0.38; ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y - 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y + 6); ctx.lineTo(a1.x - 24, a1.y - 26); ctx.lineTo(a1.x + 24, a1.y - 26); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (s.mode === 'cook' && !REC) {
      const idle = fx.tool === 'stick' && !fx.stirring && t - fx.lastStir > 0.5 && fx.lastStir > -8;
      const hk = fx.hint ? t - fx.hint.t : 9;
      if (hk < 2.4) label(fx.hint.text, W / 2, 790, '#ffe6a8', 24, 'center', 1 - smooth((hk - 2.0) / 0.4));   // 折る操作が効かなかったときの一言（ゆっくり消える）
      else label(fx.tool === 'spat' ? '奥から手前へなぞって二つに折る' : idle ? '待つ（底に膜ができる）' : 'なぞって混ぜる', W / 2, 790, '#ffffff', 24);
    }
  }
  if (REC && s.mode === 'roll' && fx.trail.length) {   // 動画だけ: 指の動き（フライパンの手の位置）を薄い軌跡で見せる
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
    for (let i = 1; i < fx.trail.length; i++) { const a = i / fx.trail.length; ctx.globalAlpha = 0.5 * a; ctx.lineWidth = 6 + 18 * a; ctx.beginPath(); ctx.moveTo(...fx.trail[i - 1]); ctx.lineTo(...fx.trail[i]); ctx.stroke(); }
    const hd = fx.trail[fx.trail.length - 1]; ctx.globalAlpha = 0.72; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hd[0], hd[1], 22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (s.mode === 'roll') button(FIN[0], BTN.y, FIN[1], BTN.h, '完成', seamOk(s) && Math.abs(s.roll - Math.round(s.roll)) <= 0.07, canFinish(s));   // 合わせ目が真下（±25°）で落ち着くと明るくなる
  if (s.mode === 'roll' && !REC) {
    const hk = fx.hint ? t - fx.hint.t : 9;
    if (hk < 2.4) label(fx.hint.text, W / 2, 790, '#ffe6a8', 24, 'center', 1 - smooth((hk - 2.0) / 0.4));
    else if (fx.broken && s.t - fx.foldT < 3) label('崩れた。このまま返す', W / 2, 790, '#ffe6a8', 24);
    label(TOUCH ? '指を下へ払う' : '下へドラッグ', 262, 836, '#ffffff', 26);
    label('卵が奥のふちに当たって転がる', 262, 870, '#f4efe0', 16, 'center', 1, 700);
  }
  if (false) label('', W / 2, 860, '#ffffff', 26, 'center', clamp01((t - s.plateT - TRANSFER) / 0.25));
  // 結果
  const r = fx.res;
  if (showRes && r) {
    const a = smooth((t - fx.cutT - 1.9) / 0.3), T = resText(r);
    const cz = r.cause || T.worst || '', ci = cz.indexOf('（'), c1 = ci > 0 ? cz.slice(0, ci) : cz, c2 = ci > 0 ? cz.slice(ci) : '';
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(22,18,15,.8)'; ctx.beginPath(); ctx.roundRect(14, 84, W - 28, c2 ? 172 : 140, 12); ctx.fill();   // 暗い半透明の札（絵を主役に） ctx.globalAlpha = 1;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fit = (txt, size, w = W - 28) => { let z = size; do { ctx.font = `900 ${z}px ${FONT}`; z -= 1; } while (ctx.measureText(txt).width > w && z > 11); };
    const nm = (r.name || '').split('／'), l1 = `${nm[0] || ''}　${r.score.toFixed(1)}点`;   // できあがりの名前（2行）。1行目に点
    ctx.fillStyle = '#cdbfa8'; fit(l1, 21, W - 52); ctx.fillText(l1, W / 2, 108);
    ctx.fillStyle = r.kind === 'toro' && !r.broken ? '#ffd877' : '#f6ecdc'; fit(`${nm[1] || ''}ができた`, 36, W - 52); ctx.fillText(`${nm[1] || ''}ができた`, W / 2, 144);
    if (c1) { ctx.fillStyle = '#f2b38c'; fit(c1, 20, W - 52); ctx.fillText(c1, W / 2, 186); }   // 原因（何をしたから、こうなったか）
    if (c2) { ctx.fillStyle = '#a9d9a4'; fit(c2, 19, W - 52); ctx.fillText(c2, W / 2, 220); }   // 次はどうするか
    ctx.restore();
  }
}
function resize() {
  scale = REC ? 2 : (cv.getBoundingClientRect().width || W) / W * (window.devicePixelRatio || 1);
  cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
  renderer.setPixelRatio(1); renderer.setSize(cv.width, cv.height, false);
}

// ---------- 入力（つまみ・菜箸・フライ返し・フライパン・包丁） ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.02), hit = new THREE.Vector3();
function panPoint(cx, cy) {   // 画面（W×H）→ フライパンの上の点とマス座標
  ndc.set(cx / W * 2 - 1, -(cy / H * 2 - 1)); ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  if (Math.hypot(hit.x, hit.z) > 1.45) return null;
  return { gx: (hit.x / RE + 1) / 2 * N - 0.5, gy: (hit.z / RE + 1) / 2 * N - 0.5, x: hit.x, z: hit.z };
}
function stirTo(c, queue) {
  if (!c) { fx.prevCell = null; return; }
  if (fx.prevCell) { const p = fx.prevCell; stir(st, p.gx, p.gy, c.gx, c.gy); const d = Math.hypot(c.gx - p.gx, c.gy - p.gy); if (d > 0.05) { fx.lastStir = st.t; fx.stirAcc = (fx.stirAcc || 0) + d; if (fx.stirAcc > 3) { fx.stirAcc = 0; (queue ? queue.push({ t: st.t, name: 'stir', k: hash(st.t, 1) }) : sfx('stir', hash(st.t, 1))); } } }
  fx.prevCell = c; fx.stick = [c.x, c.z];
}
function knobAt(cx, cy) { const KNOB = knobG(); let a = Math.atan2(cy - KNOB.y, cx - KNOB.x); if (a > KA1 + 0.6) a -= Math.PI * 2; return clamp01((a - KA0) / (KA1 - KA0)); }
const inKnob = p => { const KNOB = knobG(); return Math.hypot(p.x - KNOB.x, p.y - KNOB.y) < KNOB.r + (st && st.mode === 'roll' ? 0 : 22); };   // 返す工程では払いの邪魔にならないよう、つまみの当たりを目盛りの内側だけに
const inBtn = (p, x, w) => p.x >= x && p.x <= x + w && p.y >= BTN.y - 6 && p.y <= BTN.y + BTN.h + 6;
// 切る（自動）: 皿に乗ってから CUT_AUTO 秒で、まっすぐ真ん中を切る。URL・リプレイも同じ
function autoCut(s, queue) {
  if (s.mode !== 'plate' || s.t - s.plateT - TRANSFER < CUT_AUTO) return;
  cut(s, 0); if (s.fixedRes) s.res = s.fixedRes; drain(queue);
}
// 折ろうとしたのに折れなかったときの一言
const showHint = text => { fx.hint = { text, t: st.t }; };
// 菜箸で「奥から手前へまっすぐ」なぞった（折ろうとした）かを見る
function foldGesture(c) {
  if (!c) return;
  if (!fx.gest) { fx.gest = { z0: c.z, x0: c.x, zMax: c.z, ok: c.z < -0.05 && Math.hypot(c.x, c.z) < RE, done: false }; return; }
  const g = fx.gest, dz = c.z - g.z0;
  if (Math.abs(c.x - g.x0) > 0.25 + 0.35 * Math.max(0, dz) || c.z < g.zMax - 0.12) g.ok = false;
  g.zMax = Math.max(g.zMax, c.z);
  if (g.ok && !g.done && dz > RE * 0.6) {
    g.done = true;
    showHint(fx.look && fx.look.p10 < TUNE.skinMin ? 'まだ底が焼けていない。混ぜずに待つ' : '折るのはフライ返し。持ちかえて奥から手前へ');
  }
}
// フライ返しのなぞり: 卵の上から手前へ、半径の 0.4 倍ほど動かすと折る（10/18 反応が悪いの指摘で、始まりの場所・長さ・まっすぐさをゆるめた）
const FOLD_LEN = 0.42, FOLD_FLICK = 0.26;
function spatMove(c, queue) {
  if (!c) return;
  fx.spat = [c.x, c.z];
  // 折る: 指を置いた点が卵の上（手前のふち近くは除く）にあり、だいたい手前へ動いたときだけ（大きく戻したら、そのなぞりでは折らない）
  if (!fx.foldDrag) { fx.foldDrag = { z0: c.z, x0: c.x, zMax: c.z, dz: 0, ok: c.z < 0.5 && Math.hypot(c.x, c.z) < RE + 0.12 }; return; }
  const d = fx.foldDrag, dz = c.z - d.z0;
  if (Math.abs(c.x - d.x0) > 0.35 + 0.6 * Math.max(0, dz) || c.z < d.zMax - 0.22) d.ok = false;
  d.zMax = Math.max(d.zMax, c.z); d.dz = Math.max(d.dz, dz);
  d.moved = Math.max(d.moved || 0, Math.hypot(c.x - d.x0, c.z - d.z0));
  if (d.ok && dz > FOLD_LEN) { fold(st); fx.foldDrag = null; drain(queue); }
}
// 指を離したとき: 短くても手前へ払っていれば折る
function spatUp(queue) {
  const d = fx.foldDrag;
  if (!st || st.mode !== 'cook' || fx.tool !== 'spat' || !d) return false;
  if (d.ok && d.dz > FOLD_FLICK) { fold(st); fx.foldDrag = null; drain(queue); return true; }
  return false;
}
// フライパンを振る: 指（マウス）を下へ動かすとフライパンが手前へ、上へ動かすと奥へ。PANPX 画面ピクセルで 1
const PANPX = 250;

// ---------- 結果 ----------
function showOk() {
  const ok = document.getElementById('result-ok'); if (!ok || REC) return;
  ok.style.top = `${cv.offsetTop + cv.offsetHeight * 0.9}px`; ok.hidden = false;
  ok.onclick = () => { ok.hidden = true; if (window.__lastModal) showResultModal(...window.__lastModal); };
  ok.focus({ preventScroll: true });
}
const hideOk = () => { const ok = document.getElementById('result-ok'); if (ok) ok.hidden = true; };
function onEnd() {
  const r = fx.res, T = resText(r);
  if (!fx.fromUrl && !replay) { if (!best || r.score > best) { best = r.score; try { localStorage.setItem('omurice-best', String(best)); } catch (e) { /* 保存できない環境 */ } } }
  setMsg(`${T.main}。${T.sub}`);
  const url = `${URL_PAGE}?r=${encodeRes(r)}`;
  const nm = (r.name || '').replace('／', '');
  window.__lastModal = [`${nm}ができた`, `${T.main}\n${T.sub}`, `オムライスシミュレーターで「${nm}」ができた（${T.kt}・${r.score.toFixed(1)}点） #オムライスシミュレーター`, url];
  // 結果の画面をそのまま見せ（スクショできるように）、OK を押してから共有の窓を出す
  showOk();
}
// 結果だけからフライパンの卵を作り直す（URL の ?r= とリプレイ用）。ビシャッは折るところ、飛び出す・破れるは返すところ、ほかは皿に乗ったところから
function fromResult(r) {
  newGame();
  const s = st;
  for (const i of ACTIVE) {
    const x = i % N - (N - 1) / 2, y = Math.floor(i / N) - (N - 1) / 2, rr = Math.hypot(x, y) / (N / 2), z = 0.62 - rr;
    s.ct[i] = r.inner + z * r.sd * 1.5; s.cb[i] = r.skin + z * (r.skin - r.p10) * 1.1 + (hash(i, 8) - 0.5) * 0.05; s.curd[i] = r.curd * (0.7 + 0.6 * hash(i, 6)); s.iri[i] = r.iri;
  }
  s.fixedRes = r; s.t = 0; s.t0 = -8; fx.pourT = -9; s.yaw = r.yaw;
  if (r.kind === 'bicha') { s.mode = 'cook'; fx.tool = 'spat'; return; }
  if (r.kind === 'tobi' || r.kind === 'yabure' || r.kind === 'koge') { s.mode = 'roll'; s.foldT = -2; fx.foldT = -2; s.e = TUNE.lip + 0.25; s.roll = 0.45; fx.rollVis = 0.45; s.lastImp = 99; return; }
  s.mode = 'plate'; s.plateT = -TRANSFER; fx.plateT = s.plateT; fx.foldT = -9; s.roll = 1 + r.seam; fx.rollVis = s.roll; fx.placed = true; s.rollT = r.rollT;
  s.fold = { inner: r.inner, skin: r.skin, p10: r.p10, sd: r.sd, curd: r.curd, iri: r.iri, brown: r.brown, tear: r.tear, yaw: r.yaw, seam: r.seam, cookT: r.cookT };
  setDish(r); fx.flyT = s.plateT - FLY_DELAY;
}

// ---------- 動画用（?rec=1）: 何皿か続けて作る。芯（切って開く・割れて転がる・飛び出す）を冒頭から ----------
// keep: そのお皿で映す区間（卵を流してからの秒）。plateFrom: 皿に乗る何秒前から映すか
const F = (v, push = 0.35, gap = 0.12, side = 0) => ({ gap, push, v, side });
const PLANS = [
  { knob: 0.55, lowAt: 6, stir: [0.2, 5.0], foldAt: 10.5, flicks: [F(6), F(4.3)], keep: [], plateFrom: -1.6, pskip: [[2.55, 3.95]], hold: 3.4 },   // 頭: 皿の上のオムライスに包丁が入って、トロッと開く（フリ）
  { knob: 0.55, stir: [0.2, 14], foldAt: 15, flicks: [F(6), F(4.3)], keep: [[0, 0.8], [5.5, 6.3], [13.8, 30]], plateFrom: 0.3, pskip: [[0.5, 1.75], [2.8, 4.2]], hold: 4.3 },   // 固まっても混ぜ続ける → 包丁を入れると崩れて、ご飯を埋めるそぼろの山（原因の一言まで）
  { knob: 0.55, stir: [0.2, 1.6], foldAt: 1.8, flicks: [F(6), F(4.3)], keep: [[0, 0.7], [1.5, 30]], plateFrom: 0.3, pskip: [[0.5, 1.75], [2.8, 4.2]], hold: 4.4 },   // 底が生のうちに折る → 包丁を入れると、皿からあふれる卵かけご飯の湖
  { knob: 0.55, lowAt: 6, stir: [0.2, 5.0], foldAt: 10.2, flicks: [F(40, 0.7, 0.1)], keep: [[9.9, 40]], plateFrom: 2.7, hold: 3.0 },   // （動画には使わない）強く振りすぎて飛び出し、皿のふちに着地
];
const LOADTXT = '粒が少なめで、つるんと開いたもう少し混ぜると、ふわふわが追いついてくるフライパンは、卵を投げる道具ではない折らずに待っても、卵は自分で巻かれない「完成」を押さないと、卵は炭になるまで待ってくれる強火で混ぜ続けると、卵は炒り卵を通りこして炭になる強火で急いで折ると、崩れるのと焦げるのを同時に味わえる火を弱めないと、卵より先にフライパンが仕上がる生のまま皿に移すと、包丁がスプーン代わりになる固まってからも混ぜると、オムレツは炒り卵に転職する底が固まる前に折ると、卵はつぎはぎで帰ってくる膜が薄いうちに強く振ると、卵は自分から破れにいく火を弱めるのが遅いと、余熱が最後まで仕事をしすぎる混ぜ足りないと、オムレツより先に薄焼き卵ができあがる皿に移すのが遅いと、トロトロは余熱に食べられる斜めに振ると、卵もそっぽを向く合わせ目が下に来る前に押すと、卵が寝返りを打つ中火で混ぜて弱めて手早く。洋食屋の手順はだいたいこれ中がほぼ生だと、切った瞬間に川になる火加減も返しも、ほぼ思いどおりにいったあと3秒早く皿に移せば、トロトロに間に合った中火で混ぜて、あとは余熱がうまくやってくれた強く振りすぎて、コンロの向こうまで飛ばした折りもしないまま40秒たった「完成」を押さずに20秒焼き続けた強火のまま、固まっても混ぜ続けた火を弱めずに焼いた底の膜ができる前に折った中が生のうちに皿へ移した膜が薄いうちに強く振った火を弱めるのが遅く、中まで固まった混ぜ足りず、ふわふわの粒ができなかった皿に移すのが少し遅かった斜めに振って、ねじれた合わせ目が真下に来る前に押した中火で混ぜて、弱めて、手早く仕上げたほとんど生のまま火加減も返しも、ほぼ思いどおりあと少し早く余熱で仕上げた黒い炒り卵の山から煙が上がる焦げ崩れて焦げて炭のかけらになったご飯に張りついたまま破れた山になった折りもせず折らないまま40秒たって、手で丸めて載せた拾って載せて開いた真っ黒のまま割れた継ぎ目から裂けて落ちた焦げて二つに割れたぽろぽろ崩れて割れた裂けて左右に滑り落ちた包丁を入れたら黄色い川ができたトロトロまであと3秒だったスプーンを入れる前に写真を撮りたい皿の上でそっぽを向いたちょっと寝返りを打ったフライパンに置き忘れた強すぎて飛び出した。拾って皿へ強く振りすぎて、一度コンロの向こうへ飛んだ20秒たっても皿に移さなかったしっかり固まって開いたコンロの向こうから拾ってきたフライパンと格闘した黒い切ると中から煙が上がる焦げ包丁を入れたら全部流れた卵かけ包丁でぽろぽろ崩れる炒り卵ライス崩れたまま押し切ったつぎはぎ裂け目から中がのぞく包丁で真っ二つに割れて転がるぺらっと一枚かぶせた薄焼き開いても一滴も垂れないしっかり卵皿の上で少しよそ見をしている合わせ目が横から顔を出す洋食屋のショーケースに並べたいご飯が見えなくなるまで流れた開いた瞬間に声が出る一歩手前で止まった開くとトロッとこぼれる転がりきらないまま焦げた折ってから転がりきらずに完成もう少し転がしてからができた指を下へ払って転がす。合わせ目が下になったら「完成」（Enter）コンロの向こうへ旅立ったオムレツ最後まで転がらなかった焦げオムレツ返すたびに裂けていった折る前に広がっていった一度崩れてから持ち直したオムライス崩れた跡がそのまま残る香ばしさが勝った焦げ目炒り卵を包んだカチカチ包丁を跳ね返しそうな卵かけご飯に近づいた薄焼き卵で包んだ昔ながらの開きかけて思いとどまった少し斜めに寝ころんだ合わせ目が横を向いたところどころ破れた洋食屋で出てきそうなご飯が隠れるほど流れ出た家で作れたら上出来のトロトロより少し手前のちゃんとトロッと開いた外が焦げて苦い（）崩れたまま底の膜が足りないまま折って崩れた。このまま返す皿へ移して、包丁を入れるまだ底が焼けていない。混ぜずに待つ折るのはフライ返し。持ちかえて奥から手前へ卵の奥の半分から、手前へまっすぐなぞる底の膜が足りなかった振りが強すぎた膜が薄いうちに強く振った振りが弱くて転がらなかった火にかけた時間返せないまま焦げた外の焼け°オムライスシミュレーター最高点秒菜箸フライ返し混ぜる・待つ折る返す切るなぞって混ぜる奥から手前へなぞって二つに折る指を下へすばやく払うドラッグフライパンが手前に動き、卵が奥のふちで転がるオムレツの上を縦に切るタップクリックで卵を流す弱強トロッと開いた開ききらなかったカチカチで二つに割れて転がったベチャッと流れ出た薄焼き卵がペタッと開いた折れずにビシャッと崩れたから飛び出して落ちた返すときに破れて崩れた中の固さふわふわ外合わせ目のずれ破れ切り口の底の膜振りはじめてから―%（）0123456789.';
const LOADALL = LOADTXT + title.toString() + cause.toString() + Object.values(KT).join('');
if (REC) {
  document.body.classList.add('rec'); resize();
  try { recAudio = new OfflineAudioContext(1, 44100 * 90, 44100); } catch (e) { recAudio = null; }
  const only = params.get('plans'); const plans = only ? only.split(',').map(Number).map(i => PLANS[i]) : PLANS.slice(0, 3);
  const sounds = [];
  let pi = -1, plan = null, cutStart = null, fi = 0, fs = 0, n = 0;
  const next = () => { pi++; plan = plans[pi]; if (!plan) return false; newGame(plan.knob); pour(st); drain(null); cutStart = null; fi = 0; fs = 0; return true; };
  next();
  window.__ready = document.fonts.load(`900 30px "Noto Sans JP"`, LOADALL).then(() => { draw(); return true; });
  const keepNow = s => {
    if (s.mode === 'plate') { const w = s.t - s.plateT - TRANSFER; return w > -plan.plateFrom && !(plan.pskip || []).some(([a, b]) => w >= a && w < b); }   // pskip: 皿に乗ってからの秒で、映さない間（包丁を待つ・引いている途中）
    if (s.mode === 'done') return true;
    const ct = s.t - s.t0; return plan.keep.some(([a, b]) => ct >= a && ct < b);
  };
  window.__frame = () => {
    if (!plan) return 2;
    const q = [], s = st, t1 = s.t + 1 / 30;
    if (s.mode === 'cook') {
      const ct = t1 - s.t0;
      advance(s, t1);
      const p = botPath(plan, ct); const c = { gx: p[0], gy: p[1], x: ((p[0] + 0.5) / N * 2 - 1) * RE, z: ((p[1] + 0.5) / N * 2 - 1) * RE };
      fx.tool = ct >= plan.foldAt - 0.5 ? 'spat' : 'stick';
      if (ct >= plan.stir[0] && ct < plan.stir[1]) stirTo(c, q); else fx.prevCell = null;
      if (plan.lowAt != null && ct >= plan.lowAt && s.knob > 0) setKnob(s, 0);   // 火を弱める（左いっぱい）
      if (ct >= plan.foldAt) { fold(s); fs = s.t + 0.3; fi = 0; }
    } else if (s.mode === 'roll') {
      // 1/60 秒ごとに手を動かす（試算と同じ動き）
      while (s.t + DT <= t1 + 1e-9 && s.mode === 'roll') {
        if (seamOk(s)) { if (fx.finAt == null) fx.finAt = s.t + 0.35; if (s.t >= fx.finAt && finish(s)) break; setPan(s, 0, 0); advance(s, s.t + DT); continue; }   // 合わせ目が下で落ち着いたら「完成」
        { const f0 = plan.flicks[fi] || F(4.5, 0.3, 0.2); if (Math.abs(s.roll - Math.round(s.roll)) <= TUNE.seamWin && s.roll >= 0.8 && (s.t < fs || s.t - fs < f0.gap)) { setPan(s, 0, 0); advance(s, s.t + DT); fs = s.t; continue; } }   // 合わせ目が下に来たら、次の振りを始めずに落ち着くのを待つ
        const f = plan.flicks[fi] || F(4.5, 0.3, 0.2);
        if (s.t < fs) setPan(s, 0, 0);
        else { const k = s.t - fs, [z, x] = flickAt(f, k); setPan(s, z, x); if (k >= flickLen(f) + 0.15) { fi++; fs = s.t; } }
        advance(s, s.t + DT);
      }
      if (Math.abs(s.vz) > 0.4) fx.trail.push([300 + s.tx * 160, 600 + s.tz * 160]); else fx.trail.shift(); if (fx.trail.length > 6) fx.trail.shift();
      if (s.mode === 'plate') advance(s, t1); else if (s.mode !== 'roll') s.t = Math.max(s.t, t1);
    } else if (s.mode === 'plate') {
      advance(s, t1);
      autoCut(s, q);
    } else if (s.mode === 'done') {
      s.t = t1;
      if (s.t - fx.cutT > plan.hold) { if (!next()) return 2; return 1; }
    }
    drain(q);
    if (!keepNow(st)) return 1;
    for (const e of q) sounds.push({ vt: Math.max(0, n / 30 - (st.t - e.t)), name: e.name, k: e.k });
    n++; draw(); return 0;
  };
  window.__audio = async () => {
    if (!recAudio) return null;
    for (const e of sounds) { at0 = e.vt; sfx(e.name, e.k); }
    const buf = await recAudio.startRendering(), d = buf.getChannelData(0), len = Math.min(d.length, Math.ceil(44100 * (n / 30 + 0.3)));
    const bytes = new Uint8Array(44 + len * 2), v = new DataView(bytes.buffer);
    const str = (o, s2) => { for (let i = 0; i < s2.length; i++) bytes[o + i] = s2.charCodeAt(i); };
    str(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, len * 2, true);
    let pk = 1e-6; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i]));
    const gain = Math.min(0.9, 0.89 / pk);   // いちばん大きい所を −1dB に
    for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * gain)) * 32767, true);
    let b = ''; for (let i = 0; i < bytes.length; i += 0x8000) b += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(b);
  };
} else {
  resize(); window.addEventListener('resize', () => { resize(); if (st) draw(); });
  let wall0 = 0, lastNow = 0, off = 0;
  const gameT = ts => (ts - wall0) / 1000 - off;
  const local = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  let down = false, panDrag = null, key = null, pull = null;
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); audio(); if (modalOpen()) return;
    const p = local(e), s = st, now = performance.now();
    if (s.mode === 'done') return;   // 結果の画面では、OK を押すまで何もしない（スクショのため）
    if ((s.mode === 'ready' || s.mode === 'cook' || s.mode === 'roll') && inKnob(p)) { fx.knobDrag = true; fx.lastKnob = s.t; cv.setPointerCapture(e.pointerId); setKnob(s, knobAt(p.x, p.y)); return; }
    if (s.mode === 'ready' || s.mode === 'cook') {
      if (inBtn(p, ...BTN.stick)) { fx.tool = 'stick'; return; }
      if (inBtn(p, ...BTN.spat)) { fx.tool = 'spat'; return; }
    }
    if (s.mode === 'ready') { wall0 = now - s.t * 1000; off = 0; pour(s); drain(null); setMsg('菜箸でなぞって混ぜる'); return; }
    if (s.mode === 'cook') {
      down = true; fx.stirring = true; cv.setPointerCapture(e.pointerId); fx.prevCell = null; fx.foldDrag = null; fx.gest = null;
      const c = panPoint(p.x, p.y);
      if (fx.tool === 'stick') { stirTo(c, null); foldGesture(c); } else spatMove(c, null);
      return;
    }
    if (s.mode === 'roll' && !replay && inBtn(p, ...FIN)) { if (finish(s)) drain(null); else showHint('もう少し転がしてから'); return; }
    if (s.mode === 'roll' && !replay) { cv.setPointerCapture(e.pointerId); panDrag = { y0: e.clientY, x0: e.clientX, z0: s.tz, xx0: s.tx, u: cv.getBoundingClientRect().height * 0.42 }; pull = null; return; }   // 画面の高さの 42% を動かすとフライパンが 1 動く（端末によらない）
  });
  cv.addEventListener('pointermove', e => {
    const p = local(e), s = st;
    if (fx.knobDrag) { fx.lastKnob = s.t; setKnob(s, knobAt(p.x, p.y)); return; }
    if (panDrag && s.mode === 'roll') { panDrag.wz = panDrag.z0 + (e.clientY - panDrag.y0) / panDrag.u; panDrag.wx = panDrag.xx0 + (e.clientX - panDrag.x0) / panDrag.u; return; }   // 指の位置は覚えておき、物理の1ステップごとに少しずつ追う（端末の速さで強さが変わらない）
    if (!down || s.mode !== 'cook') return;
    const c = panPoint(p.x, p.y);
    if (fx.tool === 'stick') { stirTo(c, null); foldGesture(c); } else spatMove(c, null);
  });
  const up = () => {
    // フライ返しでなぞったのに折れなかった（始まりが手前・まっすぐでない）ときは、なぞり方を一言
    if (!spatUp(null) && st && st.mode === 'cook' && fx.tool === 'spat' && fx.foldDrag && (fx.foldDrag.moved || 0) > 0.3) showHint('卵の上から、手前へなぞる');
    fx.gest = null; down = false; fx.stirring = false; panDrag = null; fx.knobDrag = false; fx.prevCell = null; fx.foldDrag = null; fx.cutting = false; fx.lastBin = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  // キーボード: ↑（W・スペース）を押している間フライパンを奥へ押し、離すと手前へ引く（長く押したほど強く）。↓（S）はそのまま手前へ引く
  const isPush = c => c === 'ArrowUp' || c === 'KeyW' || c === 'Space', isPull = c => c === 'ArrowDown' || c === 'KeyS';
  window.addEventListener('keydown', e => {
    const ok = document.getElementById('result-ok');
    if ((e.code === 'Enter' || e.code === 'Space') && ok && !ok.hidden) { e.preventDefault(); ok.click(); return; }
    if (e.code === 'Enter' && !modalOpen() && st && st.mode === 'roll' && !replay) { e.preventDefault(); if (finish(st)) drain(null); else showHint('もう少し転がしてから'); return; }
    if (modalOpen() || !st || st.mode !== 'roll' || replay) return;
    if (isPush(e.code) || isPull(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (isPush(e.code)) { key = { t0: performance.now() }; pull = null; }
    if (isPull(e.code)) { pull = { v: 5 }; key = null; }
  });
  window.addEventListener('keyup', e => { if (isPush(e.code) && key) { const held = (performance.now() - key.t0) / 1000; pull = { v: held < 1 ? 1.5 + 9.5 * Math.min(1, held / 1.2) : 9.4 + 9 * (held - 1) } /* 1秒までは飛ばない強さ、1.3秒を超えると飛び出す */; key = null; } });
  // 手を離している間は、フライパンをゆっくり真ん中へ戻す（卵がすべらない速さ）
  const moveHand = dt => {
    const s = st; if (s.mode !== 'roll' || replay) { key = null; pull = null; return; }
    if (panDrag) { if (panDrag.wz != null) { const mv = 26 * dt, z1 = s.tz + Math.max(-mv, Math.min(mv, panDrag.wz - s.tz)), x1 = s.tx + Math.max(-mv, Math.min(mv, panDrag.wx - s.tx)); setPan(s, z1, x1); } return; }
    let z = s.tz;
    if (key) z = Math.max(-TUNE.range, z - 1.5 * dt);
    else if (pull) { z = Math.min(TUNE.range, z + pull.v * dt); if (z >= TUNE.range) pull = null; }
    else z = Math.abs(z) < 1.2 * dt ? 0 : z - Math.sign(z) * 1.2 * dt;
    const x = Math.abs(s.tx) < 1.2 * dt ? 0 : s.tx - Math.sign(s.tx) * 1.2 * dt;
    setPan(s, z, x);
  };
  document.fonts.load(`700 16px "Noto Sans JP"`, '結果Xでポストリプレイもう一度' + LOADALL).catch(() => {});
  document.fonts.load(`900 30px "Noto Sans JP"`, LOADALL).finally(() => {
    const rq = params.get('r'), rr = rq && decodeRes(rq);
    newGame();
    const startReplay = r => { fromResult(r); replay = { res: r }; fx.fromUrl = true; wall0 = performance.now(); off = 0; lastNow = wall0; };
    if (rr) startReplay(rr);
    wall0 = performance.now(); lastNow = wall0;
    const loop = now => {
      const s = st;
      if (now - lastNow > 250) off += (now - lastNow - 16) / 1000;   // タブが隠れていた間は止める
      if (window.__man != null) off = (now - wall0) / 1000 - window.__man;   // 確かめ用: ゲームの時刻を外から決める（静止画を撮る道具）
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      const gt = gameT(now);
      if (s.mode === 'ready') { s.t = gt; }
      // 混ぜるのをやめて 0.8 秒たち、底の膜が折れるだけできたら、自動でフライ返しに持ちかえる（＝折ってよい合図。菜箸のボタンでいつでも戻せる）
      if (s.mode === 'cook' && !replay && !fx.heatHint && s.knob > 0.35 && fx.look && fx.look.p10 >= 0.3) { fx.heatHint = true; showHint('底が固まってきた。火を弱めるならこのころ'); }   // 初めての人に、火を弱める時期を一度だけ知らせる
      if (s.mode === 'cook' && !replay && fx.tool === 'stick' && !fx.stirring && !fx.knobDrag && s.t - s.t0 > 1 && s.t - Math.max(fx.lastStir, fx.lastKnob ?? -9, s.t0) > 0.8 && fx.look && fx.look.p10 >= TUNE.signal && !fx.autoSpat) { fx.tool = 'spat'; fx.autoSpat = true; setMsg('奥から手前へなぞって二つに折る'); }
      else if (s.mode === 'cook' || s.mode === 'roll' || s.mode === 'plate') {
        // 手の動きは物理の1ステップ（1/60秒）ごとに進める。コマが重くても、振りの強さは同じ
        const tEnd = Math.max(s.t, gt); let guard = 0;
        while (s.t + DT <= tEnd + 1e-9 && guard++ < 600) { moveHand(DT); advance(s, s.t + DT); }
        drain(null);
        if (replay && s.mode === 'cook' && s.t > 0.6) { s.foldT = s.t; s.cutT = s.t; s.mode = 'done'; s.res = s.fixedRes; s.ev.push({ k: 'bicha', t: s.t }); drain(null); }   // URL・リプレイのビシャッ
        if (replay && s.mode === 'roll' && s.t > 0.8) { const k = s.fixedRes.kind; s.mode = 'done'; s.res = s.fixedRes; s.cutT = s.t; if (k !== 'koge') s.ev.push({ k: 'imp', t: s.t, v: k === 'tobi' ? 10 : 7, g: 0 }); s.ev.push({ k, t: s.t }); drain(null); }   // URL・リプレイの飛び出す・破れる
        autoCut(s, null);   // 切るのは自動（URL・リプレイも同じ）
      } else if (s.mode === 'done') {
        s.t = Math.max(s.t, gt);
        if (!fx.ended && s.t - fx.cutT > 2.8) { fx.ended = true; window.__replayUI && window.__replayUI(false); onEnd(); }
      }
      draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.__replayStart = () => { const r = fx.res; if (r) startReplay(r); };
  });
}
// 皿の場面の絵の作り（色の出し方・映り込み・隠れている失敗の模型）を、あらかじめ下ごしらえしておく（「完成」を押した瞬間に固まらないように）
setTimeout(() => {
  try {
    const hid = []; scene.traverse(o => { if (!o.visible) { hid.push(o); o.visible = true; } });
    const tm = renderer.toneMapping; renderer.toneMapping = THREE.ACESFilmicToneMapping; envMats.forEach(m => { m.envMap = studio; });
    renderer.compile(scene, camera);
    renderer.toneMapping = tm; envMats.forEach(m => { m.envMap = fx && fx.real ? studio : eggEnv; }); hid.forEach(o => { o.visible = false; });
  } catch (e) { /* 下ごしらえできなくても遊べる */ }
}, 600);
// 確かめ用
window.__state = () => st;
window.__fx = () => fx;
window.__judge = judge;

// 結果のモーダル
window.showResultModal = (main, sub, postText, pageUrl) => {
  const m = document.getElementById('result'); if (!m) return;
  const mm = document.getElementById('result-main'), ix = main.lastIndexOf('（');
  mm.textContent = ix > 0 ? main.slice(0, ix) : main;
  if (ix > 0) { const sp = document.createElement('span'); sp.style.whiteSpace = 'nowrap'; sp.textContent = main.slice(ix); mm.appendChild(sp); }   // 点数は改行させない
  document.getElementById('result-sub').textContent = sub || '';
  window.__shareNote = { text: postText, url: pageUrl || URL_PAGE };
  const post = document.getElementById('result-post');
  if (post) post.textContent = '共有';
  m.hidden = false; m.classList.add('guard'); setTimeout(() => m.classList.remove('guard'), 600);
  document.getElementById('result-again').focus();
};
window.hideResultModal = () => { const m = document.getElementById('result'); if (m) m.hidden = true; };
(() => {
  const m = document.getElementById('result'); if (!m || REC) return;
  const guard = () => m.classList.contains('guard');
  document.getElementById('result-post').addEventListener('click', async (e) => {
    e.preventDefault();
    if (guard()) return;
    const note = window.__shareNote || { text: '', url: URL_PAGE };
    const payload = `${note.text}\n${note.url}`;
    try {
      if (navigator.share) await navigator.share({ text: note.text, url: note.url });
      else {
        await navigator.clipboard.writeText(payload);
        e.currentTarget.textContent = 'コピーしました';
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(payload); e.currentTarget.textContent = 'コピーしました'; } catch {}
    }
  });
  document.getElementById('result-again').addEventListener('click', () => {
    if (guard()) return; audio(); hideResultModal(); hideOk(); replay = null; newGame(); setMsg(TOUCH ? 'タップで卵を流す' : 'クリックで卵を流す');
  });
  document.getElementById('result-replay')?.addEventListener('click', () => { if (guard()) return; hideResultModal(); hideOk(); window.__replayUI && window.__replayUI(true); window.__replayStart && window.__replayStart(); setMsg('リプレイ中'); });
  m.addEventListener('click', e => { if (e.target === m && !guard()) { hideResultModal(); if (st && st.mode === 'done' && fx.ended) showOk(); } });
})();
// リプレイ中は「■ リプレイを止める」を出す。そのボタンか画面のタップで止めて、結果に戻る
(() => {
  const app = document.getElementById('app'); if (!app || REC) return;
  const rs = document.createElement('button'); rs.type = 'button'; rs.className = 'replay-stop'; rs.textContent = '■ リプレイを止める'; rs.hidden = true; app.appendChild(rs);
  window.__replayUI = on => { rs.hidden = !on; window.__replaying = on; };
  const stopReplay = () => { if (!window.__replaying) return; window.__replayUI(false); if (st && !fx.res && st.fixedRes) { fx.res = st.fixedRes; fx.cutT = st.t - 10; }   // 切る前に止めたら、そのまま結果へ
    if (st && fx.res) { st.mode = 'done'; st.res = fx.res; fx.ended = true; if (window.__lastModal) showResultModal(...window.__lastModal); } };
  rs.addEventListener('click', stopReplay);
  window.addEventListener('pointerdown', e => { if (window.__replaying && e.target === cv) { e.stopImmediatePropagation(); e.preventDefault(); stopReplay(); } }, true);
})();
