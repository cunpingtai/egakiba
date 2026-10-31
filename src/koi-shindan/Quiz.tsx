import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { catalog, cleanName, finishQuiz, getQuiz } from './score.mjs'
import { koiHref } from './seo'
import { Mascot, cls, ghostBtn, primaryBtn, Dialog } from './ui'

type Question = {
  kind: 'choice' | 'likert'
  prompt: string
  left?: string
  right?: string
  options?: { label: string }[]
}

const STORAGE = 'koi-shindan:'

function storageKey(id: string) {
  return `${STORAGE}${id}`
}

export function Quiz({ quizId, again }: { quizId: string; again: number }) {
  const quiz = getQuiz(quizId)
  const navigate = useNavigate()
  const total = quiz?.questions.length ?? 0
  const [ready, setReady] = useState(true)
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'loading'>('intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>(() => Array(total).fill(-1))
  const [name, setName] = useState('')
  const [line, setLine] = useState(0)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const timer = useRef(0)
  const stepRef = useRef(0)
  const answersRef = useRef(answers)
  stepRef.current = step
  answersRef.current = answers

  useEffect(() => {
    const saved = again ? null : readSaved(quizId, total)
    if (again) sessionStorage.removeItem(storageKey(quizId))
    if (saved) {
      setName(saved.name)
      setAnswers(saved.answers)
      setStep(saved.step)
      setPhase('quiz')
    }
    setReady(true)
  }, [again, quizId, total])

  useEffect(() => {
    if (!ready || phase === 'loading') return
    sessionStorage.setItem(storageKey(quizId), JSON.stringify({ name, answers, step, phase }))
  }, [ready, phase, name, answers, step, quizId])

  useEffect(() => {
    if (phase !== 'loading') return
    const lines = window.setInterval(() => setLine((value) => (value + 1) % 3), 700)
    const wait = window.setTimeout(() => {
      const done = finishQuiz(quizId, answersRef.current)
      if (!done) return
      const nickname = cleanName(name)
      void navigate({
        to: '/koi-shindan/$quiz/$code/',
        params: { quiz: quizId, code: done.code },
        search: nickname ? { n: nickname, s: done.s } : { s: done.s },
      })
    }, 1400)
    return () => {
      window.clearInterval(lines)
      window.clearTimeout(wait)
    }
  }, [phase, navigate, quizId, name])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (phase !== 'quiz') return
    document.getElementById('koi-question')?.focus()
  }, [phase, step])

  function goNext() {
    const current = stepRef.current
    if (current + 1 >= total) setPhase('loading')
    else setStep(current + 1)
  }

  function pick(index: number) {
    const next = answersRef.current.slice()
    next[stepRef.current] = index
    answersRef.current = next
    setAnswers(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(goNext, 220)
  }

  function back() {
    window.clearTimeout(timer.current)
    if (step === 0) setLeaveOpen(true)
    else setStep((value) => value - 1)
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-[680px] px-5 py-10 md:px-8" aria-hidden="true">
        <div className="h-8 w-40 rounded-full bg-[#F5F0EB]" />
        <div className="mt-6 h-24 rounded-2xl bg-white" />
        <div className="mt-3 h-16 rounded-xl bg-white" />
        <div className="mt-3 h-16 rounded-xl bg-white" />
      </div>
    )
  }

  if (phase === 'loading') {
    const lines = ['答えを、小さく束ねています…', '正解はありません。ふだんの自分に、近づいているだけです。', 'もう少しで終わります。']
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-[680px] flex-col items-center justify-center px-5 text-center">
        <Mascot mood="soft" />
        <p className="mt-4 text-pretty text-base text-[#2A2430]" aria-live="polite">{lines[line]}</p>
      </div>
    )
  }

  if (phase === 'intro') {
    const peers = catalog(quizId)
    return (
      <div className="mx-auto grid max-w-[680px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[220px_1fr] lg:items-center">
        <Mascot mood="dere" className="mx-auto size-52" />
        <div>
          <p className="text-[13px] leading-normal text-[#6B6270]">{quiz.title}</p>
          <h1 className="mt-2 text-balance text-2xl font-bold leading-snug">{quiz.ja}</h1>
          <p className="mt-3 text-pretty text-base leading-relaxed text-[#6B6270]">{quiz.lede}</p>
          {quiz.aside ? <p className="mt-3 text-pretty text-base leading-relaxed">{quiz.aside}</p> : null}
          {quiz.seoLinks?.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {quiz.seoLinks.map((link) => (
                <li key={link.code}>
                  <a className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-base text-[#B84D6A] underline decoration-[#F2A8BA] underline-offset-4" href={koiHref(`${quizId}/${link.code}/`)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-4 grid gap-2 text-base leading-relaxed">
            <li>約 {quiz.countLabel} · {quiz.minutes}分 · 無料</li>
            <li>正解はありません。前の問いに戻れます</li>
            <li>答えは、この端末だけに残ります</li>
          </ul>
          <label className="mt-6 block text-[13px] text-[#6B6270]" htmlFor="koi-name">ニックネーム（空欄でも大丈夫）</label>
          <input
            id="koi-name"
            value={name}
            maxLength={16}
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border-[1.5px] border-[#E8E0E4] bg-white px-3 text-base focus-visible:shadow-[0_0_0_3px_rgba(232,145,168,0.35)] focus-visible:outline-none"
          />
          <button type="button" className={cls(primaryBtn, 'mt-6')} onClick={() => { setName(cleanName(name)); setPhase('quiz') }}>
            では、始めましょう
          </button>
          <details className="mt-8 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(42,36,48,0.06)]">
            <summary className="cursor-pointer text-base font-semibold">タイプを見る</summary>
            <ul className="mt-4 grid gap-2">
              {peers.map((peer) => (
                <li key={peer.code}>
                  <a className="text-base text-[#B84D6A] underline decoration-[#F2A8BA] underline-offset-4" href={koiHref(`${quizId}/${peer.code}/`)}>
                    {peer.name}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    )
  }

  const question = quiz.questions[step]
  return (
    <div className="mx-auto max-w-[680px] px-5 py-6 md:px-8">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className={ghostBtn} onClick={back}>前の問いに戻る</button>
        <p className="text-[13px] tabular-nums text-[#6B6270]" aria-live="polite">{step + 1} / {total}</p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#F5F0EB]"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-label="回答の進み具合"
      >
        <div
          className="ks-motion h-full w-full origin-left bg-[#E891A8] transition-transform duration-[250ms] ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${(step + 1) / total})` }}
        />
      </div>
      <p className="mt-6 text-[13px] text-[#6B6270]">{quiz.hint}</p>
      <fieldset className="mt-3">
        <legend id="koi-question" tabIndex={-1} className="text-balance text-[17px] font-semibold leading-snug focus-visible:outline-none">
          {question.prompt}
        </legend>
        {question.kind === 'likert' ? (
          <Likert question={question} name={`q-${step}`} selected={answers[step]} onPick={pick} />
        ) : (
          <div className="mt-4 grid gap-3">
            {question.options?.map((option, index) => {
              const selected = answers[step] === index
              return (
                <label key={option.label} className={choiceClass(selected)}>
                  <input
                    className="sr-only"
                    type="radio"
                    name={`q-${step}`}
                    checked={selected}
                    onChange={() => pick(index)}
                  />
                  <span>{option.label}</span>
                </label>
              )
            })}
          </div>
        )}
      </fieldset>
      {leaveOpen ? (
        <Dialog title="いったん離れますか？" onClose={() => setLeaveOpen(false)}>
          <p className="mt-2 text-pretty text-base leading-relaxed text-[#6B6270]">進み具合は覚えておきます。次に開いたとき、さっきの問いから続けられます。</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className={primaryBtn} onClick={() => setLeaveOpen(false)}>続ける</button>
            <a className={secondaryLink} href={koiHref()}>離れる</a>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}

function Likert({ question, name, selected, onPick }: { question: Question; name: string; selected: number; onPick: (index: number) => void }) {
  return (
    <div className="mt-5">
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, index) => {
          const on = selected === index
          return (
            <label key={index} className="flex min-h-12 items-center justify-center rounded-xl focus-within:shadow-[0_0_0_3px_rgba(232,145,168,0.35)]">
              <input className="sr-only" type="radio" name={name} checked={on} onChange={() => onPick(index)} aria-label={index < 3 ? `左に近い、${index + 1}番目` : `右に近い、${index + 1}番目`} />
              <span className={cls('rounded-full', on ? 'size-8 bg-[#E891A8]' : 'size-7 border-2 border-[#E8E0E4] bg-white')} />
            </label>
          )
        })}
      </div>
      <div className="mt-3 flex justify-between gap-4 text-sm leading-relaxed text-[#6B6270]">
        <span className="max-w-[46%] text-pretty">{question.left}</span>
        <span className="max-w-[46%] text-pretty text-right">{question.right}</span>
      </div>
    </div>
  )
}

function choiceClass(selected: boolean) {
  return cls(
    'flex min-h-12 cursor-pointer items-center rounded-xl border-[1.5px] px-4 py-3.5 text-left text-base leading-relaxed',
    selected ? 'border-[#E891A8] bg-[#FCE8EE]' : 'border-[#E8E0E4] bg-white hover:border-[#F2A8BA]',
  )
}

const secondaryLink = 'inline-flex min-h-12 items-center justify-center rounded-2xl border-[1.5px] border-[#E891A8] bg-white px-5 text-base font-medium text-[#B84D6A]'

function readSaved(quizId: string, total: number) {
  try {
    const raw = sessionStorage.getItem(storageKey(quizId))
    if (!raw) return null
    const data = JSON.parse(raw) as { name?: string; answers?: number[]; step?: number; phase?: string }
    if (!Array.isArray(data.answers) || data.answers.length !== total) return null
    if (data.phase !== 'quiz') return null
    const step = Math.min(Math.max(data.step ?? 0, 0), total - 1)
    return { name: cleanName(data.name ?? ''), answers: data.answers.map((item) => Number(item)), step }
  } catch {
    return null
  }
}
