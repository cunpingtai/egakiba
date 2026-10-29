import { Fragment, useState, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { CAFE_AREAS, CAFE_ENDINGS, CAFE_GROUPS, CAFE_GUIDES, CAFE_SHIFTS, CAFE_SHOPS, type CafeBlock, type CafeGroup } from './content'
import { concafeHref } from './seo'

export function CafeBlocks({ blocks }: { blocks: CafeBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function CafeNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="コンカフェ嬢シミュレーターの案内">
        {current === 'home' ? <span>コンカフェ嬢シミュレーター</span> : <a href={concafeHref()}>コンカフェ嬢シミュレーター</a>}
        {CAFE_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={concafeHref(`${slug}/`)}>{label}</a>)}
        <a href={concafeHref('#play')}>遊んでみる</a>
        <a href={sitePath('')}>ホーム</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'concafe-simulator' : `concafe-simulator/${current}`} />
    </>
  )
}

export function CafeTables() {
  return (
    <div className="cafe-board">
      <h2>街の倍率</h2>
      <table className="cafe-table">
        <caption>給与の倍率と、SNSで増えるフォロワーの倍率</caption>
        <thead>
          <tr><th>街</th><th>給与</th><th>フォロワー</th><th>お客さんの呼び名</th></tr>
        </thead>
        <tbody>
          {CAFE_AREAS.map(area => (
            <tr key={area.name}>
              <th scope="row">{area.name}</th>
              <td>{area.pay}</td>
              <td>{area.boost}</td>
              <td>{area.guests}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>6つの店</h2>
      <table className="cafe-table">
        <caption>開始時にランダムで入る店。経営は0から100の初期値</caption>
        <thead>
          <tr><th>店</th><th>売上</th><th>経営の初期値</th></tr>
        </thead>
        <tbody>
          {CAFE_SHOPS.map(shop => (
            <tr key={shop.name}>
              <th scope="row">{shop.name}</th>
              <td>{shop.sales}</td>
              <td>{shop.finance}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>出勤倍率</h2>
      <table className="cafe-table">
        <caption>週3日を1とした、月末の給与にかかる倍率</caption>
        <thead>
          <tr><th>出勤</th><th>給与の倍率</th></tr>
        </thead>
        <tbody>
          {CAFE_SHIFTS.map(shift => (
            <tr key={shift.days}>
              <th scope="row">{shift.days}</th>
              <td>{shift.rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CafeEndingList() {
  const [group, setGroup] = useState<'all' | CafeGroup>('all')
  const shown = group === 'all' ? CAFE_ENDINGS : CAFE_ENDINGS.filter(item => item.group === group)
  return (
    <div className="cafe-board">
      <div className="cafe-filters" role="group" aria-label="結末の分類">
        {CAFE_GROUPS.map(item => (
          <button key={item.id} type="button" aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>{item.label}</button>
        ))}
      </div>
      <p className="cafe-count">{shown.length}種類</p>
      {shown.map(item => (
        <article key={item.name} className="cafe-ending">
          <h3>{item.name}</h3>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  )
}

function renderBlock(block: CafeBlock) {
  if (block.type === 'h1') return <h1>{inline(block.text)}</h1>
  if (block.type === 'h2') return <h2>{inline(block.text)}</h2>
  if (block.type === 'h3') return <h3>{inline(block.text)}</h3>
  return <p>{inline(block.text)}</p>
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g
  let last = 0
  let key = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(text.slice(last, index))
    if (match[5]) nodes.push(<strong key={key += 1}>{match[5]}</strong>)
    else if (match[1]) nodes.push(<strong key={key += 1}><a {...linkProps(match[2])}>{match[1]}</a></strong>)
    else nodes.push(<a key={key += 1} {...linkProps(match[4])}>{match[3]}</a>)
    last = index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function sitePath(path: string) {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}${path.replace(/^\//, '')}`
}

function linkProps(href: string) {
  if (href === '#play') return { href: concafeHref('#play') }
  if (href === '/concafe-simulator' || href === '/concafe-simulator/') return { href: concafeHref() }
  if (href.startsWith('/concafe-simulator/')) {
    const rest = href.slice('/concafe-simulator/'.length)
    const hashAt = rest.indexOf('#')
    const slug = (hashAt === -1 ? rest : rest.slice(0, hashAt)).replace(/\/$/, '')
    const hash = hashAt === -1 ? '' : rest.slice(hashAt)
    return { href: concafeHref(`${slug ? `${slug}/` : ''}${hash}`) }
  }
  const path = href.replace(/^\//, '')
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return { href: sitePath(withSlash) }
}
