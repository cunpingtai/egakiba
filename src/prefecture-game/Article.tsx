import { Fragment, useState, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { PREF_GUIDES, PREF_LINKS, type PrefBlock } from './content'
import { prefHref } from './seo'

export function PrefBlocks({ blocks }: { blocks: PrefBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function PrefNeighborList() {
  const [code, setCode] = useState('')
  const shown = code ? PREF_LINKS.filter((item) => String(item.code) === code) : PREF_LINKS
  return (
    <section className="pref-links" aria-labelledby="pref-links-title">
      <h2 id="pref-links-title">ゲーム内で合体できる県</h2>
      <label>
        調べる県
        <select value={code} onChange={(event) => setCode(event.target.value)}>
          <option value="">すべて</option>
          {PREF_LINKS.map((item) => <option key={item.code} value={String(item.code)}>{item.name}</option>)}
        </select>
      </label>
      <ul>
        {shown.map((item) => (
          <li key={item.code}>
            <strong>{item.name}</strong>
            <span>{item.neighbors.join('、')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PrefNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="新・都道府県ゲームの案内">
        {current === 'home' ? <span>新・都道府県ゲーム</span> : <a href={prefHref()}>新・都道府県ゲーム</a>}
        {PREF_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={prefHref(`${slug}/`)}>{label}</a>)}
        <a href={prefHref('#play')}>遊んでみる</a>
        <a href={sitePath('')}>ホーム</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'prefecture-game' : `prefecture-game/${current}`} />
    </>
  )
}

function renderBlock(block: PrefBlock) {
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
  if (href === '#play') return { href: prefHref('#play') }
  if (href === '/prefecture-game' || href === '/prefecture-game/') return { href: prefHref() }
  if (href.startsWith('/prefecture-game/')) {
    const rest = href.slice('/prefecture-game/'.length)
    const hashAt = rest.indexOf('#')
    const slug = (hashAt === -1 ? rest : rest.slice(0, hashAt)).replace(/\/$/, '')
    const hash = hashAt === -1 ? '' : rest.slice(hashAt)
    return { href: prefHref(`${slug ? `${slug}/` : ''}${hash}`) }
  }
  const path = href.replace(/^\//, '')
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return { href: sitePath(withSlash) }
}
