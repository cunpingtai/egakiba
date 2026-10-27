// 妻の動き（行動ごと）。キーの書き方は wife.js の頭。位置は [右, 上, 前]（m）、時刻は秒。数字はすべて設計判断で、撮って確かめて決めた。
// 目印（at）: cheekL・chin・underChin・mouth・eyes・shoulderL/R・kneeL/R・pocket・handL・pinkyL（夫の体）、face0（夫の顔の前の決まった所）・stone・paperSpot（物）、body（妻の肩）
// 夫が目で追う物の位置を、動く目（eyes）から決めると、見下ろす → 手が下がる → また見下ろす、と追いかけ合うので、見せる物は face0 から決める
// 体の view（カメラの立ち位置）: base・reach（手が顔に届く）・near（顔の前に物を見せる）・stare・crouch・lap・table・side・behind・bow・cuffs（中身は main.js）
import { mirror } from './wife.js';

// 手の形（2026-10-25 オーナー「女性の指が全体的におかしい。スマホ持つ時とか指差す時とか」→ 指はそろえ（tog）、親指は曲げて手のひらの側へ倒す（topp・tcurl）形に作り直した）。
// 物を持つ形は曲げを多めにしておき、指は物に当たった所で止める（hand.js。オーナー「手とスマホ貫通してるでしょ」）
const RELAX = { curl: 0.3, tog: 0.45, thumb: 0.3, tcurl: 0.2 };
const FLAT = { curl: -0.05, tog: 0.75, thumb: 0.65 }; // ビンタ（オーナー「いい感じ」のまま）
const POINT = { curl: [0.02, 1.45, 1.55, 1.5], tog: 0.6, thumb: 0, topp: 0.8, tcurl: 0.6 }; // 人差し指だけ伸ばし、親指は曲げた中指の上へ
const LIFT = { curl: [0.5, 1.1, 1.2, 1.2], tog: 0.6, thumb: 0.6, tcurl: 0.2 };
const SOFT = { curl: 0.12, tog: 0.9, thumb: 0.45, tcurl: 0.15 };
const PHONE = { curl: 0.45, kn: 0.35, tog: 1.05, thumb: 1.4, tcurl: 0.2 }; // スマホ: そろえた指を曲げて腹で裏を支え、親指は横の縁に当てる
const FIST = { curl: 1.5, tog: 0.9, topp: 0.85, tcurl: 0.7 };
const PINCH = { curl: [0.3, 0.38, 0.5, 0.6], tog: 0.8, thumb: 0.3, topp: 0.35, tcurl: 0.3 };
const CUP = { curl: 1.3, kn: 0.2, tog: 1.0, thumb: 0.5, topp: 0.15, tcurl: 0.35 }; // コップ・湯呑み・マグ: 指は当たるまで巻きつけ、親指は外の横に沿わせる（手のひらへ倒すと口に入る）
const GRAB = { curl: 0.85, tog: 0.8, thumb: 0.3, topp: 0.6, tcurl: 0.5 };
const PRESS = { curl: 0.25, tog: 0.8, thumb: 0.35, tcurl: 0.15 };
const COVER = { curl: 0.15, tog: 0.95, thumb: 0.5 };
const HEAVY = { curl: 0.35, tog: 0.7, thumb: 0.15, tcurl: 0.1 };

// 下ろした手（画面の外）
const DOWN = { at: 'body', p: [0.1, -0.62, 0.1], g: [0, -1, 0.1], n: [-1, 0, 0], pole: [0.3, -0.3, -1], ...RELAX };
const DOWNL = mirror(DOWN);

// ---------- ビンタ（右手で夫の左頬）。hard は思い切り（大きく振りかぶって速く・強く）
export function slap(hard) {
  const W1 = hard ? [0.28, 0.06, 0.08] : [0.17, -0.06, 0.2];
  const t1 = hard ? 0.42 : 0.3, t2 = hard ? 0.62 : 0.4, th = t2 + (hard ? 0.13 : 0.12), stop = hard ? 0.06 : 0.035;
  const HIT = { at: 'cheekL', palm: true, g: [0.25, 0.5, 0.85], n: [-0.75, 0, 0.66], pole: [0.6, -0.8, -0.1], ...FLAT };
  return {
    r: [
      { t: 0, ...DOWN },
      { t: t1, at: 'body', p: W1, g: [0.15, 0.95, -0.15], n: [-0.35, 0, 0.94], pole: [0.8, -0.55, -0.2], curl: 0.05, tog: 0.6, thumb: 0.5 },
      { t: t2, at: 'body', p: [W1[0] + 0.05, W1[1] + 0.04, W1[2] - 0.06], g: [0.3, 0.92, -0.25], n: [-0.25, 0, 0.97], pole: [0.85, -0.5, -0.2], ...FLAT },
      { t: th, ...HIT, p: [-0.004, 0, 0.003], ease: 'in' }, // 当たる
      { t: th + stop, ...HIT, p: [-0.004, 0, 0.003], ease: 'lin' }, // 一瞬止まる
      { t: th + stop + 0.06, ...HIT, p: [0.04, -0.02, -0.06], ease: 'out' }, // 頬から跳ね返る
      { t: th + 0.26, at: 'cheekL', p: [0.12, -0.12, -0.15], g: [0.1, 0.6, 0.8], n: [-0.8, 0, 0.3], pole: [0.6, -0.8, -0.2], curl: 0.15, tog: 0.4, thumb: 0.3 },
      { t: th + 0.65, ...DOWN, hide: true },
    ],
    body: [
      { t: 0, view: 'base' },
      { t: t1, view: 'reach', twist: hard ? -0.15 : -0.06 },
      { t: t2, view: 'reach', twist: hard ? -0.2 : -0.1 },
      { t: th, view: 'reach', twist: hard ? 0.22 : 0.12, ease: 'in' },
      { t: th + 0.3, view: 'reach', twist: 0.06 },
      { t: th + 0.55, view: 'reach', twist: 0 },
      { t: th + 1.25, view: 'base' },
    ],
    ev: [{ t: 0, name: 'cower' }, { t: th, name: 'hit', freeze: ['cheekL'] }],
  };
}

// ---------- 他にもあるでしょ？: 顔を指さして、2回突きつける
const PT = { at: 'face0', g: [-0.3, 0.32, 1], n: [0, -1, 0.3], pole: [0.7, -0.7, 0], ...POINT }; // 胸の高さから顔へ向けて指す（上から見ると指先が口に重ならない）
export const point = {
  r: [
    { t: 0, ...DOWN },
    { t: 0.45, ...PT, p: [0.08, -0.08, -0.3] }, // 指先は顔から 10cm ほど手前で止まる
    { t: 0.62, ...PT, p: [0.07, -0.07, -0.26], ease: 'out' },
    { t: 0.8, ...PT, p: [0.08, -0.08, -0.3] },
    { t: 0.97, ...PT, p: [0.07, -0.07, -0.255], ease: 'out' },
    { t: 1.5, ...PT, p: [0.08, -0.08, -0.29] },
    { t: 2.0, ...DOWN, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.45, view: 'near', twist: 0.04 }, { t: 1.5, view: 'near', twist: 0.04 }, { t: 2.1, view: 'base' }],
  ev: [{ t: 0, name: 'watchFace' }, { t: 2.0, name: 'unwatch' }],
};

// ---------- 答えの分かる質問: 手のひらを上にして、あごの下に指先を入れ、顔を上げさせる
const LF = { at: 'underChin', palm: true, g: [-0.1, 0.05, 1], n: [0, 1, 0], pole: [0.6, -0.8, -0.1], curl: [0.3, 0.35, 0.45, 0.55], tog: 0.6, thumb: 0.4 };
export const liftChin = {
  r: [
    { t: 0, ...DOWN },
    { t: 0.5, ...LF, p: [0.0, -0.04, -0.09] },
    { t: 0.75, ...LF, p: [0.0, -0.016, -0.065], ease: 'out' },
    { t: 1.15, ...LF, p: [0.0, -0.01, -0.065] },
    { t: 1.9, ...LF, p: [0.0, -0.01, -0.065] },
    { t: 2.4, ...DOWN, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.5, view: 'reach' }, { t: 1.9, view: 'reach' }, { t: 2.6, view: 'base' }],
  ev: [{ t: 0.8, name: 'lift' }, { t: 2.0, name: 'unlift' }],
};

// ---------- 怒らないから言って: 叩いた頬をそっとなでる
const CR = { at: 'cheekL', palm: true, g: [0.25, 0.5, 0.85], n: [-0.75, 0, 0.66], pole: [0.6, -0.8, -0.1], ...SOFT };
export const caress = {
  r: [
    { t: 0, ...DOWN },
    { t: 0.6, ...CR, p: [0.015, 0.004, -0.006] },
    { t: 0.85, ...CR, p: [0.001, 0.004, 0.001] },
    { t: 1.3, ...CR, p: [0.001, -0.016, 0.001] },
    { t: 1.75, ...CR, p: [0.001, 0.006, 0.001] },
    { t: 2.2, ...CR, p: [0.001, -0.006, 0.001] },
    { t: 2.8, ...DOWN, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'reach' }, { t: 2.3, view: 'reach' }, { t: 3.0, view: 'base' }],
};

// スマホの付け方（持つ所の軸で。main.js の phoneIn など）と、画面の真ん中
export const PHONE_AT = [0.004, 0.06, 0.016];
const PHONE_C = [0.004, 0.08, 0.022];

// ---------- 証拠を突きつける: 夫のスマホの画面を顔の前に突き出す（画面は夫の側）
const SP = { at: 'face0', palm: true, g: [0.05, 1, 0], n: [-0.1, 0, 1], pole: [0.7, -0.7, -0.1], ...PHONE };
export const showPhone = {
  r: [
    { t: 0, ...DOWN, ...PHONE },
    { t: 0.55, ...SP, p: [0.034, -0.08, -0.234] },
    { t: 0.8, ...SP, p: [0.034, -0.08, -0.174], ease: 'out' },
    { t: 2.7, ...SP, p: [0.034, -0.08, -0.174] },
    { t: 3.3, ...DOWN, ...PHONE, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.55, view: 'near' }, { t: 2.7, view: 'near' }, { t: 3.4, view: 'base' }],
  ev: [{ t: 0, name: 'phoneIn' }, { t: 0, name: 'watchHand' }, { t: 0.8, name: 'show' }, { t: 3.3, name: 'unwatch' }],
};

// ---------- スマホを出させる: 夫のズボンの左の前ポケットから抜き取り、自分の顔の前で見る
const PK = { at: 'pocket', g: [0, -0.2, 1], n: [0, -1, 0], pole: [0.6, -0.6, -0.5] };
const LOOK = { at: 'body', tip: PHONE_C, p: [-0.14, 0.1, 0.34], g: [0.05, 1, 0.35], n: [0.1, -0.35, -1], pole: [0.6, -0.8, 0], ...PHONE }; // 画面を自分に向けて立てる（手のひらは自分の側・親指は右の縁）
export const takePhone = {
  r: [
    { t: 0, ...DOWN },
    { t: 0.7, ...PK, p: [0, 0.03, -0.05], ...PRESS },
    { t: 0.95, ...PK, p: [0, 0.0, 0.0], curl: 0.5, tog: 0.5, thumb: 0.4 },
    { t: 1.3, ...PK, p: [0, 0.05, -0.1], ...PHONE },
    { t: 1.9, ...LOOK },
    { t: 3.2, ...LOOK, wait: true }, // スマホの中を探している間は持ったまま（main.js の browsePhone → play() の release まで）
    { t: 3.8, ...DOWN, ...PHONE, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.7, view: 'lap' }, { t: 1.3, view: 'lap' }, { t: 1.9, view: 'base' }, { t: 3.8, view: 'base' }],
  ev: [{ t: 0.5, name: 'watchHand' }, { t: 1.05, name: 'takeOut' }, { t: 2.1, name: 'look' }, { t: 3.6, name: 'unwatch' }],
};

// 膝に重しが乗っている時は、重しをよけて太ももの外側からポケットに手を入れる（2026-10-25 オーナー「岩を置いたあとに別のモーション入れると重なってます」）
const PKS = { at: 'pocketSide', g: [0, -0.55, 1], n: [-1, 0, 0], pole: [0.8, -0.5, -0.3] };
export const takePhoneSide = {
  ...takePhone,
  r: [
    { t: 0, ...DOWN },
    { t: 0.7, ...PKS, p: [0.04, 0.04, -0.04], ...PRESS },
    { t: 0.95, ...PKS, p: [0, 0, 0], curl: 0.5, tog: 0.5, thumb: 0.4 },
    { t: 1.3, ...PKS, p: [0.05, 0.07, -0.1], ...PHONE },
    { t: 1.9, ...LOOK },
    { t: 3.2, ...LOOK, wait: true }, // スマホの中を探している間は持ったまま（main.js の browsePhone → play() の release まで）
    { t: 3.8, ...DOWN, ...PHONE, hide: true },
  ],
};

// ---------- 落ち着いて聞き直す: しゃがんで目の高さを合わせ、両手を夫のひざに置く（話が終わるまで）
const KN = { at: 'kneeL', palm: true, p: [0, 0.008, 0.01], g: [0, -0.15, 1], n: [0, -1, 0.05], pole: [0.6, -0.4, -0.7], ...PRESS };
export const kneel = {
  r: [{ t: 0, ...DOWN }, { t: 0.9, ...KN }, { t: 1.2, ...KN, wait: true }, { t: 1.8, ...DOWN, hide: true }],
  l: [{ t: 0, ...DOWNL }, { t: 0.9, ...mirror(KN), at: 'kneeR' }, { t: 1.2, ...mirror(KN), at: 'kneeR' }, { t: 1.8, ...DOWNL, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.9, view: 'crouch' }, { t: 1.2, view: 'crouch', wait: true }, { t: 2.1, view: 'base' }],
  ev: [{ t: 0.6, name: 'watchFace' }, { t: 1.9, name: 'unwatch' }],
};

// ---------- 膝に重しを乗せる: 両手で漬物石を持ち上げて膝に乗せる。下ろす時は持ち上げて足元へ
const ST = { at: 'stone', palm: true, p: [0.135, 0.0, 0.0], g: [0, -0.25, 1], n: [-1, 0, 0], pole: [0.5, -0.6, -0.6], ...HEAVY };
const STL = { ...mirror(ST), at: 'stone' };
export const stonesOn = {
  r: [{ t: 0, ...ST }, { t: 1.3, ...ST }, { t: 1.5, ...ST, p: [0.18, 0.02, -0.03], ...RELAX }, { t: 2.1, ...DOWN, hide: true }],
  l: [{ t: 0, ...STL }, { t: 1.3, ...STL }, { t: 1.5, ...STL, p: [-0.18, 0.02, -0.03], ...RELAX }, { t: 2.1, ...DOWNL, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'lap' }, { t: 1.6, view: 'lap' }, { t: 2.3, view: 'base' }],
  ev: [{ t: 1.3, name: 'place' }],
  stone: [{ t: 0, p: [0, 0.0, 0.45] }, { t: 0.75, p: [0, 0.17, 0.22] }, { t: 1.15, p: [0, 0.1, 0.04] }, { t: 1.3, p: [0, 0, 0], ease: 'in' }],
};
export const stonesOff = {
  r: [{ t: 0, ...DOWN }, { t: 0.6, ...ST, p: [0.18, 0.02, -0.03], ...RELAX }, { t: 0.8, ...ST }, { t: 1.7, ...ST }, { t: 1.8, ...DOWN, hide: true }],
  l: [{ t: 0, ...DOWNL }, { t: 0.6, ...STL, p: [-0.18, 0.02, -0.03], ...RELAX }, { t: 0.8, ...STL }, { t: 1.7, ...STL }, { t: 1.8, ...DOWNL, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'lap' }, { t: 1.2, view: 'lap' }, { t: 2.0, view: 'base' }],
  ev: [{ t: 0.85, name: 'lift' }, { t: 1.75, name: 'gone' }],
  stone: [{ t: 0.8, p: [0, 0, 0] }, { t: 1.25, p: [0, 0.25, 0.12] }, { t: 1.75, p: [0, 0.0, 0.5] }],
};

// ---------- 道具を見せる: ペンチを顔の前でかちかち鳴らす。工具箱はテーブルに出す
const TL = { at: 'face0', palm: true, g: [0, 0.2, 1], n: [-1, 0, 0], pole: [0.7, -0.7, -0.1], ...FIST };
export const showTool = {
  r: [
    { t: 0, ...DOWN, ...FIST },
    { t: 0.6, ...TL, p: [0.05, -0.02, -0.24] },
    { t: 2.0, ...TL, p: [0.05, -0.02, -0.22], shake: 0.002 },
    { t: 2.6, ...DOWN, ...FIST, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'near' }, { t: 2.1, view: 'near' }, { t: 2.8, view: 'base' }],
  ev: [{ t: 0, name: 'pliersIn' }, { t: 0, name: 'watchHand' }, { t: 0.65, name: 'show' }, { t: 0.95, name: 'click' }, { t: 1.35, name: 'click' }, { t: 1.75, name: 'click' }, { t: 2.5, name: 'unwatch' }],
};

// ---------- 電気ショック（2026-10-27 オーナー「電気ショックを加えたい」）: 工具箱からスタンガンを取り、顔の前でバチバチ鳴らして見せてから、首筋（左の肩の上）に電極を押し当てる。
// 当てている間（zap〜zapEnd）は夫の体がはねる（husband.js の react('shock')）。傷は残さない。電極の先は props.js の stun.userData.tip（STUN_TIP）
export const STUN_TIP = [0.108, 0.035, 0.02];
const SG = { at: 'face0', palm: true, g: [0, 0.2, 1], n: [-1, 0, 0], pole: [0.7, -0.7, -0.1], ...GRAB }; // 道具を見せる時と同じ持ち方
const NK = { at: 'cheekL', tip: STUN_TIP, p: [0.03, -0.09, -0.01], g: [0.9, -0.25, 0.28], n: [-0.155, -0.91, -0.31], pole: [0.6, -0.5, -0.4], ...GRAB }; // 電極を頬の下（あごの下の首筋）へ、手のひらを下にして押し当てる。向きは妻の軸 [右, 上, 前]。電極（持つ所の +X）の向き ＝ n×g ＝ 前・少し左下（夫の首の中心へ）
export const shock = {
  r: [
    { t: 0, ...DOWN, ...GRAB },
    { t: 0.6, ...SG, p: [0.1, -0.03, -0.26] },
    { t: 1.5, ...SG, p: [0.1, -0.03, -0.24], shake: 0.002 },
    { t: 2.0, ...NK, p: [0.0, -0.03, -0.1] }, // 首筋の手前（妻の側へ 10cm）
    { t: 2.25, ...NK, ease: 'in' }, // 当たる
    { t: 3.05, ...NK, shake: 0.004, ease: 'lin' }, // 当てたまま
    { t: 3.3, ...NK, p: [0.02, -0.03, -0.12], ease: 'out' },
    { t: 3.9, ...DOWN, ...GRAB, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'near' }, { t: 1.6, view: 'near' }, { t: 2.1, view: 'neck' }, { t: 3.2, view: 'neck' }, { t: 4.1, view: 'base' }],
  ev: [{ t: 0, name: 'stunIn' }, { t: 0, name: 'watchHand' }, { t: 0.7, name: 'arc' }, { t: 1.15, name: 'arc' }, { t: 1.9, name: 'unwatch' }, { t: 2.25, name: 'zap', freeze: ['cheekL'] }, { t: 3.05, name: 'zapEnd' }],
};

// ---------- 髪をつかんで顔を上げさせる（2026-10-27）: 右手で頭のてっぺんの髪をつかみ、少し引き上げて目を合わせさせ、離す
const HR = { at: 'hairTop', palm: true, p: [0.05, 0.0, 0.02], g: [-0.85, -0.45, 0.25], n: [0.1, -1, 0.1], pole: [0.95, -0.1, -0.2], ...GRAB }; // 頭の右上（画面の右）から、肘を外に張って。前腕が顔にかからないように
export const hair = {
  r: [
    { t: 0, ...DOWN },
    { t: 0.5, ...HR, p: [0.12, 0.1, -0.06], curl: 0.3 },
    { t: 0.75, ...HR, ease: 'in' },
    { t: 0.9, ...HR, p: [0.05, 0.03, 0.03], curl: 1.1 }, // つかんで引き上げる
    { t: 2.5, ...HR, p: [0.05, 0.03, 0.03], curl: 1.1, shake: 0.0015 },
    { t: 2.75, ...HR, p: [0.12, 0.08, -0.05], curl: 0.4, ease: 'out' },
    { t: 3.3, ...DOWN, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.5, view: 'reach' }, { t: 2.6, view: 'reach' }, { t: 3.5, view: 'base' }],
  ev: [{ t: 0.85, name: 'grab', freeze: ['hairTop'] }, { t: 2.7, name: 'release' }],
};

// ---------- 目隠し（2026-10-27）: 布を目に当て（blindOn で頭に付く）、頭の横を回して結ぶ。外す時は目の所から取る
const BF = { at: 'eyes', palm: true, g: [0.1, -0.1, 1], n: [0, 0.2, 1], pole: [0.9, -0.3, -0.2], ...SOFT }; // 肘は外へ（前腕で顔を隠さない）
const BFL = { ...mirror(BF), at: 'eyes' };
const TIE = { at: 'cheekL', palm: true, p: [0.06, 0.03, -0.06], g: [-0.3, 0.1, 1], n: [-1, 0, 0.2], pole: [0.7, -0.5, -0.3], ...PINCH };
const TIEL = { ...mirror(TIE), at: 'cheekR', p: [-0.06, 0.03, -0.06] };
export const blindOn = {
  r: [{ t: 0, ...DOWN }, { t: 0.6, ...BF, p: [0.03, 0.0, -0.12] }, { t: 0.95, ...BF, p: [0.03, 0.0, -0.02], ease: 'in' }, { t: 1.3, ...TIE }, { t: 2.1, ...TIE, shake: 0.002 }, { t: 2.7, ...DOWN, hide: true }],
  l: [{ t: 0, ...DOWNL }, { t: 0.6, ...BFL, p: [-0.03, 0.0, -0.12] }, { t: 0.95, ...BFL, p: [-0.03, 0.0, -0.02], ease: 'in' }, { t: 1.3, ...TIEL }, { t: 2.1, ...TIEL, shake: 0.002 }, { t: 2.7, ...DOWNL, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'near' }, { t: 2.2, view: 'near' }, { t: 2.9, view: 'base' }],
  ev: [{ t: 0.3, name: 'watchHand' }, { t: 0.95, name: 'blindOn', freeze: ['eyes', 'cheekL', 'cheekR'] }, { t: 2.3, name: 'unwatch' }],
};
export const blindOff = {
  r: [{ t: 0, ...DOWN }, { t: 0.6, ...BF, p: [0.03, 0.0, -0.12] }, { t: 0.95, ...BF, p: [0.03, 0.01, -0.02], ease: 'in' }, { t: 1.4, ...BF, p: [0.06, 0.08, -0.1], ...GRAB }, { t: 2.0, ...DOWN, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'near' }, { t: 1.4, view: 'near' }, { t: 2.2, view: 'base' }],
  ev: [{ t: 1.0, name: 'blindOff', freeze: ['eyes'] }],
};

// ---------- バリカンで髪を刈る（2026-10-27）: 工具箱からバリカンを取り、前から後ろへ3回頭を撫でる（刃は頭に当てる向き ＝ n×g ＝ 下）。終わりに髪が無くなる（shaved）
export const CLIP_TIP = [0.11, 0.022, 0.02];
const CP = { at: 'hairTop', tip: CLIP_TIP, g: [1, 0, 0], n: [0, -0.94, -0.35], pole: [0.6, -0.5, -0.3], ...GRAB }; // 手のひらを下に、肘を外へ。刃（+X）＝ n×g ＝ 前（夫の後頭部の側）へ少し下。頭に沿って滑らせる
const pass = (t0) => [{ t: t0, ...CP, p: [0.0, 0.0, 0.1] }, { t: t0 + 0.9, ...CP, p: [0.0, 0.015, -0.09], ease: 'lin' }, { t: t0 + 1.05, ...CP, p: [0.0, 0.05, -0.06] }];
export const clipper = {
  r: [{ t: 0, ...DOWN, ...GRAB }, { t: 0.6, ...CP, p: [0.03, 0.08, 0.14] }, ...pass(0.9), ...pass(2.05), ...pass(3.2), { t: 4.6, ...DOWN, ...GRAB, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'crown' }, { t: 4.3, view: 'crown' }, { t: 5.0, view: 'base' }],
  ev: [{ t: 0, name: 'clipperIn' }, { t: 0.3, name: 'watchHand' }, { t: 0.9, name: 'buzzOn', freeze: ['hairTop'] }, { t: 2.05, name: 'pass' }, { t: 3.2, name: 'pass' }, { t: 4.2, name: 'shaved' }, { t: 4.3, name: 'buzzOff' }, { t: 4.4, name: 'unwatch' }],
};

// ---------- 離婚届を置く: 手のひらで紙ごとテーブルに叩きつける
const PS = { at: 'paperSpot', palm: true, g: [-0.2, 0, 1], n: [0, -1, 0], pole: [0.6, -0.5, -0.6], ...FLAT };
export const slamPaper = {
  r: [
    { t: 0, ...DOWN, ...FLAT },
    { t: 0.6, ...PS, p: [0.0, 0.16, 0.06] },
    { t: 0.78, ...PS, p: [0, 0.004, 0], ease: 'in' },
    { t: 1.3, ...PS, p: [0, 0.004, 0] },
    { t: 1.6, ...PS, p: [0.02, 0.09, 0.06] },
    { t: 2.2, ...DOWN, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'table' }, { t: 1.6, view: 'table' }, { t: 2.4, view: 'base' }],
  ev: [{ t: 0, name: 'paperIn' }, { t: 0.2, name: 'watchHand' }, { t: 0.78, name: 'slam' }, { t: 2.2, name: 'unwatch' }],
};

// ---------- 義母に電話する（ふり）: 発信中の画面を夫に見せてから、耳に当てる
const DL = { at: 'face0', palm: true, g: [0.05, 1, 0], n: [-0.1, 0, 1], pole: [0.7, -0.7, -0.1], ...PHONE };
const EAR = { at: 'body', palm: true, p: [-0.036, 0.17, 0.06], g: [0.1, 0.9, 0.3], n: [-1, 0, 0.1], pole: [0.8, -0.6, 0], ...PHONE };
export const dial = {
  r: [
    { t: 0, ...DOWN, ...PHONE },
    { t: 0.55, ...DL, p: [0.034, -0.08, -0.234] },
    { t: 1.8, ...DL, p: [0.034, -0.08, -0.214] },
    { t: 2.4, ...EAR },
    { t: 3.4, ...EAR },
    { t: 4.0, ...DOWN, ...PHONE, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.55, view: 'near' }, { t: 1.8, view: 'near' }, { t: 2.6, view: 'base' }],
  ev: [{ t: 0, name: 'myPhoneIn' }, { t: 0, name: 'watchHand' }, { t: 0.6, name: 'dial' }, { t: 3.0, name: 'unwatch' }],
};

// ---------- 泣く: うつむいて、胸の前で両手を握りしめる（震える）。顔を覆うと、目の前が手でふさがって何も見えないので
const CV = { at: 'body', palm: true, p: [-0.15, -0.13, 0.27], g: [-0.25, 0.65, 0.7], n: [-1, 0, 0.1], pole: [0.5, -0.7, -0.5], curl: 0.95, tog: 0.6, thumb: 0.8 };
export const coverFace = {
  r: [{ t: 0, ...DOWN }, { t: 0.6, ...CV }, { t: 2.2, ...CV, shake: 0.006 }, { t: 2.9, ...DOWN, hide: true }],
  l: [{ t: 0, ...DOWNL }, { t: 0.6, ...mirror(CV) }, { t: 2.2, ...mirror(CV), shake: 0.006 }, { t: 2.9, ...DOWNL, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'bow' }, { t: 2.3, view: 'bow' }, { t: 3.0, view: 'base' }],
  ev: [{ t: 0.5, name: 'cover' }],
};

// ---------- 黙って待つ: 両手で夫の両肩をつかみ、顔を近づけて見つめる（話が終わるまで）
const SH = { at: 'shoulderL', palm: true, p: [0, 0.006, 0], g: [-0.15, -0.25, 1], n: [0, -1, 0.15], pole: [0.7, -0.6, -0.3], curl: 0.45, tog: 0.5, thumb: 0.4 };
export const stare = {
  r: [{ t: 0, ...DOWN }, { t: 0.9, ...SH }, { t: 1.2, ...SH, wait: true }, { t: 1.9, ...DOWN, hide: true }],
  l: [{ t: 0, ...DOWNL }, { t: 0.9, ...mirror(SH), at: 'shoulderR' }, { t: 1.2, ...mirror(SH), at: 'shoulderR' }, { t: 1.9, ...DOWNL, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.9, view: 'stare' }, { t: 1.2, view: 'stare', wait: true }, { t: 2.1, view: 'base' }],
  ev: [{ t: 0.6, name: 'watchFace' }, { t: 1.0, name: 'stare' }, { t: 1.9, name: 'unwatch' }],
};

// ---------- 休ませる: コップの水を口に当てて飲ませる（そのあと暗転して 30分後）
const WT = { at: 'mouth', palm: true, n: [-1, 0, 0], pole: [0.7, -0.7, -0.1], ...CUP };
export const water = {
  r: [
    { t: 0, ...DOWN, ...CUP },
    { t: 0.7, ...WT, p: [0.047, -0.093, -0.13], g: [-0.2, 0, 1] },
    { t: 1.1, ...WT, p: [0.047, -0.077, -0.099], g: [-0.2, -0.3, 0.95] },
    { t: 2.1, ...WT, p: [0.047, -0.077, -0.099], g: [-0.2, -0.35, 0.95] },
    { t: 2.5, ...WT, p: [0.052, -0.103, -0.14], g: [-0.2, 0, 1] },
    { t: 3.0, ...DOWN, ...CUP, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.7, view: 'reach' }, { t: 2.5, view: 'reach' }, { t: 3.1, view: 'base' }],
  ev: [{ t: 0, name: 'cupIn' }, { t: 0.5, name: 'lift' }, { t: 1.05, name: 'drink' }, { t: 2.2, name: 'drunk' }, { t: 2.6, name: 'unlift' }],
};

// ---------- 酒を飲ませる: コップの水と同じ動きで、グラスの酒を口に当てる（付ける物だけ違う）
export const sake = { ...water, ev: water.ev.map((e) => (e.name === 'cupIn' ? { ...e, name: 'sakeIn' } : e)) };

// ---------- 食べさせる: おにぎりを口に運び、ひと口かじらせる
const FD = { at: 'mouth', palm: true, g: [-0.2, 0.1, 1], n: [0, 1, 0], pole: [0.7, -0.7, -0.1], ...PINCH };
export const feed = {
  r: [
    { t: 0, ...DOWN, ...PINCH },
    { t: 0.75, ...FD, p: [0.015, -0.035, -0.115] },
    { t: 1.0, ...FD, p: [0.015, -0.03, -0.09] },
    { t: 1.3, ...FD, p: [0.02, -0.05, -0.15] },
    { t: 2.0, ...FD, p: [0.02, -0.05, -0.15] },
    { t: 2.6, ...DOWN, ...PINCH, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.75, view: 'reach' }, { t: 2.0, view: 'reach' }, { t: 2.8, view: 'base' }],
  ev: [{ t: 0, name: 'onigiriIn' }, { t: 0.4, name: 'lift' }, { t: 0.8, name: 'open' }, { t: 1.0, name: 'bite' }, { t: 2.2, name: 'unlift' }],
};

// ---------- 指を詰める（2026-10-25 オーナー指定・見せ方は案A）: 夫の後ろへ回り、台所の包丁を取り、縛られた左手の小指を押さえて振り下ろす。
// 当たる瞬間に暗転して音だけ（cut）。明けると指に布が巻かれている（reveal）。それから前へ戻る
// 詰める指は cutNext（main.js が「次に詰める指」を指す）。左手の5本が済むと右手（押さえる手も右手に。2026-10-25 オーナー「10本できないです」）
const KF = { at: 'cutNext', palm: true, n: [-1, 0, 0], pole: [0.8, -0.5, -0.2], ...FIST };
const PIN = { at: 'handL', palm: true, p: [0.0, 0.04, 0.0], g: [0.1, -0.2, 1], n: [0, -1, 0], pole: [-0.7, -0.6, -0.2], ...GRAB };
export const fingerCut = (side = 'l') => ({
  r: [
    { t: 0, ...DOWN },
    { t: 1.4, ...DOWN, ...FIST },
    { t: 2.1, ...KF, p: [0.12, 0.22, -0.08], g: [0, -0.85, 0.5] }, // 右の肩の上へ振り上げる（刃は上向き）
    { t: 2.7, ...KF, p: [0.13, 0.25, -0.09], g: [0, -0.8, 0.55], shake: 0.004 },
    { t: 2.95, ...KF, p: [0.03, 0.06, -0.15], g: [0, -1, 0.05], ease: 'in' }, // 刃の真ん中が指の上に来る
    { t: 3.0, ...DOWN, hide: true },
  ],
  l: [{ t: 0, ...DOWNL }, { t: 1.6, ...DOWNL }, { t: 2.0, ...PIN, at: side === 'l' ? 'handL' : 'handR' }, { t: 2.95, ...PIN, at: side === 'l' ? 'handL' : 'handR' }, { t: 3.0, ...DOWNL, hide: true }],
  body: [
    { t: 0, view: 'base' },
    { t: 0.9, view: 'side' },
    { t: 1.8, view: 'behind' },
    { t: 2.95, view: 'behind' },
    { t: 4.3, view: 'bandage' }, // 暗いうちに、布を巻いた指のそばへ
    { t: 5.6, view: 'bandage' },
    { t: 6.5, view: 'side' },
    { t: 7.4, view: 'base' },
  ],
  ev: [{ t: 0.2, name: 'watchWife' }, { t: 1.4, name: 'knife' }, { t: 2.0, name: 'pin' }, { t: 2.95, name: 'cut' }, { t: 4.3, name: 'reveal' }, { t: 7.0, name: 'unwatch' }],
});

// ---------- 縄をゆるめる: 夫の後ろへ回り（指を詰める時と同じ回り方）、縛った手首の結び目を両手でゆるめる
const KNOT = { at: 'handL', palm: true, g: [0.1, -0.3, 1], n: [0, -1, 0], pole: [0.7, -0.6, -0.2], ...GRAB };
const KNOTL = { ...mirror(KNOT), at: 'handL' };
export const loosen = {
  r: [{ t: 0, ...DOWN }, { t: 1.6, ...DOWN }, { t: 2.1, ...KNOT, p: [0.05, 0.06, 0.0] }, { t: 2.6, ...KNOT, p: [0.03, 0.05, 0.02] }, { t: 3.1, ...KNOT, p: [0.06, 0.07, -0.01] }, { t: 3.6, ...KNOT, p: [0.03, 0.05, 0.02] }, { t: 4.1, ...DOWN, hide: true }],
  l: [{ t: 0, ...DOWNL }, { t: 1.6, ...DOWNL }, { t: 2.1, ...KNOTL, p: [-0.05, 0.06, 0.0] }, { t: 2.6, ...KNOTL, p: [-0.03, 0.07, -0.02] }, { t: 3.1, ...KNOTL, p: [-0.06, 0.05, 0.01] }, { t: 3.6, ...KNOTL, p: [-0.03, 0.07, -0.02] }, { t: 4.1, ...DOWNL, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 0.9, view: 'side' }, { t: 1.8, view: 'behind' }, { t: 3.8, view: 'behind' }, { t: 4.7, view: 'side' }, { t: 5.6, view: 'base' }],
  ev: [{ t: 0.2, name: 'watchWife' }, { t: 3.0, name: 'loosen' }, { t: 5.2, name: 'unwatch' }],
};

// ---------- 録音を始める: 自分のスマホの画面を見て録音を押し、画面を上にしてテーブルに置く（離婚届と同じ所の少し右）
const RECT = { at: 'paperSpot', palm: true, g: [-0.2, 0, 1], n: [0, -1, 0], pole: [0.6, -0.5, -0.6], ...PHONE };
export const record = {
  r: [
    { t: 0, ...DOWN, ...PHONE },
    { t: 0.6, ...LOOK },
    { t: 1.3, ...LOOK },
    { t: 2.0, ...RECT, p: [0.22, 0.09, 0.08] },
    { t: 2.3, ...RECT, p: [0.22, 0.03, 0.08], ease: 'out' },
    { t: 2.7, ...RECT, p: [0.2, 0.1, 0.0], ...RELAX },
    { t: 3.3, ...DOWN, hide: true },
  ],
  body: [{ t: 0, view: 'base' }, { t: 0.6, view: 'base' }, { t: 2.0, view: 'table' }, { t: 2.7, view: 'table' }, { t: 3.5, view: 'base' }],
  ev: [{ t: 0, name: 'recIn' }, { t: 1.1, name: 'recOn' }, { t: 2.3, name: 'recPlace' }],
};

// ---------- 放置する（6時間）: 壁の電気のスイッチまで歩いて切り、部屋を出る（そのあと暗転して 6時間後）
const SW = { at: 'switch', palm: true, p: [0, 0, -0.012], g: [0, 1, 0.1], n: [0, 0, 1], pole: [0.7, -0.7, -0.1], ...FLAT };
export const leaveRoom = {
  r: [{ t: 0, ...DOWN }, { t: 1.1, ...DOWN }, { t: 1.45, ...SW, p: [0.02, 0.03, -0.06] }, { t: 1.6, ...SW }, { t: 1.75, ...SW, p: [0, -0.01, -0.012] }, { t: 2.3, ...DOWN, hide: true }],
  body: [{ t: 0, view: 'base' }, { t: 1.2, view: 'door' }, { t: 2.8, view: 'door' }, { t: 3.8, view: 'base' }],
  ev: [{ t: 0.3, name: 'watchWife' }, { t: 1.72, name: 'lightsOff' }, { t: 3.6, name: 'unwatch' }],
};

// ---------- 連行（死なせた・通報された時）: うつむいて、手錠をかけられた自分の両手を見る
const CF = { at: 'body', palm: true, p: [-0.13, -0.33, 0.3], g: [-0.3, -0.2, 1], n: [-0.9, 0.3, 0], pole: [0.4, -0.6, -0.6], ...RELAX };
export const cuffed = {
  r: [{ t: 0, ...DOWN }, { t: 1.2, ...CF }, { t: 4.5, ...CF, shake: 0.003 }],
  l: [{ t: 0, ...DOWNL }, { t: 1.2, ...mirror(CF) }, { t: 4.5, ...mirror(CF), shake: 0.003 }],
  body: [{ t: 0, view: 'base' }, { t: 1.2, view: 'cuffs' }, { t: 4.5, view: 'cuffs', wait: true }], // 結果の画面まで止めておく
};

// ---------- 終わりの後の場面（epilogue.js）。妻は座っている（家の朝）か、窓辺に立っている（新しい部屋）。腕は場面の終わりまで出したまま
// 湯呑み・マグは親指を上にして横から持つ（物の軸は X）。tip は物の底の真ん中（持つ所の軸で）
export const CUPGRIP = [-0.046, 0.026, 0.042]; // 手は器の下の方を持つ（親指の先が縁にかからず横の壁に当たるように、底を小指の側へ寄せる）
export const POTGRIP = [0.015, 0, 0.012]; // 急須の取っ手（原点）は手のひらの真ん中から少し外。取っ手の外側寄りを握る（親指の付け根が急須の胴に入らないように）
export const MUGGRIP = [-0.048, 0.03, 0.05];
// 湯呑みを置いたまま包む手（2026-10-25 オーナー「湯呑みの持ち方がおかしい」: 前は手が高くて指が縁の上に乗っていた）: 手の真ん中は湯呑みの下から 3.6cm、指は少し下へ向けて横の壁に巻きつける
const TEAGRIP = [-0.03, 0.02, 0.05]; // 手のひらは壁から 1.3cm（親指の付け根が壁に入らないように）
const TEA = { at: 'herCup', tip: TEAGRIP, g: [-0.5, -0.4, 0.77], n: [-0.8, 0, -0.6], pole: [0.7, -0.7, -0.2], ...CUP };
const ON_TABLE = { at: 'herHand', palm: true, g: [0.3, 0, 1], n: [0, -1, 0], pole: [-0.6, -0.6, -0.5], curl: [0.12, 0.16, 0.2, 0.25], tog: 0.8, thumb: 0.4, tcurl: 0.1 }; // 左手（薬指に指輪）: テーブルに軽く置く（握ると爪のように見える）
// 家の朝（冷えた方）: 右手は湯呑みを包んだまま、左手はテーブルの上
export const holdCup = (dur) => ({ r: [{ t: 0, ...TEA }, { t: dur, ...TEA }], l: [{ t: 0, ...ON_TABLE }, { t: dur, ...ON_TABLE }] });
// 家の朝: 急須で夫の湯呑みにお茶を注ぐ。手前を向いた取っ手を親指を上にして握り、手首を返して急須を左へ傾ける（注ぎ口は左）。
// カメラは注ぐ間だけ前へかがむ（epilogue.js）。急須は持つ所の軸を X まわりに半回転して付ける（急須の +X＝親指の側＝前・上＝指と逆）
export const SPOUT = [0.105, -0.027, 0.112]; // 注ぎ口の先（持つ所の軸で）
const POT = { at: 'potHandle', tip: POTGRIP, g: [0, -1, 0], n: [-1, 0, 0], pole: [0.7, -0.6, -0.3], ...GRAB };
const POUR = { at: 'hisCup', tip: SPOUT, g: [0, -1, 0], n: [-1, 0, 0], pole: [0.7, -0.6, -0.3], ...GRAB };
export const pourTea = {
  r: [
    { t: 0, ...DOWN },
    { t: 0.8, ...POT, p: [0, 0.05, 0.02] },
    { t: 1.1, ...POT },
    { t: 1.8, ...POT, p: [0.02, 0.13, -0.06] },
    { t: 2.6, ...POUR, p: [0, 0.14, 0] },
    { t: 3.1, ...POUR, p: [0, 0.12, 0], g: [0.77, -0.64, 0], n: [-0.64, -0.77, 0] }, // 左へ傾けて注ぐ
    { t: 4.3, ...POUR, p: [0, 0.12, 0], g: [0.77, -0.64, 0], n: [-0.64, -0.77, 0] },
    { t: 4.8, ...POUR, p: [0, 0.15, 0] },
    { t: 5.6, ...POT, p: [0, 0.05, 0] },
    { t: 5.9, ...POT },
    { t: 6.7, ...DOWN, hide: true },
  ],
  ev: [{ t: 1.1, name: 'potUp' }, { t: 3.15, name: 'pourOn' }, { t: 4.35, name: 'pourOff' }, { t: 5.9, name: 'potDown' }],
};
// 新しい部屋: 窓辺でマグのコーヒーを飲み、左手を上げて手の甲を見る（薬指に指輪はもう無い）
const MUG = { at: 'body', tip: MUGGRIP, p: [-0.08, -0.05, 0.38], g: [-0.6, 0, 0.8], n: [-0.8, 0, -0.6], pole: [0.7, -0.7, -0.2], ...CUP }; // 胸の前（画面の右下に入る高さ）
const BACK = { at: 'body', palm: true, p: [0.16, 0.12, 0.36], g: [-0.2, 1, 0.15], n: [0.05, 0.1, 1], pole: [-0.6, -0.7, -0.3], curl: [0.12, 0.18, 0.22, 0.28], tog: 0.5, thumb: 0.35, tcurl: 0.15 }; // 目の前に手の甲（指は軽く曲げてそろえる。開いて伸ばすと作り物に見える）
export function coffeeWindow(dur) {
  return {
    r: [
      { t: 0, ...MUG },
      { t: 1.2, ...MUG },
      { t: 2.1, ...MUG, p: [-0.13, 0.05, 0.3], g: [-0.55, 0.35, 0.76] }, // 口もとへ上げて飲む
      { t: 3.2, ...MUG, p: [-0.13, 0.05, 0.3], g: [-0.55, 0.35, 0.76] },
      { t: 4.1, ...MUG },
      { t: dur, ...MUG },
    ],
    l: [
      { t: 0, ...DOWNL },
      { t: 4.2, ...DOWNL },
      { t: 5.2, ...BACK },
      { t: 7.4, ...BACK, p: [0.15, 0.13, 0.35], g: [-0.3, 1, 0.1] },
      { t: 8.4, ...DOWNL },
      { t: dur, ...DOWNL },
    ],
  };
}
