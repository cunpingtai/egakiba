import { vq } from './version.js'; // 素材の版（?v=）
// 効果音: web/assets/se/<名前>.mp3 があればその音（Higgsfield の Mirelo で作った音。一覧は assets/se/manifest.json、作り方は tools/se_build.sh）、
// 無ければブラウザの中で作る音（仮）で鳴らす（2026-10-25 オーナー「効果音を本物に」）。
// ブラウザの決まりで、最初のクリックの中で unlock() してから鳴る
let ctx = null, master = null, noiseBuf = null;
let voiceBus = null, seBus = null, ambBus = null; // 声・効果音・部屋の音の音量（題名の画面のつまみ。2026-10-26）
const vol = { voice: 1, se: 1, amb: 1 };
export const audio = () => ({ ctx, master, voice: voiceBus }); // 声（voice.js）も同じ出口から鳴らす
export function setVolume(kind, v) {
  vol[kind] = Math.max(0, Math.min(1, +v));
  const bus = { voice: voiceBus, se: seBus, amb: ambBus }[kind];
  if (bus && ctx) bus.gain.setTargetAtTime(vol[kind], ctx.currentTime, 0.02);
}
export const volumes = () => ({ ...vol });

// 音のファイル（先に中身だけ取っておき、unlock の後に音に変える）
const raw = new Map(); // 名前 → Promise<ArrayBuffer|null>
const bufs = new Map(); // 名前 → AudioBuffer
const LEVEL = { slap_light: 0.8, slap_hard: 1.0, crackle: 0.55, zap: 0.85, clipper: 0.5, thud: 0.9, slam: 0.9, chop: 1.0, click: 0.5, ring: 0.35, chime: 0.5, siren: 0.35, tick: 0.12, birds: 0.25, buzz: 0.5, slurp: 0.5, clink: 0.4, chair: 0.5, door: 0.7, amb_night: 0.35, amb_morning: 0.25, amb_city: 0.3, amb_tv: 0.3 }; // 音ごとの大きさ
export async function load() {
  let names = [];
  try { names = await fetch(vq('./assets/se/manifest.json')).then((r) => (r.ok ? r.json() : [])); } catch { names = []; }
  for (const n of names) raw.set(n, fetch(vq(`./assets/se/${n}.mp3`)).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null));
  decodeAll(); // クリックの前から音に変えておく（最初の部屋の音が仮の音にならないように）
}
async function decodeAll() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; // 音に変えるだけなら、クリック前でも使える
  const dec = ctx || (OAC ? new OAC(1, 44100, 44100) : null);
  if (!dec) return;
  for (const [n, p] of raw) { const ab = await p; if (ab && !bufs.has(n)) { try { bufs.set(n, await dec.decodeAudioData(ab.slice(0))); } catch { /* 読めない音は仮の音で */ } } }
}
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    for (const k of ['voice', 'se', 'amb']) { const b = ctx.createGain(); b.gain.value = vol[k]; b.connect(master); if (k === 'voice') voiceBus = b; else if (k === 'se') seBus = b; else ambBus = b; }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    decodeAll();
  }
  if (ctx.state === 'suspended') ctx.resume();
}
// ファイルの音を鳴らす。無ければ false
function sample(name, gain = 1, t = ctx.currentTime + 0.005) {
  const b = bufs.get(name);
  if (!b) return false;
  const s = ctx.createBufferSource();
  s.buffer = b;
  const g = ctx.createGain();
  g.gain.value = (LEVEL[name] ?? 0.6) * gain;
  s.connect(g).connect(seBus);
  s.start(t);
  return true;
}

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}
function noise(t, { type = 'bandpass', freq = 2000, q = 1, peak = 0.5, a = 0.002, dec = 0.08 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, a, peak, dec);
  s.connect(f).connect(g).connect(seBus);
  s.start(t, Math.random());
  s.stop(t + a + dec + 0.05);
}
function tone(t, { freq = 200, to = null, type = 'sine', peak = 0.4, a = 0.003, dec = 0.1 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + dec);
  const g = ctx.createGain();
  env(g, t, a, peak, dec);
  o.connect(g).connect(seBus);
  o.start(t);
  o.stop(t + a + dec + 0.05);
}

// 呼び出し音（日本の 400Hz を 16Hz で揺らす音。1秒鳴って2秒休む）を2回
function ringback(t) {
  for (let k = 0; k < 2; k++) {
    const t0 = t + k * 3;
    const o = ctx.createOscillator(), lfo = ctx.createOscillator();
    o.frequency.value = 400; lfo.frequency.value = 16;
    const am = ctx.createGain(), depth = ctx.createGain(), g = ctx.createGain();
    am.gain.value = 0.5; depth.gain.value = 0.5;
    lfo.connect(depth).connect(am.gain);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.1, t0 + 0.01);
    g.gain.setValueAtTime(0.1, t0 + 1);
    g.gain.linearRampToValueAtTime(0, t0 + 1.02);
    o.connect(am).connect(g).connect(seBus);
    o.start(t0); lfo.start(t0); o.stop(t0 + 1.05); lfo.stop(t0 + 1.05);
  }
}
// パトカーのサイレン（遠くから近づく）
function siren(t) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(620, t);
  for (let k = 0; k < 3; k++) { o.frequency.linearRampToValueAtTime(940, t + k * 2.2 + 1.3); o.frequency.linearRampToValueAtTime(620, t + (k + 1) * 2.2); }
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1300;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 4);
  g.gain.setValueAtTime(0.1, t + 6.2);
  g.gain.linearRampToValueAtTime(0, t + 6.6);
  o.connect(f).connect(g).connect(seBus);
  o.start(t); o.stop(t + 6.7);
}

// 終わりの後の場面: 朝の小鳥・スマホの振動・麺をすする音
function birds(t) {
  for (let k = 0; k < 4; k++) {
    const t0 = t + k * 1.1 + Math.random() * 0.5;
    for (let i = 0; i < 3; i++) tone(t0 + i * 0.1, { freq: 3100 + Math.random() * 900, to: 4300 + Math.random() * 500, peak: 0.035, a: 0.004, dec: 0.06 });
  }
}
function buzz(t) {
  for (let k = 0; k < 2; k++) {
    const t0 = t + k * 0.6;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 160;
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
    g.gain.setValueAtTime(0.14, t0 + 0.36); g.gain.linearRampToValueAtTime(0.0001, t0 + 0.4);
    o.connect(f).connect(g).connect(seBus);
    o.start(t0); o.stop(t0 + 0.42);
  }
}
function slurp(t) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = 'bandpass'; f.Q.value = 2.5;
  f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.55);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.08);
  g.gain.setValueAtTime(0.2, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
  s.connect(f).connect(g).connect(seBus);
  s.start(t, Math.random()); s.stop(t + 0.65);
}

// 部屋の空気の音（ずっと鳴っている、ごく小さい音）: night（夜の家・冷蔵庫のうなり）・morning（朝の家）・city（新しい部屋・遠くの街）・tv（6畳・テレビの話し声のような音）。
// ambient(名前) で切り替える（前の音は2秒で消える）。null で止める。ファイル amb_<名前> があれば、それを繰り返す
let amb = null;
export function ambient(name) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (amb) { const old = amb; old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0.0001, t + 2); setTimeout(() => old.nodes.forEach((n) => n.stop?.()), 2200); amb = null; }
  if (!name) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.connect(ambBus);
  const nodes = [];
  const b = bufs.get(`amb_${name}`);
  if (b) {
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
    const v = ctx.createGain(); v.gain.value = LEVEL[`amb_${name}`] ?? 0.3;
    s.connect(v).connect(g); s.start(t); nodes.push(s);
  } else {
    const bed = (type, freq, q, level, lfoHz = 0, lfoDepth = 0) => { // ずっと続く雑音（type の通り道で色を付ける）
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const v = ctx.createGain(); v.gain.value = level;
      s.connect(f).connect(v).connect(g);
      if (lfoHz) { const o = ctx.createOscillator(), d = ctx.createGain(); o.frequency.value = lfoHz; d.gain.value = lfoDepth; o.connect(d).connect(v.gain); o.start(t); nodes.push(o); }
      s.start(t, Math.random()); nodes.push(s);
    };
    const hum = (freq, level) => { const o = ctx.createOscillator(); o.frequency.value = freq; const v = ctx.createGain(); v.gain.value = level; o.connect(v).connect(g); o.start(t); nodes.push(o); };
    if (name === 'night') { bed('lowpass', 260, 0.7, 0.05); hum(50, 0.006); hum(100, 0.004); }
    if (name === 'morning') { bed('lowpass', 900, 0.5, 0.025); }
    if (name === 'city') { bed('lowpass', 520, 0.6, 0.05); bed('bandpass', 1800, 0.8, 0.006); }
    if (name === 'tv') { bed('lowpass', 240, 0.7, 0.04); bed('bandpass', 900, 1.4, 0.03, 3.1, 0.02); hum(50, 0.005); }
  }
  g.gain.linearRampToValueAtTime(1, t + 2);
  amb = { g, nodes };
}

// name: slap（power 0〜1.5。1 より強ければ slap_hard）・thud（重い石）・slam（紙ごと机を叩く）・chop（包丁）・crackle（スタンガンの火花）・zap（電気を当てている間）・clipper（バリカン）・click（ペンチ・スイッチ）・ring（呼び出し音）・chime（ピンポーン）・siren・tick（時計）・birds・buzz（スマホの振動）・slurp（麺）・clink（食器を置く）・chair（椅子を引く）・door（玄関の戸）
export function play(name, power = 1) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  if (name === 'slap' ? sample(power > 1 ? 'slap_hard' : 'slap_light', 1, t) : sample(name, 1, t)) return; // ファイルの音があればそれで
  if (name === 'slap') { // 皮膚を打つ高い破裂音と、低いこもった音
    noise(t, { freq: 2600, q: 0.7, peak: 0.5 * power, dec: 0.06 + 0.04 * power });
    noise(t, { type: 'highpass', freq: 5000, peak: 0.22 * power, dec: 0.025 });
    tone(t, { freq: 170, to: 90, peak: 0.32 * power, dec: 0.07 });
  } else if (name === 'thud') {
    tone(t, { freq: 85, to: 45, peak: 0.6, dec: 0.22 });
    noise(t, { type: 'lowpass', freq: 400, peak: 0.4, dec: 0.12 });
  } else if (name === 'slam') {
    tone(t, { freq: 120, to: 70, peak: 0.4, dec: 0.12 });
    noise(t, { type: 'lowpass', freq: 1800, peak: 0.45, dec: 0.09 });
  } else if (name === 'chop') {
    noise(t, { freq: 1600, q: 1.2, peak: 0.6, dec: 0.05 });
    tone(t, { freq: 220, to: 110, peak: 0.5, dec: 0.13 });
    noise(t, { type: 'highpass', freq: 3500, peak: 0.3, dec: 0.02 });
  } else if (name === 'click') {
    noise(t, { type: 'highpass', freq: 3000, peak: 0.3, dec: 0.012 });
    noise(t + 0.07, { type: 'highpass', freq: 3400, peak: 0.26, dec: 0.012 });
  } else if (name === 'ring') ringback(t);
  else if (name === 'chime') {
    tone(t, { freq: 659, peak: 0.25, a: 0.005, dec: 0.9 });
    tone(t + 0.55, { freq: 523, peak: 0.25, a: 0.005, dec: 1.2 });
  } else if (name === 'siren') siren(t);
  else if (name === 'tick') tone(t, { freq: 2200, type: 'square', peak: 0.05, a: 0.001, dec: 0.015 });
  else if (name === 'clipper') { // バリカン（1回の撫でぶん 1.1秒のうなり。撫でるたびに鳴らす。本物の音は work/se/raw/clipper.mp3 を置いて se_build.sh）
    tone(t, { freq: 118, to: 121, type: 'sawtooth', peak: 0.16, a: 0.03, dec: 1.0 });
    tone(t, { freq: 236, to: 242, type: 'square', peak: 0.05, a: 0.03, dec: 1.0 });
    noise(t, { type: 'bandpass', freq: 2400, q: 0.6, peak: 0.08, a: 0.03, dec: 1.0 });
  }
  else if (name === 'crackle') { // スタンガンの火花（短く、ぱちぱち）
    for (let i = 0; i < 6; i++) noise(t + i * 0.028 + Math.random() * 0.01, { type: 'highpass', freq: 4200 + Math.random() * 2500, peak: 0.16 + Math.random() * 0.12, a: 0.001, dec: 0.012 });
    tone(t, { freq: 3100, to: 2600, type: 'square', peak: 0.05, a: 0.002, dec: 0.12 });
  }
  else if (name === 'zap') { // 電気を当てている間（0.8秒）: 低いうなり（50Hz）と、途切れないぱちぱち
    tone(t, { freq: 50, type: 'sawtooth', peak: 0.28, a: 0.005, dec: 0.75 });
    tone(t, { freq: 100, to: 97, type: 'square', peak: 0.1, a: 0.005, dec: 0.7 });
    for (let i = 0; i < 26; i++) noise(t + i * 0.03 + Math.random() * 0.012, { type: 'highpass', freq: 3800 + Math.random() * 3000, peak: 0.1 + Math.random() * 0.12, a: 0.001, dec: 0.014 });
    noise(t, { type: 'bandpass', freq: 1200, q: 0.8, peak: 0.12, a: 0.003, dec: 0.6 });
  }
  else if (name === 'birds') birds(t);
  else if (name === 'buzz') buzz(t);
  else if (name === 'slurp') slurp(t);
  else if (name === 'chair') { noise(t, { type: 'bandpass', freq: 700, q: 1.5, peak: 0.12, a: 0.04, dec: 0.35 }); tone(t + 0.05, { freq: 160, to: 120, peak: 0.08, dec: 0.2 }); }
  else if (name === 'door') { noise(t, { type: 'highpass', freq: 2800, peak: 0.18, dec: 0.03 }); tone(t + 0.7, { freq: 90, to: 55, peak: 0.35, dec: 0.3 }); noise(t + 0.7, { type: 'lowpass', freq: 500, peak: 0.3, dec: 0.15 }); }
  else if (name === 'clink') { tone(t, { freq: 1900, peak: 0.08, a: 0.001, dec: 0.12 }); tone(t, { freq: 2950, peak: 0.04, a: 0.001, dec: 0.06 }); }
}
