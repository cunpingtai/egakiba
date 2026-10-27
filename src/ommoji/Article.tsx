import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { OMMOJI_GUIDES, type OmmojiBlock } from './content'
import { ommojiHref } from './seo'

export function OmmojiBlocks({ blocks }: { blocks: OmmojiBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function OmmojiNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="オム文字シミュレーターの案内">
        {current === 'home' ? <span>ガイド</span> : <a href={ommojiHref()}>オム文字シミュレーター</a>}
        {OMMOJI_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={ommojiHref(`${slug}/`)}>{label}</a>)}
        <a href={ommojiHref('#play')}>オムライスに描く</a>
        <a href={sitePath('drawing-games/')}>無料お絵描きゲーム</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'omurice' : `omurice/${current}`} />
    </>
  )
}

function renderBlock(block: OmmojiBlock) {
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
  if (href === '#play') return { href: ommojiHref('#play') }
  if (href === '/omurice' || href === '/omurice/') return { href: ommojiHref() }
  if (href.startsWith('/omurice/')) {
    const slug = href.slice('/omurice/'.length).replace(/\/$/, '')
    return { href: ommojiHref(slug ? `${slug}/` : '') }
  }
  const path = href.replace(/^\//, '')
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return { href: sitePath(withSlash) }
}
