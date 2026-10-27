// 遊びの中身（画面なし。ブラウザでも Node でも動く）。決まりは SPEC.md。数字はすべて設計判断。
// newGame(story, seed) → 状態。act(状態, 行動, 引数) → 出来事の列。verdict(状態, 判決) → 結末と答え合わせ
export const TELLS = ['lip_press', 'fake_smile', 'smirk', 'gaze_away', 'blink_burst', 'micro_fear', 'nose_wrinkle', 'lip_bite'];
export const START = 22 * 60;       // 22:00（分）
export const MORNING = 31 * 60;     // 翌 7:00。朝が来たら判決か、会社を休ませて続けるか（3日まで）
export const MAX_DAYS = 3;
const LATE = 25 * 60;               // 1:00 を過ぎると寝かせないぶん混乱が増える

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));

export function newGame(story, seed = Date.now()) {
  const rnd = mulberry(seed);
  // 画面に出す「様子」の境目（2026-10-25 オーナー「ゲージでなく、そろそろやばい感じの表示に。いつ休ませればいいのかわかってしまう」）。
  // 数字は見せず、境目はゲームごとに少しずらす。真相の乱数の列を乱さないよう別の列から引く
  const fz = mulberry(((+seed || 0) ^ 0x5bd1e995) >>> 0);
  const jit = (c, w) => c + (fz() * 2 - 1) * w;
  const fuzz = {
    hp: [jit(72, 9), jit(50, 9), jit(30, 7), jit(14, 4)], // 体力: 息が荒い・顔色が悪い・ぐったり・目がうつろ
    noise: [jit(38, 9), jit(62, 9), jit(84, 6)], // 騒ぎ: 隣で物音・壁を叩かれた・外がざわつく
    hunger: [jit(58, 9), jit(82, 7)], // 空腹と渇き: のどが鳴った・唇がひび割れている
    warn1: jit(30, 6), warn2: jit(12, 3), // 死にそうな時の知らせ
  };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // 浮気の数 1〜6（1:15%・2:25%・3:25%・4:15%・5:12%・6:8%）
  const r = rnd() * 100;
  const N = r < 15 ? 1 : r < 40 ? 2 : r < 65 ? 3 : r < 80 ? 4 : r < 92 ? 5 : 6;
  const whens = shuffle(story.whens);
  const places = () => pick(story.places);
  const rest = shuffle(story.partners).slice(0, N - 1).sort((a, b) => a.depth - b.depth);
  const affairs = [{ ...story.trigger, when: pick(['先月', '3か月前']) }, ...rest.map((p, i) => ({ ...p, when: whens[i] }))]
    .map((a, i) => ({ id: i, partner: a.partner, name: a.name, depth: a.depth, when: a.when, place: places(), wall: 30 + 22 * a.depth + rnd() * 10, confessed: false, denied: 0 }));
  // 証拠: きっかけの LINE の通知は最初から手元に。ほかの浮気は 6割で1つ残っている。関係ない物（言い訳が本当）も1〜2つ
  const real = shuffle(story.evidence.real);
  const ev0 = story.trigger.evidence || { name: 'LINEの通知（ユイ）', desc: '「昨日はありがとう♡ また会いたいな」', strength: '弱' }; // きっかけの通知（台本から。女性浮気版は story_w.json）
  const evidence = [{ id: 0, name: ev0.name, desc: ev0.desc, strength: ev0.strength || '弱', affairId: 0, found: true, used: false }];
  affairs.slice(1).forEach((a) => { if (rnd() < 0.6 && real.length) evidence.push({ id: evidence.length, ...real.pop(), affairId: a.id, found: false, used: false }); });
  shuffle(story.evidence.decoy).slice(0, 1 + Math.floor(rnd() * 2)).forEach((d) => evidence.push({ id: evidence.length, ...d, affairId: null, found: false, used: false }));
  // スマホの中（2026-10-26 オーナー「スマホの中を自分で探す」）: アプリごとの行。台本の何でもない行（story.phone）に、この回の証拠の行を混ぜる（並びはゲームごと）
  const phoneRows = {};
  for (const [app, rows] of Object.entries(story.phone || {})) {
    if (app.startsWith('_')) continue;
    const list = rows.map((r) => ({ t: r.t, d: r.d }));
    for (const e of evidence) if (!e.found && e.app === app) list.splice(Math.floor(rnd() * (list.length + 1)), 0, { ev: e.id });
    phoneRows[app] = list;
  }
  return {
    story, rnd, seed, fuzz, time: START, ended: null, day: 1, morningAt: MORNING,
    hp: 100, pain: 0, fear: 0, stress: 25, confusion: 0, love: 60, noise: 0, hunger: 30,
    stones: false, bonus: 0, bonusTrue: 0, minimized: false,
    slaps: 0, hardSlaps: 0, fingers: 0, shocks: 0, hairPulls: 0, grip: 0, blind: false, blindUsed: 0, blindMin: 0, shaved: false, bleed: 0, warned: 0, stonesMin: 0, toolShows: 0, cries: 0, divorceUsed: false, motherUsed: false, phone: 0, baseline: 0,
    drunk: 0, drinks: 0, loose: false, recording: false, // 酒の回り（0〜3・時間でさめる）・飲ませた回数・縄をゆるめた・録音中
    affairs, log: [], rambles: 0, evidence, phoneRows, looks: 0, opened: [], tell: pick(TELLS), lastDeny: 0,
  };
}

// ---------- 時間
function advance(s, min) {
  for (let i = 0; i < min && !s.ended; i++) {
    s.time++;
    s.pain = clamp(s.pain + (s.stones ? 0.8 : -0.4) + 0.05);      // 縛られて座っているだけでも少しずつ
    if (s.stones) { s.confusion = clamp(s.confusion + 0.25); s.stonesMin++; }
    if (s.blind) s.blindMin++;
    s.fear = clamp(s.fear - (s.blind && s.blindMin < 40 ? 0.11 : 0.15)); // 目隠しの最初の40分は怯えがさめにくい（そのあとは慣れる）
    s.stress = clamp(s.stress + (s.stress > 25 ? -0.05 : 0.05));
    s.noise = clamp(s.noise - 0.6);
    s.drunk = Math.max(0, s.drunk - 1 / 50); // 酒は 50分で1段さめる
    // 飢えと渇き: 縛られて水も飲めず、怯えと痛みで汗をかく。1晩で飢え死にはしないが、衰弱として縮めて表す（2026-10-25 オーナー「飢餓状態…で死に至るように」）
    s.hunger = clamp(s.hunger + 0.15);
    s.confusion = clamp(s.confusion + (s.time > LATE ? 0.03 : 0) + s.hunger / 2000 + (s.pain > 60 ? 0.05 : 0) + (s.blind ? 0.04 : 0)); // 目隠しの間は頭が回らなくなっていく（両刃）
    // 体力（命）が削れる: 膝の重し・指の傷の出血・飢えと渇き・強い痛みが続くこと。0 で死ぬ
    s.hp = clamp(s.hp - (s.stones ? 0.08 : 0) - s.bleed * 0.06 - (s.hunger > 90 ? 0.12 : s.hunger > 70 ? 0.05 : 0) - (s.pain > 85 ? 0.05 : 0));
    if (s.hp <= 0) s.ended = 'death';
    if (s.time >= s.morningAt && !s.ended) s.ended = 'morning';
  }
}
function checkNoise(s) { if (s.noise >= 100 && !s.ended) s.ended = 'police'; }

// ---------- セリフ
function line(s, key, fill = {}) {
  const t = s.story.lines[key];
  const x = t[Math.floor(s.rnd() * t.length)];
  return x.replace(/\{(\w+)\}/g, (_, k) => fill[k] ?? '');
}
// 圧: 痛み・怯え・緊張と、その時だけの上乗せ。同じ件で否定させた回数ぶんも効く（しつこく聞くほど崩れる）
// 酒で口が軽くなり（+8/段）、録音されていると言葉を選ぶ（-10）
const pressure = (s, a) => s.pain * 0.35 + s.fear * 0.3 + s.stress * 0.3 + s.bonus + 6 * Math.min(a ? a.denied : 0, 6) + 8 * s.drunk - (s.recording ? 10 : 0) + (s.blind && s.blindMin < 40 ? 3 : 0) + (s.rnd() * 16 - 8); // 目隠し: 次に何をされるか分からない（+3。最初の40分）
// 頭が回らない（混乱・強い痛み）ほど、浮気と関係ない話をして答えにならない。嘘の自白はしない
// （2026-10-25 オーナー「なければもう否定のみでいいです 頭側回らない時とかは浮気の話以外の関係ないことを言ったりするようにすればいい」）
const rambleProb = (s) => clamp((s.confusion - 40) / 90 + (s.pain - 55) / 150 + 0.12 * s.drunk, 0, 0.75); // 酒が回るほど話がそれる
const truthTell = (s) => 0.08 + s.stress / 250 + 0.1 * s.drunk;  // 本当の時でも緊張で出る。酒が回ると本当の時にも癖が出て読みにくい
function tells(s, lying, strong = 0.7) {
  // この夫の癖は嘘で7割（証拠を前にすると8割5分）。ほかの癖も1割は出る（まぎらわしく）
  // 目隠しの間は顔が読めない（癖は出ない。両刃。2026-10-27）。髪をつかんで顔を上げさせた直後の2手は目をそらせず、癖が出やすい（+2割）
  const ev = {};
  if (s.blind) return ev;
  if (s.rnd() < (lying ? Math.min(0.95, strong + (s.grip > 0 ? 0.2 : 0)) : truthTell(s))) ev.tell = s.tell;
  else if (s.rnd() < 0.1) ev.tell = TELLS.filter((t) => t !== s.tell)[Math.floor(s.rnd() * 7)];
  return ev;
}

function confessTrue(s, a, out) {
  a.confessed = true;
  const entry = { id: s.log.length, affairId: a.id, partner: a.partner, when: a.when, place: a.place };
  s.log.push(entry);
  s.stress = clamp(s.stress - 10);
  out.push({ type: 'say', who: '夫', text: line(s, 'confess', a), face: 'shame', after: 'cry', react: 'droop', push: true });
  out.push({ type: 'log', entry });
}
function ramble(s, out) { // 浮気と関係ない話（答えにならない。癖も出ない）
  s.rambles++;
  out.push({ type: 'say', who: '夫', text: line(s, 'ramble'), face: s.rnd() < 0.5 ? 'exhausted' : 'confused', push: true });
}
// 問い詰めた時の答え: 頭が回らなければ関係ない話。そうでなければ、圧が次の浮気の壁を越えたら本当の自白、越えなければ否定（残っていなければ本当の否定）
function answer(s, a, extra, rambleK, out) {
  if (s.rnd() < rambleProb(s) * rambleK) return ramble(s, out);
  if (a && pressure(s, a) + extra >= a.wall) return confessTrue(s, a, out);
  if (a) a.denied++;
  deny(s, !!a, out);
}
function deny(s, lying, out, angryOk = true) {
  const angry = angryOk && !lying && s.stress > 80 && s.rnd() < 0.3; // 本当に何もない時の逆ギレ（手がかりにもなる）
  const face = angry ? 'anger' : lying ? (s.rnd() < 0.5 ? 'appease' : 'evasive') : (s.rnd() < 0.5 ? 'confused' : 'fear');
  out.push({ type: 'say', who: '夫', text: line(s, angry ? 'deny_angry' : 'deny'), face, push: true, ...tells(s, lying) });
}

// ---------- 行動
// label は妻の言葉か、したこと（仕組みの名前にしない。2026-10-25 オーナー「全部進めて」）。関数なら状態から決める
const PHONE_ACTS = { look: { min: 2 }, take: { min: 1 } }; // スマホの画面の中の手（ボタンには出ない。控えには残す）
export const ACTIONS = {
  push: { label: '他にもあるでしょ？', min: 5, group: '聞く' },
  baseline: { label: (s) => `「${s.story.baseline[s.baseline]?.q || '今日の晩ご飯、なに食べた？'}」`, min: 2, group: '聞く' }, // 答えの分かる質問（ふだんの顔を見る）
  minimize: { label: '怒らないから言って', min: 3, group: '聞く' },
  evidence: { label: '証拠を突きつける', min: 5, group: '聞く', arg: 'evidence' },
  recheck: { label: '落ち着いて聞き直す', min: 10, group: '聞く' },
  slap: { label: 'ビンタ（軽く）', min: 1, group: '責める' },
  slapHard: { label: 'ビンタ（思い切り）', min: 1, group: '責める' },
  stones: { label: (s) => (s.stones ? '重しを下ろす' : '膝に重しを乗せる'), min: 1, group: '責める' },
  tools: { label: '道具を見せる', min: 3, group: '責める' },
  divorce: { label: '離婚届を置く', min: 3, group: '責める' },
  mother: { label: '義母に電話する（ふり）', min: 3, group: '責める' },
  finger: { label: '指を詰める', min: 20, group: '責める' },
  shock: { label: '電気ショック', min: 3, group: '責める' }, // スタンガン（2026-10-27 オーナー「電気ショックを加えたい」）
  // 2026-10-27 オーナー「髪をつかむ・目隠し・バリカンを入れて」
  hair: { label: '髪をつかんで顔を上げさせる', min: 1, group: '責める' },
  blind: { label: (s) => (s.blind ? '目隠しを外す' : '目隠しをする'), min: 2, group: '責める' },
  clipper: { label: 'バリカンで髪を刈る', min: 10, group: '責める' },
  phone: { label: 'スマホを出させる', min: 10, group: 'ほか' },
  cry: { label: '泣く', min: 3, group: 'ほか' },
  silence: { label: '黙って待つ', min: 10, group: 'ほか' },
  rest: { label: '休ませる', min: 30, group: 'ほか' },
  leave: { label: '放置する', min: 360, group: 'ほか' }, // かかる時間はボタンに添えるので名前には入れない（2026-10-26）
  feed: { label: '食べさせる', min: 15, group: 'ほか' },
  // 両刃の手（2026-10-25 オーナー「全部進めて」）
  sake: { label: '酒を飲ませる', min: 5, group: 'ほか' },
  loosen: { label: '縄をゆるめる', min: 3, group: 'ほか' },
  record: { label: '録音を始める', min: 1, group: 'ほか' },
};
export const labelOf = (s, id) => (typeof ACTIONS[id].label === 'function' ? ACTIONS[id].label(s) : ACTIONS[id].label);

// スマホのアプリの中身: [{ t, d }（何でもない行）| { ev: 証拠 }]。開いたアプリの分だけ画面に出す
export const appRows = (s, app) => (s.phoneRows[app] || []).map((r) => (r.ev !== undefined ? { ev: s.evidence[r.ev] } : r));

export function available(s) {
  const has = (f) => s.evidence.some((e) => e.found && !e.used && f(e));
  return {
    push: true, baseline: s.baseline < s.story.baseline.length, minimize: !s.minimized,
    evidence: has(() => true), recheck: true,
    slap: true, slapHard: true, stones: true, tools: true, divorce: !s.divorceUsed, mother: !s.motherUsed, finger: s.fingers < 10, shock: true, hair: true, blind: true, clipper: !s.shaved, // 指は10本まで（2026-10-25 オーナー「10本できないです」）
    phone: s.phone < 3, cry: true, silence: true, rest: true, leave: true, feed: s.hunger > 20,
    sake: s.drinks < 3, loosen: !s.loose, record: !s.recording,
  };
}

export function act(s, id, arg) {
  const out = [];
  if (s.ended) return out;
  const nextHidden = s.affairs.find((a) => !a.confessed);
  advance(s, (ACTIONS[id] || PHONE_ACTS[id]).min);
  if (s.ended) return finish(s, out);
  switch (id) {
    case 'push':
      answer(s, nextHidden, s.bonusTrue, 1, out);
      s.stress = clamp(s.stress + 6);
      s.bonus = 0; s.bonusTrue = 0;
      break;
    case 'baseline': {
      const b = s.story.baseline[s.baseline++];
      out.push({ type: 'say', who: '妻', text: b.q });
      out.push({ type: 'say', who: '夫', text: b.a, face: 'neutral', push: true, ...tells(s, false) });
      break;
    }
    case 'minimize':
      s.minimized = true; s.bonus += 15;
      out.push({ type: 'say', who: '夫', text: line(s, 'minimize'), face: 'confused', after: 'appease' });
      break;
    case 'evidence': {
      const e = s.evidence.find((x) => x.id === arg && x.found && !x.used);
      if (!e) break;
      out.push({ type: 'say', who: '妻', text: `${s.story.asker.evidence}（${e.name}）` });
      out.push({ type: 'prop', name: 'evidence', item: e });
      s.stress = clamp(s.stress + 10);
      if (s.rnd() < rambleProb(s) * 0.5) { ramble(s, out); break; } // 頭が回らず話が通じない（証拠はまだ使える）
      e.used = true;
      if (e.affairId === null) out.push({ type: 'say', who: '夫', text: e.excuse, face: 'confused', push: true, ...tells(s, false) });
      else {
        const a = s.affairs[e.affairId];
        if (a.confessed) out.push({ type: 'say', who: '夫', text: line(s, 'already'), face: 'shame', push: true });
        else if (pressure(s, a) + 35 + (a.denied ? 15 : 0) >= a.wall) confessTrue(s, a, out);
        else { a.denied++; out.push({ type: 'say', who: '夫', text: line(s, 'evidence_deny'), face: 'surprise', after: 'evasive', push: true, ...tells(s, true, 0.85) }); }
      }
      s.bonus = 0; s.bonusTrue = 0;
      break;
    }
    case 'recheck': // しゃがんで目を合わせ、混乱をしずめてから、やさしく聞く（頭が回らない時に答えを取るため）
      s.confusion = clamp(s.confusion - 15); s.stress = clamp(s.stress - 5); s.pain = clamp(s.pain - 5);
      answer(s, nextHidden, s.bonusTrue - 10, 0.4, out);
      s.bonus = 0; s.bonusTrue = 0;
      break;
    case 'slap':
    case 'slapHard': { // 強さは2段階（2026-10-25 オーナー「叩く強さは2段階で」）
      const hard = id === 'slapHard', k = hard ? 1.5 : 0.65;
      if (hard) s.hardSlaps++; else s.slaps++;
      s.pain = clamp(s.pain + 22 * k); s.hp = clamp(s.hp - (hard ? 8 : 3)); s.stress = clamp(s.stress + (hard ? 15 : 10)); s.fear = clamp(s.fear + (hard ? 13 : 6));
      s.confusion = clamp(s.confusion + (hard ? 9 : 3)); s.noise = clamp(s.noise + (hard ? 28 : 12)); s.love = clamp(s.love - (s.minimized ? 14 : 6) * k);
      out.push({ type: 'fx', name: 'slap', hard });
      out.push({ type: 'say', who: '夫', text: line(s, s.minimized && s.rnd() < 0.5 ? 'slap_promise' : hard ? 'slap_hard' : 'slap'), face: 'pain', after: 'fear' }); // 頭が弾かれるのは手が当たった時（演出の側）
      checkNoise(s);
      break;
    }
    case 'finger': // 指を詰める（2026-10-25 オーナー指定）。切る瞬間は暗転と音だけ、明けると指に布が巻かれている（オーナー「Aで」）
      s.fingers++; s.bleed += 1; // 左手の小指から順に10本。体力は1本 9（10本で尽きる手前。血の分は時間で減る）
      s.pain = clamp(s.pain + 60); s.hp = clamp(s.hp - 9); s.stress = clamp(s.stress + 20); s.fear = clamp(s.fear + 45);
      s.confusion = clamp(s.confusion + 25); s.noise = clamp(s.noise + 38); s.love = clamp(s.love - 35);
      out.push({ type: 'fx', name: 'finger', n: s.fingers });
      out.push({ type: 'say', who: '夫', text: line(s, s.fingers >= 4 ? 'finger_late' : 'finger'), face: 'pain', after: 'cry', react: 'droop' }); // 4本目からは叫ぶ力もない
      checkNoise(s);
      break;
    case 'shock': // 電気ショック（2026-10-27 オーナー「電気ショックを加えたい」）: スタンガンを首筋に当てる。傷は残らないが体がはねて息が詰まる。回数を重ねるほど体力の減りが増す（心臓への負担）。怯えは慣れて効きが落ちる
      s.shocks++;
      s.pain = clamp(s.pain + 42); s.hp = clamp(s.hp - (5 + 2 * Math.min(s.shocks, 5))); s.stress = clamp(s.stress + 18); s.fear = clamp(s.fear + 10 + 35 * 0.8 ** (s.shocks - 1));
      s.confusion = clamp(s.confusion + 22); s.noise = clamp(s.noise + 26); s.love = clamp(s.love - 24);
      out.push({ type: 'fx', name: 'shock', n: s.shocks });
      out.push({ type: 'say', who: '夫', text: line(s, s.shocks >= 3 ? 'shock_late' : 'shock'), face: 'pain', after: 'exhausted', react: 'droop' }); // 3回目からは声にならない
      checkNoise(s);
      break;
    case 'hair': // 髪をつかんで顔を上げさせる（2026-10-27）: 軽い。目をそらせないので、隠し事があれば癖が出やすい（この場で5割＋2割、次の2手も+2割）
      s.hairPulls++; s.grip = 3; // この手の終わりで1減って、次の2手ぶん残る
      s.pain = clamp(s.pain + 8); s.fear = clamp(s.fear + 10); s.stress = clamp(s.stress + 8); s.love = clamp(s.love - 6); s.noise = clamp(s.noise + 4);
      out.push({ type: 'fx', name: 'hair' });
      out.push({ type: 'say', who: '夫', text: line(s, 'hair'), face: 'pain', after: 'fear', ...tells(s, !!nextHidden, 0.5) });
      break;
    case 'blind': // 目隠し（2026-10-27）: 怯えが上がってさめにくく、圧 +6。その間は顔（嘘の癖）が読めない両刃。外すと戻る。2回目からは効きが落ちる
      s.blind = !s.blind;
      if (s.blind) { s.blindUsed++; s.fear = clamp(s.fear + 20 * 0.7 ** (s.blindUsed - 1)); s.stress = clamp(s.stress + 10); s.love = clamp(s.love - 5); }
      else { s.stress = clamp(s.stress - 4); s.blindMin = 0; }
      out.push({ type: 'prop', name: 'blind', on: s.blind });
      out.push({ type: 'say', who: '夫', text: line(s, s.blind ? 'blind_on' : 'blind_off'), face: s.blind ? 'fear' : 'exhausted', react: s.blind ? 'flinch' : 'up' });
      break;
    case 'clipper': // バリカンで髪を刈る（2026-10-27）: 痛みはないが恥と怯えが大きい。刈った頭は最後まで残る（1回だけ）。責めの強さ +4
      s.shaved = true; s.fear = clamp(s.fear + 20); s.stress = clamp(s.stress + 24); s.love = clamp(s.love - 22); s.confusion = clamp(s.confusion + 5); s.noise = clamp(s.noise + 12);
      out.push({ type: 'fx', name: 'clipper' });
      out.push({ type: 'say', who: '夫', text: line(s, 'clipper'), face: 'shame', after: 'cry', react: 'droop' });
      checkNoise(s);
      break;
    case 'stones':
      s.stones = !s.stones;
      out.push({ type: 'prop', name: 'stones', on: s.stones });
      out.push({ type: 'say', who: '夫', text: line(s, s.stones ? 'stones_on' : 'stones_off'), face: s.stones ? 'pain' : 'exhausted' });
      s.noise = clamp(s.noise + (s.stones ? 6 : 0));
      break;
    case 'tools':
      s.fear = clamp(s.fear + 25 * 0.5 ** s.toolShows); s.stress = clamp(s.stress + 8); s.toolShows++;
      out.push({ type: 'prop', name: 'tools' });
      out.push({ type: 'say', who: '夫', text: line(s, 'tools'), face: 'fear', react: 'flinch' });
      break;
    case 'divorce':
      s.divorceUsed = true; s.fear = clamp(s.fear + 30); s.stress = clamp(s.stress + 25); s.love = clamp(s.love - 10);
      out.push({ type: 'prop', name: 'divorce' });
      out.push({ type: 'say', who: '夫', text: line(s, 'divorce'), face: 'surprise', after: 'cry', react: 'flinch' });
      break;
    case 'mother': // 義母に電話する（ふり）: 恥と動揺の役（怯え役の「道具を見せる」とは別）。頭は冷え、母に知られる前に終わらせたくて、次の問いに本当が出やすい
      s.motherUsed = true; s.stress = clamp(s.stress + 25); s.confusion = clamp(s.confusion - 10); s.love = clamp(s.love - 8); s.fear = clamp(s.fear + 5); s.bonusTrue += 12;
      out.push({ type: 'prop', name: 'phone_call' });
      out.push({ type: 'say', who: '夫', text: line(s, 'mother'), face: 'fear', react: 'flinch' });
      break;
    case 'phone': { // スマホを出させる → 中を自分で探す画面（出来事 phone）。1回に3つまでアプリを開ける。最初はロックの数字を言わせる
      s.phone++; s.looks = 3; s.opened = [];
      if (s.phone === 1) out.push({ type: 'say', who: '夫', text: line(s, 'phone'), face: 'fear' });
      else out.push({ type: 'say', who: '', text: line(s, 'phone_again') });
      s.stress = clamp(s.stress + 8);
      out.push({ type: 'phone' });
      break;
    }
    case 'look': { // スマホのアプリを開く（画面から。2分）
      if (s.looks <= 0 || s.opened.includes(arg) || !s.phoneRows[arg]) break;
      s.looks--; s.opened.push(arg); s.stress = clamp(s.stress + 2);
      out.push({ type: 'rows', app: arg });
      break;
    }
    case 'take': { // 怪しい行を証拠にする（画面から。1分）。関係ない物を取っても分からない（突きつけると言い訳が本当）
      const e = s.evidence[arg];
      if (!e || e.found) break;
      e.found = true; s.stress = clamp(s.stress + 6); s.fear = clamp(s.fear + 3);
      out.push({ type: 'found', item: e });
      break;
    }
    case 'cry':
      s.bonusTrue += 18 * 0.6 ** s.cries; s.cries++; s.love = clamp(s.love + 4);
      out.push({ type: 'fx', name: 'cry' });
      out.push({ type: 'say', who: '夫', text: line(s, 'cry'), face: 'shame', react: 'droop' });
      break;
    case 'silence': {
      s.stress = clamp(s.stress + 10);
      out.push({ type: 'fx', name: 'silence' });
      if (s.stress > 50 && s.rnd() < 0.25 && nextHidden && pressure(s, nextHidden) + 10 >= nextHidden.wall) confessTrue(s, nextHidden, out);
      else out.push({ type: 'say', who: '夫', text: line(s, 'silence'), face: 'shame' });
      break;
    }
    case 'rest': // 水を飲ませて休ませる。指の布も巻き直す（血が半分に）
      s.pain = clamp(s.pain - 30); s.confusion = clamp(s.confusion - 20); s.stress = clamp(s.stress - 15); s.hp = clamp(s.hp + 5);
      s.hunger = clamp(s.hunger - 10); s.bleed *= 0.5;
      out.push({ type: 'fx', name: 'rest' });
      out.push({ type: 'say', who: '夫', text: line(s, 'rest'), face: 'exhausted' });
      break;
    case 'feed':
      s.hunger = 0; s.confusion = clamp(s.confusion - 10); s.love = clamp(s.love + 5); s.stress = clamp(s.stress - 5);
      out.push({ type: 'prop', name: 'food' });
      out.push({ type: 'say', who: '夫', text: line(s, 'feed'), face: 'relief' });
      break;
    case 'leave': // 縛ったまま6時間放っておく（電気を消して部屋を出る）。何日も閉じ込める時に時間を進める（2026-10-25 オーナー「入れていいよ」）
      out.push({ type: 'fx', name: 'leave' });
      out.push({ type: 'say', who: '夫', text: line(s, 'leave'), face: 'exhausted', react: 'droop' });
      break;
    case 'sake': // 酒を飲ませる: 口が軽くなる（圧に上乗せ）が、頭が回らなくなり（関係ない話が増える）、本当の時にも癖が出て読みにくくなる。時間がたつとさめる
      s.drinks++; s.drunk = Math.min(3, s.drunk + 1);
      s.confusion = clamp(s.confusion + 18); s.fear = clamp(s.fear - 12); s.stress = clamp(s.stress - 12); s.love = clamp(s.love + 4); s.pain = clamp(s.pain - 5); s.hunger = clamp(s.hunger - 5);
      out.push({ type: 'fx', name: 'sake' });
      out.push({ type: 'say', who: '夫', text: line(s, 'sake'), face: s.drunk >= 2 ? 'confused' : 'relief' });
      break;
    case 'loosen': // 縄をゆるめる: 怯えが下がり愛情が戻る。その後に責めると、逃げられることがある（終わり）
      s.loose = true; s.fear = clamp(s.fear - 25); s.stress = clamp(s.stress - 12); s.love = clamp(s.love + 12); s.pain = clamp(s.pain - 10);
      out.push({ type: 'fx', name: 'loosen' });
      out.push({ type: 'say', who: '夫', text: line(s, 'loosen'), face: 'relief', after: 'shame' });
      break;
    case 'record': // 録音を始める: 自白の録音が証拠になり離婚の慰謝料が上がるが、夫は言葉を選ぶ（圧が下がる）。暴力も録音に残る
      s.recording = true; s.fear = clamp(s.fear + 8); s.stress = clamp(s.stress + 12);
      out.push({ type: 'fx', name: 'record' });
      out.push({ type: 'say', who: '夫', text: line(s, 'record'), face: 'surprise', after: 'evasive', react: 'flinch' });
      break;
  }
  if (s.grip > 0) s.grip--;
  // 縄をゆるめた後に責めると、逃げられることがある（強い責めほど・怯えが強いほど）
  const bolt = { slap: 0.12, slapHard: 0.3, finger: 0.45, shock: 0.35, hair: 0.1, clipper: 0.3, blind: 0.05, tools: 0.1, divorce: 0.08, mother: 0.08, leave: 0.6, stones: s.stones ? 0.15 : 0 }[id] || 0;
  if (!s.ended && s.loose && bolt && s.rnd() < bolt + (s.fear > 60 ? 0.15 : 0)) { s.ended = 'escape'; out.push({ type: 'say', who: '', text: line(s, 'escape') }); }
  if (!s.ended && s.confusion > 70 && s.rnd() < 0.3 && id !== 'push') out.push({ type: 'say', who: '夫', text: line(s, 'exhausted'), face: 'exhausted', react: 'droop' });
  if (!s.ended && s.hp <= 0) s.ended = 'death';
  // 死にそうな時は知らせる（体力 30 前後と 12 前後で1回ずつ。境目はゲームごとにずれる）
  if (!s.ended && s.hp < s.fuzz.warn2 && s.warned < 2) { s.warned = 2; out.push({ type: 'say', who: '', text: line(s, 'warn2'), face: 'exhausted', react: 'droop' }); }
  else if (!s.ended && s.hp < s.fuzz.warn1 && s.warned < 1) { s.warned = 1; out.push({ type: 'say', who: '', text: line(s, 'warn1'), face: 'exhausted', react: 'droop' }); }
  return finish(s, out);
}

// 朝: 会社に「熱で休みます」と電話して、閉じ込めたまま次の日へ。3日休ませると、心配した同僚が警察を連れて来る
export function keepGoing(s) {
  const out = [];
  if (s.ended !== 'morning') return out;
  if (s.day >= MAX_DAYS) { s.ended = 'missing'; return finish(s, out); }
  s.ended = null; s.day++; s.morningAt += 24 * 60;
  out.push({ type: 'say', who: '', text: s.day === 2 ? '（夫の会社に電話した。「熱が出たので、今日は休ませます」）' : '（また会社に電話した。上司の声が、少し疑っている）' });
  return finish(s, out);
}

function finish(s, out) {
  out.push({ type: 'state' });
  if (s.ended) out.push({ type: 'end', reason: s.ended });
  return out;
}

// ---------- 判決と答え合わせ
const yen = (man) => `${Math.round(man)}万円`;
export const STR_YEN = { 強: 60, 中: 40, 弱: 15 }; // 証拠の強さ → 慰謝料の上乗せ（万円）
export function verdict(s, kind) {
  const N = s.affairs.length;
  const hidden = s.affairs.filter((a) => !a.confessed);
  const told = N - hidden.length;
  const force = s.slaps * 1.5 + s.hardSlaps * 3 + s.fingers * 8 + s.shocks * 5 + s.hairPulls + (s.shaved ? 4 : 0) + s.stonesMin / 10 + (s.divorceUsed ? 3 : 0) + (s.motherUsed ? 1 : 0) + s.toolShows;
  const coercion = force >= 12;     // 責めすぎ（民法96条の強迫に当たりそう、の目安）
  // 証拠で裏付けた自白（浮気ごとに、見つけた物のうち一番強い物）。強さは RESEARCH_evidence.md（2026-10-26）: 強＝肉体関係を示す物 60万・中＝組み合わせで効く物 40万・弱＝単独では弱い物 15万
  const backing = s.affairs.filter((a) => a.confessed).map((a) => s.evidence.filter((e) => e.found && e.affairId === a.id).sort((x, y) => (STR_YEN[y.strength] || 0) - (STR_YEN[x.strength] || 0))[0]).filter(Boolean);
  let title, text, good, amount = null, arrested = false;
  const h0 = hidden[0];
  // 死なせた・通報された時は、妻が警察に連行される（2026-10-25 オーナー「そうなったら妻は警察に連行」）
  if (s.ended === 'death' && !kind) { title = '死なせてしまった'; text = `夫は、もう息をしていなかった。${s.fingers ? '指に巻いた布は、赤く染まっていた。' : s.shocks ? '首筋に、赤い点が二つ残っていた。' : ''}遠くからサイレンが近づいてくる。あなたは手錠をかけられ、警察に連行された。`; good = false; arrested = true; }
  else if (s.ended === 'police' && !kind) { title = '通報'; text = 'ピンポーン。「警察です。悲鳴が聞こえると通報がありました」。椅子に縛られた夫を見て、警官の顔色が変わった。あなたは警察に連行された。'; good = false; arrested = true; }
  else if (s.ended === 'escape' && !kind) { title = '逃げられた'; text = `ゆるめた縄から腕が抜けて、夫は玄関から飛び出していった。${force > 0 ? '翌朝、夫の弁護士から電話が来た。「監禁と暴行で、こちらから訴えます」' : '翌朝、夫は実家から電話をかけてきた。「……もう、戻らない」'}`; good = false; }
  else if (s.ended === 'missing' && !kind) { title = '無断欠勤'; text = `夫が${s.day}日も会社を休んだ。心配した同僚が訪ねてきて、警察を呼んだ。椅子に縛られた夫が見つかり、あなたは警察に連行された。`; good = false; arrested = true; }
  else if (kind === 'forgive') {
    if (h0) { title = 'また浮気'; text = `3か月後、夫のスマホがまた光った。相手は——${h0.partner}。`; good = false; }
    else if (s.love >= 40) { title = 'やり直し'; text = '全部聞いた。全部許した。朝、夫は小さな声で「いってきます」と言った。'; good = true; }
    else { title = '形だけの夫婦'; text = '全部聞いて、許した。でも夫はもう、あなたの目を見ない。'; good = false; }
  } else if (kind === 'pledge') {
    if (coercion) { title = '誓約書は無効'; text = '弁護士は言った。「縛って、殴って書かせた誓約書は、強迫で取り消せます」'; good = false; }
    else if (h0) { title = '誓約書が効いた'; text = `半年後、${h0.partner}との浮気が見つかった。誓約書どおり、違約金100万円。`; good = true; amount = 100; }
    else { title = 'やり直し（誓約書つき）'; text = '「次はない」。誓約書は、冷蔵庫の扉の内側に貼った。'; good = true; }
  } else {
    amount = 100 + backing.reduce((m, e) => m + (STR_YEN[e.strength] || STR_YEN.弱), 0);
    if (s.recording) amount *= 1.5; // 自白の録音が証拠になる
    const strong = backing.find((e) => e.strength === '強');
    let note = (strong ? `『${strong.name}』が肉体関係の証拠になった。` : '') + (s.recording && !coercion ? '自白の録音が決め手になった。' : '');
    if (coercion) { amount *= s.recording ? 0.25 : 0.4; note = s.recording ? '録音には、あなたの暴力も残っていた。夫の弁護士はそれを使い、慰謝料は大きく削られた。' : '夫の弁護士はあなたの暴力を訴えた。その分を差し引かれた。'; }
    amount = Math.max(0, amount);
    title = '離婚'; text = `慰謝料は${yen(amount)}。${note}`; good = amount >= 150 && !coercion;
  }
  // 終わりの後の場面（epilogue.js）。連行された時は無し。誓約書で許した時も夫婦は続くので、家の朝を見せる（2026-10-25 オーナー「終了後の生活をモーションで」）
  let epilogue = null;
  if (!arrested && kind === 'divorce') epilogue = { scene: 'apart', amount, coercion, partner: h0?.name || null };
  else if (!arrested && kind) {
    const mood = h0 && !(kind === 'pledge' && coercion) ? 'phone' : kind === 'pledge' ? (coercion ? 'cold' : 'warm') : s.love >= 40 ? 'warm' : 'cold';
    epilogue = { scene: 'home', mood, partner: h0?.name || null, later: mood === 'phone' && kind === 'forgive' ? '3か月後' : '半年後', tell: s.tell };
  }
  // 点: 吐かせた割合（60）＋責めの軽さ（手を上げなければ 30・責めすぎは 0）＋良い結末（10）。嘘の自白が無くなったので、責めすぎの重みを上げた
  const score = arrested ? 0 : Math.round(60 * told / N + (force === 0 ? 30 : force < 6 ? 23 : force < 12 ? 15 : 0) + (good ? 10 : 0));
  const rank = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  return {
    kind, title, text, good, amount, score, rank, coercion, arrested, epilogue,
    reveal: {
      count: N, told,
      affairs: s.affairs.map((a) => ({ partner: a.partner, when: a.when, place: a.place, confessed: a.confessed })),
      rambles: s.rambles,
      tell: s.tell, force: Math.round(force), slaps: s.slaps, hardSlaps: s.hardSlaps, fingers: s.fingers, shocks: s.shocks, hairPulls: s.hairPulls, shaved: s.shaved,
      perfect: force === 0 && !hidden.length, // 江戸の吟味役も唸る
    },
  };
}
