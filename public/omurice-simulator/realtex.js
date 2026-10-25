// 皿の上の場面（盛り付け・切る・結果）だけで使う、本物寄りの質感の絵（乱数を使わず、決まった模様）
// 卵の皮のしわ・焼きむら、中の半熟の粒、チキンライスの米、ケチャップ、炭、天かす。すべて継ぎ目なく並べられる（タイル）
import * as THREE from 'three';

const fract = x => x - Math.floor(x);
const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const sm = k => k * k * (3 - 2 * k);
const clamp01 = k => Math.min(1, Math.max(0, k));
const sstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const wrap = (a, p) => ((a % p) + p) % p;
// 周期 p のなめらかなでこぼこ（0〜1）
function pn(x, y, p, sd) {
  const xi = Math.floor(x), yi = Math.floor(y), sx = sm(x - xi), sy = sm(y - yi);
  const h = (a, b) => hash(wrap(a, p) + sd * 17.3, wrap(b, p) - sd * 31.7);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
function fbm(x, y, p, sd, oct = 4) { let s = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { s += a * pn(x, y, p, sd + o * 7); n += a; x *= 2; y *= 2; p *= 2; a *= 0.5; } return s / n; }
// 周期 p の細胞（いちばん近い点までの距離と、その点の番号）
function cell(x, y, p, sd) {
  const xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, wx = wrap(cx, p), wy = wrap(cy, p);
    const px = cx + 0.15 + 0.7 * hash(wx + sd, wy * 1.3), py = cy + 0.15 + 0.7 * hash(wx * 1.7 - sd, wy + 5.1);
    const d = Math.hypot(x - px, y - py);
    if (d < d1) { d2 = d1; d1 = d; id = hash(wx + 3.3, wy + sd); } else if (d < d2) d2 = d;
  }
  return [d1, d2, id];
}
// 高さ → 法線の絵（継ぎ目なし）
function normalFrom(hgt, n, str) {
  const out = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const g = (i, j) => hgt[wrap(j, n) * n + wrap(i, n)];
    const dx = (g(x + 1, y - 1) + 2 * g(x + 1, y) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x - 1, y) - g(x - 1, y + 1)) * str;
    const dy = (g(x - 1, y + 1) + 2 * g(x, y + 1) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x, y - 1) - g(x + 1, y - 1)) * str;
    const l = Math.hypot(dx, dy, 1), k = (y * n + x) * 4;
    out[k] = (-dx / l * 0.5 + 0.5) * 255; out[k + 1] = (-dy / l * 0.5 + 0.5) * 255; out[k + 2] = (1 / l * 0.5 + 0.5) * 255; out[k + 3] = 255;
  }
  return out;
}
function tex(data, n, srgb) {
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}
// 詳細の絵: rgb ＝ 色にかける倍率の半分（0.5 で変化なし）、a ＝ ざらつきの増減（0.5 で変化なし）
function detTex(n, f) { const d = new Uint8Array(n * n * 4); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = f(x / n, y / n), k = (y * n + x) * 4; d[k] = clamp01(v[0] / 2) * 255; d[k + 1] = clamp01(v[1] / 2) * 255; d[k + 2] = clamp01(v[2] / 2) * 255; d[k + 3] = clamp01(v[3]) * 255; } return tex(d, n, false); }

// 卵の外の皮: 細かいちりめんのしわ（ゆがんだ尾根）＋焼きむら（ところどころ少し濃い黄・うすい焼き色）＋小さな気泡のあと
export function skinMaps(n = 512) {
  const H = new Float32Array(n * n), C = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n;
    const wx = u + 0.06 * (fbm(u * 3, v * 3, 3, 1) - 0.5), wy = v + 0.06 * (fbm(u * 3 + 9, v * 3, 3, 2) - 0.5);
    const r1 = 1 - Math.abs(2 * pn(wx * 10, wy * 16, 10, 3) - 1), r2 = 1 - Math.abs(2 * pn(wx * 20, wy * 28, 20, 4) - 1), r3 = 1 - Math.abs(2 * pn(wx * 44, wy * 44, 44, 5) - 1);
    const big = fbm(u * 2, v * 2, 2, 6, 3);
    let h = 0.35 * r1 ** 6 * (0.3 + big) + 0.25 * r2 ** 5 * big + 0.1 * r3 ** 3 + 0.3 * fbm(u * 6, v * 6, 6, 16, 3) + 0.1 * fbm(u * 64, v * 64, 64, 7, 2);
    const [d1] = cell(u * 26, v * 26, 26, 8); const pore = (1 - sstep(0.0, 0.16, d1)) * (hash(Math.floor(u * 26), Math.floor(v * 26)) > 0.7 ? 1 : 0);
    h -= 0.25 * pore;
    H[y * n + x] = h;
    const mur = fbm(u * 3 + 2, v * 3 + 5, 3, 9, 4), blush = sstep(0.56, 0.78, mur), lite = sstep(0.55, 0.3, fbm(u * 4, v * 4 + 3, 4, 10, 3));
    let cr = 1 + 0.05 * lite - 0.06 * (1 - h) * 0.8, cg = cr, cb = cr;
    cr *= 1 - 0.04 * blush; cg *= 1 - 0.14 * blush; cb *= 1 - 0.32 * blush;   // 焼きむら: 少し濃い黄〜うすい焼き色
    const speck = hash(Math.floor(u * 180), Math.floor(v * 180)) > 0.996 ? 0.8 : 1;
    C.push([cr * speck, cg * speck, cb * (speck < 1 ? 0.7 : 1), 0.5 + 0.45 * (0.5 - h) + 0.15 * blush]);
  }
  let i = 0; const det = detTex(n, () => C[i++]);
  return { det, nrm: tex(normalFrom(H, n, 2.2), n, false) };
}
// 開いた中の半熟: やわらかい粒（丸いふくらみ）と、粒の間のつやのある流れ
export function curdMaps(n = 256) {
  const H = new Float32Array(n * n), C = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n, wu = u + 0.04 * (pn(u * 6, v * 6, 6, 11) - 0.5), wv = v + 0.04 * (pn(u * 6 + 3, v * 6, 6, 12) - 0.5);
    const [d1, d2, id] = cell(wu * 9, wv * 9, 9, 13), [e1] = cell(u * 23, v * 23, 23, 14);
    const lump = sstep(0.62, 0.05, d1), small = sstep(0.5, 0.1, e1);   // 丸くやわらかいふくらみ（角ばった鱗にしない）
    const h = 0.7 * lump * (0.7 + 0.5 * id) + 0.18 * small + 0.06 * fbm(u * 40, v * 40, 40, 15, 2);
    H[y * n + x] = h;
    const k = sstep(0.15, 0.7, lump);   // 粒の上: 少し淡い黄でつや控えめ。粒の間: 濃い卵黄色でつやつや
    C.push([1.0 + 0.03 * k, 0.94 + 0.08 * k, 0.82 + 0.18 * k + 0.05 * id, 0.5 + 0.25 * k - 0.3 * (1 - k)]);
  }
  let i = 0; const det = detTex(n, () => C[i++]);
  return { det, nrm: tex(normalFrom(H, n, 3.0), n, false) };
}
// 炭: 割れ目・ひび・こまかい凹凸
export function charMaps(n = 256) {
  const H = new Float32Array(n * n), C = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n, [d1, d2] = cell(u * 7, v * 7, 7, 21), crack = 1 - sstep(0.0, 0.07, d2 - d1);
    const h = 0.6 * fbm(u * 16, v * 16, 16, 22, 4) - 0.5 * crack + 0.1 * (1 - Math.abs(2 * pn(u * 30, v * 30, 30, 23) - 1));
    H[y * n + x] = h;
    const ash = sstep(0.62, 0.8, fbm(u * 5, v * 5, 5, 24, 3));
    C.push([0.75 + 0.9 * ash - 0.5 * crack, 0.75 + 0.85 * ash - 0.5 * crack, 0.75 + 0.8 * ash - 0.5 * crack, 0.55 + 0.3 * crack]);
  }
  let i = 0; const det = detTex(n, () => C[i++]);
  return { det, nrm: tex(normalFrom(H, n, 3.5), n, false) };
}
// 皿の上の場面の映り込み（明るい窓・天井のやわらかい明かり・手前の白い板・暗い部屋）
export function studioEnv(renderer) {
  const es = new THREE.Scene(); es.background = new THREE.Color('#2a221c');
  const pm = new THREE.PMREMGenerator(renderer);
  const panel = (w, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  panel(5, 3, -3, 6, -4, new THREE.Color(1.8, 1.65, 1.45));   // 奥左上の大きな窓（逆光）
  panel(5, 3, 0, 8, 1, new THREE.Color(1.3, 1.22, 1.1));   // 天井のやわらかい明かり
  panel(4, 3, 6, 2, 3, new THREE.Color(0.75, 0.72, 0.68));  // 手前右の白い板
  panel(10, 10, 0, -5, 0, '#3a2a1e');                       // 下は木の台
  panel(3, 5, -6, 2, 2, new THREE.Color(0.45, 0.42, 0.4));
  const t = pm.fromScene(es, 0.03).texture; pm.dispose(); return t;
}
