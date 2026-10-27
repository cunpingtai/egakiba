import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { POTATO_GUIDES, type PotatoBlock } from './content'
import { potatoHref } from './seo'

export function PotatoBlocks({ blocks }: { blocks: PotatoBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function PotatoNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="ぐるぐるポテトメーカーの案内">
        {current === 'home' ? <span>ガイド</span> : <a href={potatoHref()}>ぐるぐるポテトメーカー</a>}
        {POTATO_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={potatoHref(`${slug}/`)}>{label}</a>)}
        <a href={potatoHref('#play')}>ポテトを切る</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'long-potato' : `long-potato/${current}`} />
    </>
  )
}

function renderBlock(block: PotatoBlock) {
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
  if (href === '#play') return { href: potatoHref('#play') }
  if (href.startsWith('/') && !href.startsWith('/long-potato')) return { href: sitePath(href) }
  const slug = href.replace(/^\/long-potato\/?/, '')
  return { href: potatoHref(slug ? `${slug.replace(/\/$/, '')}/` : '') }
}

function sitePath(href: string) {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  const path = href.replace(/^\//, '')
  return `${root}${path.endsWith('/') ? path : `${path}/`}`
}
