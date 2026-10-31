import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { YADO_NAV, type YadoBlock, type YadoPage } from './content'
import { yadoHref } from './seo'

export function YadoArticle({ page }: { page: YadoPage }) {
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <h1>{page.h1}</h1>
          <p>{page.lead}</p>
          <div className="rf-seo-actions">
            {page.actions.map((action) => (
              <a key={action.href} {...linkProps(action.href)}>{action.label}</a>
            ))}
          </div>
        </div>
        <div className="rf-seo-copy">
          <YadoBlocks blocks={page.blocks} />
          <YadoNav current={page.slug} />
        </div>
      </article>
    </main>
  )
}

export function YadoBlocks({ blocks }: { blocks: YadoBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function YadoNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="宿曜占いの案内">
        {YADO_NAV.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={yadoHref(slug === 'home' ? '' : `${slug}/`)}>{label}</a>)}
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'shukuyo-note' : `shukuyo-note/${current}`} />
    </>
  )
}

function renderBlock(block: YadoBlock) {
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
  if (href.startsWith('https://')) return { href, target: '_blank', rel: 'noopener' }
  if (href.startsWith('/shukuyo-note')) {
    const suffix = href.replace(/^\/shukuyo-note\/?/, '')
    return { href: yadoHref(suffix) }
  }
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  const path = href.replace(/^\//, '')
  return { href: `${root}${path.endsWith('/') ? path : `${path}/`}` }
}
