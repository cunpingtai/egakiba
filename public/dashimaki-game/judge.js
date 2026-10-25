// 採点と完成形の判定（SPEC.md「評価項目」「審査基準」「完成形の決め方」「C段階」「B段階」「アドバイス」「完成品の名前」）。
// game.html の記録 rec から、5項目の点数・A/B/C・外れた向き、完成形、変化、一言アドバイスを決める。画面には依存しない。

// ---------- 調整する場所（数値は仮。試遊びで決める） ----------
export const J = {
  gradeA: 80, gradeC: 20,          // 80より上がA、20以下がC、その間がB
  // 油：1層あたりの理想のなぞる長さ（鍋の単位。1層目は鍋全体、2層目からは卵の手前だけ）。量のずれは重み付きで引く
  oilIdealLen: [19, 11], oilAmtWeight: 0.6, oilMuch: 1.3,
  // 火入れ：巻いたときの火の通り（100が理想）。巻いた卵を鍋に置きっぱなしで焼きすぎた分（rollCook）は、超えた分×重みを引く
  heatIdeal: 100, rollCookOk: 150, rollCookWeight: 0.5,
  // 巻く所作：軌跡の横ぶれ（標準偏差）、斜めの角度、速さ、速さの揺れ（変動係数）、巻けた距離。それぞれ 0点になる値
  rollWobble0: 0.12, rollAngle0: 25, rollFast: 4, rollFast0: 8, rollCv0: 0.9, rollDist: 1.6,
  // 量・タイミング：1回の理想量（全体＝1）、総量が少ない向き（極小）を測る基準の総量、理想の層の数、前の層を巻いてから次を流すまでの許容秒数、1層目の適温
  pourIdeal: 0.22, pourTotal: 0.9, idealLayers: 5, gapOk: 8, gapPerSec: 6, sizzleTemp: 0.45,
  // 幻の条件（全部Aに加えて）：巻いた回数がこの範囲で、ボウルの卵液を使い切った（残りがこれ以下）。満たさなければ一流料亭（2026-10-13 ユーザー指定、遊び方どおり）
  phantomRolls: [4, 5], phantomBowl: 0.01,
};

const ITEMS = ['oil', 'heat', 'roll', 'bubble', 'pour'];
const clamp100 = (v) => Math.max(0, Math.min(100, v));
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
export const gradeOf = (score) => score > J.gradeA ? 'A' : score <= J.gradeC ? 'C' : 'B';

// ---------- 5項目の点数と外れた向き ----------
function scoreOil(rec) {
  const n = Math.max(1, rec.layers.length);
  const per = [], ratios = [];
  for (let L = 1; L <= n; L++) {
    const strokes = rec.oil.filter(o => o.layer === L);
    const cov = strokes.length ? strokes[strokes.length - 1].coverage : 0; // 最後のなぞりの時点で、その層の塗れた範囲
    const len = strokes.reduce((s, o) => s + o.length, 0);
    const ratio = len / J.oilIdealLen[Math.min(L - 1, 1)];
    ratios.push(ratio);
    per.push(clamp100(cov * 100 - Math.abs(ratio - 1) * 100 * J.oilAmtWeight));
  }
  return { score: mean(per), dir: mean(ratios) > J.oilMuch ? 'much' : 'little' };
}
function scoreHeat(rec) {
  if (!rec.layers.length) return { score: 0, dir: 'under' };
  const dev = rec.layers.map(l => l.cookAtRoll - J.heatIdeal);
  const over = Math.max(0, (rec.end?.rollCook ?? 0) - J.rollCookOk) * J.rollCookWeight; // 巻いた卵の焼きすぎ（焦げ側）
  return { score: clamp100(100 - mean(dev.map(Math.abs)) - over), dir: mean(dev) + over > 0 ? 'over' : 'under' };
}
function scoreRoll(rec) {
  if (!rec.layers.length) return { score: 0, dir: 'flat' };
  const el = { wobble: [], angle: [], speedVar: [], fast: [], dist: [] };
  for (const l of rec.layers) {
    const r = l.roll;
    if (!r) { for (const k in el) el[k].push(0); continue; } // 巻かなかった層は全部0（向きは「巻かれていない」）
    el.wobble.push(clamp100(100 - r.wobble / J.rollWobble0 * 100));
    el.angle.push(clamp100(100 - Math.abs(r.angle) / J.rollAngle0 * 100));
    el.speedVar.push(clamp100(100 - (r.speed > 0 ? r.speedSd / r.speed : 1) / J.rollCv0 * 100));
    el.fast.push(clamp100(100 - Math.max(0, r.speed - J.rollFast) / (J.rollFast0 - J.rollFast) * 100));
    el.dist.push(clamp100(r.dist / J.rollDist * 100));
  }
  const m = Object.fromEntries(Object.entries(el).map(([k, v]) => [k, mean(v)]));
  // 4要素：ぶれ・斜め・速さとその安定（速すぎと揺れの悪い方）・距離
  const score = mean([m.wobble, m.angle, Math.min(m.speedVar, m.fast), m.dist]);
  // いちばん悪い要素（同点なら、巻けた距離を優先）
  const worst = Object.entries(m).sort((a, b) => a[1] - b[1] || (b[0] === 'dist') - (a[0] === 'dist'))[0][0];
  return { score, dir: worst, elements: m };
}
function scoreBubble(rec) {
  const total = rec.layers.reduce((s, l) => s + l.bubbles, 0), popped = rec.layers.reduce((s, l) => s + l.popped, 0);
  const score = total ? popped / total * 100 : (rec.layers.length ? 100 : 0);
  return { score, dir: score < 5 ? 'balloon' : 'cheese' };
}
function scorePour(rec) {
  if (!rec.layers.length) return { score: 0, dir: 'little' };
  const used = rec.layers.reduce((s, l) => s + l.pour, 0), avg = used / rec.layers.length;
  const amount = mean(rec.layers.map(l => clamp100(100 - Math.abs(l.pour - J.pourIdeal) / J.pourIdeal * 100)));
  const timing = mean(rec.layers.map((l, i) => i === 0
    ? clamp100(Math.min(1, l.temp / J.sizzleTemp) * 100)                       // 1層目：鍋が温まってから流したか
    : clamp100(100 - Math.max(0, (l.gapSec ?? 0) - J.gapOk) * J.gapPerSec)));  // 2層目から：前の層を巻いてから間を空けすぎていないか
  // 外れた向き：一番大きく外れた条件（1回が多すぎ／使った量が少なすぎ／流した回数が理想の2倍超）
  const count = rec.layers.reduce((s, l) => s + l.pours, 0);
  const dev = { much: Math.max(0, avg / J.pourIdeal - 1), little: Math.max(0, 1 - used / J.pourTotal), count: Math.max(0, count / (2 * J.idealLayers) - 1) * 2 };
  const dir = Object.entries(dev).sort((a, b) => b[1] - a[1])[0][0];
  return { score: (amount + timing) / 2, dir, amount, timing };
}

// ---------- 変化・欠点・アドバイスの表 ----------
// C段階の変化（項目 × 外れた向き）。重ねても破綻しないよう、項目ごとに担当する部分が違う
export const CHANGE = {
  oil: { much: 'batter', little: 'crumbs' },                                            // 表面の質感：衣／ボロボロ
  heat: { over: 'char', under: 'jelly' },                                               // 色：炭／ゼリー
  roll: { wobble: 'egg', angle: 'drill', dist: 'flat', speedVar: 'wave', fast: 'zigzag' }, // 全体の形：卵状／ドリル／巻かれていない／ウェーブ／直角
  bubble: { cheese: 'cheese', balloon: 'balloon' },                                     // 中身の構造：穴あきチーズ／風船
  pour: { much: 'huge', little: 'tiny', count: 'nenrin' },                              // 大きさと層：巨大化／極小／年輪
};
// B段階の欠点（向きで決まるものは向きで、それ以外はランダム）
const DEFECT = {
  oil: { much: ['oily'], little: ['stuck'] },
  heat: { over: ['scorched'], under: ['runny'] },
  roll: { any: ['bent', 'thickEnd', 'peeling'] },
  bubble: { any: ['pits'] },
  pour: { much: ['big', 'unevenLayers'], little: ['small', 'unevenLayers'], count: ['unevenLayers'] },
};
// 完成品の名前：全部A・一流料亭は固定。それ以外は data/names.csv から選ぶ（読めなかったときは B・C の名前で代わりにする）
export const STAGE_NAME = {
  ja: { phantom: '幻のだし巻き', ryotei: '一流料亭のだし巻き', B: 'ありそうなだし巻き', C: 'ありえないだし巻き' },
  en: { phantom: 'The Legendary Dashimaki', ryotei: 'Top-Restaurant Dashimaki', B: 'A Very Real Dashimaki', C: 'An Impossible Dashimaki' },
};
// 名前のカテゴリ（CSV のカテゴリ列の値）：項目 × 外れた向き。卵液の量・タイミングは、量と時機の点の悪い方（時機が悪ければ量・タイミング）
export const NAME_CAT = {
  oil: { much: '油・多すぎ', little: '油・少なすぎ' },
  heat: { over: '火・入れすぎ', under: '火・足りない' },
  roll: { wobble: '巻く・軌跡のぶれ（卵状）', angle: '巻く・斜め（ドリル）', dist: '巻く・巻けていない', speedVar: '巻く・速さの揺れ（ウェーブ）', fast: '巻く・速すぎ（ギザギザ）' },
  bubble: { any: '泡・潰し残し' },
  pour: { much: '量・多すぎ（巨大化）', little: '量・少なすぎ（極小）', count: '量・回数が多い（年輪）', timing: '量・タイミング' },
  many: '複合（Cが3つ以上）',
};
// data/names.csv（列：カテゴリ, A（原因）, B（比喩・シュール）, 完成名, 英語名）→ [{ cat, ja, en }]
export function parseNames(csv) {
  return csv.replace(/^\uFEFF/, '').split(/\r?\n/).slice(1).map(l => l.split(',')).filter(c => c.length >= 5 && c[3])
    .map(c => ({ cat: c[0], ja: c[3], en: c[4], a: c[1], b: c[2] }));
}
// 一言アドバイス（SPEC.md の文例をもとに、項目 × 外れた向き × 段階（B・C）ごとに3本。どれか1本をランダムに選ぶ。
// 日本語と英語は同じ番号の文を使う。卵液の量・タイミングの向きは、名前と同じく量と時機の悪い方（timing を含む））
const ADVICE = {
  ja: {
    oil: {
      much: { B: ["油は控えめに。だし巻きは泳ぎたがっていない", "油は薄く、全体にのばすだけでいい", "鍋の上に小さな油の湖ができていた"], C: ["油が多すぎて、それはもう天ぷらだ", "その油の量は揚げ物用だ", "油の量で、料理のジャンルが変わってしまった"] },
      little: { B: ["油が足りず、フライパンが卵を手放したがらない", "卵を流す前に、油をもうひとなで", "油は鍋のすみずみまで"], C: ["油がないと、フライパンはだし巻きを返してくれない", "油がないと、鍋と卵は一心同体になる", "油をケチると、鍋のほうがおいしく焼ける"] },
    },
    heat: {
      over: { B: ["焦げは「香ばしい」と言い張れるのはここまで", "火はもうひと目盛り弱めに", "巻く前に、裏が焦げていないか見よう"], C: ["炭としては一級品。美味しく焦げるのも才能", "火事にならなくてよかった", "つまみは右に回すためだけのものではない"] },
      under: { B: ["火が弱くて、卵はまだ卵でいたかったらしい", "巻く前に、もう少しだけ待とう", "半熟は中だけで十分"], C: ["火が通らず、形を保っているのは意地だけ", "火がついているか、まず確かめよう", "まだ生きている気がする"] },
    },
    roll: {
      wobble: { B: ["巻くときは、まっすぐ手前へ", "菜箸の通り道を決めてから巻こう", "迷いは巻き目に出る"], C: ["菜箸がふらついて、巻いたのか巻かれたのか", "迷いながら巻くと、卵に戻る", "巻く向きがぶれて、卵は振り出しに戻った"] },
      angle: { B: ["鍋に対してまっすぐ引こう", "少し斜めに巻けている", "菜箸は鍋の縁と平行に"], C: ["斜めに巻くと、ドリルになる", "斜めに引くと、卵はねじれる", "斜めに引いたので、これで穴が掘れる"] },
      dist: { B: ["手前の端まで巻ききろう", "もうひと巻き、手前まで", "巻き残しが少しあった"], C: ["巻くのを忘れていませんか", "薄焼き卵としては満点", "だし巻きは巻いてこそ"] },
      speedVar: { B: ["巻く速さは一定に", "ゆっくり同じ速さで引こう", "巻くリズムが少し揺れた"], C: ["巻く速さがばらばらで、卵が波に乗っている", "緩急は音楽だけにしよう", "速さが揺れると、だし巻きは波打つ"] },
      fast: { B: ["巻くときは優しく。卵にも気持ちがある", "急がず、ゆっくり巻こう", "少し勢いがつきすぎた"], C: ["速すぎて卵が稲妻になった", "だし巻きにスピード記録はない", "急いで巻いたので、卵が直角に曲がった"] },
    },
    bubble: {
      cheese: { B: ["泡は見つけたらすぐ潰そう", "気泡は菜箸でつつけば消える", "断面に小さな穴が残った"], C: ["泡を潰さないと、中は空気だらけ", "泡を残すと、チーズになる", "泡を残したので、穴から向こうの景色が見える"] },
      balloon: { B: ["泡は見つけたらすぐ潰そう", "気泡は菜箸でつつけば消える", "断面に小さな穴が残った"], C: ["泡を放っておくと、中が空っぽになる", "泡をひとつも潰さないと、こうなる", "泡を潰さず、空に浮かびかけた"] },
    },
    pour: {
      much: { B: ["卵液は一度に入れすぎない", "1回に流すのは、全体の4〜5分の1", "層が少し厚くなった"], C: ["皿に合わせて作ってほしい", "卵液は一度に全部入れるものではない", "大きさで勝負する料理ではない"] },
      little: { B: ["もう少し大胆に流そう", "卵液はまだボウルに残っている", "鍋全体に広がるくらい流そう"], C: ["卵液が少なすぎて、完成品は皿のどこかにあります", "卵液がボウルでさみしがっている", "卵液を残しすぎて、一口で終わってしまった"] },
      count: { B: ["流す回数はほどほどに", "4〜5回に分ければ十分", "少しずつ流しすぎた"], C: ["少しずつ流しすぎて、このだし巻きはあなたより長生きしている", "年輪を数えるのに日が暮れる", "回数より、1回の量を大事に"] },
      timing: { B: ["前の層が半熟のうちに次を流そう", "鍋が温まってから流そう", "流す間合いが少しずれた"], C: ["流すのが遅れて、層どうしが他人になった", "待ちすぎると、層はくっつかない", "次を流すのは、前の層が半熟のうちに"] },
    },
    phantom: '幻のだし巻き。金はいつの時代も美しい', ryotei: '一流料亭で出るだし巻き。まだ上を目指せる', allC: 'だし巻きだけが人生じゃない',
  },
  en: {
    oil: {
      much: { B: ["Easy on the oil. Your dashimaki doesn't want to swim.", "A thin coat of oil is all you need.", "There was a small lake of oil in that pan."], C: ["Too much oil. That's tempura now.", "That much oil is for deep-frying.", "The oil changed which cuisine this belongs to."] },
      little: { B: ["Not enough oil. The pan didn't want to let go.", "One more swipe of oil before you pour.", "Oil every corner of the pan."], C: ["Without oil, the pan won't give it back.", "Without oil the pan and the egg become one.", "Skimp on oil and the pan gets cooked instead."] },
    },
    heat: {
      over: { B: ["\"Toasty\" only covers so much.", "Turn the heat down a notch.", "Check the bottom before it burns."], C: ["World-class charcoal. Burning things well is a talent too.", "At least the kitchen didn't catch fire.", "The knob turns the other way too."] },
      under: { B: ["Heat too low. The egg wanted to stay an egg.", "Wait a little longer before rolling.", "Runny is fine only in the middle."], C: ["Barely cooked. It's holding together on willpower.", "First check that the fire is actually on.", "It still feels alive."] },
    },
    roll: {
      wobble: { B: ["Roll straight toward you.", "Pick your path before you roll.", "Hesitation shows up in the layers."], C: ["Shaky chopsticks. Did you roll it, or did it roll you?", "Roll with doubt and it turns back into an egg.", "Your rolling wandered. Back to square one."] },
      angle: { B: ["Pull straight along the pan.", "That roll leaned a little.", "Keep the chopsticks parallel to the pan's edge."], C: ["Roll at an angle and you get a drill.", "Pull at an angle and the egg twists.", "You pulled at an angle. Now it can dig holes."] },
      dist: { B: ["Roll all the way to the near edge.", "One more turn, all the way to you.", "You left a little unrolled."], C: ["Did you forget to roll?", "Perfect score as a thin omelet.", "It's not dashimaki until it's rolled."] },
      speedVar: { B: ["Keep a steady rolling speed.", "Pull slowly at the same pace.", "Your rolling rhythm wobbled a bit."], C: ["Uneven rolling speed. The egg is riding a wave.", "Save the tempo changes for music.", "Change speed mid-roll and it turns wavy."] },
      fast: { B: ["Roll gently. Eggs have feelings too.", "No rush. Roll it slowly.", "A little too much momentum there."], C: ["So fast the egg turned into lightning.", "There's no speed record for dashimaki.", "Rolled too fast. It bent at right angles."] },
    },
    bubble: {
      cheese: { B: ["Pop bubbles as soon as you see them.", "A poke with the chopsticks pops a bubble.", "A few small holes made it into the slices."], C: ["Unpopped bubbles leave it full of air.", "Leave the bubbles and you get cheese.", "You left the bubbles. Now you can see through it."] },
      balloon: { B: ["Pop bubbles as soon as you see them.", "A poke with the chopsticks pops a bubble.", "A few small holes made it into the slices."], C: ["Ignore the bubbles and it ends up hollow.", "This is what happens when no bubble gets popped.", "No bubbles popped. It nearly floated away."] },
    },
    pour: {
      much: { B: ["Don't pour so much at once.", "Pour about a fifth of the egg each time.", "The layers came out a little thick."], C: ["Please cook to fit the plate.", "You don't pour all the egg in at once.", "Size isn't the point of this dish."] },
      little: { B: ["Pour a bit more boldly.", "There's still egg left in the bowl.", "Pour enough to cover the whole pan."], C: ["Too little egg. It's somewhere on the plate.", "The egg in the bowl is feeling lonely.", "Too much egg left in the bowl. Gone in one bite."] },
      count: { B: ["Go easy on the number of pours.", "Four or five pours is plenty.", "You poured in too many small batches."], C: ["Too many tiny pours. This one will outlive you.", "Counting the rings would take all day.", "Each pour matters more than how many."] },
      timing: { B: ["Pour the next layer while the last one is still soft.", "Wait until the pan is hot before pouring.", "Your pouring timing was a little off."], C: ["Poured too late. The layers became strangers.", "Wait too long and the layers won't stick.", "Pour the next layer while the last one is still soft."] },
    },
    phantom: 'The legendary dashimaki. Gold never goes out of style.', ryotei: 'Worthy of a top restaurant. There\'s still room to climb.', allC: 'There\'s more to life than dashimaki.',
  },
};
const INTENSITY = [0, 1, 1.5, 2, 2.5, 2.5]; // Cの数 → 変化の強さ
// 特殊な完成（2026-10-11 ユーザー指定）。卵液を一滴も落とさずに完成したら、ふつうの判定の代わりにこれになる
//   heart：何もしない（油もない）→ 皿に何も載せない。oil：油を引いただけ → 皿に油だけ
export const SPECIAL = {
  heart: { name: { ja: '心を映し出すだし巻き', en: 'The Dashimaki That Mirrors Your Heart' }, advice: { ja: '心がきれいな者にのみ見えるらしい', en: 'They say only the pure of heart can see it.' } },
  oil: { name: { ja: '油', en: 'Oil' }, advice: { ja: 'オイルファーストで血糖値上昇が抑えられるらしい', en: 'They say oil first keeps your blood sugar from spiking.' } },
};

// ---------- 判定 ----------
// rand: 乱数（テストで固定できるように）、names: parseNames の結果（完成品の名前の候補）
export function judge(rec, rand = Math.random, names = []) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const raw = { oil: scoreOil(rec), heat: scoreHeat(rec), roll: scoreRoll(rec), bubble: scoreBubble(rec), pour: scorePour(rec) };
  const items = Object.fromEntries(ITEMS.map(k => [k, { ...raw[k], score: Math.round(raw[k].score), grade: gradeOf(raw[k].score) }]));
  const count = (g) => ITEMS.filter(k => items[k].grade === g).length;
  const nC = count('C'), nB = count('B');
  const rolls = rec.layers.filter(l => l.roll).length;
  const fullCourse = rolls >= J.phantomRolls[0] && rolls <= J.phantomRolls[1] && (rec.end?.bowl ?? 0) <= J.phantomBowl;
  const stage = nC > 0 ? 'C' : nB === 0 ? (fullCourse ? 'phantom' : 'ryotei') : nB === 1 ? 'ryotei' : 'B';
  // C段階の変化（Cの項目ごと）と、B段階の欠点（Bの項目ごと。Bが多いほど少しずつ強く）
  const changes = ITEMS.filter(k => items[k].grade === 'C').map(k => ({ item: k, change: CHANGE[k][items[k].dir] }));
  const defects = ITEMS.filter(k => items[k].grade === 'B').map(k => {
    const t = DEFECT[k][items[k].dir] || DEFECT[k].any;
    return { item: k, defect: pick(t), strength: +((0.5 + rand() * 0.5) * (1 + 0.15 * (nB - 1))).toFixed(2) };
  });
  // アドバイス：一番悪かった評価の項目からランダムに1つ（全部A・全部Cは決まった一言）
  const worstGrade = nC ? 'C' : nB ? 'B' : 'A';
  const worstItem = worstGrade === 'A' ? null : pick(ITEMS.filter(k => items[k].grade === worstGrade));
  // 外れ方：卵液の量・タイミングは、量と時機の点の悪い方（時機が悪ければ timing。2026-10-11 ユーザー指定）
  const it = items[worstItem];
  const dirKey = worstItem === 'pour' && it.timing < it.amount ? 'timing' : it?.dir;
  const adviceNo = Math.floor(rand() * 3);
  const adviceFor = (lang) => {
    const A = ADVICE[lang];
    if (stage === 'phantom') return A.phantom;
    if (nC === 5) return A.allC;
    if (!worstItem) return A.ryotei; // 全部Aでも、巻いた回数・卵液の残りで幻を逃した（条件は明かさない）
    const set = (A[worstItem][dirKey] || Object.values(A[worstItem])[0])[worstGrade];
    const one = set[adviceNo % set.length];
    return stage === 'ryotei' ? A.ryotei + (lang === 'ja' ? '。' : ' ') + one : one;
  };
  // 名前：Cが3つ以上は「複合」、それ以外は一番悪かった項目（アドバイスと同じ項目）の外れ方のカテゴリから1件
  const nameCat = stage === 'phantom' || stage === 'ryotei' ? null : nC >= 3 ? NAME_CAT.many : NAME_CAT[worstItem][dirKey] || NAME_CAT[worstItem].any;
  const cands = nameCat ? names.filter(n => n.cat === nameCat) : [];
  const picked = cands.length ? pick(cands) : null;
  // 卵液を落とさずに完成（流してもいないし、一滴も落としていない）→ 特殊な完成
  if (!rec.layers.length && !rec.drops?.length) {
    const special = rec.oil.length ? 'oil' : 'heart';
    return { items, stage: special, special, id: special, cCount: nC, intensity: 0, changes: [], defects: [], worstItem: null, nameCat: null, ...SPECIAL[special] };
  }
  // できあがりの種類の固定ID（GA4 の game_end の result）：幻・一流料亭はそのまま、Cが3つ以上は C_many、それ以外は 段階_項目_外れ方（名前と同じ項目・向き）
  const id = stage === 'phantom' || stage === 'ryotei' ? stage : nC >= 3 ? 'C_many' : `${stage}_${worstItem}_${dirKey}`;
  return {
    items, stage, id, cCount: nC, intensity: INTENSITY[nC], changes, defects, worstItem, nameCat,
    // parts：日本語の名前の区切り（原因｜比喩｜だし巻き）。結果画面で、この区切りでだけ改行する
    name: picked ? { ja: picked.ja, en: picked.en, parts: picked.ja === picked.a + picked.b + 'だし巻き' ? [picked.a, picked.b, 'だし巻き'] : null } : { ja: STAGE_NAME.ja[stage], en: STAGE_NAME.en[stage] },
    advice: { ja: adviceFor('ja'), en: adviceFor('en') },
  };
}
