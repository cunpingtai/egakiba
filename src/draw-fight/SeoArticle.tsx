import { Fragment, type ReactNode } from 'react'

import { GUIDE_PAGES, rakugakiHref, type RakugakiPage, type SeoBlock } from './seo'

export function SeoBlocks({ blocks }: { blocks: SeoBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block, index)}</Fragment>)
}

export function GuideNav({ current }: { current: string }) {
  return (
    <nav className="rf-seo-nav" aria-label="ラクガキファイターのガイド">
      {current === 'home' ? <span>ゲーム</span> : <a href={rakugakiHref('/draw-fight')}>ラクガキファイターをプレイ</a>}
      {GUIDE_PAGES.map(([slug, label]) => slug === current
        ? <span key={slug}>{label}</span>
        : <a key={slug} href={rakugakiHref(`/draw-fight/${slug}`)}>{label}</a>)}
    </nav>
  )
}

function renderBlock(block: SeoBlock, index: number) {
  if (block.type === 'h1') return <h1>{inline(block.text)}</h1>
  if (block.type === 'h2') return <h2>{inline(block.text)}</h2>
  if (block.type === 'h3') return <h3>{inline(block.text)}</h3>
  if (block.type === 'table') {
    return (
      <table>
        <thead><tr>{block.headers.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr></thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{inline(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    )
  }
  return <p className={isActionParagraph(block.text) ? 'rf-seo-actions' : undefined}>{inline(block.text)}</p>
}

function isActionParagraph(text: string) {
  return text.replace(/\[[^\]]+\]\([^)]+\)/g, '').replace(/\*\*/g, '').replace(/\u3000/g, '').trim().length === 0
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let key = 0
  while (rest) {
    const boldAt = rest.indexOf('**')
    const linkAt = rest.indexOf('[')
    const next = earliest(boldAt, linkAt)
    if (next < 0) {
      nodes.push(rest)
      break
    }
    if (next > 0) nodes.push(rest.slice(0, next))
    rest = rest.slice(next)
    if (rest.startsWith('**')) {
      const end = rest.indexOf('**', 2)
      if (end < 0) {
        nodes.push(rest)
        break
      }
      nodes.push(<strong key={key += 1}>{inline(rest.slice(2, end))}</strong>)
      rest = rest.slice(end + 2)
      continue
    }
    const link = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (!link) {
      nodes.push(rest[0])
      rest = rest.slice(1)
      continue
    }
    nodes.push(<a key={key += 1} href={rakugakiHref(link[2])}>{link[1]}</a>)
    rest = rest.slice(link[0].length)
  }
  return nodes
}

function earliest(boldAt: number, linkAt: number) {
  const points = [boldAt, linkAt].filter(value => value >= 0)
  return points.length ? Math.min(...points) : -1
}
