import { Fragment, type ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { routeHref } from '../seo/landing-content.mjs'
import { SITE_INFO_PAGES, type SiteInfoBlock, type SiteInfoSlug } from './content'
import { siteInfoHref } from './seo'

const LINKS: { slug: SiteInfoSlug; label: string }[] = [
  { slug: 'about', label: 'サイトについて' },
  { slug: 'contact', label: 'お問い合わせ' },
  { slug: 'privacy', label: 'プライバシーポリシー' },
  { slug: 'terms', label: '利用規約' },
]

export function SiteInfoPage({ slug }: { slug: SiteInfoSlug }) {
  const page = SITE_INFO_PAGES[slug]
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <SiteInfoBlocks blocks={page.blocks} />
      </article>
    </main>
  )
}

export function SiteInfoFooter() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`
  const root = siteRoot()
  const home = routeHref('home', 'ja', root)
  return (
    <footer className="site-info-footer">
      <nav aria-label="サイトの案内">
        {path === home
          ? <span aria-current="page">ホーム</span>
          : <a href={home}>ホーム</a>}
        {LINKS.map((link) => {
          const href = siteInfoHref(link.slug)
          if (path === href) return <span key={link.slug} aria-current="page">{link.label}</span>
          return <a key={link.slug} href={href}>{link.label}</a>
        })}
      </nav>
      <p>お問い合わせ <a href="mailto:support@egakiba.com">support@egakiba.com</a></p>
    </footer>
  )
}

function SiteInfoBlocks({ blocks }: { blocks: SiteInfoBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

function renderBlock(block: SiteInfoBlock) {
  if (block.type === 'h1') return <h1>{inline(block.text)}</h1>
  if (block.type === 'h2') return <h2>{inline(block.text)}</h2>
  if (block.type === 'h3') return <h3>{inline(block.text)}</h3>
  return <p>{inline(block.text)}</p>
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let key = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(text.slice(last, index))
    nodes.push(<a key={key += 1} {...linkProps(match[2])}>{match[1]}</a>)
    last = index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function siteRoot() {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

function linkProps(href: string) {
  if (href.startsWith('mailto:')) return { href }
  if (href.startsWith('http://') || href.startsWith('https://')) return { href, rel: 'noopener noreferrer', target: '_blank' }
  const path = href.replace(/^\//, '')
  const withSlash = path.endsWith('/') ? path : `${path}/`
  return { href: `${siteRoot()}${withSlash}` }
}
