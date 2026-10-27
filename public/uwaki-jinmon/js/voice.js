// 夫婦と警察の声（Higgsfield で作った音。2026-10-25 オーナー「声のクオリティ上げて 怖がってる声とか悲鳴とか全て」→「妻のセリフも入れて」「警察のセリフも入れて」）。
// セリフの文字 → 音の対応表 web/assets/voice/manifest.json（tools/voice_manifest.mjs が作る）:
//   { files: [ある音のファイル名], "夫": { lines: { "文字": "ファイル名" か [別テイクの列] }, parts: [{ re, files }] }, "妻": { 同じ }, "警察": { 同じ } }
// 無いセリフは字幕だけ（夫の口は文字から動く）。{partner} などを差し込んだ自白は、部品（"…ごめん。" / "{when}、" / "{partner}と…" / "{place}で…"）の音をつないで鳴らす。
// 話し手ごとに別の出口で鳴らす（妻の声の途中で夫が答え始めても切れない）。
// 先読み: 対応表を読んだら、最初に出る音（始まり・妻・ふだんの答え・否定）を先に取って音に変えておき、残りも裏で順に取る（2026-10-26 オーナー「次」= 声の先読み）
// 英語・韓国語（2026-10-26 オーナー「英語、韓国語も入れて」「全部作って」）: web/assets/voice/<lang>/manifest.json（鍵は日本語の文のまま、音はその言葉）。
//   言葉の音が無いセリフは日本語の音に戻る（packs の順）。先読みはその言葉の分だけ
import { vq } from './version.js';
import { audio } from './se.js';

let packs = []; // [{ dir: 'en/' か '', manifest, have: ある音のファイル名 }]。先頭から探す（言葉の声 → 日本語の声）
const buffers = new Map(); // dir+ファイル名 → Promise<AudioBuffer|null>
const playing = new Map(); // 話し手 → { nodes, g }
const seqs = new Map(); // 話し手 → 何回目の play か（音を読み込んでいる間に次の声が来たら、古い方は鳴らさない）
const envs = new Map(); // 話し手 → いま鳴らしている声の大きさの線 { step, data }（夫の口を声に合わせる）
const EARLY = /^(start|w_|baseline_|deny|already|evidence_deny)/; // 最初に出る音

// mode が 'w'（女性浮気版）の時は web/assets/voice_w/ の音（鍵は同じく "夫"＝縛られる側・"妻"＝問い詰める側のまま。話し手は入れ替わっている）。無ければ声なし（夫の声には戻さない）
let base = 'voice';
export async function load(lang = 'ja', mode = 'h') {
  packs = [];
  base = mode === 'w' ? 'voice_w' : 'voice';
  const get = async (dir) => { try { const m = await fetch(vq(`./assets/${base}/${dir}manifest.json`)).then((r) => (r.ok ? r.json() : null)); return m ? { dir, manifest: m, have: new Set(m.files || []) } : null; } catch { return null; } };
  if (lang !== 'ja') { const p = await get(`${lang}/`); if (p) packs.push(p); }
  const ja = await get('');
  if (ja) packs.push(ja);
  const main = packs[0];
  if (!main) return;
  const files = [...main.have];
  const first = files.filter((f) => EARLY.test(f)).map((f) => main.dir + f), rest = files.filter((f) => !EARLY.test(f)).map((f) => main.dir + f);
  prefetch(first).then(() => prefetch(rest, 2)); // 最初の分が済んでから残りを2本ずつ
}
async function prefetch(files, width = 6) {
  for (let i = 0; i < files.length; i += width) await Promise.all(files.slice(i, i + width).map(buffer));
}
// 音に変える出口: 鳴らす AudioContext があればそれ、無ければ（クリック前）OfflineAudioContext で
let offline = null;
function decoder() {
  const { ctx } = audio();
  if (ctx) return ctx;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!offline && OAC) offline = new OAC(1, 44100, 44100);
  return offline;
}
function buffer(file) {
  if (buffers.has(file)) return buffers.get(file);
  const p = fetch(vq(`./assets/${base}/${file}`)).then((r) => r.arrayBuffer()).then((b) => decoder().decodeAudioData(b)).catch(() => null);
  buffers.set(file, p);
  return p;
}
// 話し手の文字に合う音の列（無ければ空）。差し込みのある自白は "parts" から部品を組む。別テイクがあればどれか1つ。言葉の声に無ければ日本語の声
function filesFor(who, text) {
  for (const { dir, manifest, have } of packs) {
    const m0 = manifest[who];
    if (!m0) continue;
    const one = m0.lines && m0.lines[text];
    if (typeof one === 'string') return [dir + one];
    if (Array.isArray(one)) return [dir + one[Math.floor(Math.random() * one.length)]]; // 同じセリフの別テイク（よく出る否定は2つ。繰り返しに聞こえないように）
    for (const part of m0.parts || []) { // part: { re: 正規表現, files: [部品の名の列。$1 などは正規表現で捕まえた差し込みの値] }
      const m = new RegExp(part.re).exec(text);
      if (!m) continue;
      const fs = part.files.map((k) => `${k.replace(/\$(\d)/g, (_, i) => m[+i])}.mp3`).filter((f) => have.has(f));
      if (fs.length) return fs.map((f) => dir + f);
    }
  }
  return [];
}
// 声の大きさの線: 20ms ごとの実効値を、大きい方から 5% の所を 1 にして 0〜1 に。部品の間（0.12秒）は 0
const STEP = 0.02;
function envelopeOf(bufs) {
  const out = [];
  for (const b of bufs) {
    const d = b.getChannelData(0), n = Math.max(1, Math.floor(b.sampleRate * STEP));
    for (let i = 0; i < d.length; i += n) {
      let s = 0;
      const e = Math.min(d.length, i + n);
      for (let j = i; j < e; j++) s += d[j] * d[j];
      out.push(Math.sqrt(s / (e - i)));
    }
    for (let k = 0; k < 6; k++) out.push(0);
  }
  const sorted = [...out].sort((a, b) => a - b), ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  return { step: STEP, data: Float32Array.from(out, (v) => Math.min(1, v / ref)) };
}
export const envelope = (who) => envs.get(who) || null;
// 鳴らして、長さ（秒）を返す。音が無ければ 0（呼ぶ側は字幕の長さで待つ）。同じ話し手の前の声は止める
export async function play(who, text) {
  stop(who);
  const seq = (seqs.get(who) || 0) + 1;
  seqs.set(who, seq);
  envs.delete(who);
  const files = filesFor(who, text);
  if (!files.length) return 0;
  const { ctx, voice, master } = audio();
  if (!ctx) return 0;
  const bufs = (await Promise.all(files.map(buffer))).filter(Boolean);
  if (!bufs.length || seqs.get(who) !== seq) return 0;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  g.connect(voice || master);
  let t = ctx.currentTime + 0.02, total = 0;
  const nodes = [];
  for (const b of bufs) {
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(g);
    s.start(t);
    t += b.duration + 0.12; total += b.duration + 0.12;
    nodes.push(s);
  }
  playing.set(who, { nodes, g });
  envs.set(who, envelopeOf(bufs));
  return total - 0.12;
}
// 止める（who を省くと全部）
export function stop(who) {
  if (who === undefined) { for (const w of [...playing.keys()]) stop(w); return; }
  const p = playing.get(who);
  if (!p) return;
  const { ctx } = audio();
  p.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
  setTimeout(() => p.nodes.forEach((n) => { try { n.stop(); } catch { /* もう止まっている */ } }), 120);
  playing.delete(who);
}
export const has = (who, text) => filesFor(who, text).length > 0;
export const files = (who, text) => filesFor(who, text); // 確かめ用（どの言葉の音か）
