/** ツンデレ比率：原创题面。正分偏デレ，负分偏ツン。 */

export const TSUN_QUESTIONS = [
  {
    prompt: '気になる人からメッセージが来たとき、あなたは？',
    options: [
      { label: 'すぐ返す。スタンプも足す', weight: 1 },
      { label: 'いったん置いて、何事もない顔をする', weight: -1 },
    ],
  },
  {
    prompt: '飲み会で本音ゲーム。あなたは？',
    options: [
      { label: 'ノったら、最初に手を挙げる', weight: 1 },
      { label: '理由をつけて、いったん避ける', weight: -1 },
      { label: '自分は乗らない。話は聞く', weight: 0 },
    ],
  },
  {
    prompt: '疲れているとき、近い人にどうしてほしい？',
    options: [
      { label: '寄りかからせてほしい', weight: 1 },
      { label: 'こっちに来て。少し世話を焼かせて', weight: 1 },
      { label: 'お互い、軽く寄りかかればいい', weight: 0 },
      { label: '今は近づかないで', weight: -1 },
      { label: 'どっちでもいい。こだわりはない', weight: -1 },
    ],
  },
  {
    prompt: '相手が面と向かって「一緒にいると楽しい」と言った。あなたは？',
    options: [
      { label: '私も。一緒にいると楽しい', weight: 1 },
      { label: 'ちょっと待って。返し方がわからない', weight: 0 },
      { label: '急に言われると、まず固まる', weight: -1 },
    ],
  },
  {
    prompt: 'イヤホンを片耳分けてもらい、頭が近い。あなたは？',
    options: [
      { label: '近い。でも、うれしい', weight: 1 },
      { label: '心臓が一瞬、止まる', weight: 1 },
      { label: '音楽を聴いているだけ。特別なことはない', weight: -1 },
      { label: '近すぎる。少し横にずれたい', weight: -1 },
    ],
  },
  {
    prompt: '気になっている人が急に「いったん落ち着こう」と言った。あなたは？',
    options: [
      { label: 'わかった。じゃあ落ち着く', weight: -1 },
      { label: '何があったの。話そう', weight: 1 },
      { label: '私が合わなかったのかも。もういい', weight: -1 },
      { label: 'やだ。まだ一緒にいたい', weight: 1 },
      { label: '落ち着きたければ、そうすればいい。そのうちまた来る', weight: 0 },
    ],
  },
]

const PERCENT_TSUN = [100, 95, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 0]

export const TSUN_BUCKETS = {
  6: {
    shortId: '7',
    title: 'ぜんぶやわらか',
    catch: 'うれしいも、気になるも、名残惜しいも、顔に出る。',
    blurb: '遠回りが少ない。好きなときは、表情も言葉も一緒にやわらかくなる。となりの人は、あなたを読みやすい。',
    mood: 'dere',
  },
  4: {
    shortId: '6',
    title: 'たまにふくれる',
    catch: 'ほとんど甘い。冷えた一瞬のほうが、記憶に残る。',
    blurb: 'ふだんは近づきやすい。気持ちが乗ると、急に少し硬くなる。短いけれど、はっきりしている。',
    mood: 'dere',
  },
  2: {
    shortId: '5',
    title: '甘さに少しツン',
    catch: 'ふだんは一緒にいて楽。気持ちが立つと、少しわがままになる。',
    blurb: 'だいたい柔らかい。合わせたくないときは、まず眉をひそめて、しばらくすると自分で戻ってくる。',
    mood: 'hybrid',
  },
  0: {
    shortId: '4',
    title: 'ちょうど半分',
    catch: 'ツンもやわらかさも、相手と場面で使い分ける。',
    blurb: '距離の調節がうまい。近づきたいときは寄り、線が必要なときは止まれる。極端には振れにくい。',
    mood: 'hybrid',
  },
  '-2': {
    shortId: '3',
    title: 'トゲの奥の甘さ',
    catch: '先に頭を下げにくい。いったんほどけると、それがよく見える。',
    blurb: '本音は先にしまう癖がある。出そうと思ったときのやさしさは、ずっと甘い人より目立つ。',
    mood: 'tsun',
  },
  '-4': {
    shortId: '2',
    title: 'なかなか弱音を出さない',
    catch: 'やわらかさを、きつくしまっている。だから出た一点が、特に貴重。',
    blurb: '好きを言い切るのが苦手。気になることは小さな用事に隠す。気づかれないと、最初からそんなに気にしていなかった顔をする。',
    mood: 'tsun',
  },
  '-6': {
    shortId: '1',
    title: 'ずっとツン',
    catch: '先に自分を閉じる。好きがないのではない。簡単には渡さない。',
    blurb: 'いつもの表情は硬め。本当に好きな人は、かなり待ってからでないと、ほどけた顔を見られない。',
    mood: 'tsun',
  },
}

export function tsunPercent(sum) {
  const clamped = Math.max(-6, Math.min(6, sum))
  const tsun = PERCENT_TSUN[clamped + 6]
  return { sum: clamped, tsun, dere: 100 - tsun }
}

export function tsunTitleSum(sum) {
  const s = Math.max(-6, Math.min(6, sum))
  if (s >= 5) return 6
  if (s >= 3) return 4
  if (s >= 1) return 2
  if (s <= -5) return -6
  if (s <= -3) return -4
  if (s <= -1) return -2
  return 0
}

export function tsunBucket(sum) {
  const key = String(tsunTitleSum(sum))
  return { ...TSUN_BUCKETS[key], ...tsunPercent(sum), titleSum: tsunTitleSum(sum) }
}

export function tsunByShortId(id) {
  const found = Object.entries(TSUN_BUCKETS).find(([, bucket]) => bucket.shortId === String(id))
  if (!found) return null
  const sum = Number(found[0])
  return tsunBucket(sum)
}
