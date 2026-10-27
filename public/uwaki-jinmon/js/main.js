// 試作の本体: 部屋・夫（husband.js）・妻の腕（wife.js と動きの clips.js）・遊びの中身（game.js）をつなぎ、行動ごとの演出を付ける。
// ?seed=123 で同じ真相をもう一度。window.__act(行動, 引数) で外から動かせる（撮影・確かめ用）。?step は自動で進めず window.__step(コマ数) で進める
import { vq } from './version.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadHusband } from './husband.js';
import { loadWife } from './wife.js';
import * as C from './clips.js';
import { makeProps } from './props.js';
import * as SE from './se.js';
import * as VOICE from './voice.js';
import * as I18N from './i18n.js';
import { fitFov } from './view.js';
import { makeEpilogue } from './epilogue.js';
import { homeDressing } from './rooms.js';
import { newGame, act, available, verdict, keepGoing, ACTIONS, MAX_DAYS, labelOf, appRows } from './game.js';

const q = new URLSearchParams(location.search);
const MODE = I18N.pickMode(); // 'h': 夫が浮気した側（元の形）。'w': 妻が浮気した側（女性浮気版。縛られる側が妻の模型、問い詰める側が夫の腕。2026-10-26 オーナー「女性浮気版も追加して」）
const story = await fetch(MODE === 'w' ? './data/story_w.json' : './data/story.json').then((r) => r.json());
await I18N.load(undefined, MODE); // 言葉（日本語・English・한국어）。文は日本語のまま持ち、見せる時だけ t() で置き換える（声と口は日本語の文のまま）。女性浮気版は先に夫→妻の置き換え
const t = I18N.t;
await VOICE.load(I18N.lang, MODE); // 声の対応表（その言葉の声 → 無ければ日本語の声 → 無ければ字幕だけ）
await SE.load(); // 効果音のファイル（無ければブラウザで作る音）
let G = newGame(story, +(q.get('seed') || Date.now() % 1e9));
const $ = (id) => document.getElementById(id);
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000 * (q.has('fast') ? 0.1 : 1)));
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// 読み込みの進み具合を「始める」に出す（部屋・夫・妻の GLB と肌の絵。読み終わるまで押せない。2026-10-26）
THREE.DefaultLoadingManager.onProgress = (url, n, total) => { $('go').textContent = `${t('読み込み中…')} ${Math.round((n / Math.max(1, total)) * 100)}%`; };

// ---------- 3D
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: q.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050404);
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
scene.environmentIntensity = 0.035; // 夜の暗い部屋

const [room, H, W] = await Promise.all([new GLTFLoader().loadAsync(vq('./assets/room.glb')), loadHusband(scene, { envTex, model: MODE === 'w' ? 'spouse_f' : 'husband', skin: MODE === 'w' ? '_f' : '' }), loadWife(scene, { envTex, model: MODE === 'w' ? 'hands_m' : 'wife' })]); // H: 縛られる側、W: 問い詰める側の腕
scene.add(room.scene);
room.scene.traverse((o) => {
  if (!o.isMesh) return;
  o.receiveShadow = true;
  o.castShadow = !/floor|ceiling|wall|base_/.test(o.name);
  if (/shade/.test(o.material.name)) { o.material.emissive = new THREE.Color(0xffc890); o.material.emissiveIntensity = 1.6; o.castShadow = false; }
});

// 台所（扉・家電・冷蔵庫・壁の時計。rooms.js）。時計の針はゲームの時刻
const DRESS = homeDressing();
scene.add(DRESS.group);

// 光: 夫の頭の上のペンダント（暖色のスポット・影あり）が主。手前（妻の側）からの照り返し、窓の月明かり（青く、顔の横を起こす）、
// 台所の手元灯（奥が真っ黒にならないように）、ごく弱い環境の光。肌がオレンジに寄りすぎないよう、主の光は白に近い暖色
const head = H.headWorld();
const pendant = new THREE.SpotLight(0xffe2c6, 1.9, 0, 0.75, 0.55, 2);
pendant.position.set(0, 1.84, 0.35);
pendant.target.position.set(0, 0.7, 0.15);
pendant.castShadow = true;
pendant.shadow.mapSize.set(2048, 2048);
pendant.shadow.radius = 4;
pendant.shadow.bias = -0.0003;
pendant.shadow.normalBias = 0.01;
const fill = new THREE.PointLight(0xd6dcef, 0.3, 0, 2);
fill.position.set(0.4, 1.45, 1.7);
const moon = new THREE.DirectionalLight(0x8aa4d4, 0.42);
moon.position.set(-2.6, 1.9, 0.1);
moon.target.position.copy(head);
const hemi = new THREE.HemisphereLight(0x3a3026, 0x0e0b09, 0.06);
scene.add(pendant, pendant.target, fill, moon, moon.target, hemi);

// ---------- 小道具（props.js）
const PAPER_SPOT = V3(0.7, 0.724, head.z + 0.2); // 離婚届を叩きつける所（テーブル）
const SWITCH = V3(0.62, 1.22, 2.588); // 妻の後ろの壁の電気のスイッチ（放置する時に切る）
{
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.12, 0.012), new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.5 }));
  plate.position.copy(SWITCH).add(V3(0, 0, 0.006));
  scene.add(plate);
}
const PR = makeProps(scene, { envTex, counterAt: V3(-0.35, 0.93, -1.22), notice: { name: story.trigger.name, text: String(story.trigger.evidence?.desc || '').replace(/^「|」$/g, '').split(' ')[0] } }); // 縛られる側のスマホの待ち受け: きっかけの相手の名前と文の前半（夫版 ユイ「昨日はありがとう♡」・妻版 ケンタ「昨日は楽しかった♡」）
PR.toolbox.position.set(0.88, 0.722, head.z - 0.12); // テーブルの上、離婚届のとなり
PR.toolbox.rotation.y = 0.5;
const lap0 = H.point('lap');
PR.stones.position.copy(lap0);

// ---------- カメラ（妻の目）: ふだんは立って見下ろし、夫が答える時は顔に寄る（癖を見るため）。
// 妻が動く時は、動き（clips.js）の view に合わせて立ち位置を変える
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.03, 30);
const eyesP = H.eyesWorld();
const POV = { pos: V3(0.06, 1.56, head.z + 1.15), look: head.clone().add(V3(0, -0.28, 0)), fov: 42 };
const CLOSE = { pos: eyesP.clone().add(V3(0.02, 0.05, 0.62)), look: eyesP.clone().add(V3(0, -0.03, 0)), fov: 30 };
const base = { pos: V3(), look: V3(), fov: 42 };
const knees = () => H.point('kneeL').add(H.point('kneeR')).multiplyScalar(0.5);
const VIEWS = {
  reach: () => ({ pos: eyesP.clone().add(V3(-0.03, 0.24, 0.31)), look: eyesP.clone().add(V3(0.03, -0.06, 0)), fov: 48 }), // 手が顔に届く所まで踏み込む
  near: () => ({ pos: eyesP.clone().add(V3(-0.03, 0.2, 0.48)), look: eyesP.clone().add(V3(0.02, -0.04, 0)), fov: 46 }), // 顔の前に物を見せる
  stare: () => ({ pos: eyesP.clone().add(V3(0, 0.19, 0.32)), look: eyesP.clone().add(V3(0, -0.02, 0)), fov: 44 }),
  crouch: () => { const k = knees(); return { pos: V3(eyesP.x - 0.02, k.y + 0.52, k.z + 0.24), look: eyesP.clone().add(V3(0, -0.05, 0)), fov: 46 }; },
  lap: () => ({ pos: lap0.clone().add(V3(0, 0.5, 0.27)), look: lap0.clone().add(V3(0, 0.02, -0.04)), fov: 52 }),
  table: () => ({ pos: PAPER_SPOT.clone().add(V3(-0.08, 0.44, 0.22)), look: PAPER_SPOT.clone().add(V3(-0.06, 0, -0.06)), fov: 50 }),
  side: () => ({ pos: V3(eyesP.x - 0.85, 1.5, eyesP.z + 0.2), look: eyesP.clone().add(V3(-0.1, -0.15, -0.15)), fov: 46 }), // 夫の右を回って後ろへ
  behind: () => { const h = H.point(G.fingers <= 5 ? 'handL' : 'handR'); return { pos: h.clone().add(V3(-0.05, 0.45, -0.28)), look: h.clone().add(V3(-0.03, -0.03, 0.05)), fov: 54 }; }, // 詰める方の手の後ろ
  neck: () => ({ pos: eyesP.clone().add(V3(-0.03, 0.14, 0.28)), look: eyesP.clone().add(V3(0.04, -0.1, 0)), fov: 50 }),
  crown: () => ({ pos: eyesP.clone().add(V3(-0.3, 0.32, 0.3)), look: H.point('head').add(V3(0, 0.09, 0.02)), fov: 48 }), // 頭のてっぺんを見下ろす（髪をつかむ・バリカン。2026-10-27） // 首筋に手が届く所まで踏み込んで、少し見下ろす（電気ショック。2026-10-27）
  door: () => ({ pos: SWITCH.clone().add(V3(-0.2, 0.28, -0.46)), look: SWITCH.clone().add(V3(0, -0.02, 0)), fov: 46 }), // 部屋の入り口の電気のスイッチ
  bandage: () => { const p = H.point(`cut${Math.max(1, G.fingers)}`); return { pos: p.clone().add(V3(-0.03, 0.27, -0.17)), look: p.clone(), fov: 46 }; }, // いま詰めた指のそば
  bow: () => ({ pos: base.pos.clone().add(V3(0, -0.04, -0.02)), look: base.pos.clone().add(V3(0, -0.8, -0.45)), fov: base.fov }), // うつむいて自分の手を見る
  cuffs: () => ({ pos: base.pos.clone(), look: base.pos.clone().add(V3(0, -0.75, -0.3)), fov: 46 }),
};
const viewOf = (name) => (name === 'base' || !VIEWS[name] ? base : VIEWS[name]());
let camT = 0, camGoal = 0, shake = 0, kickT = 9, kickAmp = 1;
const camPos = V3(), camLook = V3();
function updateCamera(dt) {
  camT += (camGoal - camT) * Math.min(1, dt * 3.2);
  const k = camT * camT * (3 - 2 * camT);
  base.pos.lerpVectors(POV.pos, CLOSE.pos, k);
  base.look.lerpVectors(POV.look, CLOSE.look, k);
  base.fov = POV.fov + (CLOSE.fov - POV.fov) * k;
  let fov = base.fov;
  camPos.copy(base.pos);
  camLook.copy(base.look);
  const v = W.view;
  if (v) {
    const a = viewOf(v.a), b = viewOf(v.b);
    camPos.lerpVectors(a.pos, b.pos, v.u);
    camLook.lerpVectors(a.look, b.look, v.u);
    fov = a.fov + (b.fov - a.fov) * v.u;
  }
  shake = Math.max(0, shake - dt * 2.5);
  const j = shake * shake * 0.035;
  kickT += dt;
  const kick = kickAmp * Math.exp(-kickT * 9) * Math.sin(kickT * 48); // 手が当たった時の、減っていく揺れ
  camera.position.copy(camPos).add(V3((Math.random() - 0.5) * j - 0.008 * kick, (Math.random() - 0.5) * j, 0));
  camera.fov = fitFov(fov, camera.aspect); // 縦長の画面（スマホの縦持ち）では広げる（view.js）
  camera.updateProjectionMatrix();
  camera.lookAt(camLook);
  camera.rotateZ(0.018 * kick);
}

// ---------- 画面
const WIFE = { // 行動を押した時の妻のセリフ（括弧はしたこと。声にする言葉は story.json の wife から。手を出す行動も一言言ってから: 2026-10-25 オーナー「1〜3を進めて」）
  push: () => (Math.random() < 0.5 ? story.asker.push : story.asker.push_alt), minimize: story.asker.minimize, tools: story.asker.tools, // 追及は2つの言葉のどちらか（2026-10-25 オーナー「私に隠し事はしないで〜〜！を追加して」）
  divorce: story.asker.divorce, mother: story.asker.mother, phone: story.asker.phone, cry: '（涙が止まらない）',
  silence: '（黙って見つめる）', rest: '（水を飲ませて、少し休ませた）', leave: story.asker.leave, feed: '（おにぎりを口に運んだ）', finger: story.asker.finger, shock: story.asker.shock, hair: story.asker.hair, clipper: story.asker.clipper,
  recheck: story.asker.recheck, slap: story.asker.slap, slapHard: story.asker.slapHard,
  sake: '（グラスに酒を注いで、口に当てた）', loosen: story.asker.loosen, record: story.asker.record,
};
// 縛られる側の名前（題名の画面で決める。2026-10-25 オーナー「夫の名前を決めれるようにして」）。字幕・札の「夫」（女性浮気版は「妻」）を名前に置き換える（「元夫」「夫婦」はそのまま）
const DEF = MODE === 'w' ? '妻' : '夫'; // 名前が空の時の呼び名
const NAME_KEY = MODE === 'w' ? 'uj_wname' : 'uj_hname';
let HNAME = DEF;
const nm = (t) => (HNAME === DEF || !t ? t : t.replace(MODE === 'w' ? /(?<!元)妻(?!婦)/g : /(?<!元)夫(?!婦)/g, HNAME));
try { $('hname').value = localStorage.getItem(NAME_KEY) || ''; } catch { /* 保存できない環境 */ }
// 音量（声・効果音・部屋の音。題名の画面のつまみ。前の値は次も使う。2026-10-26）。動かすと効果音は小さく鳴らして確かめられる
try { const v = JSON.parse(localStorage.getItem('uj_vol') || '{}'); for (const k of ['voice', 'se', 'amb']) if (v[k] !== undefined) { $(`vol_${k}`).value = Math.round(v[k] * 100); SE.setVolume(k, v[k]); } } catch { /* 保存できない環境 */ }
for (const k of ['voice', 'se', 'amb']) {
  $(`vol_${k}`).oninput = (e) => { SE.setVolume(k, e.target.value / 100); try { localStorage.setItem('uj_vol', JSON.stringify(SE.volumes())); } catch { /* 保存できない環境 */ } };
  $(`vol_${k}`).onchange = () => { SE.unlock(); if (k === 'se') SE.play('clink'); else if (k === 'voice') VOICE.play('夫', story.first); };
}
// 言葉の切り替え（題名の画面。2026-10-26 オーナー「英語、韓国語も入れて」）: 選ぶと ?lang= を付けて読み直す（小道具の画面の字なども作り直すため）。次からはその言葉
for (const b of document.querySelectorAll('.langRow button[data-lang]')) {
  b.classList.toggle('on', b.dataset.lang === I18N.lang);
  b.onclick = () => { if (b.dataset.lang === I18N.lang) return; const u = new URL(location.href); u.searchParams.set('lang', b.dataset.lang); location.href = u; };
}
// 夫が浮気した／妻が浮気した（女性浮気版。2026-10-26）: 選ぶと ?mode= を付けて読み直す（模型と台本が違う）。次からはその形
for (const b of document.querySelectorAll('.modeRow button[data-mode]')) {
  b.classList.toggle('on', b.dataset.mode === MODE);
  b.onclick = () => { if (b.dataset.mode === MODE) return; const u = new URL(location.href); u.searchParams.set('mode', b.dataset.mode); location.href = u; };
}
// 話し手の印: game.js の '夫' は縛られる側、'妻' は問い詰める側（女性浮気版でも同じ印。声の対応表の鍵も同じ）
function subtitle(who, text) {
  const label = who === '妻' ? t('あなた') : who === '夫' ? (HNAME === DEF ? t(DEF) : HNAME) : who ? t(who) : '';
  $('sub').innerHTML = text ? `${who ? `<b>${label}</b>` : ''}${nm(t(text))}` : '';
  // 夫婦のセリフ: 声があれば鳴らす。夫は口をその長さに合わせて動かす（無ければ字幕の長さで口だけ動かす）
  if (who === '夫' && text) voiceP = VOICE.play('夫', text).then((d) => { H.speak(I18N.lang === 'ja' ? text : t(text), d, VOICE.envelope('夫')); return d; }); // 口の形は話す言葉の文字から
  else if ((who === '妻' || who === '警察') && text) { voiceP = VOICE.play(who, text); H.speak(null); }
  else { voiceP = Promise.resolve(0); H.speak(null); }
}
let voiceP = Promise.resolve(0); // いま鳴らしている声の長さ（秒）。セリフの待ちを声の長さまで伸ばす
const hhmm = (t) => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
let cheekRed = 0, redTime = G.time; // 叩いた頬の赤み。ゲームの時間で1時間ほどかけて引く
// 夫の様子と近所の様子（数字は見せない。段の境目は G.fuzz でゲームごとにずれる。戻る時は境目から少し離れてから戻る＝行ったり来たりしない）
const COND = ['平気な顔をしている', '汗が浮いている', '血の気が引いてきた', '返事が鈍い', '息が浅い。長くはもたない']; // 曖昧に・物騒に（2026-10-25 オーナー「していいよ」）
const HOOD = ['静かだ', '隣の明かりがついた', '壁を叩かれた', '廊下で足音がする'];
const HUNG = ['', '・唾を飲み込んでいる', '・唇がひび割れている'];
const PALE = [0, 0.25, 0.55, 0.8, 1]; // 段ごとの顔色の悪さ（夫の顔に反映）
const hudLv = { cond: 0, hood: 0, hung: 0 };
function stage(v, ths, cur, worseIsLow) {
  const over = (t, m = 0) => (worseIsLow ? v < t - m : v >= t + m);
  let n = 0;
  for (const t of ths) if (over(t)) n++;
  if (n < cur) { n = cur; while (n > 0 && !over(ths[n - 1], -6)) n--; }
  return n;
}
function renderHud() {
  cheekRed *= Math.exp(-(G.time - redTime) / 60);
  redTime = G.time;
  H.setRed(cheekRed);
  $('day').textContent = t('{n}日目', { n: G.day });
  $('clock').textContent = hhmm(G.time);
  DRESS.setClock(G.time);
  hudLv.cond = stage(G.hp, G.fuzz.hp, hudLv.cond, true);
  hudLv.hung = stage(G.hunger, G.fuzz.hunger, hudLv.hung, false);
  hudLv.hood = stage(G.noise, G.fuzz.noise, hudLv.hood, false);
  $('cond').textContent = t(COND[hudLv.cond]) + t(HUNG[hudLv.hung]);
  H.setPale(PALE[hudLv.cond]);
  $('cond').className = `state ${hudLv.cond >= 3 ? 'bad' : hudLv.cond >= 2 || hudLv.hung >= 2 ? 'worse' : ''}`;
  $('hood').textContent = t(HOOD[hudLv.hood]);
  $('hood').className = `state ${hudLv.hood >= 3 ? 'bad' : hudLv.hood >= 2 ? 'worse' : ''}`;
  H.setTremble(G.stones ? 0.75 : G.fingers ? 0.6 : G.fear > 60 || G.pain > 60 ? 0.3 : 0);
  H.setBreath(1 + G.stress / 60);
}
function renderNotes() {
  const found = G.evidence.filter((e) => e.found);
  $('logHead').textContent = t('自白したこと {n}', { n: G.log.length });
  $('eviHead').textContent = t('手元の証拠 {n}', { n: found.filter((e) => !e.used).length });
  $('log').innerHTML = G.log.length ? G.log.map((e, i) => `<li>${i + 1}. ${t(e.partner)}<br><small>${whenPlace(e)}</small></li>`).join('') : `<li class="struck">${t('まだない')}</li>`;
  $('evi').innerHTML = G.evidence.filter((e) => e.found).map((e) => `<li class="${e.used ? 'struck' : ''}">${t(e.name)}${strTag(e)}<br><small>${t(e.desc)}</small></li>`).join('');
}
// 証拠の強さの札（2026-10-26 RESEARCH_evidence.md）: 強＝肉体関係を示す物・中＝組み合わせで効く物・弱＝単独では弱い物。関係ない物にも種類としての強さが付くので、札では見分けられない
const STR_LABEL = { 強: '強い証拠', 中: 'まあまあの証拠', 弱: '弱い証拠' };
const strTag = (e) => (e.strength ? `<em class="str ${e.strength === '強' ? 's3' : e.strength === '中' ? 's2' : 's1'}">${t(STR_LABEL[e.strength])}</em>` : '');
const whenPlace = (e) => t('{when}・{place}', { when: t(e.when), place: t(e.place) }); // 「先月・相手の部屋」（英語は頭を大文字に）
let actTab = '聞く'; // 狭い画面で出している札（聞く・責める・ほか）
function renderActions() {
  const av = available(G);
  const groups = { 聞く: [], 責める: [], ほか: [] };
  for (const [id, a] of Object.entries(ACTIONS)) groups[a.group].push(id);
  $('acts').innerHTML = '';
  const verdictBtn = () => { const v = document.createElement('button'); v.textContent = t('判決を出す'); v.className = 'verdict'; v.onclick = () => openVerdict(false); return v; };
  const tabs = document.createElement('div'); // 狭い画面だけ出す札（index.html の CSS）。広い画面は全部の段を並べる
  tabs.className = 'tabs';
  for (const g of Object.keys(groups)) { const b = document.createElement('button'); b.textContent = t(g); b.classList.toggle('on', g === actTab); b.onclick = () => { actTab = g; renderActions(); }; tabs.appendChild(b); }
  tabs.appendChild(verdictBtn());
  $('acts').appendChild(tabs);
  for (const [g, ids] of Object.entries(groups)) {
    const row = document.createElement('div');
    row.className = `row${g === actTab ? ' on' : ''}`;
    row.innerHTML = `<span>${t(g)}</span>`;
    for (const id of ids) {
      const b = document.createElement('button');
      const a = ACTIONS[id];
      b.innerHTML = `${t(labelOf(G, id))}<small>${a.min >= 60 ? t('{n}時間', { n: a.min / 60 }) : t('{n}分', { n: a.min })}</small>`; // 妻の言葉か、したこと。かかる時間も添える（朝までの計画が立つ）
      b.className = g === '責める' ? 'hard' : g === '聞く' ? 'ask' : '';
      b.disabled = !av[id];
      b.onclick = () => choose(id);
      row.appendChild(b);
    }
    if (g === 'ほか') row.appendChild(verdictBtn());
    $('acts').appendChild(row);
  }
  document.documentElement.style.setProperty('--subBottom', `${$('acts').offsetHeight + 8}px`); // 字幕はボタンのすぐ上（狭い画面ではボタンが何段にもなる）
}
function pick(title, items) { // items: [[値, 文字]]
  return new Promise((res) => {
    $('pickTitle').textContent = title;
    $('pickOpts').innerHTML = '';
    for (const [v, label] of [...items, [null, t('やめる')]]) {
      const b = document.createElement('button');
      b.innerHTML = label;
      b.onclick = () => { $('pick').classList.remove('on'); res(v); };
      $('pickOpts').appendChild(b);
    }
    $('pick').classList.add('on');
  });
}

// ---------- 演出
async function flash(op = 0.7, t = 0.09) { $('flash').style.transition = 'none'; $('flash').style.opacity = op; await wait(0.02); $('flash').style.transition = `opacity ${t * 4}s`; $('flash').style.opacity = 0; }
async function fade(text, t = 1.4) { $('fade').textContent = text; $('fade').style.transition = 'opacity .5s'; $('fade').style.opacity = 1; await wait(t); $('fade').style.opacity = 0; await wait(0.5); }
function black(on, text = '', sec = 0) { $('fade').textContent = text; $('fade').style.transition = sec ? `opacity ${sec}s` : 'none'; $('fade').style.opacity = on ? 1 : 0; }
async function phone(html, t = 2.4) { $('phonebody').innerHTML = html; $('phoneui').classList.add('on'); await wait(t); $('phoneui').classList.remove('on'); }

// 手に持つ（妻の手の「持つ所」に付ける）・離す
function holdProp(side, obj, pos = [0, 0, 0], rot = [0, 0, 0]) { W.grip(side).add(obj); obj.position.set(...pos); obj.rotation.set(...rot); obj.visible = true; }
const dropProp = (obj) => obj.removeFromParent();

// 夫と物の目印（clips.js の at）
const TARGETS = {
  cheekL: () => H.cheekWorld('L'), eyes: () => H.eyesWorld(), face0: () => eyesP.clone(), stone: () => PR.stones.position.clone(), paperSpot: () => PAPER_SPOT.clone(), switch: () => SWITCH.clone(),
  ...Object.fromEntries(['chin', 'underChin', 'mouth', 'shoulderL', 'shoulderR', 'kneeL', 'kneeR', 'pocket', 'pocketSide', 'handL', 'handR', 'pinkyL'].map((n) => [n, () => H.point(n)])),
  cutNext: () => H.point(`cut${Math.max(1, G.fingers)}`), // いま詰める指（act() で数が増えた後に動きが始まる）
  hairTop: () => H.point('head').add(V3(0, 0.1, 0.03)), // 頭のてっぺん（髪をつかむ・バリカン。2026-10-27）
};
const wifeFace = () => camera.position.clone();

// 行動ごとの動き（clips.js）。stones は乗せる／下ろす、ビンタは強さで変わる
const STAGE = {
  slap: () => ({ ...C.slap(false), hard: false }),
  slapHard: () => ({ ...C.slap(true), hard: true }),
  push: () => C.point,
  baseline: () => C.liftChin,
  minimize: () => C.caress,
  evidence: () => C.showPhone,
  recheck: () => C.kneel,
  phone: () => (G.stones ? C.takePhoneSide : C.takePhone), // 重しが乗っている時は太ももの外側から
  stones: (o) => (o.on ? C.stonesOn : C.stonesOff),
  tools: () => C.showTool,
  divorce: () => C.slamPaper,
  mother: () => C.dial,
  cry: () => C.coverFace,
  silence: () => C.stare,
  rest: () => C.water,
  feed: () => C.feed,
  finger: () => C.fingerCut(G.fingers <= 5 ? 'l' : 'r'), // 左手の5本が済むと右手
  shock: () => C.shock,
  hair: () => C.hair,
  blind: (o) => (o.on ? C.blindOn : C.blindOff),
  clipper: () => C.clipper,
  leave: () => C.leaveRoom,
  sake: () => C.sake,
  loosen: () => C.loosen,
  record: () => C.record,
};
const ON = { // 動きの合図 → 演出（どの動きでも同じ名前なら同じこと）
  cower: () => H.react('cower'),
  hit: (c) => { // 手が頬に当たった
    H.react('slap', c.hard ? 1.35 : 0.6);
    H.react('up');
    kickT = 0; kickAmp = c.hard ? 1.5 : 0.65;
    flash(c.hard ? 0.2 : 0.1, 0.05);
    SE.play('slap', c.hard ? 1.25 : 0.7);
    subtitle('', c.hard ? '（バチンッ）' : '（パシッ）');
    cheekRed = Math.min(1, cheekRed + (c.hard ? 0.7 : 0.35));
    H.setRed(cheekRed);
  },
  watchHand: () => H.watch(() => W.palmWorld('r')),
  watchFace: () => H.watch(wifeFace),
  watchWife: () => H.watch(wifeFace),
  unwatch: () => H.watch(null),
  lift: () => H.react('cower'),
  unlift: () => H.react('up'),
  // スマホはどれも同じ持ち方（clips.js の PHONE_AT）: 曲げた指の腹で裏を支え、親指は横の縁に当てる。見せる時も自分で見る時も、手の向きだけが違う
  phoneIn: () => holdProp('r', PR.phoneH, C.PHONE_AT),
  takeOut: () => holdProp('r', PR.phoneH, C.PHONE_AT),
  myPhoneIn: () => holdProp('r', PR.phoneW, C.PHONE_AT),
  pliersIn: () => holdProp('r', PR.pliers),
  show: () => { if (PR.pliers.parent) { PR.toolbox.visible = true; H.react('flinch'); } },
  click: () => { SE.play('click'); PR.pliers.userData.open(0.22); setTimeout(() => PR.pliers.userData.open(0), 90); },
  paperIn: () => holdProp('r', PR.paper, [0, 0.03, 0.003], [Math.PI, 0, 0]),
  slam: () => { // 紙を置いて、手のひらで叩く
    scene.attach(PR.paper);
    PR.paper.position.copy(PAPER_SPOT); PR.paper.rotation.set(-Math.PI / 2, 0, 0.25);
    SE.play('slam'); shake = 0.35; H.react('flinch');
  },
  dial: () => SE.play('ring'),
  place: () => { SE.play('thud'); shake = 0.5; H.react('droop', 0.6); }, // 漬物石が膝に乗った
  gone: () => { PR.stones.visible = false; PR.stones.position.copy(lap0); },
  stare: () => { for (let i = 0; i < 3; i++) setTimeout(() => SE.play('tick'), 400 + i * 1000); },
  cupIn: () => holdProp('r', PR.cup),
  drink: () => H.setMouth(0.22),
  drunk: () => H.setMouth(0),
  onigiriIn: () => { PR.onigiri.children[0].scale.set(1, 1, 1); PR.onigiri.children[0].position.y = 0.04; holdProp('r', PR.onigiri); },
  open: () => H.setMouth(0.42),
  bite: () => { PR.onigiri.userData.bite(); H.setMouth(0.05, 0.16); setTimeout(() => H.setMouth(0), 1600); },
  knife: () => { PR.boardKnife.visible = false; holdProp('r', PR.knife); },
  pin: () => H.react('flinch', 1.5),
  cut: () => { // 案A: 当たる瞬間に暗転して音だけ。暗いうちに指を詰め、布を巻く
    black(true);
    SE.play('chop');
    subtitle('', '（ダンッ）');
    dropProp(PR.knife); PR.boardKnife.visible = true;
    H.cutFinger(G.fingers); H.react('flinch', 2.5); H.setFace('pain'); H.setTremble(0.9);
  },
  reveal: () => black(false, '', 0.9),
  lightsOff: () => { SE.play('click'); lightsSaved = [pendant.intensity, fill.intensity]; pendant.intensity = 0; fill.intensity = 0.04; },
  sakeIn: () => holdProp('r', PR.sake),
  loosen: () => H.react('up'),
  recIn: () => holdProp('r', PR.phoneR, C.PHONE_AT),
  recOn: () => SE.play('click'),
  // 電気ショック（2026-10-27）: 工具箱からスタンガン（箱も見える）→ 顔の前で火花 → 首筋に当てている間（zap〜zapEnd）は体がはねて、部屋の電気がまたたく
  stunIn: () => { holdProp('r', PR.stun); PR.toolbox.visible = true; },
  arc: () => { PR.stun.userData.arc(true); SE.play('crackle'); flash(0.07, 0.04); H.react('flinch', 0.7); subtitle('', '（バチバチッ）'); setTimeout(() => { if (!zapOn) PR.stun.userData.arc(false); }, 170); },
  zap: () => {
    zapOn = true; PR.stun.userData.arc(true);
    SE.play('zap'); flash(0.3, 0.06); shake = 0.45; kickT = 0; kickAmp = 0.5;
    subtitle('', '（バヂッ！！）');
    H.react('shock', 1); H.setFace('pain'); H.setTremble(1);
    zapLights = [pendant.intensity, fill.intensity];
  },
  zapEnd: () => { zapOn = false; PR.stun.userData.arc(false); H.react('shockEnd'); H.setTremble(0.7); if (zapLights) { [pendant.intensity, fill.intensity] = zapLights; zapLights = null; } },
  // 髪をつかむ・目隠し・バリカン（2026-10-27）
  grab: () => { H.react('up'); H.watch(wifeFace); H.setTremble(0.5); },
  release: () => { H.watch(null); H.react('droop', 0.4); },
  blindOn: () => { H.setBlind(true); H.react('flinch', 0.8); },
  blindOff: () => { H.setBlind(false); H.react('up'); },
  clipperIn: () => { holdProp('r', PR.clipper); PR.toolbox.visible = true; },
  buzzOn: () => { SE.play('clipper'); subtitle('', '（ヴィィィ…）'); H.setTremble(0.6); },
  pass: () => { SE.play('clipper'); H.react('flinch', 0.5); }, // 撫でるたびに鳴らす（音は1回ぶん 1.1秒）
  shaved: () => { H.shave(); H.react('droop', 0.8); },
  buzzOff: () => H.setTremble(0.3),
  recPlace: () => { scene.attach(PR.phoneR); PR.phoneR.position.copy(PAPER_SPOT).add(V3(0.22, 0.004, 0.08)); PR.phoneR.rotation.set(-Math.PI / 2, 0, 0.35); }, // 画面を上にして置く
};
let lightsSaved = null;
let zapOn = false, zapLights = null; // 電気を当てている間（火花を揺らし、電気をまたたかせる）
const HELD = () => [PR.phoneH, PR.phoneW, PR.phoneR, PR.pliers, PR.stun, PR.clipper, PR.cup, PR.sake, PR.onigiri, PR.knife];

let cur = null; // いま再生中の動き { clip, at(合図) → Promise }
function perform(id, opt = {}) {
  const make = STAGE[id];
  if (!make) { cur = null; return null; }
  const clip = make(opt);
  const fired = new Set(), waiters = {};
  const me = { clip, at: (name) => (fired.has(name) ? Promise.resolve() : new Promise((r) => (waiters[name] ||= []).push(r))) };
  const fire = (name) => { fired.add(name); ON[name]?.(clip); (waiters[name] || []).forEach((r) => r()); delete waiters[name]; };
  H.watch(null);
  HELD().forEach(dropProp);
  me.done = W.play(clip, { targets: TARGETS, onEvent: fire }).then(() => { fire('end'); if (cur === me) { H.watch(null); HELD().forEach(dropProp); } });
  cur = me;
  return me;
}
const at = (name) => cur?.at(name) ?? Promise.resolve();

// 漬物石は、動きの stone のキー（膝の上の点から [右, 上, 前]）に沿って運ばれる
function updateStone() {
  const keys = cur?.clip.stone;
  if (!keys || !W.playing) return;
  const t = W.time;
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)];
  const u0 = Math.max(0, Math.min(1, (t - k0.t) / Math.max(1e-6, k1.t - k0.t)));
  const u = k1.ease === 'in' ? u0 * u0 : u0 * u0 * (3 - 2 * u0);
  PR.stones.visible = true;
  PR.stones.position.copy(lap0).add(V3(...k0.p).lerp(V3(...k1.p), u));
}
// 手錠の鎖は、両手首の輪の間に並べる
function updateChain() {
  if (!PR.chain[0].visible) return;
  const a = PR.cuffs[0].getWorldPosition(V3()), b = PR.cuffs[1].getWorldPosition(V3());
  PR.chain.forEach((m, i) => { m.position.lerpVectors(a, b, (i + 1) / (PR.chain.length + 1)); m.rotation.set(0, (i % 2) * Math.PI / 2, Math.PI / 2); });
}

async function fx(e) {
  if (e.name === 'slap') { await at('hit'); await wait(0.35); } // 当たってから少しして夫がしゃべる（手を引く動きはその間も続く）
  if (e.name === 'cry') { await at('cover'); renderer.domElement.style.transition = 'filter .6s'; renderer.domElement.style.filter = 'blur(3px) saturate(.7)'; await wait(1.4); renderer.domElement.style.filter = 'none'; }
  if (e.name === 'silence') { await at('stare'); const i0 = pendant.intensity; pendant.intensity = i0 * 0.75; subtitle('', '（チッ…チッ…チッ…）'); await wait(2.6); pendant.intensity = i0; }
  if (e.name === 'rest') { await at('drunk'); await wait(0.6); await fade(t('30分後…')); }
  if (e.name === 'sake') { await at('drunk'); await wait(0.4); }
  if (e.name === 'loosen') { await at('loosen'); await wait(0.5); }
  if (e.name === 'record') { await at('recPlace'); await wait(0.6); }
  if (e.name === 'finger') { await at('cut'); await wait(0.4); } // 暗いうちに悲鳴（夫のセリフ）
  if (e.name === 'shock') { await at('zapEnd'); await wait(0.25); } // 電気が切れてから、息を吐くように声
  if (e.name === 'hair') { await at('grab'); await wait(0.5); } // つかまれたまま言う
  if (e.name === 'clipper') { await at('shaved'); await wait(0.4); }
  if (e.name === 'leave') { // 電気を消して出ていき、6時間後に戻って電気をつける
    await at('lightsOff');
    await wait(0.9);
    $('fade').textContent = t('6時間後…'); $('fade').style.transition = 'opacity .5s'; $('fade').style.opacity = 1;
    await wait(1.8);
    if (lightsSaved) { [pendant.intensity, fill.intensity] = lightsSaved; lightsSaved = null; }
    $('fade').style.opacity = 0;
    await wait(0.5);
  }
}
async function prop(e) {
  if (e.name === 'stones') {
    if (e.on) await at('place');
    else { await at('lift'); H.react('up'); }
  }
  if (e.name === 'tools') { await at('show'); await wait(0.5); }
  if (e.name === 'blind') { await at(e.on ? 'blindOn' : 'blindOff'); await wait(0.5); }
  if (e.name === 'divorce') { await at('slam'); await wait(0.3); }
  if (e.name === 'phone_call') { await at('dial'); await phone(`<div class="app">${t('電話')}</div><div style="font-size:18px;margin:12px 0">${t('お義母さん')}</div><div style="color:#888">${t('発信中…')}</div>`, 2.0); }
  if (e.name === 'evidence') { await at('show'); await phone(`<div class="msg">${t(e.item.name)}</div><div style="font-size:12px;color:#555">${t(e.item.desc)}</div>`, 2.2); }
  if (e.name === 'food') { await at('bite'); await wait(0.8); }
}
async function say(e) {
  if (e.face) H.setFace(e.face);
  if (e.react) H.react(e.react);
  if (e.push) camGoal = 1;
  subtitle(e.who, e.text);
  if (e.tell) setTimeout(() => H.playTell(e.tell), 380); // 話し始めてすぐ、一瞬だけ
  const vd = e.who ? await voiceP : 0; // 夫婦の声の長さまで待つ
  await wait(Math.max(1.6, 0.075 * e.text.length + 0.8, vd + 0.4));
  if (e.after) H.setFace(e.after);
  if (e.push) { await wait(0.4); camGoal = 0; }
}
async function play(events) {
  document.body.classList.add('busy');
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'say') await say(e);
    else if (e.type === 'fx') await fx(e);
    else if (e.type === 'prop') await prop(e);
    else if (e.type === 'phone') { await at('look'); events.splice(i + 1, 0, ...(await browsePhone())); } // スマホの中を自分で探す。画面の中で起きた出来事（朝が来た）は続けて見せる
    else if (e.type === 'log') renderNotes();
    else if (e.type === 'state') renderHud();
    else if (e.type === 'end') { W.release(); return endGame(e.reason); }
  }
  W.release(); // 話が終わるまで止めていた形（しゃがむ・肩をつかむ）を戻す
  if (cur) await Promise.race([cur.done, wait(3)]); // 妻が戻り切ってから次を押せるように（途中で切ると立ち位置が飛ぶ）
  document.body.classList.remove('busy');
  renderActions();
}
// スマホの中を自分で探す画面（2026-10-26 オーナー「スマホの中を自分で探す」）: 家の画面（アプリ7つ。1回に3つまで開ける）→ 開いたアプリの行（何でもない行に証拠が混ざる）→ 1行の中身 → 怪しければ「証拠にする」（手帳に載る）。
// 画面の中の手（look・take）は遊びの中身と控えだけ進め、夫のセリフや動きは挟まない。開く＝2分・証拠にする＝1分なので、朝が来ることもある → その出来事は返してから play() が続けて見せる
const APP_ICONS = { LINE: '💬', 写真: '🖼', カレンダー: '📅', マップ: '📍', メール: '✉️', 通話: '📞', 財布: '👛' };
function browsePhone() {
  return new Promise((res) => {
    const ui = $('phoneui'), body = $('phonebody');
    const deferred = [];
    let app = null;
    const close = () => { ui.classList.remove('on', 'browse'); body.innerHTML = ''; res(deferred); };
    const quick = (id, arg) => {
      for (const e of act(G, id, arg)) if (e.type !== 'rows' && e.type !== 'found' && e.type !== 'state') deferred.push(e);
      ACTS.push([id, arg]); saveGame();
      renderHud(); renderNotes();
      if (G.ended) close();
    };
    const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html !== undefined) d.innerHTML = html; return d; };
    const btn = (cls, html, on, disabled = false) => { const b = el('button', cls, html); b.onclick = on; b.disabled = disabled; return b; };
    const icon = (name) => `<i>${APP_ICONS[name] || '📱'}</i>`;
    const home = () => {
      app = null; body.innerHTML = '';
      body.appendChild(el('div', 'bar', `<span>${t('{H}のスマホ')}</span><span>${t('あと{n}つ開ける', { n: G.looks })}</span>`));
      const grid = el('div', 'home');
      for (const name of Object.keys(G.phoneRows)) {
        const opened = G.opened.includes(name);
        grid.appendChild(btn(opened ? 'opened' : '', `${icon(name)}${t(name)}`, () => { if (!opened) { SE.play('click'); quick('look', name); } if (!G.ended) list(name); }, !opened && G.looks <= 0));
      }
      body.appendChild(grid);
      body.appendChild(btn('ret', t('スマホを返す'), close));
    };
    const list = (name) => {
      app = name; body.innerHTML = '';
      body.appendChild(el('div', 'bar', `<span>${icon(name)} ${t(name)}</span><span>${t('あと{n}つ開ける', { n: G.looks })}</span>`));
      const rows = el('div', 'rows');
      for (const r of appRows(G, name)) {
        const took = !!(r.ev && r.ev.found);
        rows.appendChild(btn(took ? 'took' : '', `${t(r.ev ? r.ev.row : r.t)}<small>${took ? t('手帳に書いた') : t(r.ev ? r.ev.desc : r.d)}</small>`, () => detail(r)));
      }
      body.appendChild(rows);
      body.appendChild(btn('ret', t('戻る'), home));
    };
    const detail = (r) => {
      body.innerHTML = '';
      body.appendChild(el('div', 'bar', `<span>${icon(app)} ${t(app)}</span>`));
      body.appendChild(el('div', 'detail', `<h4>${t(r.ev ? r.ev.row : r.t)}${r.ev && r.ev.found ? strTag(r.ev) : ''}</h4>${t(r.ev ? r.ev.desc : r.d)}`));
      const acts = el('div', 'act');
      acts.appendChild(btn('', t('戻る'), () => list(app)));
      if (r.ev) acts.appendChild(btn('take', r.ev.found ? t('手帳に書いた') : t('証拠にする'), () => { SE.play('chime'); quick('take', r.ev.id); if (!G.ended) detail(r); }, r.ev.found));
      body.appendChild(acts);
    };
    ui.classList.add('on', 'browse');
    home();
  });
}
const LINE_FIRST = new Set(['push', 'minimize', 'phone', 'silence', 'recheck']); // セリフを言い終えてから夫が答える行動
async function choose(id) {
  let arg;
  if (id === 'evidence') { arg = await pick(t('どの証拠を突きつける？'), G.evidence.filter((e) => e.found && !e.used).map((e) => [e.id, `${t(e.name)}${strTag(e)}<br><small>${t(e.desc)}</small>`])); if (arg === null) return; }
  SE.unlock();
  const on = id === 'blind' ? !G.blind : !G.stones; // 乗せる／下ろす、目隠しをする／外す
  const w = id === 'stones' ? (on ? story.asker.stones : '（重しを下ろした）') : id === 'blind' ? (on ? story.asker.blind : '（目隠しを外した）') : typeof WIFE[id] === 'function' ? WIFE[id]() : WIFE[id];
  document.body.classList.add('busy');
  if (w) subtitle('妻', w);
  perform(id, { on });
  if (w) { const vd = await voiceP; await wait(LINE_FIRST.has(id) ? Math.max(0.9, vd + 0.25) : 0.3); } // 妻が言い終わってから夫が答える
  const events = act(G, id, arg);
  ACTS.push([id, arg]); saveGame(); // 途中で消えても続きから（控え）
  await play(events);
}

// ---------- 判決・終わりの後の場面・答え合わせ・連行
const EPI = makeEpilogue({ scene, camera, H, W, PR, room: room.scene, dress: DRESS, night: [pendant, fill, moon, hemi, DRESS.under], subtitle });
$('skip').onclick = () => EPI.skip();
async function openVerdict(forced) {
  const keep = forced ? [['keep', G.day < MAX_DAYS ? t('会社に「休みます」と電話して、続ける（{n}日目へ）', { n: G.day + 1 }) : t('会社をもう一日休ませる（もう怪しまれている）')]] : [];
  const v = await pick(forced ? nm(t('朝7時。夫は会社に行く時間だ。判決は？')) : t('判決は？'), [['forgive', t('許す')], ['pledge', t('誓約書を書かせて許す')], ['divorce', t('離婚して慰謝料をとる')], ...keep]);
  if (v === null) { if (forced) return openVerdict(true); return; }
  if (v === 'keep') { const ev = keepGoing(G); ACTS.push(['keep']); saveGame(); document.body.classList.add('busy'); return play(ev); }
  const r = verdict(G, v);
  document.body.classList.add('busy', 'ending');
  await EPI.play(r.epilogue); // 判決のあとの暮らし（許した・誓約書: 家の朝、離婚: それぞれの部屋）
  showResult(r);
}
// 警察の声（2026-10-25 オーナー「警察のセリフも入れて」）: 暗転の文字に出しながら鳴らし、言い終わるまで待つ
async function police(key) {
  const text = story.police[key];
  $('fade').textContent = t('「{x}」', { x: t(text) });
  const d = await VOICE.play('警察', text);
  await wait(Math.max(2.4, 0.075 * text.length + 0.8, d + 0.5));
}
// 連行: うつむくと、自分の両手首に手錠がかかっている（2026-10-25 オーナー「そうなったら妻は警察に連行」）。警官の一言（key）のあとで
async function arrest(key = 'arrest') {
  HELD().forEach(dropProp);
  cur = null;
  W.play(C.cuffed, { targets: TARGETS });
  W.bones.hand_r.add(PR.cuffs[0]); W.bones.hand_l.add(PR.cuffs[1]);
  PR.chain.forEach((m) => { m.visible = true; });
  black(false, '', 1.2);
  await wait(1.6);
  const text = story.police[key];
  subtitle('警察', text);
  const d = await voiceP;
  await wait(Math.max(2.6, 0.075 * text.length + 0.8, d + 0.4));
  subtitle('', '（あなたは手錠をかけられ、警察に連行された）');
  await wait(3.2);
}
async function endGame(reason) {
  renderHud();
  document.body.classList.add('busy');
  if (reason !== 'morning') document.body.classList.add('ending');
  if (reason === 'morning') { document.body.classList.remove('busy'); subtitle('', '（カーテンの外が明るくなってきた）'); await wait(1.5); return openVerdict(true); }
  if (reason === 'death') {
    H.die();
    H.setRed(0);
    await wait(1.4);
    subtitle('', '（夫が動かない。…息を、していない）');
    await wait(2.6);
    SE.play('siren');
    black(true, t('遠くからサイレンが近づいてくる'), 1.2);
    await wait(4.2);
    SE.play('chime');
    $('fade').textContent = t('ピンポーン。');
    await wait(1.0);
    await police('door_death');
    subtitle('', '');
    await arrest('arrest_death');
  }
  if (reason === 'missing') {
    SE.play('chime');
    black(true, t('ピンポーン。「{x}さん、大丈夫ですか？ 会社の者です」', { x: t(['佐藤', '鈴木', '田中'][G.seed % 3]) }), 0.6);
    await wait(3.4);
    $('fade').textContent = t('同僚はすぐに警察を呼んだ');
    await wait(2.4);
    SE.play('chime');
    await police('door_missing');
    subtitle('', '');
    await arrest('arrest');
  }
  if (reason === 'police') {
    SE.play('chime');
    black(true, t('ピンポーン。'), 0.6);
    await wait(1.0);
    await police('door_police');
    $('fade').textContent = nm(t('椅子に縛られた夫を見て、警官の顔色が変わった'));
    await wait(2.6);
    subtitle('', '');
    await arrest('arrest');
  }
  if (reason === 'escape') { // 縄をゆるめた後に責めて、逃げられた
    SE.play('chair');
    H.react('flinch', 2);
    await wait(1.2);
    black(true, nm(t('夫は椅子を蹴って立ち上がり、玄関から飛び出していった')), 0.5);
    await wait(0.8);
    SE.play('door');
    H.root.visible = false;
    await wait(3.0);
    subtitle('', '');
  }
  showResult(verdict(G, null));
}
const SHARE_TAG = '#浮気した夫に全部吐かせる'; // 結果を貼る時の札（t() を通さない。妻版でも同じ）
function showResult(r) {
  document.body.classList.remove('busy');
  const tellLabel = t(H.TELLS[r.reveal.tell]?.label || r.reveal.tell);
  const aff = r.reveal.affairs.map((a) => `<li class="${a.confessed ? 'got' : 'hid'}">${t(a.partner)}${a.confessed ? '' : `<span class="tag">${t('隠したまま')}</span>`}<br><small>${whenPlace(a)}</small></li>`).join('');
  const hits = t('ビンタ 軽く{a}回・思い切り{b}回', { a: r.reveal.slaps, b: r.reveal.hardSlaps }) + (r.reveal.fingers ? t('・指を{n}本詰めた', { n: r.reveal.fingers }) : '') + (r.reveal.shocks ? t('・電気ショック{n}回', { n: r.reveal.shocks }) : '') + (r.reveal.hairPulls ? t('・髪をつかんだ{n}回', { n: r.reveal.hairPulls }) : '') + (r.reveal.shaved ? t('・髪を刈った') : '');
  $('resultCard').innerHTML = `<div class="rank">${r.rank}</div><h2>${nm(t(r.title))}</h2><p class="story">${nm(t(r.text))}</p>
    <h3>${t('答え合わせ：本当は{n}回（吐かせたのは{m}回）', { n: r.reveal.count, m: r.reveal.told })}</h3><ul>${aff}</ul>
    <h3>${t('この{H}は')}</h3>
    <dl class="stats"><dt>${t('嘘の癖')}</dt><dd>${tellLabel}</dd><dt>${t('手を上げた')}</dt><dd>${hits}</dd><dt>${t('責めの強さ')}</dt><dd>${r.reveal.force}${r.coercion ? t('（責めすぎ）') : ''}</dd>${r.reveal.rambles ? `<dt>${t('関係ない話')}</dt><dd>${t('頭が回らず {n}回', { n: r.reveal.rambles })}</dd>` : ''}</dl>
    ${r.reveal.perfect ? `<p class="praise">${t('手を上げずに全部吐かせた。江戸の吟味役も唸る腕前です。')}</p>` : ''}
    <p class="fiction">${t('この物語はフィクションです。')}</p>
    <div class="opts"><button id="again">${t('もう一度（別の夫）')}</button><div class="share"><button id="shareCopy">${t('結果をコピー')}</button></div></div>`;
  $('result').classList.add('on');
  clearSave(); // 終わった対局は続きから出さない
  $('again').onclick = () => { location.search = ''; };
  // 結果を貼る（2026-10-26 出す準備）: ランクと本当の回数を一言に。URL は canonical（サイトに置いた時の住所）、無ければ ?seed などを除いたこのページ。
  // ゲームの札 #浮気した夫に全部吐かせる を添える（妻版・英語・韓国語も同じ札。2026-10-26 オーナー「このゲームのハッシュタグを」）
  const url = new URL('./', location.href).href;
  const share = `${t('『浮気した夫に全部吐かせる』ランク{r}。本当は{n}回、吐かせたのは{m}回。', { r: r.rank, n: r.reveal.count, m: r.reveal.told })}\n${url}\n${SHARE_TAG}`;
  $('shareCopy').onclick = async () => { try { await navigator.clipboard.writeText(share); $('shareCopy').textContent = t('コピーした'); } catch { window.prompt(t('結果をコピー'), share); } };
}

// ---------- 途中で消えても続きから（2026-10-26 オーナー「1-6進めて」の 4）
// 真相も答えも seed と押した行動の列で決まる（game.js は自分の乱数だけを使う）ので、seed と行動の列だけを控え（localStorage の uj_save）、
// 読み直した時に同じ順でやり直す。台本が変わったら（相手や行動の数が違う）古い控えは使わない
const SAVE_KEY = 'uj_save';
const storyKey = () => [story.partners.length, story.whens.length, story.places.length, story.evidence.real.length, story.evidence.decoy.length, Object.keys(ACTIONS).length].join('.');
let ACTS = []; // 押した行動 [[id, arg]]。朝の「続ける」は ['keep']
function saveGame() { try { if (G.ended) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, JSON.stringify({ seed: G.seed, k: storyKey(), m: MODE, name: HNAME === DEF ? '' : HNAME, acts: ACTS })); } catch { /* 保存できない環境 */ } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* 保存できない環境 */ } }
function loadSave() { // 控えをやり直した状態。終わっていたら（朝の判決待ちも含む）無し。夫が浮気／妻が浮気が違う控えも使わない
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s || s.k !== storyKey() || (s.m || 'h') !== MODE || !Array.isArray(s.acts) || !s.acts.length) return null;
    const g = newGame(story, s.seed);
    for (const [id, arg] of s.acts) { if (id === 'keep') keepGoing(g); else act(g, id, arg); }
    return g.ended ? null : { s, g };
  } catch { return null; }
}
function restoreScene() { // やり直した状態を見た目に（膝の重し・詰めた指・テーブルの離婚届と工具箱・録音中のスマホ。頬の赤みは引いたことにする）
  if (G.stones) { PR.stones.visible = true; PR.stones.position.copy(lap0); }
  for (let i = 1; i <= G.fingers; i++) H.cutFinger(i);
  if (G.toolShows || G.shocks || G.shaved) PR.toolbox.visible = true;
  if (G.shaved) H.shave();
  if (G.blind) H.setBlind(true);
  if (G.divorceUsed) { scene.add(PR.paper); PR.paper.visible = true; PR.paper.position.copy(PAPER_SPOT); PR.paper.rotation.set(-Math.PI / 2, 0, 0.25); }
  if (G.recording) { scene.add(PR.phoneR); PR.phoneR.visible = true; PR.phoneR.position.copy(PAPER_SPOT).add(V3(0.22, 0.004, 0.08)); PR.phoneR.rotation.set(-Math.PI / 2, 0, 0.35); }
}

// ---------- 始める
// 画面のざらつき（映画のような粒子）: 小さな雑音の絵を敷き詰めて、少しずつずらす（index.html の #grain）
{
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d'), img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
}
$('startText').textContent = t(story.start);
$('notes').onclick = () => $('notes').classList.toggle('open'); // 狭い画面では、たたんだ手帳を押すと開く
H.setFace('fear', true);
renderHud(); renderNotes(); renderActions();
$('go').onclick = async () => {
  clearSave(); // 新しく始める（前の途中の控えは捨てる）
  HNAME = $('hname').value.trim().slice(0, 8) || DEF;
  I18N.setName(HNAME === DEF ? '' : HNAME);
  try { localStorage.setItem(NAME_KEY, HNAME === DEF ? '' : HNAME); } catch { /* 保存できない環境 */ }
  $('condLab').textContent = t('{H}の様子');
  SE.unlock(); SE.ambient('night'); $('start').classList.remove('on'); subtitle('', story.start); H.react('up'); await wait(3.2); subtitle('夫', story.first); await wait(2.2); subtitle('', ''); };
window.__act = (id, arg) => { perform(id, { on: id === 'blind' ? !G.blind : !G.stones }); return play(act(G, id, arg)); };
window.__G = () => G;
// 終わりの後の場面だけを見る（撮影・確かめ用）: __epi('warm'|'cold'|'phone'|'apart'|'apartPhone')
window.__epi = (kind) => {
  $('start').classList.remove('on');
  document.body.classList.add('busy', 'ending');
  const info = kind.startsWith('apart') ? { scene: 'apart', amount: 150, coercion: false, partner: kind === 'apartPhone' ? 'アヤ' : null } : { scene: 'home', mood: kind, partner: kind === 'phone' ? 'アヤ' : null, later: '半年後', tell: G.tell };
  return EPI.play(info);
};
Object.assign(window, { __H: H, __W: W, __camera: camera, __PR: PR, __end: endGame, __renderer: renderer, __scene: scene, __EPI: EPI });
// 読み終わった: 「始める」を押せるようにし、途中の控えがあれば「続きから」も出す
$('go').disabled = false; $('go').dataset.i18n = '始める'; $('go').textContent = t('始める');
const SAVED = q.has('seed') ? null : loadSave(); // ?seed で開いた時は控えを使わない（撮影・確かめ用）
if (SAVED) {
  const b = $('resume');
  b.hidden = false;
  b.textContent = t('続きから（{n}日目 {t}）', { n: SAVED.g.day, t: hhmm(SAVED.g.time) });
  b.onclick = async () => {
    G = SAVED.g; ACTS = SAVED.s.acts;
    HNAME = SAVED.s.name || DEF; $('hname').value = SAVED.s.name || '';
    I18N.setName(SAVED.s.name || '');
    $('condLab').textContent = t('{H}の様子');
    SE.unlock(); SE.ambient('night'); $('start').classList.remove('on');
    restoreScene(); renderHud(); renderNotes(); renderActions();
    subtitle('', '（続きから）'); await wait(1.4); subtitle('', '');
    if (G.looks > 0 && ['phone', 'look', 'take'].includes(ACTS[ACTS.length - 1]?.[0])) { document.body.classList.add('busy'); await play(await browsePhone()); } // スマホの中を探している途中だった
  };
}
window.__ready = true;

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
function tick(dt) {
  H.update(dt);
  EPI.tick(dt); // 終わりの後の場面: 夫の手・カメラ・合図
  W.advance(dt);
  if (EPI.used) W.pose(EPI.eye, EPI.look);
  else {
    updateStone();
    if (zapOn) { PR.stun.userData.flicker(); pendant.intensity = zapLights[0] * (0.35 + Math.random() * 0.9); fill.intensity = zapLights[1] * (0.6 + Math.random() * 0.6); } // 電気を当てている間、火花と部屋の電気がまたたく
    updateCamera(dt);
    W.pose(camPos, camLook); // 妻の体はカメラ（揺れの前）に合わせる
    updateChain();
  }
  H.updateView(camera);
  renderer.render(scene, camera);
}
const clock = new THREE.Clock();
if (q.has('step')) window.__step = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); };
else renderer.setAnimationLoop(() => tick(Math.min(0.05, clock.getDelta())));
