import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { RollIceBlocks, RollIceNav } from '../../roll-ice-simulator/Article'
import { getRollIcePage, rollIceHead, rollIceHref } from '../../roll-ice-simulator/seo'

const page = getRollIcePage('home')
if (!page) throw new Error('Roll ice home copy is missing')

export const Route = createFileRoute('/roll-ice-simulator/')({
  ssr: true,
  head: () => rollIceHead(page),
  component: RollIceHome,
})

function RollIceHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <RollIceBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="なんでもロールアイスシミュレーター"
          src={rollIceHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#e6d3b6' }}
        />
        <div className="rf-seo-copy">
          <RollIceBlocks blocks={rest} />
          <RollIceNav current="home" />
        </div>
      </article>
    </main>
  )
}
