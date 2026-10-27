// 夫（椅子に縛られて座っている）: GLB を読み、表情・一瞬の嘘の癖・目線・まばたき・頭の動き（ビンタで弾かれる・うなだれる・震える）を付ける。
// 表情と癖は data/faces.json（ARKit の名前と値）。座った形は GLB の骨の動き（1コマ）。
import { vq } from './version.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { captureArms } from './puppet.js';
import { setFingers } from './hand.js';

const DEG = Math.PI / 180;
const EYELID = ['eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight'];

// 肌: 光が少し回り込む柔らかい陰影（皮膚の下で光が散る感じの代わり）
export const SKIN_DIFFUSE = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
  'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
  `float wrapNL = dot( geometryNormal, directLight.direction );
	vec3 wrapIrr = directLight.color * ( saturate( ( wrapNL + 0.3 ) / 1.3 ) + vec3( 0.36, 0.09, 0.06 ) * saturate( 0.3 - abs( wrapNL - 0.05 ) ) );
	reflectedLight.directDiffuse += wrapIrr * BRDF_Lambert( material.diffuseColor );`,
);

const smooth = (x) => x * x * (3 - 2 * x);
// 指に巻いた布: 白い木綿に、先の方だけ血が少しにじむ（2026-10-25 オーナー「Aで」）
function bandageTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ece6da';
  g.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 3) { g.fillStyle = `rgba(120,105,90,${0.05 + Math.random() * 0.06})`; g.fillRect(0, y, 64, 1); } // 巻いた布の重なり
  const r = g.createRadialGradient(30, 6, 2, 30, 6, 46);
  r.addColorStop(0, 'rgba(120,18,16,0.85)');
  r.addColorStop(0.55, 'rgba(150,40,34,0.45)');
  r.addColorStop(1, 'rgba(150,40,34,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t; // 円柱の絵は上（指先の側）が v=1 なので、canvas の上が指先の側
}
// 叩かれた瞬間の顔（目をぎゅっとつぶって顔をしかめる）。張られた左側を強く
const REFLEX = { eyeBlinkLeft: 1, eyeBlinkRight: 0.9, eyeSquintLeft: 0.9, eyeSquintRight: 0.6, browDownLeft: 0.7, browDownRight: 0.5, cheekSquintLeft: 0.8, cheekSquintRight: 0.4, noseSneerLeft: 0.6, noseSneerRight: 0.4, mouthStretchLeft: 0.4, mouthStretchRight: 0.2, mouthRight: 0.35, jawOpen: 0.06 }; // 口は張られた向き（本人の右）へずれる
const tellEnv = (x) => (x < 0.25 ? smooth(x / 0.25) : x < 0.7 ? 1 : smooth(Math.max(0, (1 - x) / 0.3)));
const blinkEnv = (s) => (s < 0 || s > 0.16 ? 0 : Math.sin((Math.PI * s) / 0.16));

// 頭のばね: 目標に戻ろうとする（ビンタは速さを足す）
class Spring {
  constructor(k = 60, c = 9) { this.x = 0; this.v = 0; this.goal = 0; this.k = k; this.c = c; }
  step(dt) { this.v += (-this.k * (this.x - this.goal) - this.c * this.v) * dt; this.x += this.v * dt; }
}

// 話す口（2026-10-25 オーナー「喋ってる時は口を動かして」）: 字幕の文字から拍（母音）の並びを作り、拍ごとに口の形（ARKit の形）を切り替える。
// 声は後で付ける（オーナー「声は後回し」）ので、口の動きは字幕の文字だけから決める。漢字は2拍、ま行・ば行・ぱ行は唇を一度閉じてから開く
const VOWEL = {
  a: { jawOpen: 0.4, mouthLowerDownLeft: 0.15, mouthLowerDownRight: 0.15 },
  i: { jawOpen: 0.1, mouthStretchLeft: 0.35, mouthStretchRight: 0.35, mouthSmileLeft: 0.1, mouthSmileRight: 0.1 },
  u: { jawOpen: 0.13, mouthPucker: 0.55, mouthFunnel: 0.3 },
  e: { jawOpen: 0.25, mouthStretchLeft: 0.22, mouthStretchRight: 0.22 },
  o: { jawOpen: 0.3, mouthFunnel: 0.45, mouthPucker: 0.25 },
  n: { jawOpen: 0.03, mouthClose: 0.25 }, // ん・っ
  m: { mouthPressLeft: 0.5, mouthPressRight: 0.5, mouthClose: 0.4 }, // 唇を閉じる
};
const KANA_V = {};
Object.entries({ a: 'あかさたなはまやらわがざだばぱぁゃ', i: 'いきしちにひみりゐぎじぢびぴぃ', u: 'うくすつぬふむゆるぐずづぶぷぅゅゔ', e: 'えけせてねへめれゑげぜでべぺぇ', o: 'おこそとのほもよろをごぞどぼぽぉょ' }).forEach(([v, cs]) => { for (const c of cs) KANA_V[c] = v; });
const LIP = new Set('まみむめもばびぶべぼぱぴぷぺぽ');
const HANGUL_V = ['a', 'e', 'a', 'e', 'o', 'e', 'o', 'e', 'o', 'a', 'e', 'e', 'o', 'u', 'o', 'e', 'i', 'u', 'u', 'i', 'i']; // 中声 ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ → 口の形（2026-10-26 韓国語の声）
const MORA = 0.11; // 1拍の長さ（秒）
function moraeOf(text) {
  const keys = []; // 拍 { t, v: 母音（'-' は休み）, dur, lip }
  let t = 0.04, depth = 0, prev = 'a', prevLetter = '';
  const push = (v, dur, lip = false) => { keys.push({ t, v, dur, lip }); t += dur; if (v !== '-') prev = v; };
  for (const ch of text) {
    if (ch === '（' || ch === '(') { depth++; continue; }
    if (ch === '）' || ch === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth) continue; // （…）の中は声に出さない
    const code = ch.charCodeAt(0);
    const h = code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : ch; // カタカナ → ひらがな
    if (h === 'ー') push(prev, MORA);
    else if ('、,'.includes(h)) { push('-', 0.16); prevLetter = ''; }
    else if ('。.！!？?…‥ 　'.includes(h)) { push('-', 0.28); prevLetter = ''; }
    else if (h === 'っ' || h === 'ん') push('n', 0.08);
    else if (KANA_V[h]) push(KANA_V[h], MORA, LIP.has(h));
    else if (code >= 0x4e00 && code <= 0x9fff) { push('aiueo'[code % 5], MORA); push('aiueo'[(code >> 3) % 5], MORA); }
    else if (code >= 0xac00 && code <= 0xd7a3) { const s = code - 0xac00; push(HANGUL_V[Math.floor((s % 588) / 28)], MORA, [6, 7, 8, 17].includes(Math.floor(s / 588))); } // ハングル: 中声で形、初声 ㅁㅂㅃㅍ は唇を閉じてから
    else if (/[a-zA-Z]/.test(h)) { const l = h.toLowerCase(); if ('aeiouy'.includes(l)) push(l === 'y' ? 'i' : l, MORA, 'mbp'.includes(prevLetter)); prevLetter = l; } // 英字: 母音字で1拍（子音字だけなら動かさない）。m b p の後は唇を閉じてから
    else if (/\S/.test(h)) push('e', MORA);
  }
  return { keys, end: t };
}
// 拍の列を limit 秒に収める: 少し速くする（0.7倍まで）。足りなければ拍を1つおきに抜いてから速くする
function fitMorae(keys, limit) {
  const total = () => keys.reduce((a, k) => a + k.dur, 0.04);
  let k = Math.min(1, limit / total());
  if (k < 0.7) { keys = keys.filter((x, i) => x.v === '-' || i % 2 === 0); k = Math.max(0.7, Math.min(1, limit / total())); }
  let t = 0.04;
  for (const x of keys) { x.dur *= k; x.t = t; t += x.dur; }
  return { keys, end: t };
}

const TIED = { curl: [0.6, 0.7, 0.8, 0.9], kn: 0.15, tog: 0.9, thumb: 0.5, topp: 0.35, tcurl: 0.35 }; // 縛られた手は軽く握りしめる（小指ほど深く曲がる）

// model は縛られる側の模型の名前（husband: 夫。spouse_f: 女性浮気版の妻。2026-10-26 オーナー「女性浮気版も追加して」）。skin は肌の地図の名前の後ろ（'' か '_f'）
export async function loadHusband(scene, { envTex, frozen = false, model = 'husband', skin: skinSuffix = '' } = {}) {
  const [data, gltf, pores, rough, sheenTex] = await Promise.all([
    fetch('./data/faces.json').then((r) => r.json()),
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(vq(`./assets/${model}.glb`)),
    new THREE.TextureLoader().loadAsync(vq('./assets/skin_pores_normal.webp')),
    new THREE.TextureLoader().loadAsync(vq(`./assets/skin${skinSuffix}_rough.webp`)), // てかりの地図（肌の絵と同じ並び。tools/skin_paint.py）
    new THREE.TextureLoader().loadAsync(vq(`./assets/skin${skinSuffix}_sheen.webp`)), // うぶ毛の照り返しの地図（髪の下は黒）
  ]);
  rough.flipY = false; // glTF の絵と同じ向き
  sheenTex.flipY = false;
  const FACES = data.faces;
  const TELLS = data.tells;
  scene.add(gltf.scene);

  const bones = {};
  gltf.scene.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const arms = captureArms(gltf.scene, bones); // 終わりの後の場面で腕を前に出す時の基準（立った形のうちに）
  // 座った形（1コマの骨の動き）を当てる
  const mixer = new THREE.AnimationMixer(gltf.scene);
  if (gltf.animations[0]) { mixer.clipAction(gltf.animations[0]).play(); mixer.update(0); }

  const redU = { c: { value: [new THREE.Vector3(), new THREE.Vector3()] }, k: { value: [0, 0] } };
  const paleU = { value: 0 }; // 顔色の悪さ 0〜1（体力が減ると血の気が引く。2026-10-25 オーナー「顔色の悪さも反映させてね」）
  const pale = { goal: 0, cur: 0 };
  const red = { L: 0, R: 0, goalL: 0, goalR: 0 };
  pores.wrapS = pores.wrapT = THREE.RepeatWrapping;
  pores.repeat.set(24, 24);
  const morphMeshes = [];
  const eyes = [];
  const hairs = [];
  let skin = null;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    // 書き出しは全部 BLEND になっているので直す。
    // 眉・まつ毛は肌に貼り付く薄い板なので半透明のまま重ねる。髪は2回描く（抜きで奥行きを書き、半透明で縁をならす）。目は透けの部分だけ抜く
    const thin = /eyebrow|eyelash/.test(m.name);
    const hair = /short01|ponytail01|bob01|short0[234]|long01|braid01/.test(m.name); // 夫は short01、妻（女性浮気版）は long01（tools/husband.py の HAIR_F）
    const eye = /high-poly/.test(m.name);
    m.transparent = thin;
    m.depthWrite = !thin;
    m.alphaTest = hair ? 0.5 : eye ? 0.3 : 0;
    m.alphaToCoverage = eye;
    m.side = thin || hair || eye ? THREE.DoubleSide : THREE.FrontSide;
    if (thin) o.renderOrder = 2;
    if (hair) { // 髪: 黒に寄せ、毛先は抜き＋カバレッジでやわらかく（MSAA）。毛の流れのつやの帯を試したが、黒髪が灰色に見えたのでやめた
      m.color.multiplyScalar(0.72); // 書き出しの色（0.45 の灰色を掛けてある）をさらに黒に寄せる
      m.roughness = 0.75;
      m.alphaTest = 0.3;
      m.alphaToCoverage = true;
    }
    if (/teeth|tongue/.test(m.name)) {
      // 口の中は周りの光（環境）が届かないので弱める。envMap を素材に持たせないと envMapIntensity は効かない
      if (envTex) m.envMap = envTex;
      m.envMapIntensity = 0.03;
      m.roughness = 0.55;
      m.color.multiply(new THREE.Color(0.62, 0.58, 0.52));
    }
    if (/body/.test(m.name)) {
      // 肌は物理の素材に替える（2026-10-25 オーナー「顔の肌と髪も直して」）: 屈折率 1.4 でつやを控えめに・うぶ毛のやわらかい照り返し（sheen）・
      // 額と鼻はてかり、ひげの所はくすむ（roughnessMap）。毛穴の凹凸は少し強く
      const p = new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(p, m);
      p.defines = { STANDARD: '', PHYSICAL: '' };
      p.normalMap = pores;
      p.normalScale.set(0.5, 0.5);
      p.roughness = 1;
      p.roughnessMap = rough;
      p.color.setRGB(0.95, 0.9, 0.88); // 暖色の光の下でオレンジに寄りすぎないように、肌の絵を少し冷ます
      Object.assign(p, { ior: 1.4, sheen: 0.22, sheenRoughness: 0.7, sheenColorMap: sheenTex });
      p.sheenColor.setRGB(1.0, 0.8, 0.72);
      o.material = p;
      p.onBeforeCompile = (sh) => {
        // 叩かれた頬の赤み: 頬の点（カメラから見た位置）のまわりを赤くする。強さは red（左・右）
        sh.uniforms.uRedC = redU.c;
        sh.uniforms.uRedK = redU.k;
        sh.uniforms.uPale = paleU;
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uRedC[2];\nuniform float uRedK[2];\nuniform float uPale;')
          .replace('#include <map_fragment>', `#include <map_fragment>
	float lum = dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) );
	vec3 paleCol = mix( diffuseColor.rgb, vec3( lum ) * vec3( 0.97, 0.99, 1.04 ), 0.6 ) * ( 1.0 + 0.05 * uPale );
	diffuseColor.rgb = mix( diffuseColor.rgb, paleCol, uPale );
	float red = 0.0;
	for ( int i = 0; i < 2; i ++ ) red += uRedK[ i ] * ( 1.0 - smoothstep( 0.008, 0.062, length( - vViewPosition - uRedC[ i ] ) ) );
	diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.25, 0.58, 0.54 ), clamp( red, 0.0, 1.0 ) * 0.72 );`)
          .replace('#include <lights_physical_pars_fragment>', SKIN_DIFFUSE);
      };
      skin = o;
    }
    o.castShadow = !thin;
    o.receiveShadow = true;
    o.frustumCulled = false; // 骨で動く物は元の位置の箱で外れて消えることがある
    if (eye) eyes.push(o);
    if (hair) hairs.push(o);
    if (o.morphTargetDictionary) morphMeshes.push(o);
  });
  const fringes = []; // 髪の毛先の写し（shave で髪と一緒に消す）
  for (const o of hairs) { // 見て回り終わってから足す（途中で足すと、足した物をまた見つけて止まらない）
    const soft = o.material.clone();
    soft.alphaToCoverage = false;
    soft.alphaTest = 0;
    soft.transparent = true;
    soft.depthWrite = false;
    const fringe = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, soft) : new THREE.Mesh(o.geometry, soft);
    if (o.isSkinnedMesh) fringe.bind(o.skeleton, o.bindMatrix);
    fringe.morphTargetInfluences = o.morphTargetInfluences; // 表情で一緒に動くように同じ配列を使う
    fringe.morphTargetDictionary = o.morphTargetDictionary;
    fringe.renderOrder = 3;
    fringe.frustumCulled = false;
    o.parent.add(fringe); fringes.push(fringe);
    fringe.position.copy(o.position); fringe.quaternion.copy(o.quaternion); fringe.scale.copy(o.scale);
  }
  for (const e of eyes) e.rotation.order = 'YXZ';
  const eyeBase = eyes.map((e) => e.quaternion.clone());

  const statics = { chair: gltf.scene.getObjectByName('chair'), rope: gltf.scene.getObjectByName('rope') }; // 椅子と紐（終わりの後の場面で消す）
  const headBones = ['spine_03', 'neck_01', 'head'].filter((n) => bones[n]);
  const baseQ = Object.fromEntries(headBones.map((n) => [n, bones[n].quaternion.clone()]));
  const leanBones = ['spine_01', 'spine_02'].filter((n) => bones[n]);
  const leanQ = Object.fromEntries(leanBones.map((n) => [n, bones[n].quaternion.clone()]));
  // 後ろで縛られた手の指は、力の抜けた形に軽く曲げる（開いたままだと、上から見た時に不自然。指ごとの軸で曲げるので横へ開かない）
  for (const s of ['l', 'r']) setFingers(arms[s].fingers, TIED);

  // ---------- 状態
  FACES.dead = { label: '死', keys: { eyeBlinkLeft: 0.62, eyeBlinkRight: 0.56, jawOpen: 0.17, mouthFunnel: 0.04 }, gaze: [0, -12] }; // 息をしていない（目は半開き）
  const ALL_KEYS = new Set(['eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen', ...EYELID]);
  for (const f of [...Object.values(FACES), ...Object.values(TELLS)]) Object.keys(f.keys).forEach((k) => ALL_KEYS.add(k));
  const base = Object.fromEntries([...ALL_KEYS].map((k) => [k, 0]));
  const gaze = [0, 0];
  const lookAt = [0, 10]; // ふだんの目線（立っている妻を少し見上げる）
  let face = 'neutral';
  let tell = null;
  let clockT = 0;
  let blinkAt = -10;
  let nextBlink = 1.5 + Math.random() * 3;
  const sacc = [0, 0];
  let nextSacc = 1;
  const yaw = new Spring(), pitch = new Spring(55, 10), roll = new Spring(70, 9);
  pitch.goal = -4 * DEG; // 顔を少し上げて妻を見る
  let reflex = null; // 叩かれた瞬間に目をつぶる（{t}。表情の上に一瞬かぶせる）
  let watchFn = null; // 見る物（() => 世界の位置）。頭は 7割まで向け、残りは目で追う
  let dead = false;
  const mouth = { goal: 0, cur: 0, chew: 0 }; // 食べる・飲む時の口（表情に足す）
  let tremble = 0; // 0〜1 震えの強さ
  let spasm = null; // 電気で体がはねている { t, dur, power }（react('shock') で始まり、時間かshockEnd で止む。2026-10-27）
  let breath = 1; // 呼吸の速さ
  const lean = { goal: 0, cur: 0 }; // 腰から上を前へ倒す角度（終わりの後の場面で、食べる時にかがむ）
  let speech = null; // 話している口 { keys, end, t, cur: いまの形 }。字幕を出す側が speak(文字) / speak(null) で付けたり切ったりする
  const speechCur = {};

  function setFace(name, instant) {
    face = FACES[name] ? name : 'neutral';
    if (instant) {
      for (const k of ALL_KEYS) base[k] = FACES[face].keys[k] || 0;
      const g = FACES[face].gaze || [0, 0];
      gaze[0] = g[0] + lookAt[0]; gaze[1] = g[1] + lookAt[1];
    }
  }
  function playTell(name, at = 0) { if (TELLS[name]) tell = { name, t: at }; }

  // 反応: 'slap'（右手で左頬を張られて右へ弾かれる）・'flinch'（びくっと引く）・'droop'（うなだれる）・'up'（顔を上げる）・'cower'（迫られて見上げる）
  function react(kind, power = 1) {
    if (kind === 'slap') { yaw.v -= 9 * power; roll.v += 5 * power; pitch.v -= 1.5 * power; reflex = { t: 0 }; }
    if (kind === 'flinch') { pitch.v -= 4 * power; yaw.v += (Math.random() - 0.5) * 2; }
    if (kind === 'droop') pitch.goal = 14 * DEG * power;
    if (kind === 'up') { pitch.goal = -4 * DEG; lookAt[1] = 10; }
    if (kind === 'cower') { pitch.goal = -15 * DEG; lookAt[1] = 20; }
    if (kind === 'shock') { spasm = { t: 0, dur: 0.9 * power, power }; reflex = { t: 0 }; pitch.v -= 6 * power; } // 電気: 頭がのけぞって、速く小刻みにはねる（applyHead）
    if (kind === 'shockEnd') spasm = null;
  }
  function watch(fn) {
    watchFn = dead ? null : fn;
    if (!watchFn && !dead) { yaw.goal = 0; pitch.goal = -4 * DEG; lookAt[0] = 0; lookAt[1] = 10; }
  }
  function setMouth(open, chew = 0) { mouth.goal = open; mouth.chew = chew; }
  // 字幕の文字の分だけ口を動かす。字幕を読む待ち（main.js: 0.075 × 文字数 + 0.8 秒）に収まるように、長い時は拍を間引く
  // dur: 声の長さ（秒）があればそれに合わせる。無ければ字幕を読む待ち（main.js: 0.075 × 文字数 + 0.8 秒）に収める
  // env: 声の大きさの線 { step, data }（voice.js）。あれば、口の開きは声の大きさに合わせ、形（母音）は文字の順で（2026-10-26 口を声の波形に）
  function speak(text, dur = 0, env = null) {
    if (!text || dead) { if (speech) speech.end = Math.min(speech.end, speech.t); return; }
    const { keys, end } = fitMorae(moraeOf(text).keys, dur > 0 ? dur : 0.075 * text.length + 0.7);
    speech = { keys, end, t: 0, env: env && env.data && env.data.length ? env : null };
  }
  // 声の大きさの線の、いまの値（少し先を見て、口が遅れないように）
  function envAt(env, t) {
    const i = (t + 0.04) / env.step, i0 = Math.floor(i), a = env.data[Math.min(env.data.length - 1, Math.max(0, i0))], b = env.data[Math.min(env.data.length - 1, i0 + 1)];
    return a + (b - a) * (i - i0);
  }
  // 死んだ: 頭が前に落ち、目は半開きのまま、まばたきも息もしない
  function die() {
    dead = true; watchFn = null; tremble = 0; breath = 0; mouth.goal = 0; mouth.chew = 0; speech = null; pale.goal = 1;
    setFace('dead');
    pitch.goal = 34 * DEG; roll.goal = 9 * DEG; yaw.goal = -6 * DEG; lookAt[0] = 0; lookAt[1] = -14;
  }
  // 指を詰めた後: 先の骨を縮め（布の下）、布を巻く。左手の小指から薬指・中指・人差し指・親指、次に右手の小指から（10本。2026-10-25 オーナー「10本できないです」）
  const CUT_ORDER = [['pinky', 'l'], ['ring', 'l'], ['middle', 'l'], ['index', 'l'], ['thumb', 'l'], ['pinky', 'r'], ['ring', 'r'], ['middle', 'r'], ['index', 'r'], ['thumb', 'r']];
  const cutBone = (n) => { const [name, side] = CUT_ORDER[Math.min(CUT_ORDER.length, Math.max(1, n)) - 1]; return `${name}_02_${side}`; }; // n 本目に詰める指（第2関節の骨の名前）
  function cutFinger(n) {
    const [name, side] = CUT_ORDER[Math.min(CUT_ORDER.length, Math.max(1, n)) - 1];
    const b2 = bones[`${name}_02_${side}`], b3 = bones[`${name}_03_${side}`];
    if (!b2 || !b3) return;
    const len = b3.position.length(), r = name === 'thumb' ? 0.0125 : name === 'pinky' ? 0.0102 : 0.0112;
    b3.scale.setScalar(0.02);
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.001, len * 1.5, 16, 1), new THREE.MeshStandardMaterial({ map: bandageTexture(), roughness: 0.95 }));
    wrap.position.set(0, len * 0.62, 0); // 骨は自分の Y の向きに伸びている
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xa8584f, roughness: 0.95 })); // 指先の布は血がにじんで赤い
    cap.position.set(0, len * 1.37, 0);
    for (const o of [wrap, cap]) { o.castShadow = true; b2.add(o); }
  }
  function setTremble(x) { if (!dead) tremble = Math.max(0, Math.min(1, x)); }
  // バリカンで刈った（2026-10-27）: 髪（と毛先の写し）を消す。頭の皮は体の肌がそのまま出る。戻さない（最後まで残る）
  function shave() { for (const o of [...hairs, ...fringes]) o.visible = false; }
  // 目隠し（2026-10-27）: 濃い灰色の布の帯を目の高さで頭に巻く（頭の骨の子。付けた時の向きを世界に合わせてから子にするので、頭と一緒に回る）
  let band = null;
  function setBlind(on) {
    if (!on) { if (band) band.visible = false; return; }
    if (!band) {
      band = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.04, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b2b31, roughness: 0.95, side: THREE.DoubleSide }));
      band.castShadow = true; band.renderOrder = 4;
      bones.head.add(band);
    }
    const q = bones.head.getWorldQuaternion(new THREE.Quaternion()).invert();
    band.quaternion.copy(q);
    band.scale.set(1, 1, 1.2);
    band.position.copy(bones.head.worldToLocal(eyesWorld().add(new THREE.Vector3(0, 0.0, -0.035))));
    band.visible = true;
  }
  // 頬の赤み（0〜1）。すぐには出ず、0.5秒ほどで赤くなる
  function setRed(L, R = 0) { red.goalL = Math.max(0, Math.min(1, L)); red.goalR = Math.max(0, Math.min(1, R)); }
  // 顔色の悪さ（0: ふつう 〜 1: 血の気が無い）。ゆっくり変わる（数秒）。instant で一気に
  function setPale(x, instant = false) { pale.goal = Math.max(0, Math.min(1, x)); if (instant) pale.cur = pale.goal; }
  // 毎コマ、描く前に: 頬の点をカメラから見た位置にして色の計算に渡す
  function updateView(camera) {
    camera.updateMatrixWorld();
    ['L', 'R'].forEach((side, i) => redU.c.value[i].copy(cheekWorld(side)).applyMatrix4(camera.matrixWorldInverse));
  }
  function setBreath(x) { if (!dead) breath = x; }
  function setLean(x) { lean.goal = x; }

  const qTmp = new THREE.Quaternion(), qPar = new THREE.Quaternion(), qOff = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ');
  const AX_LEFT = new THREE.Vector3(1, 0, 0); // 本人の左（夫は +Z を向いている）。この軸で + に回すと前へ倒れる
  function applyHead() {
    // 世界の軸で頭を回す（首に6割・頭に4割）。背骨は呼吸
    const t = clockT;
    const tr = tremble * 0.6 * DEG;
    // 背中は 6割を腰の上・4割を胸で前へ倒す。頭はその分を起こす（かがんでも見ている所は変わらない）
    leanBones.forEach((n, i) => {
      const b = bones[n];
      b.parent.updateWorldMatrix(true, false);
      b.parent.getWorldQuaternion(qPar);
      qOff.setFromAxisAngle(AX_LEFT, lean.cur * (i ? 0.4 : 0.6));
      b.quaternion.copy(qPar).invert().multiply(qOff).multiply(qPar).multiply(leanQ[n]);
    });
    // 電気がかかっている間: 残り時間に比例した強さで、顔は後ろへ引かれ、速く小刻みにはねる（震えより大きく速い）
    const sp = spasm ? Math.max(0, 1 - spasm.t / spasm.dur) * spasm.power : 0;
    const spy = Math.sin(t * 71) * 3.5 * sp * DEG, spp = (-7 + Math.sin(t * 59 + 1) * 4) * sp * DEG, spr = Math.sin(t * 83 + 2) * 3 * sp * DEG;
    const ny = yaw.x + Math.sin(t * 37) * tr + spy, np = pitch.x - lean.cur + Math.sin(t * 29 + 1) * tr + spp, nr = roll.x + Math.sin(t * 23 + 2) * tr + spr;
    const parts = { spine_03: [Math.sin(t * 67) * 1.2 * sp * DEG, Math.sin(t * 1.6 * breath) * 0.6 * DEG + Math.sin(t * 61 + 1) * 1.5 * sp * DEG, 0], neck_01: [ny * 0.6, np * 0.6, nr * 0.6], head: [ny * 0.4, np * 0.4, nr * 0.4] };
    for (const n of headBones) {
      const b = bones[n];
      const [y, p, r] = parts[n];
      b.parent.updateWorldMatrix(true, false);
      b.parent.getWorldQuaternion(qPar);
      eul.set(p, y, r);
      qOff.setFromEuler(eul);
      qTmp.copy(qPar).invert().multiply(qOff).multiply(qPar).multiply(baseQ[n]);
      b.quaternion.copy(qTmp);
    }
  }

  function update(dt) {
    clockT += dt;
    if (watchFn) {
      const d = watchFn().sub(eyesWorld());
      const yT = Math.atan2(d.x, d.z), pT = Math.atan2(d.y, Math.hypot(d.x, d.z)); // 左が +・上が +
      yaw.goal = THREE.MathUtils.clamp(yT * 0.7, -1.1, 1.1);
      pitch.goal = -THREE.MathUtils.clamp(pT * 0.6, -0.45, 0.5);
      lookAt[0] = THREE.MathUtils.clamp((yT - yaw.x) / DEG, -32, 32);
      lookAt[1] = THREE.MathUtils.clamp((pT + pitch.x) / DEG, -28, 28);
    }
    const F = FACES[face];
    const k = Math.min(1, dt * 8);
    for (const key of ALL_KEYS) base[key] += ((F.keys[key] || 0) - base[key]) * k;
    const w = { ...base };
    let g = [(F.gaze || [0, 0])[0] + lookAt[0], (F.gaze || [0, 0])[1] + lookAt[1]];
    let blink = 0;
    if (tell) {
      const T = TELLS[tell.name];
      const x = tell.t / T.dur;
      if (x >= 1) tell = null;
      else {
        const e = tellEnv(x);
        for (const [key, v] of Object.entries(T.keys)) w[key] = w[key] * (1 - e) + v * e;
        if (T.gaze) g = [g[0] * (1 - e) + (T.gaze[0] + lookAt[0]) * e, g[1] * (1 - e) + (T.gaze[1] + lookAt[1]) * e];
        if (T.blinks) for (let i = 0; i < T.blinks; i++) blink = Math.max(blink, blinkEnv(tell.t - (i * T.dur) / T.blinks));
        if (!frozen) tell.t += dt;
      }
    }
    if (!frozen && !dead) {
      if (clockT > nextBlink) { blinkAt = clockT; nextBlink = clockT + 2.5 + Math.random() * 3.5; }
      blink = Math.max(blink, blinkEnv(clockT - blinkAt));
      if (clockT > nextSacc) { sacc[0] = (Math.random() - 0.5) * 5; sacc[1] = (Math.random() - 0.5) * 3; nextSacc = clockT + 0.8 + Math.random() * 1.7; }
      g = [g[0] + sacc[0], g[1] + sacc[1]];
    }
    if (spasm) { spasm.t += frozen ? 0 : dt; if (spasm.t >= spasm.dur) spasm = null; }
    if (reflex) {
      const e = reflex.t < 0.03 ? reflex.t / 0.03 : reflex.t < 0.2 ? 1 : Math.max(0, 1 - (reflex.t - 0.2) / 0.3);
      for (const [key, v] of Object.entries(REFLEX)) w[key] = (w[key] || 0) * (1 - e) + v * e;
      reflex.t += frozen ? 0 : dt;
      if (reflex.t > 0.5) reflex = null;
    }
    w.eyeBlinkLeft = Math.max(w.eyeBlinkLeft, blink);
    w.eyeBlinkRight = Math.max(w.eyeBlinkRight, blink);
    mouth.cur += (mouth.goal - mouth.cur) * Math.min(1, dt * 10);
    w.jawOpen = Math.max(w.jawOpen || 0, mouth.cur + (mouth.chew ? mouth.chew * (0.5 + 0.5 * Math.sin(clockT * 9)) : 0));
    // 話す口: いまの拍の母音の形へ素早く寄せる。拍の終わりで少し緩め、唇を閉じる拍は始めに閉じてから開く。拍と拍の間（休み・言い終わり）は閉じる
    if (speech) {
      if (!frozen) speech.t += dt;
      const target = {};
      const k = speech.keys.find((x) => speech.t >= x.t && speech.t < x.t + x.dur);
      if (speech.env) { // 声がある: 開きは声の大きさ、形は文字の順の母音（休みの拍や声の無い所は閉じる）
        const a = Math.min(1, envAt(speech.env, speech.t) * 1.3);
        const kv = k && k.v !== '-' ? k : speech.keys.find((x) => x.v !== '-' && x.t >= speech.t) || speech.keys[speech.keys.length - 1];
        const shape = kv && kv.v !== '-' ? (kv.lip && a < 0.2 ? VOWEL.m : VOWEL[kv.v]) : VOWEL.a;
        if (a > 0.06) for (const [key, v] of Object.entries(shape)) target[key] = v * (0.35 + 0.65 * a);
        else target.mouthClose = 0.12;
      } else if (k && k.v !== '-') {
        const u = (speech.t - k.t) / k.dur;
        const shape = k.lip && u < 0.3 ? VOWEL.m : VOWEL[k.v];
        const amp = u > 0.75 ? 1 - 0.45 * (u - 0.75) / 0.25 : 1;
        for (const [key, v] of Object.entries(shape)) target[key] = v * amp;
      } else target.mouthClose = 0.12;
      for (const key of new Set([...Object.keys(speechCur), ...Object.keys(target)])) {
        speechCur[key] = (speechCur[key] || 0) + ((target[key] || 0) - (speechCur[key] || 0)) * Math.min(1, dt * 28);
        if (key === 'jawOpen') w.jawOpen = Math.max(w.jawOpen, speechCur[key]);
        else w[key] = Math.min(1, (w[key] || 0) + speechCur[key]);
      }
      if (speech.t > speech.end + 0.35) { speech = null; for (const key of Object.keys(speechCur)) delete speechCur[key]; }
    }
    const kg = frozen ? 1 : Math.min(1, dt * 18);
    gaze[0] += (g[0] - gaze[0]) * kg;
    gaze[1] += (g[1] - gaze[1]) * kg;
    // まぶたは目線について行く（+は本人の左・上）
    const gy = gaze[0] / 30, gp = gaze[1] / 25;
    w.eyeLookOutLeft += Math.max(0, gy); w.eyeLookInRight += Math.max(0, gy);
    w.eyeLookInLeft += Math.max(0, -gy); w.eyeLookOutRight += Math.max(0, -gy);
    w.eyeLookUpLeft += Math.max(0, gp); w.eyeLookUpRight += Math.max(0, gp);
    w.eyeLookDownLeft += Math.max(0, -gp); w.eyeLookDownRight += Math.max(0, -gp);
    for (const mesh of morphMeshes) {
      const inf = mesh.morphTargetInfluences;
      const isEye = eyes.includes(mesh); // 目玉は回して向ける。目玉の eyeLook の形も効かせると二重に回る
      for (const [key, i] of Object.entries(mesh.morphTargetDictionary)) inf[i] = isEye && key.startsWith('eyeLook') ? 0 : Math.min(1, w[key] || 0);
    }
    lean.cur += (lean.goal - lean.cur) * Math.min(1, dt * 3);
    red.L += (red.goalL - red.L) * Math.min(1, dt * 3);
    red.R += (red.goalR - red.R) * Math.min(1, dt * 3);
    redU.k.value[0] = red.L;
    redU.k.value[1] = red.R;
    pale.cur += (pale.goal - pale.cur) * Math.min(1, dt * 0.35);
    paleU.value = pale.cur;
    const sdt = frozen ? 0 : Math.min(dt, 1 / 30);
    for (const s of [yaw, pitch, roll]) for (let i = 0; i < 2; i++) s.step(sdt / 2);
    applyHead();
    eyes.forEach((e, i) => {
      eul.set(-gaze[1] * DEG, gaze[0] * DEG, 0);
      e.quaternion.copy(eyeBase[i]).multiply(qOff.setFromEuler(eul));
    });
  }

  const headWorld = () => (bones.head || gltf.scene).getWorldPosition(new THREE.Vector3());
  const eyesWorld = () => eyes.reduce((v, e) => v.add(e.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).divideScalar(Math.max(1, eyes.length));
  // ビンタの当たる所: 左右の頬の表面（目より 4.5〜6.5cm 下・頬の真ん中の高さで、横と前にいちばん出ている点）を頭の骨から見た位置で覚える
  gltf.scene.updateMatrixWorld(true);
  const cheekLocal = {};
  {
    const pos = skin.geometry.attributes.position;
    const ws = [];
    for (let i = 0; i < pos.count; i++) ws.push(skin.localToWorld(skin.getVertexPosition(i, new THREE.Vector3())));
    const eyeW = eyes.map((e) => e.getWorldPosition(new THREE.Vector3())).sort((a, b) => b.x - a.x); // 本人の左（+X）が先
    for (const [side, eye, sx] of [['L', eyeW[0], 1], ['R', eyeW[1], -1]]) {
      const dir = new THREE.Vector3(0.75 * sx, 0, 0.66).normalize(); // 頬の横より少し前（手のひらが平らに当たる所）
      let best = -Infinity, bp = null;
      for (const p of ws) {
        const dy = p.y - eye.y, dz = p.z - eye.z;
        if (dy < -0.065 || dy > -0.045 || Math.abs(dz) > 0.05 || (p.x - eye.x) * sx < -0.005) continue;
        const sc = p.clone().sub(eye).dot(dir);
        if (sc > best) { best = sc; bp = p; }
      }
      cheekLocal[side] = bones.head.worldToLocal(bp.clone());
    }
  }
  const cheekWorld = (side = 'L') => bones.head.localToWorld(cheekLocal[side].clone());
  // 妻の手が行く所（顔はあご・あごの下・唇。体は骨から）
  const faceLocal = {};
  {
    const eyeW = eyesWorld();
    const pos = skin.geometry.attributes.position, p = new THREE.Vector3();
    const front = (dx, y0, y1) => {
      let best = -Infinity, bp = null;
      for (let i = 0; i < pos.count; i++) {
        skin.localToWorld(skin.getVertexPosition(i, p));
        const dy = p.y - eyeW.y;
        if (Math.abs(p.x - eyeW.x) > dx || dy < y0 || dy > y1) continue;
        if (p.z > best) { best = p.z; bp = p.clone(); }
      }
      return bp;
    };
    const chin = front(0.012, -0.14, -0.112), lips = front(0.008, -0.085, -0.06); // あごは唇より下だけで探す
    faceLocal.chin = bones.head.worldToLocal(chin.clone());
    faceLocal.underChin = bones.head.worldToLocal(chin.clone().add(new THREE.Vector3(0, -0.022, -0.028)));
    faceLocal.mouth = bones.head.worldToLocal(lips.clone().add(new THREE.Vector3(0, 0, 0.008)));
  }
  const V = () => new THREE.Vector3();
  const at = (n) => bones[n].getWorldPosition(V());
  function point(name) {
    if (name === 'cheekL') return cheekWorld('L');
    if (name === 'cheekR') return cheekWorld('R');
    if (faceLocal[name]) return bones.head.localToWorld(faceLocal[name].clone());
    if (name === 'eyes') return eyesWorld();
    if (name === 'shoulderL') return at('upperarm_l').add(new THREE.Vector3(-0.025, 0.07, -0.01)); // 肩の上（Tシャツの上）
    if (name === 'shoulderR') return at('upperarm_r').add(new THREE.Vector3(0.025, 0.07, -0.01));
    if (name === 'kneeL') return at('calf_l').add(new THREE.Vector3(0, 0.06, 0)); // ひざの上
    if (name === 'kneeR') return at('calf_r').add(new THREE.Vector3(0, 0.06, 0));
    if (name === 'lap') return at('thigh_l').add(at('thigh_r')).add(at('calf_l')).add(at('calf_r')).multiplyScalar(0.25).add(new THREE.Vector3(0, 0.1, 0));
    if (name === 'pocket') return at('thigh_l').lerp(at('calf_l'), 0.3).add(new THREE.Vector3(0.02, 0.085, 0)); // 左の前ポケット
    if (name === 'pocketSide') return at('thigh_l').lerp(at('calf_l'), 0.3).add(new THREE.Vector3(0.09, 0.045, 0)); // 左のポケットの外側（膝の重しをよける）
    if (name === 'handL') return at('hand_l');
    if (name === 'handR') return at('hand_r');
    if (name === 'pinkyL') return at('pinky_02_l');
    if (name === 'ringL') return at('ring_02_l');
    const cut = /^cut(\d+)$/.exec(name); // cutN: N 本目に詰める指
    if (cut) return at(cutBone(+cut[1]));
    return at('head');
  }
  update(0);
  return {
    root: gltf.scene, FACES, TELLS, skin, bones, arms, statics, setFace, playTell, react, watch, setMouth, speak, die, cutFinger, cutBone, setTremble, setBreath, setLean, setRed, setPale, shave, setBlind, updateView, update,
    headWorld, eyesWorld, cheekWorld, point, get face() { return face; }, get dead() { return dead; },
  };
}
