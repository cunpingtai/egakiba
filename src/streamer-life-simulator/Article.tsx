import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { STREAMER_GUIDES, type StreamerBlock } from './content'
import { streamerHref } from './seo'

export function StreamerBlocks({ blocks }: { blocks: StreamerBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function StreamerNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="配信者人生シミュレーターの案内">
        {current === 'home' ? <span>配信者人生シミュレーター</span> : <a href={streamerHref()}>配信者人生シミュレーター</a>}
        {STREAMER_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={streamerHref(`${slug}/`)}>{label}</a>)}
        <a href={streamerHref('#play')}>配信を始める</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'streamer-life-simulator' : `streamer-life-simulator/${current}`} />
    </>
  )
}

function renderBlock(block: StreamerBlock) {
  if (block.type === 'h1') return <h1>{inline(block.text)}</h1>
  if (block.type === 'h2') return <h2>{inline(block.text)}</h2>
  if (block.type === 'h3') return <h3>{inline(block.text)}</h3>
  if (block.type === 'table') {
    return (
      <table>
        <thead>
          <tr>{block.headers.map(header => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map(row => (
            <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    )
  }
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
  if (href === '#play') return { href: streamerHref('#play') }
  if (href.startsWith('/') && !href.startsWith('/streamer-life-simulator')) return { href: sitePath(href) }
  const slug = href.replace(/^\/streamer-life-simulator\/?/, '')
  return { href: streamerHref(slug ? `${slug.replace(/\/$/, '')}/` : '') }
}

function sitePath(href: string) {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  const path = href.replace(/^\//, '')
  return `${root}${path.endsWith('/') ? path : `${path}/`}`
}
