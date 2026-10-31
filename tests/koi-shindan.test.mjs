import assert from 'node:assert/strict'
import test from 'node:test'

import { DOPA_QUESTIONS } from '../src/koi-shindan/dopa.mjs'
import { LOVE_QUESTIONS } from '../src/koi-shindan/love.mjs'
import {
  catalog,
  indexablePaths,
  pairNote,
  scoreDopa,
  scoreLove,
  scoreNandere,
  scoreTsun,
} from '../src/koi-shindan/score.mjs'
import { NANDERE_QUESTIONS } from '../src/koi-shindan/nandere.mjs'
import { TSUN_QUESTIONS } from '../src/koi-shindan/tsun.mjs'

test('ツンデレ比率：每题取 +1，总分 6，デレ 100%', () => {
  const answers = TSUN_QUESTIONS.map((item) => item.options.findIndex((option) => option.weight === 1))
  const result = scoreTsun(answers)
  assert.equal(result.sum, 6)
  assert.equal(result.tsun, 0)
  assert.equal(result.dere, 100)
  assert.equal(result.shortId, '7')
  assert.equal(result.title, 'ぜんぶやわらか')
})

test('ツンデレ比率：每题取 -1，总分 -6，ツン 100%', () => {
  const answers = TSUN_QUESTIONS.map((item) => item.options.findIndex((option) => option.weight === -1))
  const result = scoreTsun(answers)
  assert.equal(result.sum, -6)
  assert.equal(result.tsun, 100)
  assert.equal(result.shortId, '1')
})

test('ラブタイプ：全选左极得到 LCPO-VD', () => {
  const answers = LOVE_QUESTIONS.filter((item) => !item.demographic).map(() => 0)
  assert.equal(scoreLove(answers).code, 'LCPO-VD')
})

test('ラブタイプ：轴分为 0 时，starred 为正取第二字母', () => {
  const answers = LOVE_QUESTIONS.filter((item) => !item.demographic).map(() => 0)
  answers[0] = 5
  answers[1] = 1
  answers[2] = 1
  assert.equal(scoreLove(answers).scores.LF, 0)
  assert.equal(scoreLove(answers).code, 'FCPO-VD')
})

test('ラブタイプ：reverse 会翻转单题符号', () => {
  const plain = scoreLove([0], [{ axis: 'LF', starred: true, reversed: false, demographic: false }])
  const flipped = scoreLove([0], [{ axis: 'LF', starred: true, reversed: true, demographic: false }])
  assert.equal(plain.code[0], 'L')
  assert.equal(flipped.code[0], 'F')
})

test('ドパガキ：do 轴五题都贡献 +2 时得 D，零分归低字母', () => {
  const high = DOPA_QUESTIONS.map((item) => {
    if (item.axis === 'do') return item.reverse ? 3 : 0
    return item.reverse ? 0 : 2
  })
  const highResult = scoreDopa(high)
  assert.equal(highResult.scores.do, 10)
  assert.equal(highResult.code[0], 'D')
  const zero = scoreDopa([0, 3], [
    { axis: 'do', reverse: false },
    { axis: 'do', reverse: false },
  ])
  assert.equal(zero.scores.do, 0)
  assert.equal(zero.code[0], 'H')
  for (const axis of ['do', 'pa', 'ga', 'ki']) {
    assert.equal(DOPA_QUESTIONS.filter((item) => item.axis === axis).length, 5)
  }
})

test('何デレ：全选第一项得到嘴硬心软', () => {
  const result = scoreNandere(NANDERE_QUESTIONS.map(() => 0))
  assert.equal(result.code, 'tsun')
})

test('相性与目录链接可解析', () => {
  assert.equal(pairNote('tsun-ratio', '1', '7').score > 0, true)
  assert.equal(pairNote('nandere', 'tsun', 'dere').score, 86)
  assert.equal(pairNote('dopagaki', 'DPGK', 'HJTS').score, 88)
  assert.equal(catalog('love-type').length, 16)
  assert.equal(new Set(indexablePaths()).size, indexablePaths().length)
})
