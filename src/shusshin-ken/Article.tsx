import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { SHUSSHIN_GUIDES, type ShusshinBlock } from './content'
import { shusshinHref } from './seo'

export function ShusshinBlocks({ blocks }: { blocks: ShusshinBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function ShusshinNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="出身地、当てますの案内">
        {current === 'home' ? <span>ガイド</span> : <a href={shusshinHref()}>出身地、当てます</a>}
        {SHUSSHIN_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={shusshinHref(`${slug}/`)}>{label}</a>)}
        <a href={shusshinHref('#play')}>出身地を当ててもらう</a>
        <a href={sitePath('')}>ホーム</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'shusshin-ken' : `shusshin-ken/${current}`} />
    </>
  )
}

function renderBlock(block: ShusshinBlock) {
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
  if (href === '#play') return { href: shusshinHref('#play') }
  if (href === '/shusshin-ken' || href === '/shusshin-ken/') return { href: shusshinHref() }
  if (href.startsWith('/shusshin-ken/')) {
    const slug = href.slice('/shusshin-ken/'.length).replace(/\/$/, '')
    return { href: shusshinHref(slug ? `${slug}/` : '') }
  }
  const path = href.replace(/^\//, '')
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return { href: sitePath(withSlash) }
}
