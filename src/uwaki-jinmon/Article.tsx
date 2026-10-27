import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { UwakiCalc } from './Calc'
import { UWAKI_GUIDES, type UwakiBlock } from './content'
import { uwakiHref } from './seo'

export function UwakiBlocks({ blocks }: { blocks: UwakiBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function UwakiNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="浮気した夫に全部吐かせるの案内">
        {current === 'home' ? <span>ガイド</span> : <a href={uwakiHref()}>浮気した夫に全部吐かせる</a>}
        {UWAKI_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={uwakiHref(`${slug}/`)}>{label}</a>)}
        <a href={uwakiHref('#play')}>遊んでみる</a>
        <a href={sitePath('interrogation-games/')}>尋問ゲーム</a>
        <a href={sitePath('')}>ホーム</a>
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'uwaki-jinmon' : `uwaki-jinmon/${current}`} />
    </>
  )
}

function renderBlock(block: UwakiBlock) {
  if (block.type === 'calc') return <UwakiCalc />
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
  if (href === '#play') return { href: uwakiHref('#play') }
  if (href === '/uwaki-jinmon' || href === '/uwaki-jinmon/') return { href: uwakiHref() }
  if (href.startsWith('/uwaki-jinmon/')) {
    const rest = href.slice('/uwaki-jinmon/'.length)
    const hashAt = rest.indexOf('#')
    const slug = (hashAt === -1 ? rest : rest.slice(0, hashAt)).replace(/\/$/, '')
    const hash = hashAt === -1 ? '' : rest.slice(hashAt)
    return { href: uwakiHref(`${slug ? `${slug}/` : ''}${hash}`) }
  }
  const path = href.replace(/^\//, '')
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return { href: sitePath(withSlash) }
}
