import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { TenhouCalculator } from './Calculator'
import { TENHOU_GUIDES, type TenhouBlock } from './content'
import { tenhouHref } from './seo'

export function TenhouBlocks({ blocks }: { blocks: TenhouBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function TenhouNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="天和シミュレーターの案内">
        {current === 'home' ? <span>天和シミュレーター</span> : <a href={tenhouHref()}>天和シミュレーター</a>}
        {TENHOU_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={tenhouHref(`${slug}/`)}>{label}</a>)}
        <a href={tenhouHref('#play')}>配牌を回す</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'tenhou-simulator' : `tenhou-simulator/${current}`} />
    </>
  )
}

function renderBlock(block: TenhouBlock) {
  if (block.type === 'h1') return <h1>{inline(block.text)}</h1>
  if (block.type === 'h2') return <h2>{inline(block.text)}</h2>
  if (block.type === 'h3') return <h3>{inline(block.text)}</h3>
  if (block.type === 'calc') return <TenhouCalculator />
  if (block.type === 'table') {
    return (
      <table>
        <thead>
          <tr>{block.headers.map(header => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map(row => (
            <tr key={row.join('|')}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>
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
  if (href === '#play') return { href: tenhouHref('#play') }
  if (href.startsWith('/') && !href.startsWith('/tenhou-simulator')) return { href: sitePath(href) }
  const slug = href.replace(/^\/tenhou-simulator\/?/, '')
  return { href: tenhouHref(slug ? `${slug.replace(/\/$/, '')}/` : '') }
}

function sitePath(href: string) {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  const path = href.replace(/^\//, '')
  return `${root}${path.endsWith('/') ? path : `${path}/`}`
}
