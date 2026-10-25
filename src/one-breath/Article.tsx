import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { BREATH_GUIDES, type BreathBlock } from './content'
import { breathHref } from './seo'

export function BreathBlocks({ blocks }: { blocks: BreathBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function BreathNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="一息で何歳までの案内">
        {current === 'home' ? <span>ガイド</span> : <a href={breathHref()}>一息で何歳まで</a>}
        {BREATH_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={breathHref(`${slug}/`)}>{label}</a>)}
        <a href={breathHref('#play')}>ろうそくを吹き消す</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'one-breath' : `one-breath/${current}`} />
    </>
  )
}

function renderBlock(block: BreathBlock) {
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
  if (href === '#play') return { href: breathHref('#play') }
  const slug = href.replace(/^\/one-breath\/?/, '')
  return { href: breathHref(slug ? `${slug.replace(/\/$/, '')}/` : '') }
}
