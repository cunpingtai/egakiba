import { useEffect, useState } from 'react'

import { DOPA_TYPES } from './dopa.mjs'
import type { PresentedResult } from './score.mjs'
import { pairNote, shareText } from './score.mjs'
import { koiHref } from './seo'
import { Mascot, RatioBar, ghostBtn, primaryBtn, secondaryBtn, Dialog } from './ui'

export type ResultPage = PresentedResult

export function ResultView({ page, name, personal, url }: { page: ResultPage; name: string; personal: boolean; url: string }) {
  const [other, setOther] = useState(page.peers.find((peer) => peer.code !== page.code)?.code ?? page.code)
  const [toast, setToast] = useState('')
  const [copyError, setCopyError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const text = shareText(page, name, url)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(id)
  }, [toast])

  async function copy() {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(text.full)
      setToast('コピーしました。貼り付けてどうぞ。')
    } catch {
      setCopyError('コピーできませんでした。下の文字を長押しして、選んでコピーしてください。')
    }
  }

  const heading = personal ? (name ? `${name}さんは` : 'あなたは') : 'このタイプは'
  const pairView = pairNote(page.quizId, page.code, other)

  return (
    <article className="mx-auto max-w-[680px] px-5 py-8 md:px-8 lg:max-w-[960px]">
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:items-center lg:gap-10">
        <Mascot mood={page.mood} className="ks-rise mx-auto size-60 lg:size-72" />
        <div>
          <p className="text-[13px] text-[#6B6270]">
            <a className="underline decoration-[#F2A8BA] underline-offset-4" href={koiHref(`${page.quizId}/`)}>{page.kicker}</a>
            <span className="px-1.5" aria-hidden="true">·</span>
            {heading}
          </p>
          <h1 className="mt-2 text-balance text-[30px] font-bold leading-tight">【{page.name}】</h1>
          {page.subname ? <p className="mt-1 text-base text-[#6B6270]">{page.subname}</p> : null}
          <p className="mt-3 inline-flex rounded-full bg-[#EDE8FA] px-3 py-1.5 text-[13px] font-medium leading-none text-[#9B8FD9]">{page.badge}</p>
          <p className="mt-4 text-pretty text-base leading-relaxed">{page.catch}</p>
        </div>
      </div>

      {page.bars.length ? (
        <div className="mt-8 grid gap-3 rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(42,36,48,0.08)] md:p-6">
          {page.bars.map((bar) => <RatioBar key={bar.id} label={bar.label} value={bar.value} color={bar.color} />)}
          {page.quizId !== 'tsun-ratio' ? <p className="text-[13px] text-[#6B6270]">バーが長いほど、右のほうに寄っています。</p> : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 text-pretty text-base leading-relaxed">
        <p>{page.blurb}</p>
        {page.traits.length ? (
          <ul className="grid gap-2">
            {page.traits.map((trait) => (
              <li key={trait.letter} className="rounded-xl bg-[#FCE8EE] px-4 py-3">
                <span className="mr-2 font-semibold">{trait.letter}</span>
                {trait.note}
              </li>
            ))}
          </ul>
        ) : null}
        {page.aruaru.length ? (
          <section>
            <h2 className="text-balance text-xl font-semibold">こんなとき</h2>
            <ul className="mt-3 grid gap-2">
              {page.aruaru.map((item) => <li key={item} className="rounded-xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(42,36,48,0.06)]">{item}</li>)}
            </ul>
          </section>
        ) : null}
        <section className="rounded-2xl bg-[#FBF6E3] p-5">
          <h2 className="text-balance text-xl font-semibold">恋愛では</h2>
          <p className="mt-2">{page.love}</p>
        </section>
        <p><span className="font-semibold">あなたのよいところ：</span>{page.strength}</p>
        <p><span className="font-semibold">そっと気をつけると：</span>{page.pitfall}</p>
      </div>

      {page.subtypes.length ? (
        <section className="mt-8">
          <h2 className="text-balance text-xl font-semibold">4つの日常</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {page.subtypes.map((item) => (
              <li key={item.code}>
                <a className="block rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(42,36,48,0.06)] hover:bg-[#FCE8EE]" href={koiHref(`love-type/${item.code}/`)}>
                  <span className="text-[13px] text-[#9B8FD9]">{item.code}</span>
                  <span className="mt-1 block font-semibold">{item.name}</span>
                  <span className="mt-1 block text-pretty text-sm leading-relaxed text-[#6B6270]">{item.catch}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {page.matches ? <MatchLinks matches={page.matches} /> : null}

      <section className="mt-8" id="aishou">
        <h2 className="text-balance text-xl font-semibold">相性を見る</h2>
        <label className="mt-3 block text-[13px] text-[#6B6270]" htmlFor="koi-other">相手のタイプ</label>
        <select
          id="koi-other"
          value={other}
          onChange={(event) => setOther(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-[#E8E0E4] bg-white px-3 text-base focus-visible:shadow-[0_0_0_3px_rgba(232,145,168,0.35)] focus-visible:outline-none"
        >
          {page.peers.map((peer) => <option key={peer.code} value={peer.code}>{peer.name}</option>)}
        </select>
        {pairView ? (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(42,36,48,0.08)]">
            <p className="text-base font-semibold">{pairView.nameA} × {pairView.nameB}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#B84D6A]">{pairView.score}%</p>
            <p className="mt-2 text-pretty text-base leading-relaxed">{pairView.note}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-balance text-xl font-semibold">シェアするなら</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <a className={secondaryBtn} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text.full)}`} target="_blank" rel="noreferrer">Xでシェア</a>
          <a className={secondaryBtn} href={`https://line.me/R/msg/text/${encodeURIComponent(text.line)}`} target="_blank" rel="noreferrer">LINEで送る</a>
          <button type="button" className={secondaryBtn} onClick={() => void copy()}>リンクをコピー</button>
        </div>
        {copyError ? (
          <div className="mt-3">
            <p className="text-sm text-[#E07A7A]">{copyError}</p>
            <textarea readOnly className="mt-2 w-full rounded-xl border-[1.5px] border-[#E8E0E4] p-3 text-base" value={text.full} />
          </div>
        ) : null}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          className={ghostBtn}
          onClick={() => {
            document.getElementById('aishou')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            document.getElementById('koi-other')?.focus()
          }}
        >
          相性を見る
        </button>
        <button type="button" className={primaryBtn} onClick={() => setConfirm(true)}>もう一度</button>
      </div>

      {toast ? (
        <p role="status" className="ks-motion fixed bottom-[max(5rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(100%-2.5rem,320px)] -translate-x-1/2 rounded-xl border-l-4 border-[#5BB98C] bg-white px-4 py-3 text-base shadow-[0_4px_16px_rgba(42,36,48,0.08)]">
          {toast}
        </p>
      ) : null}

      {confirm ? (
        <Dialog title="もう一度やりますか？" onClose={() => setConfirm(false)}>
          <p className="mt-2 text-pretty text-base leading-relaxed text-[#6B6270]">やり直すと、いまの結果は上書きされます。このページのリンクはそのままです。シェアしたものは消えません。</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center justify-center rounded-2xl border-[1.5px] border-[#E07A7A] bg-white px-5 text-base text-[#E07A7A]" href={koiHref(`${page.quizId}/?again=1`)}>上書きしてやり直す</a>
            <button type="button" className={primaryBtn} onClick={() => setConfirm(false)}>このまま残す</button>
          </div>
        </Dialog>
      ) : null}
    </article>
  )
}

function MatchLinks({ matches }: { matches: NonNullable<ResultPage['matches']> }) {
  const types = DOPA_TYPES as Record<string, { name: string }>
  const items = [
    ['友だちだと楽', matches.friend],
    ['恋愛だとちょうどいい', matches.love],
    ['友だちだと少し噛み合わない', matches.clashFriend],
    ['恋愛だと通訳が要る', matches.clashLove],
  ] as const
  return (
    <section className="mt-8">
      <h2 className="text-balance text-xl font-semibold">このタイプとは</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map(([label, code]) => (
          <li key={label}>
            <a className="block rounded-xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(42,36,48,0.06)]" href={koiHref(`dopagaki/${code}/`)}>
              <span className="text-[13px] text-[#6B6270]">{label}</span>
              <span className="mt-1 block font-semibold">{types[code]?.name ?? code}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
