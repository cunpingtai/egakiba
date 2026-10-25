import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { SHODO_GUIDES, type ShodoBlock } from './content'
import { shodoHref } from './seo'

export function ShodoBlocks({ blocks }: { blocks: ShodoBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function ShodoNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="書道シミュレーター3Dの案内">
        {current === 'home' ? <span>ゲーム</span> : <a href={shodoHref()}>書道ゲームをはじめる</a>}
        {SHODO_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={shodoHref(`${slug}/`)}>{label}</a>)}
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'shodo-simulator-3d' : `shodo-simulator-3d/${current}`} />
    </>
  )
}

function renderBlock(block: ShodoBlock) {
  if (block.type === 'h1') return <h1>{inline(block.text)}</h1>
  if (block.type === 'h2') return <h2>{inline(block.text)}</h2>
  if (block.type === 'h3') return <h3>{inline(block.text)}</h3>
  return <p>{inline(block.text)}</p>
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let key = 0
  while (rest) {
    const start = rest.indexOf('[')
    if (start < 0) {
      nodes.push(rest)
      break
    }
    if (start > 0) nodes.push(rest.slice(0, start))
    const link = rest.slice(start).match(/^\[([^\]]+)\]\((\/shodo-simulator-3d\/[^)]*)\)/)
    if (!link) {
      nodes.push(rest[start])
      rest = rest.slice(start + 1)
      continue
    }
    const slug = link[2].replace(/^\/shodo-simulator-3d\/?/, '')
    nodes.push(<a key={key += 1} href={shodoHref(slug)}>{link[1]}</a>)
    rest = rest.slice(start + link[0].length)
  }
  return nodes
}
