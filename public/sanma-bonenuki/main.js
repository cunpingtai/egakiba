// サンマの骨抜き（試作）。サンマはコードで作った形に、焼きサンマの写真（skin.jpg）を皮として貼る
// 流れ：提供 → ほぐす（箸で身を押す）→ 尾を折る（尾の付け根を短くドラッグ）→ 中骨を抜く（頭をつまんで左へ）→ 結果
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { CFG } from './config.js';
import { tolerance, crumble, sectionAt, createPullMeter, evaluate, breakCause, nameFor } from './judge.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const DEBUG = q.get('debug') === '1';
// 軽い表示（?lite=1、または一度 3D 描画が落ちた端末）：ポストエフェクトを切り、描く画素数を下げる（だし巻きと同じ）
const LS_LITE = 'sanma_lite';
const LITE = q.get('lite') === '1' || (() => { try { return localStorage.getItem(LS_LITE) === '1'; } catch { return false; } })();
const FX = !LITE && q.get('fx') !== '0';
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const ss = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

// ---------- 言語（<html lang> と title は書き換えない。表示は data-ui-lang で切り替える） ----------
const DICT = {
  ja: {
    share: (name) => `「${name}」になりました #秋刀魚の骨抜き`,
    liteReload: '軽い表示で読み込み直します', liteFailed: 'この端末では表示できませんでした',
  },
  en: {
    share: (name) => `I ended up with "${name}" #SauryDeboning`,
    liteReload: 'Reloading in a lighter mode', liteFailed: "This device couldn't display the game",
  },
};
const lang = () => document.documentElement.dataset.uiLang;
$('lang').onclick = () => {
  const l = lang() === 'ja' ? 'en' : 'ja';
  document.documentElement.dataset.uiLang = l;
  try { localStorage.setItem('sanma_lang', l); } catch {}
  if (resultData) showResult();
};

// ---------- タッチ操作の抑止（拡大・長押しメニュー・引っぱって更新） ----------
for (const ev of ['contextmenu', 'gesturestart', 'dblclick']) document.addEventListener(ev, e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// ---------- 乱数・ノイズ（だし巻きの kitchen.js と同じ） ----------
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
// 区間ごとに毎回同じ並びになる乱数（ひびの位置など）
const seq = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
function pixelCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, gg, b] = fn(x / w, y / h), i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
const canvasTexture = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- レンダラー・シーン（だし巻きと同じ設定） ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CFG.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const canvas = renderer.domElement; document.body.prepend(canvas);
let bandH = 0; // 結果画面・開始画面の上の広告の帯の高さ（addBand）。3D の画面はその下に縮める
let startBanded = false; // 開始画面に帯を出している（「はじめる」で読み直す）
const viewH = () => window.innerHeight - bandH;
// 3D 描画が落ちたら、軽い表示で読み込み直す（軽い表示でも落ちたら知らせるだけ。だし巻きと同じ）
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  $('lostText').textContent = DICT[lang()][LITE ? 'liteFailed' : 'liteReload']; $('lost').style.display = 'flex';
  if (LITE) return;
  try { localStorage.setItem(LS_LITE, '1'); } catch {}
  setTimeout(() => { const u = new URL(location.href); u.searchParams.set('lite', '1'); location.replace(u); }, 1500);
});
const scene = new THREE.Scene();
// 奥は真っ黒にせず、暗い茶色へ霞ませる（2026-10-28 ユーザー指定で奥の暗がりを減らした。だし巻きは 0x0d0b0a）
scene.background = new THREE.Color(CFG.backColor);
scene.fog = new THREE.Fog(CFG.backColor, 5, 12);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);

// 照明（だし巻きの盛り付けの場面と同じ並び）
const key = new THREE.DirectionalLight(0xfff1dc, 1.9);
key.position.set(-4, 5, -1); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0005;
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4, near: 0.5, far: 20 });
scene.add(key);
const rim = new THREE.DirectionalLight(0xffc98a, 0.9); rim.position.set(3, 2.5, -4); scene.add(rim);
// 皮の照り返し用（カメラの反対側の上。粗さの小さい銀の所だけ鋭く光る）
const gleam = new THREE.DirectionalLight(0xfff6e8, CFG.gleam); gleam.position.set(-0.5, 3.2, -3.0); scene.add(gleam);
scene.add(new THREE.HemisphereLight(0xffe6c4, 0x1a120c, 0.12));
// 皿へのスポット（まわりのテーブルは暗く沈める）
const spot = new THREE.SpotLight(0xfff4e6, 2.8, 14, 0.6, 0.9, 2); spot.position.set(-2.6, 3.6, 2.4); spot.target.position.set(0, 0, 0.1);
scene.add(spot, spot.target);

// 焼きたての湯気（だし巻きと同じく、隙間の影・被写界深度の後に重ねる別シーン）。身から立ちのぼり、押すとふわっと出る
const steamScene = new THREE.Scene();
const steamTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128); return canvasTexture(c);
})();
const puffs = Array.from({ length: 28 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  steamScene.add(s); return { s, age: 1, life: 1, peak: 0, v: new THREE.Vector3() };
});

// 木のテーブル（だし巻きの woodTop と同じ作り）
const woodTex = canvasTexture(pixelCanvas(512, 512, (u, v) => {
  const plank = Math.floor(v * 5), pv = v * 5 - plank;
  const grain = Math.sin((u * 3 + fbm(u * 2 + plank * 7, pv * 6) * 4 + pv * 1.5) * 18) * 0.5 + 0.5;
  let k = 0.42 + grain * 0.12 + fbm(u * 20 + plank, v * 60, 3) * 0.2 + (plank % 2) * 0.05;
  if (pv < 0.012 || pv > 0.988) k *= 0.35;
  return [128 * k, 84 * k, 48 * k];
}));
// 奥の端が見えないよう広く敷き、木目は真ん中の 14×14 を今までどおりにして、まわりは鏡で折り返す
woodTex.wrapS = woodTex.wrapT = THREE.MirroredRepeatWrapping; woodTex.repeat.set(3, 3); woodTex.offset.set(-1, -1);
const table = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 }));
table.rotation.x = -Math.PI / 2; table.position.y = -0.09; table.receiveShadow = true; scene.add(table);
// 長皿（藍の釉薬）。上面が y=0
const plate = new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.08, 1.35, 4, 0.04), new THREE.MeshPhysicalMaterial({ color: 0x1b2232, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 }));
plate.position.set(-0.05, -0.04, 0); plate.receiveShadow = true; scene.add(plate);
const PLATE_L = -0.05 - 3.9 / 2; // 皿の左の縁（x）

// ---------- サンマ（仮の形） ----------
// 魚の座標：x が頭（−）→尾（＋）、y が上、z が腹（＋、手前）→背（−）。横向きに寝かせ、見えている面が上
const fish = new THREE.Group(); fish.position.set(0.2, 0, 0.14); scene.add(fish);
const X0 = -1.4, LEN = 2.6;       // 頭の先〜尾の付け根
const XH = -1.02, XT = 1.17;      // 中骨の範囲（エラ〜尾の付け根）。頭と身の境目が XH
const BONE_L = XT - XH;
const sOf = (x) => (x - X0) / LEN, SH = sOf(XH);
// 胴の太さ：写真の魚の輪郭の高さ（u＝0〜1 を 40 等分した値、最大 1）。python tools/skin.py が書き換える。間は Catmull-Rom でなめらかにつなぐ
const PROFILE = [0.033, 0.277, 0.495, 0.653, 0.738, 0.797, 0.853, 0.893, 0.917, 0.936, 0.953, 0.969, 0.983, 0.996, 1.000, 0.997, 0.992, 0.983, 0.967, 0.948, 0.931, 0.920, 0.914, 0.909, 0.905, 0.900, 0.895, 0.885, 0.858, 0.817, 0.773, 0.720, 0.654, 0.583, 0.509, 0.429, 0.344, 0.260, 0.185, 0.125, 0.082];
const profile = (s) => {
  const t = clamp(s, 0, 1) * 40, i = Math.min(Math.floor(t), 39), f = t - i, p = (k) => PROFILE[clamp(k, 0, 40)];
  const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
  return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
};
const depth = (s) => CFG.bodyDepth * profile(s) + 0.003; // 背〜腹の半分
const thick = (s) => CFG.bodyThick * profile(s) + 0.003; // 中骨から上の面までの厚み（皿側は × CFG.bellyFlat）
const centerY = (s) => thick(s) * CFG.bellyFlat; // 中骨の高さ（皿側の面が皿に着く）
const bellyK = (s) => 1 + CFG.bellyOut * ss(0.07, 0.25, s) * (1 - ss(0.5, 0.85, s)); // 腹側（z＋）だけ外へ出す倍率（tools/skin.py も同じ式）
const backK = (s) => 1 + CFG.backOut * ss(0.33, 0.5, s) * (1 - ss(0.62, 0.8, s)); // 背側（z−）の胴の後ろ寄りを外へ出す倍率（tools/skin.py も同じ式）
const edgeZ = (s, side) => side * depth(s) * (side > 0 ? bellyK(s) : backK(s)); // 背（−1）・腹（＋1）の縁の z
const N = CFG.sections;
const secX = (k) => XH + BONE_L * (k + 0.5) / N; // 区間の中心

// 皮のテクスチャ：u＝頭の先→尾の付け根、v＝断面の周り（0＝腹の縁、0.25＝上の面、0.5＝背の縁、0.75＝皿に接する面）
// 色は写真（tools/skin.py で写真の魚を展開した skin.jpg）。質感（R＝虹色の映り、G＝粗さ、B＝金属っぽさ）と凹凸（bump）は写真の色から作る：
// 銀（明るく色が薄い）はつるっと光り、焼き色・焦げ（茶色い・暗い）は乾いてマット。凹凸は明るさの細かい変化
const SKIN_W = 1024, SKIN_H = 256, SKIN_PX = SKIN_W / 768; // SKIN_PX：以前の幅（768）で決めた線の太さ・大きさを合わせる倍率
const lat = (v) => (v <= 0.5 ? v : 1 - v);                  // 0＝腹の縁 → 0.5＝背の縁（皿側の面も同じ並び）
// 口：MOUTH_S より先は頭の腹側をえぐり（それが上あご）、そこに細い下あごを別に置いて少し開く（下あごのほうが長い）。MOUTH_L は皮の模様での口の線
const MOUTH_L = 0.22, MOUTH_S = 0.06, mouthOpen = (s) => (s < MOUTH_S ? (1 - s / MOUTH_S) ** 1.3 : 0);
// decode() は画面が裏にあると後回しにされて読み込みが止まるので、onload を待つ
const loadImg = (src) => new Promise((ok, ng) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ng; im.src = src; });
// flesh.jpg：ほぐれた身の写真（python tools/flesh.py）。えぐれ・かけら・身の断面に使う
// skin-raw.jpg：生のサンマの皮（息を吹き返した結果だけで使う。python tools/skin.py）
const [skinImg, fleshImg, rawImg] = await Promise.all([loadImg('skin.jpg'), loadImg('flesh.jpg'), loadImg('skin-raw.jpg')]);
function skinMaps() {
  const mk = () => { const c = document.createElement('canvas'); c.width = SKIN_W; c.height = SKIN_H; return c; };
  const col = mk(), pbr = mk(), bmp = mk(), n = SKIN_W * SKIN_H;
  const gc = col.getContext('2d', { willReadFrequently: true }); gc.drawImage(skinImg, 0, 0, SKIN_W, SKIN_H);
  const src = gc.getImageData(0, 0, SKIN_W, SKIN_H).data, L = new Float32Array(n);
  for (let k = 0; k < n; k++) L[k] = (src[k * 4] * 0.3 + src[k * 4 + 1] * 0.59 + src[k * 4 + 2] * 0.11) / 255;
  // 明るさをぼかしたもの（横・縦の箱ぼかし）との差を凹凸にする
  const box = (a, r, dx, len, step) => {
    const o = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const p = Math.floor(k / step) % len; let s = 0, c = 0;
      for (let d = -r; d <= r; d++) if (p + d >= 0 && p + d < len) { s += a[k + d * dx]; c++; }
      o[k] = s / c;
    }
    return o;
  };
  const Lb = box(box(L, 3, 1, SKIN_W, 1), 3, SKIN_W, SKIN_H, SKIN_W);
  const ip = new ImageData(SKIN_W, SKIN_H), ib = new ImageData(SKIN_W, SKIN_H);
  for (let k = 0; k < n; k++) {
    const r = src[k * 4], b = src[k * 4 + 2], i = k * 4;
    const dry = clamp((r - b - 25) / 255 * 3 + ss(0.35, 0.12, L[k]), 0, 1), blue = clamp((b - r) / 255 * 4, 0, 1);
    ip.data[i] = 255 * blue * (1 - dry) * 0.8;
    ip.data[i + 1] = 255 * lerp(0.32, 0.8, dry);
    ip.data[i + 2] = 255 * 0.45 * (1 - dry);
    ib.data[i] = ib.data[i + 1] = ib.data[i + 2] = clamp(128 + (L[k] - Lb[k]) * 500, 0, 255);
    ip.data[i + 3] = ib.data[i + 3] = 255;
  }
  pbr.getContext('2d').putImageData(ip, 0, 0); bmp.getContext('2d').putImageData(ib, 0, 0);
  // 丸みの陰：写真は全体が明るく照明だけでは丸みが出ないので、皿側へ回り込むほど暗く（接地の影）、奥の背の縁も少し暗くする。a は断面の角度（0＝腹の縁、皿側は負）
  const img = new ImageData(src, SKIN_W, SKIN_H);
  for (let y = 0; y < SKIN_H; y++) {
    const v = 1 - (y + 0.5) / SKIN_H, a = Math.PI * 2 * (v <= 0.5 ? v : v - 1);
    const f = 1 - CFG.skinShade * (0.85 * ss(0.9, -0.5, a) + 0.55 * ss(1.3, 2.7, a));
    for (let x = 0, i = y * SKIN_W * 4; x < SKIN_W; x++, i += 4) { src[i] *= f; src[i + 1] *= f; src[i + 2] *= f; }
  }
  gc.putImageData(img, 0, 0);
  return { col, pbr, bmp };
}
const SKIN = skinMaps();
const layer = (base) => { const c = document.createElement('canvas'); c.width = SKIN_W; c.height = SKIN_H; return { base, c, g: c.getContext('2d') }; };
const skinLayers = { col: layer(SKIN.col), pbr: layer(SKIN.pbr), bmp: layer(SKIN.bmp) };
const skinTex = canvasTexture(skinLayers.col.c);
const pbrTex = new THREE.CanvasTexture(skinLayers.pbr.c), bumpTex = new THREE.CanvasTexture(skinLayers.bmp.c);
pbrTex.anisotropy = bumpTex.anisotropy = 8;
// 銀の皮：ツヤとマットの差は pbrTex（G＝粗さ・B＝金属っぽさ）だけで出す（clearcoat は焦げまで一様に光らせるので使わない）。
// 境目の青緑は虹色の映り（R）。映り込みは皮だけ強め（scene.environmentIntensity は全体に効くため envMap を直接渡す）
const skinMat = new THREE.MeshPhysicalMaterial({
  map: skinTex, color: new THREE.Color().setScalar(CFG.skinTone), roughnessMap: pbrTex, metalnessMap: pbrTex, roughness: 1, metalness: 1, bumpMap: bumpTex, bumpScale: CFG.skinBump,
  envMap: scene.environment, envMapIntensity: CFG.skinEnv, specularIntensity: 1,
  iridescence: 0.4, iridescenceMap: pbrTex, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 520],
});
const fleshTex = canvasTexture(fleshImg); fleshTex.wrapS = fleshTex.wrapT = THREE.RepeatWrapping;
const fleshMat = new THREE.MeshStandardMaterial({ map: fleshTex, color: new THREE.Color().setScalar(CFG.fleshTone), roughness: 0.75 });

const NV = 96; // 断面の周りの分割（でこぼこが出る細かさ）
// 皮のでこぼこ（断面の大きさに対する割合）。焼けて縮んだシワ・ゆるい波打ち。頭の先と尾は控えめ
const crease = (x, y) => (1 - Math.abs(2 * vnoise(x, y) - 1)) ** 6;
function skinRelief(s, l) {
  let d = (fbm(s * 26, l * 9 + 5, 3) - 0.5) * 0.12 + (fbm(s * 90, l * 24, 2) - 0.5) * 0.05
    - crease(s * 30 + fbm(s * 8, l * 6) * 2, l * 26) * 0.05;
  return d * CFG.skinRelief * ss(0.02, 0.14, s) * (1 - 0.5 * ss(0.85, 1, s));
}
// 筒の形（断面は楕円、底は皿に沿って平ら）。mod(x) で区間ごとの変形を足す
function makeTube(s0, s1, nu) {
  const n = (nu + 1) * (NV + 1), uv = new Float32Array(n * 2), idx = [], relief = new Float32Array(n);
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= NV; j++) {
    const k = i * (NV + 1) + j; uv[k * 2] = s0 + (s1 - s0) * i / nu; uv[k * 2 + 1] = j / NV;
    relief[k] = skinRelief(uv[k * 2], lat(j / NV)); // でこぼこは変わらないので、最初に1回だけ計算
    if (i < nu && j < NV) idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  // 端のふた（身の断面）
  const cap = new THREE.BufferGeometry(), ci = [];
  cap.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NV + 2) * 3), 3));
  const cuv = new Float32Array((NV + 2) * 2).fill(0.5); // 身の模様：輪は円、最後が中心
  for (let j = 0; j <= NV; j++) { const a = j / NV * Math.PI * 2; cuv[j * 2] = 0.5 + 0.3 * Math.cos(a); cuv[j * 2 + 1] = 0.5 + 0.3 * Math.sin(a); }
  cap.setAttribute('uv', new THREE.BufferAttribute(cuv, 2));
  for (let j = 0; j < NV; j++) ci.push(NV + 1, j, j + 1);
  cap.setIndex(ci);
  return { geo, cap, s0, s1, nu, relief };
}
function shapeTube(t, mod, capRing) {
  const p = t.geo.attributes.position.array; let k = 0;
  for (let i = 0; i <= t.nu; i++) {
    const s = t.s0 + (t.s1 - t.s0) * i / t.nu, x = X0 + s * LEN, d = depth(s) * (t.raw ? CFG.rawSlim : 1), h = thick(s), yc = centerY(s);
    const m = mod && mod(x);
    const mo = t.raw ? 0 : mouthOpen(s), bk = t.raw ? 1 : bellyK(s), bb = t.raw ? 1 : backK(s); // 生きたサンマ（t.raw）は口の切れ込み・腹と背の張り出しなし
    for (let j = 0; j <= NV; j++) {
      const a = j / NV * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), rel = 1 + t.relief[i * (NV + 1) + j];
      // 断面は左右に平たいレンズ形：上の面は |sin|^bodyRound（2 で背と腹の縁がとがる）、皿側はそれを bellyFlat 倍に平たく。腹側は bellyK 倍、背側は backK 倍に張り出す
      let y = yc + h * Math.sign(sa) * Math.abs(sa) ** CFG.bodyRound * (sa > 0 ? 1 : CFG.bellyFlat) * rel, z = d * ca * rel * (ca > 0 ? bk : bb), px = x;
      if (mo > 0 && ca > 0) z *= 1 - CFG.mouthCut * mo * ss(-0.1, 0.7, ca); // 口：腹側をえぐる（そこに下あご）
      if (m) {
        if (sa > 0) y += sa * (-h * m.sq + 0.1 * m.lift) - m.cr * 0.03 * vnoise(x * 34, j * 0.7 * 40 / NV) * sa; // 浮きは厚みによらない大きさ
        z *= 1 + m.wid;
      }
      p[k++] = px; p[k++] = Math.max(y, 0.002); p[k++] = z;
    }
  }
  t.geo.attributes.position.needsUpdate = true; t.geo.computeVertexNormals();
  // ふた：指定した輪の頂点＋中心
  const c = t.cap.attributes.position.array, o = capRing * (NV + 1) * 3, ctr = [0, 0, 0];
  for (let j = 0; j <= NV; j++) for (let a = 0; a < 3; a++) { c[j * 3 + a] = p[o + j * 3 + a]; ctr[a] += p[o + j * 3 + a] / (NV + 1); }
  c.set(ctr, (NV + 1) * 3);
  t.cap.attributes.position.needsUpdate = true; t.cap.computeVertexNormals();
}
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m; };

// 身（エラ〜尾の付け根）
const body = makeTube(SH, 1, 200);
const bodyMesh = mesh(body.geo, skinMat), bodyCap = mesh(body.cap, fleshMat);
bodyCap.material = fleshMat.clone(); bodyCap.material.side = THREE.DoubleSide;
fish.add(bodyMesh, bodyCap);
// 頭（中骨と一緒に抜ける）。headRoot を左へ動かすと頭と骨が抜ける。headMesh は横ずれの見た目だけ
const headRoot = new THREE.Group(); fish.add(headRoot);
const headMesh = new THREE.Group(); headRoot.add(headMesh);
const head = makeTube(0, SH, 60);
shapeTube(head, null, 60);
// 下あご：頭の腹側（口の所でえぐってある）に沿った細長い円すい。上あご（頭の先）より前へ出る
{
  const xb = X0 + MOUTH_S * LEN, D0 = depth(MOUTH_S), Y0 = centerY(MOUTH_S), NA = 16, NL = 24;
  const from = new THREE.Vector3(xb + 0.02, Y0, D0 * 0.55), to = new THREE.Vector3(X0 - CFG.jawOut, 0.004, CFG.mouthGap);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NL; i++) {
    const t = i / NL, c = from.clone().lerp(to, t), ry = thick(MOUTH_S) * 0.45 * (1 - t) ** 0.9 + 0.0015, rz = D0 * 0.22 * (1 - t) + 0.002; // 頭の厚み・幅に合わせる
    for (let j = 0; j <= NA; j++) {
      const a = j / NA * Math.PI * 2, top = a <= Math.PI;
      pos.push(c.x, Math.max(0.002, c.y + ry * Math.sin(a)), c.z + rz * Math.cos(a));
      const vv = lerp(0.02, MOUTH_L, top ? a / Math.PI : (2 * Math.PI - a) / Math.PI); // 腹の縁 → 口の線の色
      uv.push(Math.max(0, sOf(c.x)), top ? vv : 1 - vv);
      if (i < NL && j < NA) { const q0 = i * (NA + 1) + j; idx.push(q0 + 1, q0 + NA + 1, q0, q0 + NA + 2, q0 + NA + 1, q0 + 1); } // 頭の先へ向けて並べるので、筒と三角形の向きを逆に
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  // 口の中（上あごと下あごの間の暗い三角）
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.Float32BufferAttribute([xb, Y0 * 0.6, D0 * 0.2, X0 + 0.01, 0.005, 0.004, to.x + 0.02, 0.005, to.z - 0.004], 3));
  mg.computeVertexNormals();
  headMesh.add(mesh(g, skinMat), new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ color: 0x24140e, roughness: 0.7, side: THREE.DoubleSide })));
}
const headCapMesh = mesh(head.cap, bodyCap.material);
headMesh.add(mesh(head.geo, skinMat), headCapMesh);
// ひれの模様。色は写真の尾びれから拾った（根元は黄緑、先へ黄土色）。膜は根元の半分ほどで、先は裂けてすじだけが残り、すじの先は焦げる。
// 裂けた所は透明（alphaTest で抜く）。u＝根元→先、v＝幅
const finTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), R = seq(31);
  const grd = g.createLinearGradient(0, 0, 128, 0);
  grd.addColorStop(0, 'rgb(150,154,124)'); grd.addColorStop(0.35, 'rgb(166,152,118)'); grd.addColorStop(1, 'rgb(146,120,88)');
  const NR = 22, root = (y) => 64 + (y - 64) * 0.4, ends = Array.from({ length: NR }, () => 0.45 + R() * 0.25);
  g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0);                       // 膜（先のふちはギザギザ）
  ends.forEach((e, i) => { const y = (i + 0.5) * 128 / NR; g.lineTo(lerp(0, 128, e), lerp(root(y), y, e)); });
  g.lineTo(0, 128); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < NR; i++) {                                          // すじ（長さは不ぞろい）。先の 2 割は焦げ
    const y = (i + 0.5) * 128 / NR, len = 0.8 + R() * 0.2, tip = len * 0.8;
    g.strokeStyle = grd; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, root(y)); g.lineTo(128 * tip, lerp(root(y), y, tip)); g.stroke();
    g.strokeStyle = 'rgb(84,56,32)'; g.beginPath(); g.moveTo(128 * tip, lerp(root(y), y, tip)); g.lineTo(128 * len, lerp(root(y), y, len)); g.stroke();
    g.strokeStyle = 'rgba(110,80,46,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, root(y)); g.lineTo(128 * tip, lerp(root(y), y, tip)); g.stroke();
  }
  return canvasTexture(c);
})();
// 透明（transparent）にするとポストエフェクトを通したときに消えるので、ひれ・目は不透明で作る
const finMat = new THREE.MeshStandardMaterial({ map: finTex, alphaTest: 0.5, color: new THREE.Color().setScalar(CFG.finTone), roughness: 0.5, side: THREE.DoubleSide });
// 目（焼けて白く濁った目。皮の写真の目に合わせる）：白い水晶体・灰色の虹彩・黒い縁を描いた円板に、つやのある膜をかぶせる
const EYE_Z = -0.0065; // 皮の写真の目が来る所（python tools/skin.py が書き換える）
const sE = 0.07, eyeR = 0.036, eyeY = centerY(sE) + thick(sE) * 0.97, eyeX = X0 + sE * LEN;
{
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgb(190,180,160)'); grd.addColorStop(0.15, 'rgb(222,212,190)'); grd.addColorStop(0.45, 'rgb(205,194,172)');
  grd.addColorStop(0.56, 'rgb(130,118,100)'); grd.addColorStop(0.72, 'rgb(44,38,34)'); grd.addColorStop(0.86, 'rgb(30,26,24)'); grd.addColorStop(0.95, 'rgb(110,104,96)'); grd.addColorStop(1, 'rgba(110,104,96,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  // 少し盛り上がった円板（ふちの透ける所は alphaTest で切る）。つやは clearcoat
  const geo = new THREE.SphereGeometry(eyeR, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / eyeR / 2, 0.5 - pos.getZ(i) / eyeR / 2); // 真上から見た位置で模様を貼る
  const iris = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: canvasTexture(c), alphaTest: 0.5, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05 }));
  iris.scale.y = 0.3; iris.position.set(eyeX, eyeY - 0.004, EYE_Z);
  headMesh.add(iris);
}
// 背びれ・しりびれ・小離鰭：尾に近い背と腹の縁に、外へ張り出した小さなひれ
{
  const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(1, 0); tri.lineTo(0.75, 1); tri.closePath();
  const tg = new THREE.ShapeGeometry(tri);
  for (const [x0, x1, n, h] of [[0.42, 0.7, 4, 0.028], [0.78, 1.1, 5, 0.018]]) for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
    const x = lerp(x0, x1, i / Math.max(1, n - 1)) + (side > 0 ? 0.04 : 0), s = sOf(x), f = new THREE.Mesh(tg, finMat);
    f.rotation.x = Math.PI / 2 * side; f.rotation.z = -0.5; f.scale.set(0.04, h * (0.8 + 0.4 * ((i * 7) % 3) / 2), 1);
    f.position.set(x, centerY(s) + thick(s) * 0.2, edgeZ(s, side) * 0.96); fish.add(f);
  }
}

// 尾びれ（尾の付け根を支点に折れる）。二股で、根元が濃く先が透ける
const tail = new THREE.Group(); tail.position.set(XT + 0.03, centerY(1), 0); fish.add(tail);
{
  const sh = new THREE.Shape();
  sh.moveTo(-0.04, -0.028); sh.quadraticCurveTo(0.15, -0.06, 0.36, -0.2); sh.lineTo(0.31, -0.12); sh.quadraticCurveTo(0.24, -0.04, 0.2, 0);
  sh.quadraticCurveTo(0.24, 0.04, 0.31, 0.12); sh.lineTo(0.36, 0.2); sh.quadraticCurveTo(0.15, 0.06, -0.04, 0.028); sh.closePath();
  const tg = new THREE.ShapeGeometry(sh, 10), uv = tg.attributes.uv, pos = tg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.04) / 0.4, (pos.getY(i) + 0.2) / 0.4); // 形の座標 → 模様（根元→先）
  const tm = mesh(tg, finMat);
  tm.scale.set(0.85, 0.55, 1); // 写真の尾びれの大きさ（長さは魚の約 1/8、開きはその 6 割ほど）
  tm.rotation.x = -Math.PI / 2; tm.position.y = 0.006; tail.add(tm);
}

// 付け合わせ：皿の手前右（尾のそば）に大根おろしと半分に切ったスダチ（2026-10-28 ユーザー指定）。大きさはワールド単位（1 ≒ 10cm）
// 模様は写真から（python tools/garnish.py）。大根おろしは写真の山（しょうゆ付き）を手前斜め上から映すように貼る（写真もゲームもその向きから見ている）
// 写真を手前斜め上（約39°見下ろす。写真もゲームもその向き）から映すように UV を付ける：u＝左右、v＝画面の上向き（大根おろし・ごはん）
function viewUV(geo) {
  const p = geo.attributes.position, uv = geo.attributes.uv, up = (i) => 0.78 * p.getY(i) - 0.63 * p.getZ(i);
  geo.computeBoundingBox(); const bb = geo.boundingBox;
  let u0 = Infinity, u1 = -Infinity; for (let i = 0; i < p.count; i++) { u0 = Math.min(u0, up(i)); u1 = Math.max(u1, up(i)); }
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (up(i) - u0) / (u1 - u0));
}
const garnish = new THREE.Group(); garnish.position.set(...CFG.garnishAt); scene.add(garnish);
{
  const tex = (f) => { const t = new THREE.TextureLoader().load(f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  // 山の形：丸く盛ってから、ふぞろいな塊に崩す（位置で決まる量なので継ぎ目は裂けない。高さの項も入れて、縦に筋が並ばないように）
  const H = CFG.oroshiHeight, pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(0.15 * Math.sin(t * Math.PI / 2) ** 0.9 + 0.001, H * (1 - t) ** 0.75)); } // 頂がとがった山（すそは広く、上へ細る）
  const og = new THREE.LatheGeometry(pts.reverse(), 64), op = og.attributes.position;
  for (let i = 0; i < op.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(op, i), h = v.y / H, n = fbm(v.x * 16 + v.y * 22 + 3, v.z * 16 - v.y * 19, 4) - 0.5, m = 1 + n * 0.7 * (0.25 + h);
    op.setXYZ(i, v.x * m, v.y * (0.8 + 0.4 * fbm(v.x * 12, v.z * 12, 3)) + n * 0.02 * h, v.z * m);
  }
  viewUV(og); og.computeVertexNormals();
  const ot = tex('oroshi.jpg');
  // 透明感：光を通す材質は黒く写るので、①写真の中間の明るさを沈めて白い粒を浮かせ（すき間が透けて見える）、
  // ②縁（面が横を向く所）ほど皿の色を透かし、③濡れた強い照りを足す。強さは CFG.oroshiClear
  const om = new THREE.MeshPhysicalMaterial({ map: ot, bumpMap: ot, bumpScale: 2, color: new THREE.Color().setScalar(CFG.oroshiTone), roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.22, envMapIntensity: 1 });
  om.onBeforeCompile = (sh) => {
    sh.uniforms.clearK = { value: CFG.oroshiClear };
    sh.fragmentShader = 'uniform float clearK;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float lum = max(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)), 1e-3); // 色合いは変えず、明るさだけを沈める（しょうゆが赤くならないように）
      diffuseColor.rgb *= mix(1.0, pow(lum, 0.8) * 1.15, clearK);
      float fr = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 1.6);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.06, 0.09), fr * 0.65 * clearK);`);
  };
  garnish.add(mesh(og, om));

  // スダチ（直径約3cm）：皮は写真の点々、切り口は写真の手前の半分
  const R = 0.15, pt = tex('sudachi-peel.jpg'); pt.wrapS = pt.wrapT = THREE.RepeatWrapping; pt.repeat.set(4, 2);
  const peel = mesh(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: pt, bumpMap: pt, bumpScale: 2, color: new THREE.Color(1.5, 1.6, 1.2), roughness: 0.35, clearcoat: 0.6 }));
  const face = mesh(new THREE.CircleGeometry(R, 64).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: tex('sudachi-face.jpg'), color: new THREE.Color().setScalar(CFG.sudachiTone), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 })); // 果汁で濡れた切り口
  face.position.y = 0.001;
  const sudachi = new THREE.Group(); sudachi.add(peel, face);
  sudachi.position.set(0.3, R * 0.92, 0.06); sudachi.rotation.set(0.28, 0.3, -0.3); // 切り口を手前斜め上へ向け、おろしに寄りかける
  garnish.add(sudachi);
}

// 中骨（背骨＋左右に並ぶ細い骨）。xa〜xb の範囲だけ作る（折れたら2本に作り直す）
// off(x)：骨を横（z。ぶら下げると画面の左右）へずらす量（結果のジグザグ・曲がり）。mat：材質（結果の照り・金）
const boneMat = new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.45 });
function buildBone(xa, xb, off = () => 0, mat = boneMat) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 96; i++) { const x = lerp(xa, xb, i / 96); pts.push(new THREE.Vector3(x, centerY(sOf(x)), off(x))); }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 192, 0.009, 6), mat)); g.userData.end = pts[pts.length - 1]; // 骨の後ろの端（共有画像で身の口に寄せる）
  const xs = []; for (let x = xa + 0.02; x < xb; x += 0.05) xs.push(x);
  const ribs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0028, 0.0045, 1, 5).translate(0, 0.5, 0), mat, xs.length * 2);
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(), dir = new THREE.Vector3();
  xs.forEach((x, i) => {
    const s = sOf(x);
    for (const side of [1, -1]) {
      dir.set(0.45, 0, side).normalize(); qq.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // 尾のほうへ少し寝かせる
      sc.set(1, depth(s) * 0.82, 1);
      ribs.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), m4.compose(new THREE.Vector3(x, centerY(s), off(x)), qq, sc));
    }
  });
  ribs.castShadow = true; g.add(ribs);
  return g;
}
let boneOut = buildBone(XH - 0.04, XT); headRoot.add(boneOut);
let boneIn = null;

// ---------- 状態 ----------
const presses = new Array(N).fill(0);
let phase = 'loosen';          // loosen（ほぐす）→ pull（尾が折れた。頭をつまんで抜く）→ result
let tailBroken = false, tailT = 0, tailSign = 1;
let pull = 0, ratio = 0, sumR = 0, sumT = 0, broke = false, everGrabbed = false, rub = 0;
let resultData = null;
let dirtySkin = true;
const flakes = [];

// 区間の値を x の位置でなめらかにつなぐ
function secValue(f, x) {
  const t = (x - XH) / BONE_L * N - 0.5, k = Math.floor(t), fr = t - k;
  const at = (i) => f(presses[clamp(i, 0, N - 1)]);
  return lerp(at(k), at(k + 1), ss(0, 1, fr));
}
function shapeBody() {
  const xCur = XH + pull, tens = phase === 'pull' ? ratio * ratio : 0;
  shapeTube(body, (x) => {
    const r = secValue(p => Math.min(p / CFG.pressTarget, 1), x), c = secValue(crumble, x);
    return { sq: 0.07 * r + 0.38 * c, wid: 0.04 * r + 0.12 * c, cr: c, lift: tens * 0.45 * Math.exp(-(((x - xCur) / 0.22) ** 2)) };
  }, 0);
}
// 皮の見た目：押しすぎた所は身がえぐれる。のぞく身は写真（flesh.jpg）の模様
// 色・質感・凹凸の3枚に同じ形で描く（えぐれた所は金属の光りをなくし、溝にする）
const fleshPat = skinLayers.col.g.createPattern(fleshImg, 'repeat');
fleshPat.setTransform(new DOMMatrix().scale(0.6 * SKIN_PX, 0.45 * SKIN_PX)); // 写真の身の大きさに合わせる（皮の u・v の縮尺の違いも）
const MARK = {
  col: { rim: 'rgba(150,120,90,0.9)', pit: fleshPat, cut: '#1a120c' },
  pbr: { rim: 'rgb(0,210,0)', pit: 'rgb(0,220,0)', cut: 'rgb(0,230,0)' },
  bmp: { rim: 'rgb(150,150,150)', pit: 'rgb(70,70,70)', cut: 'rgb(30,30,30)' },
};
function drawSkin() {
  const W = SKIN_W, H = SKIN_H, vy = (v) => (1 - v) * H, P = SKIN_PX;
  for (const [key, { base, g }] of Object.entries(skinLayers)) {
    const st = MARK[key];
    g.drawImage(base, 0, 0);
    // ほぐれ具合（2026-10-28 ユーザー指定）：押すほど皮から脂がにじみ、色が深く照りが増す（目標の回数で最大）。ほぐしていない所は乾いたまま
    // 色は掛け算で少し暗く赤みに、質感は粗さ（G）だけを下げる。区間の境目は secValue でなめらかにつなぐ
    // 凹凸（bmp）は平らな灰色を重ねて浅くする（脂が細かい凹凸を埋める。浅くしないと細かくきらきらしてラメのように見えた）
    const oil = key === 'col' ? (r) => `rgba(255,${Math.round(255 - 50 * r)},${Math.round(255 - 95 * r)},1)` : key === 'pbr' ? (r) => `rgb(255,${Math.round(255 * (1 - CFG.oilGloss * r))},255)` : (r) => `rgba(128,128,128,${0.6 * r})`;
    {
      g.globalCompositeOperation = key === 'bmp' ? 'source-over' : 'multiply';
      for (let u = 0; u < W; u += 2) {
        const r = secValue(p => Math.min(p / CFG.pressTarget, 1), X0 + LEN * u / W);
        if (r > 0.01) { g.fillStyle = oil(r * ss(XH - 0.05, XH + 0.05, X0 + LEN * u / W) * ss(XT + 0.05, XT - 0.05, X0 + LEN * u / W)); g.fillRect(u, 0, 2, H); }
      }
      g.globalCompositeOperation = 'source-over';
    }
    for (let k = 0; k < N; k++) {
      const p = presses[k]; if (!p) continue;
      const ua = sOf(XH + BONE_L * k / N) * W, ub = sOf(XH + BONE_L * (k + 1) / N) * W, R = seq(k * 977 + 13);
      const c = crumble(p); // 押した所の割れ目（縦の線）は不自然に見えたのでやめた（2026-10-26 ユーザー指定）
      // えぐれ：ふちのギザギザな、身の繊維の向き（斜め）に長い形。ふち（皮の裂け目）を全部描いてから身を描く（重なった所にふちの線が残らないように）
      const blobs = Array.from({ length: Math.floor(c * 16) }, () => {
        const x = lerp(ua, ub, R()), y = vy(lerp(0.1, 0.42, R())), rr = (5 + R() * 11) * P, rot = 0.6 + (R() - 0.5) * 0.8, cr = Math.cos(rot), sr = Math.sin(rot);
        return Array.from({ length: 11 }, (_, q) => { const a = q / 11 * Math.PI * 2, k = 0.55 + R() * 0.6, qx = Math.cos(a) * rr * 1.5 * k, qy = Math.sin(a) * rr * 0.7 * k; return [x, y, qx * cr - qy * sr, qx * sr + qy * cr]; });
      });
      for (const [style, grow] of [[st.rim, 1.25], [st.pit, 1]]) {
        g.fillStyle = style;
        for (const pts of blobs) { g.beginPath(); for (const [x, y, dx, dy] of pts) g.lineTo(x + dx * grow, y + dy * grow); g.closePath(); g.fill(); }
      }
    }
    if (tailBroken) { g.strokeStyle = st.cut; g.lineWidth = 3 * P; g.beginPath(); g.moveTo(W - 4 * P, 0); g.lineTo(W - 4 * P, H); g.stroke(); }
  }
  skinTex.needsUpdate = pbrTex.needsUpdate = bumpTex.needsUpdate = true;
}
// 押しすぎたときに、身のかけらを散らす
// かけらの形は4通り。頂点を位置で決まる量だけ出し入れしてふぞろいに（同じ位置の頂点は同じだけ動くので面が裂けない）
const flakeGeos = [0, 1, 2, 3].map((k) => {
  const g = new THREE.DodecahedronGeometry(0.02, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i), m = 0.6 + 0.8 * vnoise(v.x * 90 + k * 17, v.y * 90 + v.z * 70);
    p.setXYZ(i, v.x * m, v.y * m, v.z * m);
  }
  g.computeVertexNormals(); return g;
});
function addFlakes(x, n) {
  for (let i = 0; i < n && flakes.length < 150; i++) {
    const f = mesh(flakeGeos[i % 4], fleshMat), s = sOf(x), onPlate = Math.random() < 0.4, side = Math.random() < 0.5 ? 1 : -1;
    const fx = x + (Math.random() - 0.5) * BONE_L / N;
    if (onPlate) f.position.set(fx, 0.008, side * (depth(s) + 0.02 + Math.random() * 0.1));
    else f.position.set(fx, centerY(s) + thick(s) * 0.6, (Math.random() - 0.5) * depth(s) * 1.2);
    f.scale.set(1 + Math.random() * 1.2, 0.3, 0.35 + Math.random() * 0.4); f.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 6, (Math.random() - 0.5) * 0.6); // 身の繊維のように細長いかけら
    fish.add(f); flakes.push(f);
  }
}

// 湯気を1つ出す（fx, fz：魚の座標。strong は押したときのふわっと濃い湯気。at：魚の外から出すときのワールド座標）
let steamClock = 0, riceSteam = null; // riceSteam：ほぐしすぎの結果のごはんの頂（ワールド）。ここからも湯気を出す
function emitSteam(fx, fz, strong, at) {
  const p = puffs.find(p => p.age >= p.life); if (!p) return;
  const s = sOf(clamp(fx, XH, XT));
  p.s.position.copy(at || fishPoint(fx, centerY(s) + thick(s), fz));
  p.age = 0; p.life = strong ? 1.4 + Math.random() * 0.6 : 2.6 + Math.random() * 1.6;
  p.peak = strong ? 0.12 + Math.random() * 0.06 : 0.03 + Math.random() * 0.03;
  p.size = strong ? 0.22 : 0.35 + Math.random() * 0.3;
  p.v.set((Math.random() - 0.5) * 0.06, strong ? 0.35 : 0.18 + Math.random() * 0.12, (Math.random() - 0.5) * 0.06);
  return p;
}
function updateSteam(dt) {
  steamClock += dt;
  // 焼きたてほど多く、だんだん落ち着く
  if (riceSteam && Math.random() < CFG.riceSteam * dt) { const a = Math.random() * 6.28, r = Math.random() * 0.3; const p = emitSteam(0, 0, false, riceSteam.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))); if (p) { p.peak = 0.08 + Math.random() * 0.05; p.size = 0.3 + Math.random() * 0.2; } } // 炊きたてなので魚より濃いめ
  if (fish.visible && phase !== 'result') for (let k = 0; k < N; k++) if (presses[k] >= CFG.pressTarget && Math.random() < CFG.looseSteam * dt) emitSteam(secX(k) + (Math.random() - 0.5) * BONE_L / N, (Math.random() - 0.5) * 0.1, false); // ほぐしきった所からは湯気が立ち続ける
  if (fish.visible && Math.random() < CFG.steamRate * dt * (0.35 + 0.65 * Math.exp(-steamClock / 25))) emitSteam(lerp(XH, XT, Math.random()), (Math.random() - 0.5) * 0.1, false);
  for (const p of puffs) {
    if (p.age >= p.life) { p.s.material.opacity = 0; continue; }
    p.age += dt; const t = p.age / p.life;
    p.s.position.addScaledVector(p.v, dt); p.s.position.x += Math.sin(p.age * 2 + p.peak * 90) * dt * 0.04;
    p.s.material.opacity = p.peak * Math.sin(Math.PI * Math.min(t, 1)) ** 0.8;
    const sc = p.size * (0.5 + t * 1.3); p.s.scale.set(sc, sc * 1.3, 1);
  }
}

// ---------- 効果音：すべて Web Audio で作る（音のファイルは読まないので、リクエストが増えない。だし巻きと同じ） ----------
// 最初のタップで AudioContext を作り、ノイズを1回だけ作って使い回す。iOS は最初のタップで resume が要る
let audio = null, noiseBuf = null, master = null, loopGain = null, loopFilter = null, kotoBufs = null;
function unlockAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain(); master.gain.value = CFG.seVolume; master.connect(audio.destination);
    noiseBuf = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 鳴らし続ける音（焼きたてのチリチリ・骨が身をこする音）：ノイズを流し続け、音量とフィルターだけ毎フレーム変える
    const src = audio.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    loopFilter = audio.createBiquadFilter(); loopFilter.type = 'bandpass'; loopFilter.Q.value = 0.9; loopFilter.frequency.value = 4000;
    loopGain = audio.createGain(); loopGain.gain.value = 0;
    src.connect(loopFilter).connect(loopGain).connect(master); src.start();
  }
  if (audio.state === 'suspended') audio.resume();
}
document.addEventListener('pointerdown', unlockAudio);
function noiseHit({ vol = 0.5, type = 'highpass', freq = 2500, q = 0.7, att = 0.005, rel = 0.2, at = 0 }) {
  if (!audio) return;
  const src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain(), t = audio.currentTime + at;
  src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + rel);
  src.connect(f).connect(g).connect(master); src.start(t, Math.random() * 2); src.stop(t + att + rel + 0.05);
}
function tone({ vol = 0.3, freq = 400, to = freq, rel = 0.08, at = 0, type = 'sine' }) {
  if (!audio) return;
  const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + rel);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + rel);
  o.connect(g).connect(master); o.start(t); o.stop(t + rel + 0.02);
}
// 箸で押す：皮がパリッと割れる。押しすぎた所は、身がつぶれる鈍い音
function pressSE(over) {
  if (over) { noiseHit({ vol: 0.3, type: 'lowpass', freq: 600, att: 0.01, rel: 0.12 }); tone({ vol: 0.15, freq: 160, to: 90, rel: 0.1 }); return; }
  for (const at of [0, 0.018 + Math.random() * 0.02]) noiseHit({ vol: 0.2, type: 'bandpass', freq: 3200 + Math.random() * 2000, q: 2.5, att: 0.001, rel: 0.03, at });
  noiseHit({ vol: 0.12, type: 'lowpass', freq: 900, att: 0.005, rel: 0.06 });
}
// ちょうどほぐれた「ジュッ」：脂がはねる高い雑音が、なだらかに立ち上がって消える
function juSE() { noiseHit({ vol: 0.22, type: 'highpass', freq: 3500, att: 0.03, rel: 0.45 }); noiseHit({ vol: 0.1, type: 'bandpass', freq: 1200, q: 1, att: 0.02, rel: 0.2 }); }
// 尾・骨が折れる「ポキッ」（big で低く大きく）
function snapSE(big) {
  noiseHit({ vol: big ? 0.6 : 0.4, type: 'bandpass', freq: big ? 1800 : 2800, q: 3, att: 0.001, rel: big ? 0.07 : 0.04 });
  tone({ vol: big ? 0.3 : 0.2, freq: big ? 900 : 1500, to: big ? 300 : 700, rel: big ? 0.08 : 0.05 });
}
// 頭をつまむ（軽いコッ）
function pickSE() { tone({ vol: 0.22, freq: 1150, to: 900, rel: 0.05 }); noiseHit({ vol: 0.12, type: 'bandpass', freq: 3000, q: 1.5, att: 0.001, rel: 0.03 }); }
// 骨がきれいに抜けた「スルッ」
function slipSE() { noiseHit({ vol: 0.3, type: 'bandpass', freq: 1500, q: 1.2, att: 0.08, rel: 0.25 }); tone({ vol: 0.12, freq: 500, to: 900, rel: 0.25 }); }
// 鳴らし続ける音：焼きたての間はチリチリ（高め）、骨を引いている間は身をこする音（速いほど大きく、負荷が高いほど低くきしむ）
function updateLoopSE(sizzle, rub, tension) {
  if (!audio) return;
  const t = audio.currentTime;
  loopGain.gain.setTargetAtTime(Math.max(sizzle * 0.12, rub * 0.35), t, 0.05);
  loopFilter.frequency.setTargetAtTime(rub > sizzle ? 900 - 500 * Math.min(tension, 1) : 5000, t, 0.05);
  if (sizzle > 0.05 && Math.random() < sizzle * 0.1) noiseHit({ vol: 0.06 * sizzle, type: 'bandpass', freq: 3000 + Math.random() * 3000, q: 3, att: 0.001, rel: 0.02 });
}
// 結果：琴の「じゃららーん」（だし巻きと同じ。平調子の音を下から順に。弦の音は Karplus-Strong）
const KOTO = [293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 783.99, 880.0];
function pluck(freq) {
  const sr = audio.sampleRate, len = Math.floor(sr * 3), buf = audio.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const N = Math.round(sr / freq), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(Math.PI * i / N));
  let p = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[p], next = ring[(p + 1) % N];
    ring[p] = (cur + next) * 0.5 * 0.9965;
    d[i] = cur * 0.8 + prev * 0.2; prev = cur; p = (p + 1) % N;
  }
  return buf;
}
function kotoSE() {
  if (!audio) return;
  kotoBufs = kotoBufs || KOTO.map(pluck);
  const t = audio.currentTime + 0.05;
  kotoBufs.forEach((b, i) => {
    const src = audio.createBufferSource(), g = audio.createGain(), pan = audio.createStereoPanner ? audio.createStereoPanner() : null;
    src.buffer = b; g.gain.value = 0.42 - i * 0.02;
    if (pan) { pan.pan.value = -0.5 + i / (KOTO.length - 1); src.connect(g).connect(pan).connect(master); } else src.connect(g).connect(master);
    src.start(t + i * 0.055);
  });
}

// ---------- 箸（長い箸が画面の右手前から斜めに入り、箸先が指の所） ----------
const stickMat = new THREE.MeshPhysicalMaterial({ color: 0x3a1f14, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.3 });
const STICK_DIR = [new THREE.Vector3(1, 0.78, 0.62).normalize(), new THREE.Vector3(1, 0.74, 0.7).normalize()];
const sticks = STICK_DIR.map(d => {
  const m = mesh(new THREE.CylinderGeometry(0.011, 0.03, 4.2, 10).translate(0, 2.1, 0), stickMat);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); scene.add(m); return m;
});
const STICK_REST = q.get('cam') && q.get('cam') !== 'ogp' ? new THREE.Vector3(3, 2, 3) : new THREE.Vector3(1.0, 0.45, 0.75); // 確認用の近い視点では箸を外へ
const stickTip = STICK_REST.clone(), stickGoal = STICK_REST.clone();
let stickOpen = 1, stickOpenGoal = 1, pressT = 0;
function placeSticks(dt) {
  const k = 1 - Math.exp(-dt * 18);
  stickTip.lerp(stickGoal, k); stickOpen = lerp(stickOpen, stickOpenGoal, k);
  const dip = pressT > 0 ? Math.sin(pressT / 0.16 * Math.PI) * 0.05 : 0;
  sticks[0].position.copy(stickTip).y -= dip;
  sticks[1].position.copy(stickTip).add(new THREE.Vector3(0.012 + 0.04 * stickOpen, 0, 0.02 + 0.05 * stickOpen)).y -= dip;
}

// ---------- カメラ（だし巻きと同じ、手前上から斜めに見下ろす固定視点。縦長では角度を深くして引く） ----------
const VIEWS = {
  work: { look: new THREE.Vector3(0.28, 0, 0.1), halfW: 1.6 },    // ほぐす・尾を折る：魚を大きく
  pull: { look: new THREE.Vector3(-1.0, 0, 0.1), halfW: 2.85 },     // 抜く：頭が左へ抜けていく余白を空ける
  result: { look: new THREE.Vector3(-0.1, 1.85, 0.2), halfW: 1.6, halfH: 2.35, tilt: 0, upright: true },  // 結果：箸でぶら下げた頭・骨と皿の身。下の結果カードに隠れないよう上へ。縦長でも見下ろす角度を深くしない（高さが分かるように）
  jar: { look: new THREE.Vector3(0.05, 0.2, 0.15), halfW: 0.8, halfH: 1.3, tilt: 0, upright: true }, // 結果（ほぐしすぎ）：皿の上の瓶。ほかの結果（ぶら下げた骨）と同じく、画面の真ん中あたりに
  rice: { look: new THREE.Vector3(0.03, 0.2, 0.15), halfW: 1.2, halfH: 1.3, tilt: 0, upright: true }, // 結果（押しすぎて抜けた）：瓶とごはん茶碗
  close: { look: new THREE.Vector3(-0.75, 0, 0.1), halfW: 0.45 },  // 確認用（?cam=close）：頭と胴の前半を近くから
  mouth: { look: new THREE.Vector3(-1.1, 0, 0.12), halfW: 0.18 },  // 確認用（?cam=mouth）：口と目
  tail: { look: new THREE.Vector3(1.3, 0, 0.05), halfW: 0.6 },     // 確認用（?cam=tail）：尾の付け根と尾びれ
  garnish: { look: new THREE.Vector3(1.15, 0.05, 0.5), halfW: 0.45 }, // 確認用（?cam=garnish）：大根おろしとスダチ
  ogp: { look: new THREE.Vector3(0.22, 0, -0.2), halfW: 1.42 },      // OGP 画像の書き出し用（?cam=ogp。tools/ogp.html）：サンマを大きく、上の題名の分だけ下に寄せる
};
let view = ['close', 'mouth', 'tail', 'garnish', 'ogp'].includes(q.get('cam')) ? q.get('cam') : 'work';
const cam = { look: VIEWS[view].look.clone(), halfW: VIEWS[view].halfW, tilt: 1 };
const CAM_DIR = new THREE.Vector3(-0.13, 2.75, 3.4).normalize(), FOV = 50;
// 縦持ち（縦長の画面）でほぐす・抜くときは、横持ちの絵を90°回して映す（頭が上・尾が下。サンマを画面の縦いっぱいに。2026-10-28 ユーザー指定）。
// 抜く向きは画面の上になる（指の位置は床の面で測るので、操作の計算はそのまま）。結果の視点（upright）は回さない
let rolled = false;
function fitCamera(W = window.innerWidth, H = window.innerHeight, band = bandH, crop = null) { // W・H・band・crop を渡すのは共有画像（shareShot）のとき
  const a = W / H; // 広告の帯があっても、帯のないときと同じ絵にして上を帯の分だけ切る（下の setViewOffset。結果カードとの位置がずれない）
  rolled = a < 1 && !VIEWS[view].upright; document.documentElement.dataset.orient = a < 1 ? 'portrait' : 'landscape'; // 文言の「左へ／上へ」の切り替え
  const ae = rolled ? 1 / a : a, t = clamp((1.2 - ae) / 0.7, 0, 1); // ae：回したあとの絵の横÷縦
  const fovL = FOV * (1 + 0.2 * t), tanH = Math.tan(THREE.MathUtils.degToRad(fovL) / 2); // 絵の縦の画角（回したときは画面の横）
  camera.aspect = a; camera.fov = rolled ? THREE.MathUtils.radToDeg(2 * Math.atan(tanH * ae)) : fovL;
  const elev = Math.asin(CAM_DIR.y) + THREE.MathUtils.degToRad(CFG.portraitTilt) * t * cam.tilt, hz = new THREE.Vector2(CAM_DIR.x, CAM_DIR.z).normalize();
  const d = Math.max(cam.halfW / (tanH * Math.min(ae, rolled ? CFG.rollFill : 1.4)), (VIEWS[view].halfH || 0) / tanH); // halfH：横長の画面でも高さが収まるように（結果のぶら下げた魚）
  camera.position.copy(cam.look).add(new THREE.Vector3(hz.x * Math.cos(elev), Math.sin(elev), hz.y * Math.cos(elev)).multiplyScalar(d));
  camera.up.set(rolled ? -1 : 0, rolled ? 0 : 1, 0); // 回したときは魚の頭の向き（−x）を画面の上に
  camera.lookAt(cam.look);
  if (band) camera.setViewOffset(W, H, 0, band, W, H - band);
  else if (crop) camera.setViewOffset(W, H, W * (crop[2] ?? (1 - crop[0]) / 2), H * crop[1], W * crop[0], H * crop[0]); // 共有画像：同じ絵を切り出して寄せる（CFG.shareCrop）
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  scene.fog.near = d + 3; scene.fog.far = d + 16;
  if (bokeh) bokeh.uniforms.focus.value = d;
}

// ---------- ポストエフェクト（だし巻きと同じ並び：隙間の影 → ぼかし → 湯気 → 光のにじみ → 色調整 → SMAA） ----------
let composer = null, gtao = null, bokeh = null, grade = null;
if (FX) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 0.25, distanceExponent: 1.5, thickness: 1.0, scale: 1.4, samples: 16 });
  // 後光（加算合成の板）は隙間の影とピントの奥行きに入れない（入れると不透明の板として黒く写る。だし巻きの炎と同じ）
  const haloVis = (on) => Object.assign(new Pass(), { needsSwap: false, render() { if (halo) halo.visible = on; glints.forEach(s => { s.visible = on; }); noDepth.forEach(o => { o.visible = on; }); } });
  composer.addPass(haloVis(false));
  composer.addPass(gtao);
  bokeh = new BokehPass(scene, camera, { focus: 4, aperture: CFG.aperture, maxblur: 0.01 });
  composer.addPass(bokeh);
  composer.addPass(haloVis(true));
  const steamPass = new RenderPass(steamScene, camera); steamPass.clear = false; steamPass.clearDepth = true;
  composer.addPass(steamPass);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.45, 0.9));
  composer.addPass(new OutputPass());
  // 暖色寄りのグレーディング＋S字コントラスト＋周辺減光＋ごく薄いフィルム粒子
  grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.299,0.587,0.114));
        c = mix(c * vec3(0.94,0.97,1.04), c * vec3(1.06,1.0,0.9), smoothstep(0.15, 0.7, l));
        c = clamp(c, 0.0, 1.0);
        c = mix(c, c*c*(3.0-2.0*c), 0.85);
        c = max(c - 0.025, 0.0) * 1.06;
        c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, 1.12);
        // 縦長の画面では上下を少し強めに落とす（奥が暗くなりすぎたので 2026-10-28 に弱めた）
        float a = uRes.x / uRes.y;
        vec2 d = vUv - vec2(0.5, 0.48); d.x *= min(a, 1.4); d.y *= 1.0 + 0.4 * clamp((1.2 - a) / 0.7, 0.0, 1.0);
        c *= mix(1.0, ${CFG.vignette.toFixed(2)}, smoothstep(0.3, 0.95, length(d)));
        c += (hash(vUv * uRes) - 0.5) * 0.018;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new SMAAPass(1, 1));
  $('vignette').style.display = 'none'; // 周辺減光は色調整でかける
}
function draw() {
  if (composer) return composer.render();
  renderer.autoClear = true; renderer.render(scene, camera);
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(steamScene, camera);
}
function resize(w = window.innerWidth, h = viewH(), shot = false) { // shot：共有画像を描くあいだだけ、画面の見た目（CSS の大きさ）を変えずに描く大きさを変える
  const pr = shot ? 1 : Math.min(1, Math.sqrt((LITE ? 250000 : CFG.maxPixels) / (w * h)));
  renderer.setPixelRatio(pr); renderer.setSize(w, h, !shot); if (shot) fitCamera(w, h, 0, CFG.shareCrop[raw ? 'raw' : view]); else fitCamera();
  if (!composer) return;
  composer.setPixelRatio(pr); composer.setSize(w, h);
  // 隙間の影とピント用の奥行きは半分の解像度（だし巻きと同じ。重さの大半がここ）
  gtao.setSize(Math.round(w * pr * 0.5), Math.round(h * pr * 0.5));
  bokeh.renderTargetDepth.setSize(Math.round(w * pr * 0.5), Math.round(h * pr * 0.5));
  grade.uniforms.uRes.value.set(w, h);
}
window.addEventListener('resize', () => resize());

// ---------- 入力（1本指のドラッグ。スマホも PC の左ドラッグも同じ判定） ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
function aim(x, y) { ndc.set(x / window.innerWidth * 2 - 1, -((y - bandH) / viewH()) * 2 + 1); ray.setFromCamera(ndc, camera); }
function planeAt(x, y, h) { aim(x, y); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), new THREE.Vector3()); }
function toScreen(v) { const s = v.clone().project(camera); return [(s.x + 1) / 2 * window.innerWidth, (1 - s.y) / 2 * viewH() + bandH]; }
const fishPoint = (x, y, z) => fish.localToWorld(new THREE.Vector3(x, y, z));
const tailBaseW = () => fishPoint(XT - 0.02, centerY(1) + thick(1), 0);
const headW = () => headMesh.localToWorld(new THREE.Vector3(-1.22, centerY(0.07) + thick(0.07), 0));
const near = (e, w) => { const [x, y] = toScreen(w); return Math.hypot(e.clientX - x, e.clientY - y) < CFG.grabPx; };
// 箸先を置く所：魚の上ならその表面、外れたら皿の高さ
function surfaceAt(x, y) {
  aim(x, y); const hit = ray.intersectObjects([bodyMesh, headMesh], true)[0];
  return hit ? hit.point.clone().add(new THREE.Vector3(0, 0.015, 0)) : planeAt(x, y, 0.02);
}

let drag = null, pointer = null;
// 計測（GTM が拾って GA4 へ。だし巻きと同じ）：game_start は最初に身を押すか尾を折ったときに1回だけ
const track = () => {};
let gaStarted = false;
const gaStart = () => { if (!gaStarted) { gaStarted = true; track('game_start'); } };
canvas.addEventListener('pointerdown', e => {
  if (drag || phase === 'result' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  canvas.setPointerCapture(e.pointerId);
  pointer = { x: e.clientX, y: e.clientY };
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, kind: 'hover' };
  if (!tailBroken && near(e, tailBaseW())) { drag.kind = 'tail'; stickOpenGoal = 0; return; }
  if (tailBroken && near(e, headW())) {
    const p = planeAt(e.clientX, e.clientY, 0.08);
    Object.assign(drag, { kind: 'pull', gx: p.x, gz: p.z, pull0: pull, meter: createPullMeter() });
    everGrabbed = true; stickOpenGoal = 0; pickSE(); return;
  }
  aim(e.clientX, e.clientY);
  const hit = ray.intersectObject(bodyMesh)[0];
  if (hit) return press(fish.worldToLocal(hit.point.clone()).x);
  // 尾のほうは細くて当てにくいので、身の輪郭の少し外まで押したことにする
  const p = fish.worldToLocal(planeAt(e.clientX, e.clientY, 0.04));
  if (p.x > XH && p.x < XT && Math.abs(p.z) < Math.abs(edgeZ(sOf(p.x), Math.sign(p.z))) + 0.06) press(p.x);
});
canvas.addEventListener('pointermove', e => {
  if (drag && e.pointerId !== drag.id) return;
  if (e.pointerType === 'mouse' || drag) pointer = { x: e.clientX, y: e.clientY };
  if (drag && drag.kind === 'tail' && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) >= CFG.tailDragPx) {
    gaStart(); tailBroken = true; tailSign = e.clientY < drag.y0 ? 1 : -1; dirtySkin = true; drag.kind = 'hover'; snapSE(false);
    phase = 'pull'; // 「抜く」視点へは、折れたのを見せてから移る（CFG.tailHold）
    for (let i = 0; i < 4; i++) emitSteam(XT - 0.04, (Math.random() - 0.5) * 0.08, true); // 折れた所から湯気がふわっと
  }
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  drag = null; stickOpenGoal = 1;
  if (e.pointerType !== 'mouse') pointer = null;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function press(x) {
  const k = sectionAt((x - XH) / BONE_L);
  gaStart(); presses[k]++; pressT = 0.001; dirtySkin = true;
  pressSE(presses[k] > CFG.pressLimit);
  if (presses[k] > CFG.pressLimit) addFlakes(secX(k), 3);
  if (presses[k] <= CFG.pressLimit) emitSteam(x, 0, true); // ほぐした所から湯気がふわっと
  if (presses[k] === CFG.pressTarget) { for (let i = 0; i < 4; i++) emitSteam(secX(k) + (Math.random() - 0.5) * BONE_L / N, (Math.random() - 0.5) * 0.12, true); juSE(); } // ちょうどほぐれた合図：湯気が大きく立ち「ジュッ」
}

// ---------- 抜く ----------
function updatePull(dt) {
  if (phase !== 'pull') return;
  let dev = 0;
  if (drag && drag.kind === 'pull' && pointer) {
    const p = planeAt(pointer.x, pointer.y, 0.08);
    const goal = clamp(Math.max(pull, drag.pull0 + (drag.gx - p.x) * CFG.pullGain), 0, BONE_L);
    dev = p.z - drag.gz;
    const load = drag.meter.update(dt, goal - pull, dev), pk = presses[sectionAt(pull / BONE_L)];
    ratio = load / tolerance(pk);
    sumR += ratio * dt; sumT += dt;
    rub = (goal - pull) / dt;
    pull = goal;
    if (ratio > 1) return finish(true, breakCause(pk, load, drag.meter.parts));
    if (pull >= BONE_L) return finish(false);
  } else { ratio = Math.max(0, ratio - dt * 3); rub = 0; }
  // 負荷はゲージを出さず、頭の横ずれ・骨の浮き・身のたわみ・震えで伝える
  const shake = ratio > 0.75 ? (Math.random() - 0.5) * 0.012 * ratio : 0;
  headRoot.position.set(-pull, ratio * ratio * 0.03, 0);
  headMesh.position.set(0, 0.012 * (pull > 0), clamp(dev * 0.5, -0.25, 0.25) + shake);
  headMesh.rotation.z = -ratio * 0.08;
  shapeBody();
}

// ---------- 結果（暗転して、箸で持ち上げた頭と抜けた骨を見せる。ほとんど抜けずに折れたら、生きたサンマを持ち上げる） ----------
let resultT = -1, halo = null, kotoDone = false, holdW = null, raw = null, glints = [], noDepth = [], hung = null; // hung：ぶら下げた物を傾ける（共有画像のとき）
const HOLD = new THREE.Vector3(-0.3, 2.75, -0.35); // 箸でつまんだ所（魚の座標）。頭を上に、骨（生きたサンマは体）を皿の上の奥に真下へぶら下げる
const GRIP_X = XH - 0.1, GRIP = new THREE.Vector3(GRIP_X, centerY(sOf(GRIP_X)) + thick(sOf(GRIP_X)), 0); // 頭のエラの手前の上の面をつまむ
const boneShine = new THREE.MeshPhysicalMaterial({ color: 0xf4ecd8, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.6 }); // 料亭：きれいな骨に少し照り
const stuckMat = fleshMat.clone(); stuckMat.color.setScalar(1); // 骨に付いた身（皿の上の身より明るく。暗いと焦げて見えた）
// 骨に身のかけらを付ける（n 個、size 倍）。ぶら下げたときカメラ側（+y）に多めに
function stickFlesh(bone, xa, xb, n, size) {
  for (let i = 0; i < n; i++) {
    const x = lerp(xa + 0.05, xb, Math.random()), s = sOf(x), f = mesh(flakeGeos[i % 4], stuckMat);
    f.position.set(x, centerY(s) + (Math.random() - 0.3) * 0.03 * size, (Math.random() - 0.5) * depth(s) * 0.9);
    f.scale.set((1 + Math.random()) * size, (0.5 + Math.random() * 0.5) * size, (0.6 + Math.random() * 0.6) * size); f.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    bone.add(f);
  }
}
// 折れ口のささくれ：x の所から dir（+1 尾へ／−1 頭へ）向きに、細い骨の繊維を不ぞろいに突き出す
function splinters(bone, x, dir, off = () => 0) {
  const geo = new THREE.CylinderGeometry(0.001, 0.009, 1, 4).translate(0, 0.5, 0), base = new THREE.Vector3(x, centerY(sOf(x)), off(x));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, m = mesh(geo, boneMat), d = new THREE.Vector3(dir, Math.sin(a) * 0.9, Math.cos(a) * 0.9).normalize();
    m.position.copy(base); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); m.scale.set(1, 0.06 + 0.12 * ((i * 5) % 7) / 6, 1);
    bone.add(m);
  }
}
function finish(didBreak, cause) {
  phase = 'result'; broke = didBreak; drag = null; stickOpenGoal = 1; rub = 0;
  resultData = evaluate({ presses, extracted: pull / BONE_L, broke, cause, meanRatio: sumT ? sumR / sumT : 0 });
  track('game_end', { result: resultData.kind });
  resultData.names = nameFor(resultData);
  if (broke) { // 折れたときだけは、その場で骨を折れた所で分け、頭を引いていた向きへ跳ねさせる（折れたと分かるように。2026-10-29 運営者）
    remakeBone(); headRoot.position.x -= 0.12; headRoot.position.y += 0.04;
    for (let i = 0; i < 3; i++) emitSteam(XH + pull, (Math.random() - 0.5) * 0.08, true);
    snapSE(true);
  } else slipSE();
  ratio = 0; shapeBody();
  resultT = 0; $('fade').classList.add('on'); // 暗転（0.5秒）。暗いうちに結果の場面に替える
  try { localStorage.setItem('sanma_guided', '1'); } catch {}
}
// 抜けた骨（頭と一緒）を結果ごとの形で作り直す。折れたら抜けた所まで、残りは身の中に。
// 抜けたときは暗いうち（stageResult）に作り直す（抜いている途中で骨の絵が変わると変。2026-10-29 運営者）。折れたときは finish() で
function remakeBone() {
  const k = resultData.kind, xb = broke ? XH + pull : XT;
  const off = k === 'shaky' ? (x) => 0.045 * (2 / Math.PI) * Math.asin(Math.sin((x - XH) * 18)) * ss(XH, XH + 0.15, x) // ガタガタ：ジグザグ
    : k === 'dev' ? (x) => 0.2 * clamp((x - xb + 0.45) / 0.45, 0, 1) ** 2 : undefined;                                   // ぶれ：折れ口へ向かって横に曲がる
  headRoot.remove(boneOut); boneOut = buildBone(XH - 0.04, xb, off, k === 'ryotei' ? boneShine : boneMat); headRoot.add(boneOut);
  if (k === 'almost') stickFlesh(boneOut, XH, xb, 10, 2.6);   // 惜しい：身のかけらが少し残る
  if (k === 'loose') stickFlesh(boneOut, XH, xb, 60, 4); // ほぐし不足：身がごっそり付いたまま
  if (broke) {
    boneIn = buildBone(xb, XT); boneIn.position.set(-pull - 0.07, 0.035, 0); fish.add(boneIn); // 折れ口を身から少し出し、骨が浮いて見えるように
    if (k === 'pace') { splinters(boneOut, xb, 1, off); splinters(boneIn, xb, -1); } // ペース：折れ口がギザギザに裂ける
  }
  if (k === 'legend') makeGold();
}
// 幻の一本抜き：抜けた骨を金色にし、奥から後光を差す（だし巻きの全部Aと同じ演出）
function makeGold() {
  // 金ぴか：映り込みを強くし、自分でも光らせて光のにじみ（しきい値 0.9）に掛ける
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffcf4a, metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 4, emissive: 0xffa21a, emissiveIntensity: 1.6 });
  boneOut.traverse(o => { if (o.isMesh) o.material = gold; });
  // 後光：画面いっぱいに散る光の筋。テーブルや皿の上にも差す（奥行きで隠さない）。真ん中は抜いて骨を白く飛ばさない
  const R = 512, rc = document.createElement('canvas'); rc.width = rc.height = R * 2; const rg = rc.getContext('2d');
  for (let i = 0; i < 40; i++) {
    const a0 = (i / 40 + 0.013 * ((i * 5) % 7)) * Math.PI * 2, a1 = a0 + Math.PI / 40 * (0.15 + 0.35 * ((i * 3) % 5) / 4);
    const grd = rg.createRadialGradient(R, R, 0, R, R, R);
    grd.addColorStop(0, 'rgba(255,230,170,0)'); grd.addColorStop(0.12, 'rgba(255,230,170,0)'); grd.addColorStop(0.22, `rgba(255,228,165,${0.35 + 0.3 * ((i * 7) % 3) / 2})`); grd.addColorStop(1, 'rgba(255,200,100,0)');
    rg.fillStyle = grd; rg.beginPath(); rg.moveTo(R, R); rg.arc(R, R, R, a0, a1); rg.closePath(); rg.fill();
  }
  halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(rc), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
  halo.scale.setScalar(16); scene.add(halo);
  // 骨の上で順にキラッと光る星（十字の光）。骨といっしょにぶら下がる
  const s = document.createElement('canvas'); s.width = s.height = 128; const x = s.getContext('2d');
  const core = x.createRadialGradient(64, 64, 0, 64, 64, 22); core.addColorStop(0, 'rgba(255,255,240,1)'); core.addColorStop(1, 'rgba(255,220,140,0)');
  x.fillStyle = core; x.fillRect(0, 0, 128, 128);
  for (const [w, h] of [[64, 3], [3, 64]]) { const l = x.createRadialGradient(64, 64, 0, 64, 64, 64); l.addColorStop(0, 'rgba(255,250,225,1)'); l.addColorStop(1, 'rgba(255,210,120,0)'); x.fillStyle = l; x.fillRect(64 - w, 64 - h, w * 2, h * 2); }
  const starMat = new THREE.SpriteMaterial({ map: canvasTexture(s), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const xb = lerp(XH, XT, (i + 0.5) / 12), st = new THREE.Sprite(starMat.clone()); // 1つずつ薄れていくので、材質も1つずつ
    st.position.set(xb, centerY(sOf(xb)), (i % 2 ? 1 : -1) * (0.32 + 0.16 * ((i * 0.618) % 1))); st.userData.ph = (i * 0.381) % 1; st.scale.setScalar(0); // 骨に重ねず、左右へ交互に散らす（2026-10-29 ユーザー指定）
    boneOut.add(st); glints.push(st);
  }
}
function showResult() {
  const r = resultData, n = r.names[lang()];
  r.name = n.parts.join('');
  // 名前は 原因｜結果 の区切りでだけ改行する（だし巻きと同じ）
  $('resName').replaceChildren(...n.parts.flatMap((p, i) => i ? [document.createElement('wbr'), p] : [p]));
  $('resAdvice').textContent = n.advice;
  $('result').classList.add('show');
  if (!kotoDone) { kotoDone = true; kotoSE(); }
  showBanner();
}
// 結果画面の上の広告の帯（設定は head の ADS。だし巻きと同じ仕組み）：結果カードが出たときに1ページ1回だけ作り、一度出したら消さない（「もう一度」は reload）。
// 帯の下端から結果カードまで 150px 取れる大きさ（PC 728×90、スマホ 320×50）を選び、取れない（横向きのスマホなど）なら作らない。
// adsbygoogle.js はここで初めて読む。読めなかったら帯を外して 3D の画面を元に戻し、そのページではもう作らない（ADS.failed）。読めたあとに広告が入らなかった（unfilled）ときは帯を残す
function showBanner() {
  if (!ADS.banner || bandH || ADS.failed || !ADS.bannerSlot) return;
  addBand(ADS.bannerSlot, band => $('result').offsetTop - band.offsetHeight >= 150); // offsetTop は動き途中の transform を含まない
}
// 帯を作る（結果画面・開始画面で共通。slot は広告ユニット）。fits(band) が false の大きさは使わない。作れたら true
function addBand(slot, fits) {
  for (const [w, h] of [[728, 90], [320, 50]]) {
    if (w > innerWidth - 16) continue;
    const band = document.createElement('div'); band.id = 'adTop';
    band.innerHTML = `<div style="width:${w}px"><div class="adLabel"><span lang="ja">広告</span><span lang="en">Advertisement</span></div><div style="height:${h}px"></div></div>`;
    document.body.prepend(band); // 3D の画面（canvas）より前＝上に並ぶ。描く前に測って、合わなければ外す
    if (!fits(band)) { band.remove(); continue; }
    bandH = band.offsetHeight; resize();
    $('top').style.top = bandH + 8 + 'px'; // 言語・？のボタンを帯の下へ（広告の枠に重ねて、押し間違えないように）
    if (ADS.dry) return true; // 手元：空の枠だけ出し、広告のスクリプトは読まない
    // 開始画面で読めなかったら、カードの位置は動かさず（押し間違えないように）、「はじめる」も読み直さない
    ADS.load().addEventListener('error', () => { ADS.failed = true; startBanded = false; band.remove(); bandH = 0; resize(); $('top').style.top = ''; $('top').style.visibility = ''; });
    // レスポンシブのユニットだが、data-ad-format は付けず full-width-responsive を切って、枠より広がらないようにする
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle'; ins.style.cssText = `width:${w}px;height:${h}px`;
    Object.assign(ins.dataset, { adClient: 'ca-pub-5732693242027140', adSlot: slot, fullWidthResponsive: 'false' }, ADS.test ? { adtest: 'on' } : {});
    band.firstChild.lastChild.replaceWith(ins); (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  }
  return false;
}
// 「もう一度」：H5 を使うときは区切りの広告（出すか・間隔は Google 任せ）を挟んでから読み込み直す（だし巻きと同じ）。
// adBreakDone は広告が出ても出なくても呼ばれる。来なかったときの保険に、広告が出ていなければ数秒で読み込み直す
const replay = () => { if (ADS.startBand) markAutostart(); location.reload(); }; // 開始画面を飛ばす印は読み直す直前に置く（古くなると無視される）
$('again').onclick = () => {
  track('game_retry');
  if (ADS.h5 === 'off') { replay(); return; }
  $('again').disabled = true;
  let t = setTimeout(replay, 3000);
  adBreak({
    type: 'next', name: 'retry',
    beforeAd: () => { clearTimeout(t); audio?.suspend(); },
    afterAd: () => { t = setTimeout(replay, 2000); },
    adBreakDone: (info) => { clearTimeout(t); track('ad_break', { ad_status: info.breakStatus }); replay(); },
  });
};
// ---------- Xでシェア：結果の絵（1200×630）を R2 に送り、その回の共有ページ /s/<id> の URL で投稿画面を開く（サルも木から落ちぬん・だし巻きと同じ） ----------
// 共有画像：今の結果の場面を、画面の見た目を変えずに 1200×630 で描き直して写し、名前と題名を重ねる。描いたらすぐ元の大きさに戻す（同じ処理の中なので画面には出ない）
const SHARE_W = 1200, SHARE_H = 630;
function shareShot() {
  // ぶら下げた物を斜めにして皿に着け、箸もいっしょに下ろす。水しぶきは元の位置に残るので隠す
  const tip = stickTip.clone(), wet = drops.filter(d => d.visible);
  const tilt = (a) => { if (!hung) return; stickTip.copy(tip).add(hung(a)); placeSticks(0); wet.forEach(d => { d.visible = !a; }); if (halo) placeHalo(); };
  tilt(raw ? CFG.shareTiltRaw : CFG.shareTilt); resize(SHARE_W, SHARE_H, true); draw();
  const c = document.createElement('canvas'); c.width = SHARE_W; c.height = SHARE_H;
  const g = c.getContext('2d'); g.drawImage(canvas, 0, 0, SHARE_W, SHARE_H);
  tilt(0); resize(); draw();
  return c;
}
// 筆文字（OGP 画像と同じ Yuji Syuku）は、共有するときに初めて読む（遊ぶだけの人には読ませない）。読めなければふつうの字で描く
let brushFont = null;
function loadBrush() { return Promise.resolve(); }
async function buildShare() {
  const L = lang(), parts = resultData.names[L].parts, c = shareShot(), g = c.getContext('2d');
  if (L === 'ja') await loadBrush(parts.join(''));
  const font = (px) => L === 'ja' ? `400 ${px}px "Hiragino Mincho ProN", "Yu Mincho", serif` : `700 ${px}px system-ui, sans-serif`;
  g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = 16; g.fillStyle = '#f6eadb'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  // 左上に完成名（原因｜結果 は2行。長ければ縮める）
  const fit = (t, px, max) => { g.font = font(px); const w = g.measureText(t).width; return w > max ? Math.floor(px * max / w) : px; };
  let y = 40;
  parts.forEach((p, i) => { const px = fit(p, i === parts.length - 1 ? 64 : 44, 620); g.font = font(px); y += px * 1.15; g.fillText(p, 48, y); });
  // 右下に題名
  g.textAlign = 'right'; g.font = L === 'ja' ? font(40) : font(30); g.fillText(L === 'ja' ? '秋刀魚(骨抜き)' : 'Saury Deboning', 1160, 596);
  return c;
}
const jpeg = (c, q) => new Promise((ok) => c.toBlob(ok, 'image/jpeg', q));
let shareId = null;
$('share').onclick = async () => {
  if ($('share').disabled) return;
  $('share').disabled = true;
  const text = `${DICT[lang()].share(resultData.name)}\n${new URL('./', location.href).href}`;
  try {
    const c = await buildShare();
    const img = await jpeg(c, 0.85);
    const file = img && new File([img], 'sanma-bonenuki.jpg', { type: 'image/jpeg' });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
      if (img) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(img);
        a.download = 'sanma-bonenuki.jpg';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      }
    }
  } catch (e) {
    if (!(e && e.name === 'AbortError')) { try { await navigator.clipboard.writeText(text); } catch {} }
  }
  $('share').disabled = false;
};
// 生きたサンマ：焼いたサンマの形を背〜腹で CFG.rawSlim 倍に細くし、生の写真の皮を貼る（焼けたしわ・口の切れ込み・腹と背の張り出し・小さなひれはなし）。尾びれは焼いたものの形で色だけ替える
function makeRawFish() {
  const t = makeTube(0, 1, 160); t.relief.fill(0); t.raw = true; shapeTube(t, null, 0);
  const mat = new THREE.MeshPhysicalMaterial({ map: canvasTexture(rawImg), color: new THREE.Color().setScalar(CFG.rawTone), metalness: 0.7, roughness: 0.35, envMap: scene.environment, envMapIntensity: CFG.skinEnv * 1.3 });
  const g = new THREE.Group(), fin = tail.clone(), root = new THREE.Group();
  fin.rotation.set(0, 0, 0);
  const finRaw = finMat.clone(); finRaw.color.setRGB(1.3, 1.4, 1.55); // 生の尾びれは銀がかった灰色（焼いた尾びれの模様に掛ける）
  fin.traverse(o => { if (o.isMesh) o.material = finRaw; });
  g.add(mesh(t.geo, mat), fin); root.position.copy(fish.position); root.add(g); scene.add(root);
  return { group: g, geo: t.geo, base: t.geo.attributes.position.array.slice(), fin, finY: fin.position.y };
}
// 尾をぴちぴち振る：頭（箸でつまんだ所）は動かさず、尾に近いほど大きく左右（画面で見える背と腹の向き）に波打たせる
function wiggle(r, t) {
  const p = r.geo.attributes.position.array, b = r.base, A = CFG.wiggle, w = 16, k = 5;
  const amp = (s) => A * ss(0.12, 1, s) ** 1.4;
  for (let i = 0; i < p.length; i += 3) { const s = sOf(b[i]); p[i + 2] = b[i + 2] + amp(s) * Math.sin(t * w - s * k); }
  r.geo.attributes.position.needsUpdate = true; r.geo.computeVertexNormals();
  r.fin.position.z = amp(1) * Math.sin(t * w - k);
  r.fin.rotation.y = Math.atan(amp(1) * k / LEN * Math.cos(t * w - k)); // 尾の付け根の傾きに合わせる
}
// 水しぶき：振っている尾のほうの皮から、しずくを横と上へ飛ばす。皿の高さまで落ちたら消して使い回す
// （透明の物はポストエフェクトで消えるので、不透明の照りの強い粒にする）
const drops = [], dropMat = new THREE.MeshPhysicalMaterial({ color: 0xd8ecf6, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 3, emissive: 0x5d7f92, emissiveIntensity: 0.7 });
let dropT = 0;
function splash(dt) {
  const p = raw.geo.attributes.position.array, b = raw.base, side = new THREE.Vector3(0, 0, 1).applyQuaternion(raw.group.quaternion);
  for (dropT += dt; dropT > 0.025; dropT -= 0.025) {
    let d = drops.find(o => !o.visible);
    if (!d) { if (drops.length >= 80) break; d = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), dropMat); scene.add(d); drops.push(d); }
    let i; do { i = Math.floor(Math.random() * (p.length / 3)) * 3; } while (sOf(b[i]) < 0.5);
    raw.group.localToWorld(d.position.set(p[i], p[i + 1], p[i + 2]));
    const v = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.4);
    d.userData.v = side.clone().multiplyScalar(v).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 1.2, (Math.random() - 0.5) * 0.6));
    d.scale.setScalar(0.5 + Math.random() * 1.1); d.visible = true;
  }
  for (const d of drops) {
    if (!d.visible) continue;
    d.userData.v.y -= 9 * dt; d.position.addScaledVector(d.userData.v, dt);
    if (d.position.y < 0.01) d.visible = false;
  }
}
// 暗いうちに、つまんだ頭（または生きたサンマ）を皿の上へ持ち上げ、箸をそこへ置き、カメラを結果の位置へ
// 瓶詰めのフレーク（ほぐしすぎた結果）：透明なガラス瓶にフレーク（flakes.jpg。写真の粒をサンマの身の色にしたもの）を詰め、金のふたをする（2026-10-28 ユーザーの写真に合わせた）。
// 大きさはワールド単位（魚の長さは約3）。open：ふたを開けて裏返し、皿に置く（折れてフレーク）。
// ガラスは光を通す材質（transmission）だと黒く写るので、①映り込みだけを足す層（加算合成）と②うっすら白く曇らせる層の2枚で表す。
// どちらも透明なので、隙間の影とピントの奥行きの描画の間は隠す（noDepth。後光と同じ）
function makeJar(open) {
  const g = new THREE.Group(), lathe = (pts, k = 1) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * k, y)), 64);
  const OUT = [[0.27, 0], [0.3, 0.02], [0.32, 0.1], [0.325, 0.22], [0.315, 0.34], [0.29, 0.4], [0.277, 0.43], [0.277, 0.5]]; // 写真の瓶の形（下すぼまり・まっすぐな胴・肩・ねじの口）
  const rAt = (y) => { for (let i = 1; i < OUT.length; i++) if (y <= OUT[i][1]) return lerp(OUT[i - 1][0], OUT[i][0], (y - OUT[i - 1][1]) / (OUT[i][1] - OUT[i - 1][1])); return OUT.at(-1)[0]; };
  const tex = new THREE.TextureLoader().load('flakes.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(7, 1); // 1枚 ≒ 0.28 四方（写真の粒の大きさ）。縦横の比をそろえないと横縞に見えた
  const flakes = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.5, color: new THREE.Color().setScalar(CFG.flakeTone), roughness: 0.85 });
  // フレーク：底の厚いガラスの上から、閉じた瓶は肩まで、開けた瓶は胴の上まで。上の面はでこぼこに盛る
  const B = 0.05, FL = open ? 0.33 : 0.41, side = [], k = 0.94;
  for (let y = B; y < FL; y += 0.02) side.push([rAt(y) * k, y]);
  side.push([rAt(FL) * k, FL]);
  const body = mesh(lathe(side), flakes);
  const tg = lathe([[0.001, FL + 0.03], [rAt(FL) * k * 0.35, FL + 0.028], [rAt(FL) * k * 0.7, FL + 0.018], [rAt(FL) * k, FL]].reverse()), tp = tg.attributes.position, tuv = tg.attributes.uv;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), edge = Math.hypot(x, z) / (rAt(FL) * k);
    tp.setY(i, tp.getY(i) + (fbm(x * 30 + 5, z * 30, 3) - 0.5) * 0.03 * (1 - edge ** 4)); tuv.setXY(i, x * 3.5, z * 3.5); // 粒の山
  }
  tg.computeVertexNormals(); g.add(body, mesh(tg, flakes));
  // ガラス：外の面・内の面・厚い底・口のねじと縁
  const shine = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 3.5, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const haze = new THREE.MeshStandardMaterial({ color: 0xe6ece4, roughness: 0.1, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const thick = haze.clone(); thick.opacity = 0.32; // 底の厚いガラスは白っぽく見える
  const wall = lathe(OUT), base = new THREE.CylinderGeometry(rAt(B) * 0.99, 0.27, B, 64).translate(0, B / 2, 0);
  const parts = [mesh(wall, shine), mesh(wall, haze), mesh(lathe(OUT, 0.96), haze), mesh(base, thick), mesh(base, shine)];
  for (const y of [0.448, 0.47]) parts.push(mesh(new THREE.TorusGeometry(0.279, 0.004, 6, 64).rotateX(Math.PI / 2).translate(0, y, 0), shine));
  parts.push(mesh(new THREE.TorusGeometry(0.275, 0.008, 8, 64).rotateX(Math.PI / 2).translate(0, 0.5, 0), shine), mesh(new THREE.TorusGeometry(0.275, 0.008, 8, 64).rotateX(Math.PI / 2).translate(0, 0.5, 0), thick));
  parts.forEach(m => { m.castShadow = false; noDepth.push(m); }); g.add(...parts);
  // ふた：金色の側面に細かい縦の溝、裏は白い内張り（開けたふたは裏返して内側を見せる）
  const lidTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 4; const x = c.getContext('2d'); for (let i = 0; i < 256; i += 4) { x.fillStyle = i % 8 ? '#fff' : '#555'; x.fillRect(i, 0, 4, 4); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 14; return t; })();
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b448, metalness: 1, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const goldSide = gold.clone(); goldSide.bumpMap = lidTex; goldSide.bumpScale = 2;
  const cap = new THREE.Group();
  cap.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 64, 1, true), goldSide), mesh(new THREE.CircleGeometry(0.3, 64).rotateX(-Math.PI / 2).translate(0, 0.04, 0), gold),
    mesh(new THREE.RingGeometry(0.255, 0.3, 64).rotateX(Math.PI / 2).translate(0, -0.039, 0), gold),
    mesh(new THREE.CircleGeometry(0.255, 64).rotateX(Math.PI / 2).translate(0, -0.03, 0), new THREE.MeshStandardMaterial({ color: 0xece5cf, roughness: 0.55 })));
  if (open) { cap.position.set(0.42, 0.04, -0.2); cap.rotation.set(Math.PI, 0.4, 0); } else cap.position.y = 0.54;
  g.add(cap);
  g.traverse(o => { if (o.isMesh && !noDepth.includes(o)) o.castShadow = true; });
  return g;
}
// 折れてフレーク：開けた瓶の口から、折れた骨（尾のほう）が1本斜めに飛び出す。尾の付け根の端を瓶の中に、折れ口を上に
function jarBone() {
  const xa = 0.3, b = buildBone(xa, XT), piv = new THREE.Group();
  splinters(b, xa, -1);
  b.position.set(-XT, -centerY(sOf(XT)), 0); piv.add(b);
  const X = new THREE.Vector3(0.35, -0.94, 0).normalize(), Z = new THREE.Vector3(-X.y, X.x, 0); // 魚の x を斜め下へ、左右の細い骨（z）を画面の横へ
  piv.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Z.clone().cross(X), Z));
  piv.position.set(0, 0.3, 0);
  return piv;
}
// ごはんの粒の凹凸（色は写真のまま、形の凹凸だけ）：米粒くらいの大きさ（山の差し渡しに約20粒）の、ふくらんだ楕円を向きばらばらに重ねる
function grainTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    x.save(); x.translate(Math.random() * 512, Math.random() * 512); x.rotate(Math.random() * Math.PI); x.scale(1, 0.45);
    const gr = x.createRadialGradient(0, 0, 0, 0, 0, 14); gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#bbb'); gr.addColorStop(1, '#000');
    x.fillStyle = gr; x.beginPath(); x.arc(0, 0, 14, 0, Math.PI * 2); x.fill(); x.restore();
  }
  return new THREE.CanvasTexture(c);
}
// ほぐしすぎ：瓶の横に置くごはん茶碗（藍の釉）。ごはんの上にもフレークを少し
function makeRice() {
  const g = new THREE.Group(), lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64);
  const bowl = new THREE.MeshPhysicalMaterial({ color: 0x34405c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  g.add(mesh(lathe([[0.001, 0.06], [0.12, 0.065], [0.22, 0.13], [0.28, 0.22], [0.3, 0.29], [0.315, 0.3], [0.322, 0.285], [0.305, 0.2], [0.25, 0.1], [0.17, 0.045], [0.125, 0.04], [0.125, 0], [0.1, 0], [0.095, 0.04], [0.001, 0.04]]), bowl));
  // ごはん：茶碗の縁から上へこんもり盛り、粒の塊でふぞろいにする。模様は写真（rice.jpg）を手前斜め上から映す
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(0.3 * Math.sin(t * Math.PI / 2) + 0.001, 0.26 + 0.14 * Math.cos(t * Math.PI / 2) ** 0.8)); }
  const rg = new THREE.LatheGeometry(pts.reverse(), 64), rp = rg.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), n = fbm(x * 22 + y * 30 + 7, z * 22 - y * 25, 3) - 0.5;
    rp.setXYZ(i, x * (1 + n * 0.06), y + n * 0.02 * ss(0.26, 0.3, y), z * (1 + n * 0.06)); // 粒の凹凸は写真にあるので、形は軽くでこぼこさせるだけ
  }
  viewUV(rg); rg.computeVertexNormals();
  const rt = new THREE.TextureLoader().load('rice.jpg'); rt.colorSpace = THREE.SRGBColorSpace; rt.anisotropy = 8;
  // 写真そのまま（2026-10-28 ユーザー指定）：粒の形やツヤ・透け感は写真に写っているので、写真をほぼそのままの明るさで見せる（emissive）。
  // ゲームの照明は少しだけ掛けて陰を付ける。米粒を形で並べる作りは、灰色の砂利のように見えてやめた
  g.add(mesh(rg, new THREE.MeshStandardMaterial({ map: rt, emissiveMap: rt, emissive: new THREE.Color(0.86, 0.94, 1.08).multiplyScalar(CFG.riceTone * 0.85), color: 0x707070, roughness: 0.35, bumpMap: grainTex(), bumpScale: CFG.riceGrain }))); // 暖色の照明と色調整で黄ばむので、少し青みを足して写真の白に。粒感は凹凸だけ足す（照明の当たる分 color で粒の陰が付く）
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * 6.28, r = Math.random() * 0.15, f = mesh(flakeGeos[i % 4], stuckMat);
    f.position.set(Math.cos(a) * r, 0.415 - r * 0.5, Math.sin(a) * r); f.scale.set(3.5, 1.6, 2.2); f.rotation.set(Math.random(), Math.random() * 6, Math.random());
    g.add(f);
  }
  return g;
}
function stageResult() {
  const kind = resultData.kind; hung = null; if (!resultData.leftBone) remakeBone();
  if (kind === 'crumbled' || kind === 'mixed') { // ほぐしすぎ：サンマも骨も箸も消し、皿にフレークの瓶（押しすぎて抜けた→ごはん茶碗を添える／折れた→開けた瓶から骨が飛び出す）
    fish.visible = garnish.visible = false; sticks.forEach(s => { s.visible = false; }); // 付け合わせも片づける
    const jar = makeJar(kind === 'mixed'); scene.add(jar);
    if (kind === 'mixed') { jar.position.set(0.05, 0, 0.1); jar.add(jarBone()); return setView('jar'); }
    jar.position.set(-0.42, 0, 0.05); const rice = makeRice(); rice.scale.setScalar(1.5); rice.position.set(0.45, 0, 0.25); scene.add(rice); rice.updateMatrixWorld(); riceSteam = rice.localToWorld(new THREE.Vector3(0, 0.38, 0)); // 茶碗は瓶より大きい（直径約10cm）
    return setView('rice');
  }
  const revived = kind === 'revived', broke = resultData.leftBone, at = HOLD.clone().add(new THREE.Vector3(0, revived ? 0.35 : 0, 0)); // 生きたサンマは尾びれまで長いので高く持つ
  // ぶら下げる向き：魚の頭→尾（x）を真下へ、見えている面（y）をカメラへ向ける（背は右、腹は左）
  const down = new THREE.Vector3(0, -1, 0), face = new THREE.Vector3(CAM_DIR.x, 0, CAM_DIR.z).normalize();
  const hang = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(down, face, down.clone().cross(face)));
  // tilt：つまんだ所を中心に、カメラから見て斜めに傾ける（横長の共有画像では真下だと縦に収まらない）。
  // 傾けたときは、先が宙に浮かないように箸ごと動かし、動かした量を返す。骨は後ろの端を皿に残った身の口（骨を抜いた所）へ寄せ、
  // 今まさに抜き出した形にする（2026-10-29 運営者）。生きたサンマは皿に身が残らないので、尾を皿の面（y＝0）に着け、皿の左の縁からはみ出さないようにする
  const hold = (o, tilt = 0) => {
    // 骨が短い（早く折れた）ときは寝かせすぎると頭が皿まで下がり、箸が身の上に寝るので、頭が CFG.shareRise の高さに来るまで起こす
    if (tilt && !revived) { const L = GRIP.distanceTo(boneOut.userData.end); tilt = Math.sign(tilt) * Math.acos(Math.max(Math.cos(tilt), Math.min(0.95, CFG.shareRise / L))); }
    const q = new THREE.Quaternion().setFromAxisAngle(face, tilt).multiply(hang); o.quaternion.copy(q); o.position.copy(at).sub(GRIP.clone().applyQuaternion(q)); o.updateMatrixWorld(true);
    const move = new THREE.Vector3();
    if (tilt && revived) { const box = new THREE.Box3().setFromObject(o); move.set(Math.max(0, PLATE_L + 0.15 - box.min.x), -box.min.y, CFG.shareRawFwd); }
    else if (tilt) { // 折れたときは、折れたと分かるよう身の口から離して皿の上に置く（2026-10-29 運営者）
      const to = broke ? new THREE.Vector3(XH - CFG.shareGap, 0.01, 0) : new THREE.Vector3(XH, centerY(sOf(XH)), 0);
      move.copy(fish.localToWorld(to)).sub(headRoot.localToWorld(boneOut.userData.end.clone()));
    }
    o.position.add(move); o.updateMatrixWorld(true); return move;
  };
  if (revived) { fish.visible = false; raw = makeRawFish(); hold(raw.group); }
  else { headMesh.position.set(0, 0, 0); headMesh.rotation.z = 0; hold(headRoot); }
  hung = (tilt) => hold(revived ? raw.group : headRoot, tilt);
  holdW = fishPoint(at.x, at.y, at.z);
  stickGoal.copy(holdW); stickTip.copy(holdW); stickOpen = stickOpenGoal = 0; placeSticks(0);
  setView('result');
}
function setView(v) { view = v; cam.look.copy(VIEWS[v].look); cam.halfW = VIEWS[v].halfW; cam.tilt = VIEWS[v].tilt ?? 1; fitCamera(); } // 暗いうちに一気に移す
const tmpV = new THREE.Vector3();
function placeHalo() { // 後光：カメラから見て骨の奥（水平方向）に置いてゆっくり回す
  const c = headRoot.localToWorld(new THREE.Vector3(XH + BONE_L * 0.4, 0, 0));
  tmpV.subVectors(c, camera.position).setY(0).normalize();
  halo.position.copy(c).addScaledVector(tmpV, 0.9);
}
function updateResult(dt) {
  if (resultT < 0) return;
  const t0 = resultT; resultT += dt;
  if (t0 < 0.55 && resultT >= 0.55) { stageResult(); $('fade').classList.remove('on'); }
  if (raw) { wiggle(raw, resultT); splash(dt); }
  if (halo && holdW) {
    placeHalo();
    halo.material.opacity = 0.35 * ss(1.0, 2.2, resultT); // 2026-10-29 に薄く（0.55 → 0.35）
    halo.material.rotation -= dt * 0.05;
  }
  // 星：1つずつ、ゆっくりふわっと光って、残像のように長く薄れていく（約3.6秒ごと。2026-10-29 ユーザー指定で遅くした）
  for (const st of glints) {
    const p = (resultT * 0.28 + st.userData.ph) % 1, env = p < 0.15 ? ss(0, 0.15, p) : Math.exp(-(p - 0.15) * 5);
    st.material.opacity = env * ss(0.8, 1.2, resultT);
    st.scale.setScalar(0.7 * ss(0.8, 1.2, resultT) * (0.55 + 0.45 * env));
    st.material.rotation = st.userData.ph * 6 + resultT * 0.15;
  }
  if (t0 < 1.7 && resultT >= 1.7) showResult();
}

// ---------- 遊び方（1ページ。2026-10-29 運営者が直した文言。「？」でいつでも見返せる） ----------
let sizzleT = -1; // 焼きたてのチリチリ（はじめるを押してから鳴り、だんだん静かに）
const showIntro = (on) => { $('intro').style.display = on ? 'flex' : 'none'; };
const startPlay = () => { showIntro(false); document.querySelector('[data-waqk-hub-link]')?.remove(); };
$('start').onclick = () => {
  if (startBanded && markAutostart()) { location.reload(); return; } // 帯をプレイ中に残さないよう、読み直して開始画面を飛ばす
  startPlay(); if (sizzleT < 0) sizzleT = 0;
};
$('help').onclick = () => showIntro(true);
// 開始画面の帯（試験。ADS.startBand。2026-10-31 運営者）：読み直すときの印は sessionStorage に今の時刻で置き、URL は変えない。読んだら必ず消し、10秒より古ければ無視する
const AUTOSTART = 'sanma_autostart';
function markAutostart() { try { sessionStorage.setItem(AUTOSTART, Date.now()); return true; } catch { return false; } }
function takeAutostart() { try { const t = +sessionStorage.getItem(AUTOSTART); sessionStorage.removeItem(AUTOSTART); return t > 0 && Date.now() - t < 10000; } catch { return false; } }
// 開始画面を出したままで呼ぶ。帯の高さを先に空けるので、広告があとから入っても「はじめる」は動かない。
// 帯の下端から一番上の押せる部品（はじめる）まで 150px、カードがはみ出さないときだけ出す。横向きのスマホ・sessionStorage が使えないとき・ADS.startBandShare が false の共有ページでは出さない
function showStartBand() {
  if (!ADS.startBand || !ADS.banner || ADS.failed || !ADS.startSlot) return;
  if ((innerWidth > innerHeight && innerHeight < 500) || (!ADS.startBandShare && /\/s\//.test(location.pathname)) || !markAutostart()) return;
  takeAutostart();
  const intro = $('intro'), card = intro.firstElementChild;
  startBanded = addBand(ADS.startSlot, band => {
    intro.style.top = band.offsetHeight + 'px'; // 帯に重ねない
    return $('start').getBoundingClientRect().top - band.getBoundingClientRect().bottom >= 150 && card.scrollHeight <= card.clientHeight;
  });
  if (startBanded) $('top').style.visibility = 'hidden'; // 帯の近くの常駐ボタンを隠す（開始画面の下にあって、もともと押せない）
  else intro.style.top = '';
}

// ---------- 所作の案内（初回だけ、物の近くに短く） ----------
const GUIDED = (() => { try { return localStorage.getItem('sanma_guided') === '1'; } catch { return false; } })() && q.get('guide') !== '1';
function placeGuide(id, on, w) {
  const el = $(id); el.style.display = on ? 'block' : 'none'; if (!on) return;
  const [x, y] = toScreen(w); el.style.left = clamp(x, 110, window.innerWidth - 110) + 'px'; el.style.top = y - 12 + 'px';
}
function updateGuides() {
  const total = presses.reduce((a, b) => a + b, 0), g = !GUIDED && phase !== 'result';
  placeGuide('g-press', g && phase === 'loosen' && total < 3, fishPoint(0.05, 0.22, 0));
  placeGuide('g-tail', g && phase === 'loosen' && total >= CFG.tailHintAfter, tailBaseW().add(new THREE.Vector3(0, 0.1, 0)));
  placeGuide('g-head', g && phase === 'pull' && !everGrabbed, headW().add(new THREE.Vector3(0, 0.1, 0)));
}

// ---------- 毎フレーム ----------
let last = performance.now();
function frame(dt) {
  // 箸：触っている間は指の所、つまんでいる間は頭・尾の付け根、離すと右手前に構える
  if (holdW) stickGoal.copy(holdW); // 結果：持ち上げた所をつまんだまま
  else if (drag && drag.kind === 'pull') stickGoal.copy(headW()).add(new THREE.Vector3(0.02, 0.0, 0.02));
  else if (drag && drag.kind === 'tail') stickGoal.copy(pointer ? surfaceAt(pointer.x, pointer.y) : tailBaseW());
  else if (pointer && phase !== 'result') stickGoal.copy(surfaceAt(pointer.x, pointer.y)).add(new THREE.Vector3(0, drag ? 0 : 0.06, 0));
  else stickGoal.copy(STICK_REST);
  if (pressT > 0) { pressT += dt; if (pressT > 0.16) pressT = 0; }
  placeSticks(dt);
  // 尾を折る
  // 尾を折る：バネのように一気に曲がって少し戻る。折れたのが見えるよう、CFG.tailHold 秒たってから「抜く」視点へ（2026-10-29 運営者）
  if (tailBroken && tailT < CFG.tailHold) {
    tailT = Math.min(CFG.tailHold, tailT + dt);
    const k = 1 - Math.exp(-tailT * 10) * Math.cos(tailT * 25);
    tail.rotation.y = CFG.tailSnap * tailSign * k; tail.rotation.z = 0.3 * k; // ドラッグした向き（画面の上／下）へ皿の面に沿って曲げ、少し持ち上げる（上から見て分かるように）
    tail.position.set(XT + 0.03 + CFG.tailGap * k, centerY(1), -0.4 * CFG.tailGap * tailSign * k); // 身から離す（2026-10-29 運営者）
    if (tailT >= CFG.tailHold && phase === 'pull') view = 'pull'; // すぐ抜ききって結果に移っていたら視点は変えない
  }
  updatePull(dt);
  updateResult(dt);
  updateSteam(dt);
  if (sizzleT >= 0) sizzleT += dt;
  updateLoopSE(sizzleT >= 0 ? Math.exp(-sizzleT / 6) : 0, clamp(rub / 1.5, 0, 1), ratio);
  if (dirtySkin) { drawSkin(); if (phase !== 'pull') shapeBody(); dirtySkin = false; }
  // カメラをなめらかに移す
  const V = VIEWS[view], kc = 1 - Math.exp(-dt * 3);
  cam.look.lerp(V.look, kc); cam.halfW = lerp(cam.halfW, V.halfW, kc); cam.tilt = lerp(cam.tilt, V.tilt ?? 1, kc); fitCamera();
  updateGuides();
  if (DEBUG) $('debug').textContent = `phase ${phase}\npresses ${presses.join(' ')}\npull ${(pull / BONE_L * 100).toFixed(0)}%  ratio ${ratio.toFixed(2)}\ntol ${tolerance(presses[sectionAt(pull / BONE_L)]).toFixed(2)}${resultData ? '\nkind ' + resultData.kind + '  t ' + resultT.toFixed(2) : ''}`;
  draw();
}
function loop(now) { frame(Math.min(0.05, (now - last) / 1000)); last = now; requestAnimationFrame(loop); }

shapeBody(); drawSkin(); dirtySkin = false;
resize();
draw();
if (ADS.startBand && takeAutostart()) { // 読み直したページ：開始画面も帯も出さず、広告のスクリプトも読まない。音は今までどおり最初のタップで有効になる
  startPlay();
  document.addEventListener('pointerdown', () => { if (sizzleT < 0) sizzleT = 0; }, { once: true });
} else { showIntro(true); showStartBand(); }
$('loading').style.display = 'none';
if (DEBUG) {
  $('debug').style.display = 'block';
  // 画面が隠れていて requestAnimationFrame が止まるとき用（だし巻きと同じ）
  window.__step = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) frame(dt); };
  window.__game = { presses, get phase() { return phase; }, get pull() { return pull / BONE_L; }, get ratio() { return ratio; }, get result() { return resultData; }, finish, setPull: (v) => { pull = v * BONE_L; }, setRatio: (v) => { sumR = v; sumT = 1; }, toScreen, headW, tailBaseW, fishPoint, secX, skinMat, scene };
}
requestAnimationFrame(loop);
