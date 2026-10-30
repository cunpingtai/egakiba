import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import type { SansaBlock, SansaLocaleId } from './content'
import { SANSA_LOCALES, sansaHref } from './seo'

export function SansaBlocks({ blocks }: { blocks: SansaBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function SansaNav({ locale, current }: { locale: SansaLocaleId; current: 'home' | 'how-to' }) {
  const copy = SANSA_LOCALES[locale]
  const here = current === 'home' ? copy.base : `${copy.base}/how-to`
  return (
    <>
      <nav className="rf-seo-nav" aria-label={copy.nav}>
        {current === 'home' ? <span>{copy.label}</span> : <a href={sansaHref(locale)}>{copy.label}</a>}
        {current === 'how-to' ? <span>{copy.how}</span> : <a href={sansaHref(locale, 'how-to/')}>{copy.how}</a>}
        <a href={sansaHref(locale, '#play')}>{copy.play}</a>
        <a href={sitePath('')}>{copy.home}</a>
      </nav>
      <SiteIndexLinks current={here} />
    </>
  )
}

function renderBlock(block: SansaBlock) {
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
  const hashAt = href.indexOf('#')
  const pathPart = hashAt === -1 ? href : href.slice(0, hashAt)
  const hash = hashAt === -1 ? '' : href.slice(hashAt)
  const normalized = pathPart.replace(/^\//, '')
  const withSlash = !normalized || normalized.endsWith('/') ? normalized : `${normalized}/`
  return { href: `${sitePath(withSlash)}${hash}` }
}
