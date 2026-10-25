// オムライスシミュレーターの進み方（画面に関係しない。node でも試算できる）
// 本物のオムレツの順: しっかり熱したフライパンに卵を流す → 中火くらいで手早く混ぜる（中のふわふわ）→ 底が固まってきたら火を弱めるか止める
// → 二つに折る → フライパンを手前へすばやく引いて、卵を奥のふちに当てて転がし、合わせ目を下へ → 皿へ（余熱で半熟に仕上がる）→ 切る
// フライパンの卵を N×N のマスで持つ。cb＝下（フライパン側）の火の通り、ct＝上（中）の火の通り、curd＝混ぜてできたふわふわ、iri＝混ぜすぎてできた炒り卵
// 0＝生、0.4 前後＝トロトロ、0.8 で固い、1 を超えると焼き色、1.15 を超えると焦げ
// 火の入り方: 下は火の強さに比例して固まる。上（中）へは下との差から伝わり、この伝わる速さは火の強さによらない。
//   フライパンが熱すぎる（強火）と、固まった底がどんどん焼けて焼き色・焦げになり、混ぜてできる粒も大きく固くなる。
//   弱火だと底がなかなか固まらず、そのあいだに中まで火が入る。火を弱めてもフライパンはゆっくりしか冷めず、皿の上の余熱は移すときのフライパンの熱さで決まる
export const N = 24;
export const TUNE = {
  kb: 0.1,       // 下が固まる速さ（火 1.0 で毎秒）
  kBrown: 0.35,   // フライパンが brownT より熱いとき、固まった底が焼けていく速さ
  brownT: 0.95,  // これより熱いと焼き色が付いていく（つまみ 0.72 くらいから）
  kt0: 0.005,    // 上が直に温まる速さ（火 1.0 で毎秒）
  D: 0.077,      // 下から上へ伝わる速さ（毎秒。火によらない）
  edge: 0.84,    // ふちの火の強さ（真ん中 1.0）
  pan: 2.0,      // フライパンの温度が強めた火加減に追いつく時間（秒）
  panCool: 9,    // 火を弱めたとき、フライパンが冷めていく時間（秒）。すぐには冷めない
  brush: 2.3,    // 菜箸の届く半径（マス）
  rollIn: 0.05, // 返している間に中へ入る火（火 1.0 で毎秒）
  residBase: 0.35, // 火を消したフライパンから移したときの余熱の割合
  resid: 0.085,   // 皿に乗せてから切るまでの余熱（中に毎秒）
  ideal: 0.46,   // 中の理想
  beta: 0.22, toro: 0.62, kata: 0.78,   // 中の固さの境目（流れ出る／トロッと／開ききらない／カチカチ）
  skinMin: 0.45, // 折るのに要る底の膜（薄い所 10% 点）
  curdMin: 0.08, // これより混ぜていないと、中がふわふわにならず薄焼き卵
  curdRate: 0.4, // 混ぜたときのふわふわのでき方
  curdPeak: 0.55, curdDrop: 0.75,   // ふわふわの粒がいちばんできる火の勢いと、それより強いときの減り方
  curdPow: 1,    // ふわふわのでき方（火の勢いの何乗か。弱火ではほとんどできない）
  inW: 0.05,      // 中の固さの点の幅（理想からこれだけずれると大きく減る）
  rollK: 0.3,    // 返すのに時間がかかったときの減点の大きさ
  rollT0: 3.8,   // 返すのにこれ以上かかると減点
  seamK: 2.5,    // 合わせ目のずれの減点の大きさ
  seam0: 0,      // 合わせ目のずれがこれまでなら減点なし（0＝少しでもずれたら減る）
  dry0: 14,      // 卵を流してから皿に移すまでこれより長いと、ぱさつく分を減点（秒）
  top: 100,       // すべてが理想どおりのときの点（満点近くはほぼ出ない）
  signal: 0.52,  // 底の膜（薄い所 10% 点）がこれ以上で、混ぜるのをやめていればフライ返しに持ちかわる（折ってよい合図）
  skinIdeal: 0.62, // 外の理想（焼き色の付かない、つるっとした黄色）
  // 返す（フライパンを振る）。長さはフライパンの上の距離（ローポリの世界の単位）
  range: 1.0,    // フライパンを前後に動かせる幅（±）
  lip: -1.2,     // 奥のふち（卵の前の端がここに当たると転がる）
  e0: -1.08,     // 折ったあとの卵の前の端（奥のふちのすぐ手前へ寄せてある。短く払っても当たる）
  near: -0.12,   // 手前の壁（卵がこれより手前へは行かない）
  muK: 8, muS: 6,    // 卵とフライパンのすべり（ゆっくり動かすと卵もいっしょに動き、すばやく動かすとその場に残ってすべる）
  spring: 45,    // フライパンが手（指）に追いつく速さ（速いので、当たる強さはほぼ指の速さで決まる）
  vMiss: 0.8, vGood: 3, vStrong: 6, vFly: 9,     // ふちに当たる強さ: これ未満は転がらない／よく転がる／破れやすい／飛び出す（強さは速さ 5 を超える分を 0.6 倍にゆるめたもの）
  foldCool: 1.8, // 折った直後この秒数は、中へ入る火がゆるい（厚くなって中が温まりにくい）
  kuzure: 0.38,  // 膜がこれ以上 skinMin 未満なら、折れるが少し崩れる（破れが付く）。これ未満はビシャッ
  seamWin: 0.2,  // 合わせ目が真下から ±この割合（1回転＝1）なら皿へ移る
  cookMax: 40,   // 折らずにこれだけたつと、手で丸めて皿へ
  rollMax: 20,   // 返すのにこれ以上かかったら終わり（半回り以上転がっていれば皿へ、転がっていなければ焦げて終わり）
};
const clamp01 = k => Math.min(1, Math.max(0, k));
export const heatOf = v => 0.4 + 0.8 * clamp01(v);   // つまみ左いっぱいでも、とろ火は残る                 // つまみ 0〜1 → フライパンの温度
export const fireOf = T => Math.max(0, T - 0.28) / 0.92;           // 温度 → 卵が固まる勢い（低い温度ではほとんど固まらない）
export const DT = 1 / 60;
// ふわふわの粒のでき方: 中火くらいで細かい粒がいちばんできる。弱いとほとんどできず、強すぎると粒が大きく固くなって、ふわふわは少ない
const curdHot = F => F < TUNE.curdPeak ? (F / TUNE.curdPeak) ** TUNE.curdPow : Math.max(0.15, 1 - TUNE.curdDrop * (F - TUNE.curdPeak) / (1 - TUNE.curdPeak));
const C = (N - 1) / 2, RR = (N / 2) ** 2;
export const ACTIVE = [];
export const RAD = new Float32Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const d2 = (x - C) ** 2 + (y - C) ** 2;
  if (d2 <= RR) ACTIVE.push(y * N + x);
  RAD[y * N + x] = 1 - (1 - TUNE.edge) * Math.min(1, Math.sqrt(d2) / (N / 2)) ** 1.6;
}
const r3 = v => Math.round(v * 1000) / 1000;

export function newGame(knob = 0.55) {
  return {
    t: 0, mode: 'ready', knob, pan: heatOf(knob),
    cb: new Float32Array(N * N), ct: new Float32Array(N * N), curd: new Float32Array(N * N), iri: new Float32Array(N * N),
    t0: 0, stirLen: 0, foldT: 0, fold: null, rollT: 0, plateT: 0, cutT: 0, res: null, ev: [],
    // 返す
    roll: 0, tear: 0, yaw: 0, e: TUNE.e0, w: 0, lastImp: -9, imps: 0, contactT: null, cv: 0,
    tz: 0, tx: 0, pz: 0, px: 0, vz: 0, vx: 0, az: 0,
  };
}
export function pour(s) { if (s.mode !== 'ready') return; s.mode = 'cook'; s.t0 = s.t; s.ev.push({ k: 'pour', t: s.t }); }
export function setKnob(s, v) { s.knob = clamp01(v); }
// フライパンを動かす（手の位置。z＋が手前、x＋が右。±range）
export function setPan(s, z, x = 0) { s.tz = Math.min(TUNE.range, Math.max(-TUNE.range, z)); s.tx = Math.min(TUNE.range, Math.max(-TUNE.range, x)); }

function step(s) {
  const heating = s.mode === 'cook' || s.mode === 'roll' || s.mode === 'ready';
  if (heating) { const tg = heatOf(s.knob); s.pan += (tg - s.pan) * DT / (tg < s.pan ? TUNE.panCool : TUNE.pan); }   // 火を弱めても、フライパンはゆっくりしか冷めない
  if (s.mode === 'cook' || s.mode === 'roll') {
    const F = fireOf(s.pan), { cb, ct } = s, rin = s.mode === 'roll' ? TUNE.rollIn : 0, hot = TUNE.kBrown * Math.max(0, s.pan - TUNE.brownT);
    // 折ったあとは中へ伝わる火がゆるい（はじめの foldCool 秒は 0.3 倍から 0.6 倍へ、そのあとは 0.6 倍）
    const dk = s.mode === 'roll' ? 0.3 + 0.3 * Math.min(1, (s.t - s.foldT) / TUNE.foldCool) : 1, Dd = TUNE.D * dk;
    for (const i of ACTIVE) {
      const h = F * RAD[i];
      cb[i] += (h * TUNE.kb * (cb[i] < 1 ? 1 : 0.8) + hot * (cb[i] > 0.45 ? 1 : 0)) * DT;   // 熱すぎる（強火の）フライパンでは、固まった底がどんどん焼けて焼き色・焦げになる
      ct[i] += (h * (TUNE.kt0 + rin * dk) + Dd * Math.max(0, cb[i] - ct[i])) * DT;
    }
  }
  if (s.mode === 'roll') { rollStep(s); if (s.mode === 'roll') rollEnd(s); }
  // 卵を流して 40 秒たっても折らないと、最後は手で丸めて皿へ（置き忘れ）
  if (s.mode === 'cook' && s.t - s.t0 > TUNE.cookMax) { fold(s); if (s.mode === 'roll') { s.stuck = 2; s.roll = 1; toPlate(s); } }
  s.t += DT;
}
export function advance(s, t1) { while (s.t + DT <= t1 + 1e-9) step(s); }

// 菜箸でなぞる（マスの座標）。半熟の間に混ぜるとふわふわ、固まってから混ぜると炒り卵
// ふわふわ（凝固した粒）は、熱いフライパンに触れて固まった所をかき混ぜてできる。冷たいフライパンではほとんどできない
export function stir(s, x0, y0, x1, y1) {
  if (s.mode !== 'cook') return;
  const len = Math.hypot(x1 - x0, y1 - y0); if (len < 1e-4) return;
  s.stirLen += len;
  const n = Math.max(1, Math.ceil(len / 0.5)), seg = len / n, B = TUNE.brush, hot = curdHot(fireOf(s.pan));
  const { cb, ct, curd, iri } = s;
  for (let k = 1; k <= n; k++) {
    const px = x0 + (x1 - x0) * k / n, py = y0 + (y1 - y0) * k / n;
    const xa = Math.max(0, Math.floor(px - B)), xb = Math.min(N - 1, Math.ceil(px + B));
    const ya = Math.max(0, Math.floor(py - B)), yb = Math.min(N - 1, Math.ceil(py + B));
    let sum = 0, wsum = 0;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const d = Math.hypot(x - px, y - py); if (d > B || (x - C) ** 2 + (y - C) ** 2 > RR) continue;
      const i = y * N + x, w = 1 - d / B; sum += w * (cb[i] + ct[i]) / 2; wsum += w;
    }
    if (!wsum) continue;
    const mean = sum / wsum;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const d = Math.hypot(x - px, y - py); if (d > B || (x - C) ** 2 + (y - C) ** 2 > RR) continue;
      const i = y * N + x, w = 1 - d / B, kk = Math.min(0.85, w * 0.55 * seg);
      let a = (cb[i] + ct[i]) / 2; a += (mean - a) * kk * 0.5;
      cb[i] += (a - cb[i]) * kk; ct[i] += (a - ct[i]) * kk;
      if (a > 0.06 && a < 0.4) curd[i] = Math.min(1, curd[i] + kk * TUNE.curdRate * hot);
      if (a > 0.26) iri[i] = Math.min(1, iri[i] + kk * 0.5 * (0.5 + 0.8 * fireOf(s.pan)) * Math.min(1, (a - 0.26) / 0.25));   // 火が強いほど粒が大きく固くなる
    }
  }
}

function stats(s) {
  const { cb, ct, curd, iri } = s, n = ACTIVE.length;
  let sb = 0, st = 0, sc = 0, si = 0, br = 0; const bs = [];
  for (const i of ACTIVE) { sb += cb[i]; st += ct[i]; sc += curd[i]; si += iri[i]; if (cb[i] > 1.1) br++; bs.push(cb[i]); }
  const inner = st / n; let v = 0; for (const i of ACTIVE) v += (ct[i] - inner) ** 2;
  bs.sort((a, b) => a - b);
  return { inner, skin: sb / n, p10: bs[Math.floor(n * 0.1)], sd: Math.sqrt(v / n), curd: sc / n, iri: si / n, brown: br / n };
}
export const look = s => stats(s);

// 二つに折る: 底の膜が弱いとビシャッと崩れて終わり。折ったら奥のふちのほうへ寄せる
export function fold(s) {
  if (s.mode !== 'cook') return;
  const f = stats(s);
  s.foldT = s.t; s.fold = f;
  // 底の膜が足りないまま折ると崩れる。崩れた卵のまま続けられるが、裂けて形がいびつになり、破れの分だけ点が大きく下がる
  const broken = f.p10 < TUNE.kuzure ? 1 : 0;
  const tear0 = broken ? r3(0.6 + 0.3 * clamp01((TUNE.kuzure - f.p10) / TUNE.kuzure)) : f.p10 < TUNE.skinMin ? r3(0.7 * (TUNE.skinMin - f.p10) / (TUNE.skinMin - TUNE.kuzure)) : 0;   // 膜が少し足りない: 折れるが崩れて破れが付く
  s.broken = broken;
  Object.assign(s, { contactT: null, mode: 'roll', roll: 0, tear: tear0, yaw: broken ? 0.22 : 0, e: TUNE.e0, w: 0, lastImp: -9, imps: 0, contactT: null, cv: 0, tz: 0, tx: 0, pz: 0, px: 0, vz: 0, vx: 0, az: 0 });
  s.ev.push({ k: 'fold', t: s.t, broken });
}

// 返す: フライパンは手（指）を追いかけて動く。卵は、強く揺すったときだけフライパンの上をすべる。
// 手前へすばやく引くと、卵はその場に残ろうとして奥のふちに当たり、ふちに沿って転がる。当たる速さで転がる量が決まる
function rollStep(s) {
  const k = TUNE.spring;
  const ax = k * k * (s.tx - s.px) - 2 * k * s.vx, az = k * k * (s.tz - s.pz) - 2 * k * s.vz;
  s.vx += ax * DT; s.vz += az * DT; s.px += s.vx * DT; s.pz += s.vz * DT; s.az = az;
  // 卵のすべり（フライパンから見た速さ w。－が奥へ）
  const pseudo = -az;
  // ふちに当たってから 0.08 秒は卵がふちに押し付けられ、その間のいちばん速いフライパンの動きで転がる量が決まる
  if (s.contactT != null) {
    s.cv = Math.max(s.cv, s.vz); s.e = TUNE.lip; s.w = 0;
    if (s.t - s.contactT >= 0.08) { s.contactT = null; impact(s, s.cv); }
    return;
  }
  if (s.t - s.lastImp < 0.3) s.w = 0;   // ふちを越えて転がっている間は、フライパンといっしょに動く
  else if (Math.abs(s.w) < 0.02 && Math.abs(pseudo) < TUNE.muS) s.w = 0;
  else {
    const dir = s.w !== 0 ? Math.sign(s.w) : Math.sign(pseudo);
    const w1 = s.w + (pseudo - TUNE.muK * dir) * DT;
    s.w = Math.sign(w1) !== dir && Math.abs(pseudo) < TUNE.muS ? 0 : w1;
  }
  s.e += s.w * DT;
  if (s.e <= TUNE.lip) {
    s.e = TUNE.lip;
    if (s.w < 0 && s.t - s.lastImp > 0.25) { s.contactT = s.t; s.cv = -s.w; }
    s.w = Math.max(0, s.w);
  }
  if (s.e >= TUNE.near) { s.e = TUNE.near; s.w = Math.min(0, s.w); }
  // 振っていない間は、卵がゆっくり奥のふち近く（e0）へ戻る（フライパンを少し奥へ傾けて持っている）
  if (s.w === 0 && Math.abs(s.vz) < 0.3 && s.e > TUNE.e0) s.e = Math.max(TUNE.e0, s.e - 0.35 * DT);
}
function rollEnd(s) {
  // 皿へ移すのはプレイヤーが「完成」を押したとき（finish）。押さずに長く置くと、そのまま火が入り続ける
  // 20 秒たっても皿に移さないと、最後は手で丸めて皿へ（ずっと火にかかっていたので、たいてい真っ黒）
  if (s.t - s.foldT > TUNE.rollMax) { s.stuck = 1; if (s.roll < 0.85) s.roll = 1; toPlate(s); }
}
function impact(s, v) {
  v = v < 4.5 ? v : 4.5 + (v - 4.5) * 0.55;   // 速い払いほどゆるく効く
  // 斜めの振り: 15°まではまっすぐと同じ。それより斜めの分だけ転がる量が減り、ねじれる
  const sp = Math.hypot(s.vx, s.vz) + 1e-6, ang = Math.atan2(Math.abs(s.vx), Math.abs(s.vz)), over = Math.max(0, ang - Math.PI / 12), q = Math.cos(over), side = Math.sign(s.vx) * Math.sin(over);
  const { vMiss, vGood, vStrong, vFly } = TUNE;
  let g = v < vMiss ? 0 : v < vGood ? 0.08 + 0.3 * (v - vMiss) / (vGood - vMiss) : v < vStrong ? 0.38 + 0.17 * (v - vGood) / (vStrong - vGood) : 0.55 + 0.2 * clamp01((v - vStrong) / (vFly - vStrong));
  g *= q * q;   // 斜めに振ると、転がらずにねじれる
  const f = stats(s);
  // 底の膜が薄いほど、弱い当たりでも破れる
  const tearV = vStrong + 1.5 - 4.5 * clamp01((0.62 - f.p10) / 0.25);
  if (v > tearV) s.tear = r3(s.tear + 0.18 * (v - tearV));
  s.yaw = Math.max(-0.6, Math.min(0.6, s.yaw + 0.5 * side * Math.min(1, v / vGood)));
  s.roll += g; s.lastImp = s.t; s.imps++;
  s.e = TUNE.lip + 0.08 + 0.1 * Math.min(1, g * 1.6); s.w = 0;
  s.ev.push({ k: 'imp', t: s.t, v, g });
  // 強すぎて飛び出した: 卵はコンロの向こうへ落ち、拾ってそのまま皿へ（どんなときも最後はオムライスにする）
  if (v >= vFly) { s.flew = 1; if (s.roll < 0.85) s.roll = 1; toPlate(s); return; }
  s.tear = Math.min(0.95, s.tear);   // 破れても終わらず、裂けたまま続ける
}
function end(s, kind, f) {
  s.mode = 'done'; s.cutT = s.t; s.rollT = s.t - s.foldT;
  s.res = judge({ ...f, kind, rollT: s.rollT, add: 0, off: 0, tear: s.tear, yaw: s.yaw, seam: 0.5 });
  s.ev.push({ k: kind, t: s.t });
}
// 合わせ目が真下近くで、卵が落ち着いているか（「完成」を押すのにちょうどよいとき）
export function seamOk(s) { const n = Math.round(s.roll); return s.mode === 'roll' && n >= 1 && Math.abs(s.roll - n) <= TUNE.seamWin && s.t - s.lastImp > 0.45 && Math.abs(s.w) < 0.05; }
// 「完成」: 半回り以上転がっていれば皿へ移す（合わせ目がずれたまま押すと、そのずれが点に響く）
export function canFinish(s) { return s.mode === 'roll' && s.roll >= 0.5 && s.contactT == null; }
export function finish(s) { if (!canFinish(s)) return false; toPlate(s); return true; }
export const FLY_DELAY = 1.4;   // 飛び出してから、拾って皿へ運びはじめるまで（秒）
function toPlate(s) {
  s.mode = 'plate'; s.rollT = s.t - s.foldT; s.plateT = s.t + (s.flew ? FLY_DELAY : 0);
  const R = s.roll, n = Math.max(1, Math.round(R));
  s.fold = { ...stats(s), tear: s.tear, yaw: s.yaw, seam: R - n, turns: R, cookT: s.t - s.t0, heat: fireOf(s.pan), broken: s.broken || 0, flew: s.flew || 0, stuck: s.stuck || 0 };
  s.ev.push({ k: 'rolled', t: s.plateT, flew: s.flew || 0 });
}
// 切る: off＝切り口のずれ（オムレツの幅の半分を 1 とする）
export function cut(s, off) {
  if (s.mode !== 'plate') return;
  s.cutT = s.t; s.mode = 'done';
  s.res = judge({ ...s.fold, rollT: s.rollT, add: residAdd(s.fold, Math.min(s.t - s.plateT, RESID_T)), off });   // 皿の上の余熱は、包丁が入るまでの決まった時間ぶん（演出の長さによらない）
  s.ev.push({ k: 'cut', t: s.t });
  return s.res;
}
// 皿の上の余熱: フライパンが熱いまま移すほど、卵に残った熱で中が固まっていく（火を弱めてから移すと少ない）
export const residAdd = (f, dt0) => { const dt = Math.max(0, dt0); return (TUNE.resid * (f.heat == null ? 1 : TUNE.residBase + (1 - TUNE.residBase) * Math.min(1, f.heat / 0.55)) + 0.08 * Math.max(0, f.skin - 0.85)) * dt; };

// 結果。中の固さ H＝中＋余熱＋炒り卵＋焦げの分
const FIELDS = ['inner', 'skin', 'p10', 'sd', 'curd', 'iri', 'brown', 'rollT', 'add', 'off', 'tear', 'yaw', 'seam', 'cookT', 'broken', 'flew', 'stuck', 'turns'];
export function judge(f0) {
  const f = {}; for (const k of FIELDS) f[k] = r3(f0[k] || 0);
  const H = r3(f.inner + f.add + 0.8 * f.iri + 0.12 * f.brown), off = f.off;
  let kind = f0.kind;
  if (!kind) {
    if (H < TUNE.beta) kind = 'beta';
    else if (H >= TUNE.kata) kind = 'kachi';
    else if (f.curd < TUNE.curdMin) kind = 'usu';
    else if (H < TUNE.toro) kind = 'toro';
    else kind = 'kata';
  }
  const open = kind === 'kata' ? 1 - 0.75 * (H - TUNE.toro) / (TUNE.kata - TUNE.toro) : ['kachi', 'bicha', 'tobi', 'yabure', 'koge'].includes(kind) ? 0 : 1;
  const flow = kind === 'beta' ? 1 : kind === 'toro' ? clamp01((TUNE.toro + 0.02 - H) / (TUNE.toro - TUNE.beta)) : 0;
  const dIn = H - TUNE.ideal, fIn = 0.65 * Math.exp(-((dIn / TUNE.inW) ** 2)) + 0.35 * Math.exp(-Math.abs(dIn) / 0.8);
  const fSkin = (0.6 + 0.4 * Math.exp(-(((f.skin - TUNE.skinIdeal) / (f.skin < TUNE.skinIdeal ? 0.17 : 0.3)) ** 2))) * (1 - 0.6 * f.brown);   // 焼き色・焦げは苦い
  const fCurd = 0.55 + 0.45 * clamp01(f.curd / 0.3);
  const fEven = 0.5 + 0.5 * Math.exp(-((f.sd / 0.15) ** 2));
  const fRoll = 1 - TUNE.rollK * (1 - Math.exp(-(Math.max(0, f.rollT - TUNE.rollT0) / 3)));
  const fCut = 0.6 + 0.4 * Math.exp(-((off / 0.25) ** 2));
  const fSeam = Math.max(0.2, 1 - TUNE.seamK * Math.max(0, Math.min(0.5, Math.abs(f.seam)) - TUNE.seam0));
  const fTear = 1 - 0.5 * clamp01(f.tear);
  const fYaw = 1 - 0.22 * clamp01(Math.abs(f.yaw) / 0.5);
  // 火にかけている時間が長いほど水分が抜けてぱさつく（卵を流してから皿に移すまで。10 秒を超えた分。最短でも 9.5 秒ほどかかる）。昔の結果URL（cookT なし）は 0 として扱う
  const fDry = f.cookT > 0 ? Math.exp(-Math.max(0, f.cookT - TUNE.dry0) / 18) : 1;
  const fTurns = 1 - 0.3 * clamp01((f.turns - 1.5) / 1.2);   // 転がしすぎ: 何回も巻くと細長く固く締まる（1.5回りを超えた分）
  const fBroken = f.broken ? 0.35 : 1, fFlew = f.flew ? 0.25 : 1, fStuck = f.stuck ? 0.25 : 1;   // 崩れ・飛び出し・20秒格闘は、きれいに作ったものより必ず低い   // 崩れたまま作ったオムライスは、きれいに折れたものより必ず低い
  let score = TUNE.top * fBroken * fFlew * fStuck * fIn * fSkin * fCurd * fEven * fRoll * fCut * fSeam * fTear * fYaw * fDry * fTurns;
  // いちばん響いた減点（結果に1つだけ大きく出す）
  const FAC = [['中の固さ', fIn], ['外の焼け', fSkin], ['ふわふわ', fCurd], ['火のむら', fEven], ['返すのにかかった時間', fRoll], ['切り口のずれ', fCut], ['合わせ目のずれ', fSeam], ['破れ', fTear], ['ねじれ', fYaw], ['火にかけた時間', fDry], ['転がしすぎ', fTurns], ['折るときに崩れた', fBroken], ['飛び出した', fFlew], ['フライパンに置きっぱなし', fStuck]];
  const worst = FAC.reduce((a, b) => b[1] < a[1] ? b : a);
  if (kind === 'bicha' || kind === 'yabure') score *= 0.3;
  if (kind === 'tobi' || kind === 'koge') score *= 0.25;
  if (kind === 'usu') score *= 0.6;
  const res = { kind, open, flow, H, ...f, score: Math.round(score * 10) / 10, worst: [worst[0], Math.round(worst[1] * 100) / 100] };
  res.name = title(res); res.cause = cause(res);
  return res;
}
// 皿の上で何になるか（失敗ほど大げさな別のものに化ける）。結果の数値だけで決まる。名前・原因の一言・皿の上の見た目はすべてこれに従う
// k: 化けたもの、d: 大げささ 0〜1（失敗の度合い。大きいほど大きく・長く・黒く）
export function plateOf(r) {
  const c = clamp01;
  if (r.kind === 'tobi' || r.kind === 'koge' || r.kind === 'yabure' || r.kind === 'bicha') return { k: 'old', d: 0 };   // 古い結果URL
  if (r.flew) return { k: 'drape', d: 1 };
  if (r.stuck >= 2) return { k: 'frisbee', d: 1 };
  if (r.stuck) return { k: 'brick', d: 1 };
  if (r.brown >= 0.35 && r.iri >= 0.12) return { k: 'volcano', d: c((r.iri - 0.12) / 0.3) };
  if (r.brown >= 0.6) return { k: 'brick', d: c((r.brown - 0.6) / 0.3) };
  if (r.brown >= 0.35) return { k: 'hamburg', d: c((r.brown - 0.35) / 0.25) };
  if (r.kind === 'beta') return { k: 'lake', d: 1 };
  if (r.broken && r.p10 < 0.31) return { k: 'lake', d: c((0.31 - r.p10) / 0.12) };   // 底がほとんど生のまま折った: 中も生で、切ると全部流れ出る
  if (r.iri >= 0.12) return { k: 'soboro', d: c((r.iri - 0.12) / 0.3) };
  if (r.broken) return { k: 'flower', d: c(0.5 + r.tear * 0.5) };
  if (r.tear >= 0.6) return { k: 'flower', d: c((r.tear - 0.6) / 0.6) };
  if ((r.turns || 0) >= 1.8) return { k: 'futomaki', d: c((r.turns - 1.8) / 1.0) };
  if (r.kind === 'kachi') return { k: 'ball', d: c((r.H - TUNE.kata) / 0.25) };
  if (r.kind === 'usu') return { k: 'cloth', d: c((TUNE.curdMin - r.curd) / 0.07) };
  if (Math.abs(r.yaw) >= 0.3) return { k: 'drill', d: c((Math.abs(r.yaw) - 0.3) / 0.3) };
  return { k: '', d: 0 };
}
// 原因の一言（名前の下に）: 何をしたからそうなったか ＋（次はどうするか）。「（」の前と後ろで2行に分けて見せる
const sec = r => Math.round(r.cookT || 0);   // 卵を流してから皿に移すまでの秒
const fix = r => (r.rollT || 0) > 6 ? `（返すのに${Math.round(r.rollT)}秒。強めに払って、早く「完成」）` : '（底が固まったら火を弱め、早めに折る）';   // 次はどうするか: 返すのに手間取ったのか、火が強かったのか
export function cause(r) {
  const { k, d } = plateOf(r);
  if (k === 'old') return '';
  if (k === 'drape') return '振りが強すぎて、卵が皿のふちまで飛んだ（振りは今の半分の強さで）';
  if (k === 'frisbee') return '折らずに40秒焼いて、平たいまま真っ黒になった（底が固まったら、すぐ折る）';
  if (k === 'brick' && r.stuck) return '巻いてから20秒も火にかけて、炭になった（合わせ目が下に来たら「完成」）';
  if (k === 'brick') return `火にかけて${sec(r)}秒、外が炭になった${fix(r)}`;
  if (k === 'volcano') return '強火で固まっても混ぜ続けて、粒が焦げた（中火で混ぜ、固まりかけたら止める）';
  if (k === 'hamburg') return `火にかけて${sec(r)}秒、外がどら焼きの色になった${fix(r)}`;
  if (k === 'lake') return '底が生のうちに折って、中まで生のまま流れた（底に膜ができるまで待って折る）';
  if (k === 'soboro') return '固まっても混ぜ続けて、全部ぽろぽろの粒になった（固まりかけたら混ぜるのをやめる）';
  if (k === 'flower' && r.broken) return '底の膜が弱いうちに折って、折り目から裂けた（あと少し待ってから折る）';
  if (k === 'flower') return '膜が薄いうちに強く振って、あちこち裂けた（折ってすぐは、やさしく振る）';
  if (k === 'futomaki') return '何回も転がして、固く巻き上がった（合わせ目が下に来たら振るのをやめる）';
  if (k === 'ball' && r.rollT > 7) return '転がすのに手間取って、中まで固まった（強めに1〜2回振って、すぐ皿へ）';
  if (k === 'ball') return `火にかけて${sec(r)}秒、中までゴムのように固まった${fix(r)}`;
  if (k === 'cloth') return '混ぜ足りなくて、薄い膜だけになった（流したらすぐ、手早く混ぜる）';
  if (k === 'drill') return '斜めに振って、卵がねじれた（まっすぐ手前へ振る）';
  if (r.kind === 'kata') return '皿に移すのが遅く、余熱で中まで固まった（合わせ目が下に来たら、すぐ「完成」）';
  if (Math.abs(r.seam) >= 0.12) return '合わせ目が下に来る前に「完成」を押した（濃いふちが見えなくなってから押す）';
  if (r.score >= 88) return '中火で混ぜて弱めて手早く。洋食屋の手順はだいたいこれ';
  if (r.flow >= 0.6) return '中がほぼ生で、切った瞬間に流れた（もう1秒だけ待ってから折る）';
  if (r.score >= 78) return '火加減も返しも、ほぼ思いどおりにいった';
  if (r.H >= 0.56) return 'トロトロに少し間に合わなかった（あと3秒早く皿に移す）';
  if (r.curd < 0.15) return '粒が少なめだった（もう少し長く混ぜると、ふわふわになる）';
  return '中火で混ぜて、あとは余熱がうまくやってくれた';
}
// できあがりの名前（「／」の前と後ろで2行に分けて見せる）。大げささ d が大きいほど大げさな名前
export function title(r) {
  // 古い結果URL（フライパンの上で終わっていたころ）
  if (r.kind === 'tobi') return 'コンロの向こうへ／旅立ったオムレツ';
  if (r.kind === 'koge') return '最後まで転がらなかった／焦げオムレツ';
  if (r.kind === 'yabure') return '返すたびに裂けていった／オムレツ';
  if (r.kind === 'bicha') return '折る前に広がっていった／オムレツ';
  const { k, d } = plateOf(r);
  if (k === 'drape') return '皿のふちに着地した／完熟バナナ';
  if (k === 'frisbee') return '折らずに焼いて円盤になった／黒いフリスビー';
  if (k === 'brick') return r.stuck ? '20秒焼いて包丁がはね返る／炭のレンガ' : '強火で包丁がはね返る／備長炭オムレツ';
  if (k === 'volcano') return d > 0.5 ? '煙を噴きつづける／黒そぼろ大噴火' : '煙を噴く／黒そぼろ火山';
  if (k === 'hamburg') return d > 0.5 ? 'あんこを待っている／どら焼きの皮' : '焦げ茶に焼けて二枚に割れた／どら焼き風オムレツ';
  if (k === 'lake') return d > 0.5 ? 'テーブルまであふれた／卵かけご飯の湖' : '皿が湖になった／卵かけご飯';
  if (k === 'soboro') return d > 0.5 ? 'ご飯が見えなくなった／そぼろ富士' : '包丁を入れたら崩れた／天かす山盛り';
  if (k === 'flower') return r.broken ? '折り目から裂けて咲いた／卵のひまわり' : '裂け目から開いた／花びらオムレツ';
  if (k === 'futomaki') return d > 0.5 ? '包丁が通らず皿からはみ出す／めん棒' : '巻きすぎて切ると渦巻き／ロールケーキ';
  if (k === 'ball') return d > 0.5 ? 'ぽよんと跳ねて皿から逃げた／ゴムの三日月' : 'ぽよんと跳ねて割れた／ゴムの三日月オムレツ';
  if (k === 'cloth') return d > 0.5 ? '切ったら皿ごと包んだ／テーブルクロス卵' : '切ったらご飯を包みこんだ／ふろしきオムライス';
  if (k === 'drill') return 'ねじれて先がとがった／ドリルオムレツ';
  if (r.kind === 'kata') return '開いても一滴も垂れない／しっかり卵オムライス';
  if (Math.abs(r.seam) >= 0.12) return '皿の上でちょっと寝返りを打った／オムライス';
  if (r.score >= 88) return '洋食屋のショーケースに並べたい／オムライス';
  if (r.flow >= 0.6) return '包丁を入れたら黄色い川ができた／オムライス';
  if (r.score >= 78) return '開いた瞬間に声が出る／トロトロオムライス';
  if (r.H >= 0.56) return 'トロトロまであと3秒だった／オムライス';
  if (r.curd < 0.15) return '粒が少なめで、つるんと開いた／オムライス';
  return 'スプーンを入れる前に写真を撮りたい／オムライス';
}
const KINDS = ['bicha', 'beta', 'usu', 'toro', 'kata', 'kachi', 'tobi', 'yabure', 'koge'];
const PRESET = ['bicha', 'tobi', 'yabure', 'koge'];
export function encodeRes(r) {
  return [KINDS.indexOf(r.kind), r.inner, r.skin, r.p10, r.sd, r.curd, r.iri, r.brown, r.rollT, r.add, r.off + 1, r.tear, r.yaw + 1, r.seam + 1, r.cookT, r.broken || 0, r.flew || 0, r.stuck || 0, r.turns || 0].map(v => Math.max(0, Math.round(v * 1000)).toString(36)).join('.');
}
export function decodeRes(str) {
  const a = String(str || '').split('.').map(v => parseInt(v, 36) / 1000);
  if ((a.length < 14 || a.length > 19) || a.some(v => !isFinite(v))) return null;
  const kind = KINDS[Math.round(a[0])];
  return judge({ kind: PRESET.includes(kind) ? kind : undefined, inner: a[1], skin: a[2], p10: a[3], sd: a[4], curd: a[5], iri: a[6], brown: a[7], rollT: a[8], add: a[9], off: a[10] - 1, tear: a[11], yaw: a[12] - 1, seam: a[13] - 1, cookT: a[14] || 0, broken: a[15] ? 1 : 0, flew: a[16] ? 1 : 0, stuck: a[17] > 1.5 ? 2 : a[17] ? 1 : 0, turns: a[18] || 0 });
}

// ---------- 試算・動画用の自動の作り手 ----------
// plan: { knob, stir: [開始, 終了], foldAt, flicks: [{ gap, push, v, side }…] または flick(s, i)→そのつど決める, cutDelay, off, cover, speed, knobs: [[秒, 値]] }
export function botPath(plan, t) {   // 菜箸の位置（マス座標）。らせんで往復する
  const cover = plan.cover ?? 1, sp = plan.speed ?? 30;
  const ang = t * sp / 5, rr = (N / 2 - 1.2) * cover * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.9)));
  return [C + Math.cos(ang) * rr, C + Math.sin(ang * 1.07) * rr];
}
// 1回の振り: gap 秒待つ → push だけゆっくり奥へ押す → 速さ v で手前（＋range）まで引く（side＝横へそれる割合）→ ゆっくり真ん中へ戻す
const PUSH = 2, BACK = 1.6;   // 押すとき・戻すときの手の速さ（卵がすべらない程度）
export function flickLen(f) { return f.gap + f.push / PUSH + (f.push + TUNE.range) / f.v + TUNE.range / BACK; }
export function flickAt(f, k) {   // 振りはじめから k 秒の手の位置
  const R = TUNE.range, t1 = f.gap, t2 = t1 + f.push / PUSH, t3 = t2 + (f.push + R) / f.v, t4 = t3 + R / BACK;
  if (k < t1) return [0, 0];
  if (k < t2) return [-(k - t1) * PUSH, 0];
  if (k < t3) { const d = (k - t2) * f.v; return [-f.push + d, (f.side || 0) * d]; }
  const xe = (f.side || 0) * (f.push + R);
  if (k < t4) { const u = (k - t3) / (t4 - t3); return [R * (1 - u), xe * (1 - u)]; }
  return [0, 0];
}
export function simulate(plan) {
  const s = newGame(plan.knob ?? 0.55); pour(s);
  let prev = botPath(plan, 0), t = 0, lowered = false;
  // decide(s, t)→'stir'｜'wait'｜'fold': 見た目を見て決める人。なければ秒で決める（stir・foldAt）
  while (plan.decide ? t < 60 : t < plan.foldAt) {
    t += DT;
    for (const [at, v] of plan.knobs || []) if (Math.abs(at - t) < DT / 2) setKnob(s, v);
    if (plan.lowAt != null && !lowered && t >= plan.lowAt) { setKnob(s, plan.lowKnob ?? 0); lowered = true; }
    advance(s, s.t0 + t);
    const p = botPath(plan, t), d = plan.decide ? plan.decide(s, t) : (t >= plan.stir[0] && t < plan.stir[1] ? 'stir' : 'wait');
    if (d === 'fold') break;
    if (plan.lowKnob != null && plan.lowAt == null && d === 'wait' && !lowered) { setKnob(s, plan.lowKnob); lowered = true; }   // 混ぜ終わったら火を弱める
    if (d === 'stir') stir(s, prev[0], prev[1], p[0], p[1]);
    prev = p;
  }
  fold(s);
  if (s.mode === 'done') return s.res;
  let i = 0;
  while (s.mode === 'roll') {
    // 合わせ目が下に来たら振るのをやめ、落ち着いてから少しして「完成」を押す
    if (Math.abs(s.roll - Math.round(s.roll)) <= TUNE.seamWin && s.roll >= Math.max(0.8, (plan.minTurns || 1) - 0.2)) {
      const t0 = s.t; while (s.mode === 'roll' && !seamOk(s) && s.t - t0 < 1.5) { setPan(s, 0, 0); advance(s, s.t + DT); }
      advance(s, s.t + (plan.finishDelay ?? 0.3)); finish(s); if (s.mode === 'roll') advance(s, s.t + 0.2);
      continue;
    }
    const f = typeof plan.flick === 'function' ? plan.flick(s, i) : (plan.flicks || [])[i] || { gap: 0.2, push: 0.3, v: 4.5, side: 0 };
    i++;
    const t0 = s.t, L = flickLen(f);
    while (s.mode === 'roll' && s.t - t0 < L + 0.15) { const [z, x] = flickAt(f, s.t - t0); setPan(s, z, x); advance(s, s.t + DT); }
  }
  if (s.mode === 'done') return s.res;
  advance(s, s.plateT + TRANSFER + CUT_AUTO);   // 皿へ移して、包丁が自動で入るまで
  return cut(s, 0);   // 切るのは自動の演出（いつもまっすぐ真ん中）
}
export const TRANSFER = 1.2;   // 皿へ移すまで（秒）
export const CUT_AUTO = 4.6;   // 皿に乗ってから包丁が抜けきる（切れる）まで（秒）。回り込み 2.2 秒＋包丁が降りて手前へ引く 2.4 秒
export const RESID_T = TRANSFER + 1.85;   // 点に入る皿の上の余熱の時間（演出を長くしても点は変えない）
