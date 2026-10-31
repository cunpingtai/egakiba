import { Fragment, type ReactNode } from 'react'

import { SiteIndexLinks } from '../site-links'
import { type BakusoBlock } from './content'
import { bakusoHref } from './seo'

export function BakusoBlocks({ blocks }: { blocks: BakusoBlock[] }) {
  return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block)}</Fragment>)
}

export function BakusoNav() {
  return (
    <>
      <nav className="rf-seo-nav" aria-label="爆走キックボードの案内">
        <span>爆走キックボード</span>
        <a href={bakusoHref('#play')}>出勤する</a>
      </nav>
      <SiteIndexLinks current="bakuso-kickboard" />
    </>
  )
}

function renderBlock(block: BakusoBlock) {
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
    else if (match[1]) nodes.push(<strong key={key += 1}><a href={bakusoHref(match[2] === '#play' ? '#play' : '')}>{match[1]}</a></strong>)
    else nodes.push(<a key={key += 1} href={match[4]}>{match[3]}</a>)
    last = index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}
