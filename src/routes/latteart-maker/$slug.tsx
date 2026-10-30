import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { LatteBlocks, LatteNav } from '../../latteart-maker/Article'
import { LATTE_PATTERNS } from '../../latteart-maker/content'
import { getLattePage, latteHead } from '../../latteart-maker/seo'

export const Route = createFileRoute('/latteart-maker/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getLattePage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? latteHead(loaderData) : {},
  component: LatteGuide,
})

const TIERS = ['すべて', 'UR', 'SSR', 'SR', 'R', 'N'] as const

function LatteGuide() {
  const page = Route.useLoaderData()
  const [tier, setTier] = useState<(typeof TIERS)[number]>('すべて')
  const shown = tier === 'すべて' ? LATTE_PATTERNS : LATTE_PATTERNS.filter(item => item.tier === tier)
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <LatteBlocks blocks={page.blocks} />
        {page.slug === 'catalog' ? (
          <>
            <div role="group" aria-label="レア度で絞り込む" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 18px' }}>
              {TIERS.map(item => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={tier === item}
                  onClick={() => setTier(item)}
                  style={{
                    font: 'inherit',
                    fontWeight: 700,
                    minHeight: 40,
                    padding: '0 14px',
                    borderRadius: 999,
                    border: '1px solid #1b2130',
                    background: tier === item ? '#1b2130' : '#fff',
                    color: tier === item ? '#f8f7f3' : '#1b2130',
                    cursor: 'pointer',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {shown.map(item => (
                <li key={item.name} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '4px 12px', alignItems: 'baseline' }}>
                  <b>{item.name}</b>
                  <span>{item.tier}・{item.group}</span>
                  <span style={{ gridColumn: '1 / -1' }}>{item.look}</span>
                </li>
              ))}
            </ul>
            <p>{shown.length}種を表示しています。全19種は「すべて」で見られます。</p>
          </>
        ) : null}
        <LatteNav current={page.slug} />
      </article>
    </main>
  )
}
