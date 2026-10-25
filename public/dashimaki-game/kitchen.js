// 出し巻きの3Dシーン（scene.html の静止画と game.html の試作で共有）
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';

// ---------- 乱数・ノイズ ----------
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const perm = Array.from({ length: 512 }, () => rnd());
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => perm[((a * 57 + b * 131) & 511 + 512) % 512];
  const s = t => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
const fbm = (x, y, o = 5) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return v; };
function canvasTex(w, h, draw, srgb = true, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
function pixelTex(w, h, fn, srgb = true) {
  return canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [r, gg, b] = fn(x / w, y / h); const i = (y * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, srgb);
}
const SEED0 = seed; // perm を作った直後の乱数の状態（buildScene のたびにここへ戻し、毎回同じ見た目にする）

// 場面に関係なく毎回同じになる模様は、1回だけ作って使い回す（staticTex(名前)）。盛り付けで使う物は prewarmPlate() で先に作っておける
const STATIC_TEX = {
  // 巻いた卵・切れの細かい凹凸
  rollBump: () => {
    const t = pixelTex(1024, 1024, (u, v) => {
      const k = (fbm(u * 30 + fbm(u * 3, v * 6) * 2, v * 45, 3) * 0.6 + fbm(u * 90, v * 90, 2) * 0.4) * 255; return [k, k, k];
    }, false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  },
  // コンロの面
  stove: () => pixelTex(512, 512, (u, v) => { const k = 14 + fbm(u * 40, v * 40, 3) * 10; return [k, k, k + 2]; }),
  // 石の長皿
  stone: () => {
    const t = pixelTex(1024, 1024, (u, v) => {
      const n = fbm(u * 6, v * 6), fine = fbm(u * 120, v * 120, 2);
      const fleck = (fine - 0.5) * 26 + (fbm(u * 300, v * 300, 1) > 0.82 ? 16 : 0);
      const k = 58 + n * 22 + fleck; return [k + 4, k + 1, k - 3];
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.3, 0.3); return t;
  },
  stoneBump: () => {
    const t = pixelTex(512, 512, (u, v) => { const k = fbm(u * 70, v * 70, 3) * 255; return [k, k, k]; }, false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.3, 0.3); return t;
  },
  // 木のテーブル
  woodTop: () => {
    const t = pixelTex(1024, 1024, (u, v) => {
      const plank = Math.floor(v * 5), pv = v * 5 - plank;
      const grain = Math.sin((u * 3 + fbm(u * 2 + plank * 7, pv * 6) * 4 + pv * 1.5) * 18) * 0.5 + 0.5;
      const n = fbm(u * 20 + plank, v * 60, 3);
      let k = 0.42 + grain * 0.12 + n * 0.2 + (plank % 2) * 0.05;
      if (pv < 0.012 || pv > 0.988) k *= 0.35;
      return [128 * k, 84 * k, 48 * k];
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.6); return t;
  },
  // 包丁：刃のヘアラインと刃文、粗さ、白木の柄（uv: x(0..L) と y(-BH..0) を 0..1 に。v=0 が刃先、v=1 が峰）
  knifeBrushed: () => pixelTex(1024, 256, (u, v) => {
    v = 1 - v;
    const hair = fbm(u * 3, v * 220, 2) * 34;                 // ヘアライン
    let k = 150 + hair + fbm(u * 2 + 5, v * 2, 3) * 30;
    const hm = hamonAt(u);
    if (v < hm) k = 214 + fbm(u * 40, v * 40, 2) * 22;         // 刃先の鋼（明るい）
    else if (v < hm + 0.025) k = 235;                        // 刃文の境目
    if (v > 0.93) k -= 50;                                   // 峰側はやや暗い
    return [k, k, k + 3];
  }),
  knifeRough: () => pixelTex(1024, 256, (u, v) => { v = 1 - v; const k = (v < hamonAt(u) ? 0.07 : 0.2 + fbm(u * 3, v * 200, 2) * 0.12) * 255; return [k, k, k]; }, false),
  knifeWood: () => pixelTex(512, 64, (u, v) => { const k = 0.75 + fbm(u * 3, v * 30, 3) * 0.25; return [214 * k, 186 * k, 140 * k]; }),
};
const hamonAt = (u) => 0.17 + Math.sin(u * 38) * 0.012 + (fbm(u * 9, 3) - 0.5) * 0.04; // 包丁の刃文の高さ
const texCache = {};
const staticTex = (key) => (texCache[key] ??= STATIC_TEX[key]());
// 盛り付けで使う模様を先に作っておく（遊び方を読んでいる間などに呼ぶと、「盛り付け中」が短くなる）
export function prewarmPlate() { for (const key of ['rollBump', 'stone', 'stoneBump', 'woodTop', 'knifeBrushed', 'knifeRough', 'knifeWood']) staticTex(key); }

export function createRenderer(W, H) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// 形のゆがみをランダムに作る（strength 0〜1）。巻きすぎて膨らむ・片側だけ太い・ゆるく曲がる、のうち1〜2つ
export function randomDeform(strength, rand = Math.random) {
  const d = {}, kinds = ['bulge', 'taper', 'bend'].sort(() => rand() - 0.5).slice(0, rand() < 0.4 + strength * 0.4 ? 2 : 1);
  const sgn = () => (rand() < 0.5 ? -1 : 1);
  if (kinds.includes('bulge')) d.bulge = { c: (rand() - 0.5) * 1.4, w: 0.25 + rand() * 0.35, a: (0.08 + rand() * 0.1) * (0.6 + strength) };
  if (kinds.includes('taper')) d.taper = sgn() * (0.06 + rand() * 0.08) * (0.6 + strength);
  if (kinds.includes('bend')) d.bend = sgn() * (0.05 + rand() * 0.08) * (0.6 + strength);
  return d;
}

// stage: pour / cook / cut / plate、variant（plate のみ）: normal / hashi / tamago / nenrin、fx: ポストエフェクトの有無
// fxScale: 隙間の影とピント用の奥行きを描く解像度の倍率（試作では 0.5 で軽くする。setSize のときに効く）
// look（plate のみ）: 判定で決まった見た目の変化。size: 'huge' | 'tiny'、color: 'char' | 'jelly'、k: 強さ（Cの数で 1〜2.5）、
//   mess: 盛り付けの崩れ（0＝きれいに一列、1＝ばらばらに切れて倒れ、皿の真ん中に積み重なる）、deform: 形のゆがみ（randomDeform の結果）、
//   shape: 'drill' | 'wave' | 'zigzag' | 'flat'（全体の形）、surface: 'batter' | 'crumbs'（表面）、inner: 'cheese' | 'balloon'（中身）、nenrin: 年輪（巻かれていないときの模様用）、
//   gold: 全部Aの金色＋後光、soap: 断面からシャボン玉、animate: 包丁で切るアニメーション（返り値の cutAnim.update(秒) で動かす）、
//   defects: B段階の欠点 [{ defect, strength, at }]（oily・stuck・scorched・runny・peeling・pits・unevenLayers・small・big。bent・thickEnd は deform で表す）
// stage に 'whole' を渡すと、切る前の1本を皿にのせた場面になる
export function buildScene(renderer, { stage = 'cook', variant = 'normal', fx = true, fxScale = 1, look = {}, fire = 0.7 } = {}) {
  seed = SEED0;
  const STAGE = stage, VAR = variant, FX = fx;
  const PLATED = STAGE === 'plate' || STAGE === 'cut' || STAGE === 'whole';
  const { x: W, y: H } = renderer.getSize(new THREE.Vector2());
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0b0a);
  scene.fog = new THREE.Fog(0x0d0b0a, 4.5, 9);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  // 主観視点：料理する人の目の高さから、柄越しに玉子焼き器を見下ろす
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 100);
  camera.position.set(-0.08, 2.75, 3.25);
  camera.lookAt(0.05, 0.0, -0.15);

  // ---------- 鉄の玉子焼き器 ----------
  const ironRough = pixelTex(256, 256, (u, v) => {
    const n = fbm(u * 18, v * 18) * 0.6 + fbm(u * 90, v * 90, 2) * 0.4;
    const k = 120 + n * 120; return [k, k, k];
  }, false);
  const ironColor = pixelTex(512, 512, (u, v) => {
    const n = fbm(u * 6, v * 6);
    const speck = fbm(u * 140, v * 140, 2) > 0.72 ? 14 : 0;
    const k = 16 + n * 14 + speck;
    // 焦げ・錆の赤茶色いムラ
    const rust = Math.max(0, Math.min(1, (fbm(u * 3 + 11, v * 3 + 2) - 0.52) * 3.5)) * (0.6 + fbm(u * 30, v * 30, 2) * 0.6);
    return [k + rust * 62, k + rust * 22, k + rust * 6];
  });
  for (const t of [ironColor, ironRough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.45, 0.45); }
  const iron = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: ironColor, metalness: 0.75, roughness: 1.0, roughnessMap: ironRough,
  });

  const PW = 2.1, PL = 2.9, WALL = 0.11, WH = 0.36, R = 0.12;
  function rrect(w, l, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -l / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + l - r); s.quadraticCurveTo(x + w, y + l, x + w - r, y + l);
    s.lineTo(x + r, y + l); s.quadraticCurveTo(x, y + l, x, y + l - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  const pan = new THREE.Group(); scene.add(pan);
  const outer = rrect(PW + WALL * 2, PL + WALL * 2, R + WALL);
  outer.holes.push(rrect(PW, PL, R));
  const wallGeo = new THREE.ExtrudeGeometry(outer, { depth: WH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 16 });
  wallGeo.rotateX(-Math.PI / 2);
  const walls = new THREE.Mesh(wallGeo, iron); walls.castShadow = walls.receiveShadow = true; pan.add(walls);
  const baseGeo = new THREE.ExtrudeGeometry(rrect(PW + WALL * 2, PL + WALL * 2, R + WALL), { depth: 0.06, bevelEnabled: false, curveSegments: 16 });
  baseGeo.rotateX(-Math.PI / 2);
  // 底だけは折り返しで貼る（UVが底の中央で0をまたぎ、普通の繰り返しだと空の鍋に継ぎ目が見えるため）
  const ironFloor = iron.clone();
  for (const key of ['map', 'roughnessMap']) { ironFloor[key] = iron[key].clone(); ironFloor[key].wrapS = ironFloor[key].wrapT = THREE.MirroredRepeatWrapping; }
  const base = new THREE.Mesh(baseGeo, ironFloor); base.receiveShadow = true; pan.add(base);
  // 鍋の熱：温まるほど、バーナーの真上（底の中央）から赤黒く色づく（setPanHeat(色, 0〜1)）
  const heatTex = canvasTex(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.45, '#d8d8d8'); grd.addColorStop(1, '#000');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  // 押し出し形状のUVは長さ単位（底の中央が0）なので、底の広さが 0〜1 に収まるようにずらす
  heatTex.repeat.set(1 / (PW + WALL * 2), 1 / (PL + WALL * 2)); heatTex.offset.set(0.5, 0.5);
  Object.assign(ironFloor, { emissiveMap: heatTex, emissive: new THREE.Color(0) });
  const panHeatMax = new THREE.Color();
  function setPanHeat(t, color = 0x7a2408) { const k = THREE.MathUtils.smoothstep(t, 0.15, 1); ironFloor.emissive.copy(panHeatMax.set(color)).multiplyScalar(k * k); }

  // 油のテカリ（底面の一部だけ鈍く光る）
  const oilMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0a09, metalness: 0.3, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true,
    alphaMap: pixelTex(256, 256, (u, v) => { const n = fbm(u * 5 + 3, v * 5); const k = Math.max(0, (n - 0.42) * 3.2) * 255; return [k, k, k]; }, false),
  });
  const oil = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), oilMat);
  oil.rotation.x = -Math.PI / 2; oil.position.y = 0.062; pan.add(oil);

  // 柄：鉄の首から、木の柄が手前（カメラ側）へ伸びる（2026-10-11 金属の口金をやめて木だけに）
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.55), iron);
  neck.position.set(0, 0.28, PL / 2 + WALL + 0.25); neck.rotation.x = -0.18; pan.add(neck);
  const handleDir = new THREE.Vector3(0, 0.22, 1).normalize();
  const hStart = new THREE.Vector3(0, 0.36, PL / 2 + WALL + 0.48);
  function along(d) { return hStart.clone().addScaledVector(handleDir, d); }
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), handleDir);
  const woodTex = pixelTex(512, 128, (u, v) => {
    const grain = Math.sin((v * 40 + fbm(u * 3, v * 8) * 6) * Math.PI) * 0.5 + 0.5;
    const n = fbm(u * 10, v * 30);
    const base = 0.55 + grain * 0.2 + n * 0.25;
    const dirt = fbm(u * 4 + 9, v * 4) * 0.35;
    return [175 * base - dirt * 60, 118 * base - dirt * 50, 68 * base - dirt * 35];
  });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0, bumpMap: woodTex, bumpScale: 0.6 });
  const handleGeo = new THREE.CylinderGeometry(0.115, 0.13, 3.02, 48, 1);
  const handle = new THREE.Mesh(handleGeo, wood);
  handle.position.copy(along(1.51)); handle.quaternion.copy(quat); handle.castShadow = true; pan.add(handle);

  // ---------- 卵液（手前側に流し入れたところ） ----------
  // 固まりかけてクリーム色に膨らんだ部分（ぷくっとした気泡）と、縁のレース状に固まった部分を持つ
  const liqL = STAGE === 'pour' ? PL + 0.02 : 2.4;
  const blisters = [];
  const nBlister = STAGE === 'pour' ? 0 : 9;
  for (let i = 0; i < nBlister; i++) {
    blisters.push({ x: (rnd() - 0.5) * (PW - 0.3), y: -1.08 + rnd() * 1.75, r: 0.035 + rnd() ** 1.6 * 0.08, h: 0.018 + rnd() * 0.025, k: rnd() * 10 });
  }
  function liquidAt(x, y) {
    let h = 0, cook = 0;
    for (const b of blisters) {
      const dx = x - b.x, dy = y - b.y;
      const ang = Math.atan2(dy, dx);
      const rr = b.r * (0.75 + 0.5 * fbm(Math.cos(ang) * 1.5 + b.k, Math.sin(ang) * 1.5 + b.k, 3));
      const d = Math.sqrt(dx * dx + dy * dy) / rr;
      if (d < 1.6) {
        const dome = Math.pow(Math.max(0, 1 - d * d), 1.4);
        h = Math.max(h, dome * b.h);
        cook = Math.max(cook, Math.min(1, Math.max(0, 1.35 - d) * 1.6));
      }
    }
    // 縁（鍋の壁際・手前側）がレース状に固まる
    const edge = STAGE === 'pour' ? Math.min(PW / 2 - Math.abs(x), liqL / 2 - Math.abs(y)) : Math.min(PW / 2 - Math.abs(x), y + liqL / 2);
    const lace = Math.max(0, 1 - edge / 0.11) * (fbm(x * 26 + 3, y * 26, 3) > 0.42 - Math.max(0, 1 - edge / 0.05) * 0.3 ? 1 : 0.25);
    h = Math.max(h, lace * 0.016 + Math.max(0, 1 - edge / 0.08) * 0.022);
    return { h, cook, lace };
  }
  const liquidGeo = new THREE.PlaneGeometry(PW + 0.02, liqL, PLATED ? 1 : 260, PLATED ? 1 : 300); // 盛り付けでは使わないので最小に
  {
    const p = liquidGeo.attributes.position, col = new Float32Array(p.count * 3);
    const raw = new THREE.Color(), cream = new THREE.Color(), tmp = new THREE.Color();
    const deepYolk = new THREE.Color().setRGB(0.90, 0.48, 0.04, THREE.SRGBColorSpace), eggWhite = new THREE.Color().setRGB(0.98, 0.86, 0.55, THREE.SRGBColorSpace);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const { h, cook, lace } = liquidAt(x, y);
      const n = fbm(x * 2 + 4, y * 2);
      p.setZ(i, h + fbm(x * 3 + 5, y * 3) * 0.008);
      raw.setRGB(0.92 + n * 0.04, 0.63 + n * 0.10, 0.12 + n * 0.06, THREE.SRGBColorSpace);
      cream.setRGB(0.97, 0.86 + n * 0.05, 0.52 + n * 0.1, THREE.SRGBColorSpace);
      // 白身の筋（細長く流れる）と、黄身の濃い部分
      const strand = THREE.MathUtils.smoothstep(fbm(x * 3.2 + fbm(x * 2, y * 2 + 3) * 2.5, y * 4.5 + fbm(x * 2 + 9, y * 2) * 2.5 + 7, 4), 0.62, 0.72);
      const deep = THREE.MathUtils.smoothstep(fbm(x * 1.2 + 30, y * 1.2, 3), 0.55, 0.75);
      raw.lerp(deepYolk, deep * 0.6);
      tmp.copy(raw).lerp(eggWhite, strand * 0.38).lerp(cream, Math.min(0.92, cook * 0.85 + lace * 0.8));
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    liquidGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    liquidGeo.computeVertexNormals();
  }
  // 生の部分はツルツル、固まった部分はしっとりマットに
  const liquidRough = PLATED ? null : pixelTex(512, 512, (u, v) => {
    const { cook, lace } = liquidAt((u - 0.5) * (PW + 0.02), (0.5 - v) * liqL);
    const k = (0.05 + Math.min(1, cook + lace) * 0.5) * 255; return [k, k, k];
  }, false);
  if (liquidRough) liquidRough.flipY = true;
  const liquidBump = PLATED ? null : pixelTex(512, 512, (u, v) => { const k = fbm(u * 30, v * 30, 3) * 255; return [k, k, k]; }, false);
  const liquidMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 1, roughnessMap: liquidRough, metalness: 0,
    clearcoat: 0.7, clearcoatRoughness: 0.06, bumpMap: liquidBump, bumpScale: 0.06,
    sheen: 0.3, sheenColor: new THREE.Color(0xffd27a),
  });
  const liquid = new THREE.Mesh(liquidGeo, liquidMat);
  liquid.rotation.x = -Math.PI / 2; liquid.position.set(0, 0.07, STAGE === 'pour' ? 0 : PL / 2 - liqL / 2 - 0.01);
  liquid.receiveShadow = true; pan.add(liquid);

  // 生の卵液にだけ浮く小さな泡
  const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xf2b23a, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.75 });
  const bubbles = [];
  const nBubble = PLATED ? 0 : STAGE === 'pour' ? 340 : 110;
  for (let i = 0, n = 0; i < 3000 && n < nBubble; i++) {
    const x = (rnd() - 0.5) * (PW - 0.16), y = STAGE === 'pour' ? (rnd() - 0.5) * (PL - 0.16) : -1.1 + rnd() * 1.8;
    const a = liquidAt(x, y); if (a.cook > 0.05 || a.lace > 0.05) continue; n++;
    const r = 0.006 + rnd() ** 3 * 0.024;
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bubbleMat);
    b.position.set(x, 0.075, liquid.position.z - y); b.scale.y = 0.6; pan.add(b); bubbles.push(b);
  }

  // ---------- 巻いた卵（奥側） ----------
  // 角ばったブロック形。薄い卵の層を重ねたシワ・折り目が長辺方向に走る
  const RHX = (PW - 0.04) / 2, RHY = 0.29, RHZ = 0.47, RR = 0.15;
  const foldAt = (x, s) => {
    const warp = fbm(x * 0.6 + 2, s * 1.5) * 2.2;
    const f = fbm(x * 1.3 + warp, s * 3.2 + warp * 0.6 + 1, 4);
    const blot = fbm(x * 2.2 + 5, s * 2.2 + 3, 3);
    const ridge = Math.pow(1 - Math.abs(f * 2 - 1), 1.6) * 0.7 + blot * 0.3;
    return ridge;
  };
  // hx: 半分の長さ / xOff: 元の1本の中での位置（模様を連続させる） / cut: 両端を包丁で切った平らな断面にする
  const rollColors = {
    valley: new THREE.Color().setRGB(0.89, 0.53, 0.04, THREE.SRGBColorSpace),
    peak: new THREE.Color().setRGB(0.98, 0.77, 0.22, THREE.SRGBColorSpace),
    seam: new THREE.Color().setRGB(0.82, 0.48, 0.06, THREE.SRGBColorSpace),
    brown: new THREE.Color().setRGB(0.72, 0.40, 0.08, THREE.SRGBColorSpace),
    cream: new THREE.Color().setRGB(1.0, 0.86, 0.42, THREE.SRGBColorSpace),
    inner: new THREE.Color().setRGB(1.0, 0.80, 0.26, THREE.SRGBColorSpace),
  };
  // 形：元の1本での位置 gx での、太さの倍率 s、手前奥へのずれ dz、上へのずれ dy、ねじれの角度 tw
  const DEF = look.deform, SHAPE = look.shape, KL = look.k || 1;
  const BALLOON = look.inner === 'balloon' ? KL : 0, BATTER = look.surface === 'batter' ? KL : 0, CHEESE = look.inner === 'cheese' ? KL : 0;
  const SHAPED = !!(DEF || SHAPE === 'drill' || SHAPE === 'wave' || SHAPE === 'zigzag' || BALLOON);
  function deformAt(gx) {
    let sc = 1, dz = 0, dy = 0, tw = 0;
    const t = (gx + RHX) / (2 * RHX); // 0〜1（左端から右端）
    if (DEF) {
      if (DEF.bulge) sc *= 1 + DEF.bulge.a * Math.exp(-(((gx - DEF.bulge.c) / DEF.bulge.w) ** 2));
      if (DEF.taper) sc *= 1 + DEF.taper * gx / RHX;
      if (DEF.bend) dz = DEF.bend * ((gx / RHX) ** 2 - 0.4);
    }
    // ドリル：ねじれて先が細る（強さ1で1回、1.5で2回半）
    if (SHAPE === 'drill') { tw = (1 + (KL - 1) * 3) * Math.PI * 2 * t; sc *= 1 - 0.45 * t ** 1.4; }
    // ウェーブ：手前奥と上下にうねる
    if (SHAPE === 'wave') { const a = 0.2 * KL, ph = gx * Math.PI * 1.7; dz += a * Math.sin(ph); dy += a * 0.6 * (1 + Math.sin(ph + 1.4)); }
    // 直角のギザギザ：傾き1の三角波（折れ目が直角）。強いほど歯が大きい
    if (SHAPE === 'zigzag') { const per = 0.55 * KL ** 0.7, ph = gx / per + 0.25; dz += (4 * Math.abs(ph - Math.floor(ph + 0.5)) - 1) * per / 4; }
    // 風船：全体がふくらむ（両端は少しすぼまる）
    if (BALLOON) sc *= 1 + 0.2 * BALLOON * (1 - 0.5 * (gx / RHX) ** 4);
    return { s: sc, dz, dy, tw };
  }
  // 焦げ（炭）：黄色の卵に黒い焦げがまだらに混じる（強いほど黒が増える）
  const CHAR = look.color === 'char' ? (look.k || 1) : 0;
  // B段階の欠点（強さはおよそ 0.5〜1.3）。stuck の at はこびりついた場所（-1〜1 ＝ 左端〜右端）
  const DF = Object.fromEntries((look.defects || []).map(d => [d.defect, d]));
  const STUCK = DF.stuck?.strength || 0, STUCK_AT = (DF.stuck?.at ?? 0.4) * RHX, SCORCH = DF.scorched?.strength || 0, PEEL = DF.peeling?.strength || 0;
  const black = new THREE.Color().setRGB(0.03, 0.025, 0.02, THREE.SRGBColorSpace), scorch = new THREE.Color().setRGB(0.35, 0.18, 0.05, THREE.SRGBColorSpace);
  const crust = new THREE.Color().setRGB(0.88, 0.62, 0.26, THREE.SRGBColorSpace), crustDark = new THREE.Color().setRGB(0.62, 0.36, 0.1, THREE.SRGBColorSpace);
  // detail：断面の向きの分割の細かさ（切れは小さく映るので粗くしてよい）
  function makeRollGeo(hx, xOff = 0, cut = false, detail = 1) {
    const segX = Math.max(24, Math.round(hx * 120));
    let g = new THREE.BoxGeometry(hx * 2, RHY * 2, RHZ * 2, segX, Math.round(80 * detail), Math.round(130 * detail));
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3), uv = new Float32Array(p.count * 2);
    const v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    const { valley, peak, seam, brown, inner, cream } = rollColors;
    const tmp = new THREE.Color(), inn = new THREE.Color();
    const rx = cut ? 0 : RR;
    const capAttr = cut ? new Float32Array(p.count * 3) : null; // 切った面：[面の向き ±1（それ以外は0）, y/RHY, z/RHZ]（穴を抜くため）
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const onCut = cut && Math.abs(Math.abs(v.x) - hx) < 1e-5;
      if (onCut) { capAttr[i * 3] = Math.sign(v.x); capAttr[i * 3 + 1] = v.y / RHY; capAttr[i * 3 + 2] = v.z / RHZ; }
      c.set(THREE.MathUtils.clamp(v.x, -hx + rx, hx - rx), THREE.MathUtils.clamp(v.y, -RHY + RR, RHY - RR), THREE.MathUtils.clamp(v.z, -RHZ + RR, RHZ - RR));
      n.subVectors(v, c);
      if (n.lengthSq() < 1e-9) n.set(onCut ? Math.sign(v.x) : 0, onCut ? 0 : 1, 0);
      n.normalize();
      v.copy(c).addScaledVector(n, RR * (onCut && Math.abs(n.x) > 0.99 ? 0 : 1));
      const gx = v.x + xOff; // 元の1本での位置
      const sArc = v.z - v.y;
      const ridge = foldAt(gx, sArc);
      const skinW = THREE.MathUtils.smoothstep(v.y, -RHY + 0.01, -RHY + 0.12) * (onCut ? 0.25 : 1);
      const disp = ((ridge - 0.45) * 0.058 + (fbm(gx * 9, sArc * 9, 3) - 0.5) * 0.012) * skinW * (cut ? 0.45 : 1);
      if (!(onCut && Math.abs(n.x) > 0.99)) v.addScaledVector(n, disp);
      if (v.y > 0) v.y += 0.035 * (1 - (v.z / RHZ) ** 2) - (cut ? 0 : 0.03 * Math.pow(Math.abs(gx) / RHX, 6));
      v.z += (v.y / RHY) * 0.02;
      // 衣：ゴツゴツした天ぷらの衣が外側に付く（断面の面には付けない）
      const lump = BATTER ? THREE.MathUtils.smoothstep(fbm(gx * 16 + 5, sArc * 16, 3), 0.42, 0.8) : 0;
      if (BATTER && !(onCut && Math.abs(n.x) > 0.99)) v.addScaledVector(n, (0.02 + 0.06 * lump + (fbm(gx * 40, sArc * 40, 2) - 0.5) * 0.02) * Math.min(2, BATTER));
      // 風船：上がドーム状にふくらむ
      if (BALLOON && v.y > 0) v.y += 0.14 * BALLOON * RHY * (1 - (v.z / RHZ) ** 2);
      // こびりつき：フライパンに付いていた面の一部が取られて、ぎざぎざにえぐれ、中の層が見えている（見える上の面に出す）
      let torn = 0;
      if (STUCK && v.y > 0) {
        const r2 = ((gx - STUCK_AT) / (0.16 + 0.12 * STUCK)) ** 2 + ((v.z - 0.12) / (0.22 + 0.08 * STUCK)) ** 2;
        const edge = 1 + (fbm(gx * 9 + 3, v.z * 9, 2) - 0.5) * 0.9; // ぎざぎざの縁
        torn = THREE.MathUtils.smoothstep(-r2, -edge, -edge * 0.6) * 0.06 * STUCK * (0.7 + 0.6 * fbm(gx * 20, v.z * 20, 2));
        v.y -= torn;
      }
      // はがれ：巻き終わり（手前の上の縁）の一番外の層が、上へめくれ上がっている
      if (PEEL && v.y > 0) {
        const front = THREE.MathUtils.smoothstep(v.z / RHZ, 0.5, 1) ** 2, along = THREE.MathUtils.smoothstep(Math.sin(gx * 2.2 + 1.3), -0.2, 0.6);
        v.y += 0.14 * PEEL * front * along; v.z += 0.06 * PEEL * front * along;
      }
      if (SHAPED) {
        // ねじる → 太らせる → ずらす。底は皿に付いたまま（ねじると角が下に出るので、その分持ち上げる）
        const d = deformAt(gx);
        let y = v.y, z = v.z;
        if (d.tw) { const cs = Math.cos(d.tw), sn = Math.sin(d.tw); [y, z] = [y * cs - z * sn, y * sn + z * cs]; }
        const lift = d.tw ? Math.hypot(RHY, RHZ) - RHY : 0;
        v.y = (y + lift) * d.s + (d.s - 1) * RHY + d.dy; v.z = z * d.s + d.dz;
      }
      p.setXYZ(i, v.x, v.y, v.z);
      const b = Math.max(0, (fbm(gx * 2.5 + 7, sArc * 3) - 0.55) * 2.4);
      tmp.copy(valley).lerp(peak, Math.min(1, ridge * 1.1 + (fbm(gx * 3, sArc * 3) - 0.5) * 0.5));
      // 大きな焼き色のまだら＋小さな焼き斑点＋淡い斑
      const blotch = THREE.MathUtils.smoothstep(fbm(gx * 1.4 + 21, sArc * 1.8 + 5, 4), 0.5, 0.72);
      const speck = THREE.MathUtils.smoothstep(fbm(gx * 14 + 3, sArc * 14, 2), 0.66, 0.82);
      const pale = THREE.MathUtils.smoothstep(fbm(gx * 2.2 + 40, sArc * 2.2, 3), 0.56, 0.74);
      tmp.lerp(cream, pale * 0.55).lerp(brown, Math.min(0.85, b * 0.55 + blotch * 0.5 + speck * 0.35 * (0.5 + ridge)));
      // 断面：巻いた層が渦巻き状に見える（切り口は明るくしっとり）
      const endW = onCut ? 1 : THREE.MathUtils.smoothstep(Math.abs(n.x), 0.55, 0.95);
      const lineK = onCut ? 0 : 1;
      if (endW > 0) {
        const yy = v.y / RHY, zz = v.z / RHZ;
        const d = Math.pow(Math.pow(Math.abs(yy), 3) + Math.pow(Math.abs(zz), 3), 1 / 3);
        const th = Math.atan2(yy, zz) / (Math.PI * 2);
        const layer = d * (cut ? 8.5 : 6.2) + th + fbm(yy * 3 + 4 + xOff, zz * 3) * 0.5;
        const f = layer - Math.floor(layer);
        const line = Math.pow(1 - Math.min(1, Math.min(f, 1 - f) / (cut ? 0.075 : 0.07)), 1.4) * (0.6 + fbm(yy * 9 + xOff, zz * 9) * 0.6);
        inn.copy(inner).lerp(peak, fbm(yy * 6 + xOff, zz * 6) * 0.5).lerp(seam, line * 0.9 * lineK);
        tmp.lerp(inn, endW);
      }
      if (BATTER && !onCut) tmp.copy(crust).lerp(crustDark, lump * 0.6 + (fbm(gx * 9 + 2, sArc * 9, 2) - 0.5) * 0.4); // 衣の色
      if (CHEESE && !onCut) tmp.lerp(black, THREE.MathUtils.smoothstep(fbm(gx * 6 + 31, sArc * 6, 2), 0.64 - 0.04 * CHEESE, 0.67 - 0.04 * CHEESE) * 0.85); // 表面にも穴
      if (torn > 0.008 && !onCut) tmp.lerp(inner, 0.7).lerp(brown, THREE.MathUtils.smoothstep(fbm(gx * 30, sArc * 30, 2), 0.5, 0.7) * 0.5); // えぐれた所は中の色
      if (SCORCH && !onCut) { // ところどころ焦げている
        const burn = THREE.MathUtils.smoothstep(fbm(gx * 3.1 + 80, sArc * 3.3 + 7, 4), 0.7 - 0.08 * SCORCH, 0.76 - 0.06 * SCORCH);
        tmp.lerp(scorch, burn * 0.9).lerp(black, burn * burn * 0.45 * SCORCH);
      }
      if (CHAR && !onCut) {
        const burn = THREE.MathUtils.smoothstep(fbm(gx * 2.4 + 60, sArc * 2.8 + 11, 4), 0.62 - 0.1 * CHAR, 0.72 - 0.08 * CHAR);
        tmp.lerp(scorch, Math.min(0.7, 0.25 * CHAR)).lerp(black, Math.min(0.97, burn));
      }
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      if (onCut) { uv[i * 2] = v.z * 1.6 + xOff; uv[i * 2 + 1] = v.y * 2.3; } else { uv[i * 2] = (gx + RHX) / (2 * RHX); uv[i * 2 + 1] = (sArc + 1) / 2; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (capAttr) g.setAttribute('aCap', new THREE.BufferAttribute(capAttr, 3));
    g.computeVertexNormals();
    return g;
  }
  // 細かい層の筋（長辺方向に流れる）
  const rollBump = staticTex('rollBump');
  const rollMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, bumpMap: rollBump, bumpScale: 1.1, roughness: 0.4,
    clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xfff2c0),
  });
  const roll = new THREE.Mesh(PLATED ? new THREE.BufferGeometry() : makeRollGeo(RHX), rollMat);
  roll.castShadow = roll.receiveShadow = true;
  if (STAGE === 'cook') { roll.position.set(0, 0.06 + RHY, -PL / 2 + RHZ + 0.01); pan.add(roll); }
  if (STAGE !== 'cook' && STAGE !== 'pour') liquid.visible = false;

  let cutAnim = null, halo = null, foodObjs = [], soapOn = false, sheetObj = null, cutSliceList = [], plateObj = null; const soap = [];
  // ---------- 皿（盛り付け）：黒い石の長皿に、切った出し巻きを並べる ----------
  if (PLATED) {
    pan.visible = false;
    // 少しゆがんだ有機的な長皿の輪郭
    const plateShape = new THREE.Shape();
    const PWh = 2.05, PDh = 0.72, N = 160;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
      const e = 0.38; // 角の丸み（超楕円）
      let x = Math.sign(ct) * Math.pow(Math.abs(ct), e) * PWh, y = Math.sign(st) * Math.pow(Math.abs(st), e) * PDh;
      const wob = 1 + (fbm(ct * 1.2 + 3, st * 1.2 + 3, 3) - 0.5) * 0.08;
      x *= wob; y *= wob * (1 + 0.06 * Math.sin(t * 1 + 0.6));
      i === 0 ? plateShape.moveTo(x, y) : plateShape.lineTo(x, y);
    }
    const stone = staticTex('stone'), stoneBump = staticTex('stoneBump');
    const plateMat = new THREE.MeshPhysicalMaterial({ map: stone, bumpMap: stoneBump, bumpScale: 1.5, roughness: 0.72, clearcoat: 0.18, clearcoatRoughness: 0.5 });
    const plateGeo = new THREE.ExtrudeGeometry(plateShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.12, bevelSegments: 12, curveSegments: 4 });
    plateGeo.rotateX(-Math.PI / 2);
    const plate = new THREE.Mesh(plateGeo, plateMat); plate.receiveShadow = plate.castShadow = true;
    plate.position.y = -0.25 + 0.06; plate.rotation.y = 0.18; scene.add(plate); plateObj = plate;
    const plateTop = -0.25 + 0.06 + 0.07 + 0.06;
    const beforeFood = new Set(scene.children); // 特殊な完成で、作った料理をまとめて外すため

    // 切った出し巻き（5切れ）を、断面が見えるように少しずつ角度を変えて一列に並べる
    const nSlice = 6, sw = (RHX * 2) / nSlice, gap = look.animate ? 0.001 : 0.012, SC = 0.62; // 切るアニメーションでは、切る前に継ぎ目が見えないよう隙間をなくす
    // 断面の渦巻き模様（なめらかな線で描く）
    const CW = RHZ * 2, CH = RHY * 2 + 0.04;
    // o.layers: 層の数 / o.egg: 卵形の断面（EA: 長軸の半分, EB: 短軸の半分） / o.wood: 年輪のような濃淡
    function makeCutTex(vk, o = {}) {
      const L = o.layers || 6.4, ws = L / 6.4;
      const TW = o.egg ? o.EB * 2.3 : CW, TH = o.egg ? o.EA * 2 : CH;
      // 穴あきチーズの穴（正規化した断面座標での中心と半径。強いほど多く大きい）
      const pitHoles = o.pits ? Array.from({ length: Math.round(4 + 4 * o.pits) }, () => [(rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6, 0.025 + rnd() * 0.035]) : [];
      const cheeseHoles = o.cheese ? Array.from({ length: Math.round(8 + 6 * o.cheese) }, () => [(rnd() - 0.5) * 1.7, (rnd() - 0.5) * 1.7, (0.06 + rnd() ** 1.5 * 0.2) * (0.8 + 0.2 * o.cheese)]) : [];
      return canvasTex(512, o.egg ? 512 : 320, (g, w, h) => { // 半分の解像度（作る時間を1/4に。2026-10-11）
        const img = g.createImageData(w, h);
        for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
          const z = (px / w - 0.5) * TW, y = (0.5 - py / h) * TH;
          let sd, yy, zz, d, th;
          if (o.egg) {
            const e = Math.hypot(y / o.EA, z / (o.EB * (1 + 0.15 * y / o.EA)));
            sd = (e - 1) * o.EB * 0.9; yy = y / o.EA; zz = z / o.EB;
            const cy = yy + 0.08, cz = zz - 0.06;
            d = Math.hypot(cy, cz / (1 + 0.15 * yy)); th = Math.atan2(cy, cz) / (Math.PI * 2);
          } else {
            const qx = Math.max(Math.abs(z) - (RHZ - RR), 0), qy = Math.max(Math.abs(y) - (RHY - RR), 0);
            sd = Math.hypot(qx, qy) - RR + 0.012; yy = y / RHY; zz = z / RHZ;
            const cy = yy + 0.12 * (vk - 1), cz = zz - 0.15 + 0.1 * vk;
            d = Math.pow(Math.pow(Math.abs(cy), 2.6) + Math.pow(Math.abs(cz), 2.6), 1 / 2.6);
            th = Math.atan2(cy, cz) / (Math.PI * 2);
          }
          let a = THREE.MathUtils.clamp(-sd / 0.008, 0, 1);
          let layer = d * L + th + (fbm(yy * 1.7 + vk * 3, zz * 1.7, 4) * 1.15 + fbm(yy * 7 + vk, zz * 7, 2) * 0.12) * ws;
          layer += 0.32 * Math.sin(layer * 1.9 + vk * 2.1);
          if (o.uneven) layer += o.uneven * (0.55 * Math.sin(layer * 0.8 + vk * 1.7) + 0.6 * fbm(d * 2.5 + vk, th * 4, 2)); // 層の厚さがばらばら
          const li = Math.floor(layer), f = layer - li, dist = Math.min(f, 1 - f);
          const lw = 0.014 + fbm(th * 9 + li * 1.7, d * 3 + vk, 2) * 0.04;
          const brk = THREE.MathUtils.smoothstep(fbm(th * 14 + li * 3.1 + vk, d * 2, 3), 0.28, 0.46);
          let line = Math.exp(-(dist * dist) / (2 * lw * lw)) * brk;
          const golden = ((li + vk) % 3 === 0) ? 1.0 : 0.55;
          const m1 = fbm(yy * 2.2 + 11 + vk, zz * 2.2, 4), m2 = fbm(yy * 9, zz * 9 + vk, 3);
          const t = THREE.MathUtils.clamp((m1 - 0.35) * 1.8 + (m2 - 0.5) * 0.4, 0, 1);
          let r = 252 - t * 6, gg = 212 - t * 40, b = 88 - t * 66;
          if (o.wood) { const ff = Math.pow(f, 1.6); gg -= ff * 70; b -= ff * 50; r -= ff * 22; line = Math.max(line, Math.exp(-((1 - f) * (1 - f)) / (2 * 0.05 * 0.05)) * 0.9); }
          r -= line * 26 * golden; gg -= line * 70 * golden; b -= line * 60 * golden;
          const pore = fbm(yy * 48 + vk * 5, zz * 48, 2);
          if (pore > 0.74) { const k = (pore - 0.74) * 4; r -= 12 * k; gg -= 30 * k; b -= 20 * k; }
          if (pore < 0.16) { const k = (0.16 - pore) * 5; r += 2 * k; gg += 12 * k; b += 24 * k; }
          const rim = THREE.MathUtils.clamp(1 - (-sd) / 0.06, 0, 1);
          r -= rim * 14; gg -= rim * 46; b -= rim * 40;
          if (o.batter) {
            // 衣：外側にゴツゴツした茶色の輪
            const crustW = 0.05 + 0.04 * fbm(th * 20 + vk, 1, 2) * o.batter;
            const ck = THREE.MathUtils.clamp(1 - (-sd) / crustW, 0, 1);
            if (ck > 0) { const k2 = 0.6 + 0.4 * fbm(yy * 20, zz * 20, 2); r = r * (1 - ck) + 225 * k2 * ck; gg = gg * (1 - ck) + 150 * k2 * ck; b = b * (1 - ck) + 60 * k2 * ck; }
          }
          if (o.cheese) {
            // 穴あきチーズ：大小の丸い穴（中は暗い空洞、縁が少し影になる）
            let hole = 0, lip = 0;
            for (const [hy, hz, hr] of cheeseHoles) {
              const dd = Math.hypot(yy - hy, (zz - hz) * RHZ / RHY);
              hole = Math.max(hole, THREE.MathUtils.smoothstep(-dd, -hr, -hr + 0.03));
              lip = Math.max(lip, THREE.MathUtils.smoothstep(-dd, -hr - 0.06, -hr));
            }
            lip -= hole;
            r = r * (1 - hole * 0.85) - lip * 20; gg = gg * (1 - hole * 0.88) - lip * 40; b = b * (1 - hole * 0.9) - lip * 30;
            a *= 1 - hole; // 穴は透明にして、向こうが見える（切れ本体も同じ所を抜く。2026-10-11 指定）
          }
          if (o.runny) {
            // 半熟：断面の中心が、生っぽくつやのある濃い黄色でとろっとしている
            const rk = 1 - THREE.MathUtils.smoothstep(d, 0.2 + 0.12 * o.runny, 0.32 + 0.14 * o.runny);
            const hl = Math.max(0, 1 - Math.hypot(yy - 0.12, zz + 0.12) / 0.12) * 0.5; // つやの映り込み
            r = r * (1 - rk) + (238 + 17 * hl) * rk; gg = gg * (1 - rk) + (150 + 90 * hl) * rk; b = b * (1 - rk) + (18 + 130 * hl) * rk;
          }
          if (o.pits) {
            // 穴ぼこ：小さな穴がいくつか
            let hole = 0; for (const [hy, hz, hr] of pitHoles) hole = Math.max(hole, THREE.MathUtils.smoothstep(-Math.hypot(yy - hy, (zz - hz) * RHZ / RHY), -hr, -hr + 0.015));
            r *= 1 - hole * 0.8; gg *= 1 - hole * 0.85; b *= 1 - hole * 0.85;
          }
          if (o.balloon) {
            // 風船：外側の薄い皮だけ残り、中は空洞。空洞は透明にして、穴から後ろが見える（切れ本体も同じ所を抜く。2026-10-11 指定）
            // 皮の内側の縁に細い影を付けて、厚みを見せる
            const shell = 0.22 / Math.max(1, o.balloon * 0.8), edge = 1 - shell;
            const cav = 1 - THREE.MathUtils.smoothstep(d, edge - 0.03, edge);
            const lipShade = 0.4 * Math.exp(-(((d - edge) / 0.05) ** 2));
            r *= 1 - lipShade; gg *= 1 - lipShade; b *= 1 - lipShade; a *= 1 - cav;
          }
          if (o.char) {
            const ring = THREE.MathUtils.clamp(1 - (-sd) / (0.05 + 0.05 * o.char), 0, 1);
            const spot = THREE.MathUtils.smoothstep(fbm(yy * 5 + vk * 7, zz * 5, 3), 0.68 - 0.06 * o.char, 0.76 - 0.05 * o.char);
            const dark = Math.min(0.96, Math.max(ring, spot, line * golden * 0.25 * o.char));
            r *= 1 - dark; gg *= 1 - dark; b *= 1 - dark;
          }
          const i = (py * w + px) * 4;
          img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = Math.max(b, 6); img.data[i + 3] = a * 255;
        }
        g.putImageData(img, 0, 0);
      });
    }
    const LK = look.k || 1;
    // 帯状の照明を映す環境（金属がキラッと光る。包丁と、全部Aの金色で使う）
    let stripEnvCache = null;
    function getStripEnv() {
      if (stripEnvCache) return stripEnvCache;
      const stripScene = new THREE.Scene(); stripScene.background = new THREE.Color(0x2a2622);
      const stripMat = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide });
      // 周囲をぐるりと囲む縦長の帯照明＋天井の帯＋暖色の大きな面光源
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, rr = 7;
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + (i % 3) * 0.3, 9), stripMat(i % 2 ? 0xfff2e0 : 0xffffff, 3 + (i % 4) * 2));
        p.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); p.lookAt(0, 0, 0); stripScene.add(p);
      }
      for (const [x, y, z, w, h, c, k] of [[0, 6, 0, 14, 0.8, 0xffffff, 8], [0, 5, 3, 10, 0.5, 0xffffff, 6], [0, -4, 4, 12, 3, 0xffd9a8, 2.5]]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stripMat(c, k)); p.position.set(x, y, z); p.lookAt(0, 0, 0); stripScene.add(p);
      }
      return (stripEnvCache = pmrem.fromScene(stripScene, 0.0).texture);
    }
    // 色の変化（断面の板と、表面の両方）
    function lookColor(mat, cut) {
      if (look.color === 'char') {
        // 炭：黄色の卵に黒い焦げがまだらに混じる（色は頂点色と断面のテクスチャ）。ツヤがなくガサガサ
        Object.assign(mat, { roughness: cut ? 0.7 : 0.9, clearcoat: 0, sheen: 0, bumpScale: (mat.bumpScale || 0) * 2.5 });
      } else if (look.color === 'jelly') {
        // ゼリー：生の卵の色のまま透き通り、つるんと光る
        // （黒い皿が透けて暗くならないよう、内側からほんのり光らせる。焼き色の頂点色は使わない）
        Object.assign(mat, { vertexColors: false, color: new THREE.Color(0xffd257), roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0, bumpScale: 0.05,
          transmission: Math.min(1, 0.7 + 0.1 * LK), thickness: 0.5, ior: 1.36, attenuationColor: new THREE.Color(0xffc040), attenuationDistance: 2,
          emissive: new THREE.Color(0xc87800), emissiveIntensity: 0.35 });
        if (cut) Object.assign(mat, { emissiveMap: mat.map });
      }
      return mat;
    }
    const cutMatOf = (tex) => lookColor(new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.45, clearcoat: 0.2, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color(0xfff0b0) }), true);
    const cutOpts = { ...(VAR === 'nenrin' ? { layers: 22, wood: true } : {}), ...(CHAR ? { char: CHAR } : {}), ...(BATTER ? { batter: BATTER } : {}), ...(CHEESE ? { cheese: CHEESE } : {}), ...(BALLOON ? { balloon: BALLOON } : {}),
      ...(DF.runny ? { runny: DF.runny.strength } : {}), ...(DF.pits ? { pits: DF.pits.strength } : {}), ...(DF.unevenLayers ? { uneven: DF.unevenLayers.strength } : {}) };
    const cutMats = (VAR === 'tamago' ? [0] : [0, 1, 2]).map(vk => cutMatOf(makeCutTex(vk, cutOpts)));
    let cutCount = 0;
    // 皿の切れはテカりを控えめに（2026-10-11、テカりすぎとの指摘。油っぽい・金色・ゼリーなどはこの後で上書きする）
    const sliceMat = rollMat.clone(); sliceMat.bumpScale = 0.3; sliceMat.roughness = 0.5; sliceMat.clearcoat = 0.12; sliceMat.clearcoatRoughness = 0.5; sliceMat.sheen = 0.25; lookColor(sliceMat, false);
    if (BATTER) Object.assign(sliceMat, { roughness: 0.85, clearcoat: 0.1, sheen: 0, bumpScale: 2.5 });
    if (DF.oily) Object.assign(sliceMat, { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02 + 0.05 / DF.oily.strength, sheen: 0, envMap: getStripEnv(), envMapIntensity: 0.6 + 0.5 * DF.oily.strength });
    // 全部A：表面を金属のように光る金色に（断面は卵のまま）
    // （焦げのような黒い所を減らす：凹凸を浅く、金属が暗い周りを映して黒くならないよう、内側からほんのり金色に光らせる。2026-10-11）
    if (look.gold) Object.assign(sliceMat, { vertexColors: false, color: new THREE.Color(0xffc23a), metalness: 0.9, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.08, sheen: 0, bumpScale: 0.3, envMap: getStripEnv(), envMapIntensity: 2.0, emissive: new THREE.Color(0x4a2e00) });
    const row = new THREE.Group(); row.rotation.y = 0.18; row.scale.setScalar(SC); row.position.y = plateTop * (1 - SC); scene.add(row);
    const foods = [row]; // 大きさの変化をかける物
    // 穴のある断面（穴あきチーズ・風船）の切れ：切った面のうち、断面の板の穴（透明な所）と同じ所を抜いて、向こうが見えるようにする
    // tP・tN は +x 側・−x 側の断面の板のテクスチャ。断面の板は y 軸まわりに ±90° 回すので、+x 側は z の向きが逆になる
    const HOLES = BALLOON || CHEESE;
    function holeMat(tP, tN) {
      const mat = sliceMat.clone();
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.tCapP = { value: tP }; sh.uniforms.tCapN = { value: tN };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aCap;\nvarying vec3 vCap;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCap = aCap;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tCapP, tCapN;\nvarying vec3 vCap;')
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (abs(vCap.x) > 0.5) {
            vec2 q = max(abs(vec2(vCap.z * ${RHZ.toFixed(5)}, vCap.y * ${RHY.toFixed(5)})) - vec2(${(RHZ - RR).toFixed(5)}, ${(RHY - RR).toFixed(5)}), 0.0);
            if (length(q) - ${RR.toFixed(5)} < -0.03) { // 断面の輪郭の内側だけ（輪郭の外は板も透明なので、そこは抜かない）
              vec2 cuv = vec2((vCap.x > 0.0 ? -vCap.z : vCap.z) * 0.5 + 0.5, vCap.y * ${(RHY / CH).toFixed(5)} + 0.5);
              float ca = vCap.x > 0.0 ? texture2D(tCapP, cuv).a : texture2D(tCapN, cuv).a;
              if (ca < 0.5) discard;
            }
          }`);
      };
      mat.customProgramCacheKey = () => 'sliceHoles';
      return mat;
    }
    function piece(hx, xOff) {
      const m = new THREE.Mesh(makeRollGeo(hx, xOff, true, 0.55), sliceMat);
      m.castShadow = m.receiveShadow = true;
      const capTex = [];
      for (const sgn of [1, -1]) {
        const dec = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), cutMats[(cutCount++) % 3]); capTex.push(dec.material.map);
        dec.rotation.y = sgn * Math.PI / 2; dec.receiveShadow = true;
        // 断面の板を、その位置の形（ねじれ・太さ・ずれ）に合わせる
        const d = deformAt(xOff + sgn * hx), lift = d.tw ? (Math.hypot(RHY, RHZ) - RHY) * d.s : 0;
        const hold = new THREE.Group(); hold.add(dec); m.add(hold);
        hold.position.set(sgn * (hx + 0.003), (d.s - 1) * RHY + lift + d.dy, d.dz); hold.rotation.x = d.tw; hold.scale.set(1, d.s, d.s);
      }
      if (HOLES) m.material = holeMat(capTex[0], capTex[1]);
      return m;
    }
    // 包丁（和包丁：鋼の刃＋木の柄＋黒い口輪）。原点は峰の柄側、刃は +x へ L、下へ BH
    function makeKnife() {
      const knife = new THREE.Group();
      const L = 2.3, BH = 0.36;
      const blade = new THREE.Shape();
      blade.moveTo(0, 0); blade.lineTo(L * 0.82, 0);
      blade.quadraticCurveTo(L * 0.97, -0.02, L, -BH * 0.92);
      blade.quadraticCurveTo(L * 0.6, -BH * 1.0, 0, -BH);
      blade.lineTo(0, 0);
      const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 3, curveSegments: 32 });
      bladeGeo.translate(0, 0, -0.007);
      const brushed = staticTex('knifeBrushed'), bladeRough = staticTex('knifeRough');
      for (const t of [brushed, bladeRough]) { t.repeat.set(1 / L, 1 / BH); t.offset.set(0, 1); }
      const stripEnv = getStripEnv();
      const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: brushed, metalness: 1, roughness: 1, roughnessMap: bladeRough, envMap: stripEnv, envMapIntensity: 1.6, anisotropy: 0.7, clearcoat: 0.4, clearcoatRoughness: 0.05 });
      const bl = new THREE.Mesh(bladeGeo, bladeMat); bl.castShadow = true; knife.add(bl);
      const ferr = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 8), new THREE.MeshPhysicalMaterial({ color: 0x141210, roughness: 0.25, clearcoat: 0.8 }));
      ferr.rotation.z = Math.PI / 2; ferr.position.set(-0.08, -0.07, 0); ferr.castShadow = true; knife.add(ferr);
      const hwood = staticTex('knifeWood');
      const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 1.05, 8), new THREE.MeshPhysicalMaterial({ map: hwood, roughness: 0.6 }));
      hand.rotation.z = Math.PI / 2; hand.position.set(-0.68, -0.07, 0); hand.castShadow = true; knife.add(hand);
      return knife;
    }
    const cutSlices = []; // 切った切れ（アニメーション用：元の1本での中心 cx と半分の長さ hx）
    if (SHAPE === 'flat' && STAGE !== 'cut') {
      // 巻かれていない：1枚の巨大な薄焼きが皿を覆い、縁から台へ垂れる（断面はないので、年輪・穴は表面の模様にする）
      const SWd = 4.6 + 1.6 * (KL - 1), SDd = 2.2 + 0.8 * (KL - 1);
      const g = new THREE.PlaneGeometry(SWd, SDd, 200, 100); g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position, col = new Float32Array(pos.count * 3), tmp = new THREE.Color();
      const ca = Math.cos(0.18), sa = Math.sin(0.18);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const px = x * ca - z * sa, pz = x * sa + z * ca; // 皿の向き（y 軸まわり 0.18）での座標
        const out = Math.pow(Math.pow(Math.abs(px) / 2.15, 5.3) + Math.pow(Math.abs(pz) / 0.84, 5.3), 1 / 5.3) - 1;
        let y = plateTop + 0.05 + Math.max(0, fbm(x * 1.3 + 3, z * 1.3, 3) - 0.45) * 0.3 + fbm(x * 6, z * 6, 2) * 0.02; // しわは上にだけ（皿にめり込まない）
        if (out > 0) y = Math.max(-0.245, y - out * 3.4); // 縁から垂れて、台に落ちる
        pos.setY(i, y);
        const ridge = fbm(x * 2 + 1, z * 3, 3);
        tmp.copy(rollColors.valley).lerp(rollColors.peak, ridge).lerp(rollColors.cream, THREE.MathUtils.smoothstep(fbm(x * 2.2 + 40, z * 2.2, 3), 0.56, 0.74) * 0.5)
          .lerp(rollColors.brown, THREE.MathUtils.smoothstep(fbm(x * 1.4 + 21, z * 1.8 + 5, 4), 0.5, 0.72) * 0.5);
        if (look.nenrin || VAR === 'nenrin') { const rr = Math.hypot(x * 0.8, z) * 14; tmp.lerp(rollColors.seam, Math.pow(Math.abs(Math.sin(rr + fbm(x, z, 2) * 3)), 6) * 0.6); }
        if (CHEESE) tmp.lerp(black, THREE.MathUtils.smoothstep(fbm(x * 4 + 31, z * 4, 2), 0.7 - 0.03 * CHEESE, 0.73 - 0.03 * CHEESE) * 0.85);
        if (CHAR) tmp.lerp(scorch, Math.min(0.7, 0.25 * CHAR)).lerp(black, THREE.MathUtils.smoothstep(fbm(x * 2.4 + 60, z * 2.8 + 11, 4), 0.62 - 0.1 * CHAR, 0.72 - 0.08 * CHAR));
        if (BATTER) tmp.copy(crust).lerp(crustDark, fbm(x * 9, z * 9, 2));
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      const sheetMat = sliceMat.clone(); sheetMat.side = THREE.DoubleSide;
      const sheet = new THREE.Mesh(g, sheetMat); sheet.castShadow = sheet.receiveShadow = true; scene.add(sheet); sheetObj = sheet;
    } else if (look.surface === 'crumbs' && STAGE !== 'cut') {
      // ボロボロ：フライパンにこびりついて崩れたかけらを、皿の真ん中に寄せ集めた山（強いほどかけらが多く細かい）
      const nCr = Math.round(26 + 16 * KL);
      for (let k = 0; k < nCr; k++) {
        const r0 = (0.07 + rnd() * 0.15) / Math.sqrt(KL);
        const g = new THREE.IcosahedronGeometry(r0, 2);
        const pos = g.attributes.position, col = new Float32Array(pos.count * 3), tmp = new THREE.Color(), vv = new THREE.Vector3();
        const sy = 0.45 + rnd() * 0.5, seed2 = rnd() * 50;
        for (let i = 0; i < pos.count; i++) {
          vv.fromBufferAttribute(pos, i);
          const nrm = vv.clone().normalize(), f = 0.7 + fbm(nrm.x * 2 + seed2, nrm.y * 2 + nrm.z * 2, 3) * 0.7;
          vv.multiplyScalar(f); vv.y *= sy; pos.setXYZ(i, vv.x, vv.y, vv.z);
          // 上は卵の黄色、下（フライパンに付いていた面）は焦げ茶
          tmp.copy(rollColors.valley).lerp(rollColors.peak, fbm(vv.x * 20 + seed2, vv.z * 20, 2)).lerp(rollColors.brown, (1 - THREE.MathUtils.smoothstep(vv.y, -r0 * 0.6, 0)) * 0.8);
          if (CHAR) tmp.lerp(black, THREE.MathUtils.smoothstep(fbm(vv.x * 9 + seed2, vv.z * 9, 2), 0.55, 0.65) * Math.min(1, 0.4 * CHAR));
          col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
        const m = new THREE.Mesh(g, sliceMat); m.castShadow = m.receiveShadow = true;
        const a = rnd() * Math.PI * 2, rad = Math.sqrt(rnd());
        const x = Math.cos(a) * rad * 1.5, z = Math.sin(a) * rad * 0.55;
        m.position.set(x, plateTop + r0 * sy * 0.8 + (1 - rad) * 0.45 * rnd(), z);
        m.rotation.set(rnd() * 0.6, rnd() * Math.PI * 2, rnd() * 0.6);
        row.add(m);
      }
    } else if (STAGE === 'plate' && VAR === 'tamago') {
      // 案2「卵に戻った」：巨大な卵形の出し巻きを半分に切ったもの
      const EA = 0.66, EB = 0.47;
      const rAt = (t) => EB * Math.sqrt(Math.max(0, 1 - (t / EA) ** 2)) * (1 + 0.15 * t / EA);
      const prof = []; for (let i = 0; i <= 96; i++) { const t = -EA + (2 * EA * i) / 96; prof.push(new THREE.Vector2(Math.max(rAt(t), 1e-4), t)); }
      const eggTex = makeCutTex(1, { ...cutOpts, egg: true, EA, EB, layers: 9, wood: false });
      eggTex.repeat.set(1 / (EB * 2.3), 1 / (EA * 2)); eggTex.offset.set(0.5, 0.5);
      const eggCut = cutMatOf(eggTex);
      function eggHalf() {
        const g = new THREE.LatheGeometry(prof, 160, 0, Math.PI);
        const p = g.attributes.position, col = new Float32Array(p.count * 3);
        const { valley, peak, brown, cream } = rollColors; const tmp = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z) || 1e-4;
          const sArc = Math.atan2(x, z) * EB, gx = y * 1.6;
          const ridge = foldAt(gx, sArc);
          const disp = (ridge - 0.45) * 0.05 * Math.min(1, rr / 0.08);
          p.setX(i, x + (x / rr) * disp); p.setZ(i, z + (z / rr) * disp);
          const blotch = THREE.MathUtils.smoothstep(fbm(gx * 1.4 + 21, sArc * 1.8 + 5, 4), 0.5, 0.72);
          const pale = THREE.MathUtils.smoothstep(fbm(gx * 2.2 + 40, sArc * 2.2, 3), 0.56, 0.74);
          tmp.copy(valley).lerp(peak, Math.min(1, ridge * 1.1)).lerp(cream, pale * 0.5).lerp(brown, blotch * 0.5);
          col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
        const grp = new THREE.Group();
        const skin = new THREE.Mesh(g, sliceMat); skin.castShadow = skin.receiveShadow = true; grp.add(skin);
        const sh = new THREE.Shape(); prof.forEach((v, i) => i ? sh.lineTo(v.x, v.y) : sh.moveTo(v.x, v.y)); for (let i = prof.length - 1; i >= 0; i--) sh.lineTo(-prof[i].x, prof[i].y);
        const cap = new THREE.Mesh(new THREE.ShapeGeometry(sh, 64), eggCut); cap.rotation.y = -Math.PI / 2; cap.position.x = -0.002; cap.scale.set(1.04, 1.01, 1); cap.receiveShadow = true; grp.add(cap);
        return grp;
      }
      // 丸ごと1個：太い方を下にして立てる
      const whole = new THREE.Group(); const wa = eggHalf(), wb = eggHalf(); wb.rotation.y = Math.PI; whole.add(wa, wb);
      wa.children[1].visible = false; wb.children[1].visible = false;
      whole.rotation.x = Math.PI; whole.position.set(-0.8, plateTop + EA - 0.02, -0.15); whole.rotation.y = 0.4; scene.add(whole);
      const h2 = eggHalf(); h2.rotation.set(Math.PI / 2, 0, 0); h2.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 1.75);
      h2.position.set(0.75, plateTop + EB * 0.98, 0.15); scene.add(h2);              // 断面をこちらに向けた半分
      foods.push(whole, h2);
      if (look.mess) { whole.rotation.z += (rnd() - 0.5) * look.mess * 2.2; h2.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), (rnd() - 0.5) * look.mess * 1.6); }
    } else if (STAGE === 'whole') {
      // 切る前：巻き終えた1本を、皿の長い向きにのせる
      const m = new THREE.Mesh(makeRollGeo(RHX), sliceMat); m.castShadow = m.receiveShadow = true;
      m.position.set(0, plateTop + RHY - 0.005, 0); row.add(m);
    } else if (STAGE === 'plate') {
      const stickBlack = new THREE.MeshPhysicalMaterial({ color: 0x0d0c0c, roughness: 0.3, clearcoat: 0.7 });
      const stickWood = new THREE.MeshStandardMaterial({ color: 0xe0c08a, roughness: 0.7 });
      if (look.mess) {
        // 失敗するほど盛り付けが崩れる：切る幅がばらばらで切れが増え、倒れて散らばり、皿の真ん中に積み重なる
        const MS = look.mess, n = nSlice + Math.round(MS * 4);
        const cuts = Array.from({ length: n - 1 }, (_, i) => (i + 1) / n + (rnd() - 0.5) * MS * 0.7 / n).sort((a, b) => a - b);
        const edges = [0, ...cuts, 1].map(t => -RHX + 2 * RHX * t);
        const placed = [];
        for (let k = 0; k < n; k++) {
          const hx = (edges[k + 1] - edges[k]) / 2 - gap; if (hx < 0.04) continue;
          const m = piece(hx, (edges[k] + edges[k + 1]) / 2);
          // 並びの位置 → 皿の真ん中の山へ寄せる
          const bx = -1.75 + k * 3.5 / (n - 1), bz = (k % 2 ? 0.14 : -0.14) - k * 0.05;
          const pull = Math.min(0.9, MS * 0.85);
          const x = bx + ((rnd() - 0.5) * 1.0 - bx) * pull + (rnd() - 0.5) * MS * 0.4;
          const z = bz + ((rnd() - 0.5) * 0.7 - bz) * pull + (rnd() - 0.5) * MS * 0.3;
          // 倒れる（断面が上や横を向く）、向きもばらばら
          const fall = rnd() < MS * 0.75;
          if (fall) m.rotation.z = (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 * (0.7 + 0.3 * rnd());
          m.rotation.y = -1.28 + (rnd() - 0.5) * Math.PI * 2 * MS;
          m.rotation.x = (rnd() - 0.5) * MS * 0.9;
          // 積み重なる：近くに置いた切れがあれば、その上に載せる
          const half = fall ? hx : RHY;
          let y = plateTop + half - 0.005;
          for (const q of placed) if (Math.hypot(q.x - x, q.z - z) < 0.6) y = Math.max(y, q.top + half * 0.8);
          m.position.set(x, y, z); placed.push({ x, z, top: y + half });
          row.add(m); cutSlices.push({ m, cx: (edges[k] + edges[k + 1]) / 2, hx });
        }
      } else for (let k = 0; k < nSlice; k++) {
        const hx = sw / 2 - gap;
        const m = piece(hx, -RHX + sw * (k + 0.5));
        if (VAR === 'hashi') {
          // 案1「箸ごと巻いた」：断面に菜箸の切り口。両端の切れには箸の残りが突き出る
          for (const [zc, yc] of [[-0.07, -0.02], [0.09, 0.03]]) {
            const ext0 = k === 0 ? 0.55 : 0, ext1 = k === nSlice - 1 ? 1.1 : 0;
            const len = hx * 2 + 0.006 + ext0 + ext1, cx = (ext1 - ext0) / 2;
            const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 24), stickBlack);
            outer.rotation.z = Math.PI / 2; outer.position.set(cx, yc, zc); outer.castShadow = true; m.add(outer);
            const core = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, len + 0.006, 20), stickWood);
            core.rotation.z = Math.PI / 2; core.position.set(cx, yc, zc); m.add(core);
          }
        }
        // 並べ方（2026-10-11 ユーザー指定。料理写真のように）：切った順のまま、皿の長い向きに斜めに並べ、少しずつ手前へずらす。
        // 断面は右手前（カメラの側）を向く。一番手前（右端）の1切れだけ倒して、断面を上に向ける
        const R = -1.0;                                                       // 並べる向き（row の 0.18 と合わせて、右手前へ約47°。断面がカメラから見えるよう）
        const along = new THREE.Vector3(Math.cos(R), 0, -Math.sin(R)), side = new THREE.Vector3(-along.z, 0, along.x); // 並び・手前へのずれ
        const STEP = 2 * hx + 0.025, SHIFT = -0.16; // 手前の切れほど右へずらして、奥の切れの断面も見せる
        const flat = k === nSlice - 1, len = (nSlice - 2) * STEP + hx + RHY + 0.05; // 左端の切れの中心から、倒した切れの中心まで
        m.position.copy(along).multiplyScalar((flat ? len : k * STEP) - len / 2).addScaledVector(side, (k - (nSlice - 1) / 2) * SHIFT);
        m.position.y = plateTop + (flat ? hx : RHY) - 0.005;
        m.rotation.set(0, R + (rnd() - 0.5) * 0.05, flat ? Math.PI / 2 : 0, 'YXZ'); // 倒した切れは +x（断面）を上へ
        row.add(m); cutSlices.push({ m, cx: -RHX + sw * (k + 0.5), hx });
      }
    } else {
      // 切っている途中：左から2切れ切り終わり、3切れ目に包丁が入っている
      row.rotation.y = 0.55;
      const y0 = plateTop + RHY - 0.005;
      const s0 = piece(sw / 2 - gap, -RHX + sw * 0.5); s0.position.set(-RHX + sw * 0.5 - 0.75, y0, 0.12); s0.rotation.y = -1.15; row.add(s0);
      const s1 = piece(sw / 2 - gap, -RHX + sw * 1.5); s1.position.set(-RHX + sw * 1.5 - 0.42, y0, 0.0); s1.rotation.y = -0.9; row.add(s1);
      const s2 = piece(sw / 2 - gap * 0.3, -RHX + sw * 2.5); s2.position.set(-RHX + sw * 2.5 - 0.03, y0, 0); s2.rotation.z = 0.04; row.add(s2);
      const restHx = (sw * 3) / 2;
      const rest = piece(restHx - gap, RHX - restHx); rest.position.set(RHX - restHx, y0, 0); row.add(rest);
      const knife = makeKnife(), BH = 0.36;
      // 刃を出し巻きの長さ方向に対して垂直に、手前（右手側）から入れる
      knife.rotation.y = Math.PI / 2;
      knife.rotation.z = 0.0;
      knife.position.set(-RHX + sw * 3 - 0.012, plateTop + RHY * 2 * 0.55 + BH, RHZ + 0.55);
      knife.rotateX(0.55);
      row.add(knife);
    }
    // 包丁で切るアニメーション：1本に並べた切れの継ぎ目に、左から順に包丁が入り（入るたびに少し離れる）、
    // 切り終えたら1切れずつ盛り付けの位置へ動く。切る形がない物（卵状・巻かれていない・ボロボロ）は真ん中を一度だけ
    if (look.animate && STAGE === 'plate') {
      // 包丁は出し巻きより背が高くないと、下りきったときに埋もれて見えなくなるので大きくする。刃は垂直に入れる（刃の面はカメラを横から寄せて見せる）
      const KS = 2.4, knife = makeKnife(), KBH = 0.36 * KS;
      knife.scale.setScalar(KS); knife.rotation.y = Math.PI / 2; row.add(knife); knife.traverse(c => { c.userData.knife = true; });
      const kz = RHZ + 0.5, yTop = plateTop + RHY * 2 + KBH + 0.3, yLow = plateTop + KBH + 0.01; // 峰の高さ（刃先が皿に届くまで下りる）
      const items = cutSlices.map(c => ({ ...c, to: { p: c.m.position.clone(), q: c.m.quaternion.clone() }, from: { p: new THREE.Vector3(c.cx, plateTop + RHY - 0.005, 0), q: new THREE.Quaternion() } })).sort((a, b) => a.cx - b.cx);
      const seams = items.slice(1).map((c, i) => (items[i].cx + items[i].hx + c.cx - c.hx) / 2);
      const T_IN = 0.7, T_CUT = 0.55, T_ARR = 1.2, STAG = 0.12, tCuts = T_IN + seams.length * T_CUT;
      const ease = (x) => (x = THREE.MathUtils.clamp(x, 0, 1), x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);
      const lerp = THREE.MathUtils.lerp, off = new THREE.Vector3();
      const update = (t) => {
        let kx = 0, ky;
        if (!items.length) { const u = t / 1.6; ky = u < 0.5 ? lerp(yTop + 1.5, yLow, ease(u * 2)) : lerp(yLow, yTop + 2.5, ease((u - 0.5) * 2)); knife.visible = u < 1; }
        else if (t < tCuts) {
          const i = Math.min(seams.length - 1, Math.max(0, Math.floor((t - T_IN) / T_CUT))), u = (t - T_IN) / T_CUT - i;
          kx = seams[i] ?? 0;
          ky = t < T_IN ? lerp(yTop + 1.5, yTop, ease(t / T_IN)) : u < 0.55 ? lerp(yTop, yLow, ease(u / 0.55)) : lerp(yLow, yTop, ease((u - 0.55) / 0.45));
          knife.visible = true;
        } else { kx = seams[seams.length - 1] ?? 0; const u = (t - tCuts) / 0.8; ky = lerp(yTop, yTop + 2.5, ease(u)); knife.visible = u < 1; }
        knife.position.set(kx, ky, kz);
        const nCut = t < T_IN ? 0 : Math.min(seams.length, Math.floor((t - T_IN) / T_CUT + 0.45)); // 刃が下りきったら離れる
        items.forEach((c, k) => {
          const u = ease((t - tCuts - k * STAG) / T_ARR);
          c.m.position.copy(c.from.p).add(off.set(Math.min(k, nCut) * 0.05, 0, 0)).lerp(c.to.p, u);
          c.m.quaternion.copy(c.from.q).slerp(c.to.q, u);
        });
      };
      update(0);
      cutAnim = { duration: items.length ? tCuts + T_ARR + STAG * items.length : 1.7, update };
    }
    // 全部A：背後から差す後光（カメラから見て料理の奥に置き、光の筋がゆっくり回る）
    if (look.gold) {
      const rays = canvasTex(512, 512, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        for (let i = 0; i < 28; i++) {
          const a0 = (i / 28) * Math.PI * 2, a1 = a0 + Math.PI / 28 * (0.5 + 0.5 * ((i * 7) % 5) / 4);
          const grd = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
          grd.addColorStop(0, 'rgba(255,240,200,0.9)'); grd.addColorStop(1, 'rgba(255,200,90,0)');
          g.fillStyle = grd; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, w / 2, a0, a1); g.closePath(); g.fill();
        }
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3);
        glow.addColorStop(0, 'rgba(255,245,215,0.95)'); glow.addColorStop(1, 'rgba(255,220,140,0)');
        g.fillStyle = glow; g.fillRect(0, 0, w, h);
      });
      halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: rays, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(halo);
    }
    // シャボン玉：泡がCのとき、まれに切った断面からふわふわ浮き出る（start は game から呼ぶ）
    if (look.soap) {
      // 透けて向こうが見え、虹色の照り返しだけが乗る薄い膜（transmission で透かす）
      const soapMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transmission: 1, thickness: 0.01, ior: 1.02, iridescence: 1, iridescenceIOR: 1.33, iridescenceThicknessRange: [200, 900], envMap: getStripEnv(), envMapIntensity: 1.0, specularIntensity: 1 });
      for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), soapMat); b.visible = false; scene.add(b); soap.push({ m: b, age: 0, life: 0, v: new THREE.Vector3() }); }
    }
    foodObjs = foods; cutSliceList = cutSlices;
    // 大きさの変化：巨大化（強さ1で皿より少し大きい、1.5で皿の倍の長さ）／極小（米粒ほど。強いほど小さい）
    const sizeF = look.size === 'huge' ? Math.min(4.5, 2 * LK ** 1.5) : look.size === 'tiny' ? 0.05 / LK
      : DF.small ? 0.88 - 0.06 * DF.small.strength : DF.big ? 1.12 + 0.08 * DF.big.strength : 1; // B段階：少し小さい／大きい
    if (sizeF !== 1) for (const o of foods) {
      o.scale.multiplyScalar(sizeF); o.position.x *= sizeF; o.position.z *= sizeF;
      o.position.y = plateTop + (o.position.y - plateTop) * sizeF;
    }
    // 特殊な完成（look.special）：heart は皿に何も載せない、oil は皿に油だけ。切るアニメーションもしない
    if (look.special) {
      for (const c of [...scene.children]) if (!beforeFood.has(c)) scene.remove(c);
      cutAnim = null; halo = null; soap.length = 0; foodObjs = []; cutSliceList = []; sheetObj = null;
      if (look.special === 'oil') {
        // 皿の真ん中に、ゆがんだ形の油だまりと、まわりに小さな油の粒
        const oilMat = new THREE.MeshPhysicalMaterial({ color: 0xfffaf0, roughness: 0, metalness: 0, transmission: 1, thickness: 0.03, ior: 1.47, attenuationColor: new THREE.Color(0xf2dca0), attenuationDistance: 0.25, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, envMap: getStripEnv(), envMapIntensity: 2.2 });
        const blob = (r, k) => {
          const sh = new THREE.Shape(), N2 = 64;
          for (let i = 0; i <= N2; i++) { const t = i / N2 * Math.PI * 2, rr = r * (1 + 0.28 * (fbm(Math.cos(t) * 1.4 + k, Math.sin(t) * 1.4 + k, 3) - 0.5) * 2); i ? sh.lineTo(Math.cos(t) * rr * 1.5, Math.sin(t) * rr) : sh.moveTo(Math.cos(t) * rr * 1.5, Math.sin(t) * rr); }
          const g = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.03, bevelSegments: 6, curveSegments: 4 }); g.rotateX(-Math.PI / 2);
          return new THREE.Mesh(g, oilMat);
        };
        const pool = new THREE.Group(); pool.rotation.y = 0.18; pool.position.y = plateTop + 0.012; scene.add(pool);
        const main = blob(0.42, 3); pool.add(main);
        for (const [x, z, r] of [[0.95, 0.12, 0.06], [-0.9, -0.15, 0.08], [0.7, -0.32, 0.04], [-0.62, 0.3, 0.05]]) { const d = blob(r, x * 7); d.position.set(x, 0, z); pool.add(d); }
        // 料理の範囲は空のまま（カメラは皿の全体を映す）
      }
    }
  }

  // ---------- 菜箸 ----------
  const stickMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const sticks = [];
  function chopstick(tip, end) {
    const dir = end.clone().sub(tip); const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.03, 0.014, len, 10); geo.translate(0, len / 2, 0);
    const m = new THREE.Mesh(geo, stickMat);
    m.position.copy(tip); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true; scene.add(m); sticks.push(m);
  }
  if (STAGE === 'cook') {
    chopstick(new THREE.Vector3(0.22, 0.2, -0.6), new THREE.Vector3(1.9, 3.0, 1.2));
    chopstick(new THREE.Vector3(0.44, 0.16, -0.56), new THREE.Vector3(2.2, 2.9, 1.5));
  } else if (STAGE === 'pour') {
    chopstick(new THREE.Vector3(0.05, 0.1, 0.1), new THREE.Vector3(1.9, 3.0, 1.9));
    chopstick(new THREE.Vector3(0.24, 0.09, 0.16), new THREE.Vector3(2.2, 2.9, 2.2));
  }

  // ---------- コンロ・背景 ----------
  const stoveTex = PLATED ? null : staticTex('stove');
  const stove = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: stoveTex, roughness: 0.75, metalness: 0.0, color: 0x2c2c2c }));
  stove.rotation.x = -Math.PI / 2; stove.position.y = -0.25; stove.receiveShadow = true; scene.add(stove);
  if (PLATED) {
    const woodTop = staticTex('woodTop');
    stove.material = new THREE.MeshPhysicalMaterial({ map: woodTop, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 });
    stove.geometry = new THREE.PlaneGeometry(14, 14);
  }
  // ---------- ガスコンロの火 ----------
  // 鍋の下に、バーナーと五徳（鍋をのせる鉄の脚）。バーナーの輪から、外向きに少し上がる青い炎の舌が出て揺れる。
  // 火が強いほど長く太く、強めの中火で鍋の縁に先がちらつき、強火では縁からはみ出す（setFire(強さ 0〜1, 秒)）
  const fireGroup = new THREE.Group(); scene.add(fireGroup);
  const burnerMat = new THREE.MeshStandardMaterial({ color: 0x2c2a28, metalness: 0.7, roughness: 0.45 });
  const BR = 0.6; // バーナーの輪の半径
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR + 0.03, 0.08, 48), burnerMat);
  burner.position.y = -0.21; burner.receiveShadow = true; fireGroup.add(burner);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(BR * 0.55, BR * 0.6, 0.05, 32), burnerMat);
  cap.position.y = -0.15; fireGroup.add(cap);
  const trivetRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.035, 8, 72), burnerMat);
  trivetRing.rotation.x = Math.PI / 2; trivetRing.position.y = -0.2; fireGroup.add(trivetRing);
  for (let i = 0; i < 5; i++) { // 五徳の爪：上の面が鍋の底（y=0）に触れる
    const a = i / 5 * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.05), burnerMat);
    arm.position.set(c * 1.18, -0.03, s * 1.18); arm.rotation.y = -a; arm.castShadow = arm.receiveShadow = true; fireGroup.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), burnerMat);
    leg.position.set(c * 1.58, -0.13, s * 1.58); leg.rotation.y = -a; fireGroup.add(leg);
  }
  // 炎の舌：先がとがった円すいを並べ（1回で描く）、シェーダーで長さ・揺れ・色を変える。加算合成で光らせる
  const N_FLAME = 44;
  const tongueGeo = new THREE.ConeGeometry(0.06, 1, 10, 6, true); tongueGeo.translate(0, 0.5, 0); // 根元が原点、+y へ伸びる
  tongueGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from({ length: N_FLAME }, (_, i) => (i * 0.6180339) % 1), 1));
  const fireU = { uTime: { value: 0 }, uPower: { value: 0 }, uPanN: { value: new THREE.Vector3(0, 1, 0) }, uPanD: { value: 0 } }; // uPanN・uPanD：鍋の底の面（傾けると変わる）
  const tongueMat = new THREE.ShaderMaterial({
    uniforms: fireU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime, uPower, uPanD;
      uniform vec3 uPanN;
      varying float vT, vEdge;
      void main() {
        vec3 p = position; float t = p.y; vT = t;
        float flick = 1.0 + 0.16 * sin(uTime * 17.0 + aSeed * 40.0) + 0.09 * sin(uTime * 31.0 + aSeed * 13.0);
        float len = (0.12 + 1.25 * pow(uPower, 1.1)) * flick;
        p.y *= len; p.xz *= 0.6 + 0.7 * uPower;
        p.x += sin(uTime * 9.0 + aSeed * 20.0) * 0.035 * t * t;     // 先が横に揺れる
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
        w.y += t * t * len * 0.3;                                     // 先が上へ反る
        w.xyz -= uPanN * max(0.0, dot(uPanN, w.xyz) - uPanD + 0.015); // 鍋の底（傾けた面）に当たったら、底に沿って広がる
        vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vEdge = abs(dot(n, normalize(cameraPosition - w.xyz)));
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uPower;
      varying float vT, vEdge;
      void main() {
        vec3 c = mix(vec3(0.35, 0.55, 1.0), vec3(0.05, 0.18, 0.95), smoothstep(0.0, 0.3, vT)); // 根元は白っぽい青、中ほどは濃い青
        c = mix(c, vec3(0.3, 0.12, 0.7), smoothstep(0.6, 1.0, vT));                        // 先は薄紫
        float a = smoothstep(0.0, 0.08, vT) * (1.0 - smoothstep(0.65, 1.0, vT)) * pow(vEdge, 0.8);
        gl_FragColor = vec4(c * a * (0.7 + 0.6 * uPower), 1.0);
      }`,
  });
  const tongues = new THREE.InstancedMesh(tongueGeo, tongueMat, N_FLAME); tongues.frustumCulled = false;
  const panOrigin = new THREE.Vector3();
  tongues.onBeforeRender = () => { // 描くたびに、鍋の底の面を今の傾きに合わせる
    pan.updateMatrixWorld(); fireU.uPanN.value.set(0, 1, 0).transformDirection(pan.matrixWorld);
    fireU.uPanD.value = fireU.uPanN.value.dot(panOrigin.setFromMatrixPosition(pan.matrixWorld));
  };
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), tilt = 0.25;
    for (let i = 0; i < N_FLAME; i++) {
      const a = i / N_FLAME * Math.PI * 2, dir = new THREE.Vector3(Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt));
      q.setFromUnitVectors(up, dir); m.compose(new THREE.Vector3(Math.cos(a) * BR, -0.165, Math.sin(a) * BR), q, new THREE.Vector3(1, 1, 1));
      tongues.setMatrixAt(i, m);
    } }
  fireGroup.add(tongues);
  // 照り返し：コンロの面の青白い光の輪と、鍋の底・五徳を照らす光
  const glowTex = pixelTex(128, 128, (u, v) => { const d = Math.hypot(u - 0.5, v - 0.5) * 2, k = Math.max(0, 1 - d) ** 1.3 * 255; return [k * 0.45, k * 0.6, k]; }, false);
  const flameGlow = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  flameGlow.rotation.x = -Math.PI / 2; flameGlow.position.y = -0.245; fireGroup.add(flameGlow);
  const flame = new THREE.PointLight(0x8aa4ff, 0, 3, 2); flame.position.set(0, -0.05, 0); fireGroup.add(flame);
  let firePower = 0;
  function setFire(power, dt = 0) {
    firePower = power; fireU.uPower.value = power; fireU.uTime.value += dt;
    const fl = 1 + 0.08 * Math.sin(fireU.uTime.value * 23) + 0.05 * Math.sin(fireU.uTime.value * 41);
    tongues.visible = power > 0.001;
    flame.intensity = power * 1.2 * fl; flameGlow.material.opacity = Math.min(1, power * 1.3) * fl;
  }
  setFire(PLATED ? 0 : fire);
  if (PLATED) fireGroup.visible = false;

  // ---------- 照明 ----------
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  key.position.set(-3, 6, -1.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc98a, 1.8); rim.position.set(3, 2.5, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffe6c4, 0x1a120c, 0.12));
  // 卵へのスポット（ツヤを出す）
  const spot = new THREE.SpotLight(0xfff4e6, 2.6, 12, 0.35, 0.8, 2); spot.position.set(-1.2, 4.5, 2.8); spot.target.position.set(0, 0, 0.2);
  scene.add(spot, spot.target);

  // ---------- 湯気（AO・被写界深度の後で重ねる別シーン） ----------
  const steamScene = new THREE.Scene();
  const steamTex = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  for (let i = 0; i < 17; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0.018 + rnd() * 0.025, depthWrite: false, depthTest: false }));
    const t = rnd();
    s.position.set((rnd() - 0.5) * 1.6, 0.3 + t * 1.8, (rnd() - 0.5) * 2.2 - 0.3);
    const sc = 0.5 + t * 1.2; s.scale.set(sc, sc * 1.4, 1); steamScene.add(s);
  }

  // ---------- ステージごとのカメラ ----------
  let focusPoint = new THREE.Vector3(0, 0.2, -0.5);
  if (STAGE === 'cook') { spot.intensity = 1.3; spot.target.position.set(0, 0, 0.5); key.intensity = 1.9; rollMat.color.setRGB(0.86, 0.76, 0.62); rollMat.sheen = 0.0; rollMat.clearcoat = 0.12; rim.intensity = 0.9; }
  if (STAGE === 'pour') { focusPoint.set(0, 0.07, 0.0); }
  if (PLATED) {
    camera.fov = 40; camera.updateProjectionMatrix();
    camera.position.set(0.5, 2.9, 2.75); camera.lookAt(-0.05, -0.1, -0.05);
    spot.position.set(-2.6, 3.6, 2.4); spot.target.position.set(0, 0, 0); spot.intensity = 3.2;
    key.position.set(-4, 5, -1.0);
    focusPoint.set(0.0, 0.15, 0.0);
    scene.fog.near = 5; scene.fog.far = 11;
  }
  // 縦長の画面では、上から見下ろす角度を深くして（長い玉子焼き器が縦に収まる）、横幅 halfW が入る距離まで引く。
  // 横長 1.2 以上は元の構図のまま
  const camLook = PLATED ? new THREE.Vector3(-0.05, -0.1, -0.05) : new THREE.Vector3(0.05, 0.0, -0.15);
  const camPos0 = camera.position.clone(), fov0 = camera.fov, fog0 = [scene.fog.near, scene.fog.far];
  const halfW = PLATED ? 2.3 : 1.45; // 縦長で横に入れる幅
  function fitCamera(w, h) {
    const a = w / h, minA = 1.2;
    camera.aspect = a; camera.fov = fov0; camera.position.copy(camPos0);
    [scene.fog.near, scene.fog.far] = fog0;
    if (a < minA) {
      const t = THREE.MathUtils.clamp((minA - a) / (minA - 0.5), 0, 1);
      camera.fov = fov0 * (1 + 0.2 * t);
      const d0 = camPos0.distanceTo(camLook), dir = camPos0.clone().sub(camLook).normalize();
      const elev = Math.asin(dir.y) + THREE.MathUtils.degToRad(22) * t, hz = new THREE.Vector2(dir.x, dir.z).normalize();
      const d = Math.max(d0, halfW / (Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * a));
      camera.position.copy(camLook).add(new THREE.Vector3(hz.x * Math.cos(elev), Math.sin(elev), hz.y * Math.cos(elev)).multiplyScalar(d));
      scene.fog.near += d - d0; scene.fog.far += d - d0;
    }
    camera.lookAt(camLook); camera.updateProjectionMatrix();
  }
  fitCamera(W, H);
  // ---------- ポストエフェクト ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // 1) 隙間の影（アンビエントオクルージョン）：卵と鍋の縁の接地感
  const gtao = new GTAOPass(scene, camera, W, H);
  gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.0, scale: 1.4, samples: 16 });
  gtao.blendIntensity = 1.0;
  // 炎の舌は隙間の影と被写界深度の奥行きには入れない（ShaderMaterial を差し替えて描くと、不透明の板として影ができるため）
  const flameVis = (on) => Object.assign(new Pass(), { needsSwap: false, render() { tongues.visible = on && firePower > 0.001; } });
  composer.addPass(flameVis(false));
  composer.addPass(gtao);
  // 2) 被写界深度：巻いた卵〜卵液手前にピント、奥の背景と手前の柄をぼかす
  const bokeh = new BokehPass(scene, camera, { focus: camera.position.distanceTo(focusPoint), aperture: 0.004, maxblur: 0.01 });
  composer.addPass(bokeh);
  composer.addPass(flameVis(true));
  const steamPass = new RenderPass(steamScene, camera); steamPass.clear = false; steamPass.clearDepth = true;
  composer.addPass(steamPass);
  // 3) ブルーム：卵液のツヤのハイライトだけをにじませる
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.22, 0.45, 0.9));
  composer.addPass(new OutputPass());
  // 4) 色調整：暖色寄りのグレーディング＋周辺減光＋ごく薄いフィルム粒子
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(W, H) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        // 暗部はやや冷たく沈め、中間〜明部を暖かく
        float l = dot(c, vec3(0.299,0.587,0.114));
        c = mix(c * vec3(0.94,0.97,1.04), c * vec3(1.06,1.0,0.9), smoothstep(0.15, 0.7, l));
        // 軽いS字コントラスト
        c = clamp(c, 0.0, 1.0);
        c = mix(c, c*c*(3.0-2.0*c), 0.6);
        c = max(c - 0.015, 0.0) * 1.04;
        // 周辺減光
        vec2 d = vUv - vec2(0.5, 0.45); d.x *= uRes.x / uRes.y;
        c *= mix(1.0, 0.38, smoothstep(0.35, 1.05, length(d)));
        // フィルム粒子
        c += (hash(vUv * uRes) - 0.5) * 0.018;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new SMAAPass(W, H));

  const draw = () => FX ? composer.render() : renderer.render(scene, camera);
  function setSize(w, h) {
    renderer.setSize(w, h); fitCamera(w, h);
    const pr = renderer.getPixelRatio(); composer.setPixelRatio(pr); composer.setSize(w, h);
    gtao.setSize(Math.round(w * pr * fxScale), Math.round(h * pr * fxScale));
    bokeh.renderTargetDepth.setSize(Math.round(w * pr * fxScale), Math.round(h * pr * fxScale));
    grade.uniforms.uRes.value.set(w, h);
    bokeh.uniforms.focus.value = camera.position.distanceTo(focusPoint);
  }
  // 料理の範囲（ワールド座標。包丁は含めない）
  function foodBox() {
    scene.updateMatrixWorld(); // 作った直後（まだ描いていない）でも、拡大・縮小した後の位置で測る
    const box = new THREE.Box3();
    for (const o of [...foodObjs, sheetObj].filter(Boolean)) o.traverse(c => { if (c.isMesh && c.visible && !c.userData.knife) box.expandByObject(c, true); });
    if (box.isEmpty() && plateObj) box.setFromObject(plateObj); // 何も載っていない（心を映し出すだし巻き）ときは皿を見せる
    return box;
  }
  // 料理の形の点（ワールド座標。頂点を step おきに）。結果のカメラで、料理が画面に収まるかを測るのに使う。料理がなければ皿の範囲の角
  function foodPoints(step = 5) {
    scene.updateMatrixWorld();
    const pts = [];
    for (const o of [...foodObjs, sheetObj].filter(Boolean)) o.traverse(c => {
      if (!c.isMesh || !c.visible || c.userData.knife) return;
      const pos = c.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(c.matrixWorld));
    });
    if (!pts.length) { const b = foodBox(); for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)); }
    return pts;
  }
  // 毎フレーム：後光を料理の奥に置いて回す、シャボン玉を浮かせる
  const tmpV = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpS = new THREE.Vector3();
  function tick(dt) {
    if (halo) {
      const b = foodBox(); b.getCenter(tmpC); b.getSize(tmpS);
      // カメラから見て料理の奥（水平方向）に、料理の高さで置く（真後ろだと台の下に埋もれるため）
      tmpV.subVectors(tmpC, camera.position); tmpV.y = 0; tmpV.normalize();
      halo.position.copy(tmpC).addScaledVector(tmpV, Math.max(0.8, tmpS.length() * 0.45)); halo.position.y += tmpS.y * 0.5 + 0.25;
      halo.scale.setScalar(Math.max(3.5, tmpS.length() * 2.2)); halo.material.rotation += dt * 0.12;
    }
    if (soapOn) for (const b of soap) {
      b.age += dt;
      if (b.age > b.life) { // 断面のどこかから、また出てくる
        const c = cutSliceList[Math.floor(Math.random() * cutSliceList.length)]; if (!c) break;
        c.m.localToWorld(tmpV.set((Math.random() < 0.5 ? 1 : -1) * c.hx, (Math.random() - 0.3) * RHY, (Math.random() - 0.5) * RHZ));
        b.m.position.copy(tmpV); b.age = 0; b.life = 3 + Math.random() * 3; b.r = 0.04 + Math.random() * 0.09; b.v.set((Math.random() - 0.5) * 0.15, 0.25 + Math.random() * 0.2, (Math.random() - 0.5) * 0.15);
      }
      const s = b.r * Math.min(1, b.age * 3) * (b.age > b.life - 0.15 ? 0.2 : 1);
      b.m.visible = true; b.m.scale.setScalar(s);
      b.m.position.addScaledVector(b.v, dt); b.m.position.x += Math.sin(b.age * 3 + b.r * 50) * dt * 0.08;
    }
  }
  const startSoap = () => { soapOn = soap.length > 0; for (const b of soap) { b.age = 0; b.life = Math.random() * 1.5; } };
  return { scene, camera, composer, render: draw, setSize, cutAnim, tick, foodBox, foodPoints, startSoap, steamScene, stove, pan, PW, PL, setFire, setPanHeat, liquid, liquidMat, oil, oilMat, roll, rollMat, makeRollGeo, RHX, RHY, RHZ, sticks, bubbles, flame, flameGlow, bokeh, focusPoint };
}
