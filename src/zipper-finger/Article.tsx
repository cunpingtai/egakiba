import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { ZIPPER_GUIDES, type ZipperBlock } from './content'
import { zipperHref } from './seo'

export function ZipperBlocks({ blocks }: { blocks: ZipperBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function ZipperNav({ current }: { current: string }) {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="ジッパーフィンガーの案内">
        {current === 'home' ? <span>ツール</span> : <a href={zipperHref()}>ジッパーフィンガーを開く</a>}
        {ZIPPER_GUIDES.map(([slug, label]) => slug === current
          ? <span key={slug}>{label}</span>
          : <a key={slug} href={zipperHref(`${slug}/`)}>{label}</a>)}
      </nav>
      <SiteIndexLinks current={current === 'home' ? 'zipper-finger' : `zipper-finger/${current}`} />
    </>
  )
}

function renderBlock(block: ZipperBlock) {
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
    const link = rest.slice(start).match(/^\[([^\]]+)\]\((\/zipper-finger\/[^)]*)\)/)
    if (!link) {
      nodes.push(rest[start])
      rest = rest.slice(start + 1)
      continue
    }
    const slug = link[2].replace(/^\/zipper-finger\/?/, '')
    nodes.push(<a key={key += 1} href={zipperHref(slug)}>{link[1]}</a>)
    rest = rest.slice(start + link[0].length)
  }
  return nodes
}
