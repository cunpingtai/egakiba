// 判定（画面に依存しない。テストは npm test）
import { CFG } from './config.js';

// 区間の許容値：押した回数が目標に届くほど上がる
export const tolerance = (presses, C = CFG) => C.tolBase + C.tolGain * Math.min(presses / C.pressTarget, 1);
// 区間の崩れ（0〜1）：上限を超えて押した回数で決まる
export const crumble = (presses, C = CFG) => Math.min(Math.max(0, presses - C.pressLimit) / C.crumbleFull, 1);
// 骨の位置 t（0＝頭側〜1＝尾側）が何番目の区間か
export const sectionAt = (t, C = CFG) => Math.min(C.sections - 1, Math.max(0, Math.floor(t * C.sections)));

// 抜くときの負荷。毎フレーム update(秒, この間に抜けた量, 延長線からの横ずれ) を呼ぶ。
// 負荷 = ぶれ（横ずれ）＋ペース（短い平均と長い平均の速さの差＋速すぎ）。parts は直前の内訳（折れた原因を決めるため）
// 速すぎは引き始めの猶予（paceGrace）にも数える（猶予の間にシュッと抜ききると負荷 0 で名人になっていた。2026-10-29）
export function createPullMeter(C = CFG) {
  let t = 0, vf = 0, vs = 0, load = 0;
  const ema = (a, b, tau, dt) => a + (b - a) * (1 - Math.exp(-dt / tau));
  const parts = { dev: 0, pace: 0 };
  return {
    parts,
    update(dt, dPull, dev) {
      const v = dPull / dt;
      if (t === 0) vf = vs = v;
      t += dt;
      vf = ema(vf, v, C.paceFast, dt); vs = ema(vs, v, C.paceSlow, dt);
      parts.dev = Math.abs(dev) / C.devTol * C.devWeight;
      const fast = Math.max(0, vf / C.maxSpeed - 1) * C.fastWeight;
      parts.pace = ((t < C.paceGrace ? 0 : Math.abs(vf - vs) / Math.max(vs, C.minSpeed)) + fast) * C.paceWeight;
      load = ema(load, parts.dev + parts.pace, C.loadSmooth, dt);
      return load;
    },
  };
}

// 折れた原因：ほぐしていれば耐えた負荷なら「ほぐし不足」、それ以外はぶれとペースの大きいほう
export const breakCause = (presses, load, parts, C = CFG) =>
  presses < C.pressTarget && load <= tolerance(C.pressTarget, C) ? 'loose' : parts.dev >= parts.pace ? 'dev' : 'pace';

// 結果：presses＝区間ごとの押した回数、extracted＝抜けた割合（0〜1）、broke＝折れたか、cause＝折れた原因、meanRatio＝引いている間の 負荷÷許容値 の平均
// kind（完成形）：legend（全部きれい）／ryotei（欠点1つ）／almost（欠点2〜3）／shaky（ガタガタでも抜けた）／crumbled（ボロボロの身）／
//                 loose・dev・pace（折れた原因）／mixed（折れた＋ボロボロ）／revived（ほとんど抜けずに折れた。ほかの何より優先）
export function evaluate({ presses, extracted, broke, cause = 'dev', meanRatio }, C = CFG) {
  const crumbled = presses.filter(p => crumble(p, C) > 0).length;
  const flesh = crumbled >= C.crumbledMany ? 'crumbled' : crumbled > 0 ? 'bitCrumbled' : 'fluffy';
  const pull = meanRatio <= C.pullGradeA ? 'A' : meanRatio <= C.pullGradeB ? 'B' : 'C';
  const flaws = [presses.some(p => p < C.pressTarget) && 'loose', flesh === 'bitCrumbled' && 'bitCrumbled', pull === 'B' && 'pullB'].filter(Boolean);
  const kind = broke ? (extracted < C.reviveBelow ? 'revived' : flesh === 'crumbled' ? 'mixed' : cause)
    : flesh === 'crumbled' ? 'crumbled' : pull === 'C' ? 'shaky' : ['legend', 'ryotei', 'almost', 'almost'][flaws.length];
  return { kind, flaws, bone: broke ? 'broken' : 'clean', flesh, leftBone: broke, extractedPct: Math.round(extracted * 100), crumbled, pull };
}

// ---------- 完成名と一言（「原因｜結果」。画面では区切りでだけ改行する。英語は行ごとに1つ。2026-10-27・10-29 運営者が直した文言） ----------
export const FIXED = {
  legend: { ja: ['幻の一本抜き'], en: 'The Legendary Clean Pull', adv: ['骨まで美しい。サンマも本望だろう', 'A bone this beautiful. The saury is honored.'] },
  revived: { ja: ['骨が残りすぎて', '息を吹き返した'], en: 'So Much Bone Left, It Came Back to Life', adv: ['骨が残っているとまだ泳げるらしい', 'With its bone still in, it thinks it can swim.'] },
  ryotei: { ja: ['サンマの骨抜き名人'], en: 'Master Saury Deboner', adv: ['美しいがまだ上を目指せる', 'Beautiful, but you can go higher.'] },
};
export const NAMES = {
  loose: [
    ['ほぐさず引いて', '骨と身が離れたがらない', "Not Loosened, and the Bone Won't Let Go"],
    ['いきなり抜いて', '骨が身に立てこもった', 'Pulled Too Soon, the Bone Barricaded In'],
    ['下ごしらえを飛ばして', '骨と身が両想い', 'Skipped the Prep. Bone and Flesh in Love'],
    ['押さずに挑んで', '中骨が籠城した', 'No Pressing, and the Bone Held the Fort'],
  ],
  dev: [
    ['右へ左へ迷って', '骨が途中下車した', 'Wandered Left and Right, the Bone Got Off Early'],
    ['蛇行して引いて', '骨が寄り道した', 'Zigzagged, and the Bone Took a Detour'],
    ['よそ見して引いて', '骨を置き去りにした', 'Looked Away and Left the Bone Behind'],
    ['斜めに引いて', '骨がぽっきり分かれた', 'Pulled at an Angle, Snap Went the Bone'],
  ],
  pace: [
    ['急に引いて', '骨がびっくりした', 'Yanked It, and the Bone Got Startled'],
    ['緩急をつけすぎて', '骨がついてこれなかった', "Too Much Stop-and-Go, the Bone Couldn't Keep Up"],
    ['ぐいっといって', '骨が泣き別れした', 'One Big Tug, and the Bone Tore in Two'],
    ['力任せに引いて', '骨が半分家出した', 'Brute Force, and Half the Bone Ran Away'],
  ],
  // ほぐしすぎ（crumbled・mixed）は瓶詰めのフレークになる（2026-10-26 ユーザー指定）
  crumbled: [
    ['ほぐしすぎて', '瓶詰めフレークになった', 'Over-Loosened into Jarred Flakes'],
    ['押しすぎて', 'ごはんのお供になった', 'Pressed into a Rice Topping'],
    ['つつきすぎて', '保存食になった', 'Poked into a Pantry Staple'],
    ['箸で突きすぎて', '瓶に詰められた', 'Jabbed Too Much, Now in a Jar'],
  ],
  shaky: [
    ['ガタガタ引いたのに', 'なぜか抜けた', 'Pulled It Rough, Somehow It Came Out'],
    ['震える箸で', '奇跡的に抜けた', 'Shaky Chopsticks, Miracle Pull'],
    ['荒っぽく引いて', '骨が根負けした', 'Pulled So Rough the Bone Gave Up'],
    ['勢いだけでも', '結果オーライ', 'All Momentum, Still Worked Out'],
  ],
  mixed: [
    ['突いて折って', '骨ごとフレークになった', 'Jabbed and Snapped into Flakes, Bones and All'],
    ['押しすぎて折って', '骨入りフレークになった', 'Pressed and Snapped into Flakes with Bones'],
    ['何もかも力任せで', '瓶に収まった', 'All Brute Force, Now It Fits in a Jar'],
    ['全力でいじって', 'フレークしか残らない', 'Messed With It All, Only Flakes Remain'],
  ],
  almost: [
    ['少し崩れたけど', 'ほぼ完璧', 'A Little Crumbly, but Almost Perfect'],
    ['ちょっとぶれてるけど', '家庭でいちばん上手', 'A Bit Wobbly, but Best in the House'],
    ['あと一歩で', '骨抜きで食べていけた', 'One Step from Deboning for a Living'],
    ['まあまあ丁寧で', '及第点', 'Fairly Careful. A Passing Grade'],
  ],
};
// 一言：完成形ごと（料亭は欠点ごと）に数本。[日本語, 英語]
export const ADVICE = {
  loose: [['もっとほぐすと、骨が身から離れやすくなる', 'Loosen it more, and the bone lets go easier.'], ['ほぐしたりないとこんな感じになる', 'This is what under-loosening gets you.']],
  dev: [['頭はまっすぐ引こう', 'Pull the head straight.'], ['骨はそんなに曲がれない', "Bones can't bend that much."]],
  pace: [['骨抜きは一定の速さで。急がば回れ', 'Slow and steady. Rushing snaps the bone.'], ['急に引くと、骨はついてこない', "Yank it, and the bone won't follow."]],
  crumbled: [['押すのは全体をまんべんなく、ほどほどに', 'Press evenly, and not too much.'], ['ほぐすのと、つぶすのは違う', 'Loosening is not mashing.']],
  shaky: [['抜けたのは運。次はまっすぐ一定の速さで', 'That was luck. Next time: straight and steady.'], ['骨の気持ちになって、ゆっくり引こう', 'Think like a bone. Pull gently.']],
  mixed: [['サンマは逃げない。落ち着いて、もう一度', "The fish isn't going anywhere. Breathe and try again."], ['ごはんにかけるなら満点', 'Perfect, if it is going on rice.']],
  almost: [['あと少し。まんべんなくほぐして、まっすぐ一定に', 'So close. Loosen evenly, pull straight and steady.'], ['名人まであとちょっと', 'Mastery is just around the corner.']],
  // 料亭（欠点1つ）：その欠点への一言
  flaw: {
    loose: ['ほぐしが足りない所がある。全体を均一に', 'Some spots were not loosened. Press it all evenly.'],
    bitCrumbled: ['押しすぎた所が少しある。ほどほどに', 'You over-pressed a spot or two. Go easy.'],
    pullB: ['引く速さをもう少しそろえよう', 'Keep your pulling speed a little more even.'],
  },
};

// 完成名と一言（kind・名前の番号 ni・一言の番号 ai・料亭の欠点 flaw から決まる）。両方の言語を返す。ありえない組み合わせなら null
// 共有ページ（worker/index.js）も、送られた番号からここで文を作り直す（任意の文字を受け取らないため）
export function textFor(kind, ni = 0, ai = 0, flaw) {
  if (Object.hasOwn(FIXED, kind)) {
    const f = FIXED[kind], extra = kind === 'ryotei' ? ADVICE.flaw[flaw] : null;
    if (kind === 'ryotei' && !extra) return null;
    return { ja: { parts: f.ja, advice: f.adv[0] + (extra ? '。' + extra[0] : '') }, en: { parts: [f.en], advice: f.adv[1] + (extra ? ' ' + extra[1] : '') } };
  }
  const name = Object.hasOwn(NAMES, kind) && NAMES[kind][ni], adv = name && ADVICE[kind][ai];
  if (!adv) return null;
  const [a, b, en] = name;
  return { ja: { parts: [a, b], advice: adv[0] }, en: { parts: [en], advice: adv[1] } };
}
// 完成名と一言を選ぶ。言語を切り替えても同じものを出せるよう、両方の言語を返す（pick は共有に送る番号）
export function nameFor(r, rand = Math.random) {
  const ni = NAMES[r.kind] ? Math.floor(rand() * NAMES[r.kind].length) : 0, ai = ADVICE[r.kind] && !FIXED[r.kind] ? Math.floor(rand() * ADVICE[r.kind].length) : 0;
  return { ...textFor(r.kind, ni, ai, r.flaws[0]), pick: { kind: r.kind, ni, ai, flaw: r.kind === 'ryotei' ? r.flaws[0] : '' } };
}
