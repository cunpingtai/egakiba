import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { WALKER_GUIDES, type WalkerBlock } from './content'
import { walkerHref } from './seo'

export function WalkerBlocks({ blocks }: { blocks: WalkerBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function WalkerNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="人生ウォーカーの案内">
        {current === 'home' ? <span>人生ウォーカー</span> : <a href={walkerHref()}>人生ウォーカー</a>}
        {WALKER_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={walkerHref(`${slug}/`)}>{label}</a>)}
        <a href={walkerHref('#play')}>歩きはじめる</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'jinsei-walker' : `jinsei-walker/${current}`} />
    </>
  )
}

function renderBlock(block: WalkerBlock) {
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

function linkProps(href: string) {
  if (href === '#play') return { href: walkerHref('#play') }
  if (href.startsWith('/') && !href.startsWith('/jinsei-walker')) return { href: sitePath(href) }
  const slug = href.replace(/^\/jinsei-walker\/?/, '')
  return { href: walkerHref(slug ? `${slug.replace(/\/$/, '')}/` : '') }
}

function sitePath(href: string) {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  const path = href.replace(/^\//, '')
  return `${root}${path.endsWith('/') ? path : `${path}/`}`
}
