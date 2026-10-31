import { DOPA_AXES, DOPA_CHOICES, DOPA_MATCH, DOPA_QUESTIONS, DOPA_TYPES } from './dopa.mjs'
import { JDE, LOVE_AXES, LOVE_AXIS_META, LOVE_LETTER_NOTE, LOVE_QUESTIONS, LOVE_SUBS, LOVE_TYPES } from './love.mjs'
import { NANDERE_PAIR, NANDERE_QUESTIONS, NANDERE_TYPES } from './nandere.mjs'
import { TSUN_BUCKETS, TSUN_QUESTIONS, tsunBucket, tsunByShortId, tsunTitleSum } from './tsun.mjs'

export const SITE_NAME = '恋愛診断'

export const QUIZ_LIST = [
  {
    id: 'tsun-ratio',
    title: 'あなたのツンとデレ',
    ja: 'ツンデレ比率診断',
    lede: '6問で、先にツンるか、先にほどけるかを見ます。結果はツンとデレの割合です。',
    minutes: 1,
    countLabel: '6問',
    seoTitle: 'ツンデレ比率診断｜ツンとデレの割合',
    seoDescription: '6問のツンデレ診断。ツンとデレがそれぞれ何％か、その場で出ます。約1分、無料。答えはこの端末だけに残ります。',
  },
  {
    id: 'love-type',
    title: '恋愛キャラクター',
    ja: 'ラブタイプ診断',
    lede: '接し方から16タイプ。さらに「これから／いま」と「近い／ひとり」で64の日常に分かれます。',
    minutes: 4,
    countLabel: '20問',
    seoTitle: 'ラブタイプ診断｜16タイプ・64の日常',
    seoDescription: 'ラブタイプ診断。接し方から16タイプ、さらに64の日常に分けるラブ診断です。約4分、無料。キャラクター名はこのサイトのオリジナルです。',
  },
  {
    id: 'nandere',
    title: 'あなたは何デレ',
    ja: '何デレ診断',
    lede: 'ツンデレ、クーデレ、デレデレ、ヤンデレのどれに近いか。怖い結論はありません。',
    minutes: 2,
    countLabel: '8問',
    seoTitle: '何デレ診断｜ツンデレ・デレデレ・ヤンデレ',
    seoDescription: '何デレ診断。ツンデレ、クーデレ、デレデレ、ヤンデレのどれに近いかを8問で見ます。デレデレ診断とヤンデレ診断の結果ページもあります。',
  },
  {
    id: 'dopagaki',
    title: '刺激の好み',
    ja: 'ドパガキ診断',
    lede: '日常のくせから、刺激の濃さ、見切りの早さ、待てるかどうか、注意が止まるかを見ます。',
    minutes: 3,
    countLabel: '20問',
    seoTitle: 'ドパガキ診断｜刺激の好み16タイプ',
    seoDescription: 'ドパガキ診断。日常のくせから刺激の濃さ、見切りの早さ、待てるかを見て16タイプに分けます。20問、約3分、無料。',
  },
]

const QUIZZES = {
  'tsun-ratio': {
    ...QUIZ_LIST[0],
    hint: '最初の感じで選んでください。選ぶと、次の問いに進みます。',
    aside: 'ツンデレとは、先に棘が出て、あとから甘さが見える出し方のことです。この診断は、その割合をツンとデレの％で出します。',
    questions: TSUN_QUESTIONS.map((item) => ({ kind: 'choice', prompt: item.prompt, options: item.options.map((option) => ({ label: option.label })) })),
  },
  'love-type': {
    ...QUIZ_LIST[1],
    hint: '左の文と右の文。いちばん近いマスを押してください。',
    questions: LOVE_QUESTIONS.map((item) => item.kind === 'likert'
      ? { kind: 'likert', prompt: item.prompt, left: item.left, right: item.right }
      : { kind: 'choice', prompt: item.prompt, options: item.options }),
  },
  nandere: {
    ...QUIZ_LIST[2],
    hint: 'ふだんの自分に近い文を。いちばん「よい自分」を選ばなくて大丈夫です。',
    seoLinks: [
      { code: 'tsun', label: 'ツンデレ診断' },
      { code: 'dere', label: 'デレデレ診断' },
      { code: 'yan', label: 'ヤンデレ診断' },
      { code: 'kuu', label: 'クーデレ診断' },
    ],
    questions: NANDERE_QUESTIONS.map((item) => ({ kind: 'choice', prompt: item.prompt, options: item.options.map((option) => ({ label: option.label })) })),
  },
  dopagaki: {
    ...QUIZ_LIST[3],
    hint: '日常のくせです。成績ではありません。「まさに自分」でも「まったく違う」でも大丈夫です。',
    questions: DOPA_QUESTIONS.map((item) => ({ kind: 'choice', prompt: item.prompt, options: item.options.map((option) => ({ label: option.label })) })),
  },
}

export function getQuiz(id) {
  return QUIZZES[id] ?? null
}

export function cleanName(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, 16)
}

function loveLetter(axis, scores, starred) {
  const score = scores[axis]
  if (score > 0) return axis[1]
  if (score < 0) return axis[0]
  return starred[axis] > 0 ? axis[1] : axis[0]
}

export function scoreLove(answers, questions = LOVE_QUESTIONS) {
  const scores = Object.fromEntries(LOVE_AXES.map((axis) => [axis, 0]))
  const starred = Object.fromEntries(LOVE_AXES.map((axis) => [axis, 0]))
  const scored = questions.filter((item) => !item.demographic)
  scored.forEach((item, index) => {
    const delta = JDE[answers[index]] * (item.reversed ? -1 : 1)
    scores[item.axis] += delta
    if (item.starred) starred[item.axis] = delta
  })
  const type1 = ['LF', 'CA', 'PR', 'OE'].map((axis) => loveLetter(axis, scores, starred)).join('')
  const type2 = loveLetter('VN', scores, starred) + loveLetter('DI', scores, starred)
  return { scores, starred, type1, type2, code: `${type1}-${type2}` }
}

export function scoreTsun(answers) {
  const sum = TSUN_QUESTIONS.reduce((total, item, index) => total + item.options[answers[index]].weight, 0)
  return tsunBucket(sum)
}

export function scoreNandere(answers) {
  const scores = { tsun: 0, kuu: 0, dere: 0, yan: 0 }
  NANDERE_QUESTIONS.forEach((item, index) => {
    const option = item.options[answers[index]]
    for (const [key, value] of Object.entries(option.weights)) scores[key] += value
  })
  const order = ['tsun', 'kuu', 'dere', 'yan']
  const best = Math.max(...order.map((key) => scores[key]))
  let tied = order.filter((key) => scores[key] === best)
  if (tied.length > 1) {
    const last = NANDERE_QUESTIONS.at(-1).options[answers.at(-1)].weights
    tied = [...tied].sort((a, b) => (last[b] || 0) - (last[a] || 0))
  }
  const total = order.reduce((sum, key) => sum + scores[key], 0) || 1
  const percents = Object.fromEntries(order.map((key) => [key, Math.round((scores[key] / total) * 100)]))
  return { code: tied[0], scores, percents }
}

export function scoreDopa(answers, questions = DOPA_QUESTIONS) {
  const scores = { do: 0, pa: 0, ga: 0, ki: 0 }
  questions.forEach((item, index) => {
    const choice = DOPA_CHOICES[answers[index]]
    scores[item.axis] += choice.score * (item.reverse ? -1 : 1)
  })
  const hi = { do: 'D', pa: 'P', ga: 'G', ki: 'K' }
  const lo = { do: 'H', pa: 'J', ga: 'T', ki: 'S' }
  const order = ['do', 'pa', 'ga', 'ki']
  const code = order.map((axis) => (scores[axis] > 0 ? hi[axis] : lo[axis])).join('')
  const max = questions.filter((item) => item.axis === 'do').length * 2
  const percents = order.map((axis) => Math.round(((scores[axis] + max) / (max * 2)) * 100))
  const dopaLevel = percents.reduce((sum, value) => sum + value, 0) / percents.length
  const extremity = Math.round((order.reduce((sum, axis) => sum + Math.abs(scores[axis]), 0) / (max * 4)) * 100)
  return { code, scores, percents, dopaLevel, extremity }
}

export function finishQuiz(quizId, answers) {
  if (quizId === 'tsun-ratio') {
    const result = scoreTsun(answers)
    return { code: result.shortId, s: String(result.sum) }
  }
  if (quizId === 'love-type') {
    const scored = LOVE_QUESTIONS.filter((item) => !item.demographic)
    const result = scoreLove(answers.slice(0, scored.length))
    const payload = LOVE_AXES.map((axis) => result.scores[axis]).join(',')
    return { code: result.code, s: payload }
  }
  if (quizId === 'nandere') {
    const result = scoreNandere(answers)
    const payload = ['tsun', 'kuu', 'dere', 'yan'].map((key) => result.scores[key]).join(',')
    return { code: result.code, s: payload }
  }
  if (quizId === 'dopagaki') {
    const result = scoreDopa(answers)
    const payload = ['do', 'pa', 'ga', 'ki'].map((axis) => result.scores[axis]).join(',')
    return { code: result.code, s: payload }
  }
  return null
}

function barsFromPairs(pairs) {
  return pairs.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    color: item.color,
  }))
}

function loveTraits(type1, type2 = '') {
  return [...type1, ...type2].map((letter) => ({ letter, note: LOVE_LETTER_NOTE[letter] }))
}

function lovePeers() {
  return Object.entries(LOVE_TYPES).map(([code, type]) => ({ code, name: type.name }))
}

function presentLove(code) {
  const match = /^([LF][CA][PR][OE])(?:-([VN][DI]))?$/.exec(code)
  if (!match) return null
  const type = LOVE_TYPES[match[1]]
  const sub = match[2] ? LOVE_SUBS[match[2]] : null
  const subtypes = Object.entries(LOVE_SUBS).map(([key, item]) => ({
    code: `${match[1]}-${key}`,
    name: item.name,
    catch: item.catch,
  }))
  return {
    quizId: 'love-type',
    code: sub ? `${match[1]}-${match[2]}` : match[1],
    badge: sub ? `${match[1]}-${match[2]}` : match[1],
    name: type.name,
    subname: sub?.name ?? '',
    catch: sub ? `${type.catch} ${sub.catch}` : type.catch,
    blurb: type.blurb,
    aruaru: type.aruaru,
    love: type.love,
    strength: type.strength,
    pitfall: type.pitfall,
    mood: type.mood,
    bars: [],
    traits: loveTraits(match[1], match[2] || ''),
    subtypes: sub ? [] : subtypes,
    peers: lovePeers(),
    description: `${type.name}${sub ? ` · ${sub.name}` : ''}。${type.catch}`,
  }
}

function presentTsun(code) {
  const bucket = tsunByShortId(code)
  if (!bucket) return null
  return {
    quizId: 'tsun-ratio',
    code: bucket.shortId,
    badge: `ツン${bucket.tsun}% デレ${bucket.dere}%`,
    name: bucket.title,
    subname: '',
    catch: bucket.catch,
    blurb: bucket.blurb,
    aruaru: [],
    love: 'この割合は、付き合い方のヒントです。判決ではありません。ツンな人には時間が要ります。甘い人は、受け止めてもらいたがっています。',
    strength: bucket.tsun >= 50 ? 'あなたの「気になる」は、安売りしません。' : '好きが、わかりやすい。',
    pitfall: bucket.tsun >= 50 ? 'しまいすぎると、相手は先に読み違えます。' : '渡しすぎるときは、相手が今日ほしい量を先に聞いてみてください。',
    mood: bucket.mood,
    bars: barsFromPairs([
      { id: 'tsun', label: 'ツン', value: bucket.tsun, color: '#7E9FD4' },
      { id: 'dere', label: 'デレ', value: bucket.dere, color: '#E891A8' },
    ]),
    traits: [],
    subtypes: [],
    peers: Object.values(TSUN_BUCKETS).map((item) => ({ code: item.shortId, name: item.title })),
    description: `ツン${bucket.tsun}% デレ${bucket.dere}%の【${bucket.title}】。${bucket.catch}`,
    canonicalSum: bucket.titleSum,
  }
}

function presentNandere(code) {
  const type = NANDERE_TYPES[code]
  if (!type) return null
  return {
    quizId: 'nandere',
    code,
    badge: type.ja,
    name: type.name,
    subname: '',
    catch: type.catch,
    blurb: type.blurb,
    aruaru: type.aruaru,
    love: type.love,
    strength: type.strength,
    pitfall: type.pitfall,
    mood: type.mood,
    bars: [],
    traits: [],
    subtypes: [],
    peers: Object.entries(NANDERE_TYPES).map(([key, item]) => ({ code: key, name: item.name })),
    description: `${type.ja} · ${type.name}。${type.catch}`,
  }
}

function presentDopa(code) {
  const type = DOPA_TYPES[code]
  if (!type) return null
  const traits = DOPA_AXES.map((axis, index) => {
    const letter = code[index]
    const high = letter === axis.hi
    return { letter, note: `${axis.note}：${high ? axis.hiLabel : axis.loLabel}。` }
  })
  return {
    quizId: 'dopagaki',
    code,
    badge: code,
    name: type.name,
    subname: '',
    catch: type.catch,
    blurb: type.blurb,
    aruaru: type.aruaru,
    love: type.love,
    strength: type.strength,
    pitfall: type.pitfall,
    mood: type.mood,
    bars: [],
    traits,
    subtypes: [],
    peers: Object.entries(DOPA_TYPES).map(([key, item]) => ({ code: key, name: item.name })),
    matches: DOPA_MATCH[code],
    description: `${code} ${type.name}。${type.catch}`,
  }
}

const NANDERE_QUERY = {
  tsun: 'ツンデレ診断',
  kuu: 'クーデレ診断',
  dere: 'デレデレ診断',
  yan: 'ヤンデレ診断',
}

function withKicker(page) {
  if (!page) return null
  const kicker = page.quizId === 'tsun-ratio'
    ? 'ツンデレ比率診断'
    : page.quizId === 'love-type'
      ? 'ラブタイプ診断'
      : page.quizId === 'dopagaki'
        ? 'ドパガキ診断'
        : NANDERE_QUERY[page.code] || '何デレ診断'
  return { ...page, kicker }
}

export function presentResult(quizId, code) {
  const normalized = quizId === 'love-type' || quizId === 'dopagaki' ? String(code || '').toUpperCase() : String(code || '')
  if (quizId === 'tsun-ratio') return withKicker(presentTsun(normalized))
  if (quizId === 'love-type') return withKicker(presentLove(normalized))
  if (quizId === 'nandere') return withKicker(presentNandere(normalized))
  if (quizId === 'dopagaki') return withKicker(presentDopa(normalized))
  return null
}

export function resultSeo(page) {
  if (!page) return { title: SITE_NAME, description: '' }
  if (page.quizId === 'tsun-ratio') {
    return {
      title: `${page.badge}｜${page.name}｜ツンデレ比率診断`,
      description: `${page.name}は${page.badge}。${page.catch} ツンデレ比率診断の結果です。`,
    }
  }
  if (page.quizId === 'nandere') {
    return {
      title: `${page.kicker}｜${page.name}`,
      description: `${page.kicker}の結果は【${page.name}】。${page.catch}`,
    }
  }
  if (page.quizId === 'love-type') {
    return {
      title: `ラブタイプ診断 ${page.code}｜${page.name}`,
      description: `ラブタイプ${page.code}は【${page.name}】。${page.catch} 16タイプの恋愛診断です。`,
    }
  }
  return {
    title: `ドパガキ診断 ${page.code}｜${page.name}`,
    description: `ドパガキ診断の${page.code}は【${page.name}】。${page.catch}`,
  }
}

function parseInts(raw) {
  if (!raw) return null
  const parts = String(raw).split(',').map((item) => Number(item))
  if (parts.some((item) => !Number.isInteger(item))) return null
  return parts
}

export function personalize(page, raw) {
  if (!page || !raw) return { personal: false, page }
  if (page.quizId === 'tsun-ratio') {
    const sum = Number(raw)
    if (!Number.isInteger(sum) || sum < -6 || sum > 6) return { personal: false, page }
    const bucket = tsunBucket(sum)
    if (bucket.shortId !== page.code) return { personal: false, page }
    return {
      personal: true,
      page: {
        ...page,
        badge: `ツン${bucket.tsun}% デレ${bucket.dere}%`,
        bars: [
          { id: 'tsun', label: 'ツン', value: bucket.tsun, color: '#7E9FD4' },
          { id: 'dere', label: 'デレ', value: bucket.dere, color: '#E891A8' },
        ],
        description: `ツン${bucket.tsun}% デレ${bucket.dere}%の【${page.name}】。${page.catch}`,
      },
    }
  }
  if (page.quizId === 'love-type') {
    const scores = parseInts(raw)
    if (!scores || scores.length !== 6) return { personal: false, page }
    const named = Object.fromEntries(LOVE_AXES.map((axis, index) => [axis, scores[index]]))
    const agrees = (axis, letter) => {
      const score = named[axis]
      if (score > 0) return letter === axis[1]
      if (score < 0) return letter === axis[0]
      return true
    }
    const type1 = page.code.slice(0, 4)
    const type2 = page.code.length === 7 ? page.code.slice(5) : ''
    const axes = type2 ? LOVE_AXES : LOVE_AXES.slice(0, 4)
    const letters = type1 + type2
    if (!axes.every((axis, index) => agrees(axis, letters[index]))) return { personal: false, page }
    const max = 12
    const bars = LOVE_AXES.map((axis) => ({
      id: axis,
      label: `${LOVE_AXIS_META[axis].lo} / ${LOVE_AXIS_META[axis].hi}`,
      value: Math.round(((named[axis] + max) / (max * 2)) * 100),
      color: axis === 'CA' || axis === 'OE' ? '#E891A8' : axis === 'PR' || axis === 'DI' ? '#9B8FD9' : '#7DD4C0',
    }))
    return { personal: true, page: { ...page, bars, traits: loveTraits(type1, page.code.includes('-') ? type2 : '') } }
  }
  if (page.quizId === 'nandere') {
    const scores = parseInts(raw)
    if (!scores || scores.length !== 4) return { personal: false, page }
    const named = { tsun: scores[0], kuu: scores[1], dere: scores[2], yan: scores[3] }
    const total = scores.reduce((sum, value) => sum + value, 0) || 1
    const order = ['tsun', 'kuu', 'dere', 'yan']
    const best = Math.max(...order.map((key) => named[key]))
    if (named[page.code] !== best) return { personal: false, page }
    const colors = { tsun: '#7E9FD4', kuu: '#9B8FD9', dere: '#E891A8', yan: '#E8A54B' }
    return {
      personal: true,
      page: {
        ...page,
        bars: order.map((key) => ({
          id: key,
          label: NANDERE_TYPES[key].ja,
          value: Math.round((named[key] / total) * 100),
          color: colors[key],
        })),
      },
    }
  }
  if (page.quizId === 'dopagaki') {
    const scores = parseInts(raw)
    if (!scores || scores.length !== 4) return { personal: false, page }
    const named = { do: scores[0], pa: scores[1], ga: scores[2], ki: scores[3] }
    const hi = { do: 'D', pa: 'P', ga: 'G', ki: 'K' }
    const lo = { do: 'H', pa: 'J', ga: 'T', ki: 'S' }
    const code = ['do', 'pa', 'ga', 'ki'].map((axis) => (named[axis] > 0 ? hi[axis] : lo[axis])).join('')
    if (code !== page.code) return { personal: false, page }
    const colors = ['#E891A8', '#9B8FD9', '#7DD4C0', '#F2C14E']
    return {
      personal: true,
      page: {
        ...page,
        bars: DOPA_AXES.map((axis, index) => ({
          id: axis.id,
          label: `${axis.loLabel} / ${axis.hiLabel}`,
          value: Math.round(((named[axis.id] + 10) / 20) * 100),
          color: colors[index],
        })),
      },
    }
  }
  return { personal: false, page }
}

function lovePair(a, b) {
  const left = presentLove(a)
  const right = presentLove(b)
  if (!left || !right) return null
  const a1 = a.slice(0, 4)
  const b1 = b.slice(0, 4)
  let same = 0
  for (let index = 0; index < 4; index += 1) if (a1[index] === b1[index]) same += 1
  let score = [40, 52, 64, 76, 88][same]
  if (a.length === 7 && b.length === 7 && a.slice(5) === b.slice(5)) score = Math.min(96, score + 6)
  if (a === b) score = 90
  const note = same >= 3
    ? '関係の見方が近い。相手がどう扱われたいかは、それでも聞いて。'
    : same === 2
      ? '半分は似て、半分は通訳が要る。気持ちを先に、理屈はあとで。'
      : '差は開いている。差が悪いとは限らない。自分のやり方を、相手に求めないで。'
  return { score, note, nameA: left.name, nameB: right.name }
}

function nanderePair(a, b) {
  const left = NANDERE_TYPES[a]
  const right = NANDERE_TYPES[b]
  if (!left || !right) return null
  const key = [a, b].sort().join('-')
  const found = NANDERE_PAIR[key]
  return { score: found.score, note: found.note, nameA: left.name, nameB: right.name }
}

function dopaPair(a, b) {
  const left = DOPA_TYPES[a]
  const right = DOPA_TYPES[b]
  if (!left || !right) return null
  const match = DOPA_MATCH[a]
  if (a === b && match.clashLove === a) {
    return { score: 58, note: 'どちらも勢いがある。にぎやかなのも本当、疲れるのも本当。休みを決めておけば、興ざめではない。', nameA: left.name, nameB: right.name }
  }
  if (a === b) return { score: 74, note: '自分によく似ている。なじみやすい。同じ場所で、一緒に詰まりやすい。', nameA: left.name, nameB: right.name }
  if (match.love === b) return { score: 88, note: '恋愛では、お互いのテンポを受け止めやすい。', nameA: left.name, nameB: right.name }
  if (match.friend === b) return { score: 82, note: '友だちだと楽。一緒にいて、力が要らない。', nameA: left.name, nameB: right.name }
  if (match.clashLove === b) return { score: 46, note: '恋愛では、お互いの読み違いが起きやすい。ほしい速さを、先に言って。', nameA: left.name, nameB: right.name }
  if (match.clashFriend === b) return { score: 52, note: '友だちでも、相手のテンポが少し奇妙に感じる。奇妙でいい。急いで相手を直さないで。', nameA: left.name, nameB: right.name }
  return { score: 66, note: 'いちばん近くもなく、いちばんぶつかりもしない。一緒にやる前に、「どれくらい待つか」を揃えて。', nameA: left.name, nameB: right.name }
}

function tsunPair(a, b) {
  const left = tsunByShortId(a)
  const right = tsunByShortId(b)
  if (!left || !right) return null
  const diff = Math.abs(left.tsun - right.tsun)
  const mirror = Math.abs((left.tsun - 50) + (right.tsun - 50))
  if (diff <= 20) {
    return { score: 86, note: '甘さとツンの割合が近い。相手の表情を、あまり読み違えない。', nameA: left.title, nameB: right.title }
  }
  if (mirror <= 20 && diff >= 40) {
    return { score: 78, note: 'ひとりはよりツン、ひとりはよりやわらかい。落差は受け止められる。自分のやり方を基準にしないで。', nameA: left.title, nameB: right.title }
  }
  if (diff >= 60) {
    return { score: 64, note: 'テンポの差は、少し遠い。先に「怒っているわけではない」と言うと、勘ぐりが減る。', nameA: left.title, nameB: right.title }
  }
  return { score: 72, note: '同じでも、反対でもない。ゆっくり揃えればいい。', nameA: left.title, nameB: right.title }
}

export function pairNote(quizId, codeA, codeB) {
  if (quizId === 'tsun-ratio') return tsunPair(codeA, codeB)
  if (quizId === 'love-type') return lovePair(String(codeA).toUpperCase(), String(codeB).toUpperCase())
  if (quizId === 'nandere') return nanderePair(codeA, codeB)
  if (quizId === 'dopagaki') return dopaPair(String(codeA).toUpperCase(), String(codeB).toUpperCase())
  return null
}

export function shareText(page, name, url) {
  const who = name ? `${name}は「${SITE_NAME}」で` : `「${SITE_NAME}」で`
  return {
    full: `${who}【${page.name}】（${page.badge}）でした。\n${page.catch}\nあなたもやってみる？ ${url}\n#恋愛診断 #性格診断`,
    line: `わたしは【${page.name}】！あなたは何タイプ？ ${url}`,
  }
}

const SAMPLE_CODE = {
  'tsun-ratio': '4',
  'love-type': 'LAPE',
  nandere: 'dere',
  dopagaki: 'HJTS',
}

export function catalog(quizId) {
  return presentResult(quizId, SAMPLE_CODE[quizId])?.peers ?? []
}

export function indexablePaths() {
  const paths = ['koi-shindan/', 'koi-shindan/about/', 'koi-shindan/privacy/']
  for (const quiz of QUIZ_LIST) {
    paths.push(`koi-shindan/${quiz.id}/`)
    for (const peer of catalog(quiz.id)) paths.push(`koi-shindan/${quiz.id}/${peer.code}/`)
  }
  return paths
}

export { DOPA_QUESTIONS, LOVE_QUESTIONS, NANDERE_QUESTIONS, TSUN_QUESTIONS, JDE }
