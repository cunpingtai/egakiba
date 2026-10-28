import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { KURO_GUIDES, type KuroBlock } from './content'
import { kuroHref } from './seo'

export function KuroBlocks({ blocks }: { blocks: KuroBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function KuroNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="黒い液体の案内">
        {current === 'home' ? <span>黒い液体</span> : <a href={kuroHref()}>黒い液体</a>}
        {KURO_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={kuroHref(`${slug}/`)}>{label}</a>)}
        <a href={kuroHref('#play')}>遊んでみる</a>
        <a href={sitePath('')}>ホーム</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'kuroi-ekitai' : `kuroi-ekitai/${current}`} />
    </>
  )
}

function renderBlock(block: KuroBlock) {
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
  if (href === '#play') return { href: kuroHref('#play') }
  if (href === '/kuroi-ekitai' || href === '/kuroi-ekitai/') return { href: kuroHref() }
  if (href.startsWith('/kuroi-ekitai/')) {
    const rest = href.slice('/kuroi-ekitai/'.length)
    const hashAt = rest.indexOf('#')
    const slug = (hashAt === -1 ? rest : rest.slice(0, hashAt)).replace(/\/$/, '')
    const hash = hashAt === -1 ? '' : rest.slice(hashAt)
    return { href: kuroHref(`${slug ? `${slug}/` : ''}${hash}`) }
  }
  const path = href.replace(/^\//, '')
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return { href: sitePath(withSlash) }
}
